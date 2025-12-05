/**
 * AirQualityDashboard - Dashboard principal de calidad del aire
 * 
 * 🆕 MEJORAS IMPLEMENTADAS:
 * - Responsive design completo (móviles, tablets, desktop)
 * - Accesibilidad mejorada (aria-labels, roles)
 * - Altura del mapa adaptativa
 */

import React, { useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Hooks personalizados
import { useAirQuality, useWeather, useMapVisibility } from '../hooks';

// Componentes comunes
import { 
    Card, 
    Button,
    DataStatus, 
    TrafficDataIndicator,
    LoadingSpinner,
    ErrorState 
} from './common';

// Componentes del dashboard
import {
    MapLegend,
    MapBoundsHandler,
    WeatherCard,
    ZoneRectangle,
    PollutantChart,
    PollutantStats,
} from './dashboard';

// Utilidades y constantes
import { 
    XALAPA_ZONES, 
    MAP_CONFIG,
    generateReport 
} from '../utils';

/**
 * Componente de información del mapa (icono ℹ️)
 */
const MapInfoButton = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            {/* Botón de información */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-label="Información sobre los datos del mapa"
                className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    transition-all duration-200 shadow-md
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    ${isOpen 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                    }
                `}
            >
                <svg 
                    className="w-5 h-5" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                    aria-hidden="true"
                >
                    <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                    />
                </svg>
            </button>

            {/* Tarjeta de información */}
            {isOpen && (
                <>
                    {/* Overlay para cerrar al hacer clic afuera */}
                    <div 
                        className="fixed inset-0 z-[999]"
                        onClick={() => setIsOpen(false)}
                        aria-hidden="true"
                    />
                    
                    {/* Tarjeta - responsive width */}
                    <div className="absolute bottom-10 right-0 z-[1000] w-64 sm:w-72 animate-fade-in">
                        <div 
                            className="bg-white rounded-lg shadow-xl border border-gray-200 p-3 sm:p-4"
                            role="dialog"
                            aria-label="Información del mapa"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-2 sm:mb-3">
                                <h4 className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
                                    <span className="text-blue-500" aria-hidden="true">ℹ️</span>
                                    Información del Mapa
                                </h4>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors p-1
                                               focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                                    aria-label="Cerrar información"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            {/* Contenido */}
                            <div className="text-xs sm:text-sm text-gray-600 space-y-2">
                                <p>
                                    Los valores por zona incluyen ajustes basados en:
                                </p>
                                <ul className="space-y-1 ml-2 sm:ml-4">
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-500" aria-hidden="true">🟢</span>
                                        <span><strong>Tráfico en tiempo real</strong></span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-orange-500" aria-hidden="true">🟢</span>
                                        <span><strong>Infraestructura vial</strong></span>
                                    </li>
                                </ul>
                                <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                                    <span className="hidden sm:inline">Pasa el cursor sobre cada zona para ver los detalles.</span>
                                    <span className="sm:hidden">Toca cada zona para ver detalles.</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

/**
 * Componente principal del Dashboard de Calidad del Aire
 */
const AirQualityDashboard = ({ isVisible = true }) => {
    // Estado local para controlar visualización
    const [showZones, setShowZones] = useState(true);

    // Hook para manejar visibilidad del mapa
    useMapVisibility(isVisible);

    // Hooks para obtener datos
    const {
        data: airQualityData,
        zoneData,
        loading: airLoading,
        error: airError,
        dataSource,
        lastUpdate,
    } = useAirQuality();

    const {
        data: weatherData,
        loading: weatherLoading,
    } = useWeather();

    // Determinar si los datos están cargando
    const isLoading = airLoading && !airQualityData;
    
    // Convertir zonas al formato del mapa
    const mapZones = useMemo(() => {
        return XALAPA_ZONES.map(zone => ({
            name: zone.name,
            bounds: zone.bounds,
        }));
    }, []);

    // Toggle de zonas
    const toggleZones = useCallback(() => {
        setShowZones(prev => !prev);
    }, []);

    // Renderizar loading
    if (isLoading) {
        return (
            <div 
                className="p-2 sm:p-4 w-full flex items-center justify-center min-h-[300px] sm:min-h-[400px]"
                role="status"
                aria-label="Cargando datos"
            >
                <LoadingSpinner size="xl" text="Cargando datos de calidad del aire..." />
            </div>
        );
    }

    return (
        <div className="p-2 sm:p-4 w-full animate-fade-in">
            {/* Indicador de estado de datos - COMPACTO */}
            <DataStatus
                status={dataSource}
                lastUpdate={lastUpdate}
                errorMessage={airError}
                className="mb-2 sm:mb-3"
            />

            {/* Grid principal: Mapa + Contaminantes - RESPONSIVE */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 w-full">
                
                {/* Panel del Mapa */}
                <Card 
                    title="Mapa de Calidad del Aire"
                    actions={
                        <span className="text-xs sm:text-sm text-gray-500">Xalapa, Veracruz</span>
                    }
                    padding="sm"
                    className="order-1"
                >
                    <div className="relative">
                        {/* Altura del mapa responsive */}
                        <div 
                            className="h-[350px] sm:h-[450px] md:h-[500px] lg:h-[550px] xl:h-[600px] rounded-lg overflow-hidden"
                            role="application"
                            aria-label="Mapa interactivo de calidad del aire de Xalapa"
                        >
                            <MapContainer
                                center={MAP_CONFIG.center}
                                zoom={MAP_CONFIG.zoom}
                                minZoom={MAP_CONFIG.minZoom}
                                maxZoom={MAP_CONFIG.maxZoom}
                                maxBounds={MAP_CONFIG.maxBounds}
                                maxBoundsViscosity={1.0}
                                scrollWheelZoom={true}
                                zoomControl={true}
                                attributionControl={true}
                                style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
                            >
                                <TileLayer
                                    url={MAP_CONFIG.tileLayerUrl}
                                    attribution={MAP_CONFIG.attribution}
                                />
                                <MapBoundsHandler />
                                
                                {/* Zonas/Cuadrantes */}
                                {showZones && zoneData && mapZones.map((area, index) => (
                                    <ZoneRectangle
                                        key={index}
                                        area={area}
                                        zoneData={zoneData}
                                    />
                                ))}
                            </MapContainer>
                        </div>

                        {/* Botón para mostrar/ocultar zonas */}
                        <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-[1000]">
                            <Button
                                variant="outlineGray"
                                size="sm"
                                onClick={toggleZones}
                                className="bg-white shadow text-xs sm:text-sm px-2 sm:px-3"
                                aria-pressed={showZones}
                            >
                                <span className="hidden sm:inline">
                                    {showZones ? 'Ocultar Cuadrantes' : 'Ver Cuadrantes'}
                                </span>
                                <span className="sm:hidden">
                                    {showZones ? 'Ocultar' : 'Ver'}
                                </span>
                            </Button>
                        </div>

                        {/* Leyenda del mapa - esquina inferior izquierda */}
                        <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 z-[1000]">
                            <MapLegend />
                        </div>

                        {/* Botón de información - esquina inferior derecha */}
                        <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 z-[1000]">
                            <MapInfoButton />
                        </div>
                    </div>
                </Card>

                {/* Panel de Niveles de Contaminantes */}
                <Card 
                    title="Niveles de Contaminantes" 
                    icon="📊" 
                    padding="sm"
                    className="order-2"
                >
                    {airError ? (
                        <ErrorState
                            title="Error al cargar datos"
                            description={airError}
                        />
                    ) : !airQualityData ? (
                        <div className="flex items-center justify-center h-48 sm:h-64" role="status">
                            <LoadingSpinner text="Cargando datos..." />
                        </div>
                    ) : (
                        <div className="space-y-4 sm:space-y-6">
                            {/* Gráfica de tendencias */}
                            <div>
                                <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">
                                    Tendencia (últimas 12 horas)
                                </h3>
                                {/* Altura de gráfica responsive */}
                                <div className="h-[250px] sm:h-[300px] md:h-[350px]">
                                    <PollutantChart 
                                        data={airQualityData} 
                                        height="100%"
                                    />
                                </div>
                            </div>

                            {/* Estadísticas actuales */}
                            <div>
                                <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">
                                    Estadísticas Actuales
                                </h3>
                                <PollutantStats data={airQualityData} />
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Condiciones Meteorológicas */}
            <div className="mt-3 sm:mt-4">
                <WeatherCard 
                    weatherData={weatherData} 
                    loading={weatherLoading}
                />
            </div>
        </div>
    );
};

// Exportar también generateReport para uso externo
export { generateReport };
export default AirQualityDashboard;
