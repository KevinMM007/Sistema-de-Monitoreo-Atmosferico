/**
 * Componente CurrentStatusTab - Tab de Estado Actual
 * 
 * 🆕 MEJORAS:
 * - Responsive design completo para móviles
 * - Accesibilidad mejorada (aria-labels, roles)
 * - Layout adaptativo en sección AQI
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
            <div 
                className="text-center py-6 sm:py-8 text-gray-500 animate-fade-in"
                role="status"
                aria-label="Sin datos de alerta disponibles"
            >
                <div className="text-3xl sm:text-4xl mb-2" aria-hidden="true">📊</div>
                No hay datos de alerta disponibles
            </div>
        );
    }

    const level = alert.overall_level?.value || 'bueno';
    const levelInfo = AIR_QUALITY_LEVELS[level] || AIR_QUALITY_LEVELS.bueno;

    return (
        <div className="animate-fade-in space-y-4 sm:space-y-6">
            {/* Sección AQI - Responsive */}
            {alert.aqi && (
                <section 
                    className="p-3 sm:p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border"
                    aria-labelledby="aqi-title"
                >
                    {/* Header responsive */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-3">
                        <h3 id="aqi-title" className="font-bold text-base sm:text-lg text-gray-800">
                            Índice de Calidad del Aire (AQI)
                        </h3>
                        <time 
                            className="text-xs sm:text-sm text-gray-500"
                            dateTime={alert.timestamp}
                        >
                            {new Date(alert.timestamp).toLocaleString('es-MX')}
                        </time>
                    </div>
                    
                    {/* AQI display - Stack vertical en móvil, horizontal en desktop */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3 sm:gap-6">
                        {/* Valor AQI */}
                        <div 
                            className="text-4xl sm:text-5xl font-bold px-4 py-2 rounded-lg text-white shadow-lg"
                            style={{ backgroundColor: levelInfo.color }}
                            role="meter"
                            aria-valuenow={alert.aqi.overall}
                            aria-valuemin={0}
                            aria-valuemax={500}
                            aria-label={`Índice AQI: ${alert.aqi.overall?.toFixed(0)}, nivel ${levelInfo.label}`}
                        >
                            {alert.aqi.overall?.toFixed(0) || 'N/A'}
                        </div>
                        
                        {/* Info del nivel */}
                        <div className="flex flex-col gap-1 text-center sm:text-left">
                            <div className="flex items-center justify-center sm:justify-start gap-2">
                                <span className="text-xl sm:text-2xl" aria-hidden="true">{levelInfo.icon}</span>
                                <span 
                                    className="font-semibold text-base sm:text-lg"
                                    style={{ color: levelInfo.color }}
                                >
                                    {levelInfo.label}
                                </span>
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600">
                                {alert.aqi.pm25 && (
                                    <span className="mr-3 sm:mr-4">
                                        PM2.5: {alert.aqi.pm25.toFixed(0)}
                                    </span>
                                )}
                                {alert.aqi.pm10 && (
                                    <span>
                                        PM10: {alert.aqi.pm10.toFixed(0)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Niveles por Zona - Responsive */}
            {zoneData?.zones?.length > 0 && (
                <section 
                    className="p-3 sm:p-5 bg-blue-50 rounded-xl border border-blue-100"
                    aria-labelledby="zones-title"
                >
                    <h4 id="zones-title" className="font-semibold mb-1 sm:mb-2 text-gray-800 flex items-center gap-2 text-sm sm:text-base">
                        <span aria-hidden="true">🗺️</span> Niveles por Zona
                    </h4>
                    <p className="text-xs text-gray-600 mb-3 sm:mb-4">
                        Valores ajustados según tráfico en tiempo real e infraestructura vial
                    </p>
                    
                    {/* Grid responsive: 1 col móvil, 2 cols tablet, 3 cols desktop */}
                    <div 
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3"
                        role="list"
                        aria-label="Lista de zonas con niveles de contaminación"
                    >
                        {zoneData.zones.map((zone, index) => {
                            const zoneLevelKey = getLevelKey(zone.pollutants.pm25);
                            const zoneLevelInfo = AIR_QUALITY_LEVELS[zoneLevelKey];
                            const hasTrafficImpact = zone.factors?.traffic_factor > 1.05;
                            
                            return (
                                <article 
                                    key={index}
                                    role="listitem"
                                    className="bg-white p-3 sm:p-4 rounded-lg border hover:shadow-md transition-shadow"
                                    aria-label={`Zona ${zone.zone_name}: nivel ${zoneLevelInfo.label}`}
                                >
                                    {/* Header de zona */}
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-medium text-sm sm:text-base">{zone.zone_name}</span>
                                        <span 
                                            className="px-2 py-0.5 sm:py-1 rounded text-xs font-semibold"
                                            style={{ 
                                                backgroundColor: zoneLevelInfo.color,
                                                color: zoneLevelInfo.textColor 
                                            }}
                                            role="status"
                                        >
                                            {zoneLevelInfo.label}
                                        </span>
                                    </div>
                                    
                                    {/* Datos de zona */}
                                    <div className="text-xs sm:text-sm text-gray-600 space-y-1">
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
                                        <div 
                                            className="mt-2 text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded text-center"
                                            role="status"
                                            aria-label={`Incremento de ${((zone.factors.traffic_factor - 1) * 100).toFixed(0)}% por tráfico`}
                                        >
                                            <span aria-hidden="true">📈</span> +{((zone.factors.traffic_factor - 1) * 100).toFixed(0)}% por tráfico
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Recomendaciones Generales */}
            {alert.recommendations?.general && (
                <InfoCard
                    title="Recomendaciones Generales"
                    type="info"
                    icon="💡"
                >
                    <p className="text-xs sm:text-sm">{alert.recommendations.general}</p>
                </InfoCard>
            )}

            {/* Alerta de contaminantes */}
            {alert.alerts?.length > 0 ? (
                <div 
                    className="p-3 sm:p-4 bg-amber-50 rounded-xl border border-amber-200"
                    role="alert"
                    aria-live="polite"
                >
                    <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                        <span className="text-xl sm:text-2xl flex-shrink-0" aria-hidden="true">⚠️</span>
                        <div>
                            <h4 className="font-semibold text-amber-800 text-sm sm:text-base">
                                {alert.alerts.length} contaminante(s) por encima del nivel óptimo
                            </h4>
                            <p className="text-xs sm:text-sm text-amber-600">
                                {alert.alerts.map(a => formatPollutantName(a.pollutant)).join(', ')} 
                                - Nivel {alert.alerts[0]?.level?.value?.replace(/_/g, ' ') || 'moderado'}
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div 
                    className="p-3 sm:p-4 bg-green-50 rounded-xl border border-green-200"
                    role="status"
                >
                    <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                        <span className="text-xl sm:text-2xl flex-shrink-0" aria-hidden="true">✅</span>
                        <div>
                            <h4 className="font-semibold text-green-800 text-sm sm:text-base">
                                Todos los contaminantes en nivel óptimo
                            </h4>
                            <p className="text-xs sm:text-sm text-green-600">
                                La calidad del aire es buena para todas las actividades al aire libre.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(CurrentStatusTab);
