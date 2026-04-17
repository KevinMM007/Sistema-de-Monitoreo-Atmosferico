"""
============================================================================
Sistema de Monitoreo de Calidad del Aire - Xalapa, Veracruz
============================================================================

ARCHIVO: models.py
PROPÓSITO: Definición de modelos de base de datos (SQLAlchemy ORM)

MODELOS DEFINIDOS:
    - AirQualityReading  : Lecturas de contaminantes atmosféricos
    - TrafficReading     : Datos de congestión vehicular
    - QuadrantStats      : Estadísticas por zona geográfica
    - Prediction         : Predicciones de calidad del aire
    - AlertSubscription  : Suscripciones de alertas por email
    - AlertHistory       : Historial de alertas enviadas

NOTA:
    Los modelos usan PostgreSQL en producción (Supabase) y pueden
    usar SQLite en desarrollo local si se configura.

AUTOR: Kevin Morales
VERSIÓN: 2.1.0
============================================================================
"""

from sqlalchemy import Column, Integer, Float, String, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class AirQualityReading(Base):
    __tablename__ = "air_quality_readings"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    pm25 = Column(Float)
    pm10 = Column(Float)
    no2 = Column(Float)
    o3 = Column(Float)
    co = Column(Float)
    source = Column(String)
    raw_data = Column(JSON)

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat(),
            "latitude": self.latitude,
            "longitude": self.longitude,
            "pm25": self.pm25,
            "pm10": self.pm10,
            "no2": self.no2,
            "o3": self.o3,
            "co": self.co,
            "source": self.source
        }

class TrafficData(Base):
    __tablename__ = "traffic_data"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed = Column(Float)
    road_name = Column(String)
    traffic_level = Column(String)  # 'low', 'medium', 'high'
    raw_data = Column(JSON)

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat(),
            "latitude": self.latitude,
            "longitude": self.longitude,
            "speed": self.speed,
            "road_name": self.road_name,
            "traffic_level": self.traffic_level
        }

class QuadrantStatistics(Base):
    __tablename__ = "quadrant_statistics"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    quadrant_name = Column(String, nullable=False)
    avg_pm25 = Column(Float)
    avg_pm10 = Column(Float)
    avg_no2 = Column(Float)
    avg_o3 = Column(Float)
    avg_co = Column(Float)
    traffic_intensity = Column(Float)
    additional_metrics = Column(JSON)

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat(),
            "quadrant_name": self.quadrant_name,
            "avg_pm25": self.avg_pm25,
            "avg_pm10": self.avg_pm10,
            "avg_no2": self.avg_no2,
            "avg_o3": self.avg_o3,
            "avg_co": self.avg_co,
            "traffic_intensity": self.traffic_intensity,
            "additional_metrics": self.additional_metrics
        }

class AirQualityPrediction(Base):
    __tablename__ = "air_quality_predictions"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    quadrant_name = Column(String, nullable=False)
    predicted_pm25 = Column(Float)
    predicted_pm10 = Column(Float)
    predicted_no2 = Column(Float)
    predicted_o3 = Column(Float)
    predicted_co = Column(Float)
    confidence_level = Column(Float)
    model_metadata = Column(JSON)

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat(),
            "quadrant_name": self.quadrant_name,
            "predicted_pm25": self.predicted_pm25,
            "predicted_pm10": self.predicted_pm10,
            "predicted_no2": self.predicted_no2,
            "predicted_o3": self.predicted_o3,
            "predicted_co": self.predicted_co,
            "confidence_level": self.confidence_level,
            "model_metadata": self.model_metadata
        }

class AlertSubscription(Base):
    """Modelo para almacenar suscripciones a alertas de calidad del aire"""
    __tablename__ = "alert_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_notification_sent = Column(DateTime, nullable=True)
    notification_count = Column(Integer, default=0)
    # Token opaco usado para permitir desuscripción con un clic desde el
    # correo (link en el footer del email). Se genera al crear/reactivar.
    unsubscribe_token = Column(String, nullable=True, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_notification_sent": self.last_notification_sent.isoformat() if self.last_notification_sent else None,
            "notification_count": self.notification_count
        }
