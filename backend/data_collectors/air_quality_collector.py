import requests
from datetime import datetime, timedelta
import random

def get_fallback_data(limit: int = 24):
    """Genera datos de ejemplo cuando no hay datos reales disponibles"""
    now = datetime.now()
    start_time = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return [
        {
            "timestamp": (start_time + timedelta(hours=i)).isoformat(),
            "latitude": 19.5438,
            "longitude": -96.9102,
            "pm25": random.uniform(10, 50),
            "pm10": random.uniform(20, 70),
            "no2": random.uniform(20, 60),
            "o3": random.uniform(30, 80),
            "co": random.uniform(0.5, 2.0)
        }
        for i in range(limit)
    ]

class OpenMeteoCollector:
    def __init__(self):
        self.base_url = "https://air-quality-api.open-meteo.com/v1/air-quality"
        self.weather_url = "https://api.open-meteo.com/v1/forecast"
        self.latitude = 19.5438
        self.longitude = -96.9102

    async def get_air_quality_data(self):
        """Obtiene datos de calidad del aire de Open Meteo"""
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

            print("Realizando petición a Open Meteo...")
            response = requests.get(self.base_url, params=params)
            print(f"Código de respuesta: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                print("Datos recibidos de Open Meteo:", str(data)[:500])
                return self.process_openmeteo_data(data)
            else:
                print(f"Error en la petición: {response.text}")
                return get_fallback_data()
        except Exception as e:
            print(f"Error obteniendo datos: {str(e)}")
            return get_fallback_data()

    async def get_weather_data(self):
        """Obtiene datos meteorológicos de Open Meteo"""
        try:
            params = {
                "latitude": self.latitude,
                "longitude": self.longitude,
                "current": ["temperature_2m", "relative_humidity_2m", "wind_speed_10m", "cloud_cover"],
                "timezone": "America/Mexico_City"
            }

            response = requests.get(self.weather_url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                current = data.get('current', {})
                return {
                    "temperature": current.get('temperature_2m'),
                    "humidity": current.get('relative_humidity_2m'),
                    "wind_speed": current.get('wind_speed_10m'),
                    "cloud_cover": current.get('cloud_cover')
                }
            print(f"Error en la petición meteorológica: {response.text}")
            return None
        except Exception as e:
            print(f"Error obteniendo datos meteorológicos: {str(e)}")
            return None

    def process_openmeteo_data(self, raw_data):
        """Procesa los datos recibidos de Open Meteo al formato esperado por el sistema"""
        try:
            processed_data = []
            hourly_data = raw_data.get('hourly', {})
            times = hourly_data.get('time', [])
            
            # Verificar que tenemos todos los datos necesarios
            required_fields = ['pm10', 'pm2_5', 'nitrogen_dioxide', 'carbon_monoxide', 'ozone']
            if not all(key in hourly_data for key in required_fields):
                print("Faltan algunos datos requeridos en la respuesta de Open Meteo")
                return get_fallback_data()

            for i in range(len(times)):
                try:
                    processed_data.append({
                        'timestamp': times[i],
                        'latitude': self.latitude,
                        'longitude': self.longitude,
                        'pm25': float(hourly_data['pm2_5'][i]),
                        'pm10': float(hourly_data['pm10'][i]),
                        'no2': float(hourly_data['nitrogen_dioxide'][i]),
                        'o3': float(hourly_data['ozone'][i]),
                        # Convertir CO de µg/m³ a mg/m³
                        'co': float(hourly_data['carbon_monoxide'][i]) / 1000.0
                    })
                except (IndexError, TypeError, ValueError) as e:
                    print(f"Error procesando datos para el índice {i}: {str(e)}")
                    continue

            # Ordenar los datos por timestamp en orden descendente
            processed_data.sort(key=lambda x: x['timestamp'], reverse=True)
            
            # Verificar que tenemos datos procesados
            if not processed_data:
                print("No se pudieron procesar los datos, usando fallback")
                return get_fallback_data()

            return processed_data[:24]  # Retornar solo las últimas 24 horas

        except Exception as e:
            print(f"Error procesando datos: {str(e)}")
            return get_fallback_data()