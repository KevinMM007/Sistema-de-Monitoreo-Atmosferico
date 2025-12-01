/**
 * Componente ZoneRectangle - Rectángulo de zona en el mapa
 * Fase 4 - Refactorización del Dashboard
 * 
 * Los valores de contaminantes mostrados están AJUSTADOS según:
 * - Factor OSM (densidad vial de OpenStreetMap)
 * - Factor de Tráfico (congestión en tiempo real de TomTom)
 */

import React from 'react';
import { Rectangle, Popup } from 'react-leaflet';
import { getPollutantColor } from '../../utils/constants';

const ZoneRectangle = ({ area, zoneData }) => {
    if (!zoneData || !zoneData.zones) return null;

    const zone = zoneData.zones.find(z => z.zone_name === area.name);
    if (!zone) return null;

    const { pollutants, traffic, factors } = zone;
    
    // Determinar si hay ajuste significativo por tráfico
    const hasTrafficImpact = factors.traffic_factor > 1.05;

    return (
        <Rectangle
            bounds={area.bounds}
            pathOptions={{
                color: '#FFFFFF',
                weight: 2,
                fillColor: getPollutantColor('pm25', pollutants.pm25),
                fillOpacity: 0.35
            }}
        >
            <Popup>
                <div className="p-3 min-w-[240px]">
                    <h3 className="text-base font-bold mb-2 text-gray-800">
                        {area.name}
                    </h3>
                    
                    <div className="space-y-2">
                        {/* Contaminantes - Indicar que están ajustados */}
                        <div className="bg-gray-100 p-2 rounded">
                            <div className="font-semibold mb-1 text-gray-600 text-sm flex items-center justify-between">
                                <span>Contaminantes</span>
                                {hasTrafficImpact && (
                                    <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                                        +{((factors.traffic_factor - 1) * 100).toFixed(0)}% por tráfico
                                    </span>
                                )}
                            </div>
                            <div className="text-sm space-y-1">
                                <div className="flex justify-between">
                                    <span>PM2.5:</span>
                                    <span className="font-medium">{pollutants.pm25.toFixed(2)} µg/m³</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>PM10:</span>
                                    <span className="font-medium">{pollutants.pm10.toFixed(2)} µg/m³</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>NO₂:</span>
                                    <span className="font-medium">{pollutants.no2.toFixed(2)} µg/m³</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Tráfico en Tiempo Real */}
                        <div className={`p-2 rounded ${traffic.has_real_data ? 'bg-blue-50' : 'bg-gray-50'}`}>
                            <div className="font-semibold mb-1 text-blue-800 text-sm">
                                🚗 Tráfico en Tiempo Real
                            </div>
                            <div className="text-sm space-y-1">
                                <div className="flex justify-between items-center">
                                    <span>Congestión:</span>
                                    <span className={`font-bold ${
                                        traffic.congestion_level > 50 ? 'text-red-600' :
                                        traffic.congestion_level > 25 ? 'text-orange-600' :
                                        'text-green-600'
                                    }`}>
                                        {traffic.congestion_level.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Fuente:</span>
                                    <span className="font-medium text-xs">
                                        {traffic.has_real_data ? '✅ TomTom API' : '⚪ Sin datos'}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Barra de congestión visual */}
                            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                                <div 
                                    className={`h-2 rounded-full transition-all ${
                                        traffic.congestion_level > 50 ? 'bg-red-500' :
                                        traffic.congestion_level > 25 ? 'bg-orange-500' :
                                        'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.min(traffic.congestion_level, 100)}%` }}
                                />
                            </div>
                        </div>
                        
                        {/* Nota explicativa */}
                        <div className="text-xs text-gray-500 italic border-t pt-2 mt-2">
                            📊 Valores ajustados por tráfico ({factors.traffic_factor}x) e infraestructura vial ({factors.osm_factor}x)
                        </div>
                    </div>
                </div>
            </Popup>
        </Rectangle>
    );
};

export default React.memo(ZoneRectangle);
