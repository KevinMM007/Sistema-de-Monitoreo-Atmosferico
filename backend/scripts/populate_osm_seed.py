"""
============================================================================
Sistema de Monitoreo de Calidad del Aire - Xalapa, Veracruz
============================================================================

SCRIPT: scripts/populate_osm_seed.py
PROPÓSITO: Pre-poblar el archivo seed de OSM con datos reales de Overpass

USO:
    Desde la carpeta backend/ con el venv activado:
        python scripts/populate_osm_seed.py

    Tarda aprox 15-25 minutos. Usa pausas largas (30s entre queries, 60s
    entre zonas) para no disparar el rate limit de Overpass.

SALIDA:
    Genera/sobreescribe: backend/osm_zones_seed.json

    Después de correrlo:
        git add backend/osm_zones_seed.json
        git commit -m "chore(osm): regenerar seed de Xalapa"
        git push

    Render desplegará el nuevo seed automáticamente. A partir de ahí,
    cuando Overpass esté degradado, el backend usará estos datos reales
    en lugar de los factores hardcodeados.

CUÁNDO RE-EJECUTAR:
    - La primera vez (para crear el seed inicial)
    - Opcionalmente cada 6-12 meses si quieres refrescar con infraestructura
      OSM más reciente. No es obligatorio: el seed no expira.

============================================================================
"""

import os
import sys
import json
import time
from datetime import datetime

# Agregar el directorio backend/ al path para poder importar osm_analyzer_optimized
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from osm_analyzer_optimized import OSMAnalyzer  # noqa: E402

# ----------------------------------------------------------------------------
# CONFIGURACIÓN
# ----------------------------------------------------------------------------

# Mismas zonas que usa main.py en get_zones_osm_analysis()
ZONES = [
    {'name': 'Centro', 'bounds': [[19.5200, -96.9250], [19.5500, -96.8900]]},
    {'name': 'Norte',  'bounds': [[19.5500, -96.9750], [19.5900, -96.8550]]},
    {'name': 'Sur',    'bounds': [[19.4900, -96.9750], [19.5200, -96.8550]]},
    {'name': 'Este',   'bounds': [[19.4900, -96.8900], [19.5900, -96.7900]]},
    {'name': 'Oeste',  'bounds': [[19.4900, -97.0200], [19.5900, -96.9250]]},
]

# Clave que usa main.py al guardar en el caché. El seed debe usar la misma
# para que get_seed() lo encuentre.
CACHE_KEY = "xalapa_zones_analysis"

# Pausas agresivamente largas para ser amable con Overpass (es gratis, no abusemos)
DELAY_BETWEEN_REQUESTS_S = 30   # 30s entre las 3 queries de cada zona
DELAY_BETWEEN_ZONES_S = 60      # 60s de descanso entre zonas
RETRY_DELAY_ON_FAIL_S = 300     # 5 min si una zona falla y la reintentamos

SEED_FILE = os.path.join(BACKEND_DIR, 'osm_zones_seed.json')


def process_zone(analyzer: OSMAnalyzer, zone: dict, attempt: int = 1) -> dict:
    """Procesa una zona y retorna el resultado, con reintento en caso de fallo."""
    print(f"  -> analyze_zone(name={zone['name']}, bounds={zone['bounds']}) [intento {attempt}]", flush=True)
    result = analyzer.analyze_zone(zone['name'], zone['bounds'])

    if result.get('using_defaults'):
        if attempt < 2:
            print(f"  [WARN] {zone['name']} cayo a defaults. Esperando {RETRY_DELAY_ON_FAIL_S}s y reintentando...", flush=True)
            # Resetear circuit breaker para darle otra oportunidad
            analyzer.consecutive_failures = 0
            analyzer.osm_unavailable_until = None
            time.sleep(RETRY_DELAY_ON_FAIL_S)
            return process_zone(analyzer, zone, attempt=attempt + 1)
        else:
            print(f"  [FAIL] {zone['name']} sigue fallando tras reintento. Marcando en defaults en el seed.", flush=True)
    else:
        sources = result.get('data_sources', {})
        print(f"  [OK] {zone['name']} - roads={sources.get('roads', 0)}, "
              f"landuse={sources.get('landuse', 0)}, pois={sources.get('pois', 0)}", flush=True)

    return result


def main():
    print("=" * 70, flush=True)
    print("POBLACION DE SEED DE OSM - Xalapa, Veracruz", flush=True)
    print("=" * 70, flush=True)
    print(f"Inicio: {datetime.now().isoformat()}", flush=True)
    print(f"Archivo destino: {SEED_FILE}", flush=True)
    print(f"Zonas a procesar: {len(ZONES)}", flush=True)
    print(f"Delay entre requests: {DELAY_BETWEEN_REQUESTS_S}s", flush=True)
    print(f"Delay entre zonas: {DELAY_BETWEEN_ZONES_S}s", flush=True)
    print(f"Tiempo estimado total: ~{(len(ZONES) * 3 * DELAY_BETWEEN_REQUESTS_S + (len(ZONES) - 1) * DELAY_BETWEEN_ZONES_S) // 60} minutos", flush=True)
    print("=" * 70, flush=True)
    print(flush=True)

    analyzer = OSMAnalyzer()
    # Forzar pausas largas para no disparar rate limit
    analyzer.min_request_interval = float(DELAY_BETWEEN_REQUESTS_S)

    # Cargar seed existente si ya lo hay (para no perder zonas buenas si solo queremos refrescar algunas)
    existing_seed = {}
    if os.path.exists(SEED_FILE):
        try:
            with open(SEED_FILE, 'r', encoding='utf-8') as f:
                existing_seed = json.load(f)
            print("[INFO] Seed existente encontrado, se sobreescribira si el run completa exitosamente.", flush=True)
            print(flush=True)
        except Exception as e:
            print(f"[WARN] No se pudo leer seed existente: {e}", flush=True)

    results = []
    for i, zone in enumerate(ZONES, 1):
        print(f"[{i}/{len(ZONES)}] Procesando zona: {zone['name']}", flush=True)
        try:
            result = process_zone(analyzer, zone)
            results.append(result)
        except Exception as e:
            print(f"  [ERROR] Excepcion procesando {zone['name']}: {e}", flush=True)
            results.append({
                'zone_name': zone['name'],
                'metrics': {'error': str(e), 'using_defaults': True},
                'pollution_factor': analyzer.zone_base_factors.get(zone['name'], 1.0),
                'data_sources': {'roads': 0, 'landuse': 0, 'pois': 0},
                'using_defaults': True,
            })

        if i < len(ZONES):
            print(f"  [WAIT] Pausa de {DELAY_BETWEEN_ZONES_S}s antes de la siguiente zona...", flush=True)
            print(flush=True)
            time.sleep(DELAY_BETWEEN_ZONES_S)

    # Construir el seed con el mismo formato que osm_cache usa
    seed_payload = {
        CACHE_KEY: {
            'data': {
                'zones': results,
                'timestamp': datetime.now().isoformat(),
                'data_source': 'OpenStreetMap (seed pre-populated)',
            },
            'timestamp': datetime.now().isoformat(),
        }
    }

    # Escribir
    with open(SEED_FILE, 'w', encoding='utf-8') as f:
        json.dump(seed_payload, f, ensure_ascii=False, indent=2)

    # Resumen
    print(flush=True)
    print("=" * 70, flush=True)
    print("RESUMEN", flush=True)
    print("=" * 70, flush=True)
    zones_with_real_data = sum(1 for r in results if not r.get('using_defaults'))
    print(f"Zonas con datos reales: {zones_with_real_data}/{len(ZONES)}", flush=True)
    for r in results:
        label = "[OK]  " if not r.get('using_defaults') else "[WARN]"
        sources = r.get('data_sources', {})
        print(f"  {label} {r['zone_name']:<8} pollution_factor={r.get('pollution_factor'):.2f}  "
              f"roads={sources.get('roads', 0)}  landuse={sources.get('landuse', 0)}  pois={sources.get('pois', 0)}", flush=True)
    print(flush=True)

    if zones_with_real_data == len(ZONES):
        print("[SUCCESS] Perfecto: las 5 zonas tienen datos reales de OSM.", flush=True)
        print(flush=True)
        print("Siguiente paso - commit y push:", flush=True)
        print("  git add backend/osm_zones_seed.json", flush=True)
        print("  git commit -m 'chore(osm): regenerar seed de Xalapa'", flush=True)
        print("  git push", flush=True)
    elif zones_with_real_data > 0:
        print(f"[WARN] Parcial: {zones_with_real_data} zonas con datos reales, "
              f"{len(ZONES) - zones_with_real_data} cayeron a defaults.", flush=True)
        print("    Puedes re-ejecutar el script en unas horas para completar.", flush=True)
        print("    El seed ya esta escrito con lo que se obtuvo; si decides commitearlo,", flush=True)
        print("    las zonas faltantes se serviran con factores base hardcodeados.", flush=True)
    else:
        print("[FAIL] Ninguna zona obtuvo datos reales. Overpass esta muy degradado.", flush=True)
        print("    Espera unas horas y vuelve a intentarlo. NO commitees este seed.", flush=True)
        print(f"    Puedes borrarlo con: rm {SEED_FILE}", flush=True)

    print(flush=True)
    print(f"Fin: {datetime.now().isoformat()}", flush=True)
    print("=" * 70, flush=True)


if __name__ == '__main__':
    main()
