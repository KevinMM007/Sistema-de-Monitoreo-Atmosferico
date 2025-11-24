"""
Script rápido para verificar configuración de notificaciones por correo
"""
import os
import sys
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

print("=" * 80)
print("🔍 VERIFICACIÓN DE CONFIGURACIÓN DE NOTIFICACIONES")
print("=" * 80)
print()

# Verificar archivo .env
print("1. Verificando archivo .env...")
env_path = os.path.join(os.path.dirname(__file__), '.env')

if not os.path.exists(env_path):
    print("   ❌ Archivo .env no encontrado")
    sys.exit(1)

with open(env_path, 'r') as f:
    env_content = f.read()
    
required_vars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_HOST_USER', 'EMAIL_HOST_PASSWORD']
missing_vars = []

for var in required_vars:
    if var not in env_content:
        missing_vars.append(var)
    elif f"{var}=tu_correo@gmail.com" in env_content or f"{var}=TU_" in env_content:
        print(f"   ⚠️  {var} no configurado (tiene valor por defecto)")
        missing_vars.append(var)

if missing_vars:
    print(f"   ❌ Variables faltantes o no configuradas: {', '.join(missing_vars)}")
    print()
    print("   💡 Abre el archivo .env y configura estas variables:")
    print("      EMAIL_HOST_USER=tu_correo@gmail.com")
    print("      EMAIL_HOST_PASSWORD=tu_contraseña_de_aplicacion")
else:
    print("   ✅ Archivo .env configurado correctamente")

print()

# Verificar archivos necesarios
print("2. Verificando archivos necesarios...")
required_files = {
    'email_service.py': '✅ Servicio de correo',
    'alert_system.py': '✅ Sistema de alertas',
    'models.py': '✅ Modelos de base de datos'
}

for file, desc in required_files.items():
    file_path = os.path.join(os.path.dirname(__file__), file)
    if os.path.exists(file_path):
        print(f"   {desc}: ENCONTRADO")
    else:
        print(f"   ❌ {file} NO ENCONTRADO")

print()

# Verificar servicio de email
print("3. Verificando servicio de email...")
try:
    from email_service import EmailService
    email_service = EmailService()
    
    if email_service.configured:
        print(f"   ✅ Servicio de email configurado")
        print(f"   📧 Usuario: {email_service.username}")
        print(f"   🖥️  Servidor: {email_service.host}:{email_service.port}")
    else:
        print(f"   ⚠️  Servicio de email NO configurado")
        print(f"   💡 Revisa las variables EMAIL_HOST_USER y EMAIL_HOST_PASSWORD en .env")
except Exception as e:
    print(f"   ❌ Error importando servicio de email: {str(e)}")
    import traceback
    traceback.print_exc()

print()

# Verificar base de datos
print("4. Verificando base de datos...")
try:
    from database import engine
    from sqlalchemy import text
    
    with engine.connect() as conn:
        # Verificar si existe la tabla
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'alert_subscriptions'
            );
        """))
        
        exists = result.scalar()
        
        if exists:
            # Contar suscripciones
            result = conn.execute(text("SELECT COUNT(*) FROM alert_subscriptions WHERE is_active = true"))
            count = result.scalar()
            print(f"   ✅ Tabla 'alert_subscriptions' existe")
            print(f"   📊 Suscripciones activas: {count}")
        else:
            print(f"   ❌ Tabla 'alert_subscriptions' NO existe")
            print()
            print(f"   💡 Ejecuta este SQL en PostgreSQL:")
            print(f"""
   CREATE TABLE alert_subscriptions (
       id SERIAL PRIMARY KEY,
       email VARCHAR(255) UNIQUE NOT NULL,
       is_active BOOLEAN DEFAULT TRUE,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       last_notification_sent TIMESTAMP NULL,
       notification_count INTEGER DEFAULT 0
   );
            """)
except Exception as e:
    print(f"   ❌ Error verificando base de datos: {str(e)}")

print()
print("=" * 80)
print("📋 RESUMEN")
print("=" * 80)
print()

try:
    if not missing_vars and email_service.configured:
        print("✅ ¡Todo configurado correctamente!")
        print()
        print("🧪 Pasos para probar:")
        print("   1. Reinicia el servidor: python main.py")
        print("   2. Ejecuta: python test_email_send.py")
        print("   3. O usa el endpoint: POST /api/alerts/test-email")
    else:
        print("⚠️  Configuración incompleta")
        print()
        print("📝 Acciones requeridas:")
        if missing_vars:
            print(f"   - Configurar variables en .env: {', '.join(missing_vars)}")
        if not email_service.configured:
            print("   - Configurar credenciales de correo en .env")
        print()
        print("📖 Lee la guía completa: GUIA_NOTIFICACIONES_EMAIL.md")
except:
    print("⚠️  No se pudo completar la verificación")
    print("   Asegúrate de que todas las variables estén configuradas en .env")

print()
