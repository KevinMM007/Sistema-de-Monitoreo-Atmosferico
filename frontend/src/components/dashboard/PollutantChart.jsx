/**
 * Componente PollutantChart - Gráfica de contaminantes
 * Fase 4 - Refactorización del Dashboard
 * 
 * CORREGIDO: Manejo de height para evitar error de width/height 0
 */

import React, { useMemo } from 'react';
import { LineChart, XAxis, YAxis, Tooltip, Legend, Line, ResponsiveContainer, CartesianGrid } from 'recharts';
import { POLLUTANT_INFO } from '../../utils/constants';

// Colores para las líneas de la gráfica
const LINE_COLORS = {
    pm25: '#8b5cf6', // Púrpura
    pm10: '#3b82f6', // Azul
    no2: '#ffc658',  // Amarillo
    o3: '#ff7300',   // Naranja
    co: '#ef4444',   // Rojo
};

const PollutantChart = ({ 
    data, 
    height = 350,
    selectedPollutants = null, // null = todos
    className = '' 
}) => {
    // Determinar qué contaminantes mostrar
    const pollutantsToShow = useMemo(() => {
        if (selectedPollutants && selectedPollutants.length > 0) {
            return selectedPollutants;
        }
        return Object.keys(POLLUTANT_INFO);
    }, [selectedPollutants]);

    // Procesar datos para la gráfica
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];
        
        // Asegurar que los datos estén ordenados por timestamp
        const sortedData = [...data].sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
        );
        
        return sortedData.map(item => ({
            ...item,
            // Asegurar que el timestamp sea parseable
            timestamp: item.timestamp,
            // Convertir valores a números
            pm25: Number(item.pm25) || 0,
            pm10: Number(item.pm10) || 0,
            no2: Number(item.no2) || 0,
            o3: Number(item.o3) || 0,
            co: Number(item.co) || 0,
        }));
    }, [data]);

    // Formatear timestamp para el eje X
    const formatXAxis = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    // Formatear tooltip
    const formatTooltip = (value, name, { dataKey }) => {
        const pollutant = POLLUTANT_INFO[dataKey];
        if (pollutant) {
            return [pollutant.format(value), pollutant.name];
        }
        return [value, name];
    };

    // Formatear etiqueta del tooltip
    const formatLabel = (timestamp) => {
        return new Date(timestamp).toLocaleString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    // Calcular dominio del eje Y automáticamente
    const yDomain = useMemo(() => {
        if (!chartData || chartData.length === 0) return [0, 100];
        
        let maxValue = 0;
        chartData.forEach(item => {
            pollutantsToShow.forEach(key => {
                const value = item[key];
                if (typeof value === 'number' && value > maxValue) {
                    maxValue = value;
                }
            });
        });
        
        // Agregar 10% de margen superior
        return [0, Math.ceil(maxValue * 1.1)];
    }, [chartData, pollutantsToShow]);

    // Calcular altura numérica
    const numericHeight = useMemo(() => {
        if (typeof height === 'number') return height;
        if (height === '100%') return '100%';
        // Intentar parsear si es string con número
        const parsed = parseInt(height, 10);
        return isNaN(parsed) ? 350 : parsed;
    }, [height]);

    if (!data || data.length === 0) {
        return (
            <div 
                className={`flex items-center justify-center bg-gray-50 rounded-lg ${className}`} 
                style={{ height: numericHeight === '100%' ? '100%' : numericHeight, minHeight: 200 }}
            >
                <div className="text-center">
                    <p className="text-gray-500 text-lg">No hay datos para mostrar</p>
                    <p className="text-gray-400 text-sm mt-1">Los datos se actualizan cada hora</p>
                </div>
            </div>
        );
    }

    // Advertencia si hay pocos datos
    const hasLowData = chartData.length < 6;

    return (
        <div className={`w-full h-full ${className}`}>
            {hasLowData && (
                <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                    ⚠️ Datos limitados ({chartData.length} registros). La gráfica se actualizará cuando haya más datos disponibles.
                </div>
            )}
            {/* Contenedor con altura mínima garantizada */}
            <div 
                style={{ 
                    height: numericHeight === '100%' ? '100%' : numericHeight,
                    minHeight: 200,
                    width: '100%'
                }}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                        data={chartData} 
                        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                            dataKey="timestamp" 
                            tickFormatter={formatXAxis}
                            tick={{ fontSize: 11 }}
                            interval="preserveStartEnd"
                            minTickGap={50}
                        />
                        <YAxis 
                            tick={{ fontSize: 11 }} 
                            domain={yDomain}
                            allowDataOverflow={false}
                            width={40}
                        />
                        <Tooltip
                            formatter={formatTooltip}
                            labelFormatter={formatLabel}
                            contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                borderRadius: '8px',
                                border: '1px solid #e5e7eb',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                            }}
                        />
                        <Legend 
                            wrapperStyle={{ paddingTop: '10px' }}
                        />
                        {pollutantsToShow.map((key) => {
                            const info = POLLUTANT_INFO[key];
                            if (!info) return null;
                            
                            return (
                                <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    name={info.name}
                                    stroke={LINE_COLORS[key] || '#666666'}
                                    strokeWidth={2}
                                    dot={chartData.length <= 12 ? { r: 4 } : false}
                                    activeDot={{ r: 6 }}
                                    connectNulls={true}
                                />
                            );
                        })}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default React.memo(PollutantChart);
