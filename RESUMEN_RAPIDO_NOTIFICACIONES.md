# 🚀 RESUMEN RÁPIDO: Implementar Notificaciones por Correo

## ✅ ARCHIVOS YA CREADOS EN TU PROYECTO:

1. `backend/email_service.py` - ✅ Servicio de envío de correos
2. `backend/alert_system.py` - ✅ Sistema de alertas actualizado
3. `backend/models.py` - ✅ Modelo AlertSubscription agregado
4. `backend/check_email_config.py` - ✅ Script de verificación
5. `backend/test_email_send.py` - ✅ Script de prueba
6. `GUIA_NOTIFICACIONES_EMAIL.md` - ✅ Guía completa

## 🎯 PASOS PARA CONFIGURAR (10 minutos):

### PASO 1: Configurar Gmail (3 minutos)

1. Ve a: https://myaccount.google.com/security
2. Habilita "Verificación en 2 pasos"
3. Ve a: https://myaccount.google.com/apppasswords
4. Crea una contraseña de aplicación para "Mail"
5. GUARDA la contraseña (16 caracteres)

### PASO 2: Actualizar .env (1 minuto)

Abre `backend/.env` y agrega/actualiza:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=moralesmonterok@gmail.com
EMAIL_HOST_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_FROM=Sistema de Calidad del Aire <moralesmonterok@gmail.com>
EMAIL_USE_TLS=True
```

**IMPORTANTE:** Reemplaza `EMAIL_HOST_PASSWORD` con la contraseña de aplicación del Paso 1.

### PASO 3: Crear Tabla en PostgreSQL (1 minuto)

Opción A - pgAdmin:
1. Abre pgAdmin
2. Conecta a `air_quality_xalapa`
3. Query Tool (F5)
4. Pega y ejecuta:

```sql
CREATE TABLE IF NOT EXISTS alert_subscriptions (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_notification_sent TIMESTAMP NULL,
    notification_count INTEGER DEFAULT 0
);

CREATE INDEX idx_alert_subscriptions_email ON alert_subscriptions(email);
```

Opción B - Línea de comandos:
```bash
psql -U postgres -d air_quality_xalapa -c "CREATE TABLE IF NOT EXISTS alert_subscriptions (id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, last_notification_sent TIMESTAMP NULL, notification_count INTEGER DEFAULT 0);"
```

### PASO 4: Actualizar main.py (2 minutos)

Abre `backend/main.py` y:

1. **Busca** la línea que dice:
```python
openmeteo_collector = OpenMeteoCollector()
```

2. **Agrega DESPUÉS** de esa línea:
```python
# Cargar suscripciones al iniciar
@app.on_event("startup")
async def load_subscriptions():
    """Carga suscripciones activas al iniciar el servidor"""
    try:
        db = next(get_db())
        active_subscriptions = db.query(models.AlertSubscription).filter(
            models.AlertSubscription.is_active == True
        ).all()
        
        for sub in active_subscriptions:
            alert_system.subscribe_email(sub.email)
        
        print(f"✓ Cargadas {len(active_subscriptions)} suscripciones activas")
    except Exception as e:
        print(f"⚠️ Error cargando suscripciones: {str(e)}")
```

3. **Busca** la función `subscribe_to_alerts` (alrededor línea 441) y **reemplázala** con:

```python
@app.post("/api/alerts/subscribe")
async def subscribe_to_alerts(request: dict, db: Session = Depends(get_db)):
    """Suscribe un email para recibir alertas de calidad del aire"""
    try:
        email = request.get('email')
        if not email:
            raise HTTPException(status_code=400, detail="Email es requerido")
        
        import re
        if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
            raise HTTPException(status_code=400, detail="Formato de email inválido")
        
        existing = db.query(models.AlertSubscription).filter(
            models.AlertSubscription.email == email
        ).first()
        
        if existing:
            if not existing.is_active:
                existing.is_active = True
                existing.updated_at = datetime.utcnow()
                db.commit()
                alert_system.subscribe_email(email)
                return {"message": "Suscripción reactivada exitosamente", "email": email}
            else:
                return {"message": "El email ya está suscrito", "email": email}
        
        new_subscription = models.AlertSubscription(email=email, is_active=True)
        db.add(new_subscription)
        db.commit()
        alert_system.subscribe_email(email)
        
        return {"message": "Suscripción exitosa. Recibirás un correo de confirmación.", "email": email}
    except Exception as e:
        print(f"Error en suscripción: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail={"error": "Error al suscribir email"})
```

4. **Busca** la función `unsubscribe_from_alerts` y **reemplázala** con:

```python
@app.post("/api/alerts/unsubscribe")
async def unsubscribe_from_alerts(request: dict, db: Session = Depends(get_db)):
    """Desuscribe un email de las alertas de calidad del aire"""
    try:
        email = request.get('email')
        if not email:
            raise HTTPException(status_code=400, detail="Email es requerido")
        
        subscription = db.query(models.AlertSubscription).filter(
            models.AlertSubscription.email == email
        ).first()
        
        if subscription:
            subscription.is_active = False
            subscription.updated_at = datetime.utcnow()
            db.commit()
        
        alert_system.unsubscribe_email(email)
        return {"message": "Desuscripción exitosa", "email": email}
    except Exception as e:
        print(f"Error en desuscripción: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail={"error": "Error al desuscribir email"})
```

5. **Agrega** este endpoint de prueba al final del archivo (antes de `@app.get("/api/air-quality/by-zone")`):

```python
@app.post("/api/alerts/test-email")
async def test_email_notification(request: dict):
    """Envía un correo de prueba para verificar configuración"""
    try:
        email = request.get('email')
        if not email:
            raise HTTPException(status_code=400, detail="Email requerido")
        
        from email_service import EmailService
        email_service = EmailService()
        
        if not email_service.configured:
            raise HTTPException(
                status_code=500,
                detail="Servicio de email no configurado. Revisa el archivo .env"
            )
        
        success = email_service.send_test_email(email)
        
        if success:
            return {"message": "Correo de prueba enviado exitosamente", "email": email}
        else:
            raise HTTPException(
                status_code=500,
                detail="Error al enviar correo. Revisa las credenciales en .env"
            )
    except Exception as e:
        print(f"Error en test de email: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
```

### PASO 5: Verificar Configuración (1 minuto)

```bash
cd C:\Users\moral\Documents\ProyectoResidencias\air-quality-project\air-quality-system\backend
python check_email_config.py
```

**Resultado esperado:**
```
✅ Archivo .env configurado correctamente
✅ Servicio de email configurado
✅ Tabla 'alert_subscriptions' existe
✅ ¡Todo configurado correctamente!
```

### PASO 6: Probar Envío de Correo (1 minuto)

```bash
python test_email_send.py
```

**Ingresa tu correo y presiona Enter.**

**Resultado esperado:**
- ✅ "CORREO ENVIADO EXITOSAMENTE!"
- 📬 Recibes un correo en tu bandeja de entrada

### PASO 7: Probar desde el Frontend (1 minuto)

1. Reinicia el backend:
```bash
python main.py
```

2. Verifica en logs:
```
✓ Servicio de email configurado: tu_correo@gmail.com
✓ Cargadas 0 suscripciones activas
```

3. Abre http://localhost:5173
4. Ve a "Alertas y Predicciones"
5. Ingresa tu correo
6. Click "Activar Notificaciones"

**Resultado esperado:**
- ✅ "Notificaciones activadas exitosamente"
- 📧 Recibes correo de bienvenida
- 💾 Email guardado en la base de datos

---

## 🎓 PARA TU TESIS - DEMOSTRACIÓN

### Cómo demostrar que funciona:

1. **Mostrar suscripción:**
   - Frontend con correo ingresado
   - Mensaje de éxito
   - Correo de confirmación recibido

2. **Mostrar en base de datos:**
```sql
SELECT * FROM alert_subscriptions WHERE is_active = true;
```

3. **Simular alerta:**
Crea `test_alert_notification.py`:
```python
from alert_system import AlertSystem

alert_system = AlertSystem()
alert_system.subscribe_email("tu_correo@gmail.com")

# Simular alta contaminación
alert_system.evaluate_air_quality({
    'pm25': 120.0,  # Muy alto
    'pm10': 200.0,
    'no2': 150.0,
    'o3': 80.0,
    'co': 5.0
}, send_notifications=True)
```

Ejecuta:
```bash
python test_alert_notification.py
```

**Mostrar:**
- ✅ Correo de alerta recibido
- ✅ Nivel de alerta en el correo
- ✅ Recomendaciones personalizadas

---

## 🐛 SOLUCIÓN RÁPIDA DE PROBLEMAS

### "Authentication failed"
→ Usa **contraseña de aplicación**, no contraseña normal de Gmail

### "Module 'email_service' not found"
→ Los archivos están en `backend/`, ejecuta desde ahí

### "Table does not exist"
→ Ejecuta el SQL del Paso 3 en PostgreSQL

### No recibo correos
→ Revisa carpeta de spam

---

## ✅ CHECKLIST FINAL

- [ ] Gmail configurado con verificación en 2 pasos
- [ ] Contraseña de aplicación generada
- [ ] `.env` actualizado con credenciales
- [ ] Tabla `alert_subscriptions` creada en PostgreSQL
- [ ] `main.py` actualizado con funciones nuevas
- [ ] `check_email_config.py` muestra ✅ todo OK
- [ ] `test_email_send.py` envía correo exitosamente
- [ ] Frontend permite suscribirse
- [ ] Correo de bienvenida se recibe
- [ ] Alerta de prueba se envía

---

**¿Listo?** ¡Sigue los pasos en orden y tendrás un sistema completo de notificaciones en menos de 15 minutos! 🚀

**¿Problemas?** Lee `GUIA_NOTIFICACIONES_EMAIL.md` para más detalles o revisa los logs del servidor.
