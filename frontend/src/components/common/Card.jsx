/**
 * Componente Card - Contenedor de tarjeta reutilizable
 * 
 * 🆕 MEJORAS:
 * - Responsive padding y tipografía
 * - Accesibilidad mejorada
 */

import React from 'react';

/**
 * Tarjeta contenedora básica
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenido de la tarjeta
 * @param {string} props.title - Título opcional
 * @param {string} props.subtitle - Subtítulo opcional
 * @param {React.ReactNode} props.icon - Ícono opcional para el título
 * @param {React.ReactNode} props.actions - Acciones/botones en el header
 * @param {string} props.className - Clases adicionales
 * @param {string} props.padding - Padding: 'none', 'sm', 'md', 'lg' (default: 'md')
 * @param {boolean} props.hover - Efecto hover (default: false)
 * @param {boolean} props.animate - Animación de entrada (default: true)
 * @param {string} props.variant - Variante: 'default', 'bordered', 'elevated'
 */
const Card = ({
    children,
    title = null,
    subtitle = null,
    icon = null,
    actions = null,
    className = '',
    padding = 'md',
    hover = false,
    animate = true,
    variant = 'default',
}) => {
    // Padding responsive
    const paddingClasses = {
        none: 'p-0',
        sm: 'p-2 sm:p-3',
        md: 'p-3 sm:p-4',
        lg: 'p-4 sm:p-6',
    };

    const variantClasses = {
        default: 'bg-white shadow-lg',
        bordered: 'bg-white border border-gray-200',
        elevated: 'bg-white shadow-xl',
        flat: 'bg-gray-50',
    };

    const hoverClass = hover ? 'hover:shadow-xl transition-shadow duration-200 cursor-pointer' : '';
    const animateClass = animate ? 'animate-fade-in' : '';

    return (
        <div
            className={`
                rounded-lg
                ${variantClasses[variant] || variantClasses.default}
                ${paddingClasses[padding]}
                ${hoverClass}
                ${animateClass}
                ${className}
            `}
            role={hover ? 'button' : undefined}
            tabIndex={hover ? 0 : undefined}
        >
            {(title || actions) && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 sm:mb-4">
                    <div className="flex items-center gap-2">
                        {icon && <span className="text-lg sm:text-xl" aria-hidden="true">{icon}</span>}
                        <div>
                            {title && (
                                <h2 className="text-lg sm:text-xl font-bold text-gray-800">{title}</h2>
                            )}
                            {subtitle && (
                                <p className="text-xs sm:text-sm text-gray-500">{subtitle}</p>
                            )}
                        </div>
                    </div>
                    {actions && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {actions}
                        </div>
                    )}
                </div>
            )}
            {children}
        </div>
    );
};

/**
 * Variante: Card con header coloreado
 */
export const ColoredCard = ({
    children,
    title,
    color = 'blue',
    icon = null,
    className = '',
}) => {
    const colorClasses = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-green-600',
        red: 'from-red-500 to-red-600',
        yellow: 'from-yellow-500 to-yellow-600',
        purple: 'from-purple-500 to-purple-600',
        indigo: 'from-indigo-500 to-indigo-600',
        gray: 'from-gray-500 to-gray-600',
    };

    return (
        <div className={`bg-white rounded-xl shadow-lg overflow-hidden ${className}`}>
            <div className={`bg-gradient-to-r ${colorClasses[color]} px-3 sm:px-4 py-2 sm:py-3`}>
                <h3 className="font-bold text-white flex items-center gap-2 text-sm sm:text-base">
                    {icon && <span aria-hidden="true">{icon}</span>}
                    {title}
                </h3>
            </div>
            <div className="p-3 sm:p-4">
                {children}
            </div>
        </div>
    );
};

/**
 * Variante: Card de información/alerta
 */
export const InfoCard = ({
    children,
    title,
    type = 'info',
    icon = null,
    className = '',
}) => {
    const typeClasses = {
        info: 'bg-blue-50 border-blue-200 text-blue-800',
        success: 'bg-green-50 border-green-200 text-green-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        neutral: 'bg-gray-50 border-gray-200 text-gray-800',
    };

    const defaultIcons = {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️',
        error: '❌',
        neutral: '📋',
    };

    // Roles ARIA para tipos de alerta
    const ariaRole = type === 'error' || type === 'warning' ? 'alert' : 'status';

    return (
        <div 
            className={`
                rounded-lg border p-3 sm:p-4
                ${typeClasses[type]}
                ${className}
            `}
            role={ariaRole}
        >
            {title && (
                <h4 className="font-semibold flex items-center gap-2 mb-1 sm:mb-2 text-sm sm:text-base">
                    <span aria-hidden="true">{icon || defaultIcons[type]}</span>
                    {title}
                </h4>
            )}
            <div className="text-xs sm:text-sm">
                {children}
            </div>
        </div>
    );
};

/**
 * Variante: Card clickeable/interactiva
 */
export const InteractiveCard = ({
    children,
    onClick,
    selected = false,
    disabled = false,
    className = '',
    ariaLabel = '',
}) => {
    const handleKeyDown = (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            onClick?.();
        }
    };

    return (
        <div
            onClick={disabled ? undefined : onClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-pressed={selected}
            aria-disabled={disabled}
            aria-label={ariaLabel}
            className={`
                rounded-lg p-3 sm:p-4 transition-all duration-200
                ${disabled 
                    ? 'bg-gray-100 cursor-not-allowed opacity-60' 
                    : 'bg-white cursor-pointer hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500'
                }
                ${selected 
                    ? 'ring-2 ring-blue-500 shadow-lg' 
                    : 'shadow border border-gray-100'
                }
                ${className}
            `}
        >
            {children}
        </div>
    );
};

export default Card;
