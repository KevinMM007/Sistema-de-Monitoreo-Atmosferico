/**
 * Componente DateRangeSelector - Selectores de fecha y escala temporal
 * 
 * 🆕 MEJORAS:
 * - Responsive design completo (móviles, tablets, desktop)
 * - Accesibilidad mejorada (labels, aria-labels, fieldsets)
 * - Layout adaptativo para diferentes tamaños de pantalla
 */

import React from 'react';
import { Calendar } from 'lucide-react';

const DateRangeSelector = ({
    dateRange,
    onStartChange,
    onEndChange,
    timeScale,
    onScaleChange,
    className = '',
}) => {
    const scales = [
        { value: 'hourly', label: 'Por Hora', shortLabel: 'Hora' },
        { value: 'daily', label: 'Por Día', shortLabel: 'Día' },
        { value: 'monthly', label: 'Por Mes', shortLabel: 'Mes' },
    ];

    // IDs únicos para accesibilidad
    const startDateId = 'date-range-start';
    const endDateId = 'date-range-end';
    const scaleId = 'time-scale-select';

    return (
        <fieldset 
            className={`${className}`}
            role="group"
            aria-label="Selector de rango de fechas y escala temporal"
        >
            <legend className="sr-only">Rango de fechas y escala temporal</legend>
            
            {/* Contenedor principal - Stack en móvil, flex en desktop */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-4">
                
                {/* Grupo de fechas */}
                <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 w-full sm:w-auto">
                    {/* Fecha inicio */}
                    <div className="flex items-center gap-2 w-full xs:w-auto">
                        <label 
                            htmlFor={startDateId}
                            className="flex items-center gap-1 text-gray-600 text-sm font-medium whitespace-nowrap"
                        >
                            <Calendar 
                                size={18} 
                                className="text-gray-500 flex-shrink-0" 
                                aria-hidden="true" 
                            />
                            <span className="hidden sm:inline">Desde:</span>
                        </label>
                        <input
                            type="date"
                            id={startDateId}
                            name="startDate"
                            value={dateRange.start}
                            onChange={(e) => onStartChange(e.target.value)}
                            aria-label="Fecha de inicio"
                            className="
                                flex-1 xs:flex-initial
                                px-2 sm:px-3 py-2 
                                text-sm
                                border border-gray-300 rounded-lg 
                                focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                                focus:outline-none
                                transition-all duration-200
                                bg-white
                            "
                        />
                    </div>

                    {/* Separador */}
                    <span 
                        className="hidden xs:block text-gray-400 font-medium px-1" 
                        aria-hidden="true"
                    >
                        →
                    </span>

                    {/* Fecha fin */}
                    <div className="flex items-center gap-2 w-full xs:w-auto">
                        <label 
                            htmlFor={endDateId}
                            className="text-gray-600 text-sm font-medium sm:hidden"
                        >
                            <span className="hidden sm:inline">Hasta:</span>
                        </label>
                        <input
                            type="date"
                            id={endDateId}
                            name="endDate"
                            value={dateRange.end}
                            onChange={(e) => onEndChange(e.target.value)}
                            aria-label="Fecha de fin"
                            className="
                                flex-1 xs:flex-initial
                                px-2 sm:px-3 py-2 
                                text-sm
                                border border-gray-300 rounded-lg 
                                focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                                focus:outline-none
                                transition-all duration-200
                                bg-white
                            "
                        />
                    </div>
                </div>

                {/* Separador visual - solo desktop */}
                <div 
                    className="hidden lg:block h-8 w-px bg-gray-300" 
                    aria-hidden="true"
                />

                {/* Escala temporal */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <label 
                        htmlFor={scaleId}
                        className="text-gray-600 text-sm font-medium whitespace-nowrap"
                    >
                        Escala:
                    </label>
                    <select
                        id={scaleId}
                        name="timeScale"
                        value={timeScale}
                        onChange={(e) => onScaleChange(e.target.value)}
                        aria-label="Escala temporal para agrupar datos"
                        className="
                            flex-1 sm:flex-initial
                            px-2 sm:px-3 py-2 
                            text-sm
                            border border-gray-300 rounded-lg 
                            focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                            focus:outline-none
                            bg-white 
                            transition-all duration-200
                            cursor-pointer
                        "
                    >
                        {scales.map(scale => (
                            <option key={scale.value} value={scale.value}>
                                {scale.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </fieldset>
    );
};

export default React.memo(DateRangeSelector);
