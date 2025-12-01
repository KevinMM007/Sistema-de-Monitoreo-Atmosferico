/**
 * Hook personalizado para manejar la visibilidad del mapa
 * Soluciona el problema de Leaflet cuando el contenedor está oculto
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook que invalida el tamaño del mapa cuando se vuelve visible
 * @param {boolean} isVisible - Si el componente es visible
 * @param {Object} mapRef - Referencia al mapa de Leaflet (opcional)
 */
const useMapVisibility = (isVisible, mapRef = null) => {
    const wasVisible = useRef(isVisible);
    const timersRef = useRef([]);
    
    // Función para invalidar todos los mapas
    const invalidateAllMaps = useCallback(() => {
        // Disparar evento de resize global
        window.dispatchEvent(new Event('resize'));
        
        // Si tenemos una referencia específica, invalidar directamente
        if (mapRef?.current) {
            try {
                mapRef.current.invalidateSize();
            } catch (e) {
                // Ignorar errores si el mapa no está listo
            }
        }
    }, [mapRef]);
    
    // Limpiar timers al desmontar
    useEffect(() => {
        return () => {
            timersRef.current.forEach(timer => clearTimeout(timer));
            timersRef.current = [];
        };
    }, []);
    
    useEffect(() => {
        // Solo actuar cuando cambia de no visible a visible
        if (isVisible && !wasVisible.current) {
            // Limpiar timers previos
            timersRef.current.forEach(timer => clearTimeout(timer));
            timersRef.current = [];
            
            // Múltiples intentos con diferentes delays para asegurar que funcione
            // Esto es necesario porque el DOM puede tomar tiempo en actualizar las dimensiones
            const delays = [0, 50, 100, 200, 300, 500, 800, 1000];
            
            delays.forEach(delay => {
                const timer = setTimeout(() => {
                    invalidateAllMaps();
                }, delay);
                timersRef.current.push(timer);
            });
        }
        
        wasVisible.current = isVisible;
    }, [isVisible, invalidateAllMaps]);
    
    // También invalidar cuando el componente se monta por primera vez
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(invalidateAllMaps, 100);
            return () => clearTimeout(timer);
        }
    }, []); // Solo en mount
};

export default useMapVisibility;
