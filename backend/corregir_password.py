"""
🔧 CORRECTOR RÁPIDO - Verifica y corrige la contraseña en .env
"""
import os
from pathlib import Path

print("\n" + "=" * 80)
print("🔧 CORRECTOR DE CONTRASEÑA - .env")
print("=" * 80 + "\n")

env_path = Path(__file__).parent / '.env'

if not env_path.exists():
    print("❌ Archivo .env no encontrado")
    exit(1)

print("📖 Leyendo .env actual...")
with open(env_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Buscar la línea de EMAIL_HOST_PASSWORD
password_line_index = -1
current_password = None

for i, line in enumerate(lines):
    if line.strip().startswith('EMAIL_HOST_PASSWORD='):
        password_line_index = i
        current_password = line.strip().split('=', 1)[1]
        break

if password_line_index == -1:
    print("❌ No se encontró EMAIL_HOST_PASSWORD en .env")
    exit(1)

print(f"Contraseña actual: {current_password}")
print(f"Longitud: {len(current_password)} caracteres")
print()

# Verificar si la contraseña parece incorrecta
if 'vcfllefhzpjtgsdx' in current_password.lower():
    print("⚠️ ADVERTENCIA: Detectada contraseña que podría ser incorrecta")
    print(f"   Encontrada: vcfllefhzpjtgsdx")
    print(f"   Esperada:   vcf11efhzpjtgsdx (con números)")
    print()
    
    respuesta = input("¿Quieres corregirla a 'vcf11efhzpjtgsdx'? (s/n): ").lower()
    
    if respuesta == 's':
        lines[password_line_index] = 'EMAIL_HOST_PASSWORD=vcf11efhzpjtgsdx\n'
        
        with open(env_path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        
        print("✅ Contraseña corregida en .env")
        print("\n🔄 Ahora ejecuta: python diagnostico_completo.py")
    else:
        print("⏭️ No se hizo ningún cambio")
else:
    print("✅ La contraseña parece estar correcta")
    print(f"   Contraseña: {current_password}")
    print(f"   Longitud: {len(current_password)} caracteres")
    print()
    print("Si aún tienes problemas, verifica que esta sea la contraseña")
    print("de aplicación correcta generada en:")
    print("https://myaccount.google.com/apppasswords")

print()
print("=" * 80)
print()
