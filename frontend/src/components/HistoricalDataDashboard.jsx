/**
 * HistoricalDataDashboard - Dashboard de datos históricos
 * 
 * 🆕 MEJORAS:
 * - Responsive design completo
 * - Accesibilidad mejorada
 * - Layout adaptativo para móviles
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
        infoMessage, // 🆕 Mensaje informativo del servidor
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

    return (
        <div 
            className="bg-white rounded-lg shadow-lg p-3 sm:p-4 md:p-6 animate-fade-in"
            role="region"
            aria-label="Dashboard de datos históricos"
        >
            {/* Header */}
            <header className="mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">
                    Datos Históricos de Calidad del Aire
                </h2>

                {/* Filtros */}
                <div className="space-y-3 sm:space-y-4">
                    {/* Selector de fechas */}
                    <DateRangeSelector
                        dateRange={dateRange}
                        onStartChange={setStartDate}
                        onEndChange={setEndDate}
                        timeScale={timeScale}
                        onScaleChange={setTimeScale}
                    />

                    {/* Selector de contaminantes */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="text-gray-600 text-xs sm:text-sm font-medium">
                            Contaminantes:
                        </span>
                        <PollutantSelector
                            selectedPollutants={selectedPollutants}
                            onToggle={togglePollutant}
                        />
                    </div>
                </div>

                {/* Botones de acción - Grid responsive */}
                <div 
                    className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mt-3 sm:mt-4"
                    role="toolbar"
                    aria-label="Acciones de datos históricos"
                >
                    <Button
                        variant="primary"
                        icon={<RefreshCw size={16} aria-hidden="true" />}
                        onClick={handleUpdateData}
                        loading={loading}
                        className="col-span-2 sm:col-span-1"
                        ariaLabel={loading ? 'Cargando datos' : 'Actualizar datos históricos'}
                    >
                        <span className="hidden sm:inline">{loading ? 'Cargando...' : 'Actualizar Datos'}</span>
                        <span className="sm:hidden">{loading ? 'Cargando...' : 'Actualizar'}</span>
                    </Button>
                    
                    <Button
                        variant="secondary"
                        icon={<Map size={16} aria-hidden="true" />}
                        onClick={toggleMap}
                        className="bg-purple-600 hover:bg-purple-700"
                        ariaLabel={showMap ? 'Ocultar mapa de zonas' : 'Mostrar mapa de zonas'}
                    >
                        <span className="hidden sm:inline">{showMap ? 'Ocultar Mapa' : 'Mostrar Mapa'}</span>
                        <span className="sm:hidden">Mapa</span>
                    </Button>
                    
                    <Button
                        variant={showComparator ? 'primary' : 'secondary'}
                        icon={<GitCompare size={16} aria-hidden="true" />}
                        onClick={toggleComparator}
                        className={showComparator ? 'bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700'}
                        ariaLabel={showComparator ? 'Ocultar comparador de períodos' : 'Abrir comparador de períodos'}
                    >
                        <span className="hidden sm:inline">{showComparator ? 'Ocultar Comparador' : 'Comparar'}</span>
                        <span className="sm:hidden">Comparar</span>
                    </Button>
                    
                    <Button
                        variant="success"
                        icon={<Download size={16} aria-hidden="true" />}
                        onClick={exportToCSV}
                        disabled={!historicalData?.length || loading}
                        ariaLabel="Exportar datos en formato CSV"
                    >
                        <span className="hidden sm:inline">Exportar CSV</span>
                        <span className="sm:hidden">CSV</span>
                    </Button>
                    
                    <Button
                        variant="secondary"
                        icon={<Download size={16} aria-hidden="true" />}
                        onClick={exportToJSON}
                        disabled={!historicalData?.length || loading}
                        className="hidden sm:flex"
                        ariaLabel="Exportar datos en formato JSON"
                    >
                        Exportar JSON
                    </Button>
                </div>
            </header>

            {/* Mensaje de error */}
            {error && (
                <div 
                    className="mb-3 sm:mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm"
                    role="alert"
                >
                    <AlertCircle size={20} aria-hidden="true" className="flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* 🆕 Mensaje informativo (no es error) */}
            {!error && infoMessage && (
                <div 
                    className="mb-3 sm:mb-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-blue-700 text-sm"
                    role="status"
                >
                    <span className="text-lg" aria-hidden="true">ℹ️</span>
                    <span>{infoMessage}</span>
                </div>
            )}

            {/* Loading inicial */}
            {loading && (!historicalData || historicalData.length === 0) && (
                <div 
                    className="flex items-center justify-center py-8 sm:py-12"
                    role="status"
                    aria-label="Cargando datos históricos"
                >
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
                            className="mb-4 sm:mb-6"
                        />
                    )}

                    {/* Gráfica principal */}
                    {historicalData && historicalData.length > 0 ? (
                        <div className="mb-4 sm:mb-6">
                            <HistoricalChart
                                data={historicalData}
                                selectedPollutants={selectedPollutants}
                                timeScale={timeScale}
                            />
                        </div>
                    ) : (
                        /* Mensaje si no hay datos */
                        !error && (
                            <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg mb-4 sm:mb-6">
                                <div className="text-4xl sm:text-6xl mb-3 sm:mb-4" aria-hidden="true">📊</div>
                                <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
                                    No hay datos para el rango seleccionado
                                </h3>
                                <p className="text-gray-500 mb-4 text-sm sm:text-base px-4">
                                    Ajusta las fechas o haz clic en "Actualizar Datos" para obtener información.
                                </p>
                                <Button 
                                    variant="primary" 
                                    onClick={handleUpdateData}
                                    ariaLabel="Cargar datos históricos"
                                >
                                    Cargar Datos
                                </Button>
                            </div>
                        )
                    )}
                </>
            )}

            {/* Mapa de distribución por zonas */}
            {showMap && (
                <section 
                    className="mt-4 sm:mt-6"
                    aria-label="Mapa de distribución por zonas"
                >
                    {calculatedZoneStats ? (
                        <ZoneDistributionMap
                            zoneStatistics={calculatedZoneStats}
                            osmAnalysis={osmAnalysis}
                            loadingOSM={osmLoading}
                            isVisible={isVisible}
                        />
                    ) : (
                        <div className="bg-gray-100 rounded-lg p-6 sm:p-8 text-center">
                            <div className="text-3xl sm:text-4xl mb-2 sm:mb-3" aria-hidden="true">🗺️</div>
                            <p className="text-gray-600 text-sm sm:text-base">
                                {osmLoading 
                                    ? 'Cargando análisis de zonas...'
                                    : 'Carga datos históricos para ver la distribución por zonas'
                                }
                            </p>
                        </div>
                    )}
                </section>
            )}

            {/* Comparador de Períodos */}
            {showComparator && (
                <section 
                    className="mt-4 sm:mt-6"
                    aria-label="Comparador de períodos"
                >
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
                    />
                </section>
            )}

            {/* Información sobre los datos */}
            <InfoCard
                title="Información sobre los datos"
                type="info"
                icon="ℹ️"
                className="mt-4 sm:mt-6"
            >
                <ul className="space-y-1 text-xs sm:text-sm">
                    <li>• Los datos históricos provienen de Open Meteo y la base de datos local</li>
                    <li>• La distribución por zonas usa datos reales de infraestructura vial de OpenStreetMap</li>
                    <li className="hidden sm:list-item">• Los factores de contaminación se calculan basándose en densidad vial, tipos de vías y uso de suelo</li>
                    <li className="hidden sm:list-item">• Esta metodología proporciona estimaciones más precisas y basadas en evidencia</li>
                </ul>
            </InfoCard>
        </div>
    );
};

export default HistoricalDataDashboard;
