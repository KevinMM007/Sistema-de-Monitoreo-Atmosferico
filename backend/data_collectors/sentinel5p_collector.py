import requests
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import json
import random
# En sentinel5p_collector.py, modificar la generación de datos de ejemplo
def get_fallback_data(limit: int = 24):  # Cambiado a 24 para tener datos cada hora
    """Genera datos de ejemplo cuando no hay datos reales disponibles"""
    now = datetime.now()
    start_time = now.replace(hour=0, minute=0, second=0, microsecond=0)  # Inicio del día
    
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

class Sentinel5PCollector:
    def __init__(self):
        load_dotenv()
        self.api_token = os.getenv('CAMS_API_KEY')
        self.base_url = "https://ads.atmosphere.copernicus.eu/api/v2"
        
        # Coordenadas de Xalapa
        self.XALAPA_BBOX = {
            'west': -97.0,
            'south': 19.5,
            'east': -96.8,
            'north': 19.6
        }

    async def get_air_quality_data(self):
        """Obtiene datos de calidad del aire de CAMS ADS"""
        try:
            if not self.api_token:
                print("API Token no encontrado en variables de entorno")
                return get_fallback_data()

            headers = {
                'Authorization': f'Bearer {self.api_token}',
                'Accept': 'application/json'
            }

            # Construir los parámetros de la consulta
            current_time = datetime.now()
            start_time = current_time - timedelta(days=1)

            params = {
                'dataset': 'cams-europe-air-quality-forecasts',
                'variable': [
                    'particulate_matter_2.5',
                    'particulate_matter_10',
                    'nitrogen_dioxide',
                    'carbon_monoxide',
                    'ozone'
                ],
                'start_date': start_time.strftime("%Y-%m-%d"),
                'end_date': current_time.strftime("%Y-%m-%d"),
                'format': 'json',
                'area': [
                    self.XALAPA_BBOX['north'],
                    self.XALAPA_BBOX['west'],
                    self.XALAPA_BBOX['south'],
                    self.XALAPA_BBOX['east']
                ]
            }

            print("Realizando petición a CAMS...")
            print(f"URL: {self.base_url}/requests")
            print(f"Parámetros: {json.dumps(params, indent=2)}")

            response = requests.post(
                f"{self.base_url}/requests",
                headers=headers,
                json=params
            )

            print(f"Código de respuesta: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print("Datos recibidos de CAMS:", json.dumps(data, indent=2)[:500])
                return self.process_cams_data(data)
            else:
                print(f"Error en la petición: {response.text}")
                return get_fallback_data()

        except Exception as e:
            print(f"Error obteniendo datos: {str(e)}")
            return get_fallback_data()

    def process_cams_data(self, raw_data):
        """Procesa los datos recibidos de CAMS"""
        try:
            processed_data = []
            data_points = raw_data.get('data', [])

            for point in data_points:
                processed_data.append({
                    'timestamp': point.get('timestamp', datetime.now().isoformat()),
                    'latitude': point.get('latitude', self.XALAPA_BBOX['south']),
                    'longitude': point.get('longitude', self.XALAPA_BBOX['west']),
                    'pm25': point.get('particulate_matter_2.5', {}).get('value'),
                    'pm10': point.get('particulate_matter_10', {}).get('value'),
                    'no2': point.get('nitrogen_dioxide', {}).get('value'),
                    'o3': point.get('ozone', {}).get('value'),
                    'co': point.get('carbon_monoxide', {}).get('value')
                })

            return processed_data if processed_data else get_fallback_data()

        except Exception as e:
            print(f"Error procesando datos: {str(e)}")
            return get_fallback_data()
