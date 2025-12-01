/**
 * Hook personalizado para datos meteorológicos
 * Fase 4 - Optimización: Lógica reutilizable
 */

import { useState, useEffect, useCallback } from 'react';
import { weatherService } from '../services/api';
import { UPDATE_INTERVALS } from '../utils/constants';

/**
 * Hook para obtener datos meteorológicos
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.autoRefresh - Activar actualización automática (default: true)
 * @param {number} options.refreshInterval - Intervalo de actualización en ms (default: 5 min)
 * @returns {Object} Estado y funciones del hook
 */
const useWeather = (options = {}) => {
    const {
        autoRefresh = true,
        refreshInterval = UPDATE_INTERVALS.weather,
    } = options;

    // Estados
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    /**
     * Obtiene los datos meteorológicos
     */
    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const response = await weatherService.getCurrent();
            setData(response);
            setLastUpdate(new Date());
        } catch (err) {
            console.error('Error fetching weather data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Refresca los datos manualmente
     */
    const refresh = useCallback(async () => {
        setLoading(true);
        await fetchData();
    }, [fetchData]);

    // Efecto inicial y auto-refresh
    useEffect(() => {
        fetchData();

        if (autoRefresh) {
            const interval = setInterval(fetchData, refreshInterval);
            return () => clearInterval(interval);
        }
    }, [fetchData, autoRefresh, refreshInterval]);

    // Datos derivados útiles
    const temperature = data?.temperature ?? null;
    const humidity = data?.humidity ?? null;
    const windSpeed = data?.wind_speed ?? null;
    const cloudCover = data?.cloud_cover ?? null;

    return {
        // Datos principales
        data,
        temperature,
        humidity,
        windSpeed,
        cloudCover,
        
        // Estados
        loading,
        error,
        lastUpdate,
        
        // Funciones
        refresh,
        fetchData,
    };
};

export default useWeather;
