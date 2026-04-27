# 🌫️ Sistema de Monitoreo de Calidad del Aire — Xalapa

> Plataforma full-stack para el monitoreo, análisis, predicción y alertamiento de la **calidad del aire** en la ciudad de Xalapa, Veracruz. Backend en Python/FastAPI con modelos de Machine Learning, dashboard interactivo en React, sistema de alertas por email y análisis de infraestructura vial vía OpenStreetMap.

<p>
  <img src="https://img.shields.io/badge/version-2.1.0-blue" alt="Version"/>
  <img src="https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/PostgreSQL-336791?logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/scikit--learn-F7931E?logo=scikitlearn&logoColor=white" alt="scikit-learn"/>
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/Leaflet-199900?logo=leaflet&logoColor=white" alt="Leaflet"/>
  <img src="https://img.shields.io/badge/Tailwind-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind"/>
  <img src="https://img.shields.io/badge/Tested%20with-pytest-0A9EDC?logo=pytest&logoColor=white" alt="pytest"/>
  <img src="https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render&logoColor=white" alt="Render"/>
</p>

> ⚠️ **Branch principal de desarrollo:** `main` (es la versión más actualizada del sistema).

---

## 📖 Acerca del proyecto

Sistema desarrollado para el monitoreo continuo de la **calidad del aire** en la ciudad de Xalapa, Veracruz. La ciudad se divide en **5 zonas geográficas** (Centro, Norte, Sur, Este, Oeste), y para cada una se recogen, almacenan, analizan y **predicen mediante modelos de Machine Learning** los principales contaminantes atmosféricos:

| Contaminante | Nombre | Unidad |
|---|---|---|
| **PM2.5** | Partículas finas | µg/m³ |
| **PM10** | Partículas gruesas | µg/m³ |
| **NO₂** | Dióxido de nitrógeno | µg/m³ |
| **O₃** | Ozono troposférico | µg/m³ |
| **CO** | Monóxido de carbono | mg/m³ |

La plataforma combina datos de **estaciones meteorológicas** (Open-Meteo CAMS), datos de **tráfico vehicular en tiempo real** (TomTom Traffic API) y **análisis de infraestructura vial** (OpenStreetMap vía Overpass API) para construir un panorama integral de los factores que afectan la calidad del aire en cada zona.

> 💡 **Niveles de alerta** alineados con los breakpoints del **AQI de la EPA (EE.UU.)** y los criterios de PM2.5/PM10 de la **NOM-025-SSA1-2021 (México)**.

---

## ✨ Características principales

### 📊 Dashboard y visualización
- Mapa interactivo de Xalapa con **React-Leaflet**, dividido en zonas con código de color por nivel de contaminación.
- Gráficas de líneas en tiempo real con **Recharts** para los 5 contaminantes.
- Vista de **datos históricos** con selector de rango y comparador de periodos.
- **Exportación de reportes a PDF** desde el dashboard.

### 🤖 Predicciones con Machine Learning
- **5 modelos ML entrenados** (uno por contaminante) usando scikit-learn.
- Features temporales (hora, día de semana, mes, fin de semana) + meteorológicas + factores por zona.
- Endpoints `/api/ml/train` y `/api/ml/predict` para reentrenamiento y predicción.
- Tendencias esperadas calculadas a partir de patrones históricos.

### 🔔 Sistema de alertas por email
- Suscripción/desuscripción por email con **token de un clic**.
- **Validador de email custom** (RFC 5321/5322, bloqueo de dominios temporales, sugerencias de typos).
- Reportes diarios automáticos vía **scheduler** integrado.
- Niveles de alerta: Bueno → Moderado → Insalubre (grupos sensibles) → Insalubre → Muy Insalubre → Peligroso.

### 🗺️ Análisis geoespacial
- Integración con **OpenStreetMap** vía Overpass API para análisis de densidad vial.
- Cálculo de factores de contaminación basados en infraestructura (autopistas, avenidas, residenciales).
- Cache de zonas OSM con seed de ~20k features para 5 zonas de Xalapa.

### 🛡️ Seguridad y robustez
- **Rate limiting** en 3 niveles (default 100/min, strict 5/min, moderate 30/min).
- CORS configurable por entorno.
- Variables de entorno separadas para desarrollo y producción.
- Fallback automático a datos sintéticos si las APIs externas fallan.

### 🧪 Testing y calidad
- Suite de tests con **pytest** + pytest-asyncio + httpx.
- Fixtures compartidas (DB SQLite en memoria para tests).
- Módulos de test: salud, calidad del aire, suscripciones, validadores, predicciones.

### 🚀 DevOps / Deployment
- Configuración de **Render.com** lista (`render.yaml`).
- Producción con **Gunicorn** + Uvicorn workers.
- Healthcheck endpoint configurado.

---

## 🧱 Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FUENTES DE DATOS EXTERNAS                        │
│  Open-Meteo CAMS  ·  TomTom Traffic  ·  OpenStreetMap (Overpass)    │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       BACKEND (FastAPI)                              │
│                                                                      │
│   data_collectors/  →  repositories/  →  models (SQLAlchemy)         │
│   ┌────────────┐      ┌──────────────┐                               │
│   │ AirQuality │      │ AirQuality   │   ┌────────────────────┐      │
│   │ Traffic    │  →   │ Traffic      │ → │  PostgreSQL        │      │
│   │            │      │ Quadrant     │   │  (psycopg2)        │      │
│   └────────────┘      │ Predictions  │   └────────────────────┘      │
│                       │ Subscribers  │                               │
│                       └──────────────┘                               │
│                                                                      │
│   estimator/ml_pollution_estimator.py                                │
│   ┌─────────────────────────────────────┐                            │
│   │  scikit-learn + joblib              │                            │
│   │  models/  pm25  pm10  no2  o3  co   │                            │
│   └─────────────────────────────────────┘                            │
│                                                                      │
│   alert_system.py  ·  alert_scheduler.py  ·  email_service.py        │
│   osm_analyzer.py  ·  rate_limiter.py  ·  custom_email_validator.py  │
│                                                                      │
│   FastAPI · CORS · Rate Limiting · Swagger /docs · ReDoc /redoc      │
└────────────────────────────────┬────────────────────────────────────┘
                                 │  HTTP / JSON
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   FRONTEND (React 18 + Vite 6)                       │
│                                                                      │
│   src/                                                               │
│   ├── services/api.js          ← capa centralizada de fetch          │
│   ├── hooks/                                                         │
│   │   useAirQuality · useAlerts · useComparison                      │
│   │   useHistoricalData · useMapVisibility · useWeather              │
│   ├── components/                                                    │
│   │   ├── dashboard/   PollutantChart · MapBoundsHandler · Zone…     │
│   │   ├── historical/  HistoricalChart · PeriodComparator …          │
│   │   ├── alerts/      CurrentStatusTab · NotificationsTab …         │
│   │   └── common/      Card · Button · Tabs · LoadingSpinner …       │
│   └── utils/  reportGenerator · timeAgo · constants                  │
│                                                                      │
│   React-Leaflet · Recharts · Tailwind · Heroicons · html2pdf         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Stack tecnológico

### Backend
| Categoría | Tecnología |
|---|---|
| **Lenguaje** | Python 3.11 |
| **Framework Web** | FastAPI 0.115.6 |
| **Servidor producción** | Gunicorn 21 + Uvicorn workers |
| **ORM** | SQLAlchemy 2.0 |
| **Base de Datos** | PostgreSQL (psycopg2-binary) |
| **Machine Learning** | scikit-learn 1.3 · joblib · pandas · numpy |
| **HTTP / async** | requests · aiohttp · httpx |
| **Visualización (server)** | matplotlib · seaborn · plotly |
| **Testing** | pytest · pytest-asyncio · httpx |
| **Configuración** | python-dotenv |

### Frontend
| Categoría | Tecnología |
|---|---|
| **Framework** | React 18 |
| **Bundler** | Vite 6 |
| **Estilos** | Tailwind CSS 3 |
| **Mapas** | React-Leaflet 4 + Leaflet 1.9 |
| **Gráficas** | Recharts |
| **Iconos** | Heroicons · Lucide-react |
| **UI** | Headless UI |
| **Export PDF** | html2pdf.js |

### Servicios externos
- 🌍 [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) — datos de contaminantes
- 🌦️ [Open-Meteo Weather API](https://open-meteo.com/en/docs) — datos meteorológicos
- 🚗 [TomTom Traffic API](https://developer.tomtom.com/) — datos de tráfico en tiempo real
- 🗺️ [OpenStreetMap (Overpass API)](https://overpass-api.de/) — análisis de infraestructura vial
- 📧 SMTP (Gmail) — envío de notificaciones

---

## 🌐 API Endpoints

La API expone **30+ endpoints** organizados con tags en Swagger. Categorías principales:

| Tag | Endpoints | Descripción |
|---|---|---|
| 🏥 **Estado del Sistema** | `/api/health` · `/api/test-db` · `/api/rate-limit-stats` · `/api/scheduler/status` | Healthchecks y diagnóstico interno |
| 🔧 **Diagnóstico** | `/api/diagnostics` · `/api/data-verification` · `/api/collector-status` | Estado de colectores y verificación de datos |
| 🌬️ **Calidad del Aire** | `/api/air-quality` · `/api/air-quality/latest` · `/api/air-quality/history` · `/api/air-quality/by-zone` | Datos de contaminantes (filtros, paginación, por zona) |
| 🗺️ **Zonas** | `/api/zones/osm-analysis` · `/api/quadrants/{name}/stats` · `/api/quadrants/update-stats` | Análisis y estadísticas por zona geográfica |
| 🚗 **Tráfico** | `/api/traffic` | Datos de tráfico vehicular (TomTom) |
| 📊 **Predicciones (ML)** | `/api/predictions` · `/api/ml/predict` · `/api/ml/train` · `/api/trends/expected` | Predicciones, entrenamiento y tendencias |
| 🔔 **Alertas** | `/api/alerts/current` · `/api/alerts/history` · `/api/alerts/subscribe` · `/api/alerts/unsubscribe-link` · `/api/alerts/test-email` · `/api/alerts/daily-report` | Sistema completo de suscripciones y alertas por email |
| 📈 **Comparaciones** | `/api/comparison/today-yesterday` · `/api/comparison/flexible` | Comparadores entre periodos |

> 📚 **Documentación interactiva** disponible mientras el backend corre:
> - **Swagger UI:** http://localhost:8000/docs
> - **ReDoc:** http://localhost:8000/redoc

---

## 🧠 Modelos de Machine Learning

El sistema entrena un modelo independiente por contaminante. Snapshot del último entrenamiento:

| Contaminante | Datos | Periodo | Media | Min | Max |
|---|---|---|---|---|---|
| PM2.5 | 336 | 168 h | 21.19 µg/m³ | 12.5 | 30.7 |
| PM10 | 336 | 168 h | 22.69 µg/m³ | 15.4 | 31.4 |
| NO₂ | 336 | 168 h | 9.19 µg/m³ | 0.9 | 23.7 |
| O₃ | 336 | 168 h | 68.71 µg/m³ | 27.0 | 99.0 |
| CO | 336 | 168 h | 0.26 mg/m³ | 0.15 | 0.514 |

**Features de entrada:** hora del día, día de la semana, mes, indicador de fin de semana, condiciones meteorológicas, zona geográfica.

**Reentrenamiento:** disponible vía endpoint `POST /api/ml/train`.

---

## 🚀 Instalación local

### Requisitos previos

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+ (o SQLite para pruebas locales)
- npm
- Git

### 1. Clonar el repositorio (rama `version-final-beta`)

```bash
git clone -b main https://github.com/KevinMM007/Sistema-de-Monitoreo-Atmosferico.git
cd Sistema-de-Monitoreo-Atmosferico
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales reales. Mínimo necesario:

```env
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/air_quality_xalapa
TOMTOM_API_KEY=tu_tomtom_api_key
SECRET_KEY=una_clave_secreta_segura
CORS_ORIGINS=http://localhost:5173

# Para alertas por email (Gmail con contraseña de aplicación):
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=tu_correo@gmail.com
EMAIL_HOST_PASSWORD=tu_app_password_de_gmail
EMAIL_FROM=Sistema de Calidad del Aire <tu_correo@gmail.com>
```

> 🔑 Consigue tu API key gratuita de TomTom en https://developer.tomtom.com/

### 3. Levantar el backend

```bash
cd backend

# Crear y activar entorno virtual
python -m venv venv
# Linux/Mac:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Inicializar la base de datos
python init_db.py

# Levantar el servidor (modo desarrollo)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API disponible en: **http://localhost:8000**
- Swagger docs: **http://localhost:8000/docs**
- ReDoc: **http://localhost:8000/redoc**

### 4. Levantar el frontend

En otra terminal:

```bash
cd frontend
npm install

# Crear .env local apuntando al backend
echo "VITE_API_URL=http://localhost:8000" > .env

npm run dev
```

Frontend disponible en: **http://localhost:5173**

### 5. Ejecutar tests

```bash
cd backend
pytest tests/ -v

# Con cobertura:
pip install pytest-cov
pytest tests/ --cov=. --cov-report=html
```

---

## 🌍 Despliegue en producción

El proyecto incluye configuración lista para **Render.com** (`backend/render.yaml`):

```bash
# Render detecta automáticamente render.yaml
# Solo necesitas conectar el repo y configurar las variables sensibles
```

Variables a configurar manualmente en el panel de Render:
- `DATABASE_URL` (Postgres de Render)
- `TOMTOM_API_KEY`
- `EMAIL_USER` y `EMAIL_PASSWORD`

Para producción se usa **Gunicorn** con workers de Uvicorn:

```bash
gunicorn main:app \
  --workers 1 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:$PORT \
  --timeout 300 \
  --keep-alive 5
```

---

## 📂 Estructura del proyecto

```
Sistema-de-Monitoreo-Atmosferico/    [branch: version-final-beta]
├── .env.example
├── README.md
├── MANUAL_TECNICO.md                 # Manual técnico completo (~26 KB)
├── GUIA_VERIFICACION_DATOS.md        # Guía de verificación de fuentes
│
├── backend/
│   ├── main.py                       # FastAPI app con 30+ endpoints
│   ├── models.py                     # Modelos SQLAlchemy
│   ├── database.py
│   ├── init_db.py                    # Inicialización de la BD
│   ├── render.yaml                   # Config de despliegue Render
│   ├── requirements.txt
│   ├── pytest.ini
│   │
│   ├── alert_system.py               # Lógica de niveles de alerta + AQI
│   ├── alert_scheduler.py            # Scheduler para alertas automáticas
│   ├── email_service.py              # Envío SMTP
│   ├── custom_email_validator.py     # Validador RFC + anti-temporales
│   ├── rate_limiter.py               # Rate limiting (3 niveles)
│   ├── historical_routes.py          # Routes para datos históricos
│   ├── osm_analyzer.py               # Análisis de OpenStreetMap
│   ├── osm_analyzer_optimized.py     # Versión optimizada del analyzer
│   ├── osm_cache.py                  # Cache de consultas OSM
│   ├── osm_zones_seed.json           # Seed con ~20k features de Xalapa
│   │
│   ├── data_collectors/
│   │   ├── air_quality_collector.py  # Open-Meteo CAMS
│   │   └── traffic_collector.py      # TomTom Traffic
│   │
│   ├── estimator/
│   │   └── ml_pollution_estimator.py # Estimador ML
│   │
│   ├── models/                       # Modelos ML serializados (JSON)
│   │   ├── pm25_model.json
│   │   ├── pm10_model.json
│   │   ├── no2_model.json
│   │   ├── o3_model.json
│   │   ├── co_model.json
│   │   └── metadata.json
│   │
│   ├── repositories/
│   │   └── crud.py                   # Lógica CRUD por entidad
│   │
│   ├── scripts/
│   │   └── populate_osm_seed.py      # Generación de seed OSM
│   │
│   └── tests/
│       ├── conftest.py               # Fixtures (SQLite en memoria)
│       ├── constants.py
│       └── README.md
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        │
        ├── services/
        │   └── api.js                # Capa centralizada de fetch
        │
        ├── hooks/                    # 6 custom hooks
        │   ├── useAirQuality.js
        │   ├── useAlerts.js
        │   ├── useComparison.js
        │   ├── useHistoricalData.js
        │   ├── useMapVisibility.js
        │   └── useWeather.js
        │
        ├── components/
        │   ├── AirQualityDashboard.jsx
        │   ├── AlertsAndPredictions.jsx
        │   ├── HistoricalDataDashboard.jsx
        │   ├── UnsubscribePage.jsx
        │   ├── alerts/               # CurrentStatusTab, Notifications, Trends
        │   ├── common/               # Button, Card, Tabs, Spinner, Badge…
        │   ├── dashboard/            # MapBoundsHandler, PollutantChart…
        │   └── historical/           # PeriodComparator, HistoricalChart…
        │
        └── utils/
            ├── reportGenerator.js    # Generación de PDF
            ├── timeAgo.js            # "Hace 5 min" en español
            └── constants.js
```

---

## 📄 Documentación adicional

El repositorio incluye documentación complementaria en la raíz:

- **[MANUAL_TECNICO.md](./MANUAL_TECNICO.md)** — Manual técnico completo (~26 KB)
- **[GUIA_VERIFICACION_DATOS.md](./GUIA_VERIFICACION_DATOS.md)** — Guía de verificación de fuentes y datos
- **[backend/tests/README.md](./backend/tests/README.md)** — Cómo correr la suite de tests

---

## 🛣️ Roadmap

- [x] API REST con FastAPI y modelado SQLAlchemy
- [x] Dashboard interactivo con mapa (React-Leaflet) y gráficas (Recharts)
- [x] Análisis por zonas geográficas
- [x] Integración con Open-Meteo (calidad del aire + clima)
- [x] Integración con TomTom (tráfico)
- [x] Análisis de infraestructura vial con OpenStreetMap
- [x] Modelos ML para los 5 contaminantes (scikit-learn)
- [x] Sistema completo de alertas por email (suscripción/desuscripción)
- [x] Rate limiting y validación de email custom
- [x] Suite de tests con pytest
- [x] Configuración de despliegue en Render.com
- [x] Exportación de reportes a PDF
- [ ] Migración de modelos ML a `joblib`/`pickle` (actualmente JSON simplificado)
- [ ] Dockerización con docker-compose
- [ ] CI/CD con GitHub Actions
- [ ] Monitoreo con Prometheus/Grafana

---

## 👤 Autor

**Kevin Morales** — Ingeniero en Sistemas Computacionales (Esp. Ingeniería de Software)

- 💼 [LinkedIn](https://www.linkedin.com/in/kevin-morales-625604173/)
- 📧 moralesmonterok@gmail.com
- 🐙 [@KevinMM007](https://github.com/KevinMM007)
- 📍 Veracruz, México

---

## 📄 Licencia

Sistema desarrollado como proyecto de residencia profesional (Tesis) para el monitoreo de calidad del aire en Xalapa, Veracruz.

Versión 2.1.0 — Última actualización: Abril de 2026.
