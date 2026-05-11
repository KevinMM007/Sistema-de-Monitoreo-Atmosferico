"""
============================================================================
Sistema de Monitoreo de Calidad del Aire - Xalapa, Veracruz
============================================================================

ARCHIVO: data_collectors/air_quality_collector.py
PROPÓSITO: Colector de datos de contaminantes atmosféricos

FUENTE DE DATOS:
    Open-Meteo Air Quality API (CAMS - Copernicus Atmosphere Monitoring Service)
    URL: https://air-quality-api.open-meteo.com/v1/air-quality

CONTAMINANTES RECOPILADOS:
    - PM2.5  : Partículas finas (µg/m³)
    - PM10   : Partículas gruesas (µg/m³)
    - NO₂    : Dióxido de nitrógeno (µg/m³)
    - O₃     : Ozono (µg/m³)
    - CO     : Monóxido de carbono (mg/m³)

CARACTERÍSTICAS:
    - Datos satelitales validados por ECMWF/Unión Europea
    - Resolución espacial: ~40km
    - Actualización: Cada hora
    - Caché interno: 5 minutos (para evitar requests excesivos)
    - Zona horaria: México (UTC-6) para consistencia

AUTOR: Kevin Morales
VERSIÓN: 2.1.0
============================================================================
"""

import requests
from datetime import datetime, timedelta, timezone
import random

# ============================================================================
# FIX: Zona horaria de México para consistencia entre servidores
# ============================================================================
# El problema: Render usa UTC, tu PC usa hora de México.
# Open-Meteo devuelve timestamps en hora de México.
# Solución: Siempre usar hora de México para comparaciones.
# ============================================================================
MEXICO_UTC_OFFSET = -6  # México Central Standard Time (UTC-6)

def get_mexico_time():
    """
    Obtiene la hora actual en zona horaria de México (UTC-6).
    Esto garantiza consistencia entre servidores locales y en la nube.
    """
    utc_now = datetime.now(timezone.utc)
    mexico_offset = timezone(timedelta(hours=MEXICO_UTC_OFFSET))
    mexico_now = utc_now.astimezone(mexico_offset)
    # Retornar como datetime naive para comparar con timestamps de Open-Meteo
    return mexico_now.replace(tzinfo=None)


def get_fallback_weather_data(reason: str = "unknown"):
    """
    Datos meteorologicos de RESPALDO con valores tipicos de Xalapa.
    Se usa cuando Open-Meteo no responde (rate limit, timeout, etc.) y
    aun no tenemos nada en cache. Asi el dashboard muestra algo razonable
    en vez de un error 500.

    Valores basados en el clima promedio de Xalapa, Veracruz:
    - Templado de montaña (~1400 msnm)
    - Humedad alta por nieblas frecuentes
    - Vientos generalmente suaves
    """
    return {
        "temperature": 18.0,
        "humidity": 75.0,
        "wind_speed": 5.0,
        "cloud_cover": 60.0,
        "source": "fallback_static",
        "source_detail": "Valores tipicos de Xalapa - API no disponible",
        "is_real_data": False,
        "is_fallback": True,
        "stale_reason": reason,
        "fetch_timestamp": get_mexico_time().isoformat()
    }


def get_fallback_data(limit: int = 24):
    """
    Genera datos de RESPALDO cuando no hay datos reales disponibles.
    IMPORTANTE: Estos datos NO son reales y están claramente marcados.
    Solo se usan cuando la API de Open Meteo no responde.
    """
    now = get_mexico_time()
    return [
        {
            "timestamp": (now - timedelta(hours=i)).isoformat(),
            "latitude": 19.5438,
            "longitude": -96.9102,
            "pm25": 8.0 + random.uniform(-2, 5),
            "pm10": 12.0 + random.uniform(-3, 8),
            "no2": 15.0 + random.uniform(-5, 10),
            "o3": 35.0 + random.uniform(-10, 15),
            "co": 0.3 + random.uniform(-0.1, 0.2),
            # ⚠️ MARCADORES IMPORTANTES - Indican que son datos simulados
            "is_real_data": False,
            "is_fallback": True,
            "source": "fallback_simulated",
            "source_detail": "Datos simulados - API no disponible"
        }
        for i in range(limit)
    ]


class OpenMeteoCollector:
    """
    Colector de datos de calidad del aire usando la API de Open Meteo.
    
    API Documentation: https://open-meteo.com/en/docs/air-quality-api
    
    Esta clase obtiene datos REALES de contaminantes atmosféricos para
    las coordenadas de Xalapa, Veracruz, México.
    
    🆕 MEJORAS:
    - Sistema de caché para evitar inconsistencias entre endpoints
    - Zona horaria de México fija para consistencia entre servidores
    """
    
    def __init__(self):
        # URLs oficiales de Open Meteo
        self.base_url = "https://air-quality-api.open-meteo.com/v1/air-quality"
        self.weather_url = "https://api.open-meteo.com/v1/forecast"
        
        # Coordenadas de Xalapa, Veracruz
        # Verificado en: https://www.google.com/maps/@19.5438,-96.9102,14z
        self.latitude = 19.5438
        self.longitude = -96.9102
        
        # Estado del colector para diagnóstico
        self.last_fetch_time = None
        self.last_fetch_status = None
        self.last_api_response_code = None
        self.consecutive_failures = 0
        self.total_successful_fetches = 0
        self.total_failed_fetches = 0
        
        # 🆕 Sistema de caché para consistencia entre endpoints
        self._cache_data = None
        self._cache_timestamp = None
        self._cache_duration = timedelta(minutes=5)  # Caché válido por 5 minutos

        # 🆕 Caché independiente para datos meteorológicos.
        # Open-Meteo Weather API rate-limita agresivo (429) cuando el frontend
        # consulta /api/weather en cada render. Cacheamos 5 minutos y, si la
        # API falla, devolvemos el ultimo valor cacheado aunque haya expirado.
        self._weather_cache_data = None
        self._weather_cache_timestamp = None
        self._weather_cache_duration = timedelta(minutes=5)
        # Negative cache: tras un fallo, no reintentamos Open-Meteo por
        # _weather_error_backoff. Esto evita martillar la API cuando estamos
        # rate-limited y le da tiempo a "olvidarse" de nosotros.
        self._weather_last_error_time = None
        self._weather_error_backoff = timedelta(seconds=60)

    def get_status(self):
        """Retorna el estado actual del colector para diagnóstico"""
        mexico_now = get_mexico_time()
        return {
            "api_url": self.base_url,
            "coordinates": {
                "latitude": self.latitude,
                "longitude": self.longitude,
                "location": "Xalapa, Veracruz, México"
            },
            "last_fetch_time": self.last_fetch_time.isoformat() if self.last_fetch_time else None,
            "last_fetch_status": self.last_fetch_status,
            "last_api_response_code": self.last_api_response_code,
            "consecutive_failures": self.consecutive_failures,
            "total_successful_fetches": self.total_successful_fetches,
            "total_failed_fetches": self.total_failed_fetches,
            "is_operational": self.consecutive_failures < 5,
            # 🆕 Info de caché y zona horaria
            "cache_active": self._is_cache_valid(),
            "cache_age_seconds": (get_mexico_time() - self._cache_timestamp).total_seconds() if self._cache_timestamp else None,
            "server_time_mexico": mexico_now.isoformat(),
            "timezone": "America/Mexico_City (UTC-6)"
        }

    def _is_cache_valid(self):
        """Verifica si el caché es válido (no ha expirado)"""
        if self._cache_data is None or self._cache_timestamp is None:
            return False
        return (get_mexico_time() - self._cache_timestamp) < self._cache_duration

    def _get_cached_data(self):
        """Obtiene datos del caché si es válido"""
        if self._is_cache_valid():
            cache_age = (get_mexico_time() - self._cache_timestamp).total_seconds()
            print(f"  📦 Usando datos de caché (edad: {cache_age:.1f}s)")
            return self._cache_data
        return None

    def _set_cache(self, data):
        """Guarda datos en el caché"""
        self._cache_data = data
        self._cache_timestamp = get_mexico_time()
        print(f"  💾 Datos guardados en caché (válido por {self._cache_duration.total_seconds()}s)")

    async def test_connection(self):
        """
        Prueba la conexión con la API de Open Meteo.
        Útil para diagnóstico y verificación.
        """
        try:
            params = {
                "latitude": self.latitude,
                "longitude": self.longitude,
                "hourly": ["pm2_5"],
                "timezone": "America/Mexico_City",
                "forecast_days": 1
            }
            
            response = requests.get(self.base_url, params=params, timeout=10)
            
            return {
                "success": response.status_code == 200,
                "status_code": response.status_code,
                "api_url": self.base_url,
                "response_time_ms": response.elapsed.total_seconds() * 1000,
                "timestamp": get_mexico_time().isoformat(),
                "sample_data": response.json() if response.status_code == 200 else None
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "timestamp": get_mexico_time().isoformat()
            }

    async def get_air_quality_data(self):
        """
        Obtiene datos de calidad del aire de Open Meteo.
        
        🆕 MEJORAS:
        - Usa caché para garantizar consistencia entre endpoints
        - Usa zona horaria de México para filtrar datos correctamente
        
        Fuente: Open Meteo Air Quality API
        Documentación: https://open-meteo.com/en/docs/air-quality-api
        
        Los datos provienen del modelo CAMS (Copernicus Atmosphere Monitoring Service)
        de la Unión Europea, que es uno de los modelos más precisos disponibles.
        
        Returns:
            list: Lista de diccionarios con datos de contaminantes
        """
        # 🆕 Primero verificar caché
        cached = self._get_cached_data()
        if cached is not None:
            return cached
        
        # 🆕 Usar hora de México
        mexico_now = get_mexico_time()
        self.last_fetch_time = mexico_now
        
        try:
            # Calcular fechas para obtener datos de los últimos 2 días completos
            end_time = mexico_now
            start_time = end_time - timedelta(days=2)

            # Construir parámetros de la petición
            params = {
                "latitude": self.latitude,
                "longitude": self.longitude,
                "hourly": ["pm10", "pm2_5", "nitrogen_dioxide", "carbon_monoxide", "ozone"],
                "timezone": "America/Mexico_City",
                "start_date": start_time.strftime("%Y-%m-%d"),
                "end_date": end_time.strftime("%Y-%m-%d")
            }

            print(f"\n{'='*60}")
            print(f"📡 OPEN METEO API - Solicitud de datos")
            print(f"{'='*60}")
            print(f"  URL: {self.base_url}")
            print(f"  Coordenadas: {self.latitude}, {self.longitude} (Xalapa, Veracruz)")
            print(f"  Rango: {params['start_date']} a {params['end_date']}")
            print(f"  Hora México: {mexico_now.strftime('%Y-%m-%d %H:%M:%S')}")
            
            response = requests.get(self.base_url, params=params, timeout=15)
            self.last_api_response_code = response.status_code
            
            print(f"  Código de respuesta: {response.status_code}")
            print(f"  Tiempo de respuesta: {response.elapsed.total_seconds():.2f}s")

            if response.status_code == 200:
                data = response.json()
                processed = self.process_openmeteo_data(data)
                
                if processed and len(processed) > 0:
                    self.last_fetch_status = "success"
                    self.consecutive_failures = 0
                    self.total_successful_fetches += 1
                    
                    print(f"  ✅ Datos REALES obtenidos: {len(processed)} registros")
                    print(f"  📊 Rango de timestamps: {processed[0]['timestamp']} a {processed[-1]['timestamp']}")
                    print(f"{'='*60}\n")
                    
                    # 🆕 Guardar en caché
                    self._set_cache(processed)
                    
                    return processed
                else:
                    print("  ⚠️ No se pudieron procesar los datos")
                    self.last_fetch_status = "processing_error"
                    self.consecutive_failures += 1
                    self.total_failed_fetches += 1
                    return get_fallback_data()
            else:
                print(f"  ❌ Error HTTP: {response.status_code}")
                print(f"  Respuesta: {response.text[:200]}")
                self.last_fetch_status = f"http_error_{response.status_code}"
                self.consecutive_failures += 1
                self.total_failed_fetches += 1
                return get_fallback_data()
                
        except requests.exceptions.Timeout:
            print("  ❌ Timeout al conectar con Open Meteo")
            self.last_fetch_status = "timeout"
            self.consecutive_failures += 1
            self.total_failed_fetches += 1
            return get_fallback_data()
            
        except requests.exceptions.RequestException as e:
            print(f"  ❌ Error de conexión: {str(e)}")
            self.last_fetch_status = f"connection_error"
            self.consecutive_failures += 1
            self.total_failed_fetches += 1
            return get_fallback_data()
            
        except Exception as e:
            print(f"  ❌ Error inesperado: {str(e)}")
            self.last_fetch_status = f"unexpected_error"
            self.consecutive_failures += 1
            self.total_failed_fetches += 1
            return get_fallback_data()

    async def get_weather_data(self):
        """
        Obtiene datos meteorológicos de Open Meteo.

        Fuente: Open Meteo Weather API
        Documentación: https://open-meteo.com/en/docs

        Estrategia de resiliencia (de mejor a peor):
        1. Cache vigente (<5 min): devolver sin tocar la API.
        2. Negative cache: si acabamos de fallar (<60s), no reintentar.
           Devolver stale o fallback estatico.
        3. Consultar Open-Meteo. Si responde 200, cachear y devolver.
        4. Si la API falla (429, timeout, etc.): marcar el error y
           degradar a stale (si tenemos cache viejo) o a fallback
           estatico con valores tipicos de Xalapa.

        Nunca devuelve None: siempre hay algo razonable para el frontend.
        """
        now = get_mexico_time()

        # 1. Cache vigente -> devolver directo.
        if self._weather_cache_data is not None and self._weather_cache_timestamp is not None:
            age = now - self._weather_cache_timestamp
            if age < self._weather_cache_duration:
                cached = dict(self._weather_cache_data)
                cached["cache_age_seconds"] = age.total_seconds()
                return cached

        # 2. Negative cache: si fallamos hace poco, no martillar la API.
        if self._weather_last_error_time is not None:
            since_error = now - self._weather_last_error_time
            if since_error < self._weather_error_backoff:
                remaining = (self._weather_error_backoff - since_error).total_seconds()
                print(f"  ⏳ Weather en negative-cache: {remaining:.0f}s restantes antes de reintentar Open-Meteo")
                return self._stale_weather_fallback(reason="negative_cache")

        # 3. Intentar consulta fresca a Open-Meteo.
        try:
            params = {
                "latitude": self.latitude,
                "longitude": self.longitude,
                "current": ["temperature_2m", "relative_humidity_2m", "wind_speed_10m", "cloud_cover"],
                "timezone": "America/Mexico_City"
            }

            response = requests.get(self.weather_url, params=params, timeout=10)

            if response.status_code == 200:
                data = response.json()
                current = data.get('current', {})
                fresh = {
                    "temperature": current.get('temperature_2m'),
                    "humidity": current.get('relative_humidity_2m'),
                    "wind_speed": current.get('wind_speed_10m'),
                    "cloud_cover": current.get('cloud_cover'),
                    # Metadatos de la fuente
                    "source": "open_meteo_weather_api",
                    "source_url": self.weather_url,
                    "is_real_data": True,
                    "fetch_timestamp": now.isoformat()
                }
                # Exito: cachear y limpiar marca de error.
                self._weather_cache_data = fresh
                self._weather_cache_timestamp = now
                self._weather_last_error_time = None
                return fresh

            # 4a. HTTP error (incluye 429) -> intentar fuente secundaria.
            print(f"Error en la petición meteorológica: {response.status_code}")
            secondary = self._try_wttr_in(now)
            if secondary is not None:
                return secondary
            self._weather_last_error_time = now
            return self._stale_weather_fallback(reason=f"http_{response.status_code}")
        except Exception as e:
            # 4b. Excepcion (timeout, DNS, etc.) -> intentar fuente secundaria.
            print(f"Error obteniendo datos meteorológicos: {str(e)}")
            secondary = self._try_wttr_in(now)
            if secondary is not None:
                return secondary
            self._weather_last_error_time = now
            return self._stale_weather_fallback(reason="exception")

    def _try_wttr_in(self, now):
        """
        Fuente secundaria: wttr.in. Sin API key, sin registro, gratis.

        Solo se invoca cuando Open-Meteo falla, por lo que el trafico
        hacia wttr.in es bajo. Si responde 200 con datos validos, los
        cachea (mismo cache que Open-Meteo) y los devuelve. Si tambien
        falla, devuelve None para que el caller siga degradando.
        """
        try:
            url = f"https://wttr.in/{self.latitude},{self.longitude}"
            response = requests.get(url, params={"format": "j1"}, timeout=10)
            if response.status_code != 200:
                print(f"  ⚠️ wttr.in respondio {response.status_code}, no usable como fallback")
                return None

            data = response.json()
            current_list = data.get("current_condition") or []
            if not current_list:
                print("  ⚠️ wttr.in: respuesta sin current_condition")
                return None
            current = current_list[0]

            # wttr.in devuelve strings; convertir a float con cuidado.
            def _to_float(value, default=None):
                if value is None:
                    return default
                try:
                    return float(value)
                except (TypeError, ValueError):
                    return default

            fresh = {
                "temperature": _to_float(current.get("temp_C")),
                "humidity": _to_float(current.get("humidity")),
                "wind_speed": _to_float(current.get("windspeedKmph")),
                "cloud_cover": _to_float(current.get("cloudcover")),
                # Metadatos: marcamos la fuente real.
                "source": "wttr_in",
                "source_url": "https://wttr.in",
                "source_detail": "Fuente secundaria - Open-Meteo no disponible",
                "is_real_data": True,
                "fetch_timestamp": now.isoformat()
            }

            # Si faltan campos criticos, no confiamos en la respuesta.
            if fresh["temperature"] is None or fresh["humidity"] is None:
                print("  ⚠️ wttr.in: respuesta incompleta, ignorando")
                return None

            print(f"  ✅ Weather obtenido de wttr.in (fallback): {fresh['temperature']} grados C, {fresh['humidity']}% humedad")
            self._weather_cache_data = fresh
            self._weather_cache_timestamp = now
            self._weather_last_error_time = None
            return fresh
        except Exception as e:
            print(f"  ⚠️ wttr.in fallo: {str(e)}")
            return None

    def _stale_weather_fallback(self, reason: str):
        """
        Cuando no podemos llamar a la API o falla, devolvemos lo mejor que
        tengamos:
        - Si hay cache real (aunque expirado): devolverlo marcado como stale.
        - Si no hay nada cacheado: devolver el fallback estatico con valores
          tipicos de Xalapa, marcado como is_real_data=False.

        Nunca devuelve None: el endpoint /api/weather siempre puede responder
        200 con datos razonables.
        """
        if self._weather_cache_data is not None and self._weather_cache_timestamp is not None:
            age = (get_mexico_time() - self._weather_cache_timestamp).total_seconds()
            print(f"  ⚠️ Devolviendo weather cache stale (edad: {age:.0f}s, motivo: {reason})")
            stale = dict(self._weather_cache_data)
            stale["stale"] = True
            stale["stale_reason"] = reason
            stale["cache_age_seconds"] = age
            return stale

        # Cache frio y API caida -> fallback estatico.
        print(f"  ⚠️ Sin cache previo, devolviendo fallback estatico (motivo: {reason})")
        return get_fallback_weather_data(reason=reason)

    def process_openmeteo_data(self, raw_data):
        """
        Procesa los datos recibidos de Open Meteo al formato esperado.
        
        🆕 FIX: Ahora usa hora de México para filtrar datos futuros correctamente.
        
        Mapeo de campos de Open Meteo:
        - pm2_5 → PM2.5 (μg/m³) - Partículas finas
        - pm10 → PM10 (μg/m³) - Partículas gruesas
        - nitrogen_dioxide → NO₂ (μg/m³) - Dióxido de nitrógeno
        - ozone → O₃ (μg/m³) - Ozono troposférico
        - carbon_monoxide → CO (μg/m³) → convertido a mg/m³
        """
        try:
            processed_data = []
            hourly_data = raw_data.get('hourly', {})
            times = hourly_data.get('time', [])
            
            if not times:
                print("    No hay timestamps en los datos de Open Meteo")
                return None

            # Verificar campos requeridos
            required_fields = ['pm10', 'pm2_5', 'nitrogen_dioxide', 'carbon_monoxide', 'ozone']
            missing_fields = [f for f in required_fields if f not in hourly_data]
            if missing_fields:
                print(f"    Faltan campos en la respuesta: {missing_fields}")
                return None

            # 🆕 FIX: Usar hora de México para filtrar datos futuros
            # Open-Meteo devuelve timestamps en hora de México (porque especificamos timezone)
            # Debemos comparar con hora de México, no con hora del servidor
            now_mexico = get_mexico_time()
            print(f"    Hora México actual: {now_mexico.strftime('%Y-%m-%d %H:%M:%S')}")
            
            for i in range(len(times)):
                try:
                    timestamp_str = times[i]
                    timestamp = datetime.fromisoformat(timestamp_str)
                    
                    # Solo incluir datos del pasado (no futuros)
                    # Comparamos timestamps de México con hora de México
                    if timestamp > now_mexico:
                        continue
                    
                    # Obtener valores
                    pm25 = hourly_data['pm2_5'][i]
                    pm10 = hourly_data['pm10'][i]
                    no2 = hourly_data['nitrogen_dioxide'][i]
                    o3 = hourly_data['ozone'][i]
                    co = hourly_data['carbon_monoxide'][i]
                    
                    # Validar que ningún valor sea None
                    if any(v is None for v in [pm25, pm10, no2, o3, co]):
                        continue
                    
                    processed_data.append({
                        'timestamp': timestamp_str,
                        'latitude': self.latitude,
                        'longitude': self.longitude,
                        'pm25': round(float(pm25), 2),
                        'pm10': round(float(pm10), 2),
                        'no2': round(float(no2), 2),
                        'o3': round(float(o3), 2),
                        # Convertir CO de μg/m³ a mg/m³ (dividir por 1000)
                        'co': round(float(co) / 1000.0, 3),
                        # ✅ MARCADORES DE DATOS REALES
                        'is_real_data': True,
                        'is_fallback': False,
                        'source': 'open_meteo_air_quality_api',
                        'source_url': self.base_url,
                        'source_model': 'CAMS (Copernicus Atmosphere Monitoring Service)',
                        'data_provider': 'Open-Meteo.com'
                    })
                except (IndexError, TypeError, ValueError) as e:
                    continue

            # Ordenar por timestamp ascendente
            processed_data.sort(key=lambda x: x['timestamp'])
            
            # Filtrar últimas 24 horas (usando hora de México)
            cutoff_time = now_mexico - timedelta(hours=24)
            recent_data = [
                d for d in processed_data 
                if datetime.fromisoformat(d['timestamp']) >= cutoff_time
            ]
            
            print(f"    Registros procesados: {len(processed_data)}")
            print(f"    Registros últimas 24h: {len(recent_data)}")
            if recent_data:
                print(f"    Último registro: {recent_data[-1]['timestamp']} - PM2.5: {recent_data[-1]['pm25']}")
            
            if len(recent_data) < 12:
                recent_data = processed_data[-24:] if len(processed_data) > 24 else processed_data
            
            return recent_data if recent_data else None

        except Exception as e:
            print(f"    Error procesando datos: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
