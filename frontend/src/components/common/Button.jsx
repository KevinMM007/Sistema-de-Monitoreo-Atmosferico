/**
 * Componente Button - Botones reutilizables
 * Fase 4 - Optimización: Componentes UI comunes
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
    ...props
}) => {
    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
    };

    const variantClasses = {
        primary: `
            bg-blue-600 text-white 
            hover:bg-blue-700 
            focus:ring-blue-500
            shadow-md hover:shadow-lg
        `,
        secondary: `
            bg-gray-600 text-white 
            hover:bg-gray-700 
            focus:ring-gray-500
        `,
        success: `
            bg-green-600 text-white 
            hover:bg-green-700 
            focus:ring-green-500
        `,
        danger: `
            bg-red-600 text-white 
            hover:bg-red-700 
            focus:ring-red-500
        `,
        warning: `
            bg-yellow-500 text-black 
            hover:bg-yellow-600 
            focus:ring-yellow-500
        `,
        outline: `
            bg-transparent border-2 border-blue-600 text-blue-600 
            hover:bg-blue-50 
            focus:ring-blue-500
        `,
        outlineGray: `
            bg-transparent border border-gray-300 text-gray-700 
            hover:bg-gray-50 
            focus:ring-gray-500
        `,
        ghost: `
            bg-transparent text-gray-700 
            hover:bg-gray-100 
            focus:ring-gray-500
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
            className={`
                inline-flex items-center justify-center gap-2
                font-medium rounded-lg
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-offset-2
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
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Cargando...</span>
                </>
            ) : (
                <>
                    {icon && <span>{icon}</span>}
                    {children}
                    {iconRight && <span>{iconRight}</span>}
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
    ...props
}) => {
    const sizeClasses = {
        sm: 'w-8 h-8 text-sm',
        md: 'w-10 h-10 text-base',
        lg: 'w-12 h-12 text-lg',
    };

    const variantClasses = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-gray-600 text-white hover:bg-gray-700',
        ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
        outline: 'bg-transparent border border-gray-300 text-gray-600 hover:bg-gray-50',
    };

    const isDisabled = disabled || loading;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isDisabled}
            title={title}
            className={`
                inline-flex items-center justify-center
                rounded-lg
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                ${sizeClasses[size]}
                ${variantClasses[variant]}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${className}
            `}
            {...props}
        >
            {loading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
                icon
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
}) => {
    return (
        <div className={`inline-flex rounded-lg overflow-hidden ${className}`}>
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
}) => {
    return (
        <button
            type="button"
            onClick={() => !disabled && onToggle(!isOn)}
            disabled={disabled}
            className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-lg
                font-medium transition-all duration-200
                ${isOn 
                    ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${className}
            `}
        >
            <span className={`
                w-3 h-3 rounded-full transition-colors
                ${isOn ? 'bg-green-500' : 'bg-gray-400'}
            `} />
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
}) => {
    const positionClasses = {
        'bottom-right': 'bottom-6 right-6',
        'bottom-left': 'bottom-6 left-6',
        'top-right': 'top-6 right-6',
        'top-left': 'top-6 left-6',
    };

    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                fixed ${positionClasses[position]}
                w-14 h-14
                bg-blue-600 text-white
                rounded-full shadow-lg
                flex items-center justify-center
                hover:bg-blue-700 hover:shadow-xl
                focus:outline-none focus:ring-4 focus:ring-blue-300
                transition-all duration-200
                transform hover:scale-110
                z-50
                ${className}
            `}
        >
            <span className="text-2xl">{icon}</span>
        </button>
    );
};

export default Button;
