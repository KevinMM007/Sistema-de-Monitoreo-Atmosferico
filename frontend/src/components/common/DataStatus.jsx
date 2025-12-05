/**
 * DataStatus - Componentes de estado de datos
 * 
 * 🆕 MEJORAS:
 * - Responsive design mejorado
 * - Accesibilidad mejorada (aria-live, roles)
 * - Focus states para botones
 */

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
                <div className="relative flex items-center justify-center" aria-hidden="true">
                    <span className="absolute w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75"></span>
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                </div>
            ),
            title: 'Datos en Tiempo Real',
            srTitle: 'Estado: Datos en tiempo real activos',
            description: (
                <span className="text-xs">
                    Fuente: <strong>Modelo CAMS - Copernicus/ECMWF</strong>
                    <span className="hidden sm:inline"> · </span>
                    <span className="block sm:inline opacity-80">
                        <span aria-hidden="true">🛠️</span> <em>Estimación satelital</em>
                    </span>
                </span>
            ),
        },
        fallback: {
            bg: 'bg-yellow-50 border-yellow-300',
            text: 'text-yellow-800',
            icon: (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
            ),
            title: 'DATOS SIMULADOS',
            srTitle: 'Advertencia: Usando datos simulados',
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
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ),
            title: 'Conectando...',
            srTitle: 'Cargando: Conectando con el servidor',
            description: null,
        },
        error: {
            bg: 'bg-red-50 border-red-300',
            text: 'text-red-800',
            icon: (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
            ),
            title: 'Error de Conexión',
            srTitle: 'Error: No se pudo conectar con el servidor',
            description: <span className="text-xs">{errorMessage || 'No se pudieron obtener los datos.'}</span>,
        },
    };

    const config = statusConfig[status] || statusConfig.loading;

    return (
        <div 
            className={`
                px-2 sm:px-4 py-2 rounded-lg border animate-fade-in
                ${config.bg} ${config.text}
                ${className}
            `}
            role="status"
            aria-live="polite"
        >
            {/* Texto oculto para lectores de pantalla */}
            <span className="sr-only">{config.srTitle}</span>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                {/* Lado izquierdo: icono + info */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="flex-shrink-0">
                        {config.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-xs sm:text-sm whitespace-nowrap">
                                {config.title}
                            </span>
                            {status === 'fallback' && (
                                <span className="px-1.5 py-0.5 bg-yellow-500 text-white text-xs rounded">
                                    SIMULADOS
                                </span>
                            )}
                        </div>
                        {config.description && (
                            <div className="text-xs opacity-90 line-clamp-1 sm:line-clamp-none">
                                {config.description}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Lado derecho: última actualización */}
                <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                    {lastUpdate && (
                        <div className="whitespace-nowrap">
                            <span className="hidden sm:inline">Última actualización: </span>
                            <strong>{timeAgo(lastUpdate)}</strong>
                        </div>
                    )}
                    {status === 'error' && onRetry && (
                        <button
                            onClick={onRetry}
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 
                                       transition-colors focus:outline-none focus-visible:ring-2 
                                       focus-visible:ring-red-500 focus-visible:ring-offset-2"
                            aria-label="Reintentar conexión"
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
        <div 
            className={`
                p-2 rounded bg-blue-100 text-blue-800
                flex items-center gap-2 text-xs sm:text-sm
                ${className}
            `}
            role="status"
        >
            <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                aria-hidden="true"
            >
                <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M13 10V3L4 14h7v7l9-11h-7z" 
                />
            </svg>
            <span>
                {hasTrafficData && hasOsmData 
                    ? <>
                        <span className="hidden sm:inline">Usando datos de tráfico (TomTom API) y OSM en tiempo real para cálculos por zona</span>
                        <span className="sm:hidden">Datos de tráfico y OSM activos</span>
                      </>
                    : hasTrafficData 
                    ? 'Datos de tráfico en tiempo real'
                    : 'Datos de infraestructura OSM'
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
            label: 'BD Local',
            fullLabel: 'Base de datos local',
            icon: '💾',
            color: 'bg-blue-100 text-blue-800',
        },
        openmeteo: {
            label: 'Open Meteo',
            fullLabel: 'Open Meteo API (Datos Reales)',
            icon: '🌐',
            color: 'bg-green-100 text-green-800',
        },
        open_meteo_air_quality_api: {
            label: 'Open Meteo ✓',
            fullLabel: 'Open Meteo API ✓',
            icon: '🌐',
            color: 'bg-green-100 text-green-800',
        },
        tomtom: {
            label: 'TomTom',
            fullLabel: 'TomTom Traffic',
            icon: '🚗',
            color: 'bg-purple-100 text-purple-800',
        },
        osm: {
            label: 'OSM',
            fullLabel: 'OpenStreetMap',
            icon: '🗺️',
            color: 'bg-orange-100 text-orange-800',
        },
        fallback: {
            label: 'Simulado',
            fullLabel: '⚠️ Datos Simulados',
            icon: '⚡',
            color: 'bg-yellow-100 text-yellow-800',
        },
        fallback_simulated: {
            label: 'Simulado',
            fullLabel: '⚠️ Datos Simulados',
            icon: '⚡',
            color: 'bg-yellow-100 text-yellow-800',
        },
    };

    const config = sourceConfig[source] || sourceConfig.local;

    return (
        <span 
            className={`
                inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium
                ${config.color}
                ${className}
            `}
            title={config.fullLabel}
        >
            <span aria-hidden="true">{config.icon}</span>
            <span className="hidden sm:inline">{config.fullLabel}</span>
            <span className="sm:hidden">{config.label}</span>
        </span>
    );
};

/**
 * Panel de Verificación de Datos para Tesis
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
        <div 
            className={`
                p-3 sm:p-4 rounded-lg border-2
                ${isRealData ? 'bg-green-50 border-green-400' : 'bg-yellow-50 border-yellow-400'}
                ${className}
            `}
            role="status"
            aria-label={isRealData ? 'Datos verificados' : 'Datos de respaldo'}
        >
            <div className="flex items-start gap-2 sm:gap-3">
                <div className={`
                    p-1.5 sm:p-2 rounded-full flex-shrink-0
                    ${isRealData ? 'bg-green-200' : 'bg-yellow-200'}
                `}>
                    {isRealData ? (
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className={`font-bold text-base sm:text-lg ${isRealData ? 'text-green-800' : 'text-yellow-800'}`}>
                        {isRealData ? '✅ Datos Verificados' : '⚠️ Datos de Respaldo'}
                    </h4>
                    <div className={`text-xs sm:text-sm mt-1 sm:mt-2 space-y-0.5 sm:space-y-1 ${isRealData ? 'text-green-700' : 'text-yellow-700'}`}>
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
        <div 
            className={`
                flex flex-col items-center justify-center 
                py-8 sm:py-12 px-4 text-center
                bg-gray-50 rounded-xl border-2 border-dashed border-gray-200
                ${className}
            `}
            role="status"
        >
            <span className="text-4xl sm:text-5xl mb-3 sm:mb-4" aria-hidden="true">{icon}</span>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">{title}</h3>
            <p className="text-gray-500 mb-4 max-w-md text-sm sm:text-base">{description}</p>
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
        <div 
            className={`
                flex flex-col items-center justify-center 
                py-8 sm:py-12 px-4 text-center
                bg-red-50 rounded-xl border border-red-200
                ${className}
            `}
            role="alert"
        >
            <span className="text-4xl sm:text-5xl mb-3 sm:mb-4" aria-hidden="true">{icon}</span>
            <h3 className="text-base sm:text-lg font-semibold text-red-800 mb-2">{title}</h3>
            <p className="text-red-600 mb-4 max-w-md text-sm sm:text-base">{description}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 
                               transition-colors focus:outline-none focus-visible:ring-2 
                               focus-visible:ring-red-500 focus-visible:ring-offset-2"
                    aria-label="Reintentar carga de datos"
                >
                    Reintentar
                </button>
            )}
        </div>
    );
};

export default DataStatus;
