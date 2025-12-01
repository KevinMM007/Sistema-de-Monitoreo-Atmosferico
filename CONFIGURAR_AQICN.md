# 🔑 Configuración de AQICN para Datos Reales
## Sistema de Monitoreo de Calidad del Aire - Xalapa

---

## ⚠️ IMPORTANTE PARA TU TESIS

El sistema ahora puede obtener datos de **dos fuentes**:

| Fuente | Tipo | Precisión | Recomendado para Tesis |
|--------|------|-----------|------------------------|
| **AQICN/WAQI** | Estación de monitoreo real (STPS Xalapa) | ⭐⭐⭐⭐⭐ Alta | ✅ SÍ |
| **Open-Meteo/CAMS** | Modelo satelital | ⭐⭐ Baja para México | ❌ NO |

**Los datos de AQICN provienen de la estación STPS de Xalapa, operada por INECC (Instituto Nacional de Ecología y Cambio Climático de México).**

---

## 🚀 Pasos para Configurar AQICN

### Paso 1: Obtener Token de AQICN (GRATIS)

1. Ve a: https://aqicn.org/data-platform/token/
2. Ingresa tu email
3. Completa el formulario indicando:
   - **Nombre**: Tu nombre
   - **Propósito**: "Academic research - Air quality monitoring system for thesis"
   - **Website/App**: "Local air quality monitoring dashboard"
4. Recibirás el token por email en unos minutos

### Paso 2: Configurar el Token

Edita el archivo `.env` en el directorio `backend/`:

```bash
# Abre el archivo
cd backend
notepad .env   # Windows
# o
nano .env      # Linux/Mac
```

Agrega esta línea:
```env
WAQI_API_TOKEN=tu_token_aqui
```

Por ejemplo:
```env
WAQI_API_TOKEN=a0f8eed864ef244f62572c4611beaca3e7ea889c
```

### Paso 3: Reiniciar el Backend

```bash
cd backend
python main.py
```

Verás en la consola:
```
📡 AQICN/WAQI API - Solicitud de datos
  Buscando estación: STPS, Xalapa, Veracruz
  Token: configurado
  ✅ Datos REALES obtenidos de estación: STPS, Xalapa, Veracruz
```

---

## 🔍 Verificación de Datos

### En el Navegador

Abre: `http://localhost:8000/api/data-verification`

**Si los datos son de AQICN (estación real):**
```json
{
  "verification_result": "✅ DATOS VERIFICADOS",
  "data_status": {
    "is_real_data": true,
    "source": "aqicn_waqi_api",
    "station_name": "STPS, Xalapa, Veracruz",
    "station_operator": "INECC",
    "measurement_type": "ground_station"
  }
}
```

**Si los datos son de Open-Meteo (modelo satelital):**
```json
{
  "verification_result": "⚠️ Usando modelo satelital",
  "data_status": {
    "source": "open_meteo_air_quality_api",
    "measurement_type": "satellite_model"
  }
}
```

---

## 📊 Comparación de Valores Esperados

Con AQICN configurado, los valores serán más realistas:

| Contaminante | Open-Meteo (antes) | AQICN (ahora) | AccuWeather |
|--------------|-------------------|---------------|-------------|
| PM2.5 | ~1-3 μg/m³ | ~7-25 μg/m³ | ~15-60 μg/m³ |
| PM10 | ~1-3 μg/m³ | ~20-40 μg/m³ | ~25-50 μg/m³ |
| NO₂ | ~4 μg/m³ | ~10-40 μg/m³ | ~20-50 μg/m³ |

---

## 📚 Citas para tu Tesis

### Cita para AQICN
```
World Air Quality Index Project. (2024). AQICN - Real-time Air Quality Index. 
Recuperado de https://aqicn.org/
```

### Cita para INECC/SINAICA
```
Instituto Nacional de Ecología y Cambio Climático (INECC). (2024). 
Sistema Nacional de Información de la Calidad del Aire (SINAICA). 
México. Recuperado de https://sinaica.inecc.gob.mx/
```

### Cita para la estación STPS Xalapa
```
Los datos de calidad del aire para Xalapa, Veracruz fueron obtenidos de la 
estación de monitoreo STPS operada por el Instituto Nacional de Ecología y 
Cambio Climático (INECC) de México, a través de la plataforma World Air 
Quality Index (AQICN).
```

---

## ⚠️ Sin Token de AQICN

Si no configuras el token:
- El sistema usará el token "demo" de AQICN (limitado)
- Si falla, usará Open-Meteo como respaldo
- Los datos de Open-Meteo son menos precisos para México

---

## 🆘 Problemas Comunes

### "Token: using_demo" en la consola
**Solución**: Configura tu token propio en `.env`

### "AQICN no disponible, usando Open-Meteo"
**Posibles causas**:
1. Token inválido o expirado
2. Problema de conexión
3. Estación STPS sin datos temporalmente

**Solución**: Verifica tu token o espera unos minutos

### Valores muy bajos (PM2.5 < 5)
**Causa**: Estás usando Open-Meteo en lugar de AQICN
**Solución**: Configura el token de AQICN

---

## 📞 Soporte

- AQICN API: https://aqicn.org/api/
- INECC/SINAICA: https://sinaica.inecc.gob.mx/

---

*Documento actualizado: Noviembre 2024*
