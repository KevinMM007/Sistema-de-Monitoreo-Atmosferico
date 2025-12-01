/**
 * Constantes centralizadas para el Sistema de Calidad del Aire
 * Fase 4 - Optimización: Evitar magic numbers/strings
 */

// ============================================
// INFORMACIÓN DE CONTAMINANTES
// ============================================

export const POLLUTANT_INFO = {
    pm25: {
        name: 'PM2.5',
        key: 'pm25',
        unit: 'µg/m³',
        color: '#8b5cf6',
        format: (value) => `${value?.toFixed(2) ?? 'N/A'} µg/m³`,
        description: 'Material particulado fino (diámetro < 2.5 micrómetros)',
    },
    pm10: {
        name: 'PM10',
        key: 'pm10',
        unit: 'µg/m³',
        color: '#3b82f6',
        format: (value) => `${value?.toFixed(2) ?? 'N/A'} µg/m³`,
        description: 'Material particulado grueso (diámetro < 10 micrómetros)',
    },
    no2: {
        name: 'NO₂',
        key: 'no2',
        unit: 'µg/m³',
        color: '#f59e0b',
        format: (value) => `${value?.toFixed(2) ?? 'N/A'} µg/m³`,
        description: 'Dióxido de nitrógeno',
    },
    o3: {
        name: 'O₃',
        key: 'o3',
        unit: 'µg/m³',
        color: '#10b981',
        format: (value) => `${value?.toFixed(2) ?? 'N/A'} µg/m³`,
        description: 'Ozono troposférico',
    },
    co: {
        name: 'CO',
        key: 'co',
        unit: 'mg/m³',
        color: '#ef4444',
        format: (value) => `${value?.toFixed(3) ?? 'N/A'} mg/m³`,
        description: 'Monóxido de carbono',
    },
};

// ============================================
// UMBRALES DE CONTAMINANTES (EPA)
// ============================================

export const POLLUTANT_THRESHOLDS = {
    pm25: {
        good: 12,
        moderate: 35.4,
        unhealthySensitive: 55.4,
        unhealthy: 150.4,
        veryUnhealthy: 250.4,
        hazardous: 500,
    },
    pm10: {
        good: 54,
        moderate: 154,
        unhealthySensitive: 254,
        unhealthy: 354,
        veryUnhealthy: 424,
        hazardous: 604,
    },
    no2: {
        good: 53,
        moderate: 100,
        unhealthySensitive: 360,
        unhealthy: 649,
        veryUnhealthy: 1249,
        hazardous: 2049,
    },
    o3: {
        good: 50,
        moderate: 100,
        unhealthySensitive: 150,
        unhealthy: 200,
        veryUnhealthy: 300,
        hazardous: 500,
    },
    co: {
        good: 4.4,
        moderate: 9.4,
        unhealthySensitive: 12.4,
        unhealthy: 15.4,
        veryUnhealthy: 30.4,
        hazardous: 50.4,
    },
};

// ============================================
// NIVELES DE CALIDAD DEL AIRE
// ============================================

export const AIR_QUALITY_LEVELS = {
    bueno: {
        key: 'bueno',
        label: 'Bueno',
        color: '#10b981',
        textColor: '#ffffff',
        bgColor: 'bg-green-500',
        icon: '😊',
        description: 'La calidad del aire es satisfactoria.',
        recommendation: 'Condiciones ideales para actividades al aire libre.',
    },
    moderado: {
        key: 'moderado',
        label: 'Moderado',
        color: '#eab308',
        textColor: '#000000',
        bgColor: 'bg-yellow-500',
        icon: '😐',
        description: 'La calidad del aire es aceptable.',
        recommendation: 'Grupos sensibles deben considerar limitar la exposición prolongada.',
    },
    insalubre_sensibles: {
        key: 'insalubre_sensibles',
        label: 'Insalubre para Sensibles',
        color: '#f97316',
        textColor: '#ffffff',
        bgColor: 'bg-orange-500',
        icon: '😷',
        description: 'Grupos sensibles pueden experimentar efectos en la salud.',
        recommendation: 'Personas con enfermedades respiratorias deben limitar actividades al aire libre.',
    },
    insalubre: {
        key: 'insalubre',
        label: 'Insalubre',
        color: '#ef4444',
        textColor: '#ffffff',
        bgColor: 'bg-red-500',
        icon: '🤒',
        description: 'Todos pueden comenzar a experimentar efectos en la salud.',
        recommendation: 'Evitar actividades prolongadas al aire libre.',
    },
    muy_insalubre: {
        key: 'muy_insalubre',
        label: 'Muy Insalubre',
        color: '#dc2626',
        textColor: '#ffffff',
        bgColor: 'bg-red-700',
        icon: '😵',
        description: 'Advertencias de salud para toda la población.',
        recommendation: 'Evitar cualquier actividad al aire libre.',
    },
    peligroso: {
        key: 'peligroso',
        label: 'Peligroso',
        color: '#7c2d12',
        textColor: '#ffffff',
        bgColor: 'bg-amber-900',
        icon: '☠️',
        description: 'Alerta de emergencia de salud.',
        recommendation: 'Permanecer en interiores y usar protección respiratoria si es necesario salir.',
    },
};

// ============================================
// ZONAS DE XALAPA
// ============================================

export const XALAPA_ZONES = [
    {
        name: 'Centro',
        key: 'centro',
        bounds: [
            [19.5200, -96.9250],
            [19.5500, -96.8900],
        ],
        description: 'Zona centro de Xalapa',
    },
    {
        name: 'Norte',
        key: 'norte',
        bounds: [
            [19.5500, -96.9750],
            [19.5900, -96.8550],
        ],
        description: 'Zona norte de Xalapa',
    },
    {
        name: 'Sur',
        key: 'sur',
        bounds: [
            [19.4900, -96.9750],
            [19.5200, -96.8550],
        ],
        description: 'Zona sur de Xalapa',
    },
    {
        name: 'Este',
        key: 'este',
        bounds: [
            [19.4900, -96.8900],
            [19.5900, -96.7900],
        ],
        description: 'Zona este de Xalapa',
    },
    {
        name: 'Oeste',
        key: 'oeste',
        bounds: [
            [19.4900, -97.0200],
            [19.5900, -96.9250],
        ],
        description: 'Zona oeste de Xalapa',
    },
];

// ============================================
// CONFIGURACIÓN DEL MAPA
// ============================================

export const MAP_CONFIG = {
    center: [19.5438, -96.9102],
    zoom: 11,
    minZoom: 11,
    maxZoom: 14,
    maxBounds: [
        [19.3800, -97.1500],
        [19.7000, -96.6500],
    ],
    tileLayerUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

// ============================================
// INTERVALOS DE ACTUALIZACIÓN (en ms)
// ============================================

export const UPDATE_INTERVALS = {
    airQuality: 300000,      // 5 minutos
    weather: 300000,         // 5 minutos
    traffic: 300000,         // 5 minutos
    alerts: 300000,          // 5 minutos
    zoneData: 300000,        // 5 minutos
};

// ============================================
// CONFIGURACIÓN DE ALERTAS
// ============================================

export const ALERT_CONFIG = {
    emailThreshold: 35.4,     // PM2.5 µg/m³ para enviar email
    pushThreshold: 55.4,      // PM2.5 µg/m³ para notificación push
    maxEmailsPerHour: 1,      // Máximo emails por hora
    historyDays: 30,          // Días de historial por defecto
};

// ============================================
// CONFIGURACIÓN DE DATOS HISTÓRICOS
// ============================================

export const HISTORICAL_CONFIG = {
    maxDays: 365,             // Máximo de días para consulta
    defaultDays: 7,           // Días por defecto
    scales: [
        { value: 'hourly', label: 'Por Hora' },
        { value: 'daily', label: 'Por Día' },
        { value: 'monthly', label: 'Por Mes' },
    ],
};

// ============================================
// PRESETS DE COMPARACIÓN
// ============================================

export const COMPARISON_PRESETS = [
    {
        value: 'today-yesterday',
        label: 'Hoy vs Ayer',
        icon: '📅',
    },
    {
        value: 'this-week-last-week',
        label: 'Esta semana vs Anterior',
        icon: '📆',
    },
    {
        value: 'this-month-last-month',
        label: 'Este mes vs Anterior',
        icon: '🗓️',
    },
];

// ============================================
// FUNCIONES HELPER
// ============================================

/**
 * Obtiene el color según el nivel de contaminante
 * @param {string} pollutant - Clave del contaminante
 * @param {number} value - Valor del contaminante
 * @returns {string} Color hexadecimal
 */
export const getPollutantColor = (pollutant, value) => {
    const thresholds = POLLUTANT_THRESHOLDS[pollutant];
    if (!thresholds) return '#6b7280';
    
    if (value <= thresholds.good) return AIR_QUALITY_LEVELS.bueno.color;
    if (value <= thresholds.moderate) return AIR_QUALITY_LEVELS.moderado.color;
    if (value <= thresholds.unhealthySensitive) return AIR_QUALITY_LEVELS.insalubre_sensibles.color;
    if (value <= thresholds.unhealthy) return AIR_QUALITY_LEVELS.insalubre.color;
    if (value <= thresholds.veryUnhealthy) return AIR_QUALITY_LEVELS.muy_insalubre.color;
    return AIR_QUALITY_LEVELS.peligroso.color;
};

/**
 * Obtiene el color de texto según el color de fondo
 * @param {string} pollutant - Clave del contaminante
 * @param {number} value - Valor del contaminante
 * @returns {string} Color hexadecimal del texto
 */
export const getTextColorForBg = (pollutant, value) => {
    const thresholds = POLLUTANT_THRESHOLDS[pollutant];
    if (!thresholds) return '#ffffff';
    
    if (value <= thresholds.good) return '#ffffff';
    if (value <= thresholds.moderate) return '#000000'; // Amarillo necesita texto negro
    return '#ffffff';
};

/**
 * Obtiene el nivel de calidad según el contaminante y valor
 * @param {string} pollutant - Clave del contaminante
 * @param {number} value - Valor del contaminante
 * @returns {string} Etiqueta del nivel
 */
export const getPollutantLevel = (pollutant, value) => {
    const thresholds = POLLUTANT_THRESHOLDS[pollutant];
    if (!thresholds) return 'Desconocido';
    
    if (value <= thresholds.good) return AIR_QUALITY_LEVELS.bueno.label;
    if (value <= thresholds.moderate) return AIR_QUALITY_LEVELS.moderado.label;
    if (value <= thresholds.unhealthySensitive) return AIR_QUALITY_LEVELS.insalubre_sensibles.label;
    if (value <= thresholds.unhealthy) return AIR_QUALITY_LEVELS.insalubre.label;
    if (value <= thresholds.veryUnhealthy) return AIR_QUALITY_LEVELS.muy_insalubre.label;
    return AIR_QUALITY_LEVELS.peligroso.label;
};

/**
 * Obtiene la información completa del nivel de calidad del aire
 * @param {string} levelKey - Clave del nivel (bueno, moderado, etc.)
 * @returns {Object} Información del nivel
 */
export const getAirQualityLevel = (levelKey) => {
    return AIR_QUALITY_LEVELS[levelKey] || AIR_QUALITY_LEVELS.bueno;
};

/**
 * Formatea una fecha para mostrar
 * @param {string|Date} date - Fecha a formatear
 * @param {Object} options - Opciones de formato
 * @returns {string} Fecha formateada
 */
export const formatDate = (date, options = {}) => {
    const d = new Date(date);
    return d.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options,
    });
};

/**
 * Formatea una hora para mostrar
 * @param {string|Date} date - Fecha/hora a formatear
 * @returns {string} Hora formateada
 */
export const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};

/**
 * Formatea fecha y hora completa
 * @param {string|Date} date - Fecha/hora a formatear
 * @returns {string} Fecha y hora formateada
 */
export const formatDateTime = (date) => {
    const d = new Date(date);
    return d.toLocaleString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};

/**
 * Obtiene las zonas como objeto indexado por nombre
 * @returns {Object} Zonas indexadas por nombre
 */
export const getZonesAsObject = () => {
    return XALAPA_ZONES.reduce((acc, zone) => {
        acc[zone.key] = zone;
        return acc;
    }, {});
};

/**
 * Obtiene el nivel de calidad del aire basado en PM2.5
 * @param {number} pm25Value - Valor de PM2.5
 * @returns {string} Key del nivel
 */
export const getLevelKeyFromPM25 = (pm25Value) => {
    const t = POLLUTANT_THRESHOLDS.pm25;
    if (pm25Value <= t.good) return 'bueno';
    if (pm25Value <= t.moderate) return 'moderado';
    if (pm25Value <= t.unhealthySensitive) return 'insalubre_sensibles';
    if (pm25Value <= t.unhealthy) return 'insalubre';
    if (pm25Value <= t.veryUnhealthy) return 'muy_insalubre';
    return 'peligroso';
};
