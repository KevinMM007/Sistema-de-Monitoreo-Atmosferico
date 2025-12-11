"""
============================================================================
Sistema de Monitoreo de Calidad del Aire - Xalapa, Veracruz
============================================================================

ARCHIVO: historical_routes.py
PROPÓSITO: Rutas API para datos históricos de calidad del aire

ENDPOINTS:
    - GET /air-quality/historical : Datos históricos con escala variable

ESCALAS DISPONIBLES:
    - hourly  : Datos por hora (máx 1000 registros)
    - daily   : Promedios diarios (máx 366 días)
    - monthly : Promedios mensuales (máx 12 meses)

ESTRATEGIA DE DATOS:
    1. Consulta base de datos local primero
    2. Si hay pocos datos, consulta Open-Meteo (hasta 1 año en 1 request)
    3. Combina fuentes para mejor cobertura

AUTOR: Kevin Morales
VERSIÓN: 2.1.0
============================================================================
"""

from typing import Optional, List, Dict
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date, text
import asyncio
import requests
from database import get_db
from data_collectors.air_quality_collector import OpenMeteoCollector, get_mexico_time
from repositories.crud import AirQualityRepository
import logging
import models

logger = logging.getLogger(__name__)

router = APIRouter()
openmeteo_collector = OpenMeteoCollector()

@router.get("/air-quality/historical")
async def get_historical_data(
    start: str = Query(..., description="Fecha de inicio (YYYY-MM-DD)"),
    end: str = Query(..., description="Fecha de fin (YYYY-MM-DD)"),
    scale: str = Query("daily", description="Escala de tiempo: hourly, daily, monthly"),
    db: Session = Depends(get_db)
):
    """
    Obtiene datos históricos de calidad del aire con diferentes escalas de tiempo.
    
    ESTRATEGIA:
    1. Primero intenta obtener datos de la base de datos local
    2. Si no hay suficientes datos, consulta Open-Meteo directamente (1 solo request)
    3. Combina ambas fuentes para dar la mejor respuesta posible
    
    Open-Meteo puede devolver hasta 1 año de datos en un solo request,
    lo que evita timeouts.
    """
    try:
        # Validar fechas
        try:
            start_date = datetime.strptime(start, "%Y-%m-%d")
            end_date = datetime.strptime(end, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(400, "Formato de fecha inválido. Use YYYY-MM-DD")
        
        if end_date < start_date:
            raise HTTPException(400, "La fecha de fin debe ser posterior a la fecha de inicio")
        
        if (end_date - start_date).days > 365:
            raise HTTPException(400, "El rango máximo es de 1 año")
        
        logger.info(f"📊 Consultando datos históricos: {start} a {end}, escala: {scale}")
        
        # PASO 1: Intentar obtener datos de la base de datos local
        local_data = await get_local_historical_data(db, start_date, end_date, scale)
        logger.info(f"📁 Datos locales encontrados: {len(local_data)} registros")
        
        # PASO 2: Si no hay suficientes datos locales, consultar Open-Meteo
        # Open-Meteo puede devolver hasta 1 año en UN SOLO request
        if len(local_data) < 10:
            logger.info(f"🌐 Datos locales insuficientes, consultando Open-Meteo...")
            
            try:
                api_data = await fetch_openmeteo_historical(start_date, end_date, scale)
                
                if api_data and len(api_data) > 0:
                    logger.info(f"✅ Open-Meteo devolvió {len(api_data)} registros")
                    
                    # Usar datos de API si son más completos
                    if len(api_data) > len(local_data):
                        # NOTA: No guardamos en background para evitar problemas de conexiones
                        # Los datos se guardarán la próxima vez que se consulte un rango pequeño
                        
                        # Devolver datos de API directamente
                        statistics = calculate_statistics(api_data)
                        return {
                            "data": api_data,
                            "statistics": statistics,
                            "metadata": {
                                "start": start,
                                "end": end,
                                "scale": scale,
                                "total_records": len(api_data),
                                "source": "openmeteo"
                            }
                        }
            except Exception as api_error:
                logger.warning(f"⚠️ Error consultando Open-Meteo: {api_error}")
                # Continuar con datos locales si los hay
        
        # PASO 3: Devolver datos locales (o vacío si no hay nada)
        statistics = calculate_statistics(local_data)
        
        response = {
            "data": local_data,
            "statistics": statistics,
            "metadata": {
                "start": start,
                "end": end,
                "scale": scale,
                "total_records": len(local_data),
                "source": "database" if len(local_data) > 0 else "none"
            }
        }
        
        # Mensaje informativo si no hay datos
        if len(local_data) == 0:
            response["message"] = "No hay datos disponibles para este rango. Los datos históricos se acumulan con el uso del sistema."
        
        return response
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(400, f"Error en parámetros: {str(e)}")
    except Exception as e:
        logger.error(f"❌ Error obteniendo datos históricos: {str(e)}", exc_info=True)
        raise HTTPException(500, f"Error al obtener datos históricos: {str(e)}")


async def fetch_openmeteo_historical(start_date: datetime, end_date: datetime, scale: str) -> List[Dict]:
    """
    Obtiene datos históricos de Open-Meteo en UN SOLO request.
    
    Open-Meteo puede manejar hasta 1 año de datos por request,
    lo que es mucho más eficiente que hacer múltiples requests pequeños.
    """
    try:
        params = {
            "latitude": 19.5438,
            "longitude": -96.9102,
            "hourly": ["pm10", "pm2_5", "nitrogen_dioxide", "carbon_monoxide", "ozone"],
            "timezone": "America/Mexico_City",
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d")
        }
        
        logger.info(f"🌐 Open-Meteo request: {params['start_date']} a {params['end_date']}")
        
        # Un solo request con timeout de 20 segundos
        response = requests.get(
            "https://air-quality-api.open-meteo.com/v1/air-quality",
            params=params,
            timeout=20
        )
        
        if response.status_code != 200:
            logger.warning(f"Open-Meteo respondió con código {response.status_code}")
            return []
        
        data = response.json()
        hourly_data = data.get('hourly', {})
        times = hourly_data.get('time', [])
        
        if not times:
            return []
        
        # Procesar datos según la escala solicitada
        raw_data = []
        for i in range(len(times)):
            try:
                pm25 = hourly_data.get('pm2_5', [])[i] if i < len(hourly_data.get('pm2_5', [])) else None
                pm10 = hourly_data.get('pm10', [])[i] if i < len(hourly_data.get('pm10', [])) else None
                no2 = hourly_data.get('nitrogen_dioxide', [])[i] if i < len(hourly_data.get('nitrogen_dioxide', [])) else None
                o3 = hourly_data.get('ozone', [])[i] if i < len(hourly_data.get('ozone', [])) else None
                co = hourly_data.get('carbon_monoxide', [])[i] if i < len(hourly_data.get('carbon_monoxide', [])) else None
                
                if pm25 is not None:
                    raw_data.append({
                        'timestamp': times[i],
                        'pm25': float(pm25) if pm25 else 0,
                        'pm10': float(pm10) if pm10 else 0,
                        'no2': float(no2) if no2 else 0,
                        'o3': float(o3) if o3 else 0,
                        'co': float(co) / 1000.0 if co else 0  # Convertir de µg/m³ a mg/m³
                    })
            except (IndexError, TypeError, ValueError):
                continue
        
        # Agregar datos según la escala
        if scale == "hourly":
            return raw_data
        elif scale == "daily":
            return aggregate_by_day(raw_data)
        else:  # monthly
            return aggregate_by_month(raw_data)
            
    except requests.exceptions.Timeout:
        logger.warning("⏱️ Timeout consultando Open-Meteo")
        return []
    except Exception as e:
        logger.error(f"❌ Error en Open-Meteo: {str(e)}")
        return []


def aggregate_by_day(data: List[Dict]) -> List[Dict]:
    """Agrega datos horarios por día"""
    if not data:
        return []
    
    daily = {}
    for record in data:
        # Extraer solo la fecha (sin hora)
        date_str = record['timestamp'][:10]  # "2025-01-01"
        
        if date_str not in daily:
            daily[date_str] = {
                'timestamp': date_str,
                'pm25_values': [],
                'pm10_values': [],
                'no2_values': [],
                'o3_values': [],
                'co_values': []
            }
        
        if record['pm25']: daily[date_str]['pm25_values'].append(record['pm25'])
        if record['pm10']: daily[date_str]['pm10_values'].append(record['pm10'])
        if record['no2']: daily[date_str]['no2_values'].append(record['no2'])
        if record['o3']: daily[date_str]['o3_values'].append(record['o3'])
        if record['co']: daily[date_str]['co_values'].append(record['co'])
    
    # Calcular promedios
    result = []
    for date_str in sorted(daily.keys()):
        d = daily[date_str]
        result.append({
            'timestamp': date_str,
            'pm25': round(sum(d['pm25_values']) / len(d['pm25_values']), 2) if d['pm25_values'] else 0,
            'pm10': round(sum(d['pm10_values']) / len(d['pm10_values']), 2) if d['pm10_values'] else 0,
            'no2': round(sum(d['no2_values']) / len(d['no2_values']), 2) if d['no2_values'] else 0,
            'o3': round(sum(d['o3_values']) / len(d['o3_values']), 2) if d['o3_values'] else 0,
            'co': round(sum(d['co_values']) / len(d['co_values']), 3) if d['co_values'] else 0
        })
    
    return result


def aggregate_by_month(data: List[Dict]) -> List[Dict]:
    """Agrega datos horarios por mes"""
    if not data:
        return []
    
    monthly = {}
    for record in data:
        # Extraer año-mes
        month_str = record['timestamp'][:7] + "-01"  # "2025-01-01"
        
        if month_str not in monthly:
            monthly[month_str] = {
                'timestamp': month_str,
                'pm25_values': [],
                'pm10_values': [],
                'no2_values': [],
                'o3_values': [],
                'co_values': []
            }
        
        if record['pm25']: monthly[month_str]['pm25_values'].append(record['pm25'])
        if record['pm10']: monthly[month_str]['pm10_values'].append(record['pm10'])
        if record['no2']: monthly[month_str]['no2_values'].append(record['no2'])
        if record['o3']: monthly[month_str]['o3_values'].append(record['o3'])
        if record['co']: monthly[month_str]['co_values'].append(record['co'])
    
    # Calcular promedios
    result = []
    for month_str in sorted(monthly.keys()):
        m = monthly[month_str]
        result.append({
            'timestamp': month_str,
            'pm25': round(sum(m['pm25_values']) / len(m['pm25_values']), 2) if m['pm25_values'] else 0,
            'pm10': round(sum(m['pm10_values']) / len(m['pm10_values']), 2) if m['pm10_values'] else 0,
            'no2': round(sum(m['no2_values']) / len(m['no2_values']), 2) if m['no2_values'] else 0,
            'o3': round(sum(m['o3_values']) / len(m['o3_values']), 2) if m['o3_values'] else 0,
            'co': round(sum(m['co_values']) / len(m['co_values']), 3) if m['co_values'] else 0
        })
    
    return result


async def get_local_historical_data(db: Session, start_date: datetime, end_date: datetime, scale: str) -> List[Dict]:
    """
    Obtiene datos históricos de la base de datos local usando sintaxis PostgreSQL.
    """
    try:
        start_datetime = datetime.combine(start_date.date(), datetime.min.time())
        end_datetime = datetime.combine(end_date.date(), datetime.max.time())
        
        if scale == "hourly":
            result = db.query(
                func.to_char(func.date_trunc('hour', models.AirQualityReading.timestamp), 'YYYY-MM-DD HH24:00:00').label('timestamp'),
                func.avg(models.AirQualityReading.pm25).label('pm25'),
                func.avg(models.AirQualityReading.pm10).label('pm10'),
                func.avg(models.AirQualityReading.no2).label('no2'),
                func.avg(models.AirQualityReading.o3).label('o3'),
                func.avg(models.AirQualityReading.co).label('co')
            ).filter(
                models.AirQualityReading.timestamp.between(start_datetime, end_datetime)
            ).group_by(
                func.date_trunc('hour', models.AirQualityReading.timestamp)
            ).order_by(
                func.date_trunc('hour', models.AirQualityReading.timestamp)
            ).limit(1000).all()
            
        elif scale == "daily":
            result = db.query(
                func.to_char(func.date_trunc('day', models.AirQualityReading.timestamp), 'YYYY-MM-DD').label('timestamp'),
                func.avg(models.AirQualityReading.pm25).label('pm25'),
                func.avg(models.AirQualityReading.pm10).label('pm10'),
                func.avg(models.AirQualityReading.no2).label('no2'),
                func.avg(models.AirQualityReading.o3).label('o3'),
                func.avg(models.AirQualityReading.co).label('co')
            ).filter(
                models.AirQualityReading.timestamp.between(start_datetime, end_datetime)
            ).group_by(
                func.date_trunc('day', models.AirQualityReading.timestamp)
            ).order_by(
                func.date_trunc('day', models.AirQualityReading.timestamp)
            ).limit(366).all()
            
        else:  # monthly
            result = db.query(
                func.to_char(func.date_trunc('month', models.AirQualityReading.timestamp), 'YYYY-MM-01').label('timestamp'),
                func.avg(models.AirQualityReading.pm25).label('pm25'),
                func.avg(models.AirQualityReading.pm10).label('pm10'),
                func.avg(models.AirQualityReading.no2).label('no2'),
                func.avg(models.AirQualityReading.o3).label('o3'),
                func.avg(models.AirQualityReading.co).label('co')
            ).filter(
                models.AirQualityReading.timestamp.between(start_datetime, end_datetime)
            ).group_by(
                func.date_trunc('month', models.AirQualityReading.timestamp)
            ).order_by(
                func.date_trunc('month', models.AirQualityReading.timestamp)
            ).limit(12).all()
        
        data = []
        for row in result:
            data.append({
                "timestamp": str(row.timestamp),
                "pm25": round(float(row.pm25), 2) if row.pm25 else 0,
                "pm10": round(float(row.pm10), 2) if row.pm10 else 0,
                "no2": round(float(row.no2), 2) if row.no2 else 0,
                "o3": round(float(row.o3), 2) if row.o3 else 0,
                "co": round(float(row.co), 3) if row.co else 0
            })
        
        return data
        
    except Exception as e:
        logger.error(f"Error consultando BD local: {str(e)}", exc_info=True)
        return []


async def store_historical_data_async(db: Session, data: List[Dict], start_date: datetime, end_date: datetime):
    """
    Almacena datos históricos en background (no bloquea la respuesta).
    Solo guarda una muestra representativa para no sobrecargar la BD.
    """
    try:
        # Solo guardar datos si hay pocos registros locales
        # Guardar máximo 100 registros por consulta (muestra representativa)
        sample_size = min(100, len(data))
        step = max(1, len(data) // sample_size)
        sampled_data = data[::step][:sample_size]
        
        stored = 0
        for record in sampled_data:
            try:
                timestamp_str = record['timestamp']
                if 'T' in timestamp_str:
                    timestamp = datetime.fromisoformat(timestamp_str.replace('Z', ''))
                else:
                    timestamp = datetime.strptime(timestamp_str[:10], "%Y-%m-%d")
                
                # Verificar si existe
                existing = db.query(models.AirQualityReading.id).filter(
                    func.date_trunc('hour', models.AirQualityReading.timestamp) == func.date_trunc('hour', timestamp)
                ).first()
                
                if not existing:
                    reading = models.AirQualityReading(
                        timestamp=timestamp,
                        latitude=19.5438,
                        longitude=-96.9102,
                        pm25=record['pm25'],
                        pm10=record['pm10'],
                        no2=record['no2'],
                        o3=record['o3'],
                        co=record['co'],
                        source='openmeteo_historical'
                    )
                    db.add(reading)
                    stored += 1
                    
                    if stored % 20 == 0:
                        db.commit()
                        
            except Exception:
                continue
        
        if stored > 0:
            db.commit()
            logger.info(f"💾 Guardados {stored} registros históricos en background")
            
    except Exception as e:
        logger.error(f"Error guardando datos históricos: {str(e)}")
        try:
            db.rollback()
        except:
            pass


def calculate_statistics(data: List[Dict]) -> Dict:
    """Calcula estadísticas de los datos"""
    if not data:
        return {}
    
    stats = {}
    pollutants = ['pm25', 'pm10', 'no2', 'o3', 'co']
    
    for pollutant in pollutants:
        values = [d[pollutant] for d in data if d.get(pollutant) is not None and d.get(pollutant) > 0]
        if values:
            stats[pollutant] = {
                'min': round(min(values), 2),
                'max': round(max(values), 2),
                'avg': round(sum(values) / len(values), 2),
                'count': len(values)
            }
        else:
            stats[pollutant] = {'min': 0, 'max': 0, 'avg': 0, 'count': 0}
    
    return stats
