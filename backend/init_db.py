"""
============================================================================
Sistema de Monitoreo de Calidad del Aire - Xalapa, Veracruz
============================================================================

ARCHIVO: init_db.py
PROPÓSITO: Inicialización de tablas en la base de datos

USO:
    python init_db.py

REQUISITOS:
    - DATABASE_URL configurada en .env o variable de entorno

TABLAS CREADAS:
    - air_quality_readings  : Lecturas de contaminantes
    - traffic_data          : Datos de tráfico
    - quadrant_statistics   : Estadísticas por zona
    - air_quality_predictions : Predicciones ML
    - alert_subscriptions   : Suscripciones de alertas

NOTA: Ejecutar una sola vez al configurar el sistema por primera vez.

AUTOR: Kevin Morales
VERSIÓN: 2.1.0
============================================================================
"""

import os
import sys
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Verificar que existe DATABASE_URL
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("❌ Error: DATABASE_URL no está configurada")
    print("   Configura la variable de entorno antes de ejecutar este script")
    sys.exit(1)

print(f"🔗 Conectando a la base de datos...")
print(f"   Host: {DATABASE_URL.split('@')[1].split('/')[0] if '@' in DATABASE_URL else 'localhost'}")

try:
    from database import engine, Base
    import models  # Importar todos los modelos para que SQLAlchemy los conozca
    
    print("📦 Creando tablas...")
    Base.metadata.create_all(bind=engine)
    
    print("✅ ¡Tablas creadas exitosamente!")
    print("\nTablas disponibles:")
    for table in Base.metadata.tables.keys():
        print(f"   - {table}")
        
except Exception as e:
    print(f"❌ Error al crear las tablas: {e}")
    sys.exit(1)
