/**
 * Componente HistoricalChart - Gráfica de evolución temporal
 * Fase 4 - Refactorización de HistoricalDataDashboard
 */

import React, { useMemo } from 'react';
import { 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer 
} from 'recharts';
import { POLLUTANT_INFO } from '../../utils/constants';

const HistoricalChart = ({
    data,
    selectedPollutants,
    timeScale = 'daily',
    height = 400,
    className = '',
}) => {
    // Formatear timestamp según la escala temporal
    const formatXAxis = useMemo(() => {
        return (value) => {
            const date = new Date(value);
            if (timeScale === 'hourly') {
                return date.toLocaleString('es-MX', { 
                    day: '2-digit', 
                    hour: '2-digit' 
                });
            } else if (timeScale === 'daily') {
                return date.toLocaleDateString('es-MX', { 
                    month: 'short', 
                    day: '2-digit' 
                });
            } else {
                return date.toLocaleDateString('es-MX', { 
                    year: 'numeric', 
                    month: 'short' 
                });
            }
        };
    }, [timeScale]);

    // Formatear tooltip
    const formatTooltip = (value, name) => {
        const pollutantKey = Object.entries(POLLUTANT_INFO)
            .find(([_, info]) => info.name === name)?.[0];
        const unit = POLLUTANT_INFO[pollutantKey]?.unit || '';
        return [`${value.toFixed(2)} ${unit}`, name];
    };

    // Formatear etiqueta del tooltip
    const formatLabel = (value) => {
        return new Date(value).toLocaleString('es-MX');
    };

    if (!data || data.length === 0) {
        return (
            <div className={`flex items-center justify-center bg-gray-50 rounded-lg ${className}`} style={{ height }}>
                <div className="text-center text-gray-500">
                    <p className="text-lg font-medium">No hay datos para mostrar</p>
                    <p className="text-sm">Selecciona un rango de fechas y actualiza los datos</p>
                </div>
            </div>
        );
    }

    return (
        <div className={className}>
            <h3 className="text-lg font-semibold mb-4">Evolución Temporal</h3>
            <ResponsiveContainer width="100%" height={height}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={formatXAxis}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={{ stroke: '#d1d5db' }}
                    />
                    <YAxis 
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={{ stroke: '#d1d5db' }}
                    />
                    <Tooltip 
                        labelFormatter={formatLabel}
                        formatter={formatTooltip}
                        contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}
                    />
                    <Legend 
                        wrapperStyle={{ paddingTop: '10px' }}
                    />
                    {selectedPollutants.map(pollutant => {
                        const info = POLLUTANT_INFO[pollutant];
                        if (!info) return null;
                        
                        return (
                            <Line
                                key={pollutant}
                                type="monotone"
                                dataKey={pollutant}
                                name={info.name}
                                stroke={info.color}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 6 }}
                            />
                        );
                    })}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default React.memo(HistoricalChart);
