from typing import Optional, List, Dict
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
import asyncio
from database import get_db
from data_collectors.air_quality_collector import OpenMeteoCollector
from repositories.crud import AirQualityRepository
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
openmeteo_collector = OpenMeteoCollector()

@router.get("/api/air-quality/historical")
async def get_historical_data(
    start: str = Query(..., description="Fecha de inicio (YYYY-MM-DD)"),
    end: str = Query(..., description="Fecha de fin (YYYY-MM-DD)"),
    scale: str = Query("daily", description="Escala de tiempo: hourly, daily, monthly"),
    db: Session = Depends(get_db)
):
    """
    Obtiene datos históricos de calidad del aire con diferentes escalas de tiempo
    """
    try:
        # Validar fechas
        start_date = datetime.strptime(start, "%Y-%m-%d")
        end_date = datetime.strptime(end, "%Y-%m-%d")
        
        if end_date < start_date:
            raise HTTPException(400, "La fecha de fin debe ser posterior a la fecha de inicio")
        
        if (end_date - start_date).days > 365:
            raise HTTPException(400, "El rango máximo es de 1 año")
        
        # Primero intentar obtener datos de la base de datos local
        local_data = await get_local_historical_data(db, start_date, end_date, scale)
        
        # Si no hay suficientes datos locales y el rango es reciente, consultar API
        if len(local_data) < 10 and end_date >= datetime.now() - timedelta(days=60):
            logger.info(f"Datos locales insuficientes ({len(local_data)} registros), consultando API...")
            api_data = await fetch_historical_from_api(start_date, end_date)
            
            if api_data:
                # Guardar en base de datos
                await store_historical_data(db, api_data)
                # Reconsultar datos locales
                local_data = await get_local_historical_data(db, start_date, end_date, scale)
        
        # Calcular estadísticas
        statistics = calculate_statistics(local_data)
        
        return {
            "data": local_data,
            "statistics": statistics,
            "metadata": {
                "start": start,
                "end": end,
                "scale": scale,
                "total_records": len(local_data),
                "source": "mixed" if len(local_data) > 0 else "none"
            }
        }
        
    except ValueError as e:
        raise HTTPException(400, f"Formato de fecha inválido: {str(e)}")
    except Exception as e:
        logger.error(f"Error obteniendo datos históricos: {str(e)}")
        raise HTTPException(500, f"Error al obtener datos históricos: {str(e)}")

async def get_local_historical_data(db: Session, start_date: datetime, end_date: datetime, scale: str) -> List[Dict]:
    """
    Obtiene datos históricos de la base de datos local usando sintaxis PostgreSQL
    """
    try:
        # Ajustar las fechas para incluir todo el día
        start_datetime = datetime.combine(start_date.date(), datetime.min.time())
        end_datetime = datetime.combine(end_date.date(), datetime.max.time())
        
        if scale == "hourly":
            # Datos por hora usando date_trunc de PostgreSQL
            result = db.query(
                func.date_trunc('hour', models.AirQualityReading.timestamp).label('timestamp'),
                func.avg(models.AirQualityReading.pm25).label('pm25'),
                func.avg(models.AirQualityReading.pm10).label('pm10'),
                func.avg(models.AirQualityReading.no2).label('no2'),
                func.avg(models.AirQualityReading.o3).label('o3'),
                func.avg(models.AirQualityReading.co).label('co')
            ).filter(
                models.AirQualityReading.timestamp.between(start_datetime, end_datetime)
            ).group_by(
                func.date_trunc('hour', models.AirQualityReading.timestamp)
            ).order_by('timestamp').all()
            
        elif scale == "daily":
            # Datos por día usando date_trunc de PostgreSQL
            result = db.query(
                func.date_trunc('day', models.AirQualityReading.timestamp).label('timestamp'),
                func.avg(models.AirQualityReading.pm25).label('pm25'),
                func.avg(models.AirQualityReading.pm10).label('pm10'),
                func.avg(models.AirQualityReading.no2).label('no2'),
                func.avg(models.AirQualityReading.o3).label('o3'),
                func.avg(models.AirQualityReading.co).label('co')
            ).filter(
                models.AirQualityReading.timestamp.between(start_datetime, end_datetime)
            ).group_by(
                func.date_trunc('day', models.AirQualityReading.timestamp)
            ).order_by('timestamp').all()
            
        else:  # monthly
            # Datos por mes usando date_trunc de PostgreSQL
            result = db.query(
                func.date_trunc('month', models.AirQualityReading.timestamp).label('timestamp'),
                func.avg(models.AirQualityReading.pm25).label('pm25'),
                func.avg(models.AirQualityReading.pm10).label('pm10'),
                func.avg(models.AirQualityReading.no2).label('no2'),
                func.avg(models.AirQualityReading.o3).label('o3'),
                func.avg(models.AirQualityReading.co).label('co')
            ).filter(
                models.AirQualityReading.timestamp.between(start_datetime, end_datetime)
            ).group_by(
                func.date_trunc('month', models.AirQualityReading.timestamp)
            ).order_by('timestamp').all()
        
        # Convertir a diccionarios
        data = []
        for row in result:
            data.append({
                "timestamp": str(row.timestamp),
                "pm25": float(row.pm25) if row.pm25 else 0,
                "pm10": float(row.pm10) if row.pm10 else 0,
                "no2": float(row.no2) if row.no2 else 0,
                "o3": float(row.o3) if row.o3 else 0,
                "co": float(row.co) if row.co else 0
            })
        
        return data
        
    except Exception as e:
        logger.error(f"Error consultando base de datos local: {str(e)}")
        return []

async def fetch_historical_from_api(start_date: datetime, end_date: datetime) -> List[Dict]:
    """
    Obtiene datos históricos de Open Meteo API
    """
    all_data = []
    current_date = start_date
    
    # Open Meteo tiene un límite de ~40 días por consulta
    max_days_per_request = 30
    
    while current_date < end_date:
        # Calcular el rango para esta consulta
        chunk_end = min(current_date + timedelta(days=max_days_per_request), end_date)
        
        try:
            # Hacer la consulta a Open Meteo
            params = {
                "latitude": 19.5438,
                "longitude": -96.9102,
                "hourly": ["pm10", "pm2_5", "nitrogen_dioxide", "carbon_monoxide", "ozone"],
                "timezone": "America/Mexico_City",
                "start_date": current_date.strftime("%Y-%m-%d"),
                "end_date": chunk_end.strftime("%Y-%m-%d")
            }
            
            logger.info(f"Consultando Open Meteo: {params['start_date']} a {params['end_date']}")
            
            import requests
            response = requests.get(
                "https://air-quality-api.open-meteo.com/v1/air-quality",
                params=params,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                hourly_data = data.get('hourly', {})
                times = hourly_data.get('time', [])
                
                # Procesar los datos
                for i in range(len(times)):
                    try:
                        if all(hourly_data.get(key, [])[i] is not None for key in 
                               ['pm2_5', 'pm10', 'nitrogen_dioxide', 'ozone', 'carbon_monoxide']):
                            all_data.append({
                                'timestamp': times[i],
                                'pm25': float(hourly_data['pm2_5'][i]),
                                'pm10': float(hourly_data['pm10'][i]),
                                'no2': float(hourly_data['nitrogen_dioxide'][i]),
                                'o3': float(hourly_data['ozone'][i]),
                                'co': float(hourly_data['carbon_monoxide'][i]) / 1000.0,
                                'source': 'openmeteo'
                            })
                    except (IndexError, TypeError, ValueError):
                        continue
                
                logger.info(f"Obtenidos {len(times)} registros de Open Meteo")
            else:
                logger.warning(f"Error en Open Meteo API: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Error consultando Open Meteo: {str(e)}")
        
        # Avanzar al siguiente chunk
        current_date = chunk_end + timedelta(days=1)
        
        # Pequeña pausa para no sobrecargar la API
        await asyncio.sleep(0.5)
    
    return all_data

async def store_historical_data(db: Session, data: List[Dict]):
    """
    Almacena datos históricos en la base de datos con manejo mejorado de transacciones
    """
    if not data:
        return
        
    try:
        stored_count = 0
        for record in data:
            try:
                # Verificar si el registro ya existe
                existing = db.query(models.AirQualityReading).filter(
                    models.AirQualityReading.timestamp == record['timestamp'],
                    models.AirQualityReading.source == record['source']
                ).first()
                
                if not existing:
                    reading = models.AirQualityReading(
                        timestamp=datetime.fromisoformat(record['timestamp']),
                        latitude=19.5438,
                        longitude=-96.9102,
                        pm25=record['pm25'],
                        pm10=record['pm10'],
                        no2=record['no2'],
                        o3=record['o3'],
                        co=record['co'],
                        source=record['source']
                    )
                    db.add(reading)
                    stored_count += 1
                    
                    # Hacer commit cada 100 registros para evitar transacciones muy largas
                    if stored_count % 100 == 0:
                        db.commit()
                        logger.info(f"Almacenados {stored_count} registros hasta ahora...")
                        
            except Exception as e:
                logger.error(f"Error almacenando registro individual: {str(e)}")
                db.rollback()
                continue
        
        # Commit final
        db.commit()
        logger.info(f"Almacenados {stored_count} registros históricos en total")
        
    except Exception as e:
        logger.error(f"Error almacenando datos históricos: {str(e)}")
        db.rollback()
        raise

def calculate_statistics(data: List[Dict]) -> Dict:
    """
    Calcula estadísticas de los datos
    """
    if not data:
        return {}
    
    stats = {}
    pollutants = ['pm25', 'pm10', 'no2', 'o3', 'co']
    
    for pollutant in pollutants:
        values = [d[pollutant] for d in data if d.get(pollutant) is not None]
        if values:
            stats[pollutant] = {
                'min': min(values),
                'max': max(values),
                'avg': sum(values) / len(values),
                'count': len(values)
            }
        else:
            stats[pollutant] = {
                'min': 0,
                'max': 0,
                'avg': 0,
                'count': 0
            }
    
    return stats

# Importar models al final para evitar importación circular
import models
