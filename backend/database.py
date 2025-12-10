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
    # 🆕 Configuración OPTIMIZADA para Supabase Free Tier
    # Supabase en modo Session tiene límites estrictos de conexiones
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,      # Verificar conexiones antes de usarlas
        pool_recycle=120,        # Reciclar conexiones cada 2 minutos
        pool_size=2,             # Solo 2 conexiones en el pool (mínimo)
        max_overflow=3,          # Máximo 3 conexiones adicionales
        pool_timeout=30,         # Timeout de 30 segundos para obtener conexión
        echo=False               # No mostrar SQL en logs
    )
    print("📦 Database: Usando configuración optimizada para Supabase")
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
