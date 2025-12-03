/**
 * Componente ZoneRectangle - Rectángulo de zona en el mapa
 * Fase 4 - Refactorización del Dashboard
 * 
 * Cuadrantes con bordes sutiles y tooltips elegantes al hacer hover
 */

import React from 'react';
import { Rectangle, Tooltip } from 'react-leaflet';
import { getPollutantColor } from '../../utils/constants';

const ZoneRectangle = ({ area, zoneData }) => {
    if (!zoneData || !zoneData.zones) return null;

    const zone = zoneData.zones.find(z => z.zone_name === area.name);
    if (!zone) return null;

    const { pollutants, traffic, factors } = zone;
    
    // Determinar si hay ajuste significativo por tráfico
    const hasTrafficImpact = factors.traffic_factor > 1.05;
    
    // Determinar color de la congestión
    const getCongestionColor = (level) => {
        if (level > 50) return { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-50' };
        if (level > 25) return { bg: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-50' };
        return { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-50' };
    };
    
    const congestionColors = getCongestionColor(traffic.congestion_level);

    return (
        <Rectangle
            bounds={area.bounds}
            pathOptions={{
                color: '#FFFFFF',
                weight: 2,
                fillColor: getPollutantColor('pm25', pollutants.pm25),
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
                        <div className="tooltip-title">{area.name}</div>
                        {hasTrafficImpact && (
                            <div className="traffic-badge">
                                +{((factors.traffic_factor - 1) * 100).toFixed(0)}%
                            </div>
                        )}
                    </div>
                    
                    {/* Sección de Contaminantes */}
                    <div className="tooltip-section">
                        <div className="section-header">
                            <span className="section-icon">🌫️</span>
                            <span className="section-title">Contaminantes</span>
                        </div>
                        <div className="pollutant-grid">
                            <div className="pollutant-item">
                                <span className="pollutant-name">PM2.5</span>
                                <span className="pollutant-value">{pollutants.pm25.toFixed(1)}</span>
                                <span className="pollutant-unit">µg/m³</span>
                            </div>
                            <div className="pollutant-item">
                                <span className="pollutant-name">PM10</span>
                                <span className="pollutant-value">{pollutants.pm10.toFixed(1)}</span>
                                <span className="pollutant-unit">µg/m³</span>
                            </div>
                            <div className="pollutant-item">
                                <span className="pollutant-name">NO₂</span>
                                <span className="pollutant-value">{pollutants.no2.toFixed(1)}</span>
                                <span className="pollutant-unit">µg/m³</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Sección de Tráfico */}
                    <div className={`tooltip-section traffic-section ${congestionColors.light}`}>
                        <div className="section-header">
                            <span className="section-icon">🚗</span>
                            <span className="section-title">Tráfico en Tiempo Real</span>
                            {traffic.has_real_data && (
                                <span className="live-badge">
                                    <span className="live-dot"></span>
                                    LIVE
                                </span>
                            )}
                        </div>
                        
                        <div className="congestion-display">
                            <div className="congestion-value-container">
                                <span className={`congestion-value ${congestionColors.text}`}>
                                    {traffic.congestion_level.toFixed(0)}%
                                </span>
                                <span className="congestion-label">congestión</span>
                            </div>
                            
                            {/* Barra de progreso animada */}
                            <div className="congestion-bar-container">
                                <div className="congestion-bar-bg">
                                    <div 
                                        className={`congestion-bar-fill ${congestionColors.bg}`}
                                        style={{ width: `${Math.min(traffic.congestion_level, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="traffic-source">
                            <span className="source-icon">
                                {traffic.has_real_data ? '✅' : '⚪'}
                            </span>
                            <span className="source-text">
                                {traffic.has_real_data ? 'TomTom API' : 'Sin datos'}
                            </span>
                        </div>
                    </div>
                </div>
            </Tooltip>
        </Rectangle>
    );
};

export default React.memo(ZoneRectangle);
