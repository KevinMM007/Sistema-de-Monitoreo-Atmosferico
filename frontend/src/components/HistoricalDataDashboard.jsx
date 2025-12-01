/**
 * HistoricalDataDashboard - Dashboard de datos históricos
 * Fase 4 - Refactorizado: Usando hooks y componentes centralizados
 * 
 * CORREGIDO: Carga de datos más robusta
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Download, Map, GitCompare, AlertCircle, RefreshCw } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Hooks personalizados
import { useHistoricalData, useComparison, useMapVisibility } from '../hooks';

// Componentes comunes
import { Card, Button, LoadingSpinner, InfoCard } from './common';

// Componentes de datos históricos
import {
    DateRangeSelector,
    PollutantSelector,
    StatisticsGrid,
    HistoricalChart,
    PeriodComparator,
    ZoneDistributionMap,
} from './historical';

// Constantes
import { XALAPA_ZONES, POLLUTANT_INFO } from '../utils';

/**
 * Componente principal del Dashboard de Datos Históricos
 */
const HistoricalDataDashboard = ({ isVisible = true }) => {
    // Estados locales de UI
    const [showMap, setShowMap] = useState(true);
    const [showComparator, setShowComparator] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // Hook para manejar visibilidad del mapa
    useMapVisibility(isVisible);

    // Hook de datos históricos con autoFetch deshabilitado para control manual
    const {
        dateRange,
        setStartDate,
        setEndDate,
        timeScale,
        setTimeScale,
        selectedPollutants,
        togglePollutant,
        data: historicalData,
        statistics,
        zoneStatistics,
        osmAnalysis,
        loading,
        osmLoading,
        error,
        fetchData,
        fetchOSMAnalysis,
        exportToCSV,
        exportToJSON,
    } = useHistoricalData({ autoFetch: false });

    // Hook de comparación
    const comparison = useComparison();

    // Cargar datos al montar el componente
    useEffect(() => {
        if (!isInitialized && isVisible) {
            console.log('🚀 [HistoricalDataDashboard] Inicializando y cargando datos...');
            setIsInitialized(true);
            
            // Cargar datos con el rango actual
            fetchData();
            fetchOSMAnalysis();
        }
    }, [isInitialized, isVisible, fetchData, fetchOSMAnalysis]);

    // Cargar comparación cuando se muestra el comparador
    useEffect(() => {
        if (showComparator && !comparison.data && !comparison.loading) {
            comparison.fetchWithPreset('this-month-last-month');
        }
    }, [showComparator]);

    // Calcular estadísticas por zona cuando hay datos
    const [calculatedZoneStats, setCalculatedZoneStats] = useState(null);

    useEffect(() => {
        if (statistics && osmAnalysis && historicalData && historicalData.length > 0) {
            const zoneStats = calculateZoneStatistics(statistics, osmAnalysis);
            setCalculatedZoneStats(zoneStats);
        } else {
            setCalculatedZoneStats(null);
        }
    }, [statistics, osmAnalysis, historicalData]);

    // Función para calcular estadísticas por zona
    const calculateZoneStatistics = useCallback((globalStats, osmData) => {
        if (!globalStats || !osmData) return null;

        const requiredPollutants = ['pm25', 'pm10', 'no2', 'o3', 'co'];
        const hasAllStats = requiredPollutants.every(p => 
            globalStats[p] && typeof globalStats[p].avg !== 'undefined'
        );

        if (!hasAllStats) return null;

        const zoneStats = {};
        
        XALAPA_ZONES.forEach((zone) => {
            let pollutionFactor = 1.0;
            
            if (osmData?.zones) {
                const osmZone = osmData.zones.find(z => z.zone_name === zone.name);
                if (osmZone?.pollution_factor) {
                    pollutionFactor = osmZone.pollution_factor;
                }
            }
            
            const applyFactor = (value, factor, sensitivity = 1.0) => {
                if (typeof value !== 'number' || isNaN(value)) return 0;
                const deviation = (factor - 1.0) * sensitivity;
                return value * (1.0 + deviation);
            };
            
            zoneStats[zone.name] = {
                pm25: {
                    avg: applyFactor(globalStats.pm25?.avg || 0, pollutionFactor, 1.0),
                    max: applyFactor(globalStats.pm25?.max || 0, pollutionFactor, 0.8),
                    min: applyFactor(globalStats.pm25?.min || 0, pollutionFactor, 0.5)
                },
                pm10: {
                    avg: applyFactor(globalStats.pm10?.avg || 0, pollutionFactor, 0.9),
                    max: applyFactor(globalStats.pm10?.max || 0, pollutionFactor, 0.7),
                    min: applyFactor(globalStats.pm10?.min || 0, pollutionFactor, 0.4)
                },
                no2: {
                    avg: applyFactor(globalStats.no2?.avg || 0, pollutionFactor, 1.2),
                    max: applyFactor(globalStats.no2?.max || 0, pollutionFactor, 1.0),
                    min: applyFactor(globalStats.no2?.min || 0, pollutionFactor, 0.6)
                },
                o3: {
                    avg: applyFactor(globalStats.o3?.avg || 0, 2.0 - pollutionFactor, 0.8),
                    max: applyFactor(globalStats.o3?.max || 0, 2.0 - pollutionFactor, 0.6),
                    min: applyFactor(globalStats.o3?.min || 0, 2.0 - pollutionFactor, 0.4)
                },
                co: {
                    avg: applyFactor(globalStats.co?.avg || 0, pollutionFactor, 0.8),
                    max: applyFactor(globalStats.co?.max || 0, pollutionFactor, 0.6),
                    min: applyFactor(globalStats.co?.min || 0, pollutionFactor, 0.4)
                },
                pollutionFactor
            };
        });

        return zoneStats;
    }, []);

    // Toggle handlers
    const toggleMap = useCallback(() => setShowMap(prev => !prev), []);
    const toggleComparator = useCallback(() => setShowComparator(prev => !prev), []);

    // Handler para actualizar datos
    const handleUpdateData = useCallback(async () => {
        console.log('🔄 [HistoricalDataDashboard] Actualizando datos manualmente...', dateRange);
        await fetchData();
        if (!osmAnalysis) {
            await fetchOSMAnalysis();
        }
    }, [fetchData, fetchOSMAnalysis, osmAnalysis, dateRange]);

    // Debug: mostrar estado actual
    console.log('📊 [HistoricalDataDashboard] Estado actual:', {
        loading,
        hasData: historicalData?.length || 0,
        dateRange,
        error
    });

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 animate-fade-in">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold mb-4">Datos Históricos de Calidad del Aire</h2>

                {/* Filtros */}
                <div className="space-y-4">
                    {/* Selector de fechas */}
                    <DateRangeSelector
                        dateRange={dateRange}
                        onStartChange={setStartDate}
                        onEndChange={setEndDate}
                        timeScale={timeScale}
                        onScaleChange={setTimeScale}
                    />

                    {/* Selector de contaminantes */}
                    <div>
                        <span className="text-gray-600 text-sm font-medium mr-3">Contaminantes:</span>
                        <PollutantSelector
                            selectedPollutants={selectedPollutants}
                            onToggle={togglePollutant}
                        />
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="flex flex-wrap gap-2 mt-4">
                    <Button
                        variant="primary"
                        icon={<RefreshCw size={16} />}
                        onClick={handleUpdateData}
                        loading={loading}
                    >
                        {loading ? 'Cargando...' : 'Actualizar Datos'}
                    </Button>
                    
                    <Button
                        variant="secondary"
                        icon={<Map size={16} />}
                        onClick={toggleMap}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        {showMap ? 'Ocultar Mapa' : 'Mostrar Mapa'}
                    </Button>
                    
                    <Button
                        variant={showComparator ? 'primary' : 'secondary'}
                        icon={<GitCompare size={16} />}
                        onClick={toggleComparator}
                        className={showComparator ? 'bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700'}
                    >
                        {showComparator ? 'Ocultar Comparador' : 'Comparar Períodos'}
                    </Button>
                    
                    <Button
                        variant="success"
                        icon={<Download size={16} />}
                        onClick={exportToCSV}
                        disabled={!historicalData?.length || loading}
                    >
                        Exportar CSV
                    </Button>
                    
                    <Button
                        variant="secondary"
                        icon={<Download size={16} />}
                        onClick={exportToJSON}
                        disabled={!historicalData?.length || loading}
                    >
                        Exportar JSON
                    </Button>
                </div>
            </div>

            {/* Mensaje de error */}
            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {/* Loading inicial */}
            {loading && (!historicalData || historicalData.length === 0) && (
                <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="xl" text="Cargando datos históricos..." />
                </div>
            )}

            {/* Contenido principal */}
            {!loading && (
                <>
                    {/* Estadísticas */}
                    {statistics && Object.keys(statistics).length > 0 && (
                        <StatisticsGrid
                            statistics={statistics}
                            historicalData={historicalData}
                            selectedPollutants={selectedPollutants}
                            className="mb-6"
                        />
                    )}

                    {/* Gráfica principal */}
                    {historicalData && historicalData.length > 0 ? (
                        <HistoricalChart
                            data={historicalData}
                            selectedPollutants={selectedPollutants}
                            timeScale={timeScale}
                            className="mb-6"
                        />
                    ) : (
                        /* Mensaje si no hay datos */
                        !error && (
                            <div className="text-center py-12 bg-gray-50 rounded-lg mb-6">
                                <div className="text-6xl mb-4">📊</div>
                                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                                    No hay datos para el rango seleccionado
                                </h3>
                                <p className="text-gray-500 mb-4">
                                    Ajusta las fechas o haz clic en "Actualizar Datos" para obtener información.
                                </p>
                                <Button variant="primary" onClick={handleUpdateData}>
                                    Cargar Datos
                                </Button>
                            </div>
                        )
                    )}
                </>
            )}

            {/* Comparador de Períodos */}
            {showComparator && (
                <PeriodComparator
                    dateRange1={comparison.dateRange1}
                    dateRange2={comparison.dateRange2}
                    setDateRange1={comparison.setDateRange1}
                    setDateRange2={comparison.setDateRange2}
                    activePreset={comparison.activePreset}
                    data={comparison.data}
                    loading={comparison.loading}
                    fetchWithPreset={comparison.fetchWithPreset}
                    fetchWithCustomDates={comparison.fetchWithCustomDates}
                    className="mt-6"
                />
            )}

            {/* Mapa de distribución por zonas */}
            {showMap && (
                <div className="mb-6">
                    {calculatedZoneStats ? (
                        <ZoneDistributionMap
                            zoneStatistics={calculatedZoneStats}
                            osmAnalysis={osmAnalysis}
                            loadingOSM={osmLoading}
                            isVisible={isVisible}
                        />
                    ) : (
                        <div className="bg-gray-100 rounded-lg p-8 text-center">
                            <div className="text-4xl mb-3">🗺️</div>
                            <p className="text-gray-600">
                                {osmLoading 
                                    ? 'Cargando análisis de zonas...'
                                    : 'Carga datos históricos para ver la distribución por zonas'
                                }
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Información sobre los datos */}
            <InfoCard
                title="Información sobre los datos"
                type="info"
                icon="ℹ️"
                className="mt-6"
            >
                <ul className="space-y-1">
                    <li>• Los datos históricos provienen de Open Meteo y la base de datos local</li>
                    <li>• La distribución por zonas usa datos reales de infraestructura vial de OpenStreetMap</li>
                    <li>• Los factores de contaminación se calculan basándose en densidad vial, tipos de vías y uso de suelo</li>
                    <li>• Esta metodología proporciona estimaciones más precisas y basadas en evidencia</li>
                </ul>
            </InfoCard>
        </div>
    );
};

export default HistoricalDataDashboard;
