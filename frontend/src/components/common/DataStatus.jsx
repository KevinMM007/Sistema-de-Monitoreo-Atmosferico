import React from 'react';
import { timeAgo } from '../../utils';

/**
 * Barra de estado de datos (real/simulado/error) - VERSIÓN COMPACTA
 */
const DataStatus = ({
    status = 'loading',
    lastUpdate = null,
    errorMessage = null,
    onRetry = null,
    className = '',
}) => {
    const statusConfig = {
        real: {
            bg: 'bg-green-50 border-green-200',
            text: 'text-green-800',
            icon: (
                <div className="relative flex items-center justify-center">
                    <span className="absolute w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75"></span>
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                </div>
            ),
            title: 'Datos en Tiempo Real',
            description: (
                <span className="text-xs">
                    Fuente: <strong>Modelo CAMS - Copernicus/ECMWF</strong>
                    <span className="hidden sm:inline"> · </span>
                    <span className="block sm:inline opacity-80">
                        🛠️ <em>Estimación satelital - No hay estaciones físicas en Xalapa</em>
                    </span>
                </span>
            ),
        },
        fallback: {
            bg: 'bg-yellow-50 border-yellow-300',
            text: 'text-yellow-800',
            icon: (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
            ),
            title: '⚠️ DATOS SIMULADOS',
            description: (
                <span className="text-xs">
                    Datos de respaldo - <em>API no disponible</em>
                </span>
            ),
        },
        loading: {
            bg: 'bg-blue-50 border-blue-200',
            text: 'text-blue-800',
            icon: (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ),
            title: 'Conectando...',
            description: null,
        },
        error: {
            bg: 'bg-red-50 border-red-300',
            text: 'text-red-800',
            icon: (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
            ),
            title: 'Error de Conexión',
            description: <span className="text-xs">{errorMessage || 'No se pudieron obtener los datos.'}</span>,
        },
    };

    const config = statusConfig[status] || statusConfig.loading;

    return (
        <div className={`
            px-4 py-2 rounded-lg border animate-fade-in
            ${config.bg} ${config.text}
            ${className}
        `}>
            <div className="flex items-center justify-between gap-3">
                {/* Lado izquierdo: icono + info */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="flex-shrink-0">
                        {config.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm whitespace-nowrap">
                                {config.title}
                            </span>
                            {status === 'fallback' && (
                                <span className="px-1.5 py-0.5 bg-yellow-500 text-white text-xs rounded">
                                    SIMULADOS
                                </span>
                            )}
                        </div>
                        {config.description && (
                            <div className="text-xs opacity-90 truncate sm:whitespace-normal">
                                {config.description}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Lado derecho: última actualización */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {lastUpdate && (
                        <div className="text-xs whitespace-nowrap">
                            Última actualización: <strong>{timeAgo(lastUpdate)}</strong>
                        </div>
                    )}
                    {status === 'error' && onRetry && (
                        <button
                            onClick={onRetry}
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                        >
                            Reintentar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Indicador de tráfico en tiempo real
 */
export const TrafficDataIndicator = ({
    hasTrafficData = false,
    hasOsmData = false,
    className = '',
}) => {
    if (!hasTrafficData && !hasOsmData) return null;

    return (
        <div className={`
            p-2 rounded bg-blue-100 text-blue-800
            flex items-center gap-2
            ${className}
        `}>
            <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
            >
                <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M13 10V3L4 14h7v7l9-11h-7z" 
                />
            </svg>
            <span className="text-sm">
                {hasTrafficData && hasOsmData 
                    ? 'Usando datos de tráfico (TomTom API) y OSM en tiempo real para cálculos por zona'
                    : hasTrafficData 
                    ? 'Usando datos de tráfico en tiempo real (TomTom API)'
                    : 'Usando datos de infraestructura OSM'
                }
            </span>
        </div>
    );
};

/**
 * Indicador de fuente de datos simple
 */
export const DataSourceBadge = ({
    source,
    className = '',
}) => {
    const sourceConfig = {
        local: {
            label: 'Base de datos local',
            icon: '💾',
            color: 'bg-blue-100 text-blue-800',
        },
        openmeteo: {
            label: 'Open Meteo API (Datos Reales)',
            icon: '🌐',
            color: 'bg-green-100 text-green-800',
        },
        open_meteo_air_quality_api: {
            label: 'Open Meteo API ✓',
            icon: '🌐',
            color: 'bg-green-100 text-green-800',
        },
        tomtom: {
            label: 'TomTom Traffic',
            icon: '🚗',
            color: 'bg-purple-100 text-purple-800',
        },
        osm: {
            label: 'OpenStreetMap',
            icon: '🗺️',
            color: 'bg-orange-100 text-orange-800',
        },
        fallback: {
            label: '⚠️ Datos Simulados',
            icon: '⚡',
            color: 'bg-yellow-100 text-yellow-800',
        },
        fallback_simulated: {
            label: '⚠️ Datos Simulados',
            icon: '⚡',
            color: 'bg-yellow-100 text-yellow-800',
        },
    };

    const config = sourceConfig[source] || sourceConfig.local;

    return (
        <span className={`
            inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
            ${config.color}
            ${className}
        `}>
            <span>{config.icon}</span>
            {config.label}
        </span>
    );
};

/**
 * 🔍 Panel de Verificación de Datos para Tesis
 */
export const DataVerificationPanel = ({
    isRealData = false,
    source = 'unknown',
    provider = 'unknown',
    lastFetch = null,
    recordCount = 0,
    className = '',
}) => {
    return (
        <div className={`
            p-4 rounded-lg border-2
            ${isRealData ? 'bg-green-50 border-green-400' : 'bg-yellow-50 border-yellow-400'}
            ${className}
        `}>
            <div className="flex items-start gap-3">
                <div className={`
                    p-2 rounded-full
                    ${isRealData ? 'bg-green-200' : 'bg-yellow-200'}
                `}>
                    {isRealData ? (
                        <svg className="w-6 h-6 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6 text-yellow-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    )}
                </div>
                <div className="flex-1">
                    <h4 className={`font-bold text-lg ${isRealData ? 'text-green-800' : 'text-yellow-800'}`}>
                        {isRealData ? '✅ Datos Verificados' : '⚠️ Datos de Respaldo'}
                    </h4>
                    <div className={`text-sm mt-2 space-y-1 ${isRealData ? 'text-green-700' : 'text-yellow-700'}`}>
                        <p><strong>Fuente:</strong> {source}</p>
                        <p><strong>Proveedor:</strong> {provider}</p>
                        <p><strong>Registros:</strong> {recordCount}</p>
                        {lastFetch && (
                            <p><strong>Última obtención:</strong> {new Date(lastFetch).toLocaleString('es-MX')}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Empty state cuando no hay datos
 */
export const EmptyState = ({
    icon = '📊',
    title = 'No hay datos disponibles',
    description = 'Intenta seleccionar un rango de fechas diferente.',
    action = null,
    className = '',
}) => {
    return (
        <div className={`
            flex flex-col items-center justify-center 
            py-12 px-4 text-center
            bg-gray-50 rounded-xl border-2 border-dashed border-gray-200
            ${className}
        `}>
            <span className="text-5xl mb-4">{icon}</span>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
            <p className="text-gray-500 mb-4 max-w-md">{description}</p>
            {action && (
                <div>{action}</div>
            )}
        </div>
    );
};

/**
 * Error state
 */
export const ErrorState = ({
    icon = '❌',
    title = 'Ha ocurrido un error',
    description = 'No pudimos cargar los datos. Por favor intenta de nuevo.',
    onRetry = null,
    className = '',
}) => {
    return (
        <div className={`
            flex flex-col items-center justify-center 
            py-12 px-4 text-center
            bg-red-50 rounded-xl border border-red-200
            ${className}
        `}>
            <span className="text-5xl mb-4">{icon}</span>
            <h3 className="text-lg font-semibold text-red-800 mb-2">{title}</h3>
            <p className="text-red-600 mb-4 max-w-md">{description}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                    Reintentar
                </button>
            )}
        </div>
    );
};

export default DataStatus;
