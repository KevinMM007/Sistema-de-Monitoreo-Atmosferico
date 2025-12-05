"""
Script para inicializar las tablas en la base de datos de producción (Supabase).
Ejecutar una vez después de configurar la DATABASE_URL.

Uso:
    python init_db.py
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
