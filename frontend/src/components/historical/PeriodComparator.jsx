/**
 * Componente PeriodComparator - Comparador de períodos
 * Fase 4 - Refactorización de HistoricalDataDashboard
 */

import React from 'react';
import { GitCompare, Calendar } from 'lucide-react';
import { Button, LoadingSpinner } from '../common';
import { COMPARISON_PRESETS } from '../../utils/constants';

const PeriodComparator = ({
    // Datos del hook useComparison
    dateRange1,
    dateRange2,
    setDateRange1,
    setDateRange2,
    activePreset,
    data: comparisonData,
    loading: comparisonLoading,
    fetchWithPreset,
    fetchWithCustomDates,
    className = '',
}) => {
    // Presets para comparaciones rápidas
    const presets = [
        { id: 'today-yesterday', label: 'Hoy vs Ayer', icon: '📅' },
        { id: 'this-week-last-week', label: 'Esta semana vs Anterior', icon: '📆' },
        { id: 'this-month-last-month', label: 'Este mes vs Anterior', icon: '🗓️' },
    ];

    const getTrendIcon = (trend) => {
        if (trend === 'up') return '📈';
        if (trend === 'down') return '📉';
        return '➡️';
    };

    const getTrendColor = (trend) => {
        if (trend === 'up') return 'text-red-600';
        if (trend === 'down') return 'text-green-600';
        return 'text-gray-600';
    };

    return (
        <div className={`bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <GitCompare className="text-white" size={20} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Comparador de Períodos</h3>
                        <p className="text-sm text-gray-600">Compara la calidad del aire entre diferentes fechas</p>
                    </div>
                </div>
            </div>

            {/* Presets rápidos */}
            <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-3">Comparaciones rápidas:</h4>
                <div className="flex flex-wrap gap-2">
                    {presets.map(preset => (
                        <button
                            key={preset.id}
                            onClick={() => fetchWithPreset(preset.id)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                                activePreset === preset.id
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                            }`}
                        >
                            <span>{preset.icon}</span>
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Selector de fechas personalizadas */}
            <div className="bg-white rounded-xl p-5 mb-6 border border-gray-200">
                <h4 className="font-medium text-gray-700 mb-4 flex items-center gap-2">
                    <Calendar size={18} />
                    Comparación personalizada:
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Período 1 */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <label className="block text-sm font-medium text-blue-700 mb-2">Período 1</label>
                        <div className="flex gap-2 items-center">
                            <input
                                type="date"
                                value={dateRange1.start}
                                onChange={(e) => setDateRange1({...dateRange1, start: e.target.value})}
                                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                            />
                            <span className="text-gray-400">→</span>
                            <input
                                type="date"
                                value={dateRange1.end}
                                onChange={(e) => setDateRange1({...dateRange1, end: e.target.value})}
                                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                            />
                        </div>
                    </div>

                    {/* Período 2 */}
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                        <label className="block text-sm font-medium text-purple-700 mb-2">Período 2</label>
                        <div className="flex gap-2 items-center">
                            <input
                                type="date"
                                value={dateRange2.start}
                                onChange={(e) => setDateRange2({...dateRange2, start: e.target.value})}
                                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm"
                            />
                            <span className="text-gray-400">→</span>
                            <input
                                type="date"
                                value={dateRange2.end}
                                onChange={(e) => setDateRange2({...dateRange2, end: e.target.value})}
                                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm"
                            />
                        </div>
                    </div>
                </div>

                <Button
                    variant="primary"
                    icon={<GitCompare size={18} />}
                    onClick={() => fetchWithCustomDates()}
                    loading={comparisonLoading}
                    className="mt-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                >
                    Comparar Períodos
                </Button>
            </div>

            {/* Resultados */}
            {comparisonLoading ? (
                <div className="text-center py-8">
                    <LoadingSpinner size="lg" text="Cargando comparación..." />
                </div>
            ) : comparisonData ? (
                <ComparisonResults 
                    data={comparisonData} 
                    getTrendIcon={getTrendIcon}
                    getTrendColor={getTrendColor}
                />
            ) : null}
        </div>
    );
};

/**
 * Resultados de la comparación
 */
const ComparisonResults = ({ data, getTrendIcon, getTrendColor }) => {
    const getOverallTrendStyle = () => {
        if (data.overall_trend === 'improved') return 'bg-green-50 border-green-300';
        if (data.overall_trend === 'worsened') return 'bg-red-50 border-red-300';
        if (data.overall_trend === 'no_data') return 'bg-amber-50 border-amber-300';
        return 'bg-gray-50 border-gray-300';
    };

    return (
        <div className="bg-white rounded-xl p-5 border border-gray-200">
            {/* Resumen */}
            <div className={`rounded-xl p-4 mb-6 border-2 ${getOverallTrendStyle()}`}>
                <h3 className="text-lg font-bold flex items-center gap-2">
                    {data.overall_trend === 'no_data' 
                        ? '⚠️' 
                        : getTrendIcon(data.overall_trend === 'improved' ? 'down' : data.overall_trend === 'worsened' ? 'up' : 'stable')}
                    {data.summary}
                </h3>
                {data.overall_trend === 'no_data' && (
                    <p className="text-sm text-amber-700 mt-2">
                        💡 Tip: Intenta seleccionar fechas más recientes o usa los presets rápidos.
                    </p>
                )}
            </div>

            {/* Comparación detallada */}
            {data.comparison && Object.keys(data.comparison).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {Object.entries(data.comparison).map(([pollutant, pollutantData]) => (
                        <PollutantComparison 
                            key={pollutant}
                            pollutant={pollutant}
                            data={pollutantData}
                            getTrendIcon={getTrendIcon}
                            getTrendColor={getTrendColor}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">
                    <p className="text-lg">No hay suficientes datos para comparar.</p>
                    <p className="text-sm mt-2">Intenta seleccionar un rango de fechas con datos disponibles.</p>
                </div>
            )}

            {/* Info de períodos */}
            {data.period1 && data.period2 && (
                <PeriodInfo period1={data.period1} period2={data.period2} />
            )}
        </div>
    );
};

/**
 * Comparación de un contaminante
 */
const PollutantComparison = ({ pollutant, data, getTrendIcon, getTrendColor }) => (
    <div className="bg-gray-50 rounded-xl p-4 hover:shadow-md transition-shadow">
        <h4 className="font-bold text-lg mb-3 text-gray-800">{pollutant.toUpperCase()}</h4>
        
        <div className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg">
                <span className="text-sm text-gray-600">Período 1:</span>
                <span className="font-bold text-blue-700">{data.period1_avg} µg/m³</span>
            </div>
            
            <div className="flex justify-between items-center p-2 bg-purple-50 rounded-lg">
                <span className="text-sm text-gray-600">Período 2:</span>
                <span className="font-bold text-purple-700">{data.period2_avg} µg/m³</span>
            </div>
            
            <div className={`flex justify-between items-center p-2 rounded-lg ${
                data.trend === 'down' ? 'bg-green-100' : data.trend === 'up' ? 'bg-red-100' : 'bg-gray-100'
            }`}>
                <span className="text-sm">Cambio:</span>
                <span className={`font-bold ${getTrendColor(data.trend)}`}>
                    {getTrendIcon(data.trend)} {data.change_percent > 0 ? '+' : ''}{data.change_percent}%
                </span>
            </div>
        </div>
    </div>
);

/**
 * Información de los períodos comparados
 */
const PeriodInfo = ({ period1, period2 }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <span className="text-lg">📊</span> Período 1
            </h4>
            <p className="text-sm text-gray-600">
                {period1.start} → {period1.end}
            </p>
            <p className="text-sm text-gray-500 mt-1">
                <strong>{period1.readings_count || 0}</strong> lecturas registradas
            </p>
            {period1.data_source && (
                <p className={`text-xs mt-1 ${period1.data_source === 'openmeteo' ? 'text-green-600' : 'text-blue-600'}`}>
                    📡 Fuente: {period1.data_source === 'openmeteo' ? 'Open Meteo API' : 'Base de datos local'}
                </p>
            )}
        </div>
        
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
            <h4 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                <span className="text-lg">📊</span> Período 2
            </h4>
            <p className="text-sm text-gray-600">
                {period2.start} → {period2.end}
            </p>
            <p className="text-sm text-gray-500 mt-1">
                <strong>{period2.readings_count || 0}</strong> lecturas registradas
            </p>
            {period2.data_source && (
                <p className={`text-xs mt-1 ${period2.data_source === 'openmeteo' ? 'text-green-600' : 'text-blue-600'}`}>
                    📡 Fuente: {period2.data_source === 'openmeteo' ? 'Open Meteo API' : 'Base de datos local'}
                </p>
            )}
        </div>
    </div>
);

export default React.memo(PeriodComparator);
