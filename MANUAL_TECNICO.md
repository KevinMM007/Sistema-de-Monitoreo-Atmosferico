# Manual Tecnico - Sistema de Monitoreo de Calidad del Aire
## Xalapa, Veracruz - REVIVE

**Version:** 2.1.0
**Ultima actualizacion:** Mayo 2026
**Autor:** Kevin Morales

---

## Tabla de Contenidos

1. [Descripcion General](#1-descripcion-general)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Tecnologias Utilizadas](#3-tecnologias-utilizadas)
4. [Fuentes de Datos](#4-fuentes-de-datos)
5. [Estructura del Proyecto](#5-estructura-del-proyecto)
6. [Configuracion de Variables de Entorno](#6-configuracion-de-variables-de-entorno)
7. [Despliegue en Produccion](#7-despliegue-en-produccion)
8. [Endpoints de la API](#8-endpoints-de-la-api)
9. [Base de Datos](#9-base-de-datos)
10. [Sistema de Alertas](#10-sistema-de-alertas)
11. [Resiliencia y Tolerancia a Fallos](#11-resiliencia-y-tolerancia-a-fallos)
12. [Mantenimiento](#12-mantenimiento)
13. [Escalabilidad](#13-escalabilidad)
14. [Solucion de Problemas](#14-solucion-de-problemas)
15. [Costos y Limites](#15-costos-y-limites)

---

## 1. Descripcion General

### 1.1 Proposito
El Sistema de Monitoreo de Calidad del Aire es una aplicacion web que proporciona informacion en tiempo real sobre los niveles de contaminantes atmosfericos en Xalapa, Veracruz, Mexico, desagregados en cinco zonas geograficas mediante un modelo multiplicativo (factor OSM x factor de trafico) sobre los datos base de CAMS.

### 1.2 Funcionalidades Principales
- **Dashboard en tiempo real:** visualizacion de contaminantes (PM2.5, PM10, NO2, O3, CO).
- **Mapa interactivo:** distribucion de contaminacion por las cinco zonas (Centro, Norte, Sur, Este, Oeste).
- **Datos de trafico:** integracion con TomTom para nivel de congestion vehicular en tiempo real.
- **Sistema de alertas:** notificaciones por correo electronico cuando uno o mas contaminantes superan umbrales criticos.
- **Datos historicos:** consulta de hasta un ano de datos pasados con escalas horaria, diaria y mensual.
- **Comparador de periodos:** analisis de tendencias entre rangos de fechas.
- **Reportes PDF:** generacion de informes descargables desde el dashboard.
- **Predicciones ML:** tendencias esperadas usando patrones historicos y un modelo entrenable.

### 1.3 Usuarios Objetivo
- Ciudadanos de Xalapa interesados en la calidad del aire.
- Investigadores y academicos.
- Autoridades ambientales.
- REVIVE (Red de Viveros de Biodiversidad).

---

## 2. Arquitectura del Sistema

### 2.1 Diagrama de Arquitectura

```
+------------------------------------------------------------------+
|                       FRONTEND (Vercel)                          |
|              https://calidad-aire-xalapa.vercel.app              |
|  +-------------------------------------------------------------+ |
|  |                  React + Vite + Tailwind                    | |
|  |  +----------+  +----------+  +------------------------+     | |
|  |  |Dashboard |  | Alertas  |  |  Datos Historicos      |     | |
|  |  +----------+  +----------+  +------------------------+     | |
|  +-------------------------------------------------------------+ |
+--------------------------------+---------------------------------+
                                 | API REST (HTTPS)
                                 v
+------------------------------------------------------------------+
|                        BACKEND (Render)                          |
|         https://air-quality-xalapa-api.onrender.com              |
|  +-------------------------------------------------------------+ |
|  |                  FastAPI + Python 3.11                      | |
|  |  +-------------+  +-------------+  +------------------+     | |
|  |  | Colectores  |  |   Sistema   |  |   Rate Limiter   |     | |
|  |  | de Datos    |  |   Alertas   |  |   + Validacion   |     | |
|  |  +-------------+  +-------------+  +------------------+     | |
|  +-------------------------------------------------------------+ |
+--------------+-------------------+----------------+--------------+
               |                   |                |
               v                   v                v
       +---------------+   +---------------+   +-----------+
       |   Supabase    |   |  Open-Meteo   |   |  TomTom   |
       |  PostgreSQL   |   |  CAMS + Wx    |   |  Traffic  |
       +---------------+   +---------------+   +-----------+
                                   |
                                   v (fallback)
                              +---------+
                              | wttr.in |
                              +---------+
```

### 2.2 Flujo de Datos

1. **Usuario** accede al frontend en Vercel.
2. **Frontend** hace peticiones REST al backend en Render.
3. **Backend** consulta APIs externas (Open-Meteo, TomTom, OpenStreetMap, wttr.in cuando aplica) y persiste lecturas en Supabase.
4. **Backend** aplica el modelo multiplicativo (factor OSM x factor de trafico) y entrega las estimaciones por zona.
5. **Frontend** renderiza visualizaciones, mapa y graficas.
6. **Scheduler interno** evalua cada 30 minutos los contaminantes contra umbrales y dispara correos via SMTP si corresponde.

---

## 3. Tecnologias Utilizadas

### 3.1 Frontend
| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| React | 18.x | Libreria UI |
| Vite | 5.x | Build tool |
| Tailwind CSS | 3.x | Framework CSS |
| Recharts / Chart.js | 2.x / 4.x | Graficas |
| Leaflet | 1.9.x | Mapas interactivos sobre OpenStreetMap |
| jsPDF + html2canvas | 2.x / 1.x | Generacion de PDF lado cliente |

### 3.2 Backend
| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| Python | 3.11 | Lenguaje principal |
| FastAPI | 0.115+ | Framework API |
| SQLAlchemy | 2.x | ORM |
| psycopg2 | 2.9+ | Driver PostgreSQL |
| Uvicorn / Gunicorn | 0.24+ / 21+ | Servidor ASGI / supervisor en produccion |
| APScheduler | 3.x | Tareas programadas (alertas) |
| smtplib (stdlib) | - | Envio de correos por SMTP autenticado |
| scikit-learn | 1.x | Modelo ML para predicciones |
| requests | 2.x | Cliente HTTP para APIs externas |

### 3.3 Infraestructura
| Servicio | Plan | Proposito |
|----------|------|-----------|
| Vercel | Free | Hosting frontend |
| Render | Free | Hosting backend (web service) |
| Supabase | Free | PostgreSQL administrado |
| UptimeRobot | Free | Healthcheck periodico para evitar pausa por inactividad |

### 3.4 APIs Externas
| API | Costo | Proposito |
|-----|-------|-----------|
| Open-Meteo Air Quality (CAMS) | Gratuita, sin API key | Contaminantes atmosfericos |
| Open-Meteo Forecast | Gratuita, sin API key | Datos meteorologicos (primario) |
| wttr.in | Gratuita, sin API key | Datos meteorologicos (secundario, fallback) |
| TomTom Traffic Flow | Freemium - 2,500 req/dia | Nivel de congestion vehicular |
| Overpass API (OpenStreetMap) | Gratuita, sin API key | Analisis de infraestructura urbana |

---

## 4. Fuentes de Datos

### 4.1 Open-Meteo - Calidad del Aire (CAMS)

**URL base:** `https://air-quality-api.open-meteo.com/v1/air-quality`

**Descripcion:** expone los productos del modelo CAMS (Copernicus Atmosphere Monitoring Service) operado por ECMWF.

**Contaminantes disponibles:**
- PM2.5 (particulas finas < 2.5 micras)
- PM10 (particulas < 10 micras)
- NO2 (dioxido de nitrogeno)
- O3 (ozono)
- CO (monoxido de carbono)

**Caracteristicas:**
- Resolucion espacial: ~40 km por celda (producto global).
- Actualizacion: cada hora.
- Cobertura: global.
- Costo: gratuito, sin API key.

**Ejemplo de uso:**

```python
params = {
    "latitude": 19.5438,
    "longitude": -96.9102,
    "hourly": ["pm10", "pm2_5", "nitrogen_dioxide", "ozone", "carbon_monoxide"],
    "timezone": "America/Mexico_City"
}
```

### 4.2 Open-Meteo - Datos Meteorologicos (Primario)

**URL base:** `https://api.open-meteo.com/v1/forecast`

**Variables:** `temperature_2m`, `relative_humidity_2m`, `wind_speed_10m`, `cloud_cover`.

### 4.3 wttr.in - Datos Meteorologicos (Secundario / Fallback)

**URL base:** `https://wttr.in/<lat>,<lon>?format=j1`

**Descripcion:** servicio publico de pronostico que devuelve JSON estructurado sin requerir autenticacion. Se invoca exclusivamente cuando Open-Meteo Forecast responde con error (tipicamente HTTP 429 por rate-limit compartido en la IP del free tier de Render).

**Campos consumidos:** `current_condition[0].temp_C`, `humidity`, `windspeedKmph`, `cloudcover`.

### 4.4 TomTom Traffic Flow

**URL base:** `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json`

**Datos obtenidos:**
- Velocidad actual (km/h)
- Velocidad de flujo libre (km/h)
- Tiempo de viaje
- Nivel de congestion calculado como `1 - currentSpeed / freeFlowSpeed`

**Limites:**
- Plan gratuito: 2,500 solicitudes / dia.
- Cada zona consume una solicitud por ciclo.

### 4.5 OpenStreetMap - Overpass API

**URL base:** `https://overpass-api.de/api/interpreter`

**Descripcion:** proporciona datos de infraestructura vial, uso de suelo y POIs para calcular el factor de modulacion zonal.

**Tipos de consulta por zona:**
- `highway=*` (excluyendo senderos peatonales y ciclovias) - red vial.
- `landuse=*` - usos de suelo (comercial, industrial, residencial, areas verdes).
- POIs generadores de trafico - escuelas, hospitales, estacionamientos, supermercados, etc.

**Resiliencia:** cache local de 30 dias + archivo seed `backend/osm_zones_seed.json` versionado en el repo como ultimo recurso.

---

## 5. Estructura del Proyecto

```
air-quality-system/
+- backend/
|  +- data_collectors/                # Colectores de fuentes externas
|  |  +- __init__.py
|  |  +- air_quality_collector.py     # Open-Meteo CAMS + weather + wttr.in
|  |  +- traffic_collector.py         # TomTom Traffic
|  |
|  +- repositories/                   # Capa CRUD sobre SQLAlchemy
|  |  +- crud.py
|  |
|  +- scripts/                        # Utilidades operativas
|  |  +- populate_osm_seed.py         # Genera osm_zones_seed.json
|  |
|  +- tests/                          # Pruebas con pytest
|  |  +- conftest.py
|  |  +- test_air_quality.py
|  |  +- test_health.py
|  |  +- test_subscriptions.py
|  |  +- test_validators.py
|  |
|  +- cache/
|  |  +- osm_zones_cache.json         # Cache de Overpass (TTL 30 dias)
|  |
|  +- main.py                         # FastAPI app + endpoints REST
|  +- database.py                     # Engine SQLAlchemy + get_db
|  +- models.py                       # Modelos ORM (5 tablas)
|  +- init_db.py                      # Inicializacion de esquema
|  +- alert_system.py                 # Logica de evaluacion de alertas
|  +- alert_scheduler.py              # APScheduler para alertas periodicas
|  +- email_service.py                # Envio SMTP con smtplib
|  +- historical_routes.py            # Endpoints /api/air-quality/historical
|  +- custom_email_validator.py       # Validacion robusta de emails
|  +- rate_limiter.py                 # Rate limiting middleware
|  +- osm_analyzer_optimized.py       # Analizador OSM en uso (con circuit breaker)
|  +- osm_analyzer.py                 # Version anterior (no se importa)
|  +- osm_cache.py                    # Gestion del cache OSM y seed
|  +- osm_zones_seed.json             # Seed pre-poblado de OSM (fallback)
|  +- requirements.txt
|  +- render.yaml                     # Deploy declarativo en Render
|  +- pytest.ini
|
+- frontend/
|  +- src/
|  |  +- components/                  # Componentes React
|  |  |  +- common/
|  |  |  +- dashboard/
|  |  |  +- alerts/
|  |  |  +- historical/
|  |  +- hooks/                       # Custom hooks
|  |  |  +- useAirQuality.js
|  |  |  +- useAlerts.js
|  |  |  +- useHistoricalData.js
|  |  |  +- useWeather.js
|  |  +- services/api.js
|  |  +- utils/
|  |  +- App.jsx
|  |  +- main.jsx
|  +- public/
|  +- package.json
|  +- vite.config.js
|  +- tailwind.config.js
|  +- vercel.json
|  +- .env.production
|
+- .env                                # Variables de entorno locales (gitignored)
+- .env.example                        # Plantilla de variables
+- .gitignore
+- README.md
+- GUIA_VERIFICACION_DATOS.md          # Guia para verificar autenticidad de datos
+- MANUAL_TECNICO.md                   # Este documento
```

---

## 6. Configuracion de Variables de Entorno

### 6.1 Backend (.env)

Solo se listan las variables que el codigo realmente lee. Para la plantilla completa con descripciones consultar `.env.example`.

```env
# Base de datos (Supabase pooler en produccion)
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-1-us-east-1.pooler.supabase.com:5432/postgres

# Entorno
ENVIRONMENT=production
DISPLAY_TIMEZONE=America/Mexico_City
DASHBOARD_URL=https://calidad-aire-xalapa.vercel.app

# CORS
CORS_ORIGINS=https://calidad-aire-xalapa.vercel.app

# APIs externas
TOMTOM_API_KEY=<tu_api_key_de_tomtom>

# Email SMTP (Gmail con contrasena de aplicacion)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tu_correo@gmail.com
EMAIL_HOST_PASSWORD=<contrasena_de_aplicacion_de_16_caracteres>
EMAIL_FROM=Sistema de Calidad del Aire <tu_correo@gmail.com>

# Exportacion para tesis (opcional)
THESIS_EXPORT_TOKEN=<cadena_aleatoria_larga>
```

### 6.2 Frontend (.env.production)

```env
VITE_API_URL=https://air-quality-xalapa-api.onrender.com
VITE_ENV=production
```

### 6.3 Obtencion de credenciales

#### Supabase (Base de Datos)
1. Crear cuenta en [supabase.com](https://supabase.com) y un proyecto nuevo.
2. En Settings > Database > Connection String, copiar el URI del Connection Pooler en modo Session.
3. El sistema esta optimizado para `pool_size=2, max_overflow=3` que respeta el limite de conexiones del plan free.

#### TomTom (Trafico)
1. Crear cuenta en [developer.tomtom.com](https://developer.tomtom.com).
2. Crear un proyecto y copiar el API Key del dashboard.

#### Gmail (Email)
1. Activar verificacion en dos pasos en la cuenta de Google.
2. Generar una "Contrasena de aplicacion" en Settings > Security > 2-Step Verification > App passwords.
3. Usar esa contrasena de 16 caracteres en `EMAIL_HOST_PASSWORD`. **No** usar la contrasena normal de Gmail.

---

## 7. Despliegue en Produccion

### 7.1 Backend (Render)

1. **Crear Web Service en Render:**
   - Repository: GitHub `KevinMM007/Sistema-de-Monitoreo-Atmosferico`.
   - Branch: `main`.
   - Root Directory: `backend`.
   - Runtime: Python 3.
   - Build Command: `pip install -r requirements.txt`.
   - Start Command: `gunicorn main:app --workers 1 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 300 --graceful-timeout 300 --keep-alive 5`.

2. **Configurar variables de entorno** en Render Dashboard segun la lista de la seccion 6.1.

3. **Verificar despliegue:**
   - Acceder a `https://air-quality-xalapa-api.onrender.com/docs` (Swagger UI).
   - Probar `GET /api/health`. La respuesta debe incluir `database: up`.

### 7.2 Frontend (Vercel)

1. **Importar proyecto** en Vercel desde el mismo repositorio.
2. Framework Preset: **Vite**. Root Directory: `frontend`.
3. Configurar `VITE_API_URL` apuntando al backend en Render.
4. Verificar despliegue accediendo al dominio asignado por Vercel.

### 7.3 Base de Datos (Supabase)

1. Crear proyecto en Supabase.
2. Copiar el connection string del pooler en modo Session.
3. Las tablas se crean automaticamente al primer arranque mediante `models.py` y `init_db.py`.

### 7.4 Monitor Externo (UptimeRobot)

1. Crear cuenta gratuita en [uptimerobot.com](https://uptimerobot.com).
2. Anadir monitor HTTP(S) sobre `https://air-quality-xalapa-api.onrender.com/api/health`.
3. Metodo HEAD, intervalo de 5 minutos.

Esto evita que Render y Supabase pausen los servicios por inactividad, porque el endpoint `/api/health` ejecuta una consulta minima contra la base de datos en cada invocacion.

---

## 8. Endpoints de la API

El sistema expone 34 endpoints REST documentados en Swagger UI (`/docs`). Se listan agrupados por categoria.

### 8.1 Estado y Diagnostico
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET/HEAD | `/api/health` | Estado del sistema (incluye ping a BD) |
| GET | `/api/diagnostics` | Diagnostico extendido del colector |
| GET | `/api/data-verification` | Verificacion de autenticidad de datos |
| GET | `/api/collector-status` | Metricas del colector de Open-Meteo |
| GET | `/api/scheduler/status` | Estado del scheduler de alertas |
| GET | `/api/rate-limit-stats` | Estadisticas del rate limiter |
| GET | `/api/test-db` | Prueba de conectividad con la base de datos |

### 8.2 Calidad del Aire
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/air-quality` | Datos actuales de contaminantes |
| GET | `/api/air-quality/latest` | Ultima lectura registrada |
| GET | `/api/air-quality/by-zone` | Estimaciones por zona (modelo multiplicativo) |
| GET | `/api/air-quality/history` | Historial paginado |
| GET | `/api/air-quality/history/daily` | Agregado diario |
| GET | `/api/air-quality/historical` | Series historicas con escala configurable (en `historical_routes.py`) |

Parametros de `/api/air-quality/historical`:
- `start`: fecha inicio (YYYY-MM-DD).
- `end`: fecha fin (YYYY-MM-DD).
- `scale`: `hourly`, `daily` o `monthly`.

### 8.3 Comparacion
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/comparison/flexible` | Comparar dos rangos arbitrarios |
| GET | `/api/comparison/today-yesterday` | Comparativa rapida hoy vs ayer |

### 8.4 Trafico y Clima
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/traffic` | Estado del trafico en las cinco zonas |
| GET | `/api/weather` | Condiciones meteorologicas (cascada Open-Meteo / wttr.in / fallback) |

### 8.5 Alertas
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/alerts/current` | Alerta vigente |
| GET | `/api/alerts/history` | Historial de notificaciones enviadas |
| GET | `/api/alerts/daily-report` | Resumen diario |
| POST | `/api/alerts/subscribe` | Suscribirse |
| GET | `/api/alerts/subscription/{email}` | Estado de una suscripcion |
| GET | `/api/alerts/subscriptions` | Lista de suscripciones (uso administrativo) |
| DELETE | `/api/alerts/unsubscribe/{email}` | Desuscripcion con un clic |
| GET | `/api/alerts/unsubscribe-link` | Generacion del link firmado de desuscripcion |
| POST | `/api/alerts/trigger-now` | Disparar evaluacion manual de alertas |
| POST | `/api/alerts/test-email` | Enviar correo de prueba (uso interno) |

### 8.6 Predicciones y Modelo ML
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/trends/expected` | Tendencias esperadas a partir de la serie historica |
| GET | `/api/predictions` | Predicciones almacenadas |
| POST | `/api/ml/predict` | Inferencia puntual con el modelo entrenado |
| POST | `/api/ml/train` | Reentrenamiento del modelo |

### 8.7 Zonas y Analisis OSM
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/zones/osm-analysis` | Resultados del analizador OSM por zona |
| GET | `/api/quadrants/{quadrant_name}/stats` | Estadisticas de una zona |
| POST | `/api/quadrants/update-stats` | Actualizar estadisticas agregadas |

### 8.8 Exportacion Academica
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/thesis-export` | Volcado de datos para analisis academico (requiere `THESIS_EXPORT_TOKEN`) |

---

## 9. Base de Datos

### 9.1 Modelos de Datos

El esquema cuenta con cinco tablas declaradas en `models.py`.

#### air_quality_readings
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

#### traffic_data
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

#### quadrant_statistics
```sql
CREATE TABLE quadrant_statistics (
    id SERIAL PRIMARY KEY,
    quadrant_name VARCHAR NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    avg_pm25 FLOAT,
    avg_pm10 FLOAT,
    avg_no2 FLOAT,
    avg_o3 FLOAT,
    avg_co FLOAT,
    sample_count INTEGER
);
```

#### air_quality_predictions
```sql
CREATE TABLE air_quality_predictions (
    id SERIAL PRIMARY KEY,
    target_timestamp TIMESTAMP NOT NULL,
    pollutant VARCHAR NOT NULL,
    predicted_value FLOAT,
    confidence FLOAT,
    model_version VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### alert_subscriptions
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

### 9.2 Indices recomendados

```sql
CREATE INDEX idx_air_quality_timestamp ON air_quality_readings(timestamp DESC);
CREATE INDEX idx_subscriptions_email ON alert_subscriptions(email);
CREATE INDEX idx_subscriptions_active ON alert_subscriptions(is_active) WHERE is_active = TRUE;
```

### 9.3 Mantenimiento

Limpiar datos antiguos (>1 ano):

```sql
DELETE FROM air_quality_readings WHERE timestamp < NOW() - INTERVAL '1 year';
DELETE FROM traffic_data WHERE timestamp < NOW() - INTERVAL '1 year';
```

---

## 10. Sistema de Alertas

### 10.1 Funcionamiento

El componente `alert_scheduler.py` ejecuta el evaluador cada **30 minutos** mediante APScheduler. El flujo es:

1. **Obtencion de lecturas frescas** mediante `air_quality_collector.get_air_quality_data()`.
2. **Evaluacion contra umbrales hibridos** que combinan el AQI y los limites de la OMS 2021 para cada contaminante.
3. **Identificacion de suscriptores activos** en `alert_subscriptions`.
4. **Envio de correos** via SMTP autenticado a Gmail, usando `email_service.py` (basado en `smtplib` de la biblioteca estandar).
5. **Registro** del envio en `last_notification_sent` y `notification_count` por suscriptor.

### 10.2 Niveles de Alerta (PM2.5 como referencia)

| Nivel | Rango µg/m³ | Color | Accion |
|-------|-------------|-------|--------|
| Bueno | 0 - 12 | Verde | Sin alerta |
| Moderado | 12.1 - 35.4 | Amarillo | Sin alerta |
| Insalubre (grupos sensibles) | 35.5 - 55.4 | Naranja | Envia correo |
| Insalubre | 55.5 - 150.4 | Rojo | Envia correo |
| Muy Insalubre | > 150.4 | Morado | Envia correo |

El evaluador real cubre los cinco contaminantes (PM2.5, PM10, NO2, O3, CO) con sus propios cortes y dispara la alerta si **al menos uno** excede su umbral.

### 10.3 Implementacion del Envio

El servicio usa SMTP autenticado contra Gmail:

```python
# email_service.py (resumen)
import smtplib, ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

with smtplib.SMTP(self.host, self.port) as server:
    server.starttls(context=ssl.create_default_context())
    server.login(self.user, self.password)
    server.send_message(msg)
```

**Tipos de correo enviados:**
- Bienvenida con verificacion al suscribirse.
- Alerta de calidad del aire (con tabla de contaminantes, hora local y enlaces al dashboard).
- Confirmacion de desuscripcion con un clic.

---

## 11. Resiliencia y Tolerancia a Fallos

El sistema adopta consistentemente un patron de degradacion gradual ante fallos de servicios externos. Cada fuente de datos cuenta con cache en memoria, fuente secundaria cuando es viable, y un fallback final con valores marcados como sinteticos.

### 11.1 Calidad del aire (Open-Meteo CAMS)
- Cache en memoria de 5 minutos.
- Recuperacion desde la base de datos local si la API falla.
- Datos generados como ultimo recurso, marcados con `is_real_data: false` y `is_fallback: true`.

### 11.2 Datos meteorologicos
Cascada de cinco niveles implementada en `air_quality_collector.get_weather_data()`:
1. Cache en memoria (<5 min).
2. Negative cache de 60 s post-error (evita martillar la API).
3. Open-Meteo Forecast (fuente primaria).
4. wttr.in (fuente secundaria si la primaria falla).
5. Fallback estatico con valores tipicos de Xalapa (18 grados C, 75 % humedad, 5 km/h, 60 % nubosidad).

El endpoint `/api/weather` **nunca devuelve 500**; siempre responde con datos razonables y el campo `is_real_data` indica si proceden de una fuente real.

### 11.3 Infraestructura urbana (OpenStreetMap)
- Cache local de 30 dias.
- Circuit breaker que aisla a Overpass en periodos de degradacion.
- Llamadas externas ejecutadas en `asyncio.to_thread` para no bloquear el event loop de FastAPI.
- Archivo seed `osm_zones_seed.json` versionado en el repo como fallback permanente.

### 11.4 Healthcheck activo
`/api/health` ejecuta una consulta trivial (`SELECT 1`) contra la base de datos en cada invocacion. Combinado con un monitor externo de UptimeRobot pegando cada 5 minutos, este endpoint cumple dos funciones:
- Detecta caidas de la base de datos (no solo del API) y dispara la alerta del monitor.
- Genera actividad periodica suficiente para que Supabase no pause el proyecto en su plan free.

---

## 12. Mantenimiento

### 12.1 Monitoreo

**Endpoints de salud:**
- `/api/health` - estado basico + ping a BD.
- `/api/diagnostics` - diagnostico extendido.
- `/api/scheduler/status` - estado del scheduler de alertas.
- `/api/rate-limit-stats` - estadisticas del rate limiter.

**Monitoreo externo:**
- UptimeRobot consultando `/api/health` cada 5 minutos.
- Logs y metricas en Render Dashboard.

### 12.2 Actualizaciones

Backend:
```bash
cd backend
pip install --upgrade -r requirements.txt
```

Frontend:
```bash
cd frontend
npm update
```

### 12.3 Respaldos

**Exportar datos de Supabase:** Database > Backups en el Dashboard de Supabase.

**Restaurar:** `psql DATABASE_URL < backup.sql`.

### 12.4 Logs

Acceso a logs en Render Dashboard > el servicio > Logs.

Errores comunes a buscar:
```
# Conexion a BD
"Connection pool exhausted"
"connection to server at ... failed"

# APIs externas
"Error en la peticion meteorologica: 429"
"Open-Meteo API error"
"TomTom API error"

# Email
"smtplib.SMTPAuthenticationError"
```

---

## 13. Escalabilidad

### 13.1 Mejoras futuras recomendadas

**Corto plazo**
- Materializar la vista de tendencias (`/api/trends/expected`) en una tabla auxiliar actualizada por el scheduler para reducir el P50 actual de ~3 s.
- Segmentar el bundle del frontend con `manualChunks` para separar Leaflet y Chart.js del paquete principal.
- Persistir el factor de trafico en `traffic_data` en cada invocacion de `/api/air-quality/by-zone`.

**Mediano plazo**
- Calibrar el factor OSM contra mediciones de estaciones de referencia (Universidad Veracruzana, SEMARNAT, sensores tipo PurpleAir).
- Implementar autenticacion de usuarios y un panel de administracion.

**Largo plazo**
- Integrar con estaciones de monitoreo fisicas si llegan a instalarse en Xalapa.
- Expandir el sistema a otras ciudades intermedias replicando la metodologia.

### 13.2 Limites actuales (plan free)

| Recurso | Limite | Accion al exceder |
|---------|--------|-------------------|
| Supabase DB | 500 MB | Limpiar datos antiguos |
| Supabase conexiones | 60 simultaneas (pooler) | Pool ya optimizado a 2+3 |
| Render | 750 h/mes | Suspende temporalmente |
| TomTom API | 2,500 req/dia | Reducir frecuencia |
| Open-Meteo (IP) | ~10,000 req/dia compartidas | Cascada a wttr.in absorbe el 429 |

### 13.3 Configuracion del pool de conexiones

```python
# database.py - Configuracion actual
engine = create_engine(
    DATABASE_URL,
    pool_size=2,
    max_overflow=3,
    pool_recycle=120,
)
```

---

## 14. Solucion de Problemas

### 14.1 "Too many connections" / pool exhausted
- Verificar que `pool_size` y `max_overflow` esten bajos.
- Reiniciar el servicio en Render.

### 14.2 Dashboard muestra "No hay datos meteorologicos"
- Revisar logs por `Error en la peticion meteorologica: 429`. Si wttr.in tambien fallo en ese momento, el sistema sirve fallback estatico hasta que alguna fuente responda.
- Confirmar que `air_quality_collector.py` esta en la version que incluye `_try_wttr_in`.

### 14.3 Supabase pausado por inactividad
- Restaurar el proyecto manualmente desde el dashboard de Supabase.
- Verificar que UptimeRobot esta consultando `/api/health` y que ese endpoint ejecuta `SELECT 1`.

### 14.4 No se envian correos de alerta
- Validar que `EMAIL_HOST_PASSWORD` sea una contrasena de aplicacion de Gmail (16 caracteres), no la contrasena normal.
- Revisar que el correo origen (`EMAIL_HOST_USER`) tenga verificacion en dos pasos activada.
- Buscar `SMTPAuthenticationError` en los logs.

### 14.5 Frontend no conecta con backend
- Verificar que `VITE_API_URL` apunte a `https://air-quality-xalapa-api.onrender.com`.
- Verificar que `CORS_ORIGINS` incluya el dominio del frontend.
- Probar `GET /api/health` directamente para descartar que el backend este caido.

### 14.6 Datos no se actualizan
- `GET /api/scheduler/status` para confirmar que el scheduler esta activo.
- `GET /api/collector-status` para revisar metricas del colector.
- `GET /api/data-verification` para confirmar que se reciben datos reales.

---

## 15. Costos y Limites

### 15.1 Costos actuales (plan free)

| Servicio | Costo | Limites |
|----------|-------|---------|
| Vercel | $0 | 100 GB bandwidth / mes |
| Render | $0 | 750 h / mes, suspende tras inactividad |
| Supabase | $0 | 500 MB DB, ~60 conexiones |
| Open-Meteo | $0 | ~10,000 req / dia por IP (compartida) |
| wttr.in | $0 | Sin limite documentado |
| TomTom | $0 | 2,500 req / dia |
| Gmail SMTP | $0 | ~500 correos / dia (limite informal de Gmail) |
| UptimeRobot | $0 | 50 monitores, intervalo minimo 5 min |
| **TOTAL** | **$0** | |

### 15.2 Costos estimados con escalamiento (referencial)

| Servicio | Plan | Costo / mes |
|----------|------|-------------|
| Render Pro | Pro | $7 |
| Supabase Pro | Pro | $25 |
| TomTom (paquete adicional) | - | variable |
| **TOTAL** | | **~$32 - $50** |

### 15.3 Recomendaciones de escalamiento

1. **Primero** escalar Supabase si la base supera 500 MB.
2. **Segundo** escalar Render si se requiere mas CPU/RAM o eliminar la suspension por inactividad.
3. **Tercero** considerar un dominio propio y un proveedor SMTP transaccional (Mailgun, Postmark) si los volumenes de correo crecen.

---

## Apendice A: Comandos Utiles

### Desarrollo local

```bash
# Backend
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

### Pruebas

```bash
cd backend
pytest

# Con cobertura
pytest --cov=. --cov-report=html
```

### Git

```bash
git status
git add .
git commit -m "descripcion del cambio"
git push origin main
```

---

## Apendice B: Contacto y Soporte

- **Desarrollador:** Kevin Morales
- **Email:** moralesmonterok@gmail.com
- **Repositorio:** https://github.com/KevinMM007/Sistema-de-Monitoreo-Atmosferico
- **Dashboard publico:** https://calidad-aire-xalapa.vercel.app
- **API publica:** https://air-quality-xalapa-api.onrender.com

---

*Sistema de Monitoreo de Calidad del Aire - Xalapa, Veracruz - Mayo 2026*
