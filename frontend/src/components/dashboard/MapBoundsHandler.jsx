/**
 * Componente MapBoundsHandler - Maneja los límites del mapa y la carga correcta de tiles
 * Fase 4 - Refactorización del Dashboard
 * 
 * Incluye:
 * - Control de límites del mapa
 * - Invalidación robusta de tamaño para corregir carga de tiles
 * - Manejo de eventos de resize
 */

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { MAP_CONFIG } from '../../utils/constants';

const MapBoundsHandler = () => {
    const map = useMap();
    const timersRef = useRef([]);
    
    useEffect(() => {
        if (!map) return;
        
        map.options.bounceAtZoomLimits = false;
        
        const bounds = MAP_CONFIG.maxBounds;
        
        // Handler para mantener el mapa dentro de los límites
        const handleDrag = () => {
            map.panInsideBounds(bounds, { animate: false });
        };
        
        const handleMoveEnd = () => {
            if (!map.getBounds().intersects(bounds)) {
                map.fitBounds(bounds);
            }
        };
        
        // Handler para resize de ventana
        const handleResize = () => {
            try {
                map.invalidateSize();
            } catch (e) {
                // Ignorar errores si el mapa no está listo
            }
        };
        
        // Función para invalidar tamaño con múltiples intentos
        const invalidateWithRetry = () => {
            // Limpiar timers previos
            timersRef.current.forEach(timer => clearTimeout(timer));
            timersRef.current = [];
            
            const delays = [0, 50, 100, 200, 300, 500, 800];
            
            delays.forEach(delay => {
                const timer = setTimeout(() => {
                    try {
                        map.invalidateSize();
                    } catch (e) {
                        // Ignorar errores
                    }
                }, delay);
                timersRef.current.push(timer);
            });
        };
        
        // Registrar eventos
        map.on('drag', handleDrag);
        map.on('moveend', handleMoveEnd);
        window.addEventListener('resize', handleResize);
        
        // Invalidar tamaño inicialmente con múltiples intentos
        invalidateWithRetry();
        
        return () => {
            map.off('drag', handleDrag);
            map.off('moveend', handleMoveEnd);
            window.removeEventListener('resize', handleResize);
            timersRef.current.forEach(timer => clearTimeout(timer));
            timersRef.current = [];
        };
    }, [map]);
    
    return null;
};

export default MapBoundsHandler;
