# 🚀 Guía de Despliegue - Sistema de Calidad del Aire

Esta guía te ayudará a desplegar el sistema en internet usando servicios gratuitos o de bajo costo.

---

## 📋 Opciones de Despliegue

| Componente | Opción Recomendada | Alternativas | Costo |
|------------|-------------------|--------------|-------|
| **Backend** | Railway | Render, Fly.io | Gratis (con límites) |
| **Frontend** | Vercel | Netlify, GitHub Pages | Gratis |
| **Base de datos** | Railway PostgreSQL | Supabase, ElephantSQL | Gratis (con límites) |

---

## 🔧 Opción 1: Railway (Backend) + Vercel (Frontend)

### Paso 1: Desplegar Backend en Railway

1. **Crear cuenta en Railway**
   - Ir a [railway.app](https://railway.app/)
   - Registrarse con GitHub

2. **Crear nuevo proyecto**
   - Click en "New Project"
   - Seleccionar "Deploy from GitHub repo"
   - Autorizar acceso a tu repositorio
   - Seleccionar `Sistema-de-Monitoreo-Atmosferico`

3. **Configurar el servicio**
   - Railway detectará automáticamente que es Python
   - En Settings → Root Directory: escribir `backend`
   - En Settings → Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

4. **Agregar PostgreSQL**
   - Click en "+ New"
   - Seleccionar "Database" → "PostgreSQL"
   - Esperar a que se aprovisione

5. **Configurar variables de entorno**
   - En el servicio del backend, ir a "Variables"
   - Agregar las siguientes:

   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   TOMTOM_API_KEY=tu_api_key_de_tomtom
   CORS_ORIGINS=https://tu-app.vercel.app
   ENVIRONMENT=production
   SECRET_KEY=una_clave_secreta_muy_larga_y_segura
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_HOST_USER=tu_correo@gmail.com
   EMAIL_HOST_PASSWORD=tu_contraseña_de_app
   EMAIL_FROM=Sistema Calidad Aire <tu_correo@gmail.com>
   EMAIL_USE_TLS=True
   ```

6. **Obtener URL del backend**
   - En Settings → Domains
   - Copiar la URL generada (ej: `https://tu-app.up.railway.app`)

7. **Verificar funcionamiento**
   - Abrir `https://tu-app.up.railway.app/api/health`
   - Debería mostrar `{"status": "ok"}`

---

### Paso 2: Desplegar Frontend en Vercel

1. **Crear cuenta en Vercel**
   - Ir a [vercel.com](https://vercel.com/)
   - Registrarse con GitHub

2. **Importar proyecto**
   - Click en "Add New..." → "Project"
   - Seleccionar tu repositorio

3. **Configurar el proyecto**
   - Framework Preset: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **Configurar variables de entorno**
   - En "Environment Variables" agregar:
   ```
   VITE_API_URL=https://tu-backend.up.railway.app
   ```
   (Usar la URL de Railway del paso anterior)

5. **Desplegar**
   - Click en "Deploy"
   - Esperar a que termine el build

6. **Obtener URL del frontend**
   - Una vez desplegado, Vercel te dará una URL
   - Ej: `https://tu-app.vercel.app`

---

### Paso 3: Actualizar CORS en Railway

1. Volver a Railway
2. En las variables de entorno del backend:
   - Actualizar `CORS_ORIGINS` con la URL exacta de Vercel
   ```
   CORS_ORIGINS=https://tu-app.vercel.app
   ```
3. El servicio se reiniciará automáticamente

---

## ✅ Verificación Final

1. **Abrir frontend:** `https://tu-app.vercel.app`
2. **Verificar que carga el mapa**
3. **Verificar que muestra datos de contaminación**
4. **Verificar pestaña de Alertas**
5. **Verificar generación de PDF**

---

## 🔄 Actualizaciones

Cada vez que hagas `git push` a tu repositorio:
- Railway re-desplegará automáticamente el backend
- Vercel re-desplegará automáticamente el frontend

---

## 🐛 Solución de Problemas

### Error: CORS blocked
- Verificar que `CORS_ORIGINS` en Railway tiene la URL exacta de Vercel
- No incluir `/` al final de la URL

### Error: Database connection failed
- Verificar que `DATABASE_URL` está correctamente configurada
- En Railway, usar la variable de referencia: `${{Postgres.DATABASE_URL}}`

### Error: API requests failing
- Verificar que `VITE_API_URL` en Vercel es correcta
- No incluir `/api` al final (el código ya lo agrega)

### Frontend no carga datos
- Abrir DevTools (F12) → Console
- Verificar que la URL de API es correcta
- Verificar que el backend está corriendo (visitar /api/health)

---

## 💰 Costos Estimados

### Plan Gratuito
- **Railway:** 500 horas/mes de ejecución, 1GB RAM, 1GB disco
- **Vercel:** Ilimitado para proyectos personales
- **Total:** $0/mes

### Si necesitas más recursos
- **Railway Pro:** $5/mes (incluye más horas y recursos)
- **Dominio propio:** ~$10/año

---

## 📝 Notas Adicionales

1. **Dominio personalizado:** Tanto Railway como Vercel permiten agregar dominios propios
2. **SSL/HTTPS:** Ambos servicios proporcionan certificados SSL automáticamente
3. **Logs:** Disponibles en el dashboard de cada servicio
4. **Escalado:** Railway y Vercel escalan automáticamente según demanda

---

## 🆘 Soporte

Si tienes problemas con el despliegue:
1. Revisar los logs en Railway/Vercel
2. Verificar las variables de entorno
3. Consultar la documentación oficial:
   - [Railway Docs](https://docs.railway.app/)
   - [Vercel Docs](https://vercel.com/docs)

---

*Última actualización: Diciembre 2025*
