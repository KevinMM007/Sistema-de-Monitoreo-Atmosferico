/**
 * Componente PollutantSelector - Selector de contaminantes
 * Fase 4 - Refactorización de HistoricalDataDashboard
 */

import React from 'react';
import { POLLUTANT_INFO } from '../../utils/constants';

const PollutantSelector = ({
    selectedPollutants,
    onToggle,
    className = '',
}) => {
    return (
        <div className={`flex flex-wrap gap-2 ${className}`}>
            {Object.entries(POLLUTANT_INFO).map(([key, info]) => {
                const isSelected = selectedPollutants.includes(key);
                
                return (
                    <label 
                        key={key} 
                        className="flex items-center cursor-pointer group"
                    >
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggle(key)}
                            className="sr-only"
                        />
                        <span 
                            className={`
                                px-3 py-1.5 rounded-lg text-sm font-medium
                                transition-all duration-200
                                ${isSelected 
                                    ? 'ring-2 ring-offset-1 shadow-md' 
                                    : 'opacity-60 hover:opacity-100'
                                }
                            `}
                            style={{ 
                                backgroundColor: isSelected ? `${info.color}30` : `${info.color}15`,
                                color: info.color,
                                ringColor: info.color,
                            }}
                        >
                            {isSelected && <span className="mr-1">✓</span>}
                            {info.name}
                        </span>
                    </label>
                );
            })}
        </div>
    );
};

export default React.memo(PollutantSelector);
