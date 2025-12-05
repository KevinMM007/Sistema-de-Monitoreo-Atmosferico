"""
Configuración de pytest para tests del Sistema de Monitoreo de Calidad del Aire.

Este archivo configura fixtures compartidos para todos los tests.
Ejecutar tests: pytest tests/ -v
"""

import pytest
import sys
import os
from datetime import datetime, timedelta

# Agregar el directorio backend al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from database import Base, get_db
import models


# ============================================================================
# BASE DE DATOS DE PRUEBA (SQLite en memoria)
# ============================================================================

SQLALCHEMY_TEST_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Reemplaza la conexión a la base de datos con una de prueba."""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture(scope="function")
def db_session():
    """
    Crea una sesión de base de datos de prueba para cada test.
    Las tablas se crean al inicio y se eliminan al final.
    """
    Base.metadata.create_all(bind=engine)
    
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """
    Cliente de prueba para hacer requests a la API.
    Usa la base de datos de prueba.
    """
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture
def sample_air_quality_data(db_session):
    """
    Crea datos de calidad del aire de ejemplo para tests.
    Usa el modelo real AirQualityReading.
    """
    data = []
    base_time = datetime.now() - timedelta(hours=12)
    
    for i in range(12):
        # Usar el modelo real AirQualityReading
        record = models.AirQualityReading(
            timestamp=base_time + timedelta(hours=i),
            latitude=19.5438,  # Xalapa
            longitude=-96.9102,
            pm25=15.5 + i * 0.5,
            pm10=25.0 + i * 0.8,
            no2=18.0 + i * 0.3,
            o3=45.0 + i * 1.0,
            co=0.4 + i * 0.02,
            source="test"
        )
        db_session.add(record)
        data.append(record)
    
    db_session.commit()
    return data


@pytest.fixture
def sample_subscription(db_session):
    """
    Crea una suscripción de ejemplo para tests.
    """
    subscription = models.AlertSubscription(
        email="test@ejemplo.com",
        is_active=True,
        created_at=datetime.now()
    )
    db_session.add(subscription)
    db_session.commit()
    
    return subscription


@pytest.fixture
def sample_traffic_data(db_session):
    """
    Crea datos de tráfico de ejemplo para tests.
    Usa el modelo real TrafficData.
    """
    data = []
    
    for i in range(5):
        record = models.TrafficData(
            timestamp=datetime.now(),
            latitude=19.5438 + i * 0.01,
            longitude=-96.9102 + i * 0.01,
            speed=45.0 - i * 5,
            road_name=f"Av. Principal {i+1}",
            traffic_level=["low", "medium", "high"][i % 3]
        )
        db_session.add(record)
        data.append(record)
    
    db_session.commit()
    return data


@pytest.fixture
def sample_quadrant_stats(db_session):
    """
    Crea estadísticas por cuadrante de ejemplo.
    """
    zones = ["Centro", "Norte", "Sur", "Este", "Oeste"]
    data = []
    
    for zone in zones:
        record = models.QuadrantStatistics(
            timestamp=datetime.now(),
            quadrant_name=zone,
            avg_pm25=15.0 + zones.index(zone) * 2,
            avg_pm10=25.0 + zones.index(zone) * 3,
            avg_no2=18.0 + zones.index(zone),
            avg_o3=45.0 + zones.index(zone) * 1.5,
            avg_co=0.4 + zones.index(zone) * 0.1,
            traffic_intensity=30.0 + zones.index(zone) * 10
        )
        db_session.add(record)
        data.append(record)
    
    db_session.commit()
    return data


# ============================================================================
# CONSTANTES PARA TESTS
# ============================================================================

VALID_EMAILS = [
    "usuario@gmail.com",
    "test.user@empresa.com",
    "correo@hotmail.com",
    "test_123@yahoo.com.mx",
]

INVALID_EMAILS = [
    "correo-sin-arroba.com",
    "@sinusuario.com",
    "espacios en blanco@mail.com",
    "sinpunto@mailcom",
    "",
]

TEMP_EMAILS = [
    "test@tempmail.com",
    "user@guerrillamail.com",
    "temp@10minutemail.com",
    "fake@mailinator.com",
]

# Coordenadas de Xalapa para tests
XALAPA_COORDS = {
    "latitude": 19.5438,
    "longitude": -96.9102
}

# Zonas de Xalapa
XALAPA_ZONES = ["Centro", "Norte", "Sur", "Este", "Oeste"]


# ============================================================================
# HELPERS
# ============================================================================

def create_test_air_quality_reading(
    db_session,
    pm25=15.0,
    pm10=25.0,
    no2=18.0,
    o3=45.0,
    co=0.4,
    timestamp=None,
    latitude=19.5438,
    longitude=-96.9102
):
    """Helper para crear un registro de calidad del aire."""
    if timestamp is None:
        timestamp = datetime.now()
    
    record = models.AirQualityReading(
        timestamp=timestamp,
        latitude=latitude,
        longitude=longitude,
        pm25=pm25,
        pm10=pm10,
        no2=no2,
        o3=o3,
        co=co,
        source="test"
    )
    db_session.add(record)
    db_session.commit()
    
    return record


def create_test_subscription(db_session, email="test@example.com"):
    """Helper para crear una suscripción de prueba."""
    subscription = models.AlertSubscription(
        email=email,
        is_active=True,
        created_at=datetime.now()
    )
    db_session.add(subscription)
    db_session.commit()
    
    return subscription


# ============================================================================
# ALIAS PARA COMPATIBILIDAD
# ============================================================================

# Alias para mantener compatibilidad con tests existentes
# que usan nombres diferentes
AirQualityRecord = models.AirQualityReading
TrafficRecord = models.TrafficData

# Agregar al módulo models para que los tests los encuentren
if not hasattr(models, 'AirQualityRecord'):
    models.AirQualityRecord = models.AirQualityReading
if not hasattr(models, 'TrafficRecord'):
    models.TrafficRecord = models.TrafficData
