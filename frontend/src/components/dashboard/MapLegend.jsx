/**
 * Componente MapLegend - Leyenda del mapa de calidad del aire
 * Fase 4 - Refactorización del Dashboard
 */

import React from 'react';
import { AIR_QUALITY_LEVELS } from '../../utils/constants';

const MapLegend = ({ className = '' }) => {
    const levels = [
        { key: 'bueno', color: '#10b981' },
        { key: 'moderado', color: '#eab308' },
        { key: 'insalubre_sensibles', color: '#f97316', label: 'Insalubre' },
        { key: 'muy_insalubre', color: '#ef4444', label: 'Muy Insalubre' },
        { key: 'peligroso', color: '#7c2d12' },
    ];

    return (
        <div className={`bg-white/95 backdrop-blur-sm p-4 rounded-lg border border-gray-300 shadow-lg ${className}`}>
            <h4 className="font-bold mb-3 text-gray-800">Calidad del Aire</h4>
            <div className="space-y-2">
                {levels.map(({ key, color, label }) => (
                    <div key={key} className="flex items-center">
                        <div 
                            className="w-4 h-4 mr-3 rounded-sm border border-gray-400"
                            style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-medium text-gray-700">
                            {label || AIR_QUALITY_LEVELS[key]?.label || key}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default React.memo(MapLegend);
