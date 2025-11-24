# 🔧 SOLUCIÓN: SISTEMA NO FUNCIONA

## 🎯 DIAGNÓSTICO RÁPIDO

Ejecuta esto para ver qué está fallando:

```bash
cd backend
python diagnostico.py
```

Esto te dirá **exactamente** qué está mal.

---

## ✅ SOLUCIÓN RÁPIDA (SIN MONITOR)

El sistema funciona **SIN el monitor automático**. Usa solo 2 componentes:

### **Paso 1: Inicia Backend**

Abre PowerShell y ejecuta:
```powershell
cd C:\Users\moral\Documents\ProyectoResidencias\air-quality-project\air-quality-system\backend
python main.py
```

**Debe mostrar:**
```
INFO:     Uvicorn running on http://localhost:8000
✓ Servicio de email configurado: moralesmonterok@gmail.com
```

### **Paso 2: Inicia Frontend (EN OTRA POWERSHELL)**

```powershell
cd C:\Users\moral\Documents\ProyectoResidencias\air-quality-project\air-quality-system\frontend
npm run dev
```

**Debe mostrar:**
```
Local: http://localhost:5173/
```

### **Paso 3: Abre Navegador**
```
http://localhost:5173
```

---

## 🐛 ERRORES COMUNES Y SOLUCIONES

### Error 1: "ModuleNotFoundError"
```bash
cd backend
pip install -r requirements.txt
```

### Error 2: "Puerto 8000 ya en uso"
```powershell
# Encuentra el proceso
netstat -ano | findstr :8000

# Mata el proceso (reemplaza XXXX con el PID)
taskkill /PID XXXX /F
```

### Error 3: "Cannot connect to database"
```bash
# Verifica que PostgreSQL esté corriendo
# Abre "Servicios" de Windows y busca PostgreSQL
```

### Error 4: Frontend no carga
```bash
cd frontend
npm install
npm run dev
```

### Error 5: "Email service not configured"
```bash
# Verifica que backend/.env tenga:
EMAIL_HOST_USER=moralesmonterok@gmail.com
EMAIL_HOST_PASSWORD=vcfllefhzpjtgsdx
```

---

## 📋 CHECKLIST DE VERIFICACIÓN

- [ ] Python instalado: `python --version`
- [ ] Node.js instalado: `node --version`
- [ ] PostgreSQL corriendo
- [ ] Backend inicia sin errores
- [ ] Frontend inicia sin errores
- [ ] Navegador muestra dashboard
- [ ] Puedes suscribirte sin errores

---

## 🎯 ARCHIVOS QUE DEBEN EXISTIR

```
backend/
├── main.py              ✅ Necesario
├── email_service.py     ✅ Necesario
├── alert_system.py      ✅ Necesario
├── database.py          ✅ Necesario
├── models.py            ✅ Necesario
├── .env                 ✅ Necesario
├── auto_monitor.py      ❌ OPCIONAL (no lo uses por ahora)
└── diagnostico.py       ✅ Para verificar problemas

frontend/
├── src/
│   └── components/
│       └── AlertsAndPredictions.jsx  ✅ Necesario
└── package.json         ✅ Necesario
```

---

## 🔄 VOLVER AL ESTADO ORIGINAL

Si quieres volver exactamente a como estaba antes:

### Opción 1: No usar el monitor
- Simplemente NO ejecutes `auto_monitor.py`
- Solo usa `main.py` y el frontend
- El sistema funciona exactamente igual que antes

### Opción 2: Eliminar cambios del frontend
Si el frontend no funciona, puedo restaurar la versión anterior de `AlertsAndPredictions.jsx`

---

## 📞 SIGUIENTE PASO

**Prueba esto AHORA:**

1. Abre PowerShell
2. Ejecuta diagnóstico:
   ```powershell
   cd C:\Users\moral\Documents\ProyectoResidencias\air-quality-project\air-quality-system\backend
   python diagnostico.py
   ```
3. Copia y pega aquí el resultado completo
4. Con eso sabré exactamente qué está fallando

---

## 🎯 IMPORTANTE

**El monitor automático (auto_monitor.py) es COMPLETAMENTE OPCIONAL.**

El sistema funciona igual que antes con solo:
- ✅ Backend (main.py)
- ✅ Frontend (npm run dev)

**NO necesitas ejecutar auto_monitor.py para que funcione.**

---

**Ejecuta el diagnóstico y muéstrame qué sale para ayudarte mejor.** 🔍
