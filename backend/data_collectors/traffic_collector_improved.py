import requests
from datetime import datetime
import json
import os
from dotenv import load_dotenv
import logging

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Cargar variables de entorno
load_dotenv()

class TomTomTrafficCollector:
    def __init__(self):
        # Leer API key del .env
        self.api_key = os.getenv('TOMTOM_API_KEY', 'W5vAkX8Aygts7V9YpFPMVLh6lNKq5zyv')
        self.base_url = 'https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json'
        
        # Coordenadas de puntos clave en Xalapa
        self.xalapa_points = [
            {"lat": 19.5438, "lon": -96.9102, "name": "Centro"},  # Centro
            {"lat": 19.5619, "lon": -96.9352, "name": "Norte"},   # Norte
            {"lat": 19.5219, "lon": -96.8851, "name": "Sur"},     # Sur
            {"lat": 19.5387, "lon": -96.8851, "name": "Este"},    # Este
            {"lat": 19.5387, "lon": -96.9352, "name": "Oeste"}    # Oeste
        ]
        
        # Estadísticas para diagnóstico
        self.error_count = 0
        self.success_count = 0
        self.last_error = None
        self.last_successful_fetch = None
        
        logger.info(f"TomTomTrafficCollector inicializado")
        logger.info(f"API Key configurada: {self.api_key[:20]}...{self.api_key[-5:]}")
        logger.info(f"Puntos a monitorear: {len(self.xalapa_points)}")
    
    async def get_traffic_data(self):
        """
        Obtiene datos de tráfico REALES de TomTom para zonas clave de Xalapa.
        NO usa datos simulados - si la API falla, retorna None.
        """
        logger.info("=" * 60)
        logger.info("Iniciando recolección de datos de tráfico de TomTom")
        logger.info("=" * 60)
        
        try:
            traffic_data = []
            successful_requests = 0
            failed_requests = 0
            
            for i, point in enumerate(self.xalapa_points, 1):
                logger.info(f"\n[{i}/{len(self.xalapa_points)}] Consultando zona: {point['name']}")
                logger.info(f"Coordenadas: {point['lat']}, {point['lon']}")
                
                # Construir parámetros
                params = {
                    'point': f"{point['lat']},{point['lon']}",
                    'radius': 1000,
                    'key': self.api_key
                }
                
                # URL completa para debugging
                url_params = f"point={params['point']}&radius={params['radius']}&key=***"
                logger.info(f"URL: {self.base_url}?{url_params}")
                
                try:
                    # Hacer petición con timeout
                    response = requests.get(
                        self.base_url, 
                        params=params,
                        timeout=10  # Timeout de 10 segundos
                    )
                    
                    logger.info(f"Status Code: {response.status_code}")
                    
                    if response.status_code == 200:
                        data = response.json()
                        
                        # Verificar que tenga la estructura esperada
                        if 'flowSegmentData' not in data:
                            logger.warning(f"⚠️ Respuesta sin datos de flujo para {point['name']}")
                            logger.warning(f"Estructura recibida: {list(data.keys())}")
                            failed_requests += 1
                            
                            # Guardar respuesta para análisis
                            self._save_debug_response(point['name'], data)
                            continue
                        
                        # Extraer datos relevantes
                        flows = data.get('flowSegmentData', {})
                        current_speed = flows.get('currentSpeed', 0)
                        free_flow_speed = flows.get('freeFlowSpeed', 1)
                        
                        # Calcular nivel de congestión (0-100%)
                        if free_flow_speed > 0:
                            congestion_level = max(0, min(100, 100 * (1 - (current_speed / free_flow_speed))))
                        else:
                            congestion_level = 0
                        
                        logger.info(f"✓ Datos obtenidos:")
                        logger.info(f"  - Velocidad actual: {current_speed} km/h")
                        logger.info(f"  - Velocidad libre: {free_flow_speed} km/h")
                        logger.info(f"  - Congestión: {congestion_level:.1f}%")
                        
                        traffic_data.append({
                            'timestamp': datetime.now().isoformat(),
                            'latitude': point['lat'],
                            'longitude': point['lon'],
                            'area_name': point['name'],
                            'current_speed': current_speed,
                            'free_flow_speed': free_flow_speed,
                            'congestion_level': congestion_level,
                            'traffic_level': self._get_traffic_level(congestion_level),
                            'raw_data': data,
                            'data_source': 'tomtom_real'
                        })
                        
                        successful_requests += 1
                        self.success_count += 1
                        
                    elif response.status_code == 403:
                        logger.error(f"✗ ERROR 403 - API KEY INVÁLIDA para {point['name']}")
                        logger.error(f"Verifica que tu API key sea correcta y tenga permisos")
                        logger.error(f"Portal de TomTom: https://developer.tomtom.com/user/me/apps")
                        failed_requests += 1
                        self.last_error = f"API Key inválida (403)"
                        
                    elif response.status_code == 400:
                        logger.error(f"✗ ERROR 400 - PARÁMETROS INCORRECTOS para {point['name']}")
                        logger.error(f"Respuesta: {response.text[:200]}")
                        failed_requests += 1
                        self.last_error = f"Parámetros incorrectos (400)"
                        
                    elif response.status_code == 404:
                        logger.warning(f"⚠️ ERROR 404 - NO HAY DATOS DE TRÁFICO para {point['name']}")
                        logger.warning(f"TomTom puede no tener cobertura en esta ubicación")
                        failed_requests += 1
                        self.last_error = f"Sin cobertura en {point['name']} (404)"
                        
                    else:
                        logger.error(f"✗ ERROR {response.status_code} para {point['name']}")
                        logger.error(f"Respuesta: {response.text[:200]}")
                        failed_requests += 1
                        self.last_error = f"Error {response.status_code}"
                    
                except requests.exceptions.Timeout:
                    logger.error(f"✗ TIMEOUT consultando {point['name']}")
                    logger.error(f"La API tardó más de 10 segundos en responder")
                    failed_requests += 1
                    self.last_error = "Timeout"
                    
                except requests.exceptions.RequestException as e:
                    logger.error(f"✗ ERROR DE CONEXIÓN para {point['name']}: {str(e)}")
                    failed_requests += 1
                    self.last_error = f"Error de conexión: {str(e)}"
            
            # Resumen final
            logger.info("\n" + "=" * 60)
            logger.info("RESUMEN DE RECOLECCIÓN")
            logger.info("=" * 60)
            logger.info(f"Peticiones exitosas: {successful_requests}/{len(self.xalapa_points)}")
            logger.info(f"Peticiones fallidas: {failed_requests}/{len(self.xalapa_points)}")
            
            if traffic_data:
                logger.info(f"✓ Datos de tráfico obtenidos para {len(traffic_data)} zonas")
                self.last_successful_fetch = datetime.now()
                self.error_count = 0
                
                # Mostrar resumen de congestión
                logger.info("\nResumen de congestión por zona:")
                for zone in traffic_data:
                    logger.info(f"  - {zone['area_name']}: {zone['congestion_level']:.1f}% "
                              f"({zone['current_speed']:.0f} km/h)")
                
                return traffic_data
            else:
                logger.error("✗ NO se pudieron obtener datos de tráfico de ninguna zona")
                logger.error(f"Último error: {self.last_error}")
                self.error_count += 1
                
                # NO RETORNAR DATOS SIMULADOS - El usuario no los quiere
                logger.error("⚠️ RETORNANDO None - El sistema debe manejar la falta de datos")
                return None
                
        except Exception as e:
            logger.error(f"✗ ERROR GENERAL en get_traffic_data: {str(e)}", exc_info=True)
            self.error_count += 1
            self.last_error = str(e)
            return None
    
    def _get_traffic_level(self, congestion):
        """Convierte el nivel de congestión numérico a categoría"""
        if congestion < 20:
            return 'low'
        elif congestion < 50:
            return 'medium'
        else:
            return 'high'
    
    def _save_debug_response(self, zone_name, data):
        """Guarda la respuesta para debugging"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"tomtom_debug_{zone_name}_{timestamp}.json"
            
            with open(filename, 'w') as f:
                json.dump(data, f, indent=2)
            
            logger.info(f"Respuesta guardada en: {filename}")
        except Exception as e:
            logger.error(f"Error guardando respuesta de debug: {str(e)}")
    
    def get_status(self):
        """Retorna el estado del colector para diagnóstico"""
        return {
            'success_count': self.success_count,
            'error_count': self.error_count,
            'last_error': self.last_error,
            'last_successful_fetch': self.last_successful_fetch.isoformat() if self.last_successful_fetch else None,
            'is_operational': self.error_count < 5,
            'api_key_configured': bool(self.api_key and len(self.api_key) > 20)
        }
