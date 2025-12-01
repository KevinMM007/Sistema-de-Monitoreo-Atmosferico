/**
 * Componente StatisticsGrid - Grid de estadísticas globales
 * Fase 4 - Refactorización de HistoricalDataDashboard
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
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 ${className}`}>
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

    return (
        <div className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow">
            <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: info.color }}
                />
                {info.name}
            </h4>
            
            <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-500">Promedio:</span>
                    <span className="font-medium">{stats.avg.toFixed(2)} {info.unit}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Máximo:</span>
                    <span className="font-medium">{stats.max.toFixed(2)} {info.unit}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Mínimo:</span>
                    <span className="font-medium">{stats.min.toFixed(2)} {info.unit}</span>
                </div>
                
                {/* Indicador de tendencia */}
                <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-200">
                    <TrendingUp 
                        size={16} 
                        className={trend.trend === 'decreasing' ? 'rotate-180' : ''}
                        style={{ color: trendColor }}
                    />
                    <span 
                        className="text-xs font-medium"
                        style={{ color: trendColor }}
                    >
                        {trend.trend === 'stable' ? 'Estable' : 
                         trend.trend === 'increasing' ? 'Subiendo' : 'Bajando'} 
                        ({Math.abs(trend.percentage).toFixed(1)}%)
                    </span>
                </div>
            </div>
        </div>
    );
});

export default React.memo(StatisticsGrid);
