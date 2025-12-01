"""
Colector de datos de calidad del aire usando AQICN/WAQI API

Esta API proporciona datos de estaciones de monitoreo REALES, incluyendo
la estación STPS de Xalapa operada por INECC (Instituto Nacional de Ecología
y Cambio Climático de México).

Documentación: https://aqicn.org/api/
Fuente de datos para Xalapa: INECC - sinaica.inecc.gob.mx

IMPORTANTE PARA TESIS:
- Los datos de AQICN provienen de estaciones de monitoreo físicas
- La estación STPS en Xalapa es operada por el gobierno mexicano
- Estos datos son mucho más precisos que los modelos satelitales (CAMS)
"""

import requests
from datetime import datetime, timedelta
import os
from typing import Optional, Dict, List
from pathlib import Path

# Cargar variables de entorno desde .env
try:
    from dotenv import load_dotenv
    # Buscar .env en el directorio actual y padre
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
        print(f"✅ Archivo .env cargado desde: {env_path}")
    else:
        load_dotenv()  # Intenta cargar desde directorio actual
except ImportError:
    print("⚠️ python-dotenv no instalado, usando variables de entorno del sistema")

# Obtener token de variable de entorno
# Soporta múltiples nombres de variable para compatibilidad
WAQI_TOKEN = os.environ.get('WAQI_API_TOKEN') or os.environ.get('AQICN_API_KEY') or 'demo'
print(f"🔑 Token AQICN: {'configurado (' + WAQI_TOKEN[:8] + '...)' if WAQI_TOKEN != 'demo' else 'NO CONFIGURADO (usando demo)'}")


class AQICNCollector:
    """
    Colector de datos usando AQICN/WAQI API.
    
    Proporciona datos de estaciones de monitoreo reales, más precisos
    que los modelos satelitales para regiones como México.
    """
    
    def __init__(self, token: str = None):
        self.token = token or WAQI_TOKEN
        self.base_url = "https://api.waqi.info"
        
        # Coordenadas de Xalapa, Veracruz, México
        self.latitude = 19.5438
        self.longitude = -96.9102
        
        # Límites geográficos para validar que la estación sea de México
        # (aproximadamente el estado de Veracruz y alrededores)
        self.valid_lat_range = (17.0, 23.0)  # Latitud de México
        self.valid_lon_range = (-100.0, -93.0)  # Longitud de Veracruz aproximada
        
        # Estación conocida en Xalapa
        self.station_name = "STPS, Xalapa, Veracruz"
        
        # Estado para diagnóstico
        self.last_fetch_time = None
        self.last_fetch_status = None
        self.last_station_used = None
        self.consecutive_failures = 0
        self.total_successful_fetches = 0
        self.total_failed_fetches = 0
    
    def get_status(self) -> Dict:
        """Retorna el estado actual del colector"""
        return {
            "api_url": self.base_url,
            "data_source": "AQICN/WAQI - World Air Quality Index Project",
            "target_location": {
                "city": "Xalapa",
                "state": "Veracruz",
                "country": "México",
                "latitude": self.latitude,
                "longitude": self.longitude
            },
            "last_fetch_time": self.last_fetch_time.isoformat() if self.last_fetch_time else None,
            "last_fetch_status": self.last_fetch_status,
            "last_station_used": self.last_station_used,
            "consecutive_failures": self.consecutive_failures,
            "total_successful_fetches": self.total_successful_fetches,
            "total_failed_fetches": self.total_failed_fetches,
            "is_operational": self.consecutive_failures < 5,
            "token_status": "configured" if self.token != "demo" else "using_demo_limited"
        }
    
    async def test_connection(self) -> Dict:
        """Prueba la conexión con la API de AQICN"""
        try:
            url = f"{self.base_url}/feed/geo:{self.latitude};{self.longitude}/?token={self.token}"
            response = requests.get(url, timeout=10)
            
            return {
                "success": response.status_code == 200 and response.json().get('status') == 'ok',
                "status_code": response.status_code,
                "api_url": self.base_url,
                "response_time_ms": response.elapsed.total_seconds() * 1000,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def _is_valid_mexico_station(self, lat: float, lon: float, station_name: str) -> bool:
        """
        Verifica si la estación está en México (no en China u otro país).
        
        Esto es importante porque la API con token demo puede devolver
        datos de Shanghai en lugar de la estación solicitada.
        """
        # Verificar por coordenadas
        if lat and lon:
            lat_valid = self.valid_lat_range[0] <= lat <= self.valid_lat_range[1]
            lon_valid = self.valid_lon_range[0] <= lon <= self.valid_lon_range[1]
            
            if lat_valid and lon_valid:
                return True
        
        # Verificar por nombre (buscar palabras clave de México)
        if station_name:
            mexico_keywords = ['mexico', 'méxico', 'xalapa', 'veracruz', 'jalapa', 
                             'puebla', 'oaxaca', 'tlaxcala', 'hidalgo']
            station_lower = station_name.lower()
            for keyword in mexico_keywords:
                if keyword in station_lower:
                    return True
        
        # Verificar que NO sea de China/Asia
        if station_name:
            china_keywords = ['shanghai', 'beijing', 'china', '上海', '北京', 
                            '中国', 'shenzhen', 'guangzhou', 'hong kong']
            station_lower = station_name.lower()
            for keyword in china_keywords:
                if keyword in station_lower:
                    print(f"    ⚠️ Estación rechazada: {station_name} (es de China, no de México)")
                    return False
        
        return False
    
    async def get_air_quality_data(self) -> List[Dict]:
        """
        Obtiene datos de calidad del aire de AQICN.
        
        ORDEN DE BÚSQUEDA:
        1. Por coordenadas geográficas (más confiable)
        2. Por nombre de ciudad "xalapa"
        
        VALIDACIÓN:
        - Verifica que la estación devuelta sea de México
        - Rechaza datos de otras regiones (ej: Shanghai)
        
        Returns:
            Lista de diccionarios con datos de contaminantes, o None si falla
        """
        self.last_fetch_time = datetime.now()
        
        print(f"\n{'='*60}")
        print(f"📡 AQICN/WAQI API - Solicitud de datos")
        print(f"{'='*60}")
        print(f"  Ubicación objetivo: Xalapa, Veracruz, México")
        print(f"  Coordenadas: {self.latitude}, {self.longitude}")
        print(f"  Token: {'✅ configurado' if self.token != 'demo' else '⚠️ demo (limitado)'}")
        
        # 1. INTENTAR POR COORDENADAS GEOGRÁFICAS (más confiable)
        print(f"  [1/2] Buscando por coordenadas geográficas...")
        data = await self._fetch_by_coordinates()
        
        if data:
            self.last_fetch_status = "success"
            self.consecutive_failures = 0
            self.total_successful_fetches += 1
            print(f"  ✅ Datos de MÉXICO obtenidos: {self.last_station_used}")
            print(f"{'='*60}\n")
            return data
        
        # 2. INTENTAR POR NOMBRE DE CIUDAD
        print(f"  [2/2] Buscando por nombre 'xalapa'...")
        data = await self._fetch_by_city_name()
        
        if data:
            self.last_fetch_status = "success"
            self.consecutive_failures = 0
            self.total_successful_fetches += 1
            print(f"  ✅ Datos de MÉXICO obtenidos: {self.last_station_used}")
            print(f"{'='*60}\n")
            return data
        
        # Si llegamos aquí, no se encontraron datos válidos de México
        self.last_fetch_status = "failed_no_mexico_data"
        self.consecutive_failures += 1
        self.total_failed_fetches += 1
        print(f"  ❌ No se encontraron estaciones válidas en México")
        print(f"  💡 Sugerencia: El sistema usará Open-Meteo como respaldo")
        print(f"{'='*60}\n")
        return None
    
    async def _fetch_by_coordinates(self) -> Optional[List[Dict]]:
        """Obtiene datos basados en coordenadas geográficas de Xalapa"""
        try:
            url = f"{self.base_url}/feed/geo:{self.latitude};{self.longitude}/?token={self.token}"
            print(f"    URL: {url[:80]}...")
            
            response = requests.get(url, timeout=15)
            print(f"    Status: {response.status_code}")
            
            if response.status_code == 200:
                json_data = response.json()
                if json_data.get('status') == 'ok':
                    data = json_data.get('data', {})
                    
                    # Validar que sea de México
                    city_info = data.get('city', {})
                    station_name = city_info.get('name', 'Unknown')
                    station_coords = city_info.get('geo', [])
                    
                    lat = float(station_coords[0]) if station_coords else None
                    lon = float(station_coords[1]) if len(station_coords) > 1 else None
                    
                    print(f"    Estación encontrada: {station_name}")
                    print(f"    Coordenadas estación: {lat}, {lon}")
                    
                    if self._is_valid_mexico_station(lat, lon, station_name):
                        return self._process_aqicn_data(data)
                    else:
                        print(f"    ⚠️ Estación NO está en México, rechazando datos")
                        return None
            
            return None
            
        except Exception as e:
            print(f"    Error: {str(e)}")
            return None
    
    async def _fetch_by_city_name(self) -> Optional[List[Dict]]:
        """Obtiene datos buscando por nombre de ciudad"""
        try:
            # Intentar varias variantes del nombre
            city_names = ['xalapa', 'jalapa', 'xalapa-veracruz']
            
            for city_name in city_names:
                url = f"{self.base_url}/feed/{city_name}/?token={self.token}"
                print(f"    Probando: {city_name}")
                
                response = requests.get(url, timeout=15)
                
                if response.status_code == 200:
                    json_data = response.json()
                    if json_data.get('status') == 'ok':
                        data = json_data.get('data', {})
                        
                        # Validar que sea de México
                        city_info = data.get('city', {})
                        station_name = city_info.get('name', 'Unknown')
                        station_coords = city_info.get('geo', [])
                        
                        lat = float(station_coords[0]) if station_coords else None
                        lon = float(station_coords[1]) if len(station_coords) > 1 else None
                        
                        if self._is_valid_mexico_station(lat, lon, station_name):
                            print(f"    ✓ Encontrada estación válida: {station_name}")
                            return self._process_aqicn_data(data)
            
            return None
            
        except Exception as e:
            print(f"    Error: {str(e)}")
            return None
    
    def _process_aqicn_data(self, data: Dict) -> List[Dict]:
        """
        Procesa los datos de AQICN al formato del sistema.
        
        AQICN devuelve valores en AQI (Air Quality Index), necesitamos
        convertirlos a concentraciones (μg/m³).
        """
        try:
            # Obtener información de la estación
            city_info = data.get('city', {})
            station_name = city_info.get('name', 'Unknown')
            station_coords = city_info.get('geo', [self.latitude, self.longitude])
            
            self.last_station_used = station_name
            
            # Obtener timestamp
            time_info = data.get('time', {})
            timestamp_str = time_info.get('iso', datetime.now().isoformat())
            
            # Obtener valores de contaminantes (en AQI)
            iaqi = data.get('iaqi', {})
            
            pm25_aqi = iaqi.get('pm25', {}).get('v')
            pm10_aqi = iaqi.get('pm10', {}).get('v')
            no2_aqi = iaqi.get('no2', {}).get('v')
            o3_aqi = iaqi.get('o3', {}).get('v')
            co_aqi = iaqi.get('co', {}).get('v')
            
            # AQI general
            dominant_pollutant = data.get('dominentpol', 'pm25')
            overall_aqi = data.get('aqi', 0)
            
            # Convertir AQI a concentración aproximada
            pm25_conc = self._aqi_to_pm25(pm25_aqi) if pm25_aqi else None
            pm10_conc = self._aqi_to_pm10(pm10_aqi) if pm10_aqi else None
            no2_conc = self._aqi_to_no2(no2_aqi) if no2_aqi else None
            o3_conc = self._aqi_to_o3(o3_aqi) if o3_aqi else None
            co_conc = self._aqi_to_co(co_aqi) if co_aqi else None
            
            # Crear registro de datos
            processed_record = {
                'timestamp': timestamp_str,
                'latitude': float(station_coords[0]) if station_coords else self.latitude,
                'longitude': float(station_coords[1]) if len(station_coords) > 1 else self.longitude,
                
                # Concentraciones calculadas (μg/m³, CO en mg/m³)
                'pm25': round(pm25_conc, 2) if pm25_conc else None,
                'pm10': round(pm10_conc, 2) if pm10_conc else None,
                'no2': round(no2_conc, 2) if no2_conc else None,
                'o3': round(o3_conc, 2) if o3_conc else None,
                'co': round(co_conc, 3) if co_conc else None,
                
                # Valores AQI originales (para referencia)
                'aqi_values': {
                    'overall': overall_aqi,
                    'pm25': pm25_aqi,
                    'pm10': pm10_aqi,
                    'no2': no2_aqi,
                    'o3': o3_aqi,
                    'co': co_aqi,
                    'dominant_pollutant': dominant_pollutant
                },
                
                # ✅ METADATOS DE VERIFICACIÓN
                'is_real_data': True,
                'is_fallback': False,
                'source': 'aqicn_waqi_api',
                'source_url': 'https://api.waqi.info',
                'station_name': station_name,
                'station_operator': 'INECC - Instituto Nacional de Ecología y Cambio Climático',
                'data_network': 'SINAICA',
                'data_provider': 'World Air Quality Index Project (WAQI)',
                'measurement_type': 'ground_station',
                'notes': 'Datos de estación de monitoreo física en México'
            }
            
            print(f"    📊 Datos procesados:")
            print(f"       AQI General: {overall_aqi} ({dominant_pollutant})")
            if pm25_conc:
                print(f"       PM2.5: {pm25_conc:.1f} μg/m³ (AQI: {pm25_aqi})")
            if pm10_conc:
                print(f"       PM10: {pm10_conc:.1f} μg/m³ (AQI: {pm10_aqi})")
            
            return [processed_record]
            
        except Exception as e:
            print(f"    Error procesando datos: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
    
    # ==========================================================================
    # Funciones de conversión AQI -> Concentración
    # Basadas en las tablas de EPA (Environmental Protection Agency)
    # https://www.airnow.gov/aqi/aqi-basics/
    # ==========================================================================
    
    def _aqi_to_pm25(self, aqi: float) -> float:
        """Convierte AQI a concentración de PM2.5 (μg/m³)"""
        if aqi is None:
            return None
        
        breakpoints = [
            (0, 50, 0.0, 12.0),
            (51, 100, 12.1, 35.4),
            (101, 150, 35.5, 55.4),
            (151, 200, 55.5, 150.4),
            (201, 300, 150.5, 250.4),
            (301, 500, 250.5, 500.4),
        ]
        
        return self._aqi_to_concentration(aqi, breakpoints)
    
    def _aqi_to_pm10(self, aqi: float) -> float:
        """Convierte AQI a concentración de PM10 (μg/m³)"""
        if aqi is None:
            return None
        
        breakpoints = [
            (0, 50, 0, 54),
            (51, 100, 55, 154),
            (101, 150, 155, 254),
            (151, 200, 255, 354),
            (201, 300, 355, 424),
            (301, 500, 425, 604),
        ]
        
        return self._aqi_to_concentration(aqi, breakpoints)
    
    def _aqi_to_no2(self, aqi: float) -> float:
        """Convierte AQI a concentración de NO2 (μg/m³)"""
        if aqi is None:
            return None
        
        breakpoints = [
            (0, 50, 0, 53),
            (51, 100, 54, 100),
            (101, 150, 101, 360),
            (151, 200, 361, 649),
            (201, 300, 650, 1249),
            (301, 500, 1250, 2049),
        ]
        
        conc_ppb = self._aqi_to_concentration(aqi, breakpoints)
        return conc_ppb * 1.88 if conc_ppb else None
    
    def _aqi_to_o3(self, aqi: float) -> float:
        """Convierte AQI a concentración de O3 (μg/m³)"""
        if aqi is None:
            return None
        
        breakpoints = [
            (0, 50, 0, 54),
            (51, 100, 55, 70),
            (101, 150, 71, 85),
            (151, 200, 86, 105),
            (201, 300, 106, 200),
            (301, 500, 201, 504),
        ]
        
        conc_ppb = self._aqi_to_concentration(aqi, breakpoints)
        return conc_ppb * 2.0 if conc_ppb else None
    
    def _aqi_to_co(self, aqi: float) -> float:
        """Convierte AQI a concentración de CO (mg/m³)"""
        if aqi is None:
            return None
        
        breakpoints = [
            (0, 50, 0.0, 4.4),
            (51, 100, 4.5, 9.4),
            (101, 150, 9.5, 12.4),
            (151, 200, 12.5, 15.4),
            (201, 300, 15.5, 30.4),
            (301, 500, 30.5, 50.4),
        ]
        
        conc_ppm = self._aqi_to_concentration(aqi, breakpoints)
        return conc_ppm * 1.145 if conc_ppm else None
    
    def _aqi_to_concentration(self, aqi: float, breakpoints: list) -> float:
        """
        Convierte AQI a concentración usando los breakpoints de EPA.
        
        Fórmula inversa:
        C = (AQI - AQI_lo) * (C_hi - C_lo) / (AQI_hi - AQI_lo) + C_lo
        """
        if aqi is None:
            return None
        
        for aqi_lo, aqi_hi, c_lo, c_hi in breakpoints:
            if aqi_lo <= aqi <= aqi_hi:
                concentration = (aqi - aqi_lo) * (c_hi - c_lo) / (aqi_hi - aqi_lo) + c_lo
                return concentration
        
        if aqi > 500:
            return breakpoints[-1][3]
        
        return None
