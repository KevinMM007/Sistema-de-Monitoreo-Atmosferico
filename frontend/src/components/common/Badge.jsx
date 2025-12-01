/**
 * Componente Badge - Etiquetas y badges reutilizables
 * Fase 4 - Optimización: Componentes UI comunes
 */

import React from 'react';

/**
 * Badge básico para etiquetas y estados
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenido del badge
 * @param {string} props.variant - Variante: 'solid', 'outline', 'soft'
 * @param {string} props.color - Color del badge
 * @param {string} props.size - Tamaño: 'sm', 'md', 'lg'
 * @param {string} props.icon - Ícono opcional
 * @param {boolean} props.dot - Mostrar punto indicador
 * @param {boolean} props.pulse - Animación de pulso
 * @param {string} props.className - Clases adicionales
 */
const Badge = ({
    children,
    variant = 'soft',
    color = 'gray',
    size = 'md',
    icon = null,
    dot = false,
    pulse = false,
    className = '',
}) => {
    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
        lg: 'px-3 py-1.5 text-base',
    };

    const colorVariants = {
        solid: {
            gray: 'bg-gray-600 text-white',
            blue: 'bg-blue-600 text-white',
            green: 'bg-green-600 text-white',
            red: 'bg-red-600 text-white',
            yellow: 'bg-yellow-500 text-black',
            orange: 'bg-orange-500 text-white',
            purple: 'bg-purple-600 text-white',
            indigo: 'bg-indigo-600 text-white',
        },
        outline: {
            gray: 'border border-gray-400 text-gray-700 bg-transparent',
            blue: 'border border-blue-400 text-blue-700 bg-transparent',
            green: 'border border-green-400 text-green-700 bg-transparent',
            red: 'border border-red-400 text-red-700 bg-transparent',
            yellow: 'border border-yellow-400 text-yellow-700 bg-transparent',
            orange: 'border border-orange-400 text-orange-700 bg-transparent',
            purple: 'border border-purple-400 text-purple-700 bg-transparent',
            indigo: 'border border-indigo-400 text-indigo-700 bg-transparent',
        },
        soft: {
            gray: 'bg-gray-100 text-gray-800',
            blue: 'bg-blue-100 text-blue-800',
            green: 'bg-green-100 text-green-800',
            red: 'bg-red-100 text-red-800',
            yellow: 'bg-yellow-100 text-yellow-800',
            orange: 'bg-orange-100 text-orange-800',
            purple: 'bg-purple-100 text-purple-800',
            indigo: 'bg-indigo-100 text-indigo-800',
        },
    };

    const dotColors = {
        gray: 'bg-gray-500',
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        red: 'bg-red-500',
        yellow: 'bg-yellow-500',
        orange: 'bg-orange-500',
        purple: 'bg-purple-500',
        indigo: 'bg-indigo-500',
    };

    return (
        <span
            className={`
                inline-flex items-center gap-1.5
                font-medium rounded-full
                ${sizeClasses[size]}
                ${colorVariants[variant]?.[color] || colorVariants.soft.gray}
                ${className}
            `}
        >
            {dot && (
                <span className={`
                    w-2 h-2 rounded-full
                    ${dotColors[color]}
                    ${pulse ? 'animate-pulse' : ''}
                `} />
            )}
            {icon && <span>{icon}</span>}
            {children}
        </span>
    );
};

/**
 * Badge para estados de calidad del aire
 */
export const AirQualityBadge = ({
    level,
    showIcon = true,
    size = 'md',
    className = '',
}) => {
    const levelConfig = {
        bueno: {
            label: 'Bueno',
            icon: '😊',
            color: '#10b981',
            bgColor: 'bg-green-100',
            textColor: 'text-green-800',
        },
        moderado: {
            label: 'Moderado',
            icon: '😐',
            color: '#eab308',
            bgColor: 'bg-yellow-100',
            textColor: 'text-yellow-800',
        },
        insalubre_sensibles: {
            label: 'Insalubre para Sensibles',
            icon: '😷',
            color: '#f97316',
            bgColor: 'bg-orange-100',
            textColor: 'text-orange-800',
        },
        insalubre: {
            label: 'Insalubre',
            icon: '🤒',
            color: '#ef4444',
            bgColor: 'bg-red-100',
            textColor: 'text-red-800',
        },
        muy_insalubre: {
            label: 'Muy Insalubre',
            icon: '😵',
            color: '#dc2626',
            bgColor: 'bg-red-200',
            textColor: 'text-red-900',
        },
        peligroso: {
            label: 'Peligroso',
            icon: '☠️',
            color: '#7c2d12',
            bgColor: 'bg-amber-900',
            textColor: 'text-white',
        },
    };

    const config = levelConfig[level] || levelConfig.bueno;
    
    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-3 py-1 text-sm',
        lg: 'px-4 py-1.5 text-base',
    };

    return (
        <span
            className={`
                inline-flex items-center gap-1.5
                font-semibold rounded-full
                ${sizeClasses[size]}
                ${config.bgColor}
                ${config.textColor}
                ${className}
            `}
        >
            {showIcon && <span>{config.icon}</span>}
            {config.label}
        </span>
    );
};

/**
 * Badge para estado de conexión/datos
 */
export const StatusBadge = ({
    status,
    size = 'md',
    className = '',
}) => {
    const statusConfig = {
        online: {
            label: 'En línea',
            color: 'green',
            dot: true,
            pulse: true,
        },
        offline: {
            label: 'Sin conexión',
            color: 'red',
            dot: true,
        },
        loading: {
            label: 'Cargando...',
            color: 'blue',
            dot: true,
            pulse: true,
        },
        real: {
            label: 'Datos Reales',
            color: 'green',
            dot: true,
            pulse: true,
        },
        fallback: {
            label: 'Datos Simulados',
            color: 'yellow',
            dot: true,
        },
        error: {
            label: 'Error',
            color: 'red',
            dot: true,
        },
    };

    const config = statusConfig[status] || statusConfig.offline;

    return (
        <Badge
            variant="soft"
            color={config.color}
            size={size}
            dot={config.dot}
            pulse={config.pulse}
            className={className}
        >
            {config.label}
        </Badge>
    );
};

/**
 * Badge numérico (para contadores, notificaciones)
 */
export const CountBadge = ({
    count,
    max = 99,
    color = 'red',
    className = '',
}) => {
    const displayCount = count > max ? `${max}+` : count;
    
    if (count === 0) return null;

    return (
        <Badge
            variant="solid"
            color={color}
            size="sm"
            className={`min-w-[1.25rem] justify-center ${className}`}
        >
            {displayCount}
        </Badge>
    );
};

/**
 * Badge con ícono de tendencia
 */
export const TrendBadge = ({
    trend,
    value = null,
    size = 'md',
    className = '',
}) => {
    const trendConfig = {
        up: {
            icon: '📈',
            label: 'Subiendo',
            color: 'red',
        },
        down: {
            icon: '📉',
            label: 'Bajando',
            color: 'green',
        },
        stable: {
            icon: '➡️',
            label: 'Estable',
            color: 'gray',
        },
        improved: {
            icon: '📉',
            label: 'Mejoró',
            color: 'green',
        },
        worsened: {
            icon: '📈',
            label: 'Empeoró',
            color: 'red',
        },
        no_data: {
            icon: '⚠️',
            label: 'Sin datos',
            color: 'yellow',
        },
    };

    const config = trendConfig[trend] || trendConfig.stable;

    return (
        <Badge
            variant="soft"
            color={config.color}
            size={size}
            icon={config.icon}
            className={className}
        >
            {value !== null ? `${value}%` : config.label}
        </Badge>
    );
};

export default Badge;
