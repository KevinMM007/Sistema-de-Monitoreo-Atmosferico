import requests
from datetime import datetime, timedelta
import random
import logging
from typing import List, Dict, Optional

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_fallback_data(limit: int = 24):
    """Genera datos de ejemplo cuando no hay datos reales disponibles"""
    now = datetime.now()
    start_time = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Generar datos más realistas basados en patrones típicos
    base_values = {
        'pm25': 25.0,
        'pm10': 35.0,
        'no2': 30.0,
        'o3': 45.0,
        'co': 0.8
    }
    
    data = []
    for i in range(limit):
        hour = i % 24
        # Simular variaciones durante el día
        traffic_factor = 1.0
        if 7 <= hour <= 9 or 17 <= hour <= 19:  # Horas pico
            traffic_factor = 1.5
        elif 0 <= hour <= 5:  # Madrugada
            traffic_factor = 0.6
        
        data.append({
            "timestamp": (start_time + timedelta(hours=i)).isoformat(),
            "latitude": 19.5438,
            "longitude": -96.9102,
            "pm25": base_values['pm25'] * traffic_factor + random.uniform(-5, 5),
            "pm10": base_values['pm10'] * traffic_factor + random.uniform(-8, 8),
            "no2": base_values['no2'] * traffic_factor + random.uniform(-10, 10),
            "o3": base_values['o3'] * (2 - traffic_factor) + random.uniform(-10, 10),  # O3 inversamente proporcional
            "co": base_values['co'] * traffic_factor + random.uniform(-0.2, 0.2),
            "source": "fallback",
            "is_real_data": False
        })
    
    return data

class OpenMeteoCollector:
    def __init__(self):
        self.base_url = "https://air-quality-api.open-meteo.com/v1/air-quality"
        self.weather_url = "https://api.open-meteo.com/v1/forecast"
        self.latitude = 19.5438
        self.longitude = -96.9102
        self.last_successful_fetch = None
        self.consecutive_failures = 0

    async def get_air_quality_data(self) -> List[Dict]:
        """Obtiene datos de calidad del aire de Open Meteo con mejor manejo de errores"""
        try:
            # Calcular fechas para obtener las últimas 24 horas
            end_time = datetime.now()
            start_time = end_time - timedelta(hours=24)

            # Construir parámetros de la petición
            params = {
                "latitude": self.latitude,
                "longitude": self.longitude,
                "hourly": ["pm10", "pm2_5", "nitrogen_dioxide", "carbon_monoxide", "ozone"],
                "timezone": "America/Mexico_City",
                "start_date": start_time.strftime("%Y-%m-%d"),
                "end_date": end_time.strftime("%Y-%m-%d")
            }

            logger.info("Realizando petición a Open Meteo API...")
            response = requests.get(self.base_url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Validar que la respuesta tenga la estructura esperada
                if self._validate_response_structure(data):
                    processed_data = self.process_openmeteo_data(data)
                    
                    if processed_data and len(processed_data) > 0:
                        self.last_successful_fetch = datetime.now()
                        self.consecutive_failures = 0
                        logger.info(f"✅ Datos obtenidos exitosamente: {len(processed_data)} registros")
                        return processed_data
                    else:
                        logger.warning("⚠️ No se pudieron procesar los datos de Open Meteo")
                else:
                    logger.error("❌ La respuesta de Open Meteo no tiene la estructura esperada")
            else:
                logger.error(f"❌ Error HTTP {response.status_code}: {response.text[:200]}")
                
        except requests.exceptions.Timeout:
            logger.error("❌ Timeout: La API no respondió en 10 segundos")
        except requests.exceptions.ConnectionError:
            logger.error("❌ Error de conexión: No se pudo conectar con Open Meteo")
        except Exception as e:
            logger.error(f"❌ Error inesperado: {str(e)}")
        
        # Incrementar contador de fallos
        self.consecutive_failures += 1
        
        # Si han fallado muchas peticiones consecutivas, avisar
        if self.consecutive_failures >= 5:
            logger.warning(f"⚠️ La API ha fallado {self.consecutive_failures} veces consecutivas")
        
        # Usar datos de fallback
        logger.info("📊 Usando datos de fallback (simulados)")
        return get_fallback_data()

    def _validate_response_structure(self, data: Dict) -> bool:
        """Valida que la respuesta tenga la estructura esperada"""
        if not isinstance(data, dict):
            return False
        
        if 'hourly' not in data:
            return False
        
        hourly = data['hourly']
        required_fields = ['time', 'pm10', 'pm2_5', 'nitrogen_dioxide', 'carbon_monoxide', 'ozone']
        
        for field in required_fields:
            if field not in hourly:
                logger.warning(f"Campo requerido '{field}' no encontrado en la respuesta")
                return False
        
        # Verificar que todos los arrays tengan la misma longitud
        lengths = [len(hourly[field]) for field in required_fields if isinstance(hourly[field], list)]
        if len(set(lengths)) > 1:
            logger.warning("Los arrays en la respuesta tienen diferentes longitudes")
            return False
        
        return True

    async def get_weather_data(self) -> Optional[Dict]:
        """Obtiene datos meteorológicos de Open Meteo"""
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
                
                weather_data = {
                    "temperature": current.get('temperature_2m', 20),
                    "humidity": current.get('relative_humidity_2m', 70),
                    "wind_speed": current.get('wind_speed_10m', 10),
                    "cloud_cover": current.get('cloud_cover', 50),
                    "timestamp": datetime.now().isoformat()
                }
                
                logger.info("✅ Datos meteorológicos obtenidos correctamente")
                return weather_data
            else:
                logger.error(f"Error en la petición meteorológica: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Error obteniendo datos meteorológicos: {str(e)}")
        
        # Retornar valores por defecto
        return {
            "temperature": 20.0,
            "humidity": 70.0,
            "wind_speed": 10.0,
            "cloud_cover": 50.0,
            "timestamp": datetime.now().isoformat(),
            "is_real_data": False
        }

    def process_openmeteo_data(self, raw_data: Dict) -> List[Dict]:
        """Procesa los datos recibidos de Open Meteo al formato esperado por el sistema"""
        try:
            processed_data = []
            hourly_data = raw_data.get('hourly', {})
            times = hourly_data.get('time', [])
            
            # Procesar cada hora
            for i in range(len(times)):
                try:
                    # Obtener valores, usando None si no están disponibles
                    pm25_value = hourly_data['pm2_5'][i]
                    pm10_value = hourly_data['pm10'][i]
                    no2_value = hourly_data['nitrogen_dioxide'][i]
                    o3_value = hourly_data['ozone'][i]
                    co_value = hourly_data['carbon_monoxide'][i]
                    
                    # Solo procesar si todos los valores están disponibles
                    if all(v is not None for v in [pm25_value, pm10_value, no2_value, o3_value, co_value]):
                        processed_data.append({
                            'timestamp': times[i],
                            'latitude': self.latitude,
                            'longitude': self.longitude,
                            'pm25': float(pm25_value),
                            'pm10': float(pm10_value),
                            'no2': float(no2_value),
                            'o3': float(o3_value),
                            'co': float(co_value) / 1000.0,  # Convertir µg/m³ a mg/m³
                            'source': 'openmeteo',
                            'is_real_data': True
                        })
                    else:
                        logger.debug(f"Valores nulos encontrados en el índice {i}, omitiendo")
                        
                except (IndexError, TypeError, ValueError) as e:
                    logger.debug(f"Error procesando datos para el índice {i}: {str(e)}")
                    continue

            # Ordenar los datos por timestamp
            processed_data.sort(key=lambda x: x['timestamp'])
            
            # Log de estadísticas
            if processed_data:
                logger.info(f"📊 Procesados {len(processed_data)} registros de {len(times)} disponibles")
                
                # Calcular estadísticas básicas
                pm25_values = [d['pm25'] for d in processed_data]
                logger.info(f"PM2.5 - Min: {min(pm25_values):.2f}, Max: {max(pm25_values):.2f}, "
                           f"Promedio: {sum(pm25_values)/len(pm25_values):.2f}")
            
            return processed_data[-24:]  # Retornar solo las últimas 24 horas

        except Exception as e:
            logger.error(f"Error procesando datos: {str(e)}")
            return []

    def get_data_status(self) -> Dict:
        """Retorna el estado actual del colector de datos"""
        return {
            "last_successful_fetch": self.last_successful_fetch.isoformat() if self.last_successful_fetch else None,
            "consecutive_failures": self.consecutive_failures,
            "is_operational": self.consecutive_failures < 10
        }
