# Guia de Verificacion de Datos
## Sistema de Monitoreo de Calidad del Aire - Xalapa, Veracruz

**Version del sistema:** 2.1.0
**Ultima actualizacion:** Mayo 2026
**Autor:** Kevin Morales

---

## Resumen

Este documento describe como verificar que los datos mostrados por el sistema
provienen de fuentes reales (Open-Meteo CAMS, wttr.in, TomTom, OpenStreetMap)
y no de los mecanismos de respaldo internos. La distincion es relevante para
trabajo academico, porque solo los datos reales pueden citarse como evidencia.

---

## Fuentes de Datos del Sistema

### 1. Calidad del Aire - Open-Meteo Air Quality API
- **URL:** `https://air-quality-api.open-meteo.com/v1/air-quality`
- **Documentacion:** https://open-meteo.com/en/docs/air-quality-api
- **Modelo de datos:** CAMS (Copernicus Atmosphere Monitoring Service)
- **Operador:** ECMWF (European Centre for Medium-Range Weather Forecasts)
- **Resolucion espacial:** ~40 km por celda en el producto global
- **Actualizacion:** Cada hora

Contaminantes recolectados:

| Contaminante | Variable API | Unidad |
|---|---|---|
| PM2.5 | `pm2_5` | µg/m³ |
| PM10 | `pm10` | µg/m³ |
| NO2 | `nitrogen_dioxide` | µg/m³ |
| O3 | `ozone` | µg/m³ |
| CO | `carbon_monoxide` | µg/m³ (convertido a mg/m³ dividiendo entre 1000) |

### 2. Datos Meteorologicos - Cascada de fuentes

El sistema implementa una cascada de resiliencia para weather:

1. **Primaria - Open-Meteo Forecast API:** `https://api.open-meteo.com/v1/forecast`
   Variables: temperatura, humedad relativa, velocidad del viento, cobertura
   de nubes. Sin API key.
2. **Secundaria - wttr.in:** `https://wttr.in/<lat>,<lon>?format=j1`
   Se invoca solo cuando Open-Meteo responde con error (tipicamente 429 por
   rate-limit compartido en la IP del free tier de Render). Sin API key.
3. **Fallback estatico:** valores tipicos de Xalapa (18 grados C, 75 % humedad,
   5 km/h, 60 % nubosidad), marcados como `is_real_data: false`.

### 3. Infraestructura Vial - OpenStreetMap
- **API:** Overpass `https://overpass-api.de/api/interpreter`
- **Datos:** densidad vial, longitud de vias por categoria, uso de suelo,
  puntos de interes generadores de trafico.
- **Cache:** 30 dias. Cuando el cache expira o falla la consulta, el sistema
  cae al archivo `backend/osm_zones_seed.json` versionado en el repo.

### 4. Trafico en Tiempo Real - TomTom Traffic Flow API
- **URL:** `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json`
- **Plan gratuito:** 2,500 solicitudes / dia. Requiere API key.
- **Datos:** velocidad actual, velocidad de flujo libre, nivel de congestion
  en cinco puntos correspondientes a las zonas de monitoreo.

---

## Como Verificar la Autenticidad de los Datos

### Metodo 1: Indicador visual en el dashboard

El dashboard expone un indicador en la parte superior:

- **Verde - "Datos en Tiempo Real":** todas las fuentes principales estan
  respondiendo correctamente.
- **Amarillo - "DATOS SIMULADOS":** al menos una fuente esta cayendo a fallback.
  En este caso no deben usarse los valores meteorologicos como evidencia
  academica.

### Metodo 2: Endpoint `/api/data-verification`

Acceso directo:

- **Produccion:** https://air-quality-xalapa-api.onrender.com/api/data-verification
- **Local:** `http://localhost:8000/api/data-verification`

Respuesta tipica con datos reales:

```json
{
  "verification_timestamp": "2026-05-12T10:00:00",
  "data_status": {
    "is_real_data": true,
    "source": "open_meteo_air_quality_api",
    "data_provider": "Open-Meteo.com"
  },
  "verification_result": "DATOS VERIFICADOS: Los datos son REALES de Open Meteo API",
  "current_values": {
    "pm25": 12.5,
    "pm10": 18.3,
    "no2": 15.2,
    "o3": 45.6,
    "co": 0.35
  }
}
```

### Metodo 3: Endpoint `/api/diagnostics`

Diagnostico extendido del estado de las fuentes externas:

- **Produccion:** https://air-quality-xalapa-api.onrender.com/api/diagnostics
- **Local:** `http://localhost:8000/api/diagnostics`

Incluye prueba de conexion en vivo a Open-Meteo, codigo de respuesta y
tiempo medido, ademas de los ultimos registros guardados en base de datos.

### Metodo 4: Verificacion manual contra la API publica

```bash
# Coordenadas de Xalapa: 19.5438, -96.9102
curl "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=19.5438&longitude=-96.9102&hourly=pm10,pm2_5,nitrogen_dioxide,carbon_monoxide,ozone&timezone=America/Mexico_City"
```

Los valores horarios retornados por esta consulta deben coincidir con los
mostrados por el dashboard (modulados luego por el factor OSM y el factor
de trafico segun la metodologia descrita en la tesis).

Para weather, verificacion equivalente con la fuente secundaria:

```bash
curl "https://wttr.in/19.5438,-96.9102?format=j1"
```

---

## Campos de Verificacion en la Respuesta

Cada registro entregado por el backend incluye campos de procedencia. Para
calidad del aire:

```json
{
  "timestamp": "2026-05-12T10:00",
  "pm25": 12.5,
  "pm10": 18.3,
  "no2": 15.2,
  "o3": 45.6,
  "co": 0.35,

  "is_real_data": true,
  "is_fallback": false,
  "source": "open_meteo_air_quality_api",
  "source_url": "https://air-quality-api.open-meteo.com/v1/air-quality",
  "source_model": "CAMS (Copernicus Atmosphere Monitoring Service)",
  "data_provider": "Open-Meteo.com"
}
```

Para weather, los valores posibles del campo `source` son:

| `source` | Significado |
|---|---|
| `open_meteo_weather_api` | Fuente primaria respondiendo, datos reales. |
| `wttr_in` | Fuente secundaria activa porque la primaria fallo. Datos reales. |
| `fallback_static` | Ambas fuentes externas cayeron. Valores tipicos, NO usar para academia. |

El campo booleano `is_real_data` resume esta procedencia: `true` para las dos
primeras filas, `false` para la tercera.

---

## Citas para Trabajo Academico

### Cita para Open-Meteo
```
Open-Meteo. (2026). Open-Meteo Air Quality API. Recuperado de
https://open-meteo.com/en/docs/air-quality-api
```

### Cita para CAMS / Copernicus
```
Copernicus Atmosphere Monitoring Service (CAMS). (2026). European Centre for
Medium-Range Weather Forecasts (ECMWF). Recuperado de
https://atmosphere.copernicus.eu/
```

### Cita para wttr.in
```
wttr.in. (2026). Console-oriented weather forecast service. Recuperado de
https://wttr.in/
```

### Cita textual sugerida para el modelo de datos
```
Los datos de calidad del aire utilizados en este estudio provienen del
servicio Open-Meteo, que expone los productos del modelo CAMS (Copernicus
Atmosphere Monitoring Service) operado por el Centro Europeo de Pronosticos
Meteorologicos a Plazo Medio (ECMWF). El modelo CAMS proporciona analisis
y pronosticos de composicion atmosferica global con una resolucion espacial
de aproximadamente 40 km por celda en su producto global.
```

---

## Cuando los Datos son Simulados

El sistema cae a datos sinteticos solo cuando todas las fuentes reales
fallan. Escenarios concretos:

- **Calidad del aire:** Open-Meteo no responde y no hay lecturas recientes en
  la base de datos local. En ese caso el colector devuelve datos generados
  con valores razonables marcados con `is_real_data: false` y `is_fallback: true`.
- **Weather:** Open-Meteo Weather API esta rate-limitada y wttr.in tampoco
  responde, y no hay cache previo. En ese caso se devuelven los valores
  tipicos de Xalapa marcados con `is_real_data: false`.

En ambos casos:
- El indicador del dashboard cambia a amarillo.
- Las respuestas de la API incluyen `is_real_data: false`.
- **Estos valores no deben usarse para investigacion academica.**

---

## Verificacion Tecnica (para desarrolladores)

### Logs del backend

Al consultar `/api/air-quality` el backend imprime en stdout:

```
============================================================
OPEN METEO API - Solicitud de datos
============================================================
  URL: https://air-quality-api.open-meteo.com/v1/air-quality
  Coordenadas: 19.5438, -96.9102 (Xalapa, Veracruz)
  Rango: 2026-05-10 a 2026-05-12
  Hora Mexico: 2026-05-12 10:00:00
  Codigo de respuesta: 200
  Tiempo de respuesta: 0.24s
  Datos REALES obtenidos: 48 registros
============================================================
```

Si Open-Meteo Weather falla y wttr.in toma el relevo, se vera ademas:

```
Error en la peticion meteorologica: 429
  Weather obtenido de wttr.in (fallback): 23 grados C, 74% humedad
```

### Estado del colector

```
GET https://air-quality-xalapa-api.onrender.com/api/collector-status
```

Devuelve metricas de operacion: fetches exitosos / fallidos, ultima
respuesta, codigo HTTP, edad del cache y zona horaria del servidor.

---

## Checklist de Verificacion para Tesis

- [ ] El indicador del dashboard muestra "Datos en Tiempo Real" (verde).
- [ ] El endpoint `/api/data-verification` reporta `is_real_data: true`.
- [ ] El campo `source` es `open_meteo_air_quality_api` para contaminantes.
- [ ] El campo `source` para weather es `open_meteo_weather_api` o `wttr_in`
      (ambos son datos reales).
- [ ] Los logs del backend muestran "Datos REALES obtenidos".
- [ ] Los valores coinciden razonablemente con una consulta manual a la
      API publica de Open-Meteo.

---

## Soporte

Si tienes dudas sobre la autenticidad de los datos o necesitas informacion
adicional para tu investigacion, contacta al desarrollador del sistema.

- Repositorio: https://github.com/KevinMM007/Sistema-de-Monitoreo-Atmosferico
- Documento de referencia: `MANUAL_TECNICO.md`

---

*Sistema de Monitoreo de Calidad del Aire de Xalapa, Veracruz - Version 2.1.0*
