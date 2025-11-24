from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Optional
import models

class AirQualityRepository:
    @staticmethod
    def get_latest_readings(db: Session, limit: int = 10):
        """Obtiene las últimas lecturas sin filtrar por fuente"""
        try:
            return db.query(models.AirQualityReading)\
                .order_by(models.AirQualityReading.timestamp.desc())\
                .limit(limit)\
                .all()
        except Exception as e:
            print(f"Error getting latest readings: {str(e)}")
            return []

    @staticmethod
    def get_readings_count_in_timeframe(
        db: Session,
        start_time: datetime,
        end_time: datetime
    ):
        """Obtiene el número total de lecturas en un rango de tiempo"""
        try:
            return db.query(models.AirQualityReading)\
                .filter(
                    models.AirQualityReading.timestamp.between(
                        start_time, end_time
                    )
                )\
                .count()
        except Exception as e:
            print(f"Error getting readings count: {str(e)}")
            return 0

    @staticmethod
    def store_batch_readings(db: Session, readings: List[dict]):
        """Almacena un lote de lecturas en la base de datos"""
        try:
            # Crear objetos de modelo para cada lectura
            db_readings = [
                models.AirQualityReading(**reading)
                for reading in readings
            ]
            
            # Agregar todas las lecturas a la sesión
            db.bulk_save_objects(db_readings)
            db.commit()
            
            return True
        except Exception as e:
            print(f"Error storing batch readings: {str(e)}")
            db.rollback()
            return False

    @staticmethod
    def get_readings_in_timeframe(
        db: Session,
        start_time: datetime,
        end_time: datetime,
        limit: int = 1000,
        offset: int = 0
    ):
        """Obtiene lecturas dentro de un rango de tiempo específico"""
        try:
            print(f"Buscando lecturas entre {start_time} y {end_time}")
            print(f"Límite: {limit}, Offset: {offset}")
            
            readings = db.query(models.AirQualityReading)\
                .filter(
                    models.AirQualityReading.timestamp.between(
                        start_time, end_time
                    )
                )\
                .order_by(models.AirQualityReading.timestamp.desc())\
                .offset(offset)\
                .limit(limit)\
                .all()
            
            print(f"Se encontraron {len(readings)} lecturas")
            return readings
        except Exception as e:
            print(f"Error getting readings in timeframe: {str(e)}")
            return []

    @staticmethod
    def get_latest_readings_by_source(
        db: Session,
        source: str,
        limit: int = 10
    ):
        """Obtiene las últimas lecturas de una fuente específica"""
        try:
            return db.query(models.AirQualityReading)\
                .filter(models.AirQualityReading.source == source)\
                .order_by(models.AirQualityReading.timestamp.desc())\
                .limit(limit)\
                .all()
        except Exception as e:
            print(f"Error getting latest readings by source: {str(e)}")
            return []

class TrafficRepository:
    @staticmethod
    def create_traffic_data(db: Session, traffic_data: dict):
        """Crea un nuevo registro de datos de tráfico"""
        try:
            db_traffic = models.TrafficData(**traffic_data)
            db.add(db_traffic)
            db.commit()
            db.refresh(db_traffic)
            return db_traffic
        except Exception as e:
            print(f"Error creating traffic data: {str(e)}")
            db.rollback()
            return None

    @staticmethod
    def get_latest_traffic_data(db: Session, limit: int = 10):
        """Obtiene los últimos datos de tráfico"""
        try:
            return db.query(models.TrafficData)\
                .order_by(models.TrafficData.timestamp.desc())\
                .limit(limit)\
                .all()
        except Exception as e:
            print(f"Error getting latest traffic data: {str(e)}")
            return []

class QuadrantStatsRepository:
    @staticmethod
    def create_stats(db: Session, stats_data: dict):
        """Crea un nuevo registro de estadísticas por cuadrante"""
        try:
            db_stats = models.QuadrantStatistics(**stats_data)
            db.add(db_stats)
            db.commit()
            db.refresh(db_stats)
            return db_stats
        except Exception as e:
            print(f"Error creating quadrant stats: {str(e)}")
            db.rollback()
            return None

    @staticmethod
    def get_latest_stats_by_quadrant(
        db: Session, 
        quadrant_name: str
    ):
        """Obtiene las últimas estadísticas para un cuadrante específico"""
        try:
            return db.query(models.QuadrantStatistics)\
                .filter(models.QuadrantStatistics.quadrant_name == quadrant_name)\
                .order_by(models.QuadrantStatistics.timestamp.desc())\
                .first()
        except Exception as e:
            print(f"Error getting latest stats for quadrant: {str(e)}")
            return None

    @staticmethod
    def calculate_quadrant_stats(db: Session, quadrant_name: str, readings: List[models.AirQualityReading]):
        """Calcula estadísticas para un cuadrante basado en lecturas"""
        if not readings:
            return None

        try:
            stats = {
                "quadrant_name": quadrant_name,
                "avg_pm25": sum(r.pm25 for r in readings) / len(readings),
                "avg_pm10": sum(r.pm10 for r in readings) / len(readings),
                "avg_no2": sum(r.no2 for r in readings) / len(readings),
                "avg_o3": sum(r.o3 for r in readings) / len(readings),
                "avg_co": sum(r.co for r in readings) / len(readings),
            }

            return QuadrantStatsRepository.create_stats(db, stats)
        except Exception as e:
            print(f"Error calculating quadrant stats: {str(e)}")
            return None

class PredictionRepository:
    @staticmethod
    def create_prediction(db: Session, prediction_data: dict):
        """Crea una nueva predicción de calidad del aire"""
        try:
            db_prediction = models.AirQualityPrediction(**prediction_data)
            db.add(db_prediction)
            db.commit()
            db.refresh(db_prediction)
            return db_prediction
        except Exception as e:
            print(f"Error creating prediction: {str(e)}")
            db.rollback()
            return None

    @staticmethod
    def get_latest_predictions(
        db: Session, 
        quadrant_name: Optional[str] = None,
        limit: int = 10
    ):
        """Obtiene las últimas predicciones, opcionalmente filtradas por cuadrante"""
        try:
            query = db.query(models.AirQualityPrediction)
            if quadrant_name:
                query = query.filter(
                    models.AirQualityPrediction.quadrant_name == quadrant_name
                )
            return query.order_by(
                models.AirQualityPrediction.timestamp.desc()
            ).limit(limit).all()
        except Exception as e:
            print(f"Error getting latest predictions: {str(e)}")
            return []
