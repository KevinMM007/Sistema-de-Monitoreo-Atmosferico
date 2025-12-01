/**
 * Componente TrendsTab - Tab de Tendencias/Pronóstico
 * Fase 4 - Refactorización de AlertsAndPredictions
 */

import React from 'react';
import { Card, InfoCard, Badge } from '../common';

// Colores para niveles numéricos
const LEVEL_COLORS = {
    1: '#10b981', // Bueno
    2: '#eab308', // Moderado
    3: '#f97316', // Insalubre sensibles
    4: '#ef4444', // Insalubre
    5: '#7c2d12', // Peligroso
};

const TrendsTab = ({ trends }) => {
    if (!trends?.tomorrow) {
        return (
            <div className="text-center py-8 text-gray-500 animate-fade-in">
                <div className="text-4xl mb-2">📊</div>
                Cargando tendencias...
            </div>
        );
    }

    const { tomorrow, reliability, days_analyzed, disclaimer } = trends;

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header de Mañana */}
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-5">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            📅 Pronóstico para Mañana
                        </h3>
                        <p className="text-white/80 text-sm mt-1">
                            {tomorrow.day_name} - {tomorrow.day_type}
                        </p>
                    </div>
                    <div className="text-right">
                        <Badge
                            variant="solid"
                            color={reliability === 'medium' ? 'yellow' : 'orange'}
                            size="sm"
                        >
                            Confiabilidad: {reliability === 'medium' ? 'Media' : 'Baja'}
                        </Badge>
                        <p className="text-white/60 text-xs mt-1">
                            Basado en {days_analyzed} días
                        </p>
                    </div>
                </div>
            </div>

            {/* Períodos del día */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {tomorrow.periods.map((period, index) => (
                    <PeriodCard key={index} period={period} />
                ))}
            </div>

            {/* Disclaimer */}
            <InfoCard
                title="Nota Importante"
                type="warning"
                icon="ℹ️"
            >
                {disclaimer}
            </InfoCard>
        </div>
    );
};

/**
 * Tarjeta de período del día
 */
const PeriodCard = ({ period }) => {
    const levelColor = LEVEL_COLORS[period.level_numeric] || '#6b7280';
    const levelPercent = (period.level_numeric / 5) * 100;

    return (
        <div className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{period.icon}</span>
                <div>
                    <h4 className="font-bold text-gray-800">{period.period}</h4>
                    <p className="text-xs text-gray-500">{period.hours}</p>
                </div>
            </div>
            
            {/* Barra de nivel */}
            <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Nivel esperado:</span>
                    <span className="font-semibold" style={{ color: levelColor }}>
                        {period.level}
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div 
                        className="h-2.5 rounded-full transition-all duration-500"
                        style={{ 
                            width: `${levelPercent}%`,
                            backgroundColor: levelColor
                        }}
                    />
                </div>
            </div>

            {/* Valores */}
            <div className="text-sm text-gray-600 space-y-1">
                <div className="flex justify-between">
                    <span>PM2.5:</span>
                    <span className="font-medium">{period.pm25_avg} µg/m³</span>
                </div>
                <div className="flex justify-between">
                    <span>PM10:</span>
                    <span className="font-medium">{period.pm10_avg} µg/m³</span>
                </div>
            </div>
            
            {/* Descripción */}
            <p className="mt-3 text-xs text-gray-500 italic border-t pt-2">
                {period.description}
            </p>
        </div>
    );
};

export default React.memo(TrendsTab);
