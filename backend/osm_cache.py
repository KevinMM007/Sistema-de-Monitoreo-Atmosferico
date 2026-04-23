"""
============================================================================
Sistema de Monitoreo de Calidad del Aire - Xalapa, Veracruz
============================================================================

ARCHIVO: osm_cache.py
PROPÓSITO: Sistema de caché para datos de OpenStreetMap

FUNCIONALIDADES:
    - Almacena resultados de consultas OSM en archivo JSON
    - Evita sobrecargar la API de Overpass
    - Caché válido por 7 días (configurable)

UBICACIÓN DEL CACHÉ:
    - backend/cache/osm_zones_cache.json

AUTOR: Kevin Morales
VERSIÓN: 2.1.0
============================================================================
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, Optional

class OSMCache:
    """
    Sistema de caché simple para datos de OSM
    Evita sobrecargar la API de Overpass
    """
    
    def __init__(self, cache_dir: str = "cache"):
        self.cache_dir = cache_dir
        self.cache_file = os.path.join(cache_dir, "osm_zones_cache.json")
        self.cache_duration = timedelta(days=30)  # Caché válido por 30 días (infraestructura OSM cambia poco)

        # Seed pre-populado (commiteado al repo). Nunca expira. Sirve como fallback
        # permanente cuando Overpass está degradado y no podemos refrescar el caché fresh.
        # Se genera localmente con: python scripts/populate_osm_seed.py
        self.seed_file = os.path.join(os.path.dirname(__file__), "osm_zones_seed.json")

        # Crear directorio de caché si no existe
        os.makedirs(cache_dir, exist_ok=True)
    
    def get(self, key: str) -> Optional[Dict]:
        """Obtiene datos del caché si existen y son válidos"""
        try:
            if not os.path.exists(self.cache_file):
                return None
            
            with open(self.cache_file, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
            
            if key not in cache_data:
                return None
            
            cached_item = cache_data[key]
            
            # Verificar si el caché ha expirado
            cached_time = datetime.fromisoformat(cached_item['timestamp'])
            if datetime.now() - cached_time > self.cache_duration:
                return None
            
            return cached_item['data']
            
        except Exception as e:
            print(f"Error leyendo caché: {str(e)}")
            return None
    
    def set(self, key: str, data: Dict):
        """Guarda datos en el caché"""
        try:
            # Leer caché existente o crear nuevo
            if os.path.exists(self.cache_file):
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    cache_data = json.load(f)
            else:
                cache_data = {}
            
            # Agregar nuevo dato con timestamp
            cache_data[key] = {
                'data': data,
                'timestamp': datetime.now().isoformat()
            }
            
            # Guardar caché actualizado
            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(cache_data, f, ensure_ascii=False, indent=2)
                
        except Exception as e:
            print(f"Error guardando caché: {str(e)}")
    
    def clear(self):
        """Limpia todo el caché"""
        try:
            if os.path.exists(self.cache_file):
                os.remove(self.cache_file)
        except Exception as e:
            print(f"Error limpiando caché: {str(e)}")

    def get_seed(self, key: str) -> Optional[Dict]:
        """
        Lee datos del archivo seed pre-populado (sin expiración).

        El seed se genera localmente y se commitea al repo, sirviendo como
        fallback permanente cuando Overpass está degradado. No debe modificarse
        desde el runtime del backend.
        """
        try:
            if not os.path.exists(self.seed_file):
                return None

            with open(self.seed_file, 'r', encoding='utf-8') as f:
                seed_data = json.load(f)

            if key not in seed_data:
                return None

            # El seed comparte el mismo formato que el caché runtime:
            # { key: { 'data': {...}, 'timestamp': '...' } }
            return seed_data[key].get('data')

        except Exception as e:
            print(f"Error leyendo seed: {str(e)}")
            return None

# Instancia global
osm_cache = OSMCache()
