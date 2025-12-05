/**
 * Componente TrendsTab - Tab de Tendencias/Pronóstico
 * 
 * 🆕 MEJORAS:
 * - Responsive design completo
 * - Accesibilidad mejorada (aria-labels, roles, semántica)
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

const TrendsTab = ({ trends, loading = false }) => {
    if (loading) {
        return (
            <div 
                className="text-center py-6 sm:py-8 text-gray-500 animate-fade-in"
                role="status"
                aria-label="Cargando tendencias"
            >
                <div className="text-3xl sm:text-4xl mb-2" aria-hidden="true">📊</div>
                Cargando tendencias...
            </div>
        );
    }

    if (!trends?.tomorrow) {
        return (
            <div 
                className="text-center py-6 sm:py-8 text-gray-500 animate-fade-in"
                role="status"
            >
                <div className="text-3xl sm:text-4xl mb-2" aria-hidden="true">📊</div>
                No hay datos de tendencias disponibles
            </div>
        );
    }

    const { tomorrow, reliability, days_analyzed, disclaimer } = trends;

    return (
        <div className="animate-fade-in space-y-4 sm:space-y-6">
            {/* Header de Mañana */}
            <header className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div>
                        <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                            <span aria-hidden="true">📅</span> Pronóstico para Mañana
                        </h3>
                        <p className="text-white/80 text-xs sm:text-sm mt-1">
                            {tomorrow.day_name} - {tomorrow.day_type}
                        </p>
                    </div>
                    <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-1">
                        <Badge
                            variant="solid"
                            color={reliability === 'medium' ? 'yellow' : 'orange'}
                            size="sm"
                        >
                            Confiabilidad: {reliability === 'medium' ? 'Media' : 'Baja'}
                        </Badge>
                        <p className="text-white/60 text-xs">
                            Basado en {days_analyzed} días
                        </p>
                    </div>
                </div>
            </header>

            {/* Períodos del día - Grid responsive */}
            <section aria-labelledby="periods-title">
                <h4 id="periods-title" className="sr-only">Pronóstico por períodos del día</h4>
                <div 
                    className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4"
                    role="list"
                    aria-label="Períodos del día con pronóstico"
                >
                    {tomorrow.periods.map((period, index) => (
                        <PeriodCard key={index} period={period} />
                    ))}
                </div>
            </section>

            {/* Disclaimer */}
            <InfoCard
                title="Nota Importante"
                type="warning"
                icon="ℹ️"
            >
                <p className="text-xs sm:text-sm">{disclaimer}</p>
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
        <article 
            className="bg-white rounded-xl shadow-sm border p-3 sm:p-4 hover:shadow-md transition-shadow"
            role="listitem"
            aria-label={`${period.period}: nivel ${period.level}`}
        >
            {/* Header */}
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <span className="text-2xl sm:text-3xl" aria-hidden="true">{period.icon}</span>
                <div>
                    <h4 className="font-bold text-gray-800 text-sm sm:text-base">{period.period}</h4>
                    <p className="text-xs text-gray-500">{period.hours}</p>
                </div>
            </div>
            
            {/* Barra de nivel */}
            <div className="mb-2 sm:mb-3">
                <div className="flex justify-between text-xs sm:text-sm mb-1">
                    <span className="text-gray-600">Nivel esperado:</span>
                    <span className="font-semibold" style={{ color: levelColor }}>
                        {period.level}
                    </span>
                </div>
                <div 
                    className="w-full bg-gray-200 rounded-full h-2 sm:h-2.5 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={period.level_numeric}
                    aria-valuemin={1}
                    aria-valuemax={5}
                    aria-label={`Nivel ${period.level_numeric} de 5`}
                >
                    <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                            width: `${levelPercent}%`,
                            backgroundColor: levelColor
                        }}
                    />
                </div>
            </div>

            {/* Valores de contaminantes */}
            <div className="text-xs sm:text-sm text-gray-600 space-y-1">
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
            <p className="mt-2 sm:mt-3 text-xs text-gray-500 italic border-t pt-2">
                {period.description}
            </p>
        </article>
    );
};

export default React.memo(TrendsTab);
