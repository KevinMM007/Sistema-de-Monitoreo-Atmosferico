# 📊 Guía de Verificación de Datos para Tesis
## Sistema de Monitoreo de Calidad del Aire - Xalapa, Veracruz

---

## 🎯 Resumen Ejecutivo

Este documento describe cómo verificar la autenticidad de los datos mostrados en el sistema de monitoreo de calidad del aire, información crítica para trabajos académicos y de investigación.

---

## 📡 Fuentes de Datos del Sistema

### 1. **Calidad del Aire - Open-Meteo API**
- **URL**: `https://air-quality-api.open-meteo.com/v1/air-quality`
- **Documentación**: https://open-meteo.com/en/docs/air-quality-api
- **Modelo de datos**: **CAMS (Copernicus Atmosphere Monitoring Service)**
- **Operador del modelo**: ECMWF (European Centre for Medium-Range Weather Forecasts)
- **Resolución espacial**: ~10km x 10km
- **Frecuencia de actualización**: Cada hora

#### Contaminantes medidos:
| Contaminante | Variable API | Unidad |
|--------------|--------------|--------|
| PM2.5 | pm2_5 | μg/m³ |
| PM10 | pm10 | μg/m³ |
| NO₂ | nitrogen_dioxide | μg/m³ |
| O₃ | ozone | μg/m³ |
| CO | carbon_monoxide | μg/m³ (convertido a mg/m³) |

### 2. **Datos Meteorológicos - Open-Meteo API**
- **URL**: `https://api.open-meteo.com/v1/forecast`
- **Variables**: temperatura, humedad, velocidad del viento, cobertura de nubes

### 3. **Infraestructura Vial - OpenStreetMap (OSM)**
- **API**: Overpass API
- **Datos**: Densidad vial, vías principales, puntos de interés
- **Uso**: Calcular factores de contaminación por zona

### 4. **Tráfico en Tiempo Real - TomTom API (Opcional)**
- **URL**: https://developer.tomtom.com/traffic-api
- **Datos**: Nivel de congestión por zona

---

## 🔍 Cómo Verificar la Autenticidad de los Datos

### Método 1: Indicador Visual en la Interfaz

El sistema muestra un indicador en la parte superior del Dashboard:

**✅ Datos Verificados (Verde)**
```
🟢 Datos en Tiempo Real
Fuente: Open-Meteo Air Quality API (Modelo CAMS)
[✓ DATOS VERIFICADOS]
```

**⚠️ Datos Simulados (Amarillo)**
```
🟡 DATOS SIMULADOS - API No Disponible
Los datos mostrados son estimaciones de respaldo basadas en patrones típicos.
[DATOS SIMULADOS]
```

### Método 2: Endpoint de Diagnóstico

Accede a estos endpoints desde tu navegador para obtener información detallada:

#### Diagnóstico Completo
```
http://localhost:8000/api/diagnostics
```

Respuesta ejemplo:
```json
{
  "diagnostic_timestamp": "2024-11-27T11:07:00",
  "data_authenticity": {
    "is_real_data": true,
    "is_using_fallback": false,
    "verification_note": "✅ Los datos provienen de la API de Open Meteo (datos reales del modelo CAMS)"
  },
  "api_connection_test": {
    "open_meteo_air_quality": {
      "status": "connected",
      "response_code": 200,
      "response_time_ms": 245
    }
  },
  "sample_data": {
    "first_records": [...],
    "last_records": [...]
  }
}
```

#### Verificación Rápida
```
http://localhost:8000/api/data-verification
```

Respuesta ejemplo:
```json
{
  "verification_timestamp": "2024-11-27T11:07:00",
  "data_status": {
    "is_real_data": true,
    "source": "open_meteo_air_quality_api",
    "data_provider": "Open-Meteo.com"
  },
  "verification_result": "✅ DATOS VERIFICADOS: Los datos son REALES de Open Meteo API",
  "current_values": {
    "pm25": 12.5,
    "pm10": 18.3,
    "no2": 15.2,
    "o3": 45.6,
    "co": 0.35
  }
}
```

### Método 3: Verificación Manual con la API de Open-Meteo

Puedes verificar manualmente los datos consultando directamente la API:

```bash
# Consultar datos para Xalapa (coordenadas: 19.5438, -96.9102)
curl "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=19.5438&longitude=-96.9102&hourly=pm10,pm2_5,nitrogen_dioxide,carbon_monoxide,ozone&timezone=America/Mexico_City"
```

Los valores retornados deben coincidir con los mostrados en el sistema.

---

## 🏷️ Campos de Verificación en los Datos

Cada registro de datos incluye estos campos de verificación:

```json
{
  "timestamp": "2024-11-27T10:00",
  "pm25": 12.5,
  "pm10": 18.3,
  "no2": 15.2,
  "o3": 45.6,
  "co": 0.35,
  
  // ✅ CAMPOS DE VERIFICACIÓN
  "is_real_data": true,          // true = datos de API, false = simulados
  "is_fallback": false,          // true si son datos de respaldo
  "source": "open_meteo_air_quality_api",
  "source_url": "https://air-quality-api.open-meteo.com/v1/air-quality",
  "source_model": "CAMS (Copernicus Atmosphere Monitoring Service)",
  "data_provider": "Open-Meteo.com"
}
```

---

## 📚 Citas para Trabajo Académico

### Cita para Open-Meteo
```
Open-Meteo. (2024). Open-Meteo Air Quality API. Recuperado de https://open-meteo.com/en/docs/air-quality-api
```

### Cita para CAMS/Copernicus
```
Copernicus Atmosphere Monitoring Service (CAMS). (2024). European Centre for Medium-Range Weather Forecasts (ECMWF). Recuperado de https://atmosphere.copernicus.eu/
```

### Cita para el modelo de datos
```
Los datos de calidad del aire utilizados en este estudio provienen del servicio Open-Meteo, 
que utiliza el modelo CAMS (Copernicus Atmosphere Monitoring Service) operado por el 
Centro Europeo de Pronósticos Meteorológicos a Plazo Medio (ECMWF). El modelo CAMS 
proporciona análisis y pronósticos de composición atmosférica global con una resolución 
espacial de aproximadamente 10km x 10km.
```

---

## ⚠️ Cuándo los Datos son Simulados

El sistema usa datos simulados SOLO cuando:
1. No hay conexión a internet
2. La API de Open-Meteo no responde
3. Hay errores de procesamiento de datos

En estos casos:
- El indicador cambia a **amarillo**
- Los datos tienen `is_real_data: false` e `is_fallback: true`
- **NO deben usarse para investigación académica**

---

## 🛠️ Verificación Técnica (Para Desarrolladores)

### Logs del Backend
Al iniciar el servidor, observa la consola:

```
============================================================
📡 OPEN METEO API - Solicitud de datos
============================================================
  URL: https://air-quality-api.open-meteo.com/v1/air-quality
  Coordenadas: 19.5438, -96.9102 (Xalapa, Veracruz)
  Rango: 2024-11-25 a 2024-11-27
  Hora de solicitud: 2024-11-27 11:05:24
  Código de respuesta: 200
  Tiempo de respuesta: 0.24s
  ✅ Datos REALES obtenidos: 48 registros
============================================================
```

### Estado del Colector
```
http://localhost:8000/api/collector-status
```

---

## 📋 Checklist de Verificación para Tesis

- [ ] El indicador de estado muestra "Datos en Tiempo Real" (verde)
- [ ] El endpoint `/api/data-verification` confirma `is_real_data: true`
- [ ] Los datos tienen el campo `source: "open_meteo_air_quality_api"`
- [ ] La consola del backend muestra "Datos REALES obtenidos"
- [ ] Los valores coinciden aproximadamente con consulta manual a Open-Meteo

---

## 📞 Soporte

Si tienes dudas sobre la autenticidad de los datos o necesitas información adicional para tu investigación, contacta al desarrollador del sistema.

---

*Documento generado para el Sistema de Monitoreo de Calidad del Aire de Xalapa, Veracruz*
*Versión: 1.0 - Noviembre 2024*
