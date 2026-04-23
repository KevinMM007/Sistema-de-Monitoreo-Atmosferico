"""
============================================================================
Sistema de Monitoreo de Calidad del Aire - Xalapa, Veracruz
============================================================================

ARCHIVO: osm_analyzer.py (OPTIMIZADO)
PROPÓSITO: Análisis de infraestructura vial con manejo robusto de rate limits

MEJORAS:
    - Detección específica de rate limit (429)
    - Uso inmediato de factores base cuando OSM no está disponible
    - Sistema de circuit breaker para evitar consultas innecesarias
    - Delays entre consultas para respetar límites de OSM

AUTOR: Kevin Morales
VERSIÓN: 2.2.0
============================================================================
"""

import requests
import json
from typing import Dict, List, Tuple, Optional
import logging
from math import radians, sin, cos, sqrt, atan2
import time
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class OSMAnalyzer:
    """
    Analiza datos de OpenStreetMap con manejo robusto de rate limits
    """
    
    def __init__(self):
        self.overpass_url = "https://overpass-api.de/api/interpreter"

        # Overpass API rechaza peticiones sin User-Agent descriptivo (406 Not Acceptable).
        # Identificamos el proyecto y un contacto válido según los Terms of Use de Overpass.
        self.http_headers = {
            'User-Agent': 'air-quality-xalapa/2.2 (contact: moralesmonterok@gmail.com)',
            'Accept': 'application/json',
        }

        # Circuit breaker para OSM
        self.osm_unavailable_until: Optional[datetime] = None
        self.consecutive_failures = 0
        self.last_request_time = 0
        self.min_request_interval = 2.0  # Segundos entre requests
        # Umbral de fallos consecutivos antes de abrir el breaker para CUALQUIER error
        # (no solo 429). Con esto, 406/504/timeouts también activan la pausa.
        self.failure_threshold = 2
        
        # Pesos para diferentes tipos de vías
        self.road_weights = {
            'motorway': 1.0,
            'trunk': 0.9,
            'primary': 0.8,
            'secondary': 0.6,
            'tertiary': 0.4,
            'residential': 0.2,
            'service': 0.1,
            'unclassified': 0.15
        }
        
        # Factores base conocidos para cada zona
        self.zone_base_factors = {
            'Centro': 1.3,
            'Norte': 1.15,
            'Sur': 0.95,
            'Este': 1.1,
            'Oeste': 0.9
        }

    def _check_circuit_breaker(self) -> bool:
        """Verifica si OSM está temporalmente no disponible"""
        if self.osm_unavailable_until:
            if datetime.now() < self.osm_unavailable_until:
                logger.info(f"OSM circuit breaker activado hasta {self.osm_unavailable_until}")
                return False
            else:
                # Resetear circuit breaker
                self.osm_unavailable_until = None
                self.consecutive_failures = 0
        return True

    def _activate_circuit_breaker(self, minutes: int = 5):
        """Activa el circuit breaker por X minutos"""
        self.osm_unavailable_until = datetime.now() + timedelta(minutes=minutes)
        logger.warning(f"Circuit breaker activado por {minutes} minutos debido a rate limit")

    def _wait_for_rate_limit(self):
        """Espera el tiempo necesario entre requests"""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.min_request_interval:
            time.sleep(self.min_request_interval - elapsed)
        self.last_request_time = time.time()

    def _make_osm_request(self, query: str, query_type: str) -> List[Dict]:
        """Hace request a OSM con manejo de rate limit"""
        # Verificar circuit breaker
        if not self._check_circuit_breaker():
            return []
        
        # Respetar rate limit
        self._wait_for_rate_limit()
        
        try:
            response = requests.post(
                self.overpass_url,
                data={'data': query},
                headers=self.http_headers,
                timeout=15
            )

            if response.status_code == 200:
                # Request exitoso - resetear contador de fallos
                self.consecutive_failures = 0
                data = response.json()
                return data.get('elements', [])

            # Cualquier error HTTP cuenta para el circuit breaker, no solo 429.
            # Overpass devuelve 406 cuando rechaza el User-Agent, 504 en timeouts del servidor
            # y 429 en rate limit; todos deben pausar las consultas.
            self.consecutive_failures += 1
            logger.error(
                f"Error OSM ({response.status_code}) en {query_type}. "
                f"Fallo #{self.consecutive_failures}/{self.failure_threshold}"
            )
            if self.consecutive_failures >= self.failure_threshold:
                self._activate_circuit_breaker(minutes=10)
            return []

        except Exception as e:
            logger.error(f"Excepción en consulta OSM ({query_type}): {str(e)}")
            self.consecutive_failures += 1
            if self.consecutive_failures >= self.failure_threshold:
                self._activate_circuit_breaker(minutes=10)
            return []

    def get_zone_bounds(self, bounds: List[List[float]]) -> str:
        """Convierte bounds a formato Overpass"""
        min_lat = min(bounds[0][0], bounds[1][0])
        max_lat = max(bounds[0][0], bounds[1][0])
        min_lon = min(bounds[0][1], bounds[1][1])
        max_lon = max(bounds[0][1], bounds[1][1])
        return f"{min_lat},{min_lon},{max_lat},{max_lon}"

    def analyze_zone(self, zone_name: str, bounds: List[List[float]]) -> Dict:
        """
        Analiza una zona con manejo robusto de errores
        """
        # Si circuit breaker está activo, usar inmediatamente factores base
        if not self._check_circuit_breaker():
            return self._get_default_zone_result(zone_name)
        
        bbox = self.get_zone_bounds(bounds)
        
        # Intentar obtener datos de OSM
        roads_data = self._get_roads_data(bbox)
        landuse_data = self._get_landuse_data(bbox)
        poi_data = self._get_poi_data(bbox)
        
        # Si no obtuvimos ningún dato, usar defaults
        if not roads_data and not landuse_data and not poi_data:
            logger.warning(f"No se obtuvieron datos de OSM para {zone_name}, usando factores base")
            return self._get_default_zone_result(zone_name)
        
        # Calcular métricas normalmente
        metrics = self._calculate_zone_metrics(
            roads_data, landuse_data, poi_data, bounds
        )
        
        pollution_factor = self._calculate_pollution_factor(metrics, zone_name)
        
        return {
            'zone_name': zone_name,
            'metrics': metrics,
            'pollution_factor': pollution_factor,
            'data_sources': {
                'roads': len(roads_data),
                'landuse': len(landuse_data),
                'pois': len(poi_data)
            },
            'using_defaults': False
        }

    def _get_default_zone_result(self, zone_name: str) -> Dict:
        """Retorna resultado con factores base cuando OSM no está disponible"""
        base_factor = self.zone_base_factors.get(zone_name, 1.0)
        
        return {
            'zone_name': zone_name,
            'metrics': {
                'using_defaults': True,
                'note': 'OSM temporalmente no disponible, usando factores base conocidos'
            },
            'pollution_factor': base_factor,
            'data_sources': {
                'roads': 0,
                'landuse': 0,
                'pois': 0
            },
            'using_defaults': True
        }

    def _get_roads_data(self, bbox: str) -> List[Dict]:
        """Obtiene datos de vías"""
        query = f"""
        [out:json][timeout:25];
        (
          way["highway"]["highway"!~"footway|cycleway|path|steps"]({bbox});
        );
        out body;
        >;
        out skel qt;
        """
        
        elements = self._make_osm_request(query, "roads")
        return self._process_roads(elements) if elements else []

    def _get_landuse_data(self, bbox: str) -> List[Dict]:
        """Obtiene datos de uso de suelo"""
        query = f"""
        [out:json][timeout:25];
        (
          way["landuse"]({bbox});
          way["amenity"~"school|hospital|university|mall"]({bbox});
        );
        out body;
        >;
        out skel qt;
        """
        
        return self._make_osm_request(query, "landuse")

    def _get_poi_data(self, bbox: str) -> List[Dict]:
        """Obtiene POIs"""
        query = f"""
        [out:json][timeout:25];
        (
          node["amenity"~"school|hospital|parking|bank|restaurant"]({bbox});
          node["shop"~"supermarket|mall|department_store"]({bbox});
          node["public_transport"="station"]({bbox});
        );
        out;
        """
        
        return self._make_osm_request(query, "pois")

    def _process_roads(self, elements: List[Dict]) -> List[Dict]:
        """Procesa elementos de vías"""
        roads = []
        nodes = {}
        
        for elem in elements:
            if elem['type'] == 'node':
                nodes[elem['id']] = (elem['lat'], elem['lon'])
        
        for elem in elements:
            if elem['type'] == 'way' and 'tags' in elem:
                road_type = elem['tags'].get('highway', 'unclassified')
                
                length = 0
                if 'nodes' in elem and len(elem['nodes']) > 1:
                    for i in range(len(elem['nodes']) - 1):
                        if elem['nodes'][i] in nodes and elem['nodes'][i+1] in nodes:
                            length += self._haversine_distance(
                                nodes[elem['nodes'][i]],
                                nodes[elem['nodes'][i+1]]
                            )
                
                roads.append({
                    'type': road_type,
                    'length': length,
                    'weight': self.road_weights.get(road_type, 0.1)
                })
        
        return roads

    def _haversine_distance(self, coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
        """Calcula distancia entre coordenadas en km"""
        lat1, lon1 = coord1
        lat2, lon2 = coord2
        
        R = 6371
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        lat1 = radians(lat1)
        lat2 = radians(lat2)
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return R * c

    def _calculate_zone_metrics(self, roads: List[Dict], landuse: List[Dict], 
                               pois: List[Dict], bounds: List[List[float]]) -> Dict:
        """Calcula métricas de la zona"""
        zone_area = self._calculate_zone_area(bounds)
        
        total_road_length = sum(road['length'] for road in roads)
        weighted_road_density = sum(road['length'] * road['weight'] for road in roads) / zone_area if zone_area > 0 else 0
        
        main_roads = [r for r in roads if r['weight'] >= 0.6]
        secondary_roads = [r for r in roads if 0.2 <= r['weight'] < 0.6]
        
        commercial_area = sum(1 for elem in landuse if elem.get('tags', {}).get('landuse') == 'commercial')
        industrial_area = sum(1 for elem in landuse if elem.get('tags', {}).get('landuse') == 'industrial')
        
        schools = sum(1 for poi in pois if poi.get('tags', {}).get('amenity') == 'school')
        hospitals = sum(1 for poi in pois if poi.get('tags', {}).get('amenity') == 'hospital')
        parking = sum(1 for poi in pois if poi.get('tags', {}).get('amenity') == 'parking')
        
        return {
            'zone_area_km2': round(zone_area, 2),
            'total_road_length_km': round(total_road_length, 2),
            'road_density_km_per_km2': round(total_road_length / zone_area, 2) if zone_area > 0 else 0,
            'weighted_road_density': round(weighted_road_density, 3),
            'main_roads_count': len(main_roads),
            'secondary_roads_count': len(secondary_roads),
            'commercial_zones': commercial_area,
            'industrial_zones': industrial_area,
            'schools': schools,
            'hospitals': hospitals,
            'parking_areas': parking,
            'total_pois': len(pois)
        }

    def _calculate_zone_area(self, bounds: List[List[float]]) -> float:
        """Calcula área de la zona en km²"""
        lat1, lon1 = bounds[0]
        lat2, lon2 = bounds[1]
        
        width = self._haversine_distance((lat1, lon1), (lat1, lon2))
        height = self._haversine_distance((lat1, lon1), (lat2, lon1))
        
        return width * height

    def _calculate_pollution_factor(self, metrics: Dict, zone_name: str) -> float:
        """Calcula factor de contaminación"""
        if metrics.get('using_defaults'):
            return self.zone_base_factors.get(zone_name, 1.0)
        
        road_density = metrics.get('weighted_road_density', 0)
        normalized_road_density = min(road_density / 5.0, 2.0)
        road_component = normalized_road_density * 0.3
        
        main_roads = metrics.get('main_roads_count', 0)
        normalized_main_roads = min(main_roads / 200.0, 1.5)
        main_roads_component = normalized_main_roads * 0.2
        
        commercial = metrics.get('commercial_zones', 0)
        industrial = metrics.get('industrial_zones', 0)
        normalized_commercial = min(commercial / 5.0, 1.0)
        normalized_industrial = min(industrial / 5.0, 1.0)
        landuse_component = (normalized_commercial * 0.15 + normalized_industrial * 0.2)
        
        schools = metrics.get('schools', 0)
        hospitals = metrics.get('hospitals', 0)
        parking = metrics.get('parking_areas', 0)
        normalized_schools = min(schools / 15.0, 1.0)
        normalized_hospitals = min(hospitals / 3.0, 1.0)
        normalized_parking = min(parking / 20.0, 1.0)
        poi_component = (
            normalized_schools * 0.1 + 
            normalized_hospitals * 0.15 + 
            normalized_parking * 0.1
        )
        
        raw_factor = (road_component + main_roads_component + landuse_component + poi_component)
        base_factor = self.zone_base_factors.get(zone_name, 1.0)
        adjusted_base = 1.0 + (base_factor - 1.0) * 0.3
        
        if raw_factor < 0.1:
            final_factor = adjusted_base
        else:
            final_factor = adjusted_base * 0.4 + (0.8 + raw_factor * 0.4) * 0.6
        
        final_factor = max(0.8, min(1.5, final_factor))
        
        return round(final_factor, 2)

# Singleton
osm_analyzer = OSMAnalyzer()
