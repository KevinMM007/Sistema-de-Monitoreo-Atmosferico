/**
 * Hook personalizado para datos históricos
 * Fase 4 - Optimización: Lógica reutilizable
 * 
 * 🆕 MEJORAS:
 * - Mejor manejo de errores de red
 * - Timeout en el frontend para evitar esperas largas
 * - Mensajes de error más claros para el usuario
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { airQualityService, zoneService } from '../services/api';
import { HISTORICAL_CONFIG } from '../utils/constants';

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD
 */
const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

/**
 * Obtiene la fecha de hace N días en formato YYYY-MM-DD
 */
const getPastDate = (daysAgo) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
};

/**
 * Traduce errores técnicos a mensajes amigables para el usuario
 */
const getErrorMessage = (error) => {
    const errorStr = error?.message || String(error);
    
    // Errores de red/CORS
    if (errorStr.includes('Failed to fetch') || errorStr.includes('NetworkError')) {
        return 'Error de conexión con el servidor. Por favor, intenta de nuevo en unos segundos.';
    }
    
    // Errores de timeout
    if (errorStr.includes('timeout') || errorStr.includes('Timeout')) {
        return 'La consulta tardó demasiado. Intenta con un rango de fechas más pequeño.';
    }
    
    // Errores 502/503
    if (errorStr.includes('502') || errorStr.includes('503') || errorStr.includes('Bad Gateway')) {
        return 'El servidor está temporalmente ocupado. Intenta de nuevo en unos segundos.';
    }
    
    // Errores de rango de fechas
    if (errorStr.includes('rango máximo') || errorStr.includes('1 año')) {
        return 'El rango máximo permitido es de 1 año. Por favor, reduce el rango de fechas.';
    }
    
    // Error genérico
    return errorStr || 'Error al obtener datos históricos';
};

/**
 * Hook para obtener y gestionar datos históricos
 */
const useHistoricalData = (options = {}) => {
    const {
        initialStart = getPastDate(HISTORICAL_CONFIG?.defaultDays || 30),
        initialEnd = getTodayDate(),
        initialScale = 'daily',
        autoFetch = true,
    } = options;

    // Refs para acceso estable a los valores actuales
    const isMounted = useRef(true);
    const latestDateRange = useRef({ start: initialStart, end: initialEnd });
    const latestTimeScale = useRef(initialScale);
    const abortControllerRef = useRef(null);

    // Estados de filtros
    const [dateRange, setDateRangeState] = useState({
        start: initialStart,
        end: initialEnd,
    });
    const [timeScale, setTimeScaleState] = useState(initialScale);
    const [selectedPollutants, setSelectedPollutants] = useState(['pm25', 'pm10', 'no2']);

    // Estados de datos
    const [data, setData] = useState([]);
    const [statistics, setStatistics] = useState(null);
    const [zoneStatistics, setZoneStatistics] = useState(null);
    const [osmAnalysis, setOsmAnalysis] = useState(null);

    // Estados de carga
    const [loading, setLoading] = useState(false);
    const [osmLoading, setOsmLoading] = useState(false);

    // Estados de error
    const [error, setError] = useState(null);
    const [osmError, setOsmError] = useState(null);
    
    // 🆕 Mensaje informativo (no es error, pero es información útil)
    const [infoMessage, setInfoMessage] = useState(null);

    // Metadatos
    const [metadata, setMetadata] = useState(null);

    // Actualizar refs cuando cambian los estados
    useEffect(() => {
        latestDateRange.current = dateRange;
    }, [dateRange]);

    useEffect(() => {
        latestTimeScale.current = timeScale;
    }, [timeScale]);

    // Cleanup al desmontar
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            // Cancelar request pendiente
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    /**
     * Wrapper para setDateRange que también actualiza el ref
     */
    const setDateRange = useCallback((newRange) => {
        if (typeof newRange === 'function') {
            setDateRangeState(prev => {
                const updated = newRange(prev);
                latestDateRange.current = updated;
                return updated;
            });
        } else {
            latestDateRange.current = newRange;
            setDateRangeState(newRange);
        }
    }, []);

    /**
     * Wrapper para setTimeScale que también actualiza el ref
     */
    const setTimeScale = useCallback((newScale) => {
        latestTimeScale.current = newScale;
        setTimeScaleState(newScale);
    }, []);

    /**
     * Valida el rango de fechas
     */
    const validateDateRange = useCallback((start, end) => {
        if (!start || !end) {
            return { valid: false, error: 'Las fechas son requeridas.' };
        }

        const startDate = new Date(start);
        const endDate = new Date(end);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return { valid: false, error: 'Formato de fecha inválido.' };
        }

        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (endDate < startDate) {
            return { valid: false, error: 'La fecha de fin debe ser posterior a la fecha de inicio.' };
        }

        const maxDays = HISTORICAL_CONFIG?.maxDays || 365;
        if (diffDays > maxDays) {
            return { 
                valid: false, 
                error: `El rango máximo permitido es de ${maxDays} días (1 año).` 
            };
        }

        return { valid: true, error: null };
    }, []);

    /**
     * Obtiene datos históricos
     * 🆕 MEJORADO: Mejor manejo de errores y timeout
     */
    const fetchData = useCallback(async (customRange = null, customScale = null) => {
        // Usar refs para obtener los valores más actuales, o los personalizados si se proporcionan
        const rangeToUse = customRange || latestDateRange.current;
        const scaleToUse = customScale || latestTimeScale.current;

        console.log('📊 [useHistoricalData] fetchData llamado:', {
            rangeToUse,
            scaleToUse,
            customRange,
            customScale
        });

        // Validar que tenemos fechas válidas
        if (!rangeToUse?.start || !rangeToUse?.end) {
            console.error('❌ [useHistoricalData] Fechas no válidas:', rangeToUse);
            setError('Las fechas son requeridas para consultar datos históricos.');
            return null;
        }

        // Validar formato de fechas
        const validation = validateDateRange(rangeToUse.start, rangeToUse.end);
        if (!validation.valid) {
            console.error('❌ [useHistoricalData] Validación fallida:', validation.error);
            setError(validation.error);
            return null;
        }

        // Cancelar request anterior si existe
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        setLoading(true);
        setError(null);
        setInfoMessage(null);

        try {
            console.log(`🔍 [useHistoricalData] Llamando API: ${rangeToUse.start} a ${rangeToUse.end}, escala: ${scaleToUse}`);
            
            // 🆕 Agregar timeout de 25 segundos para evitar esperas largas
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('timeout')), 25000);
            });
            
            const fetchPromise = airQualityService.getHistorical(
                rangeToUse.start,
                rangeToUse.end,
                scaleToUse
            );
            
            const response = await Promise.race([fetchPromise, timeoutPromise]);

            console.log('✅ [useHistoricalData] Respuesta:', {
                dataLength: response?.data?.length || 0,
                hasStatistics: !!response?.statistics,
                metadata: response?.metadata,
                message: response?.message
            });

            if (isMounted.current) {
                setData(response?.data || []);
                setStatistics(response?.statistics || null);
                setMetadata(response?.metadata || null);
                
                // 🆕 Mostrar mensaje informativo si viene del servidor
                if (response?.message) {
                    setInfoMessage(response.message);
                } else if (response?.data?.length === 0) {
                    setInfoMessage('No hay datos disponibles para este rango de fechas. Los datos históricos se acumulan con el uso del sistema.');
                } else {
                    setInfoMessage(null);
                }
            }

            return response;
        } catch (err) {
            console.error('❌ [useHistoricalData] Error:', err);
            if (isMounted.current) {
                // 🆕 Usar función de traducción de errores
                const friendlyError = getErrorMessage(err);
                setError(friendlyError);
                setData([]);
                setStatistics(null);
            }
            return null;
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
        }
    }, [validateDateRange]);

    /**
     * Obtiene análisis de OpenStreetMap
     */
    const fetchOSMAnalysis = useCallback(async () => {
        console.log('🗺️ [useHistoricalData] Cargando análisis OSM...');
        setOsmLoading(true);
        setOsmError(null);

        try {
            const response = await zoneService.getOSMAnalysis();
            console.log('✅ [useHistoricalData] OSM cargado:', response?.zones?.length || 0, 'zonas');
            
            if (isMounted.current) {
                setOsmAnalysis(response);
            }
            return response;
        } catch (err) {
            console.error('❌ [useHistoricalData] Error OSM:', err);
            if (isMounted.current) {
                setOsmError(getErrorMessage(err));
            }
            return null;
        } finally {
            if (isMounted.current) {
                setOsmLoading(false);
            }
        }
    }, []);

    /**
     * Actualiza el rango de fechas
     */
    const updateDateRange = useCallback((start, end) => {
        console.log('📅 [useHistoricalData] Actualizando rango:', { start, end });
        setDateRange({ start, end });
    }, [setDateRange]);

    /**
     * Actualiza la fecha de inicio
     */
    const setStartDate = useCallback((start) => {
        console.log('📅 [useHistoricalData] Actualizando fecha inicio:', start);
        setDateRange(prev => ({ ...prev, start }));
    }, [setDateRange]);

    /**
     * Actualiza la fecha de fin
     */
    const setEndDate = useCallback((end) => {
        console.log('📅 [useHistoricalData] Actualizando fecha fin:', end);
        setDateRange(prev => ({ ...prev, end }));
    }, [setDateRange]);

    /**
     * Alterna un contaminante en la selección
     */
    const togglePollutant = useCallback((pollutant) => {
        setSelectedPollutants(prev => {
            if (prev.includes(pollutant)) {
                return prev.filter(p => p !== pollutant);
            } else {
                return [...prev, pollutant];
            }
        });
    }, []);

    /**
     * Exporta datos a CSV
     */
    const exportToCSV = useCallback(() => {
        if (!data || data.length === 0) {
            console.warn('⚠️ [useHistoricalData] No hay datos para exportar');
            return null;
        }

        const headers = ['timestamp', ...selectedPollutants];
        const rows = data.map(item => 
            [item.timestamp, ...selectedPollutants.map(p => item[p] ?? '')].join(',')
        );

        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `calidad-aire-${latestDateRange.current.start}-${latestDateRange.current.end}.csv`;
        link.click();

        URL.revokeObjectURL(url);
        console.log('✅ [useHistoricalData] CSV exportado');
        return csv;
    }, [data, selectedPollutants]);

    /**
     * Exporta datos a JSON
     */
    const exportToJSON = useCallback(() => {
        if (!data || data.length === 0) {
            console.warn('⚠️ [useHistoricalData] No hay datos para exportar');
            return null;
        }

        const exportData = {
            dateRange: latestDateRange.current,
            timeScale: latestTimeScale.current,
            statistics,
            data: data.map(item => {
                const filtered = { timestamp: item.timestamp };
                selectedPollutants.forEach(p => {
                    filtered[p] = item[p];
                });
                return filtered;
            }),
        };

        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `calidad-aire-${latestDateRange.current.start}-${latestDateRange.current.end}.json`;
        link.click();

        URL.revokeObjectURL(url);
        console.log('✅ [useHistoricalData] JSON exportado');
        return json;
    }, [data, selectedPollutants, statistics]);

    /**
     * Refresca todos los datos
     */
    const refresh = useCallback(async () => {
        console.log('🔄 [useHistoricalData] Refrescando todos los datos...');
        await Promise.all([fetchData(), fetchOSMAnalysis()]);
    }, [fetchData, fetchOSMAnalysis]);
    
    /**
     * 🆕 Limpia el error actual
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Efecto para cargar datos iniciales si autoFetch está habilitado
    useEffect(() => {
        if (autoFetch) {
            console.log('🚀 [useHistoricalData] AutoFetch habilitado, cargando datos iniciales...');
            fetchData();
            fetchOSMAnalysis();
        }
    }, []); // Solo ejecutar una vez al montar

    // Datos derivados
    const hasData = data && data.length > 0;
    const isLoading = loading || osmLoading;
    const hasError = error || osmError;
    const recordCount = data?.length || 0;

    return {
        // Filtros
        dateRange,
        timeScale,
        selectedPollutants,
        
        // Setters de filtros
        setDateRange,
        updateDateRange,
        setStartDate,
        setEndDate,
        setTimeScale,
        setSelectedPollutants,
        togglePollutant,
        
        // Datos
        data,
        statistics,
        zoneStatistics,
        osmAnalysis,
        metadata,
        
        // Datos derivados
        hasData,
        recordCount,
        
        // Estados de carga
        loading,
        osmLoading,
        isLoading,
        
        // Errores
        error,
        osmError,
        hasError,
        clearError,
        
        // 🆕 Mensaje informativo
        infoMessage,
        
        // Validación
        validateDateRange,
        
        // Funciones
        fetchData,
        fetchOSMAnalysis,
        refresh,
        exportToCSV,
        exportToJSON,
    };
};

export default useHistoricalData;
