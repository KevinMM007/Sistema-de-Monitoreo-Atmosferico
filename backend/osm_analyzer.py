import requests
import json
from typing import Dict, List, Tuple
import logging
from math import radians, sin, cos, sqrt, atan2
import math

logger = logging.getLogger(__name__)

class OSMAnalyzer:
    """
    Analiza datos de OpenStreetMap para calcular factores de contaminación
    basados en infraestructura vial real
    """
    
    def __init__(self):
        self.overpass_url = "https://overpass-api.de/api/interpreter"
        
        # Pesos para diferentes tipos de vías (basado en estudios de tráfico)
        self.road_weights = {
            'motorway': 1.0,      # Autopistas
            'trunk': 0.9,         # Vías rápidas
            'primary': 0.8,       # Avenidas principales
            'secondary': 0.6,     # Avenidas secundarias
            'tertiary': 0.4,      # Calles importantes
            'residential': 0.2,   # Calles residenciales
            'service': 0.1,       # Calles de servicio
            'unclassified': 0.15  # Sin clasificar
        }
        
        # Pesos para diferentes tipos de uso de suelo
        self.landuse_weights = {
            'commercial': 0.8,    # Zonas comerciales
            'industrial': 0.7,    # Zonas industriales
            'retail': 0.7,        # Zonas de venta
            'residential': 0.3,   # Zonas residenciales
            'recreation': 0.2,    # Parques
            'forest': 0.0,        # Bosques
            'grass': 0.0          # Áreas verdes
        }
        
        # Pesos para POIs que generan tráfico
        self.poi_weights = {
            'school': 0.6,
            'hospital': 0.8,
            'university': 0.7,
            'supermarket': 0.6,
            'mall': 0.8,
            'bank': 0.4,
            'restaurant': 0.3,
            'bus_station': 0.7,
            'parking': 0.5
        }
        
        # Factores base conocidos para cada zona de Xalapa
        # Basados en conocimiento general de la ciudad (ajustados para mayor realismo)
        self.zone_base_factors = {
            'Centro': 1.3,    # Mayor tráfico, zona comercial
            'Norte': 1.15,    # Zona mixta residencial/comercial
            'Sur': 0.95,      # Principalmente residencial
            'Este': 1.1,      # Zona industrial/comercial
            'Oeste': 0.9      # Zona residencial con áreas verdes
        }

    def get_zone_bounds(self, bounds: List[List[float]]) -> str:
        """Convierte bounds a formato Overpass"""
        min_lat = min(bounds[0][0], bounds[1][0])
        max_lat = max(bounds[0][0], bounds[1][0])
        min_lon = min(bounds[0][1], bounds[1][1])
        max_lon = max(bounds[0][1], bounds[1][1])
        return f"{min_lat},{min_lon},{max_lat},{max_lon}"

    def analyze_zone(self, zone_name: str, bounds: List[List[float]]) -> Dict:
        """
        Analiza una zona específica de Xalapa usando datos de OSM
        """
        bbox = self.get_zone_bounds(bounds)
        
        # Obtener datos de vías
        roads_data = self._get_roads_data(bbox)
        
        # Obtener datos de uso de suelo
        landuse_data = self._get_landuse_data(bbox)
        
        # Obtener POIs
        poi_data = self._get_poi_data(bbox)
        
        # Calcular métricas
        metrics = self._calculate_zone_metrics(
            roads_data, 
            landuse_data, 
            poi_data,
            bounds
        )
        
        # Calcular factor de contaminación
        pollution_factor = self._calculate_pollution_factor(metrics, zone_name)
        
        return {
            'zone_name': zone_name,
            'metrics': metrics,
            'pollution_factor': pollution_factor,
            'data_sources': {
                'roads': len(roads_data),
                'landuse': len(landuse_data),
                'pois': len(poi_data)
            }
        }

    def _get_roads_data(self, bbox: str) -> List[Dict]:
        """Obtiene datos de vías de OSM"""
        query = f"""
        [out:json][timeout:25];
        (
          way["highway"]["highway"!~"footway|cycleway|path|steps"]({bbox});
        );
        out body;
        >;
        out skel qt;
        """
        
        try:
            response = requests.post(self.overpass_url, data={'data': query}, timeout=30)
            if response.status_code == 200:
                data = response.json()
                return self._process_roads(data['elements'])
            else:
                logger.error(f"Error obteniendo datos de vías: {response.status_code}")
                return []
        except Exception as e:
            logger.error(f"Error en consulta Overpass (roads): {str(e)}")
            return []

    def _get_landuse_data(self, bbox: str) -> List[Dict]:
        """Obtiene datos de uso de suelo de OSM"""
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
        
        try:
            response = requests.post(self.overpass_url, data={'data': query}, timeout=30)
            if response.status_code == 200:
                data = response.json()
                return data['elements']
            else:
                logger.error(f"Error obteniendo datos de uso de suelo: {response.status_code}")
                return []
        except Exception as e:
            logger.error(f"Error en consulta Overpass (landuse): {str(e)}")
            return []

    def _get_poi_data(self, bbox: str) -> List[Dict]:
        """Obtiene puntos de interés de OSM"""
        query = f"""
        [out:json][timeout:25];
        (
          node["amenity"~"school|hospital|parking|bank|restaurant"]({bbox});
          node["shop"~"supermarket|mall|department_store"]({bbox});
          node["public_transport"="station"]({bbox});
        );
        out;
        """
        
        try:
            response = requests.post(self.overpass_url, data={'data': query}, timeout=30)
            if response.status_code == 200:
                data = response.json()
                return data['elements']
            else:
                logger.error(f"Error obteniendo POIs: {response.status_code}")
                return []
        except Exception as e:
            logger.error(f"Error en consulta Overpass (POI): {str(e)}")
            return []

    def _process_roads(self, elements: List[Dict]) -> List[Dict]:
        """Procesa elementos de vías para extraer información relevante"""
        roads = []
        nodes = {}
        
        # Primero, almacenar todos los nodos
        for elem in elements:
            if elem['type'] == 'node':
                nodes[elem['id']] = (elem['lat'], elem['lon'])
        
        # Procesar vías
        for elem in elements:
            if elem['type'] == 'way' and 'tags' in elem:
                road_type = elem['tags'].get('highway', 'unclassified')
                
                # Calcular longitud de la vía
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
        """Calcula distancia entre dos coordenadas en km"""
        lat1, lon1 = coord1
        lat2, lon2 = coord2
        
        R = 6371  # Radio de la Tierra en km
        
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
        # Calcular área de la zona (aproximada)
        zone_area = self._calculate_zone_area(bounds)
        
        # Métricas de vías
        total_road_length = sum(road['length'] for road in roads)
        weighted_road_density = sum(road['length'] * road['weight'] for road in roads) / zone_area
        
        # Contar tipos de vías principales
        main_roads = [r for r in roads if r['weight'] >= 0.6]
        secondary_roads = [r for r in roads if 0.2 <= r['weight'] < 0.6]
        
        # Métricas de uso de suelo
        commercial_area = sum(1 for elem in landuse if elem.get('tags', {}).get('landuse') == 'commercial')
        industrial_area = sum(1 for elem in landuse if elem.get('tags', {}).get('landuse') == 'industrial')
        
        # Métricas de POIs
        schools = sum(1 for poi in pois if poi.get('tags', {}).get('amenity') == 'school')
        hospitals = sum(1 for poi in pois if poi.get('tags', {}).get('amenity') == 'hospital')
        parking = sum(1 for poi in pois if poi.get('tags', {}).get('amenity') == 'parking')
        
        return {
            'zone_area_km2': round(zone_area, 2),
            'total_road_length_km': round(total_road_length, 2),
            'road_density_km_per_km2': round(total_road_length / zone_area, 2),
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
        """Calcula el área aproximada de la zona en km²"""
        # Aproximación simple usando rectángulo
        lat1, lon1 = bounds[0]
        lat2, lon2 = bounds[1]
        
        # Distancia horizontal y vertical
        width = self._haversine_distance((lat1, lon1), (lat1, lon2))
        height = self._haversine_distance((lat1, lon1), (lat2, lon1))
        
        return width * height

    def _calculate_pollution_factor(self, metrics: Dict, zone_name: str) -> float:
        """
        Calcula el factor de contaminación basado en las métricas
        Normalizado donde 1.0 es el promedio esperado
        """
        # Verificar si tenemos métricas válidas
        if metrics.get('error') or metrics.get('using_defaults'):
            return 1.0
        
        # Calcular componentes del factor con normalización mejorada
        # Densidad vial ponderada (normalizada por valores típicos de ciudad)
        road_density = metrics.get('weighted_road_density', 0)
        # Normalizar densidad vial (valores típicos: 1-10)
        normalized_road_density = min(road_density / 5.0, 2.0)  # Máximo 2.0
        road_component = normalized_road_density * 0.3  # Reducido de 0.8
        
        # Vías principales (normalizado por cantidad esperada)
        main_roads = metrics.get('main_roads_count', 0)
        # Normalizar por zona (200 vías principales es alto)
        normalized_main_roads = min(main_roads / 200.0, 1.5)
        main_roads_component = normalized_main_roads * 0.2  # Reducido de 0.25
        
        # Zonas comerciales e industriales (normalizado)
        commercial = metrics.get('commercial_zones', 0)
        industrial = metrics.get('industrial_zones', 0)
        # Normalizar por cantidad esperada (5-10 zonas es significativo)
        normalized_commercial = min(commercial / 5.0, 1.0)
        normalized_industrial = min(industrial / 5.0, 1.0)
        landuse_component = (normalized_commercial * 0.15 + normalized_industrial * 0.2)
        
        # POIs que generan tráfico (normalizado)
        schools = metrics.get('schools', 0)
        hospitals = metrics.get('hospitals', 0)
        parking = metrics.get('parking_areas', 0)
        # Normalizar POIs
        normalized_schools = min(schools / 15.0, 1.0)
        normalized_hospitals = min(hospitals / 3.0, 1.0)
        normalized_parking = min(parking / 20.0, 1.0)
        poi_component = (
            normalized_schools * 0.1 + 
            normalized_hospitals * 0.15 + 
            normalized_parking * 0.1
        )
        
        # Calcular factor total con pesos ajustados
        raw_factor = (
            road_component +           # Densidad vial
            main_roads_component +     # Vías principales
            landuse_component +        # Uso de suelo
            poi_component             # POIs
        )
        
        # Usar el factor base de la zona como referencia
        base_factor = self.zone_base_factors.get(zone_name, 1.0)
        
        # Ajustar el factor base para que esté en un rango más moderado
        adjusted_base = 1.0 + (base_factor - 1.0) * 0.3  # Suavizar diferencias base
        
        # Combinar factor base ajustado con factor calculado
        if raw_factor < 0.1:
            # Si no hay datos suficientes de OSM, usar principalmente el factor base ajustado
            final_factor = adjusted_base
        else:
            # Combinar factor base (40%) con factor calculado (60%)
            final_factor = adjusted_base * 0.4 + (0.8 + raw_factor * 0.4) * 0.6
        
        # Aplicar límites para mantener factores en rango realista
        # Los factores deben estar entre 0.8 y 1.5 para variaciones realistas
        if final_factor < 0.8:
            final_factor = 0.8
        elif final_factor > 1.5:
            final_factor = 1.5
        
        return round(final_factor, 2)

# Singleton para reutilizar
osm_analyzer = OSMAnalyzer()
