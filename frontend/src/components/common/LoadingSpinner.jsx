/**
 * Componente LoadingSpinner - Indicador de carga reutilizable
 * Fase 4 - Optimización: Componentes UI comunes
 */

import React from 'react';

/**
 * Spinner de carga con diferentes tamaños y colores
 * @param {Object} props
 * @param {string} props.size - Tamaño: 'sm', 'md', 'lg', 'xl' (default: 'md')
 * @param {string} props.color - Color del spinner (default: 'blue')
 * @param {string} props.text - Texto opcional a mostrar
 * @param {boolean} props.fullScreen - Si ocupa toda la pantalla
 * @param {string} props.className - Clases adicionales
 */
const LoadingSpinner = ({ 
    size = 'md', 
    color = 'blue', 
    text = null,
    fullScreen = false,
    className = '' 
}) => {
    const sizeClasses = {
        sm: 'w-4 h-4 border-2',
        md: 'w-8 h-8 border-3',
        lg: 'w-12 h-12 border-4',
        xl: 'w-16 h-16 border-4',
    };

    const colorClasses = {
        blue: 'border-blue-500',
        green: 'border-green-500',
        red: 'border-red-500',
        yellow: 'border-yellow-500',
        purple: 'border-purple-500',
        gray: 'border-gray-500',
        white: 'border-white',
    };

    const spinner = (
        <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
            <div
                className={`
                    ${sizeClasses[size] || sizeClasses.md}
                    ${colorClasses[color] || colorClasses.blue}
                    border-t-transparent
                    rounded-full
                    animate-spin
                `}
            />
            {text && (
                <p className="text-gray-600 text-sm font-medium animate-pulse">
                    {text}
                </p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
                {spinner}
            </div>
        );
    }

    return spinner;
};

/**
 * Variante: Skeleton loader para contenido
 */
export const SkeletonLoader = ({ 
    width = '100%', 
    height = '1rem', 
    className = '',
    rounded = 'md' 
}) => {
    const roundedClasses = {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        full: 'rounded-full',
    };

    return (
        <div
            className={`
                bg-gray-200 
                animate-pulse 
                ${roundedClasses[rounded]}
                ${className}
            `}
            style={{ width, height }}
        />
    );
};

/**
 * Variante: Contenedor de carga con overlay
 */
export const LoadingOverlay = ({ 
    loading = false, 
    children, 
    text = 'Cargando...',
    blur = true 
}) => {
    return (
        <div className="relative">
            {children}
            {loading && (
                <div className={`
                    absolute inset-0 
                    bg-white/70 
                    ${blur ? 'backdrop-blur-sm' : ''}
                    flex items-center justify-center 
                    z-10
                    rounded-lg
                `}>
                    <LoadingSpinner size="lg" text={text} />
                </div>
            )}
        </div>
    );
};

export default LoadingSpinner;
