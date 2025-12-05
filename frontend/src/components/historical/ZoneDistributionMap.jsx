/**
 * Componente ZoneDistributionMap - Mapa de distribución histórica por zonas
 * 
 * 🆕 MEJORAS:
 * - Tooltips mejorados estilo Dashboard
 * - Bloqueo de área del mapa (maxBounds)
 * - Layout mejorado para alineación de títulos
 * - Efectos de hover en zonas
 */

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Rectangle, Tooltip, useMap } from 'react-leaflet';
import { Database } from 'lucide-react';
import { MAP_CONFIG, XALAPA_ZONES, getPollutantColor } from '../../utils/constants';

/**
 * Componente para manejar bounds y tamaño del mapa
 */
const MapBoundsHandler = ({ isVisible }) => {
    const map = useMap();
    const wasVisible = useRef(isVisible);
    
    useEffect(() => {
        if (map) {
            // Establecer límites del mapa
            map.setMaxBounds(MAP_CONFIG.maxBounds);
            map.options.maxBoundsViscosity = 1.0;
            
            // Invalidar tamaño
            const invalidate = () => map.invalidateSize();
            invalidate();
            const timer1 = setTimeout(invalidate, 100);
            const timer2 = setTimeout(invalidate, 300);
            const timer3 = setTimeout(invalidate, 600);
            
            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
                clearTimeout(timer3);
            };
        }
    }, [map]);
    
    useEffect(() => {
        if (isVisible && !wasVisible.current && map) {
            const invalidate = () => map.invalidateSize();
            invalidate();
            setTimeout(invalidate, 100);
            setTimeout(invalidate, 300);
            setTimeout(invalidate, 500);
        }
        wasVisible.current = isVisible;
    }, [isVisible, map]);
    
    useEffect(() => {
        const handleResize = () => {
            if (map) map.invalidateSize();
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [map]);
    
    return null;
};

/**
 * Rectángulo de zona con tooltip mejorado
 */
const HistoricalZoneRectangle = ({ zone, stats, osmZone }) => {
    if (!stats?.pm25) return null;
    
    const pm25Avg = stats.pm25.avg;
    const color = getPollutantColor('pm25', pm25Avg);
    const hasOSMData = osmZone?.metrics && !osmZone.metrics.error;
    const pollutionFactor = osmZone?.pollution_factor || stats.pollutionFactor || 1.0;
    const hasSignificantFactor = pollutionFactor > 1.05;
    
    return (
        <Rectangle
            bounds={zone.bounds}
            pathOptions={{
                color: '#FFFFFF',
                weight: 2,
                fillColor: color,
                fillOpacity: 0.35
            }}
            eventHandlers={{
                mouseover: (e) => {
                    e.target.setStyle({
                        fillOpacity: 0.55,
                        weight: 3,
                        color: '#3b82f6'
                    });
                },
                mouseout: (e) => {
                    e.target.setStyle({
                        fillOpacity: 0.35,
                        weight: 2,
                        color: '#FFFFFF'
                    });
                }
            }}
        >
            <Tooltip 
                sticky={true}
                direction="auto"
                opacity={1}
                className="zone-tooltip"
            >
                <div className="tooltip-content">
                    {/* Header con gradiente */}
                    <div className="tooltip-header">
                        <div className="tooltip-icon">📍</div>
                        <div className="tooltip-title">{zone.name}</div>
                        {hasSignificantFactor && (
                            <div className="traffic-badge">
                                Factor: {pollutionFactor.toFixed(2)}x
                            </div>
                        )}
                    </div>
                    
                    {/* Sección de Contaminantes */}
                    <div className="tooltip-section">
                        <div className="section-header">
                            <span className="section-icon">📊</span>
                            <span className="section-title">Promedio Histórico</span>
                        </div>
                        <div className="pollutant-grid">
                            <div className="pollutant-item">
                                <span className="pollutant-name">PM2.5</span>
                                <span className="pollutant-value">{stats.pm25.avg.toFixed(1)}</span>
                                <span className="pollutant-unit">µg/m³</span>
                            </div>
                            <div className="pollutant-item">
                                <span className="pollutant-name">PM10</span>
                                <span className="pollutant-value">{stats.pm10.avg.toFixed(1)}</span>
                                <span className="pollutant-unit">µg/m³</span>
                            </div>
                            <div className="pollutant-item">
                                <span className="pollutant-name">NO₂</span>
                                <span className="pollutant-value">{stats.no2.avg.toFixed(1)}</span>
                                <span className="pollutant-unit">µg/m³</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Sección de Infraestructura OSM */}
                    {hasOSMData && (
                        <div className="tooltip-section" style={{ background: 'linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)', borderRadius: '0 0 16px 16px' }}>
                            <div className="section-header">
                                <span className="section-icon">🛣️</span>
                                <span className="section-title">Infraestructura (OSM)</span>
                                <span style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: '#10b981',
                                    color: 'white',
                                    padding: '2px 8px',
                                    borderRadius: '20px',
                                    fontSize: '9px',
                                    fontWeight: '700',
                                    letterSpacing: '0.5px',
                                    marginLeft: 'auto'
                                }}>
                                    <span style={{
                                        width: '6px',
                                        height: '6px',
                                        background: 'white',
                                        borderRadius: '50%'
                                    }}></span>
                                    REAL
                                </span>
                            </div>
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(2, 1fr)', 
                                gap: '8px',
                                marginTop: '8px'
                            }}>
                                <div style={{ 
                                    background: 'rgba(255,255,255,0.7)', 
                                    padding: '8px', 
                                    borderRadius: '8px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '10px', color: '#334155', fontWeight: '600', marginBottom: '2px' }}>
                                        Vías principales
                                    </div>
                                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                                        {osmZone.metrics.main_roads_count}
                                    </div>
                                </div>
                                <div style={{ 
                                    background: 'rgba(255,255,255,0.7)', 
                                    padding: '8px', 
                                    borderRadius: '8px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '10px', color: '#334155', fontWeight: '600', marginBottom: '2px' }}>
                                        Densidad vial
                                    </div>
                                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                                        {osmZone.metrics.road_density_km_per_km2}
                                        <span style={{ fontSize: '10px', fontWeight: '500', marginLeft: '2px' }}>km/km²</span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ 
                                marginTop: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '11px',
                                color: '#166534',
                                fontWeight: '500'
                            }}>
                                <span>✅</span>
                                <span>Factor calculado: <strong>{pollutionFactor.toFixed(2)}x</strong></span>
                            </div>
                        </div>
                    )}
                    
                    {/* Si no hay datos OSM */}
                    {!hasOSMData && (
                        <div className="tooltip-section" style={{ background: '#f8fafc', borderRadius: '0 0 16px 16px' }}>
                            <div style={{ 
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '11px',
                                color: '#64748b'
                            }}>
                                <span>ℹ️</span>
                                <span>Datos basados en estimación satelital (Open-Meteo)</span>
                            </div>
                        </div>
                    )}
                </div>
            </Tooltip>
        </Rectangle>
    );
};

/**
 * Componente principal
 */
const ZoneDistributionMap = ({
    zoneStatistics,
    osmAnalysis,
    loadingOSM = false,
    isVisible = true,
    className = '',
}) => {
    const [mapKey, setMapKey] = useState(0);
    const containerRef = useRef(null);
    
    const zones = useMemo(() => {
        return XALAPA_ZONES.map(zone => ({
            name: zone.name,
            bounds: zone.bounds,
        }));
    }, []);

    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                setMapKey(prev => prev + 1);
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isVisible]);

    if (!zoneStatistics) {
        return (
            <div className="text-center py-8 text-gray-500">
                No hay estadísticas por zona disponibles
            </div>
        );
    }

    // Ordenar zonas por PM2.5 para el ranking
    const sortedZones = useMemo(() => {
        return zones
            .filter(zone => {
                const stats = zoneStatistics[zone.name];
                return stats?.pm25 && typeof stats.pm25.avg === 'number';
            })
            .sort((a, b) => {
                const aStats = zoneStatistics[a.name];
                const bStats = zoneStatistics[b.name];
                return bStats.pm25.avg - aStats.pm25.avg;
            });
    }, [zones, zoneStatistics]);

    return (
        <div className={`${className}`}>
            {/* Grid con títulos alineados */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Columna del Mapa */}
                <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        Distribución Histórica por Zonas
                        {osmAnalysis && (
                            <span className="text-sm font-normal text-gray-600">
                                <Database size={14} className="inline mr-1" />
                                Basado en datos reales de OpenStreetMap
                            </span>
                        )}
                    </h3>
                    
                    <div 
                        ref={containerRef}
                        className="h-[400px] rounded-lg overflow-hidden shadow-md bg-gray-100"
                    >
                        <MapContainer
                            key={mapKey}
                            center={MAP_CONFIG.center}
                            zoom={MAP_CONFIG.zoom}
                            minZoom={MAP_CONFIG.minZoom}
                            maxZoom={MAP_CONFIG.maxZoom}
                            maxBounds={MAP_CONFIG.maxBounds}
                            maxBoundsViscosity={1.0}
                            scrollWheelZoom={true}
                            style={{ height: '100%', width: '100%' }}
                        >
                            <MapBoundsHandler isVisible={isVisible} />
                            <TileLayer
                                url={MAP_CONFIG.tileLayerUrl}
                                attribution={MAP_CONFIG.attribution}
                            />
                            {zones.map((zone, index) => {
                                const zoneStats = zoneStatistics[zone.name];
                                const osmZone = osmAnalysis?.zones?.find(z => z.zone_name === zone.name);
                                
                                return (
                                    <HistoricalZoneRectangle
                                        key={index}
                                        zone={zone}
                                        stats={zoneStats}
                                        osmZone={osmZone}
                                    />
                                );
                            })}
                        </MapContainer>
                    </div>
                </div>

                {/* Columna del Ranking */}
                <div>
                    <h3 className="text-lg font-semibold mb-4">
                        Ranking de Contaminación por Zona
                    </h3>
                    
                    {loadingOSM && (
                        <div className="text-center py-4">
                            <p className="text-gray-600">Cargando datos de infraestructura...</p>
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        {sortedZones.map((zone, index) => {
                            const stats = zoneStatistics[zone.name];
                            const osmZone = osmAnalysis?.zones?.find(z => z.zone_name === zone.name);
                            
                            return (
                                <ZoneRankingItem
                                    key={zone.name}
                                    zone={zone}
                                    stats={stats}
                                    osmZone={osmZone}
                                    rank={index + 1}
                                />
                            );
                        })}
                    </div>
                    
                    {/* Explicación de factores OSM */}
                    {osmAnalysis?.zones && (
                        <div className="mt-4 p-3 bg-green-50 rounded-lg">
                            <h5 className="font-semibold text-green-900 text-sm mb-2">
                                <Database size={14} className="inline mr-1" />
                                Factores basados en OpenStreetMap
                            </h5>
                            <ul className="text-xs text-green-800 space-y-1">
                                <li>• Densidad vial ponderada (40% del factor)</li>
                                <li>• Cantidad de vías principales (25%)</li>
                                <li>• Zonas comerciales e industriales (25%)</li>
                                <li>• Puntos de interés con alto tráfico (10%)</li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Item del ranking de zonas
 */
const ZoneRankingItem = ({ zone, stats, osmZone, rank }) => {
    const hasOSMData = osmZone?.metrics && !osmZone.metrics.error;
    
    return (
        <div className="bg-gray-50 rounded-lg p-3 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700">
                        {rank}
                    </div>
                    <div>
                        <div className="font-semibold">{zone.name}</div>
                        {hasOSMData ? (
                            <div className="text-xs text-gray-600">
                                <span className="text-green-600 font-medium">
                                    <Database size={10} className="inline mr-1" />
                                    Datos reales OSM
                                </span>
                                {' - Factor: '}{osmZone.pollution_factor}x
                            </div>
                        ) : (
                            <div className="text-xs text-gray-600">
                                Factor estimado: {stats.pollutionFactor?.toFixed(2) || '1.00'}x
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-semibold">
                        {stats.pm25.avg.toFixed(1)} μg/m³
                    </div>
                    <div className="text-xs text-gray-600">
                        PM2.5 promedio
                    </div>
                </div>
            </div>
            
            {hasOSMData && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                            <span className="text-gray-500">Vías:</span>
                            <span className="font-medium ml-1">
                                {osmZone.metrics.total_road_length_km} km
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-500">POIs:</span>
                            <span className="font-medium ml-1">
                                {osmZone.metrics.total_pois}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-500">Área:</span>
                            <span className="font-medium ml-1">
                                {osmZone.metrics.zone_area_km2} km²
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(ZoneDistributionMap);
