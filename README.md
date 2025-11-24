# Sistema de Estimación y Diagnóstico de Calidad del Aire - Xalapa, Veracruz

## Descripción General

Sistema integral para monitorear, estimar y predecir la calidad del aire en la ciudad de Xalapa, Veracruz, México. El sistema combina datos de múltiples fuentes (contaminantes atmosféricos, tráfico vehicular, condiciones meteorológicas) para proporcionar información en tiempo real y predicciones futuras sobre la calidad del aire.

## Características Principales

### 1. **Monitoreo en Tiempo Real**
- Recolección de datos de contaminantes (PM2.5, PM10, NO₂, O₃, CO)
- Integración con APIs de calidad del aire (OpenMeteo)
- Datos de tráfico vehicular en tiempo real (TomTom)
- Condiciones meteorológicas actualizadas

### 2. **Estimación por Zonas**
- División de la ciudad en cuadrantes geográficos
- Estimación localizada considerando el impacto del tráfico
- Visualización interactiva en mapa con Google Maps

### 3. **Predicción con Machine Learning**
- Modelos de Random Forest para predicción de contaminantes
- Predicciones hasta 24 horas en el futuro
- Análisis de importancia de características
- Métricas de confianza del modelo

### 4. **Sistema de Alertas**
- Evaluación automática según normativa mexicana (NOM-025-SSA1-2021)
- Niveles de alerta: Bueno, Moderado, Insalubre, Muy Insalubre, Peligroso
- Recomendaciones específicas para la población
- Cálculo del Índice de Calidad del Aire (AQI)

### 5. **Generación de Reportes**
- Reportes PDF descargables
- Análisis histórico de datos
- Estadísticas y tendencias

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Dashboard  │  │    Mapas     │  │ Alertas/Predict. │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTP/REST API
┌─────────────────────────────┴───────────────────────────────┐
│                      Backend (FastAPI)                        │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Endpoints │  │   Collectors │  │   ML Estimator   │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │Alert System │  │     Models   │  │  Repositories    │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────┐
│                    Base de Datos (PostgreSQL)                │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Air Quality │  │Traffic Data  │  │   Predictions    │   │
│  │  Readings   │  │              │  │                  │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│  ┌─────────────┐  ┌──────────────┐                          │
│  │  Quadrant   │  │Alert History │                          │
│  │ Statistics  │  │              │                          │
│  └─────────────┘  └──────────────┘                          │
└──────────────────────────────────────────────────────────────┘
```

## Tecnologías Utilizadas

### Backend
- **FastAPI**: Framework web moderno y rápido
- **SQLAlchemy**: ORM para manejo de base de datos
- **PostgreSQL**: Base de datos relacional
- **Pandas/NumPy**: Procesamiento de datos
- **Scikit-learn**: Machine Learning
- **Python 3.8+**

### Frontend
- **React 18**: Biblioteca de UI
- **Tailwind CSS**: Framework de estilos
- **Recharts**: Visualización de gráficos
- **Google Maps API**: Mapas interactivos
- **Vite**: Build tool

### APIs Externas
- **OpenMeteo**: Datos de calidad del aire y meteorología
- **TomTom**: Datos de tráfico en tiempo real
- **Google Maps**: Visualización de mapas

## Instalación y Configuración

### Prerrequisitos
- Python 3.8 o superior
- Node.js 16 o superior
- PostgreSQL 13 o superior
- Git

### Backend

1. Clonar el repositorio:
```bash
git clone [URL_DEL_REPOSITORIO]
cd air-quality-project/air-quality-system/backend
```

2. Crear entorno virtual:
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

3. Instalar dependencias:
```bash
pip install -r requirements.txt
```

4. Configurar variables de entorno:
- Copiar `.env.example` a `.env`
- Configurar las API keys y credenciales de base de datos

5. Inicializar base de datos:
```bash
# Crear base de datos en PostgreSQL
createdb air_quality_db

# Las tablas se crean automáticamente al iniciar el servidor
```

6. Iniciar servidor:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

1. Navegar a la carpeta frontend:
```bash
cd ../frontend
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
- Crear archivo `.env` con:
```
VITE_GOOGLE_MAPS_API_KEY=tu_api_key_aqui
VITE_API_URL=http://localhost:8000
```

4. Iniciar servidor de desarrollo:
```bash
npm run dev
```

## Uso del Sistema

### 1. Acceder al Dashboard
- Abrir navegador en `http://localhost:5173`
- El dashboard mostrará automáticamente los datos más recientes

### 2. Visualizar Mapa de Contaminación
- El mapa muestra la ciudad dividida en cuadrantes
- Colores indican nivel de contaminación
- Click en cuadrantes para ver detalles

### 3. Ver Alertas y Recomendaciones
- Pestaña de alertas muestra el estado actual
- Recomendaciones específicas según el nivel
- Historial de alertas de las últimas 24 horas

### 4. Consultar Predicciones
- Gráficos de predicción para las próximas 24 horas
- Nivel de confianza del modelo
- Tendencias esperadas

### 5. Generar Reportes
- Botón "Descargar Reporte" genera PDF
- Incluye datos actuales y recomendaciones
- Formato listo para imprimir

## API Endpoints

### Calidad del Aire
- `GET /api/air-quality` - Datos actuales
- `GET /api/air-quality/latest` - Últimas lecturas
- `GET /api/air-quality/history` - Datos históricos

### Tráfico
- `GET /api/traffic` - Datos de tráfico actual

### Predicciones ML
- `POST /api/ml/train` - Entrenar modelos
- `GET /api/ml/predict` - Obtener predicciones

### Alertas
- `GET /api/alerts/current` - Alerta actual
- `GET /api/alerts/history` - Historial de alertas
- `GET /api/alerts/daily-report` - Reporte diario

### Meteorología
- `GET /api/weather` - Condiciones actuales

## Mantenimiento

### Entrenamiento de Modelos
Se recomienda reentrenar los modelos semanalmente:
```bash
curl -X POST http://localhost:8000/api/ml/train
```

### Respaldo de Base de Datos
```bash
pg_dump air_quality_db > backup_$(date +%Y%m%d).sql
```

### Monitoreo
- Verificar logs del servidor regularmente
- Monitorear uso de API (límites de rate)
- Revisar precisión de predicciones

## Contribuir

1. Fork el proyecto
2. Crear rama de feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## Licencia

Este proyecto es parte de una tesis académica. Todos los derechos reservados.

## Contacto

- Autor: [Tu Nombre]
- Email: [Tu Email]
- Institución: [Tu Universidad]

## Agradecimientos

- OpenMeteo por proporcionar datos de calidad del aire
- TomTom por datos de tráfico
- Comunidad de FastAPI y React
