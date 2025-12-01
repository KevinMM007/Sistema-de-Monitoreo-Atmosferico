/**
 * Componente DateRangeSelector - Selectores de fecha y escala temporal
 * Fase 4 - Refactorización de HistoricalDataDashboard
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
        { value: 'hourly', label: 'Por Hora' },
        { value: 'daily', label: 'Por Día' },
        { value: 'monthly', label: 'Por Mes' },
    ];

    return (
        <div className={`flex flex-wrap items-center gap-4 ${className}`}>
            {/* Fecha inicio */}
            <div className="flex items-center gap-2">
                <Calendar size={20} className="text-gray-500" />
                <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => onStartChange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
            </div>

            <span className="text-gray-500 font-medium">hasta</span>

            {/* Fecha fin */}
            <div>
                <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => onEndChange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
            </div>

            {/* Escala temporal */}
            <div className="flex items-center gap-2">
                <span className="text-gray-600 text-sm font-medium">Escala:</span>
                <select
                    value={timeScale}
                    onChange={(e) => onScaleChange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all"
                >
                    {scales.map(scale => (
                        <option key={scale.value} value={scale.value}>
                            {scale.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default React.memo(DateRangeSelector);
