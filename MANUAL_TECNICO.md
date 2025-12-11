# Manual Técnico - Sistema de Monitoreo de Calidad del Aire
## Xalapa, Veracruz - REVIVE

**Versión:** 2.1.0
**Última actualización:** Diciembre 2025
**Autor:** Kevin Morales

---

## Tabla de Contenidos

1. [Descripción General](#1-descripción-general)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Tecnologías Utilizadas](#3-tecnologías-utilizadas)
4. [Fuentes de Datos](#4-fuentes-de-datos)
5. [Estructura del Proyecto](#5-estructura-del-proyecto)
6. [Configuración de Variables de Entorno](#6-configuración-de-variables-de-entorno)
7. [Despliegue en Producción](#7-despliegue-en-producción)
8. [Endpoints de la API](#8-endpoints-de-la-api)
9. [Base de Datos](#9-base-de-datos)
10. [Sistema de Alertas](#10-sistema-de-alertas)
11. [Mantenimiento](#11-mantenimiento)
12. [Escalabilidad](#12-escalabilidad)
13. [Solución de Problemas](#13-solución-de-problemas)
14. [Costos y Límites](#14-costos-y-límites)

---

## 1. Descripción General

### 1.1 Propósito
El Sistema de Monitoreo de Calidad del Aire es una aplicación web que proporciona información en tiempo real sobre los niveles de contaminantes atmosféricos en Xalapa, Veracruz, México.

### 1.2 Funcionalidades Principales
- **Dashboard en tiempo real**: Visualización de contaminantes (PM2.5, PM10, NO₂, O₃, CO)
- **Mapa interactivo**: Distribución de contaminación por zonas geográficas
- **Datos de tráfico**: Integración con TomTom para congestión vehicular
- **Sistema de alertas**: Notificaciones por email cuando hay mala calidad del aire
- **Datos históricos**: Consulta de hasta 1 año de datos pasados
- **Comparador de períodos**: Análisis de tendencias entre fechas
- **Reportes PDF**: Generación de informes descargables
- **Predicciones**: Tendencias esperadas usando patrones históricos

### 1.3 Usuarios Objetivo
- Ciudadanos de Xalapa interesados en la calidad del aire
- Investigadores y académicos
- Autoridades ambientales
- REVIVE (Red de Viveros de Biodiversidad)

---

## 2. Arquitectura del Sistema

### 2.1 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vercel)                        │
│                     https://air-quality.vercel.app               │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    React + Vite + Tailwind                   │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────────────┐   │ │
│  │  │Dashboard │  │ Alertas  │  │    Datos Históricos      │   │ │
│  │  └──────────┘  └──────────┘  └──────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────┘ │
└───────────────────────────────┬─────────────────────────────────┘
                                │ API REST (HTTPS)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND (Render)                         │
│                 https://air-quality-api.onrender.com             │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    FastAPI + Python 3.11                     │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │ │
│  │  │ Colectores   │  │   Sistema    │  │   Rate Limiter   │   │ │
│  │  │ de Datos     │  │   Alertas    │  │   + Validación   │   │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────┘ │
└───────────────────────────────┬─────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│   Supabase    │      │  Open-Meteo   │      │    TomTom     │
│  PostgreSQL   │      │   CAMS API    │      │  Traffic API  │
│   Database    │      │  (Gratuita)   │      │  (Freemium)   │
└───────────────┘      └───────────────┘      └───────────────┘
```

### 2.2 Flujo de Datos

1. **Usuario** accede al frontend en Vercel
2. **Frontend** hace peticiones REST al backend en Render
3. **Backend** consulta APIs externas (Open-Meteo, TomTom, OSM)
4. **Backend** almacena/recupera datos de Supabase (PostgreSQL)
5. **Backend** responde con datos procesados al frontend
6. **Frontend** renderiza visualizaciones y mapas

---

## 3. Tecnologías Utilizadas

### 3.1 Frontend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 18.x | Librería UI |
| Vite | 5.x | Build tool |
| Tailwind CSS | 3.x | Framework CSS |
| Recharts | 2.x | Gráficas |
| Leaflet | 1.9.x | Mapas interactivos |
| jsPDF | 2.x | Generación de PDFs |

### 3.2 Backend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Python | 3.11 | Lenguaje principal |
| FastAPI | 0.104+ | Framework API |
| SQLAlchemy | 2.x | ORM |
| Uvicorn | 0.24+ | Servidor ASGI |
| APScheduler | 3.x | Tareas programadas |
| Resend | 0.5+ | Envío de emails |

### 3.3 Infraestructura
| Servicio | Plan | Propósito |
|----------|------|-----------|
| Vercel | Free | Hosting frontend |
| Render | Free | Hosting backend |
| Supabase | Free | Base de datos PostgreSQL |

### 3.4 APIs Externas
| API | Costo | Propósito |
|-----|-------|-----------|
| Open-Meteo CAMS | Gratuita | Datos de contaminantes |
| TomTom Traffic | Freemium (2,500/día) | Datos de tráfico |
| OpenStreetMap | Gratuita | Análisis de infraestructura |
| Resend | Gratuita (100/día) | Envío de emails |

---

## 4. Fuentes de Datos

### 4.1 Open-Meteo (Calidad del Aire)

**URL Base:** `https://air-quality-api.open-meteo.com/v1/air-quality`

**Descripción:** Proporciona datos del modelo CAMS (Copernicus Atmosphere Monitoring Service), operado por ECMWF para la Unión Europea.

**Contaminantes disponibles:**
- PM2.5 (Partículas finas < 2.5µm)
- PM10 (Partículas < 10µm)
- NO₂ (Dióxido de nitrógeno)
- O₃ (Ozono)
- CO (Monóxido de carbono)

**Características:**
- Resolución espacial: ~40km
- Actualización: Cada hora
- Cobertura: Global
- Costo: Gratuito

**Ejemplo de uso:**
```python
params = {
    "latitude": 19.5438,
    "longitude": -96.9102,
    "hourly": ["pm10", "pm2_5", "nitrogen_dioxide", "ozone", "carbon_monoxide"],
    "timezone": "America/Mexico_City"
}
```

### 4.2 TomTom Traffic API

**URL Base:** `https://api.tomtom.com/traffic/services/`

**Descripción:** Proporciona datos de tráfico en tiempo real incluyendo velocidad actual, velocidad de flujo libre y nivel de congestión.

**Datos obtenidos:**
- Velocidad actual (km/h)
- Velocidad de flujo libre (km/h)
- Nivel de congestión (%)
- Tiempo de viaje

**Límites:**
- Plan gratuito: 2,500 requests/día
- Cada zona consume 1 request

### 4.3 OpenStreetMap (Overpass API)

**URL Base:** `https://overpass-api.de/api/interpreter`

**Descripción:** Proporciona datos de infraestructura vial para calcular factores de contaminación por zona.

**Datos consultados:**
- Carreteras principales (highway=primary)
- Carreteras secundarias (highway=secondary)
- Zonas industriales
- Estacionamientos

---

## 5. Estructura del Proyecto

```
air-quality-system/
├── backend/
│   ├── data_collectors/           # Colectores de datos externos
│   │   ├── __init__.py
│   │   ├── air_quality_collector.py   # Open-Meteo CAMS
│   │   └── traffic_collector.py       # TomTom Traffic
│   │
│   ├── estimator/                 # Modelos de estimación
│   │   ├── __init__.py
│   │   └── ml_pollution_estimator.py  # Estimador ML
│   │
│   ├── models/                    # Modelos ML (JSON)
│   │   ├── metadata.json
│   │   ├── pm25_model.json
│   │   ├── pm10_model.json
│   │   ├── no2_model.json
│   │   ├── o3_model.json
│   │   └── co_model.json
│   │
│   ├── repositories/              # Capa de acceso a datos
│   │   └── crud.py
│   │
│   ├── tests/                     # Pruebas unitarias
│   │   ├── conftest.py
│   │   ├── test_air_quality.py
│   │   ├── test_health.py
│   │   ├── test_subscriptions.py
│   │   └── test_validators.py
│   │
│   ├── cache/                     # Caché de datos OSM
│   │   └── osm_zones_cache.json
│   │
│   ├── main.py                    # Punto de entrada API
│   ├── database.py                # Configuración de BD
│   ├── models.py                  # Modelos SQLAlchemy
│   ├── alert_system.py            # Sistema de alertas
│   ├── alert_scheduler.py         # Scheduler de alertas
│   ├── email_service.py           # Servicio de emails
│   ├── historical_routes.py       # Rutas de datos históricos
│   ├── custom_email_validator.py  # Validador de emails
│   ├── rate_limiter.py            # Rate limiting
│   ├── osm_analyzer.py            # Análisis OSM
│   ├── osm_cache.py               # Caché OSM
│   ├── requirements.txt           # Dependencias Python
│   ├── render.yaml                # Configuración Render
│   └── pytest.ini                 # Configuración tests
│
├── frontend/
│   ├── src/
│   │   ├── components/            # Componentes React
│   │   │   ├── common/            # Componentes reutilizables
│   │   │   ├── dashboard/         # Componentes del dashboard
│   │   │   ├── alerts/            # Componentes de alertas
│   │   │   └── historical/        # Componentes históricos
│   │   │
│   │   ├── hooks/                 # Custom React Hooks
│   │   │   ├── useAirQuality.js
│   │   │   ├── useAlerts.js
│   │   │   ├── useHistoricalData.js
│   │   │   └── useWeather.js
│   │   │
│   │   ├── services/              # Servicios de API
│   │   │   └── api.js
│   │   │
│   │   ├── utils/                 # Utilidades
│   │   │   ├── constants.js
│   │   │   ├── reportGenerator.js
│   │   │   └── timeAgo.js
│   │   │
│   │   ├── assets/                # Imágenes
│   │   ├── App.jsx                # Componente raíz
│   │   ├── main.jsx               # Punto de entrada
│   │   └── index.css              # Estilos globales
│   │
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── vercel.json
│   └── .env.production
│
├── .env                           # Variables de entorno (no commitear)
├── .env.example                   # Plantilla de variables
├── .gitignore
├── README.md
├── LEEME.md
├── MANUAL_TECNICO.md              # Este documento
└── LIMPIAR_PROYECTO.md            # Lista de archivos a eliminar
```

---

## 6. Configuración de Variables de Entorno

### 6.1 Backend (.env)

```env
# Base de datos (Supabase)
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres

# Entorno
ENVIRONMENT=production

# APIs Externas
TOMTOM_API_KEY=tu_api_key_de_tomtom

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxx
EMAIL_FROM=Sistema Aire Xalapa <alertas@tudominio.com>

# CORS (dominios permitidos)
CORS_ORIGINS=https://tu-frontend.vercel.app,https://otro-dominio.com
```

### 6.2 Frontend (.env.production)

```env
# URL del backend en producción
VITE_API_URL=https://tu-backend.onrender.com

# Modo de entorno
VITE_ENV=production
```

### 6.3 Obtención de Credenciales

#### Supabase (Base de Datos)
1. Ir a [supabase.com](https://supabase.com)
2. Crear proyecto nuevo
3. En Settings > Database, copiar "Connection string (URI)"
4. Usar el modo "Session" para pooling

#### TomTom (Tráfico)
1. Ir a [developer.tomtom.com](https://developer.tomtom.com)
2. Crear cuenta y proyecto
3. Copiar API Key del dashboard

#### Resend (Emails)
1. Ir a [resend.com](https://resend.com)
2. Crear cuenta
3. Verificar dominio o usar dominio de prueba
4. Copiar API Key

---

## 7. Despliegue en Producción

### 7.1 Despliegue del Backend (Render)

1. **Crear cuenta en Render** ([render.com](https://render.com))

2. **Crear nuevo Web Service:**
   - Repository: Conectar repositorio de GitHub
   - Branch: `main` o `version-final-beta`
   - Root Directory: `backend`
   - Runtime: Python 3
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

3. **Configurar variables de entorno** en Render Dashboard:
   ```
   DATABASE_URL=postgresql://...
   ENVIRONMENT=production
   TOMTOM_API_KEY=...
   RESEND_API_KEY=...
   EMAIL_FROM=...
   CORS_ORIGINS=https://tu-frontend.vercel.app
   ```

4. **Verificar despliegue:**
   - Acceder a `https://tu-app.onrender.com/docs`
   - Verificar endpoint `/api/health`

### 7.2 Despliegue del Frontend (Vercel)

1. **Crear cuenta en Vercel** ([vercel.com](https://vercel.com))

2. **Importar proyecto:**
   - Repository: Conectar repositorio de GitHub
   - Framework Preset: Vite
   - Root Directory: `frontend`

3. **Configurar variables de entorno:**
   ```
   VITE_API_URL=https://tu-backend.onrender.com
   ```

4. **Verificar despliegue:**
   - Acceder al dominio asignado por Vercel
   - Verificar que el dashboard carga datos

### 7.3 Configuración de Base de Datos (Supabase)

1. **Crear proyecto en Supabase** ([supabase.com](https://supabase.com))

2. **Configurar pooling:**
   - Ir a Settings > Database > Connection Pooling
   - Usar modo "Session" para compatibilidad con SQLAlchemy
   - Copiar la URL de conexión

3. **Las tablas se crean automáticamente** al iniciar el backend

---

## 8. Endpoints de la API

### 8.1 Estado del Sistema

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/health` | Estado del sistema |
| GET | `/api/diagnostics` | Diagnóstico completo |
| GET | `/api/data-verification` | Verificar autenticidad de datos |
| GET | `/api/collector-status` | Estado del colector |
| GET | `/api/scheduler/status` | Estado del scheduler |

### 8.2 Calidad del Aire

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/air-quality` | Datos actuales de contaminantes |
| GET | `/api/air-quality/latest` | Últimas lecturas |
| GET | `/api/air-quality/by-zone` | Datos por zona geográfica |
| GET | `/api/air-quality/history` | Historial por rango de fechas |

### 8.3 Datos Históricos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/air-quality/historical` | Datos históricos con escala |
| GET | `/api/air-quality/historical/statistics` | Estadísticas del período |
| GET | `/api/air-quality/historical/hourly-pattern` | Patrón por hora del día |
| GET | `/api/comparison/flexible` | Comparar dos períodos |

**Parámetros de `/api/air-quality/historical`:**
- `start`: Fecha inicio (YYYY-MM-DD)
- `end`: Fecha fin (YYYY-MM-DD)
- `scale`: `hourly`, `daily`, o `monthly`

### 8.4 Tráfico y Clima

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/traffic` | Datos de tráfico en tiempo real |
| GET | `/api/weather` | Condiciones meteorológicas |

### 8.5 Alertas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/alerts/current` | Alerta actual |
| GET | `/api/alerts/history` | Historial de alertas |
| POST | `/api/alerts/subscribe` | Suscribirse a alertas |
| DELETE | `/api/alerts/unsubscribe/{email}` | Desuscribirse |
| GET | `/api/alerts/subscriptions` | Lista de suscripciones |

### 8.6 Predicciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/trends/expected` | Tendencias esperadas |
| GET | `/api/predictions` | Predicciones ML |

---

## 9. Base de Datos

### 9.1 Modelos de Datos

#### AirQualityReading
```sql
CREATE TABLE air_quality_readings (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    pm25 FLOAT,
    pm10 FLOAT,
    no2 FLOAT,
    o3 FLOAT,
    co FLOAT,
    source VARCHAR,
    raw_data JSONB
);
```

#### TrafficData
```sql
CREATE TABLE traffic_data (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    speed FLOAT,
    road_name VARCHAR,
    traffic_level VARCHAR,
    raw_data JSONB
);
```

#### AlertSubscription
```sql
CREATE TABLE alert_subscriptions (
    id SERIAL PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_notification_sent TIMESTAMP,
    notification_count INTEGER DEFAULT 0
);
```

### 9.2 Índices Recomendados

```sql
-- Para consultas por fecha
CREATE INDEX idx_air_quality_timestamp ON air_quality_readings(timestamp DESC);

-- Para consultas por email
CREATE INDEX idx_subscriptions_email ON alert_subscriptions(email);

-- Para consultas activas
CREATE INDEX idx_subscriptions_active ON alert_subscriptions(is_active) WHERE is_active = TRUE;
```

### 9.3 Mantenimiento de la Base de Datos

**Limpiar datos antiguos (>1 año):**
```sql
DELETE FROM air_quality_readings
WHERE timestamp < NOW() - INTERVAL '1 year';

DELETE FROM traffic_data
WHERE timestamp < NOW() - INTERVAL '1 year';
```

---

## 10. Sistema de Alertas

### 10.1 Funcionamiento

El sistema verifica automáticamente la calidad del aire cada 30 minutos:

1. **Scheduler** (`alert_scheduler.py`) ejecuta verificación cada 30 min
2. **Obtiene datos** frescos de Open-Meteo
3. **Evalúa** si PM2.5 supera 35.4 µg/m³ (nivel "Insalubre")
4. **Envía emails** a todos los suscriptores activos
5. **Registra** la notificación en la base de datos

### 10.2 Niveles de Alerta (PM2.5)

| Nivel | Rango µg/m³ | Color | Acción |
|-------|-------------|-------|--------|
| Bueno | 0-12 | Verde | Sin alerta |
| Moderado | 12.1-35.4 | Amarillo | Sin alerta |
| Insalubre (grupos sensibles) | 35.5-55.4 | Naranja | **Envía email** |
| Insalubre | 55.5-150.4 | Rojo | **Envía email** |
| Muy Insalubre | >150.4 | Morado | **Envía email** |

### 10.3 Configuración de Emails

El servicio usa **Resend** para envío de emails:

```python
# email_service.py
from resend import Resend

client = Resend(api_key=os.getenv('RESEND_API_KEY'))
```

**Tipos de emails enviados:**
- Bienvenida (al suscribirse)
- Alerta de calidad del aire
- Confirmación de desuscripción

---

## 11. Mantenimiento

### 11.1 Monitoreo del Sistema

**Endpoints de monitoreo:**
- `/api/health` - Estado básico
- `/api/diagnostics` - Diagnóstico completo
- `/api/scheduler/status` - Estado del scheduler
- `/api/rate-limit-stats` - Estadísticas de rate limiting

**Verificar en Render Dashboard:**
- Logs del servidor
- Métricas de CPU/Memoria
- Estado de la aplicación

### 11.2 Actualizaciones

**Actualizar dependencias del backend:**
```bash
cd backend
pip install --upgrade -r requirements.txt
```

**Actualizar dependencias del frontend:**
```bash
cd frontend
npm update
```

### 11.3 Respaldos

**Exportar datos de Supabase:**
1. Ir a Database > Backups en Supabase Dashboard
2. Descargar respaldo

**Restaurar respaldo:**
```bash
psql DATABASE_URL < backup.sql
```

### 11.4 Logs

**Ver logs en Render:**
1. Ir al Dashboard de Render
2. Seleccionar el servicio
3. Click en "Logs"

**Buscar errores comunes:**
```
# Errores de conexión a BD
"Connection pool exhausted"
"Database connection failed"

# Errores de APIs externas
"Open-Meteo API error"
"TomTom API error"

# Errores de email
"Resend API error"
```

---

## 12. Escalabilidad

### 12.1 Mejoras Futuras Recomendadas

#### Corto Plazo
- [ ] Agregar caché Redis para reducir llamadas a APIs
- [ ] Implementar WebSockets para actualizaciones en tiempo real
- [ ] Agregar más zonas de monitoreo

#### Mediano Plazo
- [ ] Migrar a plan pago de Supabase cuando se requiera
- [ ] Implementar autenticación de usuarios
- [ ] Agregar panel de administración

#### Largo Plazo
- [ ] Integrar con estaciones de monitoreo físicas
- [ ] Implementar modelo ML más sofisticado
- [ ] Expandir a otras ciudades

### 12.2 Límites Actuales

| Recurso | Límite Free | Acción al exceder |
|---------|-------------|-------------------|
| Supabase DB | 500MB | Limpiar datos antiguos |
| Supabase conexiones | 50 simultáneas | Optimizar pool |
| Render | 750h/mes | Se suspende temporalmente |
| TomTom API | 2,500/día | Reducir frecuencia |
| Resend | 100 emails/día | Limitar alertas |

### 12.3 Optimización del Pool de Conexiones

El sistema ya está optimizado para el plan gratuito de Supabase:

```python
# database.py - Configuración actual
engine = create_engine(
    DATABASE_URL,
    pool_size=2,         # Solo 2 conexiones en pool
    max_overflow=3,      # Máximo 3 adicionales
    pool_recycle=120,    # Reciclar cada 2 min
)
```

---

## 13. Solución de Problemas

### 13.1 Error: "Too many connections"

**Causa:** Se excedió el límite de conexiones de Supabase

**Solución:**
1. Verificar que `pool_size` sea bajo (2-3)
2. Reiniciar el servicio en Render
3. Verificar que no haya conexiones huérfanas

### 13.2 Error: "Open-Meteo API no responde"

**Causa:** API temporal no disponible

**Comportamiento:** El sistema usa datos de la base de datos local como fallback

**Solución:** Esperar 5-10 minutos, la API suele recuperarse

### 13.3 Error: "Emails no se envían"

**Verificar:**
1. `RESEND_API_KEY` está configurado
2. El dominio está verificado en Resend
3. No se excedió el límite diario (100 emails)

### 13.4 Error: "Frontend no conecta con Backend"

**Verificar:**
1. `VITE_API_URL` apunta al backend correcto
2. `CORS_ORIGINS` incluye el dominio del frontend
3. El backend está corriendo (verificar `/api/health`)

### 13.5 Datos no se actualizan

**Verificar:**
1. El scheduler está activo: `GET /api/scheduler/status`
2. El colector funciona: `GET /api/collector-status`
3. Los datos están llegando: `GET /api/data-verification`

---

## 14. Costos y Límites

### 14.1 Costos Actuales (Plan Gratuito)

| Servicio | Costo | Límites |
|----------|-------|---------|
| Vercel | $0 | 100GB bandwidth/mes |
| Render | $0 | 750h/mes, suspende tras inactividad |
| Supabase | $0 | 500MB DB, 50 conexiones |
| Open-Meteo | $0 | Sin límite |
| TomTom | $0 | 2,500 requests/día |
| Resend | $0 | 100 emails/día |
| **TOTAL** | **$0** | |

### 14.2 Costos Estimados (Planes Pagos)

Si el sistema necesita escalar:

| Servicio | Plan | Costo/mes |
|----------|------|-----------|
| Render Pro | Pro | $7 |
| Supabase Pro | Pro | $25 |
| Resend | Pro | $20 |
| **TOTAL** | | **~$52/mes** |

### 14.3 Recomendaciones de Escalamiento

1. **Primero escalar:** Supabase (más almacenamiento)
2. **Segundo:** Render (más recursos CPU/RAM)
3. **Tercero:** Resend (más emails si hay muchos suscriptores)

---

## Apéndice A: Comandos Útiles

### Desarrollo Local

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # o venv\Scripts\activate en Windows
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

### Pruebas

```bash
# Backend
cd backend
pytest

# Con cobertura
pytest --cov=. --cov-report=html
```

### Git

```bash
# Ver estado
git status

# Crear commit
git add .
git commit -m "descripción del cambio"

# Push a producción
git push origin main
```

---

## Apéndice B: Contacto y Soporte

- **Desarrollador:** Kevin Morales
- **Email:** [tu-email@ejemplo.com]
- **Repositorio:** [github.com/tu-usuario/air-quality-system]

---

*Documento generado automáticamente - Diciembre 2025*
