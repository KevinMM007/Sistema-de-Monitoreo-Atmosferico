"""
============================================================================
Sistema de Monitoreo de Calidad del Aire - Xalapa, Veracruz
============================================================================

ARCHIVO: data_collectors/traffic_collector.py
PROPÓSITO: Colector de datos de tráfico usando TomTom Traffic API

FUENTE DE DATOS:
    TomTom Traffic Flow API
    URL: https://api.tomtom.com/traffic/services/

DATOS RECOPILADOS:
    - Velocidad actual (km/h)
    - Velocidad de flujo libre (km/h)
    - Nivel de congestión (%)
    - Tiempos de viaje

PUNTOS DE MONITOREO EN XALAPA:
    - Centro: Av. Enríquez
    - Norte: Av. Lázaro Cárdenas (zona USBI)
    - Sur: Av. Américas
    - Este: Carretera a Coatepec
    - Oeste: Av. Ávila Camacho

LÍMITES API:
    - Plan gratuito: 2,500 requests/día

AUTOR: Kevin Morales
VERSIÓN: 2.1.0
============================================================================
"""

import requests
from datetime import datetime
import json
import os
from dotenv import load_dotenv
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

class TomTomTrafficCollector:
    def __init__(self):
        # Leer API key del .env
        self.api_key = os.getenv('TOMTOM_API_KEY', 'W5vAkX8Aygts7V9YpFPMVLh6lNKq5zyv')
        self.base_url = 'https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json'
        
        # Coordenadas de VÍAS PRINCIPALES en Xalapa para monitoreo de tráfico
        # IMPORTANTE: Estas coordenadas deben estar sobre calles/avenidas principales
        # para que TomTom tenga datos de tráfico
        self.xalapa_points = [
            # Centro - Av. Enríquez (vía principal del centro)
            {"lat": 19.5290, "lon": -96.9219, "name": "Centro"},
            # Norte - Av. Lázaro Cárdenas / Circuito Presidentes (zona USBI)
            {"lat": 19.5520, "lon": -96.9269, "name": "Norte"},
            # Sur - Av. Américas / Boulevard Xalapa-Banderilla
            {"lat": 19.5050, "lon": -96.9150, "name": "Sur"},
            # Este - Av. 20 de Noviembre Este / Carretera a Coatepec
            {"lat": 19.5300, "lon": -96.8950, "name": "Este"},
            # Oeste - Av. Ávila Camacho / Boulevard Adolfo Ruiz Cortines
            {"lat": 19.5350, "lon": -96.9400, "name": "Oeste"}
        ]
        
        # Estadísticas para diagnóstico
        self.error_count = 0
        self.success_count = 0
        self.last_error = None
        self.last_successful_fetch = None
        
        logger.info(f"TomTomTrafficCollector inicializado")
        logger.info(f"Puntos a monitorear: {len(self.xalapa_points)}")
    
    async def get_traffic_data(self):
        """
        Obtiene datos de tráfico REALES de TomTom para zonas clave de Xalapa.
        NO usa datos simulados - si la API falla, retorna lista vacía con metadata.
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
                
                try:
                    # Hacer petición con timeout
                    response = requests.get(
                        self.base_url, 
                        params=params,
                        timeout=10
                    )
                    
                    logger.info(f"Status Code: {response.status_code}")
                    
                    if response.status_code == 200:
                        data = response.json()
                        
                        # Verificar que tenga la estructura esperada
                        if 'flowSegmentData' not in data:
                            logger.warning(f"⚠️ Respuesta sin datos de flujo para {point['name']}")
                            failed_requests += 1
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
                        failed_requests += 1
                        self.last_error = f"API Key inválida (403)"
                        
                    elif response.status_code == 404:
                        logger.warning(f"⚠️ ERROR 404 - NO HAY DATOS para {point['name']}")
                        failed_requests += 1
                        self.last_error = f"Sin cobertura en {point['name']} (404)"
                        
                    else:
                        logger.error(f"✗ ERROR {response.status_code} para {point['name']}")
                        failed_requests += 1
                        self.last_error = f"Error {response.status_code}"
                    
                except requests.exceptions.Timeout:
                    logger.error(f"✗ TIMEOUT consultando {point['name']}")
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
                
                # RETORNAR LISTA VACÍA en lugar de None para no romper el sistema
                # El frontend debe manejar esto mostrando que no hay datos de tráfico
                logger.warning("⚠️ RETORNANDO lista vacía - Sin datos de tráfico disponibles")
                return []
                
        except Exception as e:
            logger.error(f"✗ ERROR GENERAL en get_traffic_data: {str(e)}", exc_info=True)
            self.error_count += 1
            self.last_error = str(e)
            return []
    
    def _get_traffic_level(self, congestion):
        """Convierte el nivel de congestión numérico a categoría"""
        if congestion < 20:
            return 'low'
        elif congestion < 50:
            return 'medium'
        else:
            return 'high'
    
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
