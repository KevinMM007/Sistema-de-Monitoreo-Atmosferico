import requests
from datetime import datetime
import json

class TomTomTrafficCollector:
    def __init__(self):
        self.api_key = 'W5vAkX8Aygts7V9YpFPMVLh6lNKq5zyv'
        self.base_url = 'https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json'
        
        # Coordenadas de puntos clave en Xalapa
        self.xalapa_points = [
            {"lat": 19.5438, "lon": -96.9102, "name": "Centro"},  # Centro
            {"lat": 19.5619, "lon": -96.9352, "name": "Norte"},   # Norte
            {"lat": 19.5219, "lon": -96.8851, "name": "Sur"},     # Sur
            {"lat": 19.5387, "lon": -96.8851, "name": "Este"},    # Este
            {"lat": 19.5387, "lon": -96.9352, "name": "Oeste"}    # Oeste
        ]
    
    async def get_traffic_data(self):
        """Obtiene datos de tráfico para zonas clave de Xalapa"""
        try:
            traffic_data = []
            
            for point in self.xalapa_points:
                params = {
    'point': f"{point['lat']},{point['lon']}",  # Formato exacto: "19.5438,-96.9102"
    'radius': 1000,  # Como número entero, no como string
    'key': self.api_key  # La clave API completa
}
                
                response = requests.get(self.base_url, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Extraer datos relevantes
                    flows = data.get('flowSegmentData', {})
                    current_speed = flows.get('currentSpeed', 0)
                    free_flow_speed = flows.get('freeFlowSpeed', 1)  # Evitar división por cero
                    
                    # Calcular nivel de congestión (0-100%)
                    if free_flow_speed > 0:
                        congestion_level = max(0, min(100, 100 * (1 - (current_speed / free_flow_speed))))
                    else:
                        congestion_level = 0
                    
                    traffic_data.append({
                        'timestamp': datetime.now().isoformat(),
                        'latitude': point['lat'],
                        'longitude': point['lon'],
                        'area_name': point['name'],
                        'current_speed': current_speed,
                        'free_flow_speed': free_flow_speed,
                        'congestion_level': congestion_level,
                        'traffic_level': self._get_traffic_level(congestion_level),
                        'raw_data': data
                    })
                else:
                    print(f"Error en la petición a TomTom: {response.status_code} - {response.text}")
            
            return traffic_data if traffic_data else self._get_fallback_data()
                
        except Exception as e:
            print(f"Error obteniendo datos de tráfico: {str(e)}")
            return self._get_fallback_data()
    
    def _get_traffic_level(self, congestion):
        """Convierte el nivel de congestión numérico a categoría"""
        if congestion < 20:
            return 'low'
        elif congestion < 50:
            return 'medium'
        else:
            return 'high'
    
    def _get_fallback_data(self):
        """Genera datos de respaldo si la API falla"""
        import random
        return [
            {
                'timestamp': datetime.now().isoformat(),
                'latitude': point['lat'],
                'longitude': point['lon'],
                'area_name': point['name'],
                'current_speed': random.uniform(20, 60),
                'free_flow_speed': 60,
                'congestion_level': random.uniform(10, 80),
                'traffic_level': random.choice(['low', 'medium', 'high']),
                'raw_data': {}
            } for point in self.xalapa_points
        ]
