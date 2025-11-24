# 🚀 GUÍA RÁPIDA - Solución de Problemas de Notificaciones

## ⚡ Solución Rápida (5 minutos)

### 1️⃣ Ejecuta el diagnóstico completo
```bash
cd backend
python diagnostico_completo.py
```

Este script te dirá **exactamente** qué está fallando.

---

## 🔍 Problemas Comunes y Soluciones

### ❌ Problema: "Email NO configurado"

**Causa:** Las variables de entorno no se están cargando correctamente.

**Solución:**

1. **Verifica que python-dotenv esté instalado:**
   ```bash
   pip install python-dotenv
   ```

2. **Verifica el archivo .env:**
   ```bash
   # Abre backend/.env y verifica estas líneas:
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_HOST_USER=moralesmonterok@gmail.com
   EMAIL_HOST_PASSWORD=vcf11efhzpjtgsdx
   EMAIL_USE_TLS=True
   ```

3. **Ejecuta el corrector automático:**
   ```bash
   python corregir_password.py
   ```

---

### ❌ Problema: "Error de autenticación SMTP"

**Causa:** La contraseña es incorrecta o no es una contraseña de aplicación.

**Solución:**

1. **Genera una nueva contraseña de aplicación:**
   - Ve a: https://myaccount.google.com/apppasswords
   - Selecciona "Correo" y "Otro dispositivo"
   - Copia la contraseña de 16 caracteres

2. **Actualiza el .env:**
   ```bash
   EMAIL_HOST_PASSWORD=tu_nueva_contraseña_aqui
   ```

3. **NO uses tu contraseña normal de Gmail**, usa la contraseña de aplicación.

---

### ❌ Problema: Contraseña con caracteres confusos

**Nota:** Las contraseñas de Google a veces tienen caracteres que se parecen:
- `l` (L minúscula) vs `1` (número uno)
- `O` (O mayúscula) vs `0` (cero)

**Solución:**
```bash
python corregir_password.py
```

---

## ✅ Pruebas Paso a Paso

### Prueba 1: Diagnóstico
```bash
python diagnostico_completo.py
```
**Resultado esperado:** Todos los pasos deben mostrar ✅

---

### Prueba 2: Enviar correo de prueba
```bash
python test_email_send.py
```
**Resultado esperado:** Debes recibir un correo en tu bandeja de entrada

---

### Prueba 3: Enviar alerta completa
```bash
python test_email_complete.py
```
**Resultado esperado:** Debes recibir dos correos (prueba + alerta)

---

## 🎯 Checklist de Verificación

Antes de continuar, verifica:

- [ ] ✅ `python-dotenv` está instalado
- [ ] ✅ Archivo `backend/.env` existe
- [ ] ✅ `EMAIL_HOST_USER` tiene tu correo de Gmail
- [ ] ✅ `EMAIL_HOST_PASSWORD` tiene la contraseña de aplicación (16 caracteres)
- [ ] ✅ La contraseña NO es tu contraseña normal de Gmail
- [ ] ✅ Verificación en 2 pasos activada en Gmail
- [ ] ✅ `email_service.py` tiene `load_dotenv()` al inicio
- [ ] ✅ El diagnóstico muestra `EmailService.configured = True`

---

## 🔐 Cómo Generar Contraseña de Aplicación (Gmail)

### Paso 1: Activa la verificación en 2 pasos
1. Ve a: https://myaccount.google.com/security
2. En "Cómo inicias sesión en Google"
3. Activa "Verificación en 2 pasos"

### Paso 2: Genera la contraseña de aplicación
1. Ve a: https://myaccount.google.com/apppasswords
2. Selecciona:
   - **Aplicación:** Correo
   - **Dispositivo:** Otro (dispositivo personalizado)
   - **Nombre:** Sistema de Calidad del Aire
3. Haz clic en "Generar"
4. Copia la contraseña de 16 caracteres (sin espacios)
5. Pégala en `EMAIL_HOST_PASSWORD` en tu .env

---

## 📊 Interpretando el Diagnóstico

### ✅ Todo bien:
```
✅ Archivo .env encontrado
✅ python-dotenv instalado
✅ Variables cargadas en os.environ
✅ EmailService instanciado
✅ Configurado: True
✅ Conexión establecida
✅ TLS iniciado
✅ Autenticación exitosa
```

### ⚠️ Problema con variables:
```
✅ Archivo .env encontrado
✅ python-dotenv instalado
❌ EMAIL_HOST_PASSWORD: NO CARGADO
❌ EmailService.configured = False
```
**Solución:** Verifica el formato del .env (sin espacios extras)

### ⚠️ Problema de autenticación:
```
✅ Conexión establecida
✅ TLS iniciado
❌ ERROR DE AUTENTICACIÓN
```
**Solución:** Genera una nueva contraseña de aplicación

---

## 🆘 Si Nada Funciona

### Opción 1: Reinstalar dependencias
```bash
cd backend
pip install -r requirements.txt --force-reinstall
```

### Opción 2: Verificar instalación de dotenv
```bash
python -c "import dotenv; print(dotenv.__version__)"
```

### Opción 3: Probar con otra cuenta de Gmail
Si tu cuenta tiene restricciones, prueba con otro correo.

---

## 📞 Comandos Útiles

### Ver logs en tiempo real:
```bash
# Mientras el servidor está corriendo
tail -f logs/app.log
```

### Verificar variables de entorno:
```bash
python -c "from dotenv import load_dotenv; import os; load_dotenv(); print(os.getenv('EMAIL_HOST_USER'))"
```

### Probar conexión SMTP manualmente:
```bash
python -c "import smtplib; s=smtplib.SMTP('smtp.gmail.com',587); s.starttls(); print('OK')"
```

---

## 🎉 Cuando Todo Funcione

1. **Reinicia el servidor FastAPI:**
   ```bash
   cd backend
   python main.py
   ```

2. **Prueba los endpoints:**
   - GET `/api/alerts/subscriptions` - Ver suscripciones
   - POST `/api/alerts/subscribe` - Suscribirse
   - POST `/api/alerts/test-email` - Enviar prueba

3. **Prueba desde el frontend:**
   - Abre http://localhost:5173
   - Ve a la sección de Alertas
   - Haz clic en "Suscribirse a Alertas"

---

## 📝 Notas Importantes

- **La contraseña de aplicación se usa UNA SOLA VEZ** al configurar
- **NO compartas tu contraseña de aplicación** (tratala como una contraseña normal)
- **Las notificaciones se envían automáticamente** cuando hay cambios en la calidad del aire
- **Puedes tener múltiples correos suscritos** a las alertas
- **Los correos incluyen HTML** para mejor visualización

---

## 🔗 Enlaces Útiles

- [Contraseñas de aplicación de Google](https://myaccount.google.com/apppasswords)
- [Documentación de python-dotenv](https://pypi.org/project/python-dotenv/)
- [Guía de SMTP de Gmail](https://support.google.com/mail/answer/7126229)

---

## ✨ Próximos Pasos

Una vez que las notificaciones funcionen:

1. ✅ Configura los umbrales de alerta en `alert_system.py`
2. ✅ Personaliza los templates de correo en `email_service.py`
3. ✅ Ajusta la frecuencia de notificaciones
4. ✅ Prueba con usuarios reales
5. ✅ Monitorea los logs de envío

---

**¿Necesitas ayuda adicional?** Revisa los logs del servidor o contacta al administrador del sistema.
