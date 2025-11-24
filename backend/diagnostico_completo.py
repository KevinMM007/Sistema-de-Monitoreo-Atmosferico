"""
🔍 DIAGNÓSTICO DETALLADO - Sistema de Notificaciones
Este script verifica paso a paso qué está funcionando y qué no
"""
import os
import sys
from pathlib import Path

print("\n" + "=" * 80)
print("🔍 DIAGNÓSTICO COMPLETO DEL SISTEMA DE NOTIFICACIONES")
print("=" * 80 + "\n")

# ============================================================================
# PASO 1: Verificar archivo .env
# ============================================================================
print("📁 PASO 1: Verificando archivo .env")
print("-" * 80)

env_path = Path(__file__).parent / '.env'
print(f"Buscando .env en: {env_path}")

if not env_path.exists():
    print("❌ ARCHIVO .env NO ENCONTRADO")
    print(f"   Esperado en: {env_path}")
    print("\n💡 Crea el archivo .env con estas variables:")
    print("   EMAIL_HOST=smtp.gmail.com")
    print("   EMAIL_PORT=587")
    print("   EMAIL_HOST_USER=tu_correo@gmail.com")
    print("   EMAIL_HOST_PASSWORD=tu_contraseña_de_aplicacion")
    sys.exit(1)

print(f"✅ Archivo .env encontrado")

# Leer .env para verificación manual
with open(env_path, 'r', encoding='utf-8') as f:
    env_lines = f.readlines()

email_vars = {}
for line in env_lines:
    line = line.strip()
    if line.startswith('EMAIL_'):
        if '=' in line:
            key, value = line.split('=', 1)
            email_vars[key] = value

print(f"\n📋 Variables EMAIL_ encontradas en .env:")
for key, value in email_vars.items():
    if 'PASSWORD' in key:
        print(f"   {key} = {'*' * len(value)} ({len(value)} caracteres)")
    else:
        print(f"   {key} = {value}")

# ============================================================================
# PASO 2: Verificar python-dotenv
# ============================================================================
print("\n" + "-" * 80)
print("📦 PASO 2: Verificando python-dotenv")
print("-" * 80)

try:
    import dotenv
    print(f"✅ python-dotenv instalado (versión: {dotenv.__version__})")
except ImportError:
    print("❌ python-dotenv NO está instalado")
    print("\n💡 Instalar con:")
    print("   pip install python-dotenv")
    sys.exit(1)

# ============================================================================
# PASO 3: Cargar variables con dotenv
# ============================================================================
print("\n" + "-" * 80)
print("🔄 PASO 3: Cargando variables de entorno")
print("-" * 80)

from dotenv import load_dotenv

# Cargar .env
loaded = load_dotenv(dotenv_path=env_path)
print(f"load_dotenv() retornó: {loaded}")

# Verificar que las variables se cargaron
print("\n📋 Variables cargadas en os.environ:")
email_env_vars = {
    'EMAIL_HOST': os.getenv('EMAIL_HOST'),
    'EMAIL_PORT': os.getenv('EMAIL_PORT'),
    'EMAIL_HOST_USER': os.getenv('EMAIL_HOST_USER'),
    'EMAIL_HOST_PASSWORD': os.getenv('EMAIL_HOST_PASSWORD'),
    'EMAIL_FROM': os.getenv('EMAIL_FROM'),
    'EMAIL_USE_TLS': os.getenv('EMAIL_USE_TLS')
}

all_present = True
for key, value in email_env_vars.items():
    if value is None:
        print(f"   ❌ {key}: NO CARGADO")
        all_present = False
    elif 'PASSWORD' in key:
        print(f"   ✅ {key}: {'*' * len(value)} ({len(value)} caracteres)")
    else:
        print(f"   ✅ {key}: {value}")

if not all_present:
    print("\n⚠️ ADVERTENCIA: Algunas variables no se cargaron correctamente")

# ============================================================================
# PASO 4: Verificar EmailService
# ============================================================================
print("\n" + "-" * 80)
print("📧 PASO 4: Verificando EmailService")
print("-" * 80)

try:
    from email_service import EmailService
    print("✅ email_service.py importado correctamente")
except ImportError as e:
    print(f"❌ Error importando email_service: {e}")
    sys.exit(1)

try:
    email_service = EmailService()
    print(f"\n✅ EmailService instanciado")
    print(f"\n📊 Estado del servicio:")
    print(f"   Configurado: {email_service.configured}")
    print(f"   Host: {email_service.host}")
    print(f"   Port: {email_service.port}")
    print(f"   Username: {email_service.username}")
    print(f"   Password: {'*' * len(email_service.password) if email_service.password else 'NO CONFIGURADO'} ({len(email_service.password)} caracteres)")
    print(f"   From Email: {email_service.from_email}")
    print(f"   Use TLS: {email_service.use_tls}")
    
    if not email_service.configured:
        print("\n❌ EmailService.configured = False")
        print("   Esto significa que username o password están vacíos")
        
        if not email_service.username:
            print("   ❌ username está vacío")
        if not email_service.password:
            print("   ❌ password está vacío")
            
except Exception as e:
    print(f"❌ Error creando EmailService: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# ============================================================================
# PASO 5: Test de conexión SMTP
# ============================================================================
if email_service.configured:
    print("\n" + "-" * 80)
    print("🌐 PASO 5: Probando conexión SMTP")
    print("-" * 80)
    
    try:
        import smtplib
        
        print(f"Conectando a {email_service.host}:{email_service.port}...")
        server = smtplib.SMTP(email_service.host, email_service.port, timeout=10)
        print("✅ Conexión establecida")
        
        print("Iniciando TLS...")
        server.starttls()
        print("✅ TLS iniciado")
        
        print(f"Autenticando con {email_service.username}...")
        server.login(email_service.username, email_service.password)
        print("✅ Autenticación exitosa")
        
        server.quit()
        print("✅ Conexión cerrada correctamente")
        
        print("\n" + "=" * 80)
        print("✅✅✅ ¡TODO ESTÁ FUNCIONANDO PERFECTAMENTE! ✅✅✅")
        print("=" * 80)
        print("\n🎉 El sistema de notificaciones está listo para usar")
        print("\n📝 Próximos pasos:")
        print("   1. Ejecuta: python test_email_send.py")
        print("   2. O ejecuta: python test_email_complete.py")
        print("   3. O inicia el servidor y prueba los endpoints")
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"\n❌ ERROR DE AUTENTICACIÓN")
        print(f"   Código de error: {e.smtp_code}")
        print(f"   Mensaje: {e.smtp_error}")
        print("\n💡 Posibles soluciones:")
        print("   1. Verifica que la contraseña sea correcta")
        print("   2. Asegúrate de usar una 'Contraseña de aplicación' de Google")
        print("   3. No uses tu contraseña normal de Gmail")
        print("\n🔗 Genera una contraseña de aplicación:")
        print("   https://myaccount.google.com/apppasswords")
        print("\n📝 Pasos:")
        print("   1. Activa la verificación en 2 pasos")
        print("   2. Ve a 'Contraseñas de aplicaciones'")
        print("   3. Selecciona 'Correo' y 'Otro dispositivo'")
        print("   4. Genera la contraseña (16 caracteres)")
        print("   5. Actualiza EMAIL_HOST_PASSWORD en .env")
        
    except smtplib.SMTPException as e:
        print(f"\n❌ ERROR DE SMTP: {e}")
        
    except Exception as e:
        print(f"\n❌ ERROR GENERAL: {e}")
        import traceback
        traceback.print_exc()

else:
    print("\n" + "=" * 80)
    print("⚠️ RESUMEN DEL PROBLEMA")
    print("=" * 80)
    print("\nEmailService.configured = False")
    print("\nEsto significa que las credenciales no se cargaron correctamente.")
    print("\n🔍 Verifica:")
    print("   1. Que el archivo .env tenga las líneas:")
    print("      EMAIL_HOST_USER=moralesmonterok@gmail.com")
    print("      EMAIL_HOST_PASSWORD=tu_contraseña_de_16_caracteres")
    print("   2. Que no haya espacios extras antes o después del =")
    print("   3. Que python-dotenv esté instalado")
    print("   4. Que email_service.py tenga load_dotenv() al inicio")

print("\n")
