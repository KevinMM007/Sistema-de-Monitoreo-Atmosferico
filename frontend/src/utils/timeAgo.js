/**
 * Utilidad para formatear fechas en formato amigable
 * Ejemplo: "Hace 5 min", "Hace 2 horas", "Ayer"
 */

/**
 * Convierte una fecha a formato amigable ("Hace X minutos")
 * @param {Date|string|number} dateInput - Fecha a formatear
 * @returns {string} - Fecha en formato amigable
 */
export const timeAgo = (dateInput) => {
    if (!dateInput) return 'Sin fecha';
    
    const date = new Date(dateInput);
    
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
        console.warn('timeAgo: Fecha inválida recibida:', dateInput);
        return 'Fecha inválida';
    }
    
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    // Si es en el futuro
    if (diffInSeconds < 0) {
        return 'En el futuro';
    }
    
    // Definir intervalos
    const intervals = [
        { label: 'año', seconds: 31536000 },
        { label: 'mes', seconds: 2592000 },
        { label: 'semana', seconds: 604800 },
        { label: 'día', seconds: 86400 },
        { label: 'hora', seconds: 3600 },
        { label: 'minuto', seconds: 60 },
        { label: 'segundo', seconds: 1 }
    ];
    
    // Menos de 10 segundos
    if (diffInSeconds < 10) {
        return 'Justo ahora';
    }
    
    // Buscar el intervalo apropiado
    for (const interval of intervals) {
        const count = Math.floor(diffInSeconds / interval.seconds);
        if (count >= 1) {
            // Pluralización en español
            let label = interval.label;
            if (count !== 1) {
                if (label === 'mes') label = 'meses';
                else label = label + 's';
            }
            return `Hace ${count} ${label}`;
        }
    }
    
    return 'Justo ahora';
};

/**
 * Formatea una fecha de forma más descriptiva
 * @param {Date|string|number} dateInput - Fecha a formatear
 * @param {boolean} includeTime - Incluir hora (default: true)
 * @returns {string} - Fecha formateada
 */
export const formatRelativeDate = (dateInput, includeTime = true) => {
    if (!dateInput) return 'Sin fecha';
    
    const date = new Date(dateInput);
    
    if (isNaN(date.getTime())) {
        return 'Fecha inválida';
    }
    
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    const timeString = date.toLocaleTimeString('es-MX', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    // Hoy
    if (diffInDays === 0) {
        const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
        if (diffInHours < 1) {
            return timeAgo(date);
        }
        return includeTime ? `Hoy, ${timeString}` : 'Hoy';
    }
    
    // Ayer
    if (diffInDays === 1) {
        return includeTime ? `Ayer, ${timeString}` : 'Ayer';
    }
    
    // Esta semana (últimos 7 días)
    if (diffInDays < 7) {
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const dayName = dayNames[date.getDay()];
        return includeTime ? `${dayName}, ${timeString}` : dayName;
    }
    
    // Más de una semana
    const dateString = date.toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined
    });
    
    return includeTime ? `${dateString}, ${timeString}` : dateString;
};

/**
 * Formatea una fecha para mostrar en timestamps
 * @param {Date|string|number} dateInput - Fecha a formatear  
 * @returns {string} - Fecha en formato completo
 */
export const formatTimestamp = (dateInput) => {
    if (!dateInput) return 'Sin fecha';
    
    const date = new Date(dateInput);
    
    if (isNaN(date.getTime())) {
        return 'Fecha inválida';
    }
    
    return date.toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

/**
 * Hook-like helper para auto-actualizar timeAgo
 * Retorna el intervalo óptimo para refrescar basado en la antigüedad
 * @param {Date|string|number} dateInput - Fecha
 * @returns {number} - Intervalo en ms para actualizar
 */
export const getRefreshInterval = (dateInput) => {
    if (!dateInput) return 60000;
    
    const date = new Date(dateInput);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 10000;     // < 1 min: actualizar cada 10s
    if (diffInSeconds < 3600) return 30000;   // < 1 hora: actualizar cada 30s
    if (diffInSeconds < 86400) return 60000;  // < 1 día: actualizar cada 1min
    return 300000;                             // > 1 día: actualizar cada 5min
};

export default { timeAgo, formatRelativeDate, formatTimestamp, getRefreshInterval };
