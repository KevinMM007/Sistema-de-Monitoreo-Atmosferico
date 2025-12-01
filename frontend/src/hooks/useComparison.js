/**
 * Hook personalizado para comparación de períodos
 * Fase 4 - Optimización: Lógica reutilizable
 * 
 * CORREGIDO: Uso de refs para evitar stale closures
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { comparisonService } from '../services/api';
import { COMPARISON_PRESETS } from '../utils/constants';

/**
 * Hook para comparar períodos de calidad del aire
 */
const useComparison = (options = {}) => {
    const {
        initialPreset = 'today-yesterday',
        autoFetch = false,
    } = options;

    // Refs para mantener valores actualizados
    const dateRange1Ref = useRef({ start: '', end: '' });
    const dateRange2Ref = useRef({ start: '', end: '' });

    // Estados de períodos
    const [dateRange1, setDateRange1State] = useState({ start: '', end: '' });
    const [dateRange2, setDateRange2State] = useState({ start: '', end: '' });
    const [activePreset, setActivePreset] = useState(initialPreset);

    // Estados de datos
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Visibilidad del comparador
    const [isVisible, setIsVisible] = useState(false);

    // Actualizar refs cuando cambian los estados
    useEffect(() => {
        dateRange1Ref.current = dateRange1;
    }, [dateRange1]);

    useEffect(() => {
        dateRange2Ref.current = dateRange2;
    }, [dateRange2]);

    /**
     * Wrapper para setDateRange1 que actualiza tanto estado como ref
     */
    const setDateRange1 = useCallback((value) => {
        if (typeof value === 'function') {
            setDateRange1State(prev => {
                const newValue = value(prev);
                dateRange1Ref.current = newValue;
                return newValue;
            });
        } else {
            dateRange1Ref.current = value;
            setDateRange1State(value);
        }
    }, []);

    /**
     * Wrapper para setDateRange2 que actualiza tanto estado como ref
     */
    const setDateRange2 = useCallback((value) => {
        if (typeof value === 'function') {
            setDateRange2State(prev => {
                const newValue = value(prev);
                dateRange2Ref.current = newValue;
                return newValue;
            });
        } else {
            dateRange2Ref.current = value;
            setDateRange2State(value);
        }
    }, []);

    /**
     * Inicializa las fechas por defecto (hoy y ayer)
     */
    const initializeDates = useCallback(() => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const range1 = {
            start: today.toISOString().split('T')[0],
            end: today.toISOString().split('T')[0],
        };
        const range2 = {
            start: yesterday.toISOString().split('T')[0],
            end: yesterday.toISOString().split('T')[0],
        };

        setDateRange1(range1);
        setDateRange2(range2);
    }, [setDateRange1, setDateRange2]);

    /**
     * Obtiene la comparación usando un preset
     */
    const fetchWithPreset = useCallback(async (preset) => {
        console.log('🔄 [useComparison] Comparando con preset:', preset);
        setLoading(true);
        setError(null);
        setActivePreset(preset);

        try {
            const response = await comparisonService.compare({ preset });
            console.log('✅ [useComparison] Respuesta preset:', response);
            setData(response);
            return response;
        } catch (err) {
            console.error('❌ [useComparison] Error:', err);
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Obtiene la comparación con fechas personalizadas
     * IMPORTANTE: Usa refs para obtener los valores más recientes
     */
    const fetchWithCustomDates = useCallback(async (customRange1 = null, customRange2 = null) => {
        // Usar los valores pasados o los refs (que siempre tienen los valores actuales)
        const range1 = customRange1 || dateRange1Ref.current;
        const range2 = customRange2 || dateRange2Ref.current;

        console.log('🔄 [useComparison] Comparando fechas personalizadas:', {
            range1,
            range2
        });

        if (!range1.start || !range1.end || !range2.start || !range2.end) {
            const errorMsg = 'Por favor selecciona todas las fechas para comparar.';
            console.error('❌ [useComparison]', errorMsg);
            setError(errorMsg);
            return null;
        }

        setLoading(true);
        setError(null);
        setActivePreset('custom');

        try {
            const response = await comparisonService.compare({
                start1: range1.start,
                end1: range1.end,
                start2: range2.start,
                end2: range2.end,
            });
            console.log('✅ [useComparison] Respuesta personalizada:', response);
            setData(response);
            return response;
        } catch (err) {
            console.error('❌ [useComparison] Error:', err);
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []); // Sin dependencias - usa refs internamente

    /**
     * Función genérica para comparar
     */
    const compare = useCallback(async (presetOrOptions = null) => {
        if (typeof presetOrOptions === 'string') {
            return await fetchWithPreset(presetOrOptions);
        } else if (presetOrOptions?.start1) {
            return await fetchWithCustomDates(
                { start: presetOrOptions.start1, end: presetOrOptions.end1 },
                { start: presetOrOptions.start2, end: presetOrOptions.end2 }
            );
        } else {
            return await fetchWithCustomDates();
        }
    }, [fetchWithPreset, fetchWithCustomDates]);

    /**
     * Cambia la visibilidad del comparador
     */
    const toggle = useCallback(() => {
        setIsVisible(prev => !prev);
    }, []);

    /**
     * Muestra el comparador
     */
    const show = useCallback(() => {
        setIsVisible(true);
    }, []);

    /**
     * Oculta el comparador
     */
    const hide = useCallback(() => {
        setIsVisible(false);
    }, []);

    /**
     * Resetea el comparador
     */
    const reset = useCallback(() => {
        initializeDates();
        setActivePreset('today-yesterday');
        setData(null);
        setError(null);
    }, [initializeDates]);

    /**
     * Actualiza el período 1
     */
    const setPeriod1 = useCallback((start, end) => {
        setDateRange1({ start, end });
    }, [setDateRange1]);

    /**
     * Actualiza el período 2
     */
    const setPeriod2 = useCallback((start, end) => {
        setDateRange2({ start, end });
    }, [setDateRange2]);

    // Efecto para inicializar fechas
    useEffect(() => {
        initializeDates();
    }, [initializeDates]);

    // Efecto para carga automática
    useEffect(() => {
        if (autoFetch) {
            fetchWithPreset(initialPreset);
        }
    }, [autoFetch, initialPreset, fetchWithPreset]);

    // Datos derivados
    const hasData = data !== null;
    const overallTrend = data?.overall_trend || null;
    const summary = data?.summary || null;
    const comparison = data?.comparison || {};
    const period1Info = data?.period1 || null;
    const period2Info = data?.period2 || null;

    // Helpers para tendencias
    const getTrendIcon = useCallback((trend) => {
        if (trend === 'up' || trend === 'worsened') return '📈';
        if (trend === 'down' || trend === 'improved') return '📉';
        return '➡️';
    }, []);

    const getTrendColor = useCallback((trend) => {
        if (trend === 'up' || trend === 'worsened') return 'text-red-600';
        if (trend === 'down' || trend === 'improved') return 'text-green-600';
        return 'text-gray-600';
    }, []);

    const getTrendBgColor = useCallback((trend) => {
        if (trend === 'improved') return 'bg-green-50 border-green-300';
        if (trend === 'worsened') return 'bg-red-50 border-red-300';
        if (trend === 'no_data') return 'bg-amber-50 border-amber-300';
        return 'bg-gray-50 border-gray-300';
    }, []);

    return {
        // Períodos
        dateRange1,
        dateRange2,
        setDateRange1,
        setDateRange2,
        setPeriod1,
        setPeriod2,
        
        // Preset activo
        activePreset,
        setActivePreset,
        presets: COMPARISON_PRESETS,
        
        // Datos
        data,
        comparison,
        period1Info,
        period2Info,
        overallTrend,
        summary,
        hasData,
        
        // Estados
        loading,
        error,
        isVisible,
        
        // Funciones principales
        compare,
        fetchWithPreset,
        fetchWithCustomDates,
        
        // Control de visibilidad
        toggle,
        show,
        hide,
        
        // Utilidades
        reset,
        initializeDates,
        
        // Helpers de tendencia
        getTrendIcon,
        getTrendColor,
        getTrendBgColor,
    };
};

export default useComparison;
