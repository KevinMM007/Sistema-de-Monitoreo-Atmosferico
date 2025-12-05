/**
 * Componente StatisticsGrid - Grid de estadísticas globales
 * 
 * 🆕 MEJORAS:
 * - Responsive design completo (grid adaptativo)
 * - Accesibilidad mejorada (roles, aria-labels)
 * - Tamaños de fuente adaptativos
 */

import React, { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { POLLUTANT_INFO } from '../../utils/constants';

/**
 * Calcula la tendencia de un contaminante
 */
const calculateTrend = (data, pollutant) => {
    if (!data || data.length < 2) return { trend: 'stable', percentage: 0 };
    
    const firstValue = data[0][pollutant];
    const lastValue = data[data.length - 1][pollutant];
    
    if (!firstValue || firstValue === 0) return { trend: 'stable', percentage: 0 };
    
    const percentage = ((lastValue - firstValue) / firstValue) * 100;
    
    if (Math.abs(percentage) < 5) return { trend: 'stable', percentage };
    return { trend: percentage > 0 ? 'increasing' : 'decreasing', percentage };
};

/**
 * Obtiene descripción textual de la tendencia para lectores de pantalla
 */
const getTrendDescription = (trend, percentage, pollutantName) => {
    const direction = trend === 'increasing' ? 'subiendo' : trend === 'decreasing' ? 'bajando' : 'estable';
    return `${pollutantName}: tendencia ${direction}, ${Math.abs(percentage).toFixed(1)} por ciento`;
};

const StatisticsGrid = ({
    statistics,
    historicalData,
    selectedPollutants,
    className = '',
}) => {
    if (!statistics) {
        return null;
    }

    return (
        <section
            className={className}
            role="region"
            aria-label="Estadísticas de contaminantes"
        >
            {/* Grid responsive: 1 col en móvil, 2 en tablet, 3 en desktop medio, 5 en desktop grande */}
            <div 
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4"
                role="list"
                aria-label="Lista de estadísticas por contaminante"
            >
                {selectedPollutants.map(pollutant => {
                    const stats = statistics[pollutant];
                    if (!stats || typeof stats.avg === 'undefined') return null;
                    
                    const info = POLLUTANT_INFO[pollutant];
                    if (!info) return null;
                    
                    const trend = calculateTrend(historicalData, pollutant);
                    
                    return (
                        <StatCard
                            key={pollutant}
                            pollutant={pollutant}
                            info={info}
                            stats={stats}
                            trend={trend}
                        />
                    );
                })}
            </div>
        </section>
    );
};

/**
 * Tarjeta individual de estadísticas
 */
const StatCard = React.memo(({ pollutant, info, stats, trend }) => {
    const trendColor = useMemo(() => {
        if (trend.trend === 'stable') return '#6b7280';
        if (trend.trend === 'increasing') return '#ef4444';
        return '#10b981';
    }, [trend.trend]);

    const trendLabel = useMemo(() => {
        if (trend.trend === 'stable') return 'Estable';
        if (trend.trend === 'increasing') return 'Subiendo';
        return 'Bajando';
    }, [trend.trend]);

    // Descripción completa para lectores de pantalla
    const cardDescription = `${info.name}: promedio ${stats.avg.toFixed(2)} ${info.unit}, 
        máximo ${stats.max.toFixed(2)} ${info.unit}, 
        mínimo ${stats.min.toFixed(2)} ${info.unit}, 
        tendencia ${trendLabel} ${Math.abs(trend.percentage).toFixed(1)} por ciento`;

    return (
        <article 
            className="bg-gray-50 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-blue-500"
            role="listitem"
            aria-label={cardDescription}
            tabIndex={0}
        >
            {/* Header con nombre y color */}
            <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2 text-sm sm:text-base">
                <span 
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: info.color }}
                    aria-hidden="true"
                />
                <span className="truncate">{info.name}</span>
            </h4>
            
            {/* Estadísticas */}
            <dl className="space-y-1 text-xs sm:text-sm">
                <div className="flex justify-between items-center">
                    <dt className="text-gray-500">Promedio:</dt>
                    <dd className="font-medium text-gray-800">
                        {stats.avg.toFixed(2)} <span className="text-gray-500">{info.unit}</span>
                    </dd>
                </div>
                <div className="flex justify-between items-center">
                    <dt className="text-gray-500">Máximo:</dt>
                    <dd className="font-medium text-gray-800">
                        {stats.max.toFixed(2)} <span className="text-gray-500">{info.unit}</span>
                    </dd>
                </div>
                <div className="flex justify-between items-center">
                    <dt className="text-gray-500">Mínimo:</dt>
                    <dd className="font-medium text-gray-800">
                        {stats.min.toFixed(2)} <span className="text-gray-500">{info.unit}</span>
                    </dd>
                </div>
            </dl>
            
            {/* Indicador de tendencia */}
            <div 
                className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-200"
                role="status"
                aria-label={`Tendencia: ${trendLabel}, ${Math.abs(trend.percentage).toFixed(1)} por ciento`}
            >
                <TrendingUp 
                    size={14} 
                    className={`flex-shrink-0 ${trend.trend === 'decreasing' ? 'rotate-180' : ''}`}
                    style={{ color: trendColor }}
                    aria-hidden="true"
                />
                <span 
                    className="text-xs font-medium truncate"
                    style={{ color: trendColor }}
                >
                    {trendLabel} ({Math.abs(trend.percentage).toFixed(1)}%)
                </span>
            </div>
        </article>
    );
});

// Nombre para debugging
StatCard.displayName = 'StatCard';

export default React.memo(StatisticsGrid);
