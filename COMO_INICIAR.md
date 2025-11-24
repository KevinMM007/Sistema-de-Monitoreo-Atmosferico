# 🚀 GUÍA DE INICIO DEL SISTEMA

## ⚠️ PROBLEMA CON INICIAR_SISTEMA.bat?

Si el archivo `.bat` no funciona, usa una de estas opciones:

---

## ✅ OPCIÓN 1: Scripts Separados (MÁS FÁCIL)

He creado 3 archivos `.bat` separados. **Haz doble click en cada uno** (en orden):

### 1. Doble click en: `1-BACKEND.bat`
- Abrirá una ventana negra
- Debe mostrar: "Uvicorn running on http://localhost:8000"
- ✅ Déjala abierta

### 2. Doble click en: `2-MONITOR.bat`
- Abrirá otra ventana negra
- Debe mostrar: "🚀 MONITOR DE CALIDAD DEL AIRE"
- ✅ Déjala abierta

### 3. Doble click en: `3-FRONTEND.bat`
- Abrirá una tercera ventana
- Debe mostrar: "Local: http://localhost:5173"
- ✅ Déjala abierta

### 4. Abre tu navegador:
```
http://localhost:5173
```

---

## ✅ OPCIÓN 2: Desde PowerShell/CMD

Abre **PowerShell** (no CMD) y ejecuta:

```powershell
# Ve al directorio del proyecto
cd C:\Users\moral\Documents\ProyectoResidencias\air-quality-project\air-quality-system

# Inicia los 3 componentes en ventanas separadas
start powershell -NoExit -Command "cd backend; python main.py"
start powershell -NoExit -Command "cd backend; python auto_monitor.py"
start powershell -NoExit -Command "cd frontend; npm run dev"
```

---

## ✅ OPCIÓN 3: Manual (3 Terminales)

La forma más confiable:

### Terminal 1 (PowerShell):
```powershell
cd C:\Users\moral\Documents\ProyectoResidencias\air-quality-project\air-quality-system\backend
python main.py
```

### Terminal 2 (PowerShell):
```powershell
cd C:\Users\moral\Documents\ProyectoResidencias\air-quality-project\air-quality-system\backend
python auto_monitor.py
```

### Terminal 3 (PowerShell):
```powershell
cd C:\Users\moral\Documents\ProyectoResidencias\air-quality-project\air-quality-system\frontend
npm run dev
```

---

## 🔧 TROUBLESHOOTING

### Problema: "Python no encontrado"
```bash
# Verifica que Python esté instalado
python --version

# Si no funciona, intenta:
py --version
```

### Problema: "npm no encontrado"
```bash
# Verifica que Node.js esté instalado
node --version
npm --version
```

### Problema: "Puerto ya en uso"
**Error:** `Address already in use: 8000`

**Solución:**
```powershell
# Encuentra y mata el proceso
netstat -ano | findstr :8000
taskkill /PID [número_del_PID] /F
```

### Problema: "ModuleNotFoundError"
```bash
cd backend
pip install -r requirements.txt
```

### Problema: Frontend no inicia
```bash
cd frontend
npm install
npm run dev
```

---

## 📝 QUÉ DEBE APARECER EN CADA VENTANA

### Ventana 1 - Backend:
```
INFO:     Uvicorn running on http://localhost:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
✓ Servicio de email configurado: moralesmonterok@gmail.com
✓ Cargadas X suscripciones activas
```

### Ventana 2 - Monitor:
```
================================================================================
🚀 MONITOR DE CALIDAD DEL AIRE - INICIANDO
================================================================================
⏱️  Intervalo de verificación: 60 minutos
⏱️  Cooldown entre alertas: 60 minutos
📧 Sistema de correos: Configurado
================================================================================

🧪 Ejecutando verificación inicial...
```

### Ventana 3 - Frontend:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

---

## ✅ VERIFICAR QUE TODO FUNCIONA

### 1. Backend (puerto 8000):
Abre en tu navegador:
```
http://localhost:8000/api/health
```
Debe mostrar: `{"status":"ok",...}`

### 2. Frontend (puerto 5173):
Abre en tu navegador:
```
http://localhost:5173
```
Debe mostrar tu dashboard

### 3. Monitor:
Observa la ventana del monitor, debe mostrar logs cada hora

---

## 🎯 RESUMEN RÁPIDO

**Método más simple:**
1. Doble click en `1-BACKEND.bat`
2. Doble click en `2-MONITOR.bat`
3. Doble click en `3-FRONTEND.bat`
4. Abre `http://localhost:5173`

**Si los .bat no funcionan:**
- Abre PowerShell
- Copia y pega los comandos de la "OPCIÓN 3"

---

## 🛑 DETENER EL SISTEMA

Para detener todo:
1. En cada ventana, presiona `CTRL + C`
2. O simplemente cierra las 3 ventanas

---

## 📞 ¿AÚN NO FUNCIONA?

Si sigues teniendo problemas, mándame:
1. Captura de pantalla del error
2. Qué método intentaste usar
3. Qué sistema operativo tienes

---

**💡 TIP:** El método más confiable es usar 3 terminales PowerShell manualmente (Opción 3)
