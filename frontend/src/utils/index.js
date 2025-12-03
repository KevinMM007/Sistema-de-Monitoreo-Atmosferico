/**
 * Exportación centralizada de Utilidades
 * Fase 4 - Optimización
 * 
 * Uso:
 * import { POLLUTANT_INFO, getPollutantColor, generateReport, timeAgo } from '../utils';
 */

export * from './constants';
export { generateReport } from './reportGenerator';

// 🆕 MEJORA: Utilidades de fechas amigables
export { 
    timeAgo, 
    formatRelativeDate, 
    formatTimestamp, 
    getRefreshInterval 
} from './timeAgo';
