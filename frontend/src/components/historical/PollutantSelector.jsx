/**
 * Componente PollutantSelector - Selector de contaminantes
 * 
 * 🆕 MEJORAS:
 * - Accesibilidad completa (role="group", aria-labels, focus visible)
 * - Responsive design mejorado
 * - Navegación por teclado
 */

import React, { useCallback } from 'react';
import { POLLUTANT_INFO } from '../../utils/constants';

const PollutantSelector = ({
    selectedPollutants,
    onToggle,
    className = '',
}) => {
    // Handler para navegación por teclado
    const handleKeyDown = useCallback((e, key) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle(key);
        }
    }, [onToggle]);

    return (
        <fieldset 
            className={`${className}`}
            role="group"
            aria-label="Seleccionar contaminantes a visualizar"
        >
            <legend className="sr-only">Contaminantes disponibles</legend>
            
            <div 
                className="flex flex-wrap gap-1.5 sm:gap-2"
                role="list"
            >
                {Object.entries(POLLUTANT_INFO).map(([key, info]) => {
                    const isSelected = selectedPollutants.includes(key);
                    const buttonId = `pollutant-${key}`;
                    
                    return (
                        <div key={key} role="listitem">
                            {/* Input oculto para accesibilidad de formulario */}
                            <input
                                type="checkbox"
                                id={buttonId}
                                checked={isSelected}
                                onChange={() => onToggle(key)}
                                className="sr-only peer"
                                aria-describedby={`${buttonId}-desc`}
                            />
                            
                            {/* Label visual interactivo */}
                            <label 
                                htmlFor={buttonId}
                                onKeyDown={(e) => handleKeyDown(e, key)}
                                tabIndex={0}
                                role="checkbox"
                                aria-checked={isSelected}
                                className={`
                                    inline-flex items-center gap-1
                                    px-2 sm:px-3 py-1 sm:py-1.5 
                                    rounded-lg 
                                    text-xs sm:text-sm font-medium
                                    cursor-pointer
                                    transition-all duration-200
                                    focus:outline-none focus:ring-2 focus:ring-offset-1
                                    select-none
                                    ${isSelected 
                                        ? 'ring-2 ring-offset-1 shadow-md scale-105' 
                                        : 'opacity-60 hover:opacity-100 hover:shadow-sm'
                                    }
                                `}
                                style={{ 
                                    backgroundColor: isSelected ? `${info.color}30` : `${info.color}15`,
                                    color: info.color,
                                    '--tw-ring-color': info.color,
                                }}
                            >
                                {/* Indicador de selección */}
                                {isSelected && (
                                    <span 
                                        className="text-xs" 
                                        aria-hidden="true"
                                    >
                                        ✓
                                    </span>
                                )}
                                
                                {/* Nombre del contaminante */}
                                <span>{info.name}</span>
                            </label>
                            
                            {/* Descripción oculta para lectores de pantalla */}
                            <span 
                                id={`${buttonId}-desc`} 
                                className="sr-only"
                            >
                                {isSelected ? 'Seleccionado' : 'No seleccionado'}. 
                                Unidad de medida: {info.unit}
                            </span>
                        </div>
                    );
                })}
            </div>
            
            {/* Instrucción para usuarios de teclado */}
            <p className="sr-only">
                Use las teclas de flecha para navegar y Espacio o Enter para seleccionar/deseleccionar.
            </p>
        </fieldset>
    );
};

export default React.memo(PollutantSelector);
