"""
============================================================================
Sistema de Monitoreo de Calidad del Aire - Xalapa, Veracruz
============================================================================

ARCHIVO: database.py
PROPÓSITO: Configuración de conexión a base de datos PostgreSQL

DESCRIPCIÓN:
    Configura la conexión a PostgreSQL usando SQLAlchemy. Detecta
    automáticamente si está en entorno local o producción (Supabase)
    y ajusta los parámetros del pool de conexiones.

CONFIGURACIONES:
    - Local: pool_size=5, max_overflow=10
    - Producción: pool_size=2, max_overflow=3 (optimizado para Supabase free tier)

VARIABLES DE ENTORNO:
    - DATABASE_URL: URL de conexión a PostgreSQL
    - ENVIRONMENT: 'production' o 'development'

AUTOR: Kevin Morales
VERSIÓN: 2.1.0
============================================================================
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Configuración PostgreSQL
DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://postgres:postgres123@localhost:5432/air_quality_xalapa'
)

# Fix para URLs de Supabase/Render que usan 'postgres://' en lugar de 'postgresql://'
if DATABASE_URL and DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

# Detectar si estamos en producción (Supabase) o local
is_production = 'supabase' in DATABASE_URL.lower() or os.getenv('ENVIRONMENT') == 'production'

if is_production:
    # Configuración MÍNIMA para Supabase Free Tier
    # El modo Session pooler tiene límite muy estricto de conexiones
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,      # Verificar conexiones antes de usarlas
        pool_recycle=60,         # Reciclar conexiones cada 1 minuto
        pool_size=1,             # Solo 1 conexión en el pool
        max_overflow=2,          # Máximo 2 conexiones adicionales
        pool_timeout=60,         # Timeout más largo para esperar conexión
        echo=False               # No mostrar SQL en logs
    )
    print("📦 Database: Configuración mínima para Supabase Free Tier")
else:
    # Configuración para desarrollo local (más permisiva)
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=10
    )
    print("📦 Database: Usando configuración de desarrollo local")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """
    Dependency para obtener sesión de base de datos.
    Asegura que la conexión se cierre correctamente.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
