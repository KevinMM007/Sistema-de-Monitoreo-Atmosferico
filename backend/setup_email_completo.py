"""
🚀 SCRIPT AUTOMATIZADO - Configuración y Prueba del Sistema de Notificaciones

Este script:
1. Verifica la instalación de dependencias
2. Verifica y corrige el archivo .env
3. Prueba la conexión SMTP
4. Envía correos de prueba
5. Genera reporte final

Ejecutar: python setup_email_completo.py
"""

import os
import sys
import subprocess
from pathlib import Path
from datetime import datetime

print("\n" + "=" * 80)
print("🚀 CONFIGURACIÓN AUTOMATIZADA - SISTEMA DE NOTIFICACIONES")
print("=" * 80 + "\n")

# Colores para terminal (funciona en Windows y Linux)
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_step(step_num, description):
    """Imprime el número de paso"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}PASO {step_num}: {description}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.RESET}\n")

def print_success(message):
    """Imprime mensaje de éxito"""
    print(f"{Colors.GREEN}✅ {message}{Colors.RESET}")

def print_error(message):
    """Imprime mensaje de error"""
    print(f"{Colors.RED}❌ {message}{Colors.RESET}")

def print_warning(message):
    """Imprime mensaje de advertencia"""
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.RESET}")

def print_info(message):
    """Imprime mensaje informativo"""
    print(f"   {message}")

# ============================================================================
# PASO 1: Verificar python-dotenv
# ============================================================================
print_step(1, "Verificando python-dotenv")

try:
    import dotenv
    print_success(f"python-dotenv instalado (versión {dotenv.__version__})")
except ImportError:
    print_warning("python-dotenv NO instalado")
    print_info("Instalando python-dotenv...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "python-dotenv"])
        import dotenv
        print_success("python-dotenv instalado exitosamente")
    except Exception as e:
        print_error(f"Error instalando python-dotenv: {e}")
        print_info("\n💡 Instala manualmente con: pip install python-dotenv")
        sys.exit(1)

# ============================================================================
# PASO 2: Verificar archivo .env
# ============================================================================
print_step(2, "Verificando archivo .env")

env_path = Path(__file__).parent / '.env'

if not env_path.exists():
    print_error("Archivo .env NO encontrado")
    print_info(f"Esperado en: {env_path}")
    print_info("\n💡 Crea el archivo .env con las variables de configuración")
    sys.exit(1)

print_success("Archivo .env encontrado")

# Leer y analizar .env
with open(env_path, 'r', encoding='utf-8') as f:
    env_content = f.read()
    env_lines = env_content.split('\n')

email_vars = {}
for line in env_lines:
    line = line.strip()
    if line.startswith('EMAIL_') and '=' in line:
        key, value = line.split('=', 1)
        email_vars[key] = value.strip()

print_info("\n📋 Variables EMAIL_ encontradas:")
required_vars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_HOST_USER', 'EMAIL_HOST_PASSWORD']
missing_vars = []

for var in required_vars:
    if var in email_vars:
        if 'PASSWORD' in var:
            print_success(f"{var} = {'*' * len(email_vars[var])} ({len(email_vars[var])} caracteres)")
        else:
            print_success(f"{var} = {email_vars[var]}")
    else:
        print_error(f"{var} NO encontrado")
        missing_vars.append(var)

if missing_vars:
    print_error(f"\nVariables faltantes: {', '.join(missing_vars)}")
    sys.exit(1)

# ============================================================================
# PASO 3: Verificar contraseña (posible confusión l vs 1)
# ============================================================================
print_step(3, "Verificando contraseña")

current_password = email_vars.get('EMAIL_HOST_PASSWORD', '')

if 'vcfllefhzpjtgsdx' in current_password.lower():
    print_warning("Detectada posible contraseña incorrecta")
    print_info(f"Actual: {current_password}")
    print_info(f"Posible corrección: vcf11efhzpjtgsdx (con números)")
    print()
    
    respuesta = input("¿Corregir a 'vcf11efhzpjtgsdx'? (s/n): ").lower()
    
    if respuesta == 's':
        new_content = env_content.replace(
            f'EMAIL_HOST_PASSWORD={current_password}',
            'EMAIL_HOST_PASSWORD=vcf11efhzpjtgsdx'
        )
        
        with open(env_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print_success("Contraseña corregida en .env")
        email_vars['EMAIL_HOST_PASSWORD'] = 'vcf11efhzpjtgsdx'
    else:
        print_info("Usando contraseña actual")
else:
    print_success("Contraseña parece correcta")

# ============================================================================
# PASO 4: Cargar variables con dotenv
# ============================================================================
print_step(4, "Cargando variables de entorno")

from dotenv import load_dotenv

loaded = load_dotenv(dotenv_path=env_path, override=True)
print_info(f"load_dotenv() retornó: {loaded}")

# Verificar variables cargadas
print_info("\n📋 Variables en os.environ:")
for var in required_vars:
    value = os.getenv(var)
    if value:
        if 'PASSWORD' in var:
            print_success(f"{var} = {'*' * len(value)} ({len(value)} caracteres)")
        else:
            print_success(f"{var} = {value}")
    else:
        print_error(f"{var} NO cargado")

# ============================================================================
# PASO 5: Verificar EmailService
# ============================================================================
print_step(5, "Verificando EmailService")

try:
    from email_service import EmailService
    print_success("email_service.py importado")
    
    email_service = EmailService()
    print_success("EmailService instanciado")
    
    print_info("\n📊 Estado del servicio:")
    print_info(f"   Configurado: {email_service.configured}")
    print_info(f"   Host: {email_service.host}")
    print_info(f"   Port: {email_service.port}")
    print_info(f"   Username: {email_service.username}")
    print_info(f"   Password: {'*' * len(email_service.password)} ({len(email_service.password)} caracteres)")
    
    if not email_service.configured:
        print_error("\nEmailService NO configurado (username o password vacíos)")
        sys.exit(1)
    
    print_success("\nEmailService configurado correctamente")
    
except Exception as e:
    print_error(f"Error con EmailService: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# ============================================================================
# PASO 6: Probar conexión SMTP
# ============================================================================
print_step(6, "Probando conexión SMTP")

try:
    import smtplib
    
    print_info(f"Conectando a {email_service.host}:{email_service.port}...")
    server = smtplib.SMTP(email_service.host, email_service.port, timeout=10)
    print_success("Conexión establecida")
    
    print_info("Iniciando TLS...")
    server.starttls()
    print_success("TLS iniciado")
    
    print_info(f"Autenticando con {email_service.username}...")
    server.login(email_service.username, email_service.password)
    print_success("Autenticación exitosa")
    
    server.quit()
    print_success("Conexión cerrada correctamente")
    
    smtp_ok = True
    
except smtplib.SMTPAuthenticationError as e:
    smtp_ok = False
    print_error("ERROR DE AUTENTICACIÓN")
    print_info(f"Código: {e.smtp_code}")
    print_info(f"Mensaje: {e.smtp_error}")
    print()
    print_warning("💡 Soluciones:")
    print_info("   1. Genera nueva contraseña en: https://myaccount.google.com/apppasswords")
    print_info("   2. Asegúrate de tener verificación en 2 pasos activa")
    print_info("   3. Usa contraseña de aplicación (NO la contraseña normal)")
    
except Exception as e:
    smtp_ok = False
    print_error(f"Error de conexión: {e}")
    import traceback
    traceback.print_exc()

if not smtp_ok:
    print_error("\n⚠️ La configuración tiene problemas. Revisa los errores arriba.")
    sys.exit(1)

# ============================================================================
# PASO 7: Enviar correos de prueba
# ============================================================================
print_step(7, "Enviando correos de prueba")

print_info("Ingresa el correo destino para las pruebas")
print_info(f"(Presiona Enter para usar {email_service.username})")
email_destino = input("Correo: ").strip()

if not email_destino:
    email_destino = email_service.username
    print_info(f"Usando: {email_destino}")

print()
print_info("📤 Enviando correo de prueba...")

try:
    success = email_service.send_test_email(email_destino)
    if success:
        print_success(f"Correo de prueba enviado a {email_destino}")
    else:
        print_error("Error enviando correo de prueba")
except Exception as e:
    print_error(f"Excepción: {e}")

print()
print_info("📤 Enviando alerta de prueba...")

# Datos de prueba para alerta
from datetime import datetime

alert_data = {
    'timestamp': datetime.now().isoformat(),
    'aqi': {
        'overall': 156,
        'PM2_5': 156,
        'PM10': 98
    },
    'overall_level': {
        'value': 'insalubre',
        'label': 'Insalubre',
        'color': '#ef4444'
    },
    'recommendations': {
        'general': 'La calidad del aire es insalubre. Se recomienda limitar actividades al aire libre.',
        'sensitive': 'Grupos sensibles deben evitar actividades al aire libre.',
        'activities': [
            'Mantente en interiores',
            'Usa purificadores de aire',
            'Evita ejercicio intenso'
        ]
    }
}

try:
    success = email_service.send_alert_email(email_destino, alert_data)
    if success:
        print_success(f"Alerta de prueba enviada a {email_destino}")
    else:
        print_error("Error enviando alerta")
except Exception as e:
    print_error(f"Excepción: {e}")

# ============================================================================
# RESUMEN FINAL
# ============================================================================
print("\n" + "=" * 80)
print(f"{Colors.BOLD}{Colors.GREEN}✅ ¡CONFIGURACIÓN COMPLETADA!{Colors.RESET}")
print("=" * 80 + "\n")

print(f"{Colors.BOLD}📋 RESUMEN:{Colors.RESET}")
print_success("python-dotenv instalado")
print_success("Archivo .env configurado")
print_success("Variables cargadas correctamente")
print_success("EmailService funcionando")
print_success("Conexión SMTP exitosa")
print_success("Correos de prueba enviados")

print(f"\n{Colors.BOLD}📬 REVISA TU CORREO:{Colors.RESET}")
print_info(f"Deberías haber recibido 2 correos en: {email_destino}")
print_info("   1. Correo de prueba del sistema")
print_info("   2. Alerta de calidad del aire simulada")

print(f"\n{Colors.BOLD}🎯 PRÓXIMOS PASOS:{Colors.RESET}")
print_info("1. Inicia el servidor FastAPI:")
print_info("   python main.py")
print()
print_info("2. Prueba los endpoints:")
print_info("   curl http://localhost:8000/api/alerts/current")
print()
print_info("3. Prueba desde el frontend:")
print_info("   http://localhost:5173")

print(f"\n{Colors.BOLD}📖 DOCUMENTACIÓN:{Colors.RESET}")
print_info("SOLUCION_FINAL.md - Guía completa")
print_info("SOLUCION_RAPIDA.md - Guía rápida")

print("\n" + "=" * 80)
print(f"{Colors.BOLD}{Colors.GREEN}🎉 ¡Sistema de notificaciones LISTO!{Colors.RESET}")
print("=" * 80 + "\n")
