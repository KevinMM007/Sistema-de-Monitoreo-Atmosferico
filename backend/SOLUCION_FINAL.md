# 🎯 SOLUCIÓN FINAL - Sistema de Notificaciones por Correo

## 📊 Estado Actual del Sistema

### ✅ Lo que YA está implementado:
1. ✅ `email_service.py` - Servicio completo de correo
2. ✅ `alert_system.py` - Sistema de alertas
3. ✅ `models.py` - Modelo AlertSubscription
4. ✅ `main.py` - Todos los endpoints configurados
5. ✅ Base de datos PostgreSQL con tabla `alert_subscriptions`
6. ✅ Archivo `.env` con credenciales configuradas

### ⚠️ El Problema:
El sistema dice "Email NO configurado" pero el `.env` SÍ tiene las credenciales.

---

## 🔧 SOLUCIÓN EN 3 PASOS

### 📝 Paso 1: Verifica la contraseña

Hay una posible confusión entre:
- `vcf11efhzpjtgsdx` (con números "11")
- `vcfllefhzpjtgsdx` (con letras "ll")

**Tu .env actual tiene:** `vcfllefhzpjtgsdx`

**Ejecuta para verificar:**
```bash
cd C:\Users\moral\Documents\ProyectoResidencias\air-quality-project\air-quality-system\backend
python corregir_password.py
```

### 🔍 Paso 2: Ejecuta el diagnóstico completo

```bash
python diagnostico_completo.py
```

Este script verificará:
1. ✅ Archivo .env existe
2. ✅ python-dotenv instalado
3. ✅ Variables cargadas correctamente
4. ✅ EmailService configurado
5. ✅ Conexión SMTP funciona

### ✅ Paso 3: Prueba el sistema

**Opción A - Prueba simple:**
```bash
python test_email_send.py
```

**Opción B - Prueba completa:**
```bash
python test_email_complete.py
```

---

## 🚨 Si el Diagnóstico Muestra Errores

### Error 1: "python-dotenv NO está instalado"
```bash
pip install python-dotenv
```

### Error 2: "EmailService.configured = False"

**Causa:** Variables no se cargan del .env

**Solución:**

1. Abre `backend/.env` y verifica estas líneas:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=moralesmonterok@gmail.com
EMAIL_HOST_PASSWORD=vcfllefhzpjtgsdx
EMAIL_USE_TLS=True
```

2. **IMPORTANTE:** NO debe haber espacios antes o después del `=`

### Error 3: "ERROR DE AUTENTICACIÓN"

**Causa:** La contraseña es incorrecta o no es una contraseña de aplicación.

**Solución:**

1. **Genera una nueva contraseña de aplicación:**
   - Ve a: https://myaccount.google.com/apppasswords
   - Si no puedes acceder, activa primero la verificación en 2 pasos en: https://myaccount.google.com/security
   
2. **Pasos para generar:**
   - Selecciona "Correo"
   - Selecciona "Otro dispositivo" 
   - Nombre: "Sistema Calidad Aire"
   - Copia la contraseña de 16 caracteres

3. **Actualiza tu .env:**
```env
EMAIL_HOST_PASSWORD=tu_nueva_contraseña_de_16_caracteres
```

4. **NO uses espacios** en la contraseña

---

## 📱 Cómo Probar desde el Frontend

### 1. Inicia el servidor backend:
```bash
cd C:\Users\moral\Documents\ProyectoResidencias\air-quality-project\air-quality-system\backend
python main.py
```

### 2. Inicia el frontend:
```bash
cd C:\Users\moral\Documents\ProyectoResidencias\air-quality-project\air-quality-system\frontend
npm run dev
```

### 3. Abre el navegador:
```
http://localhost:5173
```

### 4. Ve a la sección de Alertas y:
- Haz clic en "Suscribirse a Alertas"
- Ingresa tu correo
- Deberías recibir un email de confirmación

---

## 🔗 Endpoints Disponibles

### GET `/api/alerts/current`
Obtiene alertas actuales basadas en los últimos datos de calidad del aire.

**Ejemplo:**
```bash
curl http://localhost:8000/api/alerts/current
```

### POST `/api/alerts/subscribe`
Suscribe un email para recibir alertas.

**Ejemplo:**
```bash
curl -X POST http://localhost:8000/api/alerts/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email": "tu_correo@gmail.com"}'
```

### POST `/api/alerts/unsubscribe`
Desuscribe un email.

**Ejemplo:**
```bash
curl -X POST http://localhost:8000/api/alerts/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{"email": "tu_correo@gmail.com"}'
```

### POST `/api/alerts/test-email`
Envía un correo de prueba.

**Ejemplo:**
```bash
curl -X POST http://localhost:8000/api/alerts/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "tu_correo@gmail.com"}'
```

### GET `/api/alerts/history?hours=24`
Obtiene historial de alertas de las últimas N horas.

**Ejemplo:**
```bash
curl http://localhost:8000/api/alerts/history?hours=48
```

### GET `/api/alerts/daily-report`
Genera un reporte diario completo.

**Ejemplo:**
```bash
curl http://localhost:8000/api/alerts/daily-report
```

---

## 📧 Formato de los Correos

Los correos incluyen:

### 1. Correo de Prueba:
- ✓ Confirmación de configuración exitosa
- 📋 Información del sistema

### 2. Alertas de Calidad del Aire:
- 🌡️ Nivel actual de calidad del aire
- 📊 Índice AQI
- 🎨 Visualización con colores según nivel
- 💡 Recomendaciones para:
  - Público general
  - Grupos sensibles
  - Actividades recomendadas
- 🔗 Enlace al dashboard

---

## 🎨 Niveles de Alerta

| Nivel | AQI | Color | Email |
|-------|-----|-------|-------|
| 😊 Bueno | 0-50 | Verde | ✓ Info |
| 😐 Moderado | 51-100 | Amarillo | ⚠️ Aviso |
| 😷 Insalubre (sensibles) | 101-150 | Naranja | ⚠️ Alerta |
| 🤒 Insalubre | 151-200 | Rojo | 🚨 Alerta |
| 😵 Muy Insalubre | 201-300 | Morado | 🚨 Alerta Severa |
| ☠️ Peligroso | 301+ | Marrón | ☠️ Emergencia |

---

## 🔄 Cómo Funcionan las Alertas Automáticas

1. **Recolección de Datos:**
   - OpenMeteo obtiene datos cada hora
   - Se almacenan en PostgreSQL

2. **Evaluación:**
   - `alert_system.py` evalúa los niveles de contaminación
   - Calcula el AQI para cada contaminante

3. **Notificación:**
   - Si el nivel cambia a "insalubre" o peor
   - Se envían correos a todos los suscritos
   - Se registra en la base de datos

4. **Frecuencia:**
   - Máximo 1 alerta cada 2 horas por suscriptor
   - Para evitar spam de notificaciones

---

## 🛠️ Archivos Importantes

```
backend/
├── .env                    # ⚙️ Configuración (IMPORTANTE)
├── email_service.py        # 📧 Servicio de correo
├── alert_system.py         # 🚨 Sistema de alertas
├── models.py               # 🗄️ Modelos de base de datos
├── main.py                 # 🌐 API endpoints
├── diagnostico_completo.py # 🔍 Script de diagnóstico
├── test_email_send.py      # 🧪 Prueba simple
├── test_email_complete.py  # 🧪 Prueba completa
├── corregir_password.py    # 🔧 Corrector de contraseña
└── SOLUCION_RAPIDA.md      # 📖 Guía de solución
```

---

## 📝 Checklist Final

Antes de dar por terminado, verifica:

- [ ] ✅ python-dotenv instalado
- [ ] ✅ .env configurado con credenciales correctas
- [ ] ✅ Contraseña de aplicación (NO contraseña normal)
- [ ] ✅ Verificación en 2 pasos activada en Gmail
- [ ] ✅ diagnostico_completo.py pasa todas las verificaciones
- [ ] ✅ test_email_send.py envía correo exitosamente
- [ ] ✅ Servidor FastAPI corriendo sin errores
- [ ] ✅ Frontend puede suscribirse a alertas
- [ ] ✅ Correos llegan a la bandeja (no spam)

---

## 🎉 Próximos Pasos

Una vez que todo funcione:

### 1. Personalización
- Ajusta los umbrales de alerta en `alert_system.py`
- Personaliza los templates HTML en `email_service.py`
- Modifica la frecuencia de notificaciones

### 2. Monitoreo
- Revisa los logs del servidor regularmente
- Verifica que las alertas se envíen correctamente
- Monitorea el número de suscriptores

### 3. Mejoras Futuras
- Agregar preferencias de usuario (frecuencia, tipos de alerta)
- Implementar notificaciones SMS
- Dashboard de estadísticas de envío
- A/B testing de templates de correo

---

## 📞 Comandos de Emergencia

### Ver todas las suscripciones:
```bash
python -c "from database import get_db; from models import AlertSubscription; db = next(get_db()); subs = db.query(AlertSubscription).filter(AlertSubscription.is_active==True).all(); print(f'Suscripciones activas: {len(subs)}'); [print(f'  - {s.email}') for s in subs]"
```

### Probar conexión SMTP directa:
```bash
python -c "import smtplib; s=smtplib.SMTP('smtp.gmail.com',587); s.starttls(); s.login('moralesmonterok@gmail.com','vcfllefhzpjtgsdx'); print('✅ OK'); s.quit()"
```

### Ver últimas alertas:
```bash
curl http://localhost:8000/api/alerts/history?hours=24 | python -m json.tool
```

---

## 🔗 Enlaces Útiles

- [Contraseñas de aplicación Google](https://myaccount.google.com/apppasswords)
- [Verificación en 2 pasos](https://myaccount.google.com/security)
- [Documentación FastAPI](https://fastapi.tiangolo.com/)
- [Documentación python-dotenv](https://pypi.org/project/python-dotenv/)

---

## ✨ ¡Éxito!

Si llegaste hasta aquí y todo funciona:

```
 ✅ Sistema de notificaciones COMPLETO
 📧 Correos configurados
 🚨 Alertas automáticas activas
 📊 Dashboard conectado
 🎉 ¡A monitorear la calidad del aire!
```

---

**¿Problemas?** Ejecuta `python diagnostico_completo.py` y revisa el output.

**¿Funciona?** Comparte con tus usuarios y ¡a disfrutar del sistema!
