/**
 * Hook personalizado para datos de calidad del aire
 * Fase 4 - Optimización: Lógica reutilizable
 */

import { useState, useEffect, useCallback } from 'react';
import { airQualityService } from '../services/api';
import { UPDATE_INTERVALS } from '../utils/constants';

/**
 * Hook para obtener datos de calidad del aire en tiempo real
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.autoRefresh - Activar actualización automática (default: true)
 * @param {number} options.refreshInterval - Intervalo de actualización en ms (default: 5 min)
 * @param {number} options.limit - Número de lecturas a obtener (default: 24)
 * @returns {Object} Estado y funciones del hook
 */
const useAirQuality = (options = {}) => {
    const {
        autoRefresh = true,
        refreshInterval = UPDATE_INTERVALS.airQuality,
        limit = 24, // Aumentado a 24 para mejor visualización
    } = options;

    // Estados principales
    const [data, setData] = useState(null);
    const [zoneData, setZoneData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [zoneLoading, setZoneLoading] = useState(true);
    const [error, setError] = useState(null);
    const [zoneError, setZoneError] = useState(null);
    
    // Estados adicionales
    const [dataSource, setDataSource] = useState('loading');
    const [collectorStatus, setCollectorStatus] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    /**
     * Obtiene los datos de calidad del aire
     */
    const fetchData = useCallback(async () => {
        try {
            setError(null);
            
            const response = await airQualityService.getLatest();
            
            if (!response || !Array.isArray(response) || response.length === 0) {
                console.warn('No se recibieron datos de calidad del aire');
                setData([]);
                setDataSource('no-data');
                return;
            }
            
            console.log(`Datos recibidos: ${response.length} registros`);
            
            // Procesar timestamps y ordenar
            const processedData = response.map(item => ({
                ...item,
                // Normalizar timestamp para consistencia
                timestamp: item.timestamp,
            }));
            
            // Ordenar por timestamp ascendente (más antiguo primero)
            processedData.sort((a, b) => {
                const dateA = new Date(a.timestamp);
                const dateB = new Date(b.timestamp);
                return dateA - dateB;
            });
            
            // Filtrar solo las últimas N horas de datos (para evitar mostrar datos muy antiguos)
            const now = new Date();
            const cutoffTime = new Date(now.getTime() - (limit * 60 * 60 * 1000)); // limit horas atrás
            
            const recentData = processedData.filter(item => {
                const itemDate = new Date(item.timestamp);
                // Incluir datos desde cutoffTime hasta ahora + 5 minutos de margen
                return itemDate >= cutoffTime && itemDate <= new Date(now.getTime() + 5 * 60 * 1000);
            });
            
            console.log(`Datos filtrados (últimas ${limit}h): ${recentData.length} registros`);
            
            // Si después del filtro hay pocos datos, usar todos los disponibles
            const finalData = recentData.length >= 6 ? recentData : processedData.slice(-limit);
            
            // Determinar fuente de datos
            const isRealData = finalData.length > 0 && 
                (finalData[0].is_real_data === true || finalData[0].source !== 'fallback');
            
            setData(finalData);
            setDataSource(isRealData ? 'real' : 'fallback');
            setLastUpdate(new Date());
            
            // Intentar obtener estado del colector
            try {
                const status = await airQualityService.getCollectorStatus();
                setCollectorStatus(status);
            } catch (statusErr) {
                console.warn('No se pudo obtener estado del colector:', statusErr);
            }
            
        } catch (err) {
            console.error('Error fetching air quality data:', err);
            setError(err.message);
            setDataSource('error');
        } finally {
            setLoading(false);
        }
    }, [limit]);

    /**
     * Obtiene los datos por zona
     */
    const fetchZoneData = useCallback(async () => {
        try {
            setZoneError(null);
            const response = await airQualityService.getByZone();
            setZoneData(response);
        } catch (err) {
            console.error('Error fetching zone data:', err);
            setZoneError(err.message);
        } finally {
            setZoneLoading(false);
        }
    }, []);

    /**
     * Refresca todos los datos manualmente
     */
    const refresh = useCallback(async () => {
        setLoading(true);
        setZoneLoading(true);
        await Promise.all([fetchData(), fetchZoneData()]);
    }, [fetchData, fetchZoneData]);

    // Efecto inicial y auto-refresh
    useEffect(() => {
        fetchData();
        fetchZoneData();

        if (autoRefresh) {
            const interval = setInterval(() => {
                fetchData();
                fetchZoneData();
            }, refreshInterval);

            return () => clearInterval(interval);
        }
    }, [fetchData, fetchZoneData, autoRefresh, refreshInterval]);

    // Datos derivados
    const latestReading = data && data.length > 0 ? data[data.length - 1] : null;
    const isLoading = loading || zoneLoading;
    const hasError = error || zoneError;

    return {
        // Datos principales
        data,
        zoneData,
        latestReading,
        
        // Estados de carga
        loading,
        zoneLoading,
        isLoading,
        
        // Errores
        error,
        zoneError,
        hasError,
        
        // Metadatos
        dataSource,
        collectorStatus,
        lastUpdate,
        
        // Funciones
        refresh,
        fetchData,
        fetchZoneData,
    };
};

export default useAirQuality;
