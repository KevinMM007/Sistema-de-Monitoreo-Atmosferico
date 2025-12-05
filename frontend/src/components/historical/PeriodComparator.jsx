/**
 * Componente PeriodComparator - Comparador de períodos
 * 
 * 🆕 MEJORAS:
 * - Responsive design completo
 * - Accesibilidad mejorada (labels, roles, aria-labels)
 * - Layout adaptativo para móviles
 */

import React from 'react';
import { GitCompare, Calendar } from 'lucide-react';
import { Button, LoadingSpinner } from '../common';

const PeriodComparator = ({
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
        { id: 'today-yesterday', label: 'Hoy vs Ayer', shortLabel: 'Hoy/Ayer', icon: '📅' },
        { id: 'this-week-last-week', label: 'Esta semana vs Anterior', shortLabel: 'Semana', icon: '📆' },
        { id: 'this-month-last-month', label: 'Este mes vs Anterior', shortLabel: 'Mes', icon: '🗓️' },
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
        <section 
            className={`bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 sm:p-6 border border-indigo-200 ${className}`}
            role="region"
            aria-label="Comparador de períodos de calidad del aire"
        >
            {/* Header - Responsive */}
            <header className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 sm:mb-6">
                <div className="flex items-center gap-3">
                    <div 
                        className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0"
                        aria-hidden="true"
                    >
                        <GitCompare className="text-white" size={18} />
                    </div>
                    <div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-800">
                            Comparador de Períodos
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                            Compara la calidad del aire entre diferentes fechas
                        </p>
                    </div>
                </div>
            </header>

            {/* Presets rápidos - Grid en móvil */}
            <div className="mb-4 sm:mb-6">
                <h4 className="font-medium text-gray-700 mb-2 sm:mb-3 text-sm sm:text-base">
                    Comparaciones rápidas:
                </h4>
                <div 
                    className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2"
                    role="group"
                    aria-label="Presets de comparación rápida"
                >
                    {presets.map(preset => (
                        <button
                            key={preset.id}
                            onClick={() => fetchWithPreset(preset.id)}
                            aria-pressed={activePreset === preset.id}
                            className={`
                                px-2 sm:px-4 py-2 rounded-lg font-medium transition-all 
                                flex items-center justify-center gap-1 sm:gap-2
                                text-xs sm:text-sm
                                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                                ${activePreset === preset.id
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                }
                            `}
                        >
                            <span aria-hidden="true">{preset.icon}</span>
                            <span className="hidden sm:inline">{preset.label}</span>
                            <span className="sm:hidden">{preset.shortLabel}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Selector de fechas personalizadas */}
            <div className="bg-white rounded-xl p-4 sm:p-5 mb-4 sm:mb-6 border border-gray-200">
                <h4 className="font-medium text-gray-700 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                    <Calendar size={16} aria-hidden="true" />
                    Comparación personalizada:
                </h4>
                
                {/* Períodos - Stack en móvil, grid en desktop */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Período 1 */}
                    <fieldset className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-100">
                        <legend className="text-sm font-medium text-blue-700 mb-2 px-1">
                            Período 1
                        </legend>
                        <div className="flex flex-col xs:flex-row gap-2 items-start xs:items-center">
                            <div className="flex-1 w-full xs:w-auto">
                                <label htmlFor="period1-start" className="sr-only">
                                    Fecha inicio período 1
                                </label>
                                <input
                                    type="date"
                                    id="period1-start"
                                    value={dateRange1.start}
                                    onChange={(e) => setDateRange1({...dateRange1, start: e.target.value})}
                                    aria-label="Fecha de inicio del período 1"
                                    className="w-full px-2 sm:px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                />
                            </div>
                            <span className="text-gray-400 hidden xs:inline" aria-hidden="true">→</span>
                            <div className="flex-1 w-full xs:w-auto">
                                <label htmlFor="period1-end" className="sr-only">
                                    Fecha fin período 1
                                </label>
                                <input
                                    type="date"
                                    id="period1-end"
                                    value={dateRange1.end}
                                    onChange={(e) => setDateRange1({...dateRange1, end: e.target.value})}
                                    aria-label="Fecha de fin del período 1"
                                    className="w-full px-2 sm:px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                />
                            </div>
                        </div>
                    </fieldset>

                    {/* Período 2 */}
                    <fieldset className="bg-purple-50 p-3 sm:p-4 rounded-lg border border-purple-100">
                        <legend className="text-sm font-medium text-purple-700 mb-2 px-1">
                            Período 2
                        </legend>
                        <div className="flex flex-col xs:flex-row gap-2 items-start xs:items-center">
                            <div className="flex-1 w-full xs:w-auto">
                                <label htmlFor="period2-start" className="sr-only">
                                    Fecha inicio período 2
                                </label>
                                <input
                                    type="date"
                                    id="period2-start"
                                    value={dateRange2.start}
                                    onChange={(e) => setDateRange2({...dateRange2, start: e.target.value})}
                                    aria-label="Fecha de inicio del período 2"
                                    className="w-full px-2 sm:px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm"
                                />
                            </div>
                            <span className="text-gray-400 hidden xs:inline" aria-hidden="true">→</span>
                            <div className="flex-1 w-full xs:w-auto">
                                <label htmlFor="period2-end" className="sr-only">
                                    Fecha fin período 2
                                </label>
                                <input
                                    type="date"
                                    id="period2-end"
                                    value={dateRange2.end}
                                    onChange={(e) => setDateRange2({...dateRange2, end: e.target.value})}
                                    aria-label="Fecha de fin del período 2"
                                    className="w-full px-2 sm:px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm"
                                />
                            </div>
                        </div>
                    </fieldset>
                </div>

                <Button
                    variant="primary"
                    icon={<GitCompare size={16} aria-hidden="true" />}
                    onClick={() => fetchWithCustomDates()}
                    loading={comparisonLoading}
                    className="mt-4 w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                    ariaLabel="Ejecutar comparación de períodos personalizada"
                >
                    <span className="hidden sm:inline">Comparar Períodos</span>
                    <span className="sm:hidden">Comparar</span>
                </Button>
            </div>

            {/* Resultados */}
            {comparisonLoading ? (
                <div 
                    className="text-center py-6 sm:py-8" 
                    role="status" 
                    aria-label="Cargando comparación"
                >
                    <LoadingSpinner size="lg" text="Cargando comparación..." />
                </div>
            ) : comparisonData ? (
                <ComparisonResults 
                    data={comparisonData} 
                    getTrendIcon={getTrendIcon}
                    getTrendColor={getTrendColor}
                />
            ) : null}
        </section>
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
        <div 
            className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200"
            role="region"
            aria-label="Resultados de la comparación"
        >
            {/* Resumen */}
            <div 
                className={`rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 border-2 ${getOverallTrendStyle()}`}
                role="status"
                aria-live="polite"
            >
                <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 flex-wrap">
                    <span aria-hidden="true">
                        {data.overall_trend === 'no_data' 
                            ? '⚠️' 
                            : getTrendIcon(data.overall_trend === 'improved' ? 'down' : data.overall_trend === 'worsened' ? 'up' : 'stable')}
                    </span>
                    <span>{data.summary}</span>
                </h3>
                {data.overall_trend === 'no_data' && (
                    <p className="text-xs sm:text-sm text-amber-700 mt-2">
                        💡 Tip: Intenta seleccionar fechas más recientes o usa los presets rápidos.
                    </p>
                )}
            </div>

            {/* Comparación detallada */}
            {data.comparison && Object.keys(data.comparison).length > 0 ? (
                <div 
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6"
                    role="list"
                    aria-label="Comparación detallada por contaminante"
                >
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
                <div className="text-center py-6 sm:py-8 text-gray-500 bg-gray-50 rounded-xl">
                    <p className="text-base sm:text-lg">No hay suficientes datos para comparar.</p>
                    <p className="text-xs sm:text-sm mt-2">Intenta seleccionar un rango de fechas con datos disponibles.</p>
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
const PollutantComparison = ({ pollutant, data, getTrendIcon, getTrendColor }) => {
    const trendDescription = data.trend === 'up' 
        ? `aumentó ${data.change_percent}%` 
        : data.trend === 'down' 
            ? `disminuyó ${Math.abs(data.change_percent)}%` 
            : 'se mantuvo estable';

    return (
        <article 
            className="bg-gray-50 rounded-xl p-3 sm:p-4 hover:shadow-md transition-shadow"
            role="listitem"
            aria-label={`${pollutant.toUpperCase()}: ${trendDescription}`}
        >
            <h4 className="font-bold text-base sm:text-lg mb-2 sm:mb-3 text-gray-800">
                {pollutant.toUpperCase()}
            </h4>
            
            <dl className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg">
                    <dt className="text-xs sm:text-sm text-gray-600">Período 1:</dt>
                    <dd className="font-bold text-blue-700 text-sm">{data.period1_avg} µg/m³</dd>
                </div>
                
                <div className="flex justify-between items-center p-2 bg-purple-50 rounded-lg">
                    <dt className="text-xs sm:text-sm text-gray-600">Período 2:</dt>
                    <dd className="font-bold text-purple-700 text-sm">{data.period2_avg} µg/m³</dd>
                </div>
                
                <div className={`flex justify-between items-center p-2 rounded-lg ${
                    data.trend === 'down' ? 'bg-green-100' : data.trend === 'up' ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                    <dt className="text-xs sm:text-sm">Cambio:</dt>
                    <dd className={`font-bold text-sm ${getTrendColor(data.trend)}`}>
                        <span aria-hidden="true">{getTrendIcon(data.trend)}</span> 
                        {data.change_percent > 0 ? '+' : ''}{data.change_percent}%
                    </dd>
                </div>
            </dl>
        </article>
    );
};

/**
 * Información de los períodos comparados
 */
const PeriodInfo = ({ period1, period2 }) => (
    <div 
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
        role="region"
        aria-label="Detalles de los períodos comparados"
    >
        <div className="bg-blue-50 rounded-xl p-3 sm:p-4 border border-blue-100">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2 text-sm sm:text-base">
                <span aria-hidden="true">📊</span> Período 1
            </h4>
            <p className="text-xs sm:text-sm text-gray-600">
                {period1.start} → {period1.end}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
                <strong>{period1.readings_count || 0}</strong> lecturas
            </p>
            {period1.data_source && (
                <p className={`text-xs mt-1 ${period1.data_source === 'openmeteo' ? 'text-green-600' : 'text-blue-600'}`}>
                    📡 {period1.data_source === 'openmeteo' ? 'Open Meteo API' : 'BD local'}
                </p>
            )}
        </div>
        
        <div className="bg-purple-50 rounded-xl p-3 sm:p-4 border border-purple-100">
            <h4 className="font-semibold text-purple-800 mb-2 flex items-center gap-2 text-sm sm:text-base">
                <span aria-hidden="true">📊</span> Período 2
            </h4>
            <p className="text-xs sm:text-sm text-gray-600">
                {period2.start} → {period2.end}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
                <strong>{period2.readings_count || 0}</strong> lecturas
            </p>
            {period2.data_source && (
                <p className={`text-xs mt-1 ${period2.data_source === 'openmeteo' ? 'text-green-600' : 'text-blue-600'}`}>
                    📡 {period2.data_source === 'openmeteo' ? 'Open Meteo API' : 'BD local'}
                </p>
            )}
        </div>
    </div>
);

export default React.memo(PeriodComparator);
