from typing import Optional, List
from datetime import datetime, date, time, timedelta
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import random
from sqlalchemy import func
from sqlalchemy.orm import Session
from data_collectors.air_quality_collector import OpenMeteoCollector, get_fallback_data
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
# Inicializar el colector
traffic_collector = TomTomTrafficCollector()
ml_estimator = MLPollutionEstimator()
alert_system = AlertSystem()


# Crear la aplicación FastAPI
app = FastAPI()

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Crear las tablas de la base de datos
models.Base.metadata.create_all(bind=engine)

# Incluir las rutas de datos históricos
app.include_router(historical_router)

# Inicializar el colector
openmeteo_collector = OpenMeteoCollector()

# Cargar suscripciones al iniciar
@app.on_event("startup")
async def load_subscriptions():
    """Carga suscripciones activas al iniciar el servidor"""
    try:
        db = next(get_db())
        active_subscriptions = db.query(models.AlertSubscription).filter(
            models.AlertSubscription.is_active == True
        ).all()
        
        for sub in active_subscriptions:
            alert_system.subscribe_email(sub.email)
        
        print(f"✓ Cargadas {len(active_subscriptions)} suscripciones activas")
        # NO enviar correos al iniciar
    except Exception as e:
        print(f"⚠️ Error cargando suscripciones: {str(e)}")

@app.get("/api/test-db")
async def test_database(db: Session = Depends(get_db)):
    try:
        # Intentar crear un registro de prueba
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
        
        # Leer el registro
        latest = db.query(models.AirQualityReading)\
            .order_by(models.AirQualityReading.timestamp.desc())\
            .first()
        
        return {
            "message": "Database test successful", 
            "data": latest.to_dict() if latest else None
        }
    except Exception as e:
        return {"error": f"Database test failed: {str(e)}"}

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat()
    }

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

@app.get("/api/air-quality/history")
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

@app.get("/api/traffic")
async def get_traffic_data(db: Session = Depends(get_db)):
    """
    Endpoint para obtener datos de tráfico REALES de TomTom
    Llama directamente al colector sin pasar por la base de datos
    """
    try:
        print("\n=== Obteniendo datos de tráfico de TomTom ===")
        
        # Obtener datos directamente del colector de TomTom
        traffic_data = await traffic_collector.get_traffic_data()
        
        if traffic_data and len(traffic_data) > 0:
            print(f"✓ Datos de tráfico obtenidos: {len(traffic_data)} zonas")
            for zone in traffic_data:
                print(f"  {zone['area_name']}: {zone['congestion_level']:.1f}% congestión")
            
            return traffic_data
        else:
            print("⚠️ No se obtuvieron datos de tráfico de TomTom")
            print(f"Estado del colector: {traffic_collector.get_status()}")
            
            # Retornar lista vacía en lugar de error
            # El frontend debe manejar esto
            return []
            
    except Exception as e:
        print(f"✗ Error en get_traffic_data: {str(e)}")
        # Retornar lista vacía en lugar de levantar excepción
        # para no romper el sistema
        return []

@app.get("/api/quadrants/{quadrant_name}/stats")
async def get_quadrant_stats(
    quadrant_name: str,
    db: Session = Depends(get_db)
):
    """Endpoint para obtener estadísticas por cuadrante"""
    try:
        stats = QuadrantStatsRepository.get_latest_stats_by_quadrant(
            db, quadrant_name
        )
        return stats.to_dict() if stats else None
    except Exception as e:
        print(f"Error en get_quadrant_stats: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Error al obtener estadísticas del cuadrante"}
        )

@app.get("/api/predictions")
async def get_predictions(
    quadrant_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Endpoint para obtener predicciones de calidad del aire"""
    try:
        predictions = PredictionRepository.get_latest_predictions(
            db, quadrant_name
        )
        return [pred.to_dict() for pred in predictions]
    except Exception as e:
        print(f"Error en get_predictions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Error al obtener predicciones"}
        )

@app.get("/api/quadrants/update-stats")
async def update_quadrant_stats(db: Session = Depends(get_db)):
    """Endpoint para actualizar estadísticas de todos los cuadrantes"""
    try:
        # Obtener los últimos datos de calidad del aire
        latest_readings = AirQualityRepository.get_latest_readings(db, limit=100)
        
        # Actualizar estadísticas para cada cuadrante
        for quadrant in ["Noroeste", "Noreste", "Suroeste", "Sureste"]:
            QuadrantStatsRepository.calculate_quadrant_stats(
                db, quadrant, latest_readings
            )
        
        return {"message": "Estadísticas actualizadas correctamente"}
    except Exception as e:
        print(f"Error en update_quadrant_stats: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Error al actualizar estadísticas"}
        )
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

@app.get("/api/collector-status")
async def get_collector_status():
    """Endpoint para obtener el estado del colector de datos"""
    try:
        # Si el colector tiene método get_data_status, usarlo
        if hasattr(openmeteo_collector, 'get_data_status'):
            return openmeteo_collector.get_data_status()
        else:
            # Retornar estado básico
            return {
                "last_successful_fetch": None,
                "consecutive_failures": 0,
                "is_operational": True,
                "message": "Estado del colector no disponible"
            }
    except Exception as e:
        print(f"Error en get_collector_status: {str(e)}")
        return {
            "error": "Error al obtener estado del colector",
            "is_operational": False
        }

@app.get("/api/zones/osm-analysis")
async def get_zones_osm_analysis():
    """
    Obtiene análisis de infraestructura vial de OSM para cada zona
    """
    try:
        # Intentar obtener datos de caché primero
        cache_key = "xalapa_zones_analysis"
        cached_data = osm_cache.get(cache_key)
        
        if cached_data:
            print("Usando datos de OSM desde caché")
            return cached_data
        
        print("Consultando datos de OSM desde API...")
        
        # Definir las zonas de Xalapa
        zones = [
            {
                'name': 'Centro',
                'bounds': [[19.5200, -96.9250], [19.5500, -96.8900]]
            },
            {
                'name': 'Norte',
                'bounds': [[19.5500, -96.9750], [19.5900, -96.8550]]
            },
            {
                'name': 'Sur',
                'bounds': [[19.4900, -96.9750], [19.5200, -96.8550]]
            },
            {
                'name': 'Este',
                'bounds': [[19.4900, -96.8900], [19.5900, -96.7900]]
            },
            {
                'name': 'Oeste',
                'bounds': [[19.4900, -97.0200], [19.5900, -96.9250]]
            }
        ]
        
        # Analizar cada zona
        results = []
        for zone in zones:
            try:
                analysis = osm_analyzer.analyze_zone(zone['name'], zone['bounds'])
                results.append(analysis)
            except Exception as e:
                print(f"Error analizando zona {zone['name']}: {str(e)}")
                # Usar datos por defecto si falla
                results.append({
                    'zone_name': zone['name'],
                    'metrics': {
                        'error': 'No se pudieron obtener datos de OSM',
                        'using_defaults': True
                    },
                    'pollution_factor': 1.0
                })
        
        response_data = {
            'zones': results,
            'timestamp': datetime.now().isoformat(),
            'data_source': 'OpenStreetMap'
        }
        
        # Guardar en caché si obtuvimos datos válidos
        if any(not z.get('metrics', {}).get('error') for z in results):
            osm_cache.set(cache_key, response_data)
        
        return response_data
        
    except Exception as e:
        print(f"Error en get_zones_osm_analysis: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Error al obtener análisis de zonas"}
        )

@app.get("/api/air-quality")
async def get_air_quality(
    db: Session = Depends(get_db),
    source: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    limit: int = 10,
    offset: int = 0
):
    """Endpoint para obtener datos de calidad del aire"""
    try:
        # Si se solicitan datos históricos
        if start_time and end_time:
            readings = AirQualityRepository.get_readings_in_timeframe(
                db, start_time, end_time, limit, offset
            )
            if readings:
                return [reading.to_dict() for reading in readings]

        # Obtener nuevos datos de Open Meteo
        openmeteo_data = await openmeteo_collector.get_air_quality_data()
        
        if openmeteo_data:
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
                        "source": "openmeteo",
                        "raw_data": reading,
                        "timestamp": datetime.now()
                    } for reading in openmeteo_data]
                )
                print(f"Datos almacenados en la base de datos: {success}")
            except Exception as e:
                print(f"Error guardando datos en la base de datos: {str(e)}")
            
            return openmeteo_data
        
        # Si no hay datos nuevos, obtener los últimos datos almacenados
        latest_readings = AirQualityRepository.get_latest_readings_by_source(
            db, source or "openmeteo", limit
        )
        
        if latest_readings:
            return [reading.to_dict() for reading in latest_readings]
            
        # Si no hay datos en absoluto, usar datos de ejemplo
        return get_fallback_data()
        
    except Exception as e:
        print(f"Error en get_air_quality: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Error al obtener datos de calidad del aire"}
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
        
        # Obtener el total de registros para este día
        total_count = AirQualityRepository.get_readings_count_in_timeframe(
            db, start_time, end_time
        )
        
        # Obtener los registros con paginación
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

@app.post("/api/ml/train")
async def train_ml_models(db: Session = Depends(get_db)):
    """Entrena los modelos de ML con datos históricos"""
    try:
        # Obtener datos históricos de los últimos 30 días
        end_time = datetime.now()
        start_time = end_time - timedelta(days=30)
        
        historical_data = AirQualityRepository.get_readings_in_timeframe(
            db, start_time, end_time, limit=10000
        )
        
        if len(historical_data) < 100:
            raise HTTPException(
                status_code=400,
                detail="Datos históricos insuficientes para entrenar modelos"
            )
        
        # Convertir a formato para el entrenador
        training_data = [reading.to_dict() for reading in historical_data]
        
        # Entrenar modelos
        metrics = ml_estimator.train_models(training_data)
        
        return {
            "message": "Modelos entrenados exitosamente",
            "metrics": metrics,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"Error entrenando modelos: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"error": f"Error al entrenar modelos: {str(e)}"}
        )

@app.get("/api/ml/predict")
async def predict_pollution(
    hours_ahead: int = 24,
    db: Session = Depends(get_db)
):
    """Predice niveles futuros de contaminación"""
    try:
        # Intentar cargar modelos entrenados
        if not ml_estimator.models:
            ml_estimator.load_models()
        
        # Generar predicciones
        predictions = ml_estimator.predict_future(hours_ahead)
        
        return {
            "predictions": predictions,
            "generated_at": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"Error generando predicciones: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Error al generar predicciones"}
        )

@app.get("/api/alerts/current")
async def get_current_alerts(db: Session = Depends(get_db)):
    """Obtiene alertas actuales basadas en los últimos datos"""
    try:
        # Obtener última lectura
        latest_reading = AirQualityRepository.get_latest_readings(db, limit=1)
        
        if not latest_reading:
            return {"message": "No hay datos disponibles"}
        
        # Evaluar calidad del aire
        pollutant_data = {
            'pm25': latest_reading[0].pm25,
            'pm10': latest_reading[0].pm10,
            'no2': latest_reading[0].no2,
            'o3': latest_reading[0].o3,
            'co': latest_reading[0].co
        }
        
        evaluation = alert_system.evaluate_air_quality(pollutant_data, send_notifications=True, db=db)
        
        return evaluation
    except Exception as e:
        print(f"Error obteniendo alertas: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Error al obtener alertas"}
        )

@app.get("/api/alerts/history")
async def get_alert_history(hours: int = 24):
    """Obtiene historial de alertas"""
    try:
        alerts = alert_system.get_historical_alerts(hours)
        return {
            "alerts": alerts,
            "period_hours": hours
        }
    except Exception as e:
        print(f"Error obteniendo historial de alertas: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Error al obtener historial de alertas"}
        )

@app.get("/api/alerts/daily-report")
async def get_daily_report():
    """Obtiene reporte diario de calidad del aire"""
    try:
        report = alert_system.generate_daily_report()
        return report
    except Exception as e:
        print(f"Error generando reporte diario: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Error al generar reporte diario"}
        )

@app.post("/api/alerts/subscribe")
async def subscribe_to_alerts(request: dict, db: Session = Depends(get_db)):
    """Suscribe un email para recibir alertas de calidad del aire"""
    try:
        email = request.get('email')
        if not email:
            raise HTTPException(status_code=400, detail="Email es requerido")

        import re
        if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
            raise HTTPException(status_code=400, detail="Formato de email inválido")

        existing = db.query(models.AlertSubscription).filter(
            models.AlertSubscription.email == email
        ).first()

        if existing:
            if not existing.is_active:
                # Reactivar suscripción
                existing.is_active = True
                existing.updated_at = datetime.utcnow()
                db.commit()
                alert_system.subscribe_email(email)

                # Enviar correo de bienvenida
                try:
                    from email_service import EmailService
                    email_service = EmailService()
                    if email_service.configured:
                        email_service.send_welcome_email(email)
                except Exception as e:
                    print(f"Error enviando correo de bienvenida: {str(e)}")

                return {"message": "Suscripción reactivada exitosamente", "email": email}
            else:
                return {"message": "El email ya está suscrito", "email": email}

        # Nueva suscripción
        new_subscription = models.AlertSubscription(email=email, is_active=True)
        db.add(new_subscription)
        db.commit()
        alert_system.subscribe_email(email)

        # Enviar correo de bienvenida solo para nuevas suscripciones
        try:
            from email_service import EmailService
            email_service = EmailService()
            if email_service.configured:
                email_service.send_welcome_email(email)
        except Exception as e:
            print(f"Error enviando correo de bienvenida: {str(e)}")

        return {"message": "Suscripción exitosa. Recibirás un correo de confirmación.", "email": email}
    except Exception as e:
        print(f"Error en suscripción: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail={"error": "Error al suscribir email"})

@app.post("/api/alerts/unsubscribe")
async def unsubscribe_from_alerts(request: dict, db: Session = Depends(get_db)):
    """Desuscribe un email de las alertas de calidad del aire"""
    try:
        email = request.get('email')
        if not email:
            raise HTTPException(status_code=400, detail="Email es requerido")
        
        subscription = db.query(models.AlertSubscription).filter(
            models.AlertSubscription.email == email
        ).first()
        
        if subscription:
            subscription.is_active = False
            subscription.updated_at = datetime.utcnow()
            db.commit()
        
        alert_system.unsubscribe_email(email)
        return {"message": "Desuscripción exitosa", "email": email}
    except Exception as e:
        print(f"Error en desuscripción: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail={"error": "Error al desuscribir email"})

@app.post("/api/alerts/test-email")
async def test_email_notification(request: dict):
    """Envía un correo de prueba para verificar configuración"""
    try:
        email = request.get('email')
        if not email:
            raise HTTPException(status_code=400, detail="Email requerido")
        
        from email_service import EmailService
        email_service = EmailService()
        
        if not email_service.configured:
            raise HTTPException(
                status_code=500,
                detail="Servicio de email no configurado. Revisa el archivo .env"
            )
        
        success = email_service.send_test_email(email)
        
        if success:
            return {"message": "Correo de prueba enviado exitosamente", "email": email}
        else:
            raise HTTPException(
                status_code=500,
                detail="Error al enviar correo. Revisa las credenciales en .env"
            )
    except Exception as e:
        print(f"Error en test de email: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/air-quality/by-zone")
async def get_air_quality_by_zone(db: Session = Depends(get_db)):
    """Combina OpenMeteo + OSM + TomTom para calcular contaminación por zona"""
    try:
        # Obtener datos base de OpenMeteo
        base_data = await openmeteo_collector.get_air_quality_data()
        if not base_data:
            latest_readings = AirQualityRepository.get_latest_readings(db, limit=1)
            if not latest_readings:
                raise HTTPException(status_code=503, detail="No hay datos disponibles")
            base_data = [latest_readings[0].to_dict()]
        
        base_reading = base_data[0]
        
        # Obtener factores OSM
        osm_data = await get_zones_osm_analysis()
        osm_zones = {zone['zone_name']: zone for zone in osm_data['zones']}
        
        # Obtener datos de tráfico
        traffic_data_list = await traffic_collector.get_traffic_data()
        traffic_by_zone = {t['area_name']: t for t in traffic_data_list} if traffic_data_list else {}
        
        # Calcular por zona
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
            else:
                traffic_factor = 1.0
                congestion_level = 0
            
            combined_factor = osm_factor * traffic_factor
            
            zones_result.append({
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
                    'has_real_data': traffic_info is not None
                }
            })
        
        return {
            'zones': zones_result,
            'timestamp': datetime.now().isoformat(),
            'base_reading': base_reading
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ENDPOINTS ADICIONALES DE NOTIFICACIONES
# ============================================================================

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

@app.get("/api/alerts/subscription/{email}")
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

@app.delete("/api/alerts/unsubscribe/{email}")
async def unsubscribe_email(email: str, db: Session = Depends(get_db)):
    """Desuscribe un email de las alertas (método DELETE)"""
    try:
        subscription = db.query(models.AlertSubscription).filter(
            models.AlertSubscription.email == email
        ).first()
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Suscripción no encontrada")
        
        subscription.is_active = False
        subscription.updated_at = datetime.utcnow()
        db.commit()
        
        alert_system.unsubscribe_email(email)
        
        return {"message": "Desuscripción exitosa", "email": email}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error en desuscripción: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail={"error": "Error al desuscribir email"})

# ============================================================================
# INICIAR SERVIDOR
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
