/**
 * Componente CurrentStatusTab - Tab de Estado Actual
 * Fase 4 - Refactorización de AlertsAndPredictions
 * 
 * SIMPLIFICADO: Solo muestra información esencial sin redundancias
 */

import React from 'react';
import { InfoCard } from '../common';
import { 
    AIR_QUALITY_LEVELS, 
    POLLUTANT_THRESHOLDS,
} from '../../utils/constants';

/**
 * Obtiene la key del nivel basándose en el valor de PM2.5
 */
const getLevelKey = (pm25Value) => {
    const t = POLLUTANT_THRESHOLDS.pm25;
    if (pm25Value <= t.good) return 'bueno';
    if (pm25Value <= t.moderate) return 'moderado';
    if (pm25Value <= t.unhealthySensitive) return 'insalubre_sensibles';
    if (pm25Value <= t.unhealthy) return 'insalubre';
    if (pm25Value <= t.veryUnhealthy) return 'muy_insalubre';
    return 'peligroso';
};

/**
 * Formatea el nombre del contaminante para mostrarlo de forma legible
 */
const formatPollutantName = (pollutant) => {
    const names = {
        'pm25': 'PM2.5',
        'pm10': 'PM10',
        'no2': 'NO₂',
        'o3': 'O₃',
        'co': 'CO'
    };
    return names[pollutant?.toLowerCase()] || pollutant?.toUpperCase() || '';
};

const CurrentStatusTab = ({ alert, zoneData }) => {
    if (!alert) {
        return (
            <div className="text-center py-8 text-gray-500 animate-fade-in">
                <div className="text-4xl mb-2">📊</div>
                No hay datos de alerta disponibles
            </div>
        );
    }

    const level = alert.overall_level?.value || 'bueno';
    const levelInfo = AIR_QUALITY_LEVELS[level] || AIR_QUALITY_LEVELS.bueno;

    return (
        <div className="animate-fade-in space-y-6">
            {/* Sección AQI */}
            {alert.aqi && (
                <div className="p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-lg text-gray-800">
                            Índice de Calidad del Aire (AQI)
                        </h3>
                        <div className="text-sm text-gray-500">
                            {new Date(alert.timestamp).toLocaleString('es-MX')}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <div 
                            className="text-5xl font-bold px-4 py-2 rounded-lg text-white shadow-lg"
                            style={{ backgroundColor: levelInfo.color }}
                        >
                            {alert.aqi.overall?.toFixed(0) || 'N/A'}
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">{levelInfo.icon}</span>
                                <span 
                                    className="font-semibold text-lg"
                                    style={{ color: levelInfo.color }}
                                >
                                    {levelInfo.label}
                                </span>
                            </div>
                            <div className="text-sm text-gray-600">
                                {alert.aqi.pm25 && (
                                    <span className="mr-4">PM2.5: {alert.aqi.pm25.toFixed(0)}</span>
                                )}
                                {alert.aqi.pm10 && (
                                    <span>PM10: {alert.aqi.pm10.toFixed(0)}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Niveles por Zona - Con indicador de ajuste por tráfico */}
            {zoneData?.zones?.length > 0 && (
                <div className="p-5 bg-blue-50 rounded-xl border border-blue-100">
                    <h4 className="font-semibold mb-2 text-gray-800 flex items-center gap-2">
                        🗺️ Niveles por Zona
                    </h4>
                    <p className="text-xs text-gray-600 mb-4">
                        Valores ajustados según tráfico en tiempo real e infraestructura vial
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {zoneData.zones.map((zone, index) => {
                            const zoneLevelKey = getLevelKey(zone.pollutants.pm25);
                            const zoneLevelInfo = AIR_QUALITY_LEVELS[zoneLevelKey];
                            const hasTrafficImpact = zone.factors?.traffic_factor > 1.05;
                            
                            return (
                                <div 
                                    key={index} 
                                    className="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow"
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-medium">{zone.zone_name}</span>
                                        <span 
                                            className="px-2 py-1 rounded text-xs font-semibold"
                                            style={{ 
                                                backgroundColor: zoneLevelInfo.color,
                                                color: zoneLevelInfo.textColor 
                                            }}
                                        >
                                            {zoneLevelInfo.label}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-600 space-y-1">
                                        <div className="flex justify-between">
                                            <span>PM2.5:</span>
                                            <span className="font-medium">
                                                {zone.pollutants.pm25.toFixed(2)} µg/m³
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span>Congestión:</span>
                                            <span className={`font-medium ${
                                                zone.traffic.congestion_level > 50 ? 'text-red-600' :
                                                zone.traffic.congestion_level > 25 ? 'text-orange-600' :
                                                'text-green-600'
                                            }`}>
                                                {zone.traffic.congestion_level.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                    {/* Indicador de impacto por tráfico */}
                                    {hasTrafficImpact && (
                                        <div className="mt-2 text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded text-center">
                                            📈 +{((zone.factors.traffic_factor - 1) * 100).toFixed(0)}% por tráfico
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Solo Recomendaciones Generales */}
            {alert.recommendations?.general && (
                <InfoCard
                    title="Recomendaciones Generales"
                    type="info"
                    icon="💡"
                >
                    {alert.recommendations.general}
                </InfoCard>
            )}

            {/* Alerta de contaminantes por encima del nivel óptimo */}
            {alert.alerts?.length > 0 ? (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div>
                            <h4 className="font-semibold text-amber-800">
                                {alert.alerts.length} contaminante(s) por encima del nivel óptimo
                            </h4>
                            <p className="text-sm text-amber-600">
                                {alert.alerts.map(a => formatPollutantName(a.pollutant)).join(', ')} 
                                - Nivel {alert.alerts[0]?.level?.value?.replace(/_/g, ' ') || 'moderado'}
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">✅</span>
                        <div>
                            <h4 className="font-semibold text-green-800">Todos los contaminantes en nivel óptimo</h4>
                            <p className="text-sm text-green-600">La calidad del aire es buena para todas las actividades al aire libre.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(CurrentStatusTab);
