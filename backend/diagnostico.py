"""
Script de Diagnóstico del Sistema
Ejecuta esto para ver qué está fallando
"""

import sys
import os

print("\n" + "="*80)
print("🔍 DIAGNÓSTICO DEL SISTEMA")
print("="*80 + "\n")

# Test 1: Python
print("1️⃣ Verificando Python...")
print(f"   ✅ Python {sys.version.split()[0]}")
print()

# Test 2: Módulos necesarios
print("2️⃣ Verificando módulos...")
required_modules = [
    'fastapi',
    'uvicorn',
    'sqlalchemy',
    'psycopg2',
    'pandas',
    'requests',
    'dotenv'
]

missing_modules = []
for module in required_modules:
    try:
        __import__(module.replace('-', '_'))
        print(f"   ✅ {module}")
    except ImportError:
        print(f"   ❌ {module} - NO INSTALADO")
        missing_modules.append(module)

if missing_modules:
    print(f"\n   ⚠️ Faltan módulos: {', '.join(missing_modules)}")
    print(f"   💡 Ejecuta: pip install {' '.join(missing_modules)}")
print()

# Test 3: Archivos importantes
print("3️⃣ Verificando archivos...")
important_files = [
    'main.py',
    'email_service.py',
    'alert_system.py',
    'database.py',
    'models.py',
    '.env'
]

for file in important_files:
    if os.path.exists(file):
        print(f"   ✅ {file}")
    else:
        print(f"   ❌ {file} - NO ENCONTRADO")
print()

# Test 4: Archivo .env
print("4️⃣ Verificando configuración .env...")
if os.path.exists('.env'):
    with open('.env', 'r') as f:
        content = f.read()
        
    checks = {
        'DATABASE_URL': 'postgresql://' in content,
        'EMAIL_HOST_USER': 'EMAIL_HOST_USER=' in content and '@gmail.com' in content,
        'EMAIL_HOST_PASSWORD': 'EMAIL_HOST_PASSWORD=' in content and len(content.split('EMAIL_HOST_PASSWORD=')[1].split('\n')[0]) > 5
    }
    
    for key, value in checks.items():
        if value:
            print(f"   ✅ {key} configurado")
        else:
            print(f"   ❌ {key} NO configurado o inválido")
else:
    print("   ❌ Archivo .env no encontrado")
print()

# Test 5: Base de datos
print("5️⃣ Verificando conexión a base de datos...")
try:
    from database import engine
    from sqlalchemy import text
    
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("   ✅ Conexión a PostgreSQL exitosa")
        
        # Verificar tabla de suscripciones
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'alert_subscriptions'
            );
        """))
        
        if result.scalar():
            print("   ✅ Tabla alert_subscriptions existe")
            
            # Contar suscripciones
            result = conn.execute(text("SELECT COUNT(*) FROM alert_subscriptions"))
            count = result.scalar()
            print(f"   📊 {count} suscripción(es) en la base de datos")
        else:
            print("   ❌ Tabla alert_subscriptions NO existe")
            
except Exception as e:
    print(f"   ❌ Error de base de datos: {str(e)}")
print()

# Test 6: Servicio de email
print("6️⃣ Verificando servicio de email...")
try:
    from dotenv import load_dotenv
    load_dotenv()
    
    from email_service import EmailService
    
    email_service = EmailService()
    
    if email_service.configured:
        print(f"   ✅ Servicio de email configurado")
        print(f"   📧 Usuario: {email_service.username}")
    else:
        print("   ❌ Servicio de email NO configurado")
        print("   💡 Revisa EMAIL_HOST_USER y EMAIL_HOST_PASSWORD en .env")
        
except Exception as e:
    print(f"   ❌ Error: {str(e)}")
print()

# Test 7: Puertos
print("7️⃣ Verificando puertos...")
import socket

def check_port(port, name):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('localhost', port))
    sock.close()
    
    if result == 0:
        print(f"   ⚠️ Puerto {port} ({name}) ya está en uso")
        return False
    else:
        print(f"   ✅ Puerto {port} ({name}) disponible")
        return True

check_port(8000, "Backend")
check_port(5173, "Frontend")
print()

# Resumen
print("="*80)
print("📋 RESUMEN")
print("="*80)

if not missing_modules:
    print("✅ Todos los módulos están instalados")
else:
    print(f"❌ Faltan módulos: {', '.join(missing_modules)}")
    print(f"   Ejecuta: pip install {' '.join(missing_modules)}")

print()
print("🎯 PARA INICIAR EL SISTEMA:")
print()
print("   Opción 1 (Recomendada):")
print("      - Doble click en: 1-BACKEND.bat")
print("      - Doble click en: 3-FRONTEND.bat")
print()
print("   Opción 2 (Manual):")
print("      Terminal 1: python main.py")
print("      Terminal 2: cd ../frontend && npm run dev")
print()
print("   NOTA: NO necesitas ejecutar auto_monitor.py")
print("         El sistema funciona perfectamente sin él")
print()
