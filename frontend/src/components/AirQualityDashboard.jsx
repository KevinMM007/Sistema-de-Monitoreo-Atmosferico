/**
 * AirQualityDashboard - Dashboard principal de calidad del aire
 * Fase 4 - Refactorizado: Usando hooks y componentes centralizados
 * 
 * NOTA: Las "Estadísticas Actuales" muestran valores BASE de Open-Meteo,
 * mientras que las "Zonas del Mapa" muestran valores AJUSTADOS por tráfico e infraestructura.
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
 * Componente principal del Dashboard de Calidad del Aire
 * @param {Object} props
 * @param {boolean} props.isVisible - Si el dashboard es visible actualmente
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
    
    // Convertir zonas al formato del mapa (XALAPA_ZONES es un array)
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
            <div className="p-4 w-full flex items-center justify-center min-h-[400px]">
                <LoadingSpinner size="xl" text="Cargando datos de calidad del aire..." />
            </div>
        );
    }

    return (
        <div className="p-4 w-full animate-fade-in">
            {/* Indicador de estado de datos */}
            <DataStatus
                status={dataSource}
                lastUpdate={lastUpdate}
                errorMessage={airError}
                className="mb-4"
            />

            {/* Grid principal: Mapa + Contaminantes */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 w-full">
                
                {/* Panel del Mapa */}
                <Card 
                    title="Mapa de Calidad del Aire"
                    actions={
                        <span className="text-sm text-gray-500">Xalapa, Veracruz</span>
                    }
                    padding="md"
                >
                    <div className="relative">
                        <div style={{ height: '600px', borderRadius: '0.5rem' }}>
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
                        <div className="absolute top-4 right-4 z-[1000]">
                            <Button
                                variant="outlineGray"
                                size="sm"
                                onClick={toggleZones}
                                className="bg-white shadow"
                            >
                                {showZones ? '🙈 Ocultar Cuadrantes' : '👁️ Ver Cuadrantes'}
                            </Button>
                        </div>

                        {/* Leyenda del mapa */}
                        <div className="absolute bottom-4 left-4 z-[1000]">
                            <MapLegend />
                        </div>
                    </div>
                </Card>

                {/* Panel de Niveles de Contaminantes */}
                <Card title="Niveles de Contaminantes" icon="📊" padding="md">
                    {airError ? (
                        <ErrorState
                            title="Error al cargar datos"
                            description={airError}
                        />
                    ) : !airQualityData ? (
                        <div className="flex items-center justify-center h-64">
                            <LoadingSpinner text="Cargando datos..." />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Gráfica de tendencias */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-700 mb-3">
                                    Tendencia (últimas 12 horas)
                                </h3>
                                <PollutantChart 
                                    data={airQualityData} 
                                    height={350}
                                />
                            </div>

                            {/* Estadísticas actuales */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-lg font-semibold text-gray-700">
                                        Estadísticas Actuales
                                    </h3>
                                </div>
                                <p className="text-xs text-gray-500 mb-3 italic">
                                    📡 Datos base de Open-Meteo (CAMS) • Los valores por zona en el mapa incluyen ajustes por tráfico e infraestructura vial
                                </p>
                                <PollutantStats data={airQualityData} />
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Condiciones Meteorológicas */}
            <div className="mt-4">
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
