"""
============================================================================
Sistema de Monitoreo de Calidad del Aire - Xalapa, Veracruz
============================================================================

ARCHIVO: main.py
PROPÓSITO: Punto de entrada principal de la API REST (FastAPI)

DESCRIPCIÓN:
    Este archivo contiene la configuración principal del servidor FastAPI,
    incluyendo todos los endpoints de la API, middlewares (CORS, rate limiting),
    y la inicialización de servicios como el scheduler de alertas.

ENDPOINTS PRINCIPALES:
    - /health              : Estado del sistema
    - /api/air-quality     : Datos de contaminantes atmosféricos
    - /api/traffic         : Datos de tráfico en tiempo real
    - /api/weather         : Condiciones meteorológicas
    - /api/alerts/*        : Sistema de alertas por email
    - /api/zones/*         : Análisis por zonas geográficas

DEPENDENCIAS EXTERNAS:
    - Open-Meteo CAMS      : Datos de contaminantes (satelitales)
    - TomTom Traffic API   : Datos de congestión vehicular
    - OpenStreetMap        : Análisis de infraestructura vial

AUTOR: Kevin Morales
VERSIÓN: 2.1.0
ÚLTIMA ACTUALIZACIÓN: Diciembre 2025
============================================================================
"""

import os
from typing import Optional, List
from datetime import datetime, date, time, timedelta
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware

# 🆕 MEJORAS: Rate Limiting y Validación de Email
from rate_limiter import rate_limit_middleware_check, get_rate_limit_stats, cleanup_expired_entries
from custom_email_validator import validate_email, validate_email_for_api, normalize_email
from dotenv import load_dotenv
# NOTA: Se eliminó 'import random' - NO usamos datos aleatorios
from sqlalchemy import func, extract
from sqlalchemy.orm import Session
from data_collectors.air_quality_collector import OpenMeteoCollector, get_fallback_data

# Cargar variables de entorno
load_dotenv()
# NOTA: AQICN removido - No hay estación disponible en Xalapa
import models
from database import get_db, engine
from repositories.crud import (
    AirQualityRepository,
    TrafficRepository,
    QuadrantStatsRepository,
    PredictionRepository
)

from data_collectors.traffic_collector import TomTomTrafficCollector
from estimator.ml_pollution_estimator import MLPollutionEstimator
from alert_system import AlertSystem
from historical_routes import router as historical_router
from osm_analyzer import osm_analyzer
from osm_cache import osm_cache
from alert_scheduler import alert_scheduler

# Inicializar colectores
traffic_collector = TomTomTrafficCollector()
ml_estimator = MLPollutionEstimator()
alert_system = AlertSystem()

# ============================================================================
# CONFIGURACIÓN DE SWAGGER/OPENAPI - MEJORA DE DOCUMENTACIÓN
# ============================================================================
# Tags para organizar la documentación de la API
# Cada tag agrupa endpoints relacionados con descripciones claras
# ============================================================================
tags_metadata = [
    {
        "name": "🏥 Estado del Sistema",
        "description": "Endpoints para verificar el estado y salud del sistema."
    },
    {
        "name": "🌬️ Calidad del Aire",
        "description": "Datos de contaminantes atmosféricos (PM2.5, PM10, NO₂, O₃, CO) de Open-Meteo CAMS."
    },
    {
        "name": "🚗 Tráfico",
        "description": "Información de tráfico en tiempo real desde TomTom Traffic API."
    },
    {
        "name": "🌤️ Clima",
        "description": "Condiciones meteorológicas actuales de Xalapa."
    },
    {
        "name": "🗺️ Zonas",
        "description": "Análisis de contaminación por zonas geográficas de Xalapa."
    },
    {
        "name": "🔔 Alertas",
        "description": "Sistema de alertas y notificaciones por correo electrónico."
    },
    {
        "name": "📊 Predicciones",
        "description": "Predicciones y tendencias de calidad del aire usando ML."
    },
    {
        "name": "📈 Comparaciones",
        "description": "Comparaciones entre períodos de tiempo."
    },
    {
        "name": "🔧 Diagnóstico",
        "description": "Herramientas de diagnóstico y verificación de datos (útil para tesis)."
    }
]

# Crear la aplicación FastAPI con documentación mejorada
app = FastAPI(
    title="Sistema de Monitoreo de Calidad del Aire - Xalapa",
    description="""
## 🌍 API de Monitoreo Atmosférico para Xalapa, Veracruz

Este sistema proporciona datos en tiempo real sobre la calidad del aire en Xalapa,
utilizando múltiples fuentes de datos científicos.

### 📡 Fuentes de Datos
- **Open-Meteo (CAMS)**: Datos de contaminantes atmosféricos del servicio Copernicus/ECMWF
- **TomTom Traffic API**: Información de tráfico en tiempo real
- **OpenStreetMap**: Análisis de infraestructura vial

### 🔬 Contaminantes Monitoreados
- PM2.5 (Partículas finas)
- PM10 (Partículas gruesas)  
- NO₂ (Dióxido de nitrógeno)
- O₃ (Ozono)
- CO (Monóxido de carbono)

### 📋 Documentación
Para más información sobre los endpoints, consulta las secciones a continuación.

### ⚠️ Rate Limiting
- Endpoints generales: 100 req/min
- Suscripciones: 5 req/min
- Endpoints costosos: 30 req/min
    """,
    version="2.1.0",
    openapi_tags=tags_metadata,
    docs_url="/docs",
    redoc_url="/redoc",
    contact={
        "name": "REVIVE - Red de Viveros de Biodiversidad",
        "url": "https://github.com/KevinMM007/Sistema-de-Monitoreo-Atmosferico"
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT"
    }
)

# ============================================================================
# CONFIGURACIÓN DE CORS (Actualizado)
# ============================================================================
print("\n🔒 Configuración CORS: Activada explícitamente para Vercel\n")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://calidad-aire-xalapa.vercel.app",  # Tu frontend en Vercel
        "http://localhost:3000",                   # Frontend local
        "http://localhost:5173"                    # Frontend local (Vite)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)
# Crear las tablas de la base de datos
models.Base.metadata.create_all(bind=engine)

# Incluir las rutas de datos históricos con prefijo /api
app.include_router(historical_router, prefix="/api")

# ============================================================================
# COLECTOR DE DATOS - SOLO OPEN-METEO (CAMS)
# ============================================================================
# Open-Meteo usa el modelo CAMS (Copernicus Atmosphere Monitoring Service)
# - Datos satelitales científicos validados por ECMWF/Unión Europea
# - Cobertura global incluyendo Xalapa
# - Resolución ~40km, actualización cada hora
# - Ideal para zonas sin estaciones de monitoreo físicas
# ============================================================================
openmeteo_collector = OpenMeteoCollector()

# Cargar suscripciones e iniciar scheduler al iniciar
@app.on_event("startup")
async def startup_event():
    """Carga suscripciones e inicia el scheduler de alertas"""
    try:
        db = next(get_db())
        active_subscriptions = db.query(models.AlertSubscription).filter(
            models.AlertSubscription.is_active == True
        ).all()

        for sub in active_subscriptions:
            alert_system.subscribe_email(sub.email)

        print(f"✓ Cargadas {len(active_subscriptions)} suscripciones activas")

        # Iniciar el scheduler de alertas automáticas
        alert_scheduler.start({
            'openmeteo_collector': openmeteo_collector,
            'alert_system': alert_system,
            'get_db': get_db
        })

    except Exception as e:
        print(f"⚠️ Error en startup: {str(e)}")


@app.on_event("shutdown")
async def shutdown_event():
    """Detiene el scheduler al apagar el servidor"""
    alert_scheduler.stop()

# ============================================================================
# ENDPOINTS DE ESTADO Y DIAGNÓSTICO
# ============================================================================

@app.get("/api/health", tags=["🏥 Estado del Sistema"], summary="Verificar estado del sistema")
async def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "data_sources": {
            "air_quality": "Open-Meteo (CAMS)",
            "traffic": "TomTom Traffic API"
        }
    }

@app.get("/api/rate-limit-stats", tags=["🏥 Estado del Sistema"], summary="Estadísticas de rate limiting")
async def get_rate_limit_statistics():
    """
    Obtiene estadísticas del sistema de rate limiting.

    Útil para monitorear el uso de la API.
    """
    stats = get_rate_limit_stats()
    # Limpiar entradas expiradas
    cleaned = cleanup_expired_entries()
    stats["entries_cleaned"] = cleaned
    return stats


@app.get("/api/scheduler/status", tags=["🏥 Estado del Sistema"], summary="Estado del scheduler de alertas")
async def get_scheduler_status():
    """
    Obtiene el estado del scheduler de verificación automática de alertas.

    El scheduler verifica la calidad del aire cada 30 minutos y envía
    alertas por email cuando PM2.5 supera 35.4 µg/m³.
    """
    return alert_scheduler.get_status()


@app.get("/api/test-db", tags=["🏥 Estado del Sistema"], summary="Probar conexión a base de datos")
async def test_database(db: Session = Depends(get_db)):
    try:
        test_reading = models.AirQualityReading(
            latitude=19.5438,
            longitude=-96.9102,
            pm25=25.0,
            pm10=50.0,
            no2=30.0,
            o3=40.0,
            co=1.0,
            source="test"
        )
        db.add(test_reading)
        db.commit()
        
        latest = db.query(models.AirQualityReading)\
            .order_by(models.AirQualityReading.timestamp.desc())\
            .first()
        
        return {
            "message": "Database test successful", 
            "data": latest.to_dict() if latest else None
        }
    except Exception as e:
        return {"error": f"Database test failed: {str(e)}"}

@app.get("/api/diagnostics", tags=["🔧 Diagnóstico"], summary="Obtener diagnóstico completo del sistema")
async def get_diagnostics():
    """
    🔍 ENDPOINT DE DIAGNÓSTICO PARA VERIFICACIÓN DE DATOS
    
    Útil para validar la autenticidad de los datos en trabajos académicos.
    """
    try:
        air_quality_test = await openmeteo_collector.test_connection()
        collector_status = openmeteo_collector.get_status()
        current_data = await openmeteo_collector.get_air_quality_data()
        
        data_analysis = {
            "total_records": len(current_data) if current_data else 0,
            "real_data_records": sum(1 for d in current_data if d.get('is_real_data', False)) if current_data else 0,
            "fallback_records": sum(1 for d in current_data if d.get('is_fallback', False)) if current_data else 0,
            "data_source": current_data[0].get('source', 'unknown') if current_data else 'no_data',
            "data_provider": current_data[0].get('data_provider', 'unknown') if current_data else 'no_data',
        }
        
        sample_data = None
        if current_data and len(current_data) > 0:
            sample_data = {
                "first_records": current_data[:2],
                "last_records": current_data[-2:] if len(current_data) > 2 else current_data,
                "timestamp_range": {
                    "oldest": current_data[0].get('timestamp'),
                    "newest": current_data[-1].get('timestamp')
                }
            }
        
        return {
            "diagnostic_timestamp": datetime.now().isoformat(),
            "system_info": {
                "location": "Xalapa, Veracruz, México",
                "coordinates": {"latitude": 19.5438, "longitude": -96.9102},
                "timezone": "America/Mexico_City"
            },
            "api_connection_test": {
                "open_meteo_air_quality": {
                    "url": "https://air-quality-api.open-meteo.com/v1/air-quality",
                    "status": "connected" if air_quality_test.get('success') else "failed",
                    "response_code": air_quality_test.get('status_code'),
                    "response_time_ms": air_quality_test.get('response_time_ms'),
                }
            },
            "collector_status": collector_status,
            "data_analysis": data_analysis,
            "data_authenticity": {
                "is_real_data": data_analysis['real_data_records'] > 0,
                "is_using_fallback": data_analysis['fallback_records'] > 0,
                "verification_note": (
                    "✅ Los datos provienen de la API de Open Meteo (datos reales del modelo CAMS)"
                    if data_analysis['real_data_records'] > 0
                    else "⚠️ Se están usando datos de respaldo simulados"
                )
            },
            "sample_data": sample_data,
            "data_sources_info": {
                "open_meteo": {
                    "description": "Open-Meteo proporciona datos de calidad del aire del modelo CAMS",
                    "documentation": "https://open-meteo.com/en/docs/air-quality-api",
                    "model": "CAMS (Copernicus Atmosphere Monitoring Service)",
                    "model_info": "Modelo operado por ECMWF para la Unión Europea",
                    "resolution": "~40km horizontal",
                    "update_frequency": "Cada hora"
                }
            },
            "academic_citation": {
                "open_meteo": "Open-Meteo. (2024). Air Quality API. https://open-meteo.com",
                "cams": "Copernicus Atmosphere Monitoring Service. ECMWF. https://atmosphere.copernicus.eu/"
            }
        }
    except Exception as e:
        return {"error": str(e), "status": "diagnostic_failed"}

@app.get("/api/data-verification")
async def verify_current_data():
    """
    🔎 VERIFICACIÓN DE DATOS EN TIEMPO REAL
    
    Para tu tesis: Este endpoint te permite verificar la autenticidad de los datos.
    """
    try:
        openmeteo_data = await openmeteo_collector.get_air_quality_data()
        
        if openmeteo_data and len(openmeteo_data) > 0:
            first_record = openmeteo_data[0]
            is_real = first_record.get('is_real_data', False)
            is_fallback = first_record.get('is_fallback', False)
            
            if is_real and not is_fallback:
                return {
                    "verification_timestamp": datetime.now().isoformat(),
                    "data_status": {
                        "is_real_data": True,
                        "is_satellite_model": True,
                        "is_fallback_simulated": False,
                        "source": "open_meteo_air_quality_api",
                        "source_type": "Modelo satelital CAMS (Copernicus)",
                        "source_url": "https://air-quality-api.open-meteo.com/v1/air-quality",
                        "data_provider": "Open-Meteo.com + Copernicus/ECMWF",
                    },
                    "verification_result": "✅ DATOS VERIFICADOS: Modelo satelital CAMS",
                    "data_quality": "Alta - Modelo científico validado por ECMWF",
                    "recommended_for_thesis": True,
                    "note": "Los datos provienen del modelo CAMS de la Unión Europea. Son datos científicos reales basados en observaciones satelitales y modelos atmosféricos.",
                    "total_records": len(openmeteo_data),
                    "current_values": {
                        "pm25": first_record.get('pm25'),
                        "pm10": first_record.get('pm10'),
                        "no2": first_record.get('no2'),
                        "o3": first_record.get('o3'),
                        "co": first_record.get('co')
                    },
                    "collector_status": openmeteo_collector.get_status()
                }
        
        return {
            "verification_timestamp": datetime.now().isoformat(),
            "data_status": {
                "is_real_data": False,
                "is_satellite_model": False,
                "is_fallback_simulated": True,
                "source": "fallback_simulated",
            },
            "verification_result": "⚠️ DATOS SIMULADOS: API no disponible",
            "data_quality": "Baja - Datos simulados",
            "recommended_for_thesis": False,
            "warning": "Los datos mostrados son simulaciones de respaldo. NO usar para investigación académica."
        }
    except Exception as e:
        return {"error": str(e), "status": "verification_failed"}

@app.get("/api/collector-status", tags=["🔧 Diagnóstico"], summary="Estado del colector de datos")
async def get_collector_status():
    """Endpoint para obtener el estado del colector de datos"""
    try:
        if hasattr(openmeteo_collector, 'get_data_status'):
            return openmeteo_collector.get_data_status()
        else:
            return {
                "last_successful_fetch": None,
                "consecutive_failures": 0,
                "is_operational": True,
                "data_source": "Open-Meteo (CAMS)",
                "message": "Colector operativo"
            }
    except Exception as e:
        print(f"Error en get_collector_status: {str(e)}")
        return {
            "error": "Error al obtener estado del colector",
            "is_operational": False
        }

# ============================================================================
# ENDPOINTS DE CALIDAD DEL AIRE
# ============================================================================

@app.get("/api/air-quality", tags=["🌬️ Calidad del Aire"], summary="Obtener datos de calidad del aire")
async def get_air_quality(
    db: Session = Depends(get_db),
    source: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    limit: int = 10,
    offset: int = 0
):
    """
    Endpoint principal para obtener datos de calidad del aire.
    
    FUENTE DE DATOS:
    - Open-Meteo/CAMS: Modelo satelital Copernicus (datos científicos validados)
    
    Para tu tesis: Los datos provienen del modelo CAMS (Copernicus Atmosphere 
    Monitoring Service) de la Unión Europea, un modelo científico validado
    y ampliamente utilizado en investigación atmosférica.
    """
    try:
        # Si se solicitan datos históricos
        if start_time and end_time:
            readings = AirQualityRepository.get_readings_in_timeframe(
                db, start_time, end_time, limit, offset
            )
            if readings:
                return [reading.to_dict() for reading in readings]

        # Obtener datos de Open-Meteo (modelo CAMS)
        print("\n🌍 Obteniendo datos de Open-Meteo (modelo CAMS)...")
        openmeteo_data = await openmeteo_collector.get_air_quality_data()
        
        if openmeteo_data:
            print("✅ Datos obtenidos de Open-Meteo (modelo CAMS)")
            
            # Guardar los datos en la base de datos
            try:
                success = AirQualityRepository.store_batch_readings(
                    db,
                    [{
                        "latitude": reading["latitude"],
                        "longitude": reading["longitude"],
                        "pm25": reading["pm25"],
                        "pm10": reading["pm10"],
                        "no2": reading["no2"],
                        "o3": reading["o3"],
                        "co": reading["co"],
                        "source": "openmeteo_cams",
                        "raw_data": reading,
                        "timestamp": datetime.now()
                    } for reading in openmeteo_data]
                )
            except Exception as e:
                print(f"Error guardando datos: {str(e)}")
            
            return openmeteo_data
        
        # Si no hay datos nuevos, obtener los últimos datos almacenados
        print("⚠️ API no disponible, buscando datos en base de datos local...")
        latest_readings = AirQualityRepository.get_latest_readings(db, limit)
        
        if latest_readings:
            return [reading.to_dict() for reading in latest_readings]
            
        # Último recurso: datos simulados
        print("❌ Sin datos disponibles, usando datos de respaldo SIMULADOS")
        print("⚠️ ADVERTENCIA: Estos datos NO son reales, no usar para investigación")
        return get_fallback_data()
        
    except Exception as e:
        print(f"Error en get_air_quality: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Error al obtener datos de calidad del aire"}
        )

@app.get("/api/air-quality/latest")
async def get_latest_readings(db: Session = Depends(get_db)):
    """Endpoint para obtener las últimas lecturas"""
    try:
        readings = AirQualityRepository.get_latest_readings(db, limit=10)
        return [reading.to_dict() for reading in readings]
    except Exception as e:
        print(f"Error obteniendo últimas lecturas: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Error al obtener últimas lecturas"}
        )

@app.get("/api/air-quality/history", tags=["🌬️ Calidad del Aire"], summary="Historial de calidad del aire")
async def get_air_quality_history(
    start_time: datetime,
    end_time: datetime,
    db: Session = Depends(get_db)
):
    """Endpoint para obtener datos históricos de calidad del aire"""
    try:
        readings = AirQualityRepository.get_readings_in_timeframe(
            db, start_time, end_time
        )
        return [reading.to_dict() for reading in readings]
    except Exception as e:
        print(f"Error en get_air_quality_history: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Error al obtener datos históricos"}
        )

@app.get("/api/air-quality/history/daily")
async def get_daily_history(
    date: date,
    limit: Optional[int] = 100,
    offset: Optional[int] = 0,
    db: Session = Depends(get_db)
):
    """Obtiene el historial de un día específico"""
    try:
        start_time = datetime.combine(date, time.min)
        end_time = datetime.combine(date, time.max)
        
        total_count = AirQualityRepository.get_readings_count_in_timeframe(
            db, start_time, end_time
        )
        
        readings = AirQualityRepository.get_readings_in_timeframe(
            db, start_time, end_time, limit, offset
        )
        
        return {
            "total": total_count,
            "limit": limit,
            "offset": offset,
            "data": [reading.to_dict() for reading in readings]
        }
    except Exception as e:
        print(f"Error getting daily history: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Error al obtener historial diario"}
        )

@app.get("/api/air-quality/by-zone", tags=["🗺️ Zonas"], summary="Calidad del aire por zona geográfica")
async def get_air_quality_by_zone(db: Session = Depends(get_db)):
    """
    Combina OpenMeteo + OSM + TomTom para calcular contaminación por zona.
    
    FUENTES DE DATOS:
    - Calidad del aire base: Open-Meteo (modelo CAMS)
    - Factores de infraestructura: OpenStreetMap
    - Tráfico en tiempo real: TomTom Traffic API
    
    IMPORTANTE: Todos los datos provienen de fuentes externas reales.
    No se usan datos aleatorios ni simulados.
    """
    try:
        print("\n" + "="*60)
        print("📊 CALCULANDO CALIDAD DEL AIRE POR ZONA")
        print("="*60)
        
        # 1. Obtener datos base de OpenMeteo
        print("\n🌍 [1/3] Obteniendo datos de Open-Meteo (CAMS)...")
        base_data = await openmeteo_collector.get_air_quality_data()
        
        data_source_info = {
            'openmeteo': {'status': 'ok', 'type': 'api'},
            'osm': {'status': 'pending', 'type': 'api'},
            'tomtom': {'status': 'pending', 'type': 'api'}
        }
        
        if not base_data:
            print("  ⚠️ API no disponible, buscando en base de datos local...")
            latest_readings = AirQualityRepository.get_latest_readings(db, limit=1)
            if not latest_readings:
                raise HTTPException(status_code=503, detail="No hay datos disponibles")
            base_data = [latest_readings[0].to_dict()]
            data_source_info['openmeteo'] = {'status': 'fallback_db', 'type': 'database'}
        
        # IMPORTANTE: Usar el último registro (más reciente) para coincidir con las Estadísticas Actuales
        # Los datos están ordenados cronológicamente (ascendente), así que [-1] es el más reciente
        base_reading = base_data[-1]  # Cambiado de base_data[0] a base_data[-1]
        print(f"  ✅ Datos base obtenidos (registro más reciente):")
        print(f"     PM2.5: {base_reading.get('pm25', 'N/A')} µg/m³")
        print(f"     PM10: {base_reading.get('pm10', 'N/A')} µg/m³")
        print(f"     Fuente: {base_reading.get('source', 'openmeteo')}")
        
        # 2. Obtener factores OSM
        print("\n🗺️ [2/3] Obteniendo factores de infraestructura (OSM)...")
        osm_data = await get_zones_osm_analysis()
        osm_zones = {zone['zone_name']: zone for zone in osm_data['zones']}
        data_source_info['osm'] = {'status': 'ok', 'type': 'api'}
        print(f"  ✅ Factores OSM obtenidos para {len(osm_zones)} zonas")
        
        # 3. Obtener datos de tráfico de TomTom
        print("\n🚗 [3/3] Obteniendo datos de tráfico (TomTom)...")
        traffic_data_list = await traffic_collector.get_traffic_data()
        traffic_by_zone = {t['area_name']: t for t in traffic_data_list} if traffic_data_list else {}
        
        if traffic_data_list and len(traffic_data_list) > 0:
            data_source_info['tomtom'] = {'status': 'ok', 'type': 'api', 'zones_with_data': len(traffic_data_list)}
            print(f"  ✅ Datos de tráfico obtenidos para {len(traffic_data_list)} zonas:")
            for t in traffic_data_list:
                print(f"     {t['area_name']}: {t['congestion_level']:.1f}% congestión ({t['current_speed']:.0f} km/h)")
        else:
            data_source_info['tomtom'] = {'status': 'no_data', 'type': 'api', 'zones_with_data': 0}
            print("  ⚠️ No se obtuvieron datos de tráfico de TomTom")
        
        # 4. Calcular por zona
        print("\n📊 Calculando niveles por zona...")
        zones_result = []
        XALAPA_ZONES = [
            {'name': 'Centro', 'bounds': [[19.5200, -96.9250], [19.5500, -96.8900]]},
            {'name': 'Norte', 'bounds': [[19.5500, -96.9750], [19.5900, -96.8550]]},
            {'name': 'Sur', 'bounds': [[19.4900, -96.9750], [19.5200, -96.8550]]},
            {'name': 'Este', 'bounds': [[19.4900, -96.8900], [19.5900, -96.7900]]},
            {'name': 'Oeste', 'bounds': [[19.4900, -97.0200], [19.5900, -96.9250]]}
        ]
        
        for zone in XALAPA_ZONES:
            zone_name = zone['name']
            osm_factor = osm_zones.get(zone_name, {}).get('pollution_factor', 1.0)
            
            traffic_info = traffic_by_zone.get(zone_name)
            if traffic_info:
                congestion_level = traffic_info.get('congestion_level', 0)
                traffic_factor = 1.0 + (congestion_level / 100 * 0.5)
                has_traffic_data = True
            else:
                traffic_factor = 1.0
                congestion_level = 0
                has_traffic_data = False
            
            combined_factor = osm_factor * traffic_factor
            
            zone_result = {
                'zone_name': zone_name,
                'bounds': zone['bounds'],
                'pollutants': {
                    'pm25': round(base_reading['pm25'] * combined_factor, 2),
                    'pm10': round(base_reading['pm10'] * combined_factor, 2),
                    'no2': round(base_reading['no2'] * combined_factor * 1.2, 2),
                    'o3': round(base_reading['o3'] / (combined_factor * 0.85), 2),
                    'co': round(base_reading['co'] * combined_factor, 3)
                },
                'factors': {
                    'osm_factor': round(osm_factor, 2),
                    'traffic_factor': round(traffic_factor, 2),
                    'combined_factor': round(combined_factor, 2)
                },
                'traffic': {
                    'congestion_level': round(congestion_level, 1),
                    'has_real_data': has_traffic_data
                }
            }
            zones_result.append(zone_result)
            
            # Log por zona
            traffic_status = f"{congestion_level:.1f}%" if has_traffic_data else "Sin datos"
            print(f"  {zone_name}: PM2.5={zone_result['pollutants']['pm25']:.2f}, Tráfico={traffic_status}")
        
        print("\n" + "="*60)
        print("✅ CÁLCULO COMPLETADO")
        print("="*60 + "\n")
        
        return {
            'zones': zones_result,
            'timestamp': datetime.now().isoformat(),
            'base_reading': base_reading,
            'data_sources': {
                'air_quality': 'Open-Meteo (CAMS)',
                'traffic': 'TomTom Traffic API',
                'infrastructure': 'OpenStreetMap'
            },
            'data_source_status': data_source_info,
            'note': 'Todos los datos provienen de APIs externas reales. No se usan datos aleatorios.'
        }
        
    except Exception as e:
        print(f"\n❌ ERROR en get_air_quality_by_zone: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ENDPOINTS DE TRÁFICO
# ============================================================================

@app.get("/api/traffic", tags=["🚗 Tráfico"], summary="Datos de tráfico en tiempo real")
async def get_traffic_data(db: Session = Depends(get_db)):
    """
    Endpoint para obtener datos de tráfico REALES de TomTom
    """
    try:
        print("\n🚗 Obteniendo datos de tráfico de TomTom...")
        
        traffic_data = await traffic_collector.get_traffic_data()
        
        if traffic_data and len(traffic_data) > 0:
            print(f"✅ Datos de tráfico obtenidos: {len(traffic_data)} zonas")
            for zone in traffic_data:
                print(f"  {zone['area_name']}: {zone['congestion_level']:.1f}% congestión")
            
            return traffic_data
        else:
            print("⚠️ No se obtuvieron datos de tráfico de TomTom")
            return []
            
    except Exception as e:
        print(f"✗ Error en get_traffic_data: {str(e)}")
        return []

# ============================================================================
# ENDPOINTS DE CLIMA
# ============================================================================

@app.get("/api/weather")
async def get_weather(db: Session = Depends(get_db)):
    """Endpoint para obtener datos meteorológicos"""
    try:
        weather_data = await openmeteo_collector.get_weather_data()
        if weather_data:
            return weather_data
        raise HTTPException(
            status_code=500,
            detail={"error": "No se pudieron obtener datos meteorológicos"}
        )
    except Exception as e:
        print(f"Error en get_weather: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Error al obtener datos meteorológicos"}
        )

# ============================================================================
# ENDPOINTS DE ZONAS Y OSM
# ============================================================================

@app.get("/api/zones/osm-analysis")
async def get_zones_osm_analysis():
    """
    Obtiene análisis de infraestructura vial de OSM para cada zona
    """
    try:
        cache_key = "xalapa_zones_analysis"
        cached_data = osm_cache.get(cache_key)
        
        if cached_data:
            print("Usando datos de OSM desde caché")
            return cached_data
        
        print("Consultando datos de OSM desde API...")
        
        zones = [
            {'name': 'Centro', 'bounds': [[19.5200, -96.9250], [19.5500, -96.8900]]},
            {'name': 'Norte', 'bounds': [[19.5500, -96.9750], [19.5900, -96.8550]]},
            {'name': 'Sur', 'bounds': [[19.4900, -96.9750], [19.5200, -96.8550]]},
            {'name': 'Este', 'bounds': [[19.4900, -96.8900], [19.5900, -96.7900]]},
            {'name': 'Oeste', 'bounds': [[19.4900, -97.0200], [19.5900, -96.9250]]}
        ]
        
        results = []
        for zone in zones:
            try:
                analysis = osm_analyzer.analyze_zone(zone['name'], zone['bounds'])
                results.append(analysis)
            except Exception as e:
                print(f"Error analizando zona {zone['name']}: {str(e)}")
                results.append({
                    'zone_name': zone['name'],
                    'metrics': {'error': 'No se pudieron obtener datos de OSM', 'using_defaults': True},
                    'pollution_factor': 1.0
                })
        
        response_data = {
            'zones': results,
            'timestamp': datetime.now().isoformat(),
            'data_source': 'OpenStreetMap'
        }
        
        if any(not z.get('metrics', {}).get('error') for z in results):
            osm_cache.set(cache_key, response_data)
        
        return response_data
        
    except Exception as e:
        print(f"Error en get_zones_osm_analysis: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Error al obtener análisis de zonas"}
        )

@app.get("/api/quadrants/{quadrant_name}/stats", tags=["🗺️ Zonas"], summary="Estadísticas por cuadrante")
async def get_quadrant_stats(quadrant_name: str, db: Session = Depends(get_db)):
    """Endpoint para obtener estadísticas por cuadrante"""
    try:
        stats = QuadrantStatsRepository.get_latest_stats_by_quadrant(db, quadrant_name)
        return stats.to_dict() if stats else None
    except Exception as e:
        print(f"Error en get_quadrant_stats: {str(e)}")
        raise HTTPException(status_code=500, detail={"error": "Error al obtener estadísticas del cuadrante"})

@app.get("/api/predictions", tags=["📊 Predicciones"], summary="Obtener predicciones de calidad del aire")
async def get_predictions(quadrant_name: Optional[str] = None, db: Session = Depends(get_db)):
    """Endpoint para obtener predicciones de calidad del aire"""
    try:
        predictions = PredictionRepository.get_latest_predictions(db, quadrant_name)
        return [pred.to_dict() for pred in predictions]
    except Exception as e:
        print(f"Error en get_predictions: {str(e)}")
        raise HTTPException(status_code=500, detail={"error": "Error al obtener predicciones"})

@app.get("/api/quadrants/update-stats", tags=["🗺️ Zonas"], summary="Actualizar estadísticas de cuadrantes")
async def update_quadrant_stats(db: Session = Depends(get_db)):
    """Endpoint para actualizar estadísticas de todos los cuadrantes"""
    try:
        latest_readings = AirQualityRepository.get_latest_readings(db, limit=100)
        
        for quadrant in ["Noroeste", "Noreste", "Suroeste", "Sureste"]:
            QuadrantStatsRepository.calculate_quadrant_stats(db, quadrant, latest_readings)
        
        return {"message": "Estadísticas actualizadas correctamente"}
    except Exception as e:
        print(f"Error en update_quadrant_stats: {str(e)}")
        raise HTTPException(status_code=500, detail={"error": "Error al actualizar estadísticas"})

# ============================================================================
# ENDPOINTS DE ML Y PREDICCIONES
# ============================================================================

@app.post("/api/ml/train", tags=["📊 Predicciones"], summary="Entrenar modelo de predicción ML")
async def train_ml_models(db: Session = Depends(get_db)):
    """Entrena los modelos de ML con datos históricos"""
    try:
        end_time = datetime.now()
        start_time = end_time - timedelta(days=30)
        
        historical_data = AirQualityRepository.get_readings_in_timeframe(
            db, start_time, end_time, limit=10000
        )
        
        if len(historical_data) < 100:
            raise HTTPException(status_code=400, detail="Datos históricos insuficientes para entrenar modelos")
        
        training_data = [reading.to_dict() for reading in historical_data]
        metrics = ml_estimator.train_models(training_data)
        
        return {
            "message": "Modelos entrenados exitosamente",
            "metrics": metrics,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"Error entrenando modelos: {str(e)}")
        raise HTTPException(status_code=500, detail={"error": f"Error al entrenar modelos: {str(e)}"})

@app.get("/api/ml/predict")
async def predict_pollution(hours_ahead: int = 24, db: Session = Depends(get_db)):
    """Predice niveles futuros de contaminación"""
    try:
        if not ml_estimator.models:
            ml_estimator.load_models()
        
        predictions = ml_estimator.predict_future(hours_ahead)
        
        return {
            "predictions": predictions,
            "generated_at": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"Error generando predicciones: {str(e)}")
        raise HTTPException(status_code=500, detail={"error": "Error al generar predicciones"})

# ============================================================================
# ENDPOINTS DE ALERTAS
# ============================================================================

@app.get("/api/alerts/current", tags=["🔔 Alertas"], summary="Obtener alerta actual")
async def get_current_alerts(db: Session = Depends(get_db)):
    """
    Obtiene alertas actuales basadas en los datos más recientes.
    
    IMPORTANTE: Ahora usa los mismos datos frescos de Open-Meteo que el Dashboard
    para evitar discrepancias entre secciones.
    
    Los contaminantes en alerta son aquellos que superan el nivel "bueno":
    - PM2.5 > 12 µg/m³
    - PM10 > 50 µg/m³
    - NO2 > 53 µg/m³
    - O3 > 50 µg/m³
    - CO > 4.4 mg/m³
    """
    try:
        # PRIMERO: Intentar obtener datos frescos de Open-Meteo (igual que el Dashboard)
        print("\n🚨 Obteniendo datos para evaluación de alertas...")
        fresh_data = await openmeteo_collector.get_air_quality_data()
        
        if fresh_data and len(fresh_data) > 0:
            # Usar datos frescos de la API
            reading = fresh_data[0]
            data_source = "open_meteo_fresh"
            data_timestamp = datetime.now()
            print(f"  ✅ Usando datos frescos de Open-Meteo")
        else:
            # Fallback: usar datos de la base de datos
            print(f"  ⚠️ API no disponible, usando datos de base de datos")
            latest_reading = AirQualityRepository.get_latest_readings(db, limit=1)
            
            if not latest_reading:
                return {"message": "No hay datos disponibles"}
            
            db_reading = latest_reading[0]
            reading = {
                'pm25': db_reading.pm25,
                'pm10': db_reading.pm10,
                'no2': db_reading.no2,
                'o3': db_reading.o3,
                'co': db_reading.co
            }
            data_source = "database_fallback"
            data_timestamp = db_reading.timestamp
        
        # Asegurar que los valores no sean None
        pollutant_data = {
            'pm25': reading.get('pm25', 0) if isinstance(reading, dict) else (reading.pm25 if reading.pm25 is not None else 0),
            'pm10': reading.get('pm10', 0) if isinstance(reading, dict) else (reading.pm10 if reading.pm10 is not None else 0),
            'no2': reading.get('no2', 0) if isinstance(reading, dict) else (reading.no2 if reading.no2 is not None else 0),
            'o3': reading.get('o3', 0) if isinstance(reading, dict) else (reading.o3 if reading.o3 is not None else 0),
            'co': reading.get('co', 0) if isinstance(reading, dict) else (reading.co if reading.co is not None else 0)
        }
        
        print(f"  Valores: PM2.5={pollutant_data['pm25']:.2f}, PM10={pollutant_data['pm10']:.2f}, "
              f"NO2={pollutant_data['no2']:.2f}, O3={pollutant_data['o3']:.2f}, CO={pollutant_data['co']:.3f}")
        
        # Evaluar calidad del aire (sin enviar notificaciones en cada consulta)
        evaluation = alert_system.evaluate_air_quality(pollutant_data, send_notifications=False, db=db)
        
        # Añadir información adicional para debug/transparencia
        evaluation['data_timestamp'] = data_timestamp.isoformat() if hasattr(data_timestamp, 'isoformat') else str(data_timestamp)
        evaluation['data_source'] = data_source
        evaluation['raw_values'] = pollutant_data
        evaluation['thresholds_used'] = {
            'pm25': {'good_max': 12, 'moderate_max': 45, 'unit': 'µg/m³'},
            'pm10': {'good_max': 50, 'moderate_max': 75, 'unit': 'µg/m³'},
            'no2': {'good_max': 53, 'moderate_max': 100, 'unit': 'µg/m³'},
            'o3': {'good_max': 50, 'moderate_max': 100, 'unit': 'µg/m³'},
            'co': {'good_max': 4.4, 'moderate_max': 9.4, 'unit': 'mg/m³'}
        }
        evaluation['note'] = 'Datos sincronizados con el Dashboard principal'
        
        return evaluation
    except Exception as e:
        print(f"❌ Error obteniendo alertas: {str(e)}")
        raise HTTPException(status_code=500, detail={"error": "Error al obtener alertas"})

@app.get("/api/alerts/history")
async def get_alerts_history_extended(days: int = 7, db: Session = Depends(get_db)):
    """
    Obtiene historial de alertas y estadísticas de suscripciones.
    
    NOTA: Este endpoint muestra:
    - total_readings: Lecturas almacenadas en el período
    - moderate_events: Lecturas con PM2.5 en nivel moderado (12-35.4)
    - unhealthy_events: Lecturas con PM2.5 en nivel insalubre (>35.4)
    - subscribed_emails: Emails activos suscritos (no requiere haber recibido notificación)
    - notifications_actually_sent: Cuenta real de notificaciones enviadas (basado en notification_count)
    """
    try:
        # Obtener TODAS las suscripciones activas (no filtrar por last_notification_sent)
        all_subscriptions = db.query(models.AlertSubscription).all()
        active_subscriptions = [s for s in all_subscriptions if s.is_active]
        
        # Contar notificaciones realmente enviadas (sumando notification_count)
        total_notifications_sent = sum(s.notification_count or 0 for s in all_subscriptions)
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Obtener lecturas del período
        readings = db.query(models.AirQualityReading).filter(
            models.AirQualityReading.timestamp >= start_date,
            models.AirQualityReading.timestamp <= end_date
        ).order_by(models.AirQualityReading.timestamp.desc()).all()
        
        # Clasificar eventos por nivel
        moderate_events = []  # PM2.5 entre 12.1 y 35.4
        unhealthy_events = []  # PM2.5 > 35.4
        
        for reading in readings:
            if reading.pm25:
                if reading.pm25 > 35.4:
                    level = 'Insalubre' if reading.pm25 <= 55.4 else 'Muy Insalubre'
                    unhealthy_events.append({
                        'timestamp': reading.timestamp.isoformat(),
                        'pm25': round(reading.pm25, 2),
                        'pm10': round(reading.pm10, 2) if reading.pm10 else None,
                        'level': level
                    })
                elif reading.pm25 > 12:
                    moderate_events.append({
                        'timestamp': reading.timestamp.isoformat(),
                        'pm25': round(reading.pm25, 2),
                        'pm10': round(reading.pm10, 2) if reading.pm10 else None,
                        'level': 'Moderado'
                    })
        
        # Agrupar por día para estadísticas
        events_by_day = {}
        all_events = moderate_events + unhealthy_events
        for event in sorted(all_events, key=lambda x: x['timestamp'], reverse=True):
            day = event['timestamp'][:10]
            if day not in events_by_day:
                events_by_day[day] = []
            events_by_day[day].append(event)
        
        return {
            'period_days': days,
            'total_readings': len(readings),
            'total_alert_events': len(moderate_events) + len(unhealthy_events),
            'moderate_events_count': len(moderate_events),
            'unhealthy_events_count': len(unhealthy_events),
            'notifications_sent': total_notifications_sent,  # Notificaciones REALMENTE enviadas
            'subscribed_emails': len(active_subscriptions),  # Emails ACTIVOS (no requiere haber recibido)
            'subscription_details': [
                {
                    'email': s.email[:3] + '***' + s.email[s.email.index('@'):],  # Ocultar parcialmente
                    'is_active': s.is_active,
                    'notifications_received': s.notification_count or 0,
                    'last_notification': s.last_notification_sent.isoformat() if s.last_notification_sent else None
                }
                for s in all_subscriptions
            ],
            'events_by_day': events_by_day,
            'recent_events': (moderate_events + unhealthy_events)[:20],
            'timestamp': datetime.now().isoformat(),
            'note': 'Los eventos moderados (PM2.5 12-35.4) e insalubres (PM2.5 >35.4) son lecturas históricas, no notificaciones enviadas.'
        }
    except Exception as e:
        print(f"Error obteniendo historial de alertas: {str(e)}")
        raise HTTPException(status_code=500, detail={"error": "Error al obtener historial"})

@app.get("/api/alerts/daily-report")
async def get_daily_report():
    """Obtiene reporte diario de calidad del aire"""
    try:
        report = alert_system.generate_daily_report()
        return report
    except Exception as e:
        print(f"Error generando reporte diario: {str(e)}")
        raise HTTPException(status_code=500, detail={"error": "Error al generar reporte diario"})

@app.post("/api/alerts/subscribe", tags=["🔔 Alertas"], summary="Suscribirse a alertas por email")
async def subscribe_to_alerts(request: dict, db: Session = Depends(get_db)):
    """Suscribe un email para recibir alertas de calidad del aire"""
    try:
        email = request.get('email')
        print(f"\n🔔 Solicitud de suscripción recibida para: {email}")
        
        if not email:
            raise HTTPException(status_code=400, detail="Email es requerido")

        # 🆕 MEJORA: Validación de email profesional
        from custom_email_validator import validate_email
        validation_result = validate_email(email, strict=True, allow_disposable=False)
        if not validation_result.is_valid:
            error_detail = {
                "error": validation_result.error_code,
                "message": validation_result.error_message
            }
            if validation_result.suggestions:
                error_detail["suggestions"] = validation_result.suggestions
            raise HTTPException(status_code=400, detail=error_detail)
        
        # Usar email normalizado
        email = validation_result.normalized_email

        # Verificar si ya existe la suscripción
        existing = db.query(models.AlertSubscription).filter(
            models.AlertSubscription.email == email
        ).first()

        if existing:
            if not existing.is_active:
                print(f"  ↻ Reactivando suscripción existente...")
                existing.is_active = True
                existing.updated_at = datetime.utcnow()
                db.commit()
                alert_system.subscribe_email(email)

                # Enviar correo de bienvenida
                print(f"  📧 Intentando enviar correo de bienvenida...")
                try:
                    from email_service import EmailService
                    email_service = EmailService()
                    print(f"     Servicio configurado: {email_service.configured}")
                    if email_service.configured:
                        result = email_service.send_welcome_email(email)
                        print(f"     Resultado del envío: {result}")
                    else:
                        print(f"     ⚠️ Servicio de email NO configurado")
                except Exception as e:
                    print(f"     ❌ Error enviando correo: {str(e)}")
                    import traceback
                    traceback.print_exc()

                return {"message": "Suscripción reactivada exitosamente", "email": email}
            else:
                print(f"  ℹ️ Email ya está suscrito")
                return {"message": "El email ya está suscrito", "email": email}

        # Nueva suscripción
        print(f"  ➕ Creando nueva suscripción...")
        new_subscription = models.AlertSubscription(email=email, is_active=True)
        db.add(new_subscription)
        db.commit()
        alert_system.subscribe_email(email)

        # Enviar correo de bienvenida
        print(f"  📧 Intentando enviar correo de bienvenida...")
        try:
            from email_service import EmailService
            email_service = EmailService()
            print(f"     Servicio configurado: {email_service.configured}")
            if email_service.configured:
                result = email_service.send_welcome_email(email)
                print(f"     Resultado del envío: {result}")
            else:
                print(f"     ⚠️ Servicio de email NO configurado")
        except Exception as e:
            print(f"     ❌ Error enviando correo: {str(e)}")
            import traceback
            traceback.print_exc()

        print(f"  ✅ Suscripción completada")
        return {"message": "Suscripción exitosa. Recibirás un correo de confirmación.", "email": email}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en suscripción: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail={"error": "Error al suscribir email"})

@app.post("/api/alerts/test-email", tags=["🔔 Alertas"], summary="Enviar email de prueba")
async def test_email_notification(request: dict):
    """Envía un correo de prueba para verificar configuración"""
    try:
        email = request.get('email')
        if not email:
            raise HTTPException(status_code=400, detail="Email requerido")
        
        from email_service import EmailService
        email_service = EmailService()
        
        if not email_service.configured:
            raise HTTPException(status_code=500, detail="Servicio de email no configurado. Revisa el archivo .env")
        
        success = email_service.send_test_email(email)
        
        if success:
            return {"message": "Correo de prueba enviado exitosamente", "email": email}
        else:
            raise HTTPException(status_code=500, detail="Error al enviar correo. Revisa las credenciales en .env")
    except Exception as e:
        print(f"Error en test de email: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/alerts/subscriptions")
async def get_all_subscriptions(db: Session = Depends(get_db)):
    """Obtiene todas las suscripciones de alertas"""
    try:
        subscriptions = db.query(models.AlertSubscription).all()
        return [
            {
                "id": sub.id,
                "email": sub.email,
                "is_active": sub.is_active,
                "created_at": sub.created_at.isoformat() if sub.created_at else None,
                "updated_at": sub.updated_at.isoformat() if sub.updated_at else None,
                "last_notification_sent": sub.last_notification_sent.isoformat() if sub.last_notification_sent else None,
                "notification_count": sub.notification_count
            }
            for sub in subscriptions
        ]
    except Exception as e:
        print(f"Error obteniendo suscripciones: {str(e)}")
        raise HTTPException(status_code=500, detail={"error": "Error al obtener suscripciones"})

@app.get("/api/alerts/subscription/{email}", tags=["🔔 Alertas"], summary="Verificar estado de suscripción")
async def get_subscription_status(email: str, db: Session = Depends(get_db)):
    """Obtiene el estado de una suscripción específica"""
    try:
        subscription = db.query(models.AlertSubscription).filter(
            models.AlertSubscription.email == email
        ).first()
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Suscripción no encontrada")
        
        return {
            "id": subscription.id,
            "email": subscription.email,
            "is_active": subscription.is_active,
            "created_at": subscription.created_at.isoformat() if subscription.created_at else None,
            "updated_at": subscription.updated_at.isoformat() if subscription.updated_at else None,
            "last_notification_sent": subscription.last_notification_sent.isoformat() if subscription.last_notification_sent else None,
            "notification_count": subscription.notification_count
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error obteniendo suscripción: {str(e)}")
        raise HTTPException(status_code=500, detail={"error": "Error al obtener suscripción"})

@app.delete("/api/alerts/unsubscribe/{email}", tags=["🔔 Alertas"], summary="Desuscribirse de alertas")
async def unsubscribe_email(email: str, db: Session = Depends(get_db)):
    """Desuscribe un email de las alertas (método DELETE)"""
    try:
        # Decodificar email en caso de que venga codificado en URL
        from urllib.parse import unquote
        decoded_email = unquote(email)
        
        print(f"\n🔔 Solicitud de desuscripción recibida")
        print(f"  Email original: {email}")
        print(f"  Email decodificado: {decoded_email}")
        
        subscription = db.query(models.AlertSubscription).filter(
            models.AlertSubscription.email == decoded_email
        ).first()
        
        if not subscription:
            print(f"  ⚠️ Suscripción no encontrada para: {decoded_email}")
            # En lugar de error 404, simplemente confirmar la desuscripción
            # (podría haberse desuscrito antes o nunca suscrito)
            alert_system.unsubscribe_email(decoded_email)
            return {"message": "Desuscripción procesada", "email": decoded_email, "was_subscribed": False}
        
        print(f"  ✅ Suscripción encontrada - Estado actual: {'Activo' if subscription.is_active else 'Inactivo'}")
        
        subscription.is_active = False
        subscription.updated_at = datetime.utcnow()
        db.commit()
        
        alert_system.unsubscribe_email(decoded_email)
        
        print(f"  ✅ Desuscripción exitosa para: {decoded_email}")
        
        return {"message": "Desuscripción exitosa", "email": decoded_email, "was_subscribed": True}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en desuscripción: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail={"error": "Error al desuscribir email"})

# ============================================================================
# ENDPOINTS DE TENDENCIAS Y COMPARACIONES
# ============================================================================

@app.get("/api/trends/expected", tags=["📊 Predicciones"], summary="Tendencias esperadas")
async def get_expected_trends(db: Session = Depends(get_db)):
    """
    Obtiene tendencias esperadas para HOY y MAÑANA basadas en patrones históricos.
    """
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        readings = db.query(models.AirQualityReading).filter(
            models.AirQualityReading.timestamp >= start_date,
            models.AirQualityReading.timestamp <= end_date
        ).all()
        
        if not readings or len(readings) < 24:
            return generate_default_trends()
        
        weekday_patterns = {hour: {'pm25': [], 'pm10': [], 'no2': []} for hour in range(24)}
        weekend_patterns = {hour: {'pm25': [], 'pm10': [], 'no2': []} for hour in range(24)}
        
        for reading in readings:
            hour = reading.timestamp.hour
            is_weekend = reading.timestamp.weekday() >= 5
            patterns = weekend_patterns if is_weekend else weekday_patterns
            
            if reading.pm25:
                patterns[hour]['pm25'].append(reading.pm25)
            if reading.pm10:
                patterns[hour]['pm10'].append(reading.pm10)
            if reading.no2:
                patterns[hour]['no2'].append(reading.no2)
        
        def calculate_day_trends(patterns, day_date):
            day_names_es = {
                'Monday': 'Lunes', 'Tuesday': 'Martes', 'Wednesday': 'Miércoles',
                'Thursday': 'Jueves', 'Friday': 'Viernes', 'Saturday': 'Sábado', 'Sunday': 'Domingo'
            }
            
            is_weekend = day_date.weekday() >= 5
            day_name_en = day_date.strftime('%A')
            day_name = day_names_es.get(day_name_en, day_name_en)
            
            periods = [
                {'name': 'Madrugada', 'hours': list(range(0, 6)), 'icon': '🌙'},
                {'name': 'Mañana', 'hours': list(range(6, 12)), 'icon': '🌅'},
                {'name': 'Tarde', 'hours': list(range(12, 18)), 'icon': '☀️'},
                {'name': 'Noche', 'hours': list(range(18, 24)), 'icon': '🌃'}
            ]
            
            period_trends = []
            for period in periods:
                pm25_values = []
                pm10_values = []
                
                for hour in period['hours']:
                    pm25_values.extend(patterns[hour]['pm25'])
                    pm10_values.extend(patterns[hour]['pm10'])
                
                avg_pm25 = sum(pm25_values) / len(pm25_values) if pm25_values else 15.0
                avg_pm10 = sum(pm10_values) / len(pm10_values) if pm10_values else 25.0
                
                period_trends.append({
                    'period': period['name'],
                    'icon': period['icon'],
                    'hours': f"{period['hours'][0]:02d}:00 - {period['hours'][-1]:02d}:59",
                    'pm25_avg': round(avg_pm25, 2),
                    'pm10_avg': round(avg_pm10, 2),
                    'level': get_trend_level(avg_pm25),
                    'level_numeric': get_level_numeric(avg_pm25),
                    'description': get_period_description(period['name'], avg_pm25)
                })
            
            return {
                'date': day_date.strftime('%Y-%m-%d'),
                'day_name': day_name,
                'day_type': 'Fin de semana' if is_weekend else 'Día laboral',
                'periods': period_trends
            }
        
        today = datetime.now()
        today_is_weekend = today.weekday() >= 5
        today_patterns = weekend_patterns if today_is_weekend else weekday_patterns
        today_trends = calculate_day_trends(today_patterns, today)
        
        tomorrow = today + timedelta(days=1)
        tomorrow_is_weekend = tomorrow.weekday() >= 5
        tomorrow_patterns = weekend_patterns if tomorrow_is_weekend else weekday_patterns
        tomorrow_trends = calculate_day_trends(tomorrow_patterns, tomorrow)
        
        return {
            'timestamp': datetime.now().isoformat(),
            'today': today_trends,
            'tomorrow': tomorrow_trends,
            'data_source': 'historical_average',
            'days_analyzed': 30,
            'disclaimer': 'Estas tendencias se basan en promedios históricos de los últimos 30 días.',
            'reliability': 'medium' if len(readings) >= 100 else 'low'
        }
        
    except Exception as e:
        print(f"Error obteniendo tendencias: {str(e)}")
        return generate_default_trends()

def get_trend_level(pm25_value):
    if pm25_value <= 12:
        return 'Bueno'
    elif pm25_value <= 35.4:
        return 'Moderado'
    elif pm25_value <= 55.4:
        return 'Insalubre para grupos sensibles'
    elif pm25_value <= 150.4:
        return 'Insalubre'
    else:
        return 'Muy Insalubre'

def get_level_numeric(pm25_value):
    if pm25_value <= 12:
        return 1
    elif pm25_value <= 35.4:
        return 2
    elif pm25_value <= 55.4:
        return 3
    elif pm25_value <= 150.4:
        return 4
    else:
        return 5

def get_period_description(period_name, pm25_avg):
    descriptions = {
        'Madrugada': {
            'low': 'Niveles típicamente bajos por menor actividad vehicular',
            'medium': 'Actividad reducida pero posible acumulación nocturna',
            'high': 'Niveles atípicamente elevados para este horario'
        },
        'Mañana': {
            'low': 'Buenos niveles a pesar del tráfico matutino',
            'medium': 'Aumento típico por hora pico matutina',
            'high': 'Tráfico intenso afecta la calidad del aire'
        },
        'Tarde': {
            'low': 'Buena dispersión de contaminantes',
            'medium': 'Niveles estables durante el día',
            'high': 'Acumulación por actividad continua'
        },
        'Noche': {
            'low': 'Mejora conforme disminuye el tráfico',
            'medium': 'Hora pico vespertina típica',
            'high': 'Congestión vehicular elevada'
        }
    }
    
    if pm25_avg <= 15:
        level_key = 'low'
    elif pm25_avg <= 30:
        level_key = 'medium'
    else:
        level_key = 'high'
    
    return descriptions.get(period_name, {}).get(level_key, 'Sin descripción disponible')

def generate_default_trends():
    day_names_es = {
        'Monday': 'Lunes', 'Tuesday': 'Martes', 'Wednesday': 'Miércoles',
        'Thursday': 'Jueves', 'Friday': 'Viernes', 'Saturday': 'Sábado', 'Sunday': 'Domingo'
    }
    
    default_periods = [
        {'period': 'Madrugada', 'icon': '🌙', 'hours': '00:00 - 05:59', 'pm25_avg': 12.0, 'pm10_avg': 20.0, 'level': 'Bueno', 'level_numeric': 1, 'description': 'Niveles típicamente bajos por menor actividad'},
        {'period': 'Mañana', 'icon': '🌅', 'hours': '06:00 - 11:59', 'pm25_avg': 22.0, 'pm10_avg': 35.0, 'level': 'Moderado', 'level_numeric': 2, 'description': 'Aumento esperado por tráfico matutino'},
        {'period': 'Tarde', 'icon': '☀️', 'hours': '12:00 - 17:59', 'pm25_avg': 18.0, 'pm10_avg': 28.0, 'level': 'Moderado', 'level_numeric': 2, 'description': 'Niveles estables durante el día'},
        {'period': 'Noche', 'icon': '🌃', 'hours': '18:00 - 23:59', 'pm25_avg': 25.0, 'pm10_avg': 38.0, 'level': 'Moderado', 'level_numeric': 2, 'description': 'Hora pico vespertina típica'}
    ]
    
    today = datetime.now()
    tomorrow = today + timedelta(days=1)
    
    today_name = day_names_es.get(today.strftime('%A'), today.strftime('%A'))
    tomorrow_name = day_names_es.get(tomorrow.strftime('%A'), tomorrow.strftime('%A'))
    
    return {
        'timestamp': datetime.now().isoformat(),
        'today': {
            'date': today.strftime('%Y-%m-%d'),
            'day_name': today_name,
            'day_type': 'Fin de semana' if today.weekday() >= 5 else 'Día laboral',
            'periods': default_periods
        },
        'tomorrow': {
            'date': tomorrow.strftime('%Y-%m-%d'),
            'day_name': tomorrow_name,
            'day_type': 'Fin de semana' if tomorrow.weekday() >= 5 else 'Día laboral',
            'periods': default_periods
        },
        'data_source': 'default_estimates',
        'days_analyzed': 0,
        'disclaimer': 'Tendencias basadas en estimaciones típicas. Se necesitan más datos históricos para mayor precisión.',
        'reliability': 'low'
    }

@app.get("/api/comparison/today-yesterday")
async def get_today_vs_yesterday(db: Session = Depends(get_db)):
    """Compara los datos de hoy con los de ayer"""
    return await get_flexible_comparison(db=db, preset='today-yesterday')

async def fetch_period_data_with_api(db: Session, start_date: datetime, end_date: datetime):
    """Obtiene datos para un período específico."""
    import requests
    
    readings = db.query(models.AirQualityReading).filter(
        models.AirQualityReading.timestamp >= start_date,
        models.AirQualityReading.timestamp <= end_date
    ).all()
    
    if len(readings) >= 10:
        return readings, 'local'
    
    days_diff = (end_date - start_date).days
    if days_diff > 365:
        return readings, 'local'
    
    print(f"Comparador: Datos locales insuficientes ({len(readings)}), consultando Open Meteo...")
    
    try:
        params = {
            "latitude": 19.5438,
            "longitude": -96.9102,
            "hourly": ["pm10", "pm2_5", "nitrogen_dioxide", "carbon_monoxide", "ozone"],
            "timezone": "America/Mexico_City",
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d")
        }
        
        response = requests.get(
            "https://air-quality-api.open-meteo.com/v1/air-quality",
            params=params,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            hourly_data = data.get('hourly', {})
            times = hourly_data.get('time', [])
            
            stored_count = 0
            for i in range(len(times)):
                try:
                    pm25_val = hourly_data.get('pm2_5', [])[i]
                    pm10_val = hourly_data.get('pm10', [])[i]
                    no2_val = hourly_data.get('nitrogen_dioxide', [])[i]
                    o3_val = hourly_data.get('ozone', [])[i]
                    co_val = hourly_data.get('carbon_monoxide', [])[i]
                    
                    if pm25_val is not None:
                        timestamp = datetime.fromisoformat(times[i])
                        
                        existing = db.query(models.AirQualityReading).filter(
                            models.AirQualityReading.timestamp == timestamp,
                            models.AirQualityReading.source == 'openmeteo'
                        ).first()
                        
                        if not existing:
                            reading = models.AirQualityReading(
                                timestamp=timestamp,
                                latitude=19.5438,
                                longitude=-96.9102,
                                pm25=float(pm25_val) if pm25_val else 0,
                                pm10=float(pm10_val) if pm10_val else 0,
                                no2=float(no2_val) if no2_val else 0,
                                o3=float(o3_val) if o3_val else 0,
                                co=float(co_val) / 1000.0 if co_val else 0,
                                source='openmeteo'
                            )
                            db.add(reading)
                            stored_count += 1
                            
                            if stored_count % 100 == 0:
                                db.commit()
                except (IndexError, TypeError, ValueError):
                    continue
            
            db.commit()
            print(f"Comparador: Almacenados {stored_count} registros de Open Meteo")
            
            readings = db.query(models.AirQualityReading).filter(
                models.AirQualityReading.timestamp >= start_date,
                models.AirQualityReading.timestamp <= end_date
            ).all()
            
            return readings, 'openmeteo'
        else:
            print(f"Comparador: Error en Open Meteo API: {response.status_code}")
            return readings, 'local'
            
    except Exception as e:
        print(f"Comparador: Error consultando Open Meteo: {str(e)}")
        return readings, 'local'

@app.get("/api/comparison/flexible")
async def get_flexible_comparison(
    db: Session = Depends(get_db),
    preset: str = None,
    start1: str = None,
    end1: str = None,
    start2: str = None,
    end2: str = None
):
    """
    Comparador flexible de calidad del aire.
    
    IMPORTANTE: El sistema detecta automáticamente cuál período es más antiguo
    y cuál es más reciente para calcular correctamente si la calidad mejoró o empeoró.
    
    - Si la contaminación AUMENTÓ del período antiguo al reciente → EMPEORÓ
    - Si la contaminación DISMINUYÓ del período antiguo al reciente → MEJORÓ
    """
    try:
        now = datetime.now()
        
        if preset == 'today-yesterday':
            period1_start = datetime.combine(now.date(), time.min)
            period1_end = now
            period2_start = period1_start - timedelta(days=1)
            period2_end = datetime.combine(period2_start.date(), time.max)
            period1_label = f"Hoy ({now.strftime('%Y-%m-%d')})"
            period2_label = f"Ayer ({period2_start.strftime('%Y-%m-%d')})"
            
        elif preset == 'this-week-last-week':
            days_since_monday = now.weekday()
            this_week_start = datetime.combine((now - timedelta(days=days_since_monday)).date(), time.min)
            period1_start = this_week_start
            period1_end = now
            period2_start = this_week_start - timedelta(days=7)
            period2_end = this_week_start - timedelta(seconds=1)
            period1_label = f"Esta semana ({period1_start.strftime('%d/%m')} - {now.strftime('%d/%m')})"
            period2_label = f"Semana anterior ({period2_start.strftime('%d/%m')} - {period2_end.strftime('%d/%m')})"
            
        elif preset == 'this-month-last-month':
            this_month_start = datetime(now.year, now.month, 1)
            period1_start = this_month_start
            period1_end = now
            if now.month == 1:
                last_month_start = datetime(now.year - 1, 12, 1)
            else:
                last_month_start = datetime(now.year, now.month - 1, 1)
            period2_start = last_month_start
            period2_end = this_month_start - timedelta(seconds=1)
            period1_label = f"Este mes ({period1_start.strftime('%B %Y')})"
            period2_label = f"Mes anterior ({period2_start.strftime('%B %Y')})"
            
        elif start1 and end1 and start2 and end2:
            period1_start = datetime.strptime(start1, '%Y-%m-%d')
            period1_end = datetime.combine(datetime.strptime(end1, '%Y-%m-%d').date(), time.max)
            period2_start = datetime.strptime(start2, '%Y-%m-%d')
            period2_end = datetime.combine(datetime.strptime(end2, '%Y-%m-%d').date(), time.max)
            period1_label = f"{start1} a {end1}"
            period2_label = f"{start2} a {end2}"
        else:
            period1_start = datetime.combine(now.date(), time.min)
            period1_end = now
            period2_start = period1_start - timedelta(days=1)
            period2_end = datetime.combine(period2_start.date(), time.max)
            period1_label = "Hoy"
            period2_label = "Ayer"
        
        period1_readings, source1 = await fetch_period_data_with_api(db, period1_start, period1_end)
        period2_readings, source2 = await fetch_period_data_with_api(db, period2_start, period2_end)
        
        def calculate_stats(readings):
            if not readings:
                return None
            pm25_values = [r.pm25 for r in readings if r.pm25]
            pm10_values = [r.pm10 for r in readings if r.pm10]
            no2_values = [r.no2 for r in readings if r.no2]
            
            return {
                'pm25': round(sum(pm25_values) / len(pm25_values), 2) if pm25_values else 0,
                'pm10': round(sum(pm10_values) / len(pm10_values), 2) if pm10_values else 0,
                'no2': round(sum(no2_values) / len(no2_values), 2) if no2_values else 0,
                'readings_count': len(readings)
            }
        
        period1_stats = calculate_stats(period1_readings)
        period2_stats = calculate_stats(period2_readings)
        
        # =====================================================================
        # DETECCIÓN AUTOMÁTICA: ¿Cuál período es más antiguo y cuál más reciente?
        # =====================================================================
        # Comparamos las fechas de inicio para determinar el orden temporal
        period1_is_older = period1_start < period2_start
        
        # Asignar período antiguo y reciente
        if period1_is_older:
            older_stats = period1_stats
            recent_stats = period2_stats
            older_label = "Período 1 (más antiguo)"
            recent_label = "Período 2 (más reciente)"
        else:
            older_stats = period2_stats
            recent_stats = period1_stats
            older_label = "Período 2 (más antiguo)"
            recent_label = "Período 1 (más reciente)"
        
        comparison = {}
        overall_change = 0
        
        if period1_stats and period2_stats and period1_stats['readings_count'] > 0 and period2_stats['readings_count'] > 0:
            for pollutant in ['pm25', 'pm10', 'no2']:
                p1_avg = period1_stats[pollutant]
                p2_avg = period2_stats[pollutant]
                
                # Obtener valores del período antiguo y reciente
                older_avg = older_stats[pollutant]
                recent_avg = recent_stats[pollutant]
                
                # Calcular cambio: (reciente - antiguo) / antiguo * 100
                # Positivo = aumentó contaminación = empeoró
                # Negativo = disminuyó contaminación = mejoró
                if older_avg > 0:
                    temporal_change_percent = ((recent_avg - older_avg) / older_avg) * 100
                else:
                    temporal_change_percent = 0
                
                # trend basado en el cambio temporal real
                # up = contaminación aumentó (empeoró)
                # down = contaminación disminuyó (mejoró)
                if temporal_change_percent > 5:
                    trend = 'up'  # Empeoró
                elif temporal_change_percent < -5:
                    trend = 'down'  # Mejoró
                else:
                    trend = 'stable'
                
                comparison[pollutant] = {
                    'period1_avg': p1_avg,
                    'period2_avg': p2_avg,
                    'difference': round(recent_avg - older_avg, 2),  # Diferencia temporal real
                    'change_percent': round(temporal_change_percent, 1),
                    'trend': trend
                }
                
                if pollutant == 'pm25':
                    overall_change = temporal_change_percent
        
        # =====================================================================
        # CONCLUSIÓN basada en el cambio temporal real
        # =====================================================================
        if not comparison:
            overall_trend = 'no_data'
            summary = "No hay suficientes datos en uno o ambos períodos para comparar"
        elif overall_change > 5:
            # Contaminación AUMENTÓ del período antiguo al reciente = EMPEORÓ
            overall_trend = 'worsened'
            summary = f"La calidad del aire ha empeorado {abs(overall_change):.1f}%"
        elif overall_change < -5:
            # Contaminación DISMINUYÓ del período antiguo al reciente = MEJORÓ
            overall_trend = 'improved'
            summary = f"La calidad del aire ha mejorado {abs(overall_change):.1f}%"
        else:
            overall_trend = 'stable'
            summary = "La calidad del aire se mantiene similar entre los períodos seleccionados"
        
        return {
            'timestamp': now.isoformat(),
            'preset': preset,
            'period1': {
                'label': period1_label,
                'start': period1_start.strftime('%Y-%m-%d'),
                'end': period1_end.strftime('%Y-%m-%d'),
                'readings_count': period1_stats['readings_count'] if period1_stats else 0,
                'stats': period1_stats,
                'data_source': source1
            },
            'period2': {
                'label': period2_label,
                'start': period2_start.strftime('%Y-%m-%d'),
                'end': period2_end.strftime('%Y-%m-%d'),
                'readings_count': period2_stats['readings_count'] if period2_stats else 0,
                'stats': period2_stats,
                'data_source': source2
            },
            'comparison': comparison,
            'overall_trend': overall_trend,
            'summary': summary,
            'temporal_order': {
                'older_period': 'period1' if period1_is_older else 'period2',
                'recent_period': 'period2' if period1_is_older else 'period1',
                'note': 'El cambio se calcula como: (período reciente - período antiguo) / período antiguo × 100%'
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Formato de fecha inválido. Use YYYY-MM-DD. Error: {str(e)}")
    except Exception as e:
        print(f"Error en comparación: {str(e)}")
        raise HTTPException(status_code=500, detail={"error": "Error al comparar datos"})

# ============================================================================
# INICIAR SERVIDOR
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
