/**
 * Componente PollutantStats - Estadísticas de contaminantes actuales
 * Fase 4 - Refactorización del Dashboard
 */

import React from 'react';
import { PollutantStatCard } from '../common';
import { 
    POLLUTANT_INFO, 
    getPollutantColor, 
    getTextColorForBg, 
    getPollutantLevel 
} from '../../utils/constants';

const PollutantStats = ({ 
    data, 
    className = '' 
}) => {
    if (!data) {
        return (
            <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 ${className}`}>
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="bg-gray-100 p-4 rounded-lg animate-pulse h-24" />
                ))}
            </div>
        );
    }

    // Obtener el último registro de datos
    const currentData = Array.isArray(data) ? data[data.length - 1] : data;

    if (!currentData) {
        return (
            <div className={`text-center py-8 text-gray-500 ${className}`}>
                No hay datos disponibles
            </div>
        );
    }

    return (
        <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 ${className}`}>
            {Object.entries(POLLUTANT_INFO).map(([key, info]) => {
                const value = currentData[key];
                
                if (value === undefined || value === null) return null;

                const color = getPollutantColor(key, value);
                const textColor = getTextColorForBg(key, value);
                const level = getPollutantLevel(key, value);

                return (
                    <PollutantStatCard
                        key={key}
                        name={info.name}
                        value={value}
                        unit={info.unit}
                        level={level}
                        levelColor={color}
                        levelTextColor={textColor}
                    />
                );
            })}
        </div>
    );
};

export default React.memo(PollutantStats);
