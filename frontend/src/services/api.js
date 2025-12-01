/**
 * Servicio centralizado de API para el Sistema de Calidad del Aire
 * Fase 4 - Optimización: Centralización de llamadas a API
 */

const API_BASE_URL = '/api';

// Configuración por defecto para fetch
const defaultConfig = {
    headers: {
        'Content-Type': 'application/json',
    },
};

/**
 * Wrapper para manejar respuestas de la API
 */
const handleResponse = async (response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Manejar diferentes formatos de error
        let errorMessage = `Error ${response.status}`;
        if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
        } else if (typeof errorData.detail === 'object' && errorData.detail !== null) {
            // Si detail es un objeto (como en validación de Pydantic), extraer el mensaje
            if (Array.isArray(errorData.detail)) {
                errorMessage = errorData.detail.map(e => e.msg || e.message || JSON.stringify(e)).join(', ');
            } else {
                errorMessage = errorData.detail.message || errorData.detail.msg || JSON.stringify(errorData.detail);
            }
        } else if (errorData.message) {
            errorMessage = errorData.message;
        }
        throw new Error(errorMessage);
    }
    return response.json();
};

/**
 * Wrapper genérico para peticiones GET
 */
const get = async (endpoint, params = {}) => {
    const url = new URL(`${API_BASE_URL}${endpoint}`, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.append(key, value);
        }
    });
    
    const response = await fetch(url.toString(), {
        method: 'GET',
        ...defaultConfig,
    });
    
    return handleResponse(response);
};

/**
 * Wrapper genérico para peticiones POST
 */
const post = async (endpoint, data = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        ...defaultConfig,
        body: JSON.stringify(data),
    });
    
    return handleResponse(response);
};

/**
 * Wrapper genérico para peticiones DELETE
 */
const del = async (endpoint) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        ...defaultConfig,
    });
    
    return handleResponse(response);
};

// ============================================
// SERVICIOS DE CALIDAD DEL AIRE
// ============================================

export const airQualityService = {
    /**
     * Obtiene las últimas lecturas de calidad del aire
     */
    getLatest: () => get('/air-quality'),
    
    /**
     * Obtiene datos de calidad del aire por zona
     */
    getByZone: () => get('/air-quality/by-zone'),
    
    /**
     * Obtiene datos históricos de calidad del aire
     * @param {string} start - Fecha de inicio (YYYY-MM-DD)
     * @param {string} end - Fecha de fin (YYYY-MM-DD)
     * @param {string} scale - Escala de tiempo: 'hourly', 'daily', 'monthly'
     */
    getHistorical: (start, end, scale = 'daily') => 
        get('/air-quality/historical', { start, end, scale }),
    
    /**
     * Obtiene el estado del colector de datos
     */
    getCollectorStatus: () => get('/collector-status'),
};

// ============================================
// SERVICIOS DE CLIMA
// ============================================

export const weatherService = {
    /**
     * Obtiene los datos meteorológicos actuales
     */
    getCurrent: () => get('/weather'),
};

// ============================================
// SERVICIOS DE TRÁFICO
// ============================================

export const trafficService = {
    /**
     * Obtiene datos de tráfico en tiempo real
     */
    getCurrent: () => get('/traffic'),
};

// ============================================
// SERVICIOS DE ALERTAS
// ============================================

export const alertService = {
    /**
     * Obtiene la alerta actual del sistema
     */
    getCurrent: () => get('/alerts/current'),
    
    /**
     * Obtiene el historial de alertas
     * @param {number} days - Número de días hacia atrás
     */
    getHistory: (days = 30) => get('/alerts/history', { days }),
    
    /**
     * Verifica el estado de suscripción de un email
     * @param {string} email - Email a verificar
     */
    checkSubscription: (email) => get(`/alerts/subscription/${email}`),
    
    /**
     * Suscribe un email a las alertas
     * @param {string} email - Email a suscribir
     */
    subscribe: (email) => post('/alerts/subscribe', { email }),
    
    /**
     * Desuscribe un email de las alertas
     * @param {string} email - Email a desuscribir
     */
    unsubscribe: (email) => del(`/alerts/unsubscribe/${email}`),
};

// ============================================
// SERVICIOS DE TENDENCIAS Y PREDICCIONES
// ============================================

export const trendsService = {
    /**
     * Obtiene las tendencias esperadas (hoy y mañana)
     */
    getExpected: () => get('/trends/expected'),
};

// ============================================
// SERVICIOS DE COMPARACIÓN
// ============================================

export const comparisonService = {
    /**
     * Compara dos períodos de tiempo
     * @param {Object} options - Opciones de comparación
     * @param {string} options.preset - Preset predefinido ('today-yesterday', 'this-week-last-week', 'this-month-last-month')
     * @param {string} options.start1 - Fecha de inicio período 1
     * @param {string} options.end1 - Fecha de fin período 1
     * @param {string} options.start2 - Fecha de inicio período 2
     * @param {string} options.end2 - Fecha de fin período 2
     */
    compare: ({ preset, start1, end1, start2, end2 }) => {
        if (preset) {
            return get('/comparison/flexible', { preset });
        }
        return get('/comparison/flexible', { start1, end1, start2, end2 });
    },
    
    /**
     * Compara hoy vs ayer (endpoint legacy)
     */
    todayVsYesterday: () => get('/comparison/today-yesterday'),
};

// ============================================
// SERVICIOS DE ZONAS Y OSM
// ============================================

export const zoneService = {
    /**
     * Obtiene el análisis de infraestructura vial de OpenStreetMap
     */
    getOSMAnalysis: () => get('/zones/osm-analysis'),
};

// ============================================
// SERVICIO DE HEALTH CHECK Y DIAGNÓSTICO
// ============================================

export const healthService = {
    /**
     * Verifica el estado del servidor
     */
    check: () => get('/health'),
};

// ============================================
// 🔍 SERVICIOS DE DIAGNÓSTICO Y VERIFICACIÓN
// Para validar la autenticidad de los datos (útil para tesis)
// ============================================

export const diagnosticService = {
    /**
     * Obtiene diagnóstico completo del sistema
     * Incluye: conexión con APIs, estado del colector, muestra de datos
     * 
     * Útil para verificar que los datos son REALES y no simulados
     */
    getFullDiagnostic: () => get('/diagnostics'),
    
    /**
     * Verifica si los datos actuales son reales o simulados
     * Retorna información detallada sobre la fuente de datos
     */
    verifyCurrentData: () => get('/data-verification'),
    
    /**
     * Obtiene el estado detallado del colector de datos
     */
    getCollectorStatus: () => get('/collector-status'),
};

// ============================================
// EXPORTACIÓN POR DEFECTO (todos los servicios)
// ============================================

const api = {
    airQuality: airQualityService,
    weather: weatherService,
    traffic: trafficService,
    alerts: alertService,
    trends: trendsService,
    comparison: comparisonService,
    zones: zoneService,
    health: healthService,
    diagnostic: diagnosticService,
};

export default api;
