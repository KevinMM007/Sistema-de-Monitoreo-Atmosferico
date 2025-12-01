/**
 * Exportación centralizada de todos los Componentes
 * Fase 4 - Optimización
 * 
 * Uso:
 * import { AirQualityDashboard, AlertsAndPredictions, Card, Button } from './components';
 */

// Componentes principales
export { default as AirQualityDashboard } from './AirQualityDashboard';
export { default as AlertsAndPredictions } from './AlertsAndPredictions';
export { default as HistoricalDataDashboard } from './HistoricalDataDashboard';

// Componentes comunes
export * from './common';

// Componentes del dashboard
export * from './dashboard';

// Componentes de alertas
export * from './alerts';

// Componentes de datos históricos
export * from './historical';
