/**
 * Componente Button - Botones reutilizables
 * 
 * 🆕 MEJORAS:
 * - Accesibilidad mejorada (aria-labels, aria-busy, aria-disabled)
 * - Responsive padding y tipografía
 * - Focus states visibles
 */

import React from 'react';

/**
 * Botón base reutilizable
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenido del botón
 * @param {string} props.variant - Variante: 'primary', 'secondary', 'outline', 'ghost', 'danger'
 * @param {string} props.size - Tamaño: 'sm', 'md', 'lg'
 * @param {string} props.icon - Ícono opcional (izquierda)
 * @param {string} props.iconRight - Ícono opcional (derecha)
 * @param {boolean} props.loading - Estado de carga
 * @param {boolean} props.disabled - Estado deshabilitado
 * @param {boolean} props.fullWidth - Ancho completo
 * @param {string} props.className - Clases adicionales
 * @param {Function} props.onClick - Handler de click
 * @param {string} props.type - Tipo de botón: 'button', 'submit', 'reset'
 * @param {string} props.ariaLabel - Etiqueta accesible
 */
const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    icon = null,
    iconRight = null,
    loading = false,
    disabled = false,
    fullWidth = false,
    className = '',
    onClick,
    type = 'button',
    ariaLabel,
    ...props
}) => {
    // Tamaños responsive
    const sizeClasses = {
        sm: 'px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm',
        md: 'px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm',
        lg: 'px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base',
    };

    const variantClasses = {
        primary: `
            bg-blue-600 text-white 
            hover:bg-blue-700 
            focus-visible:ring-blue-500
            shadow-md hover:shadow-lg
        `,
        secondary: `
            bg-gray-600 text-white 
            hover:bg-gray-700 
            focus-visible:ring-gray-500
        `,
        success: `
            bg-green-600 text-white 
            hover:bg-green-700 
            focus-visible:ring-green-500
        `,
        danger: `
            bg-red-600 text-white 
            hover:bg-red-700 
            focus-visible:ring-red-500
        `,
        warning: `
            bg-yellow-500 text-black 
            hover:bg-yellow-600 
            focus-visible:ring-yellow-500
        `,
        outline: `
            bg-transparent border-2 border-blue-600 text-blue-600 
            hover:bg-blue-50 
            focus-visible:ring-blue-500
        `,
        outlineGray: `
            bg-transparent border border-gray-300 text-gray-700 
            hover:bg-gray-50 
            focus-visible:ring-gray-500
        `,
        ghost: `
            bg-transparent text-gray-700 
            hover:bg-gray-100 
            focus-visible:ring-gray-500
        `,
        link: `
            bg-transparent text-blue-600 
            hover:text-blue-800 hover:underline
            p-0
        `,
    };

    const isDisabled = disabled || loading;

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={isDisabled}
            aria-disabled={isDisabled}
            aria-busy={loading}
            aria-label={ariaLabel}
            className={`
                inline-flex items-center justify-center gap-1.5 sm:gap-2
                font-medium rounded-lg
                transition-all duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                ${sizeClasses[size]}
                ${variantClasses[variant]}
                ${fullWidth ? 'w-full' : ''}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer transform hover:scale-[1.02]'}
                ${className}
            `}
            {...props}
        >
            {loading ? (
                <>
                    <span 
                        className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
                        aria-hidden="true"
                    />
                    <span className="sr-only">Cargando</span>
                    <span aria-hidden="true">Cargando...</span>
                </>
            ) : (
                <>
                    {icon && <span aria-hidden="true">{icon}</span>}
                    {children}
                    {iconRight && <span aria-hidden="true">{iconRight}</span>}
                </>
            )}
        </button>
    );
};

/**
 * Botón de ícono (solo ícono, sin texto)
 */
export const IconButton = ({
    icon,
    variant = 'ghost',
    size = 'md',
    loading = false,
    disabled = false,
    className = '',
    onClick,
    title = '',
    ariaLabel,
    ...props
}) => {
    const sizeClasses = {
        sm: 'w-7 h-7 sm:w-8 sm:h-8 text-xs sm:text-sm',
        md: 'w-8 h-8 sm:w-10 sm:h-10 text-sm sm:text-base',
        lg: 'w-10 h-10 sm:w-12 sm:h-12 text-base sm:text-lg',
    };

    const variantClasses = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
        secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus-visible:ring-gray-500',
        ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus-visible:ring-gray-500',
        outline: 'bg-transparent border border-gray-300 text-gray-600 hover:bg-gray-50 focus-visible:ring-gray-500',
    };

    const isDisabled = disabled || loading;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isDisabled}
            title={title}
            aria-label={ariaLabel || title}
            aria-disabled={isDisabled}
            aria-busy={loading}
            className={`
                inline-flex items-center justify-center
                rounded-lg
                transition-all duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                ${sizeClasses[size]}
                ${variantClasses[variant]}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${className}
            `}
            {...props}
        >
            {loading ? (
                <span 
                    className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
                    aria-hidden="true"
                />
            ) : (
                <span aria-hidden="true">{icon}</span>
            )}
        </button>
    );
};

/**
 * Grupo de botones
 */
export const ButtonGroup = ({
    children,
    className = '',
    ariaLabel = 'Grupo de opciones',
}) => {
    return (
        <div 
            className={`inline-flex rounded-lg overflow-hidden ${className}`}
            role="group"
            aria-label={ariaLabel}
        >
            {React.Children.map(children, (child, index) => {
                if (!React.isValidElement(child)) return child;
                
                return React.cloneElement(child, {
                    className: `
                        ${child.props.className || ''}
                        ${index === 0 ? 'rounded-r-none' : ''}
                        ${index === React.Children.count(children) - 1 ? 'rounded-l-none' : ''}
                        ${index !== 0 && index !== React.Children.count(children) - 1 ? 'rounded-none' : ''}
                        ${index !== 0 ? 'border-l-0' : ''}
                    `.trim(),
                });
            })}
        </div>
    );
};

/**
 * Botón toggle (on/off)
 */
export const ToggleButton = ({
    isOn,
    onToggle,
    labelOn = 'Activado',
    labelOff = 'Desactivado',
    disabled = false,
    className = '',
    ariaLabel,
}) => {
    return (
        <button
            type="button"
            onClick={() => !disabled && onToggle(!isOn)}
            disabled={disabled}
            role="switch"
            aria-checked={isOn}
            aria-label={ariaLabel || (isOn ? labelOn : labelOff)}
            className={`
                inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg
                font-medium text-xs sm:text-sm transition-all duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
                ${isOn 
                    ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${className}
            `}
        >
            <span 
                className={`
                    w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-colors
                    ${isOn ? 'bg-green-500' : 'bg-gray-400'}
                `}
                aria-hidden="true"
            />
            {isOn ? labelOn : labelOff}
        </button>
    );
};

/**
 * Botón de acción flotante (FAB)
 */
export const FloatingActionButton = ({
    icon,
    onClick,
    position = 'bottom-right',
    className = '',
    ariaLabel = 'Acción flotante',
}) => {
    const positionClasses = {
        'bottom-right': 'bottom-4 right-4 sm:bottom-6 sm:right-6',
        'bottom-left': 'bottom-4 left-4 sm:bottom-6 sm:left-6',
        'top-right': 'top-4 right-4 sm:top-6 sm:right-6',
        'top-left': 'top-4 left-4 sm:top-6 sm:left-6',
    };

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={ariaLabel}
            className={`
                fixed ${positionClasses[position]}
                w-12 h-12 sm:w-14 sm:h-14
                bg-blue-600 text-white
                rounded-full shadow-lg
                flex items-center justify-center
                hover:bg-blue-700 hover:shadow-xl
                focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300
                transition-all duration-200
                transform hover:scale-110
                z-50
                ${className}
            `}
        >
            <span className="text-xl sm:text-2xl" aria-hidden="true">{icon}</span>
        </button>
    );
};

export default Button;
