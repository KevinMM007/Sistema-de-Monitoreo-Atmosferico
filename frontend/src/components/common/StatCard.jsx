/**
 * Componente StatCard - Tarjeta de estadística reutilizable
 * Fase 4 - Optimización: Componentes UI comunes
 */

import React from 'react';

/**
 * Tarjeta para mostrar una estadística/métrica
 * @param {Object} props
 * @param {string} props.title - Título de la métrica
 * @param {string|number} props.value - Valor principal
 * @param {string} props.unit - Unidad de medida
 * @param {string} props.icon - Ícono/emoji
 * @param {string} props.trend - Tendencia: 'up', 'down', 'stable'
 * @param {string|number} props.trendValue - Valor del cambio
 * @param {string} props.color - Color del valor
 * @param {string} props.bgColor - Color de fondo
 * @param {string} props.subtitle - Texto secundario
 * @param {string} props.className - Clases adicionales
 * @param {Function} props.onClick - Handler de click
 */
const StatCard = ({
    title,
    value,
    unit = '',
    icon = null,
    trend = null,
    trendValue = null,
    color = null,
    bgColor = 'bg-gray-50',
    subtitle = null,
    className = '',
    onClick = null,
}) => {
    const trendIcons = {
        up: '📈',
        down: '📉',
        stable: '➡️',
    };

    const trendColors = {
        up: 'text-red-600',
        down: 'text-green-600',
        stable: 'text-gray-600',
    };

    return (
        <div
            onClick={onClick}
            className={`
                ${bgColor}
                p-4 rounded-lg
                transition-all duration-200
                ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : ''}
                ${className}
            `}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {icon && <span className="text-lg">{icon}</span>}
                    <span className="text-gray-600 font-medium text-sm">{title}</span>
                </div>
                {trend && (
                    <span className={`text-xs font-medium ${trendColors[trend]}`}>
                        {trendIcons[trend]} {trendValue}
                    </span>
                )}
            </div>
            
            <div className="flex items-baseline gap-1">
                <span 
                    className="text-2xl font-bold"
                    style={color ? { color } : {}}
                >
                    {value}
                </span>
                {unit && (
                    <span className="text-sm text-gray-500">{unit}</span>
                )}
            </div>
            
            {subtitle && (
                <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
        </div>
    );
};

/**
 * Variante: StatCard grande con más detalles
 */
export const StatCardLarge = ({
    title,
    value,
    unit = '',
    icon = null,
    description = null,
    status = null,
    statusColor = null,
    footer = null,
    className = '',
}) => {
    return (
        <div className={`bg-white rounded-xl shadow-lg p-5 ${className}`}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    {icon && (
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                            {icon}
                        </div>
                    )}
                    <div>
                        <h3 className="font-semibold text-gray-800">{title}</h3>
                        {description && (
                            <p className="text-sm text-gray-500">{description}</p>
                        )}
                    </div>
                </div>
                {status && (
                    <span 
                        className="px-3 py-1 rounded-full text-sm font-medium text-white"
                        style={{ backgroundColor: statusColor || '#6b7280' }}
                    >
                        {status}
                    </span>
                )}
            </div>
            
            <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold text-gray-900">{value}</span>
                {unit && <span className="text-lg text-gray-500">{unit}</span>}
            </div>
            
            {footer && (
                <div className="pt-3 border-t border-gray-100 mt-3">
                    {footer}
                </div>
            )}
        </div>
    );
};

/**
 * Variante: Grid de estadísticas
 */
export const StatGrid = ({
    stats,
    columns = 4,
    className = '',
}) => {
    const gridCols = {
        2: 'grid-cols-2',
        3: 'grid-cols-3',
        4: 'grid-cols-2 md:grid-cols-4',
        5: 'grid-cols-2 md:grid-cols-5',
        6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
    };

    return (
        <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
            {stats.map((stat, index) => (
                <StatCard key={index} {...stat} />
            ))}
        </div>
    );
};

/**
 * Variante: StatCard para contaminantes
 */
export const PollutantStatCard = ({
    name,
    value,
    unit,
    level,
    levelColor,
    levelTextColor = '#ffffff',
    className = '',
}) => {
    return (
        <div className={`bg-gray-50 p-3 rounded-lg hover:shadow-md transition-shadow ${className}`}>
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-md font-semibold">
                    {name} <span className="text-xs text-gray-500">({unit})</span>
                </h3>
                <span
                    className="px-2 py-1 rounded text-sm font-semibold"
                    style={{ 
                        backgroundColor: levelColor,
                        color: levelTextColor 
                    }}
                >
                    {level}
                </span>
            </div>
            <p className="text-xl font-bold">
                {typeof value === 'number' ? value.toFixed(2) : value} {unit}
            </p>
        </div>
    );
};

/**
 * Variante: StatCard con comparación
 */
export const ComparisonStatCard = ({
    title,
    value1,
    value2,
    label1 = 'Período 1',
    label2 = 'Período 2',
    unit = '',
    changePercent = null,
    trend = null,
    className = '',
}) => {
    const trendColors = {
        up: 'text-red-600 bg-red-50',
        down: 'text-green-600 bg-green-50',
        stable: 'text-gray-600 bg-gray-50',
    };

    const trendIcons = {
        up: '📈',
        down: '📉',
        stable: '➡️',
    };

    return (
        <div className={`bg-white rounded-xl p-4 shadow ${className}`}>
            <h4 className="font-semibold text-gray-800 mb-3">{title}</h4>
            
            <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                    <span className="text-sm text-blue-700">{label1}:</span>
                    <span className="font-bold text-blue-800">{value1} {unit}</span>
                </div>
                
                <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                    <span className="text-sm text-purple-700">{label2}:</span>
                    <span className="font-bold text-purple-800">{value2} {unit}</span>
                </div>
                
                {changePercent !== null && trend && (
                    <div className={`flex justify-between items-center p-2 rounded ${trendColors[trend]}`}>
                        <span className="text-sm">Cambio:</span>
                        <span className="font-bold">
                            {trendIcons[trend]} {changePercent > 0 ? '+' : ''}{changePercent}%
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatCard;
