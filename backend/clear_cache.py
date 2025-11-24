import os
import shutil
from osm_cache import osm_cache

def clear_osm_cache():
    """Limpia el caché de OSM para forzar nuevas consultas"""
    print("🧹 Limpiando caché de OSM...")
    
    # Limpiar usando el método del objeto cache
    osm_cache.clear()
    
    # También eliminar el directorio de caché si existe
    cache_dir = "cache"
    if os.path.exists(cache_dir):
        try:
            shutil.rmtree(cache_dir)
            print("✅ Directorio de caché eliminado")
        except Exception as e:
            print(f"⚠️ Error eliminando directorio: {str(e)}")
    
    print("✅ Caché limpiado exitosamente")
    print("ℹ️ La próxima consulta obtendrá datos frescos de OSM")

if __name__ == "__main__":
    clear_osm_cache()
