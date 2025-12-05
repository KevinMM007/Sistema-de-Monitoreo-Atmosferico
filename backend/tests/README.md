# Tests del Backend - Sistema de Monitoreo de Calidad del Aire

## 📋 Descripción

Este directorio contiene los tests automatizados para el backend del Sistema de Monitoreo de Calidad del Aire de Xalapa.

## 🛠️ Requisitos

```bash
pip install pytest pytest-asyncio httpx
```

## ▶️ Ejecutar Tests

### Todos los tests
```bash
cd backend
pytest tests/ -v
```

### Tests específicos
```bash
# Solo tests de health
pytest tests/test_health.py -v

# Solo tests de calidad del aire
pytest tests/test_air_quality.py -v

# Solo tests de suscripciones
pytest tests/test_subscriptions.py -v

# Solo tests de validadores
pytest tests/test_validators.py -v

# Tests de predicciones y diagnóstico
pytest tests/test_predictions_diagnostics.py -v
```

### Con reporte de cobertura
```bash
pip install pytest-cov
pytest tests/ --cov=. --cov-report=html
```

## 📁 Estructura de Tests

```
tests/
├── __init__.py
├── conftest.py                    # Configuración y fixtures compartidos
├── test_health.py                 # Tests de endpoints de salud
├── test_air_quality.py            # Tests de calidad del aire
├── test_subscriptions.py          # Tests de suscripciones/alertas
├── test_validators.py             # Tests de validadores
└── test_predictions_diagnostics.py # Tests de predicciones y diagnóstico
```

## 🧪 Descripción de Tests

### test_health.py
- Verificación de health check
- Accesibilidad de Swagger/ReDoc
- Configuración de CORS
- Versionado de API

### test_air_quality.py
- Endpoints de calidad del aire
- Estructura de datos de contaminantes
- Datos por zonas
- Validación de unidades

### test_subscriptions.py
- Suscripción/desuscripción a alertas
- Validación de emails
- Rate limiting
- Historial de alertas

### test_validators.py
- Validación de emails
- Detección de emails temporales
- Restricciones de base de datos
- Tipos de datos

### test_predictions_diagnostics.py
- Endpoint de predicciones
- Diagnóstico del sistema
- Análisis OSM
- Verificación de datos reales (importante para tesis)

## ⚠️ Notas Importantes

1. **Base de datos de prueba**: Los tests usan SQLite en memoria, no afectan la base de datos de producción.

2. **APIs externas**: Algunos tests pueden fallar si las APIs externas (Open-Meteo, TomTom) no están disponibles.

3. **Datos reales**: Para la tesis, los tests verifican que se usen datos reales y no fallback/simulados.

## 📊 Cobertura Esperada

| Módulo | Cobertura |
|--------|-----------|
| Health endpoints | ✅ Alta |
| Air quality | ✅ Alta |
| Subscriptions | ✅ Alta |
| Validators | ✅ Alta |
| Predictions | ⚠️ Media |
| Traffic | ⚠️ Media |

## 🐛 Solución de Problemas

### Error de importación
```bash
# Asegúrate de estar en el directorio backend
cd backend
export PYTHONPATH=.
pytest tests/ -v
```

### Tests que fallan por APIs externas
Los tests están diseñados para manejar graciosamente fallos de APIs externas. Si un test falla por timeout o conexión, es un problema de red, no del código.

### Limpiar caché de pytest
```bash
pytest --cache-clear tests/ -v
```
