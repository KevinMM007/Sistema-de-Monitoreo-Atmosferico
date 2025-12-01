/**
 * Componente ZoneDistributionMap - Mapa de distribución histórica por zonas
 * Fase 4 - Refactorización de HistoricalDataDashboard
 * 
 * Incluye manejo de errores de carga del mapa y soporte de visibilidad
 */

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Rectangle, Popup, useMap } from 'react-leaflet';
import { Database } from 'lucide-react';
import { MAP_CONFIG, XALAPA_ZONES, getPollutantColor } from '../../utils/constants';

/**
 * Componente para invalidar el tamaño del mapa
 * Se ejecuta cuando el mapa se monta y cuando isVisible cambia
 */
const MapInvalidator = ({ isVisible }) => {
    const map = useMap();
    const wasVisible = useRef(isVisible);
    
    useEffect(() => {
        // Invalidar tamaño inicial
        const invalidate = () => {
            if (map) {
                map.invalidateSize();
            }
        };
        
        invalidate();
        const timer1 = setTimeout(invalidate, 100);
        const timer2 = setTimeout(invalidate, 300);
        const timer3 = setTimeout(invalidate, 600);
        
        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
        };
    }, [map]);
    
    useEffect(() => {
        // Cuando cambia de no visible a visible
        if (isVisible && !wasVisible.current && map) {
            const invalidate = () => map.invalidateSize();
            invalidate();
            setTimeout(invalidate, 100);
            setTimeout(invalidate, 300);
            setTimeout(invalidate, 500);
        }
        wasVisible.current = isVisible;
    }, [isVisible, map]);
    
    // También escuchar eventos de resize de ventana
    useEffect(() => {
        const handleResize = () => {
            if (map) {
                map.invalidateSize();
            }
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [map]);
    
    return null;
};

const ZoneDistributionMap = ({
    zoneStatistics,
    osmAnalysis,
    loadingOSM = false,
    isVisible = true,
    className = '',
}) => {
    const [mapKey, setMapKey] = useState(0);
    const containerRef = useRef(null);
    
    // Convertir zonas al formato necesario (XALAPA_ZONES es un array)
    const zones = useMemo(() => {
        return XALAPA_ZONES.map(zone => ({
            name: zone.name,
            bounds: zone.bounds,
        }));
    }, []);

    // Forzar re-render del mapa cuando se vuelve visible
    useEffect(() => {
        if (isVisible) {
            // Pequeño delay para asegurar que el contenedor es visible
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

    return (
        <div className={`${className}`}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                Distribución Histórica por Zonas
                {osmAnalysis && (
                    <span className="text-sm font-normal text-gray-600">
                        <Database size={14} className="inline mr-1" />
                        Basado en datos reales de OpenStreetMap
                    </span>
                )}
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Mapa */}
                <div 
                    ref={containerRef}
                    className="h-[400px] rounded-lg overflow-hidden shadow-md bg-gray-100"
                >
                    <MapContainer
                        key={mapKey}
                        center={MAP_CONFIG.center}
                        zoom={MAP_CONFIG.zoom}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <MapInvalidator isVisible={isVisible} />
                        <TileLayer
                            url={MAP_CONFIG.tileLayerUrl}
                            attribution={MAP_CONFIG.attribution}
                        />
                        {zones.map((zone, index) => {
                            const zoneStats = zoneStatistics[zone.name];
                            if (!zoneStats?.pm25) return null;
                            
                            const pm25Avg = zoneStats.pm25.avg;
                            const color = getPollutantColor('pm25', pm25Avg);
                            const osmZone = osmAnalysis?.zones?.find(z => z.zone_name === zone.name);
                            
                            return (
                                <Rectangle
                                    key={index}
                                    bounds={zone.bounds}
                                    pathOptions={{
                                        color: '#FFFFFF',
                                        weight: 2,
                                        fillColor: color,
                                        fillOpacity: 0.5
                                    }}
                                >
                                    <Popup>
                                        <ZonePopup 
                                            zone={zone} 
                                            stats={zoneStats}
                                            osmZone={osmZone}
                                        />
                                    </Popup>
                                </Rectangle>
                            );
                        })}
                    </MapContainer>
                </div>

                {/* Ranking de zonas */}
                <ZoneRanking 
                    zones={zones}
                    zoneStatistics={zoneStatistics}
                    osmAnalysis={osmAnalysis}
                    loadingOSM={loadingOSM}
                />
            </div>
        </div>
    );
};

/**
 * Popup de información de zona
 */
const ZonePopup = ({ zone, stats, osmZone }) => (
    <div className="p-2 min-w-[200px]">
        <h4 className="font-bold text-lg mb-2">{zone.name}</h4>
        <div className="space-y-2">
            <div className="bg-gray-50 p-2 rounded">
                <div className="text-sm font-semibold mb-1">Contaminantes</div>
                <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                        <span>PM2.5:</span>
                        <span>{stats.pm25.avg.toFixed(1)} μg/m³</span>
                    </div>
                    <div className="flex justify-between">
                        <span>PM10:</span>
                        <span>{stats.pm10.avg.toFixed(1)} μg/m³</span>
                    </div>
                    <div className="flex justify-between">
                        <span>NO₂:</span>
                        <span>{stats.no2.avg.toFixed(1)} μg/m³</span>
                    </div>
                </div>
            </div>
            
            {osmZone?.metrics && !osmZone.metrics.error && (
                <div className="bg-blue-50 p-2 rounded">
                    <div className="text-sm font-semibold mb-1">Infraestructura (OSM)</div>
                    <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                            <span>Vías principales:</span>
                            <span>{osmZone.metrics.main_roads_count}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Densidad vial:</span>
                            <span>{osmZone.metrics.road_density_km_per_km2} km/km²</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Factor calculado:</span>
                            <span>{osmZone.pollution_factor}x</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
);

/**
 * Ranking de contaminación por zonas
 */
const ZoneRanking = ({ zones, zoneStatistics, osmAnalysis, loadingOSM }) => {
    // Ordenar zonas por PM2.5
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
        <div>
            <h4 className="font-semibold mb-3">Ranking de Contaminación por Zona</h4>
            
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
    );
};

/**
 * Item del ranking de zonas
 */
const ZoneRankingItem = ({ zone, stats, osmZone, rank }) => (
    <div className="bg-gray-50 rounded-lg p-3 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700">
                    {rank}
                </div>
                <div>
                    <div className="font-semibold">{zone.name}</div>
                    {osmZone?.metrics && !osmZone.metrics.error ? (
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
        
        {osmZone?.metrics && !osmZone.metrics.error && (
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

export default React.memo(ZoneDistributionMap);
