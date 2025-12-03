/**
 * Hook personalizado para el sistema de alertas
 * Fase 4 - Optimización: Lógica reutilizable
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { alertService, trendsService } from '../services/api';
import { UPDATE_INTERVALS, ALERT_CONFIG } from '../utils/constants';

/**
 * Hook para gestionar alertas, suscripciones y notificaciones
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.autoRefresh - Activar actualización automática (default: true)
 * @param {number} options.refreshInterval - Intervalo de actualización en ms
 * @param {number} options.historyDays - Días de historial a cargar (default: 30)
 * @returns {Object} Estado y funciones del hook
 */
const useAlerts = (options = {}) => {
    const {
        autoRefresh = true,
        refreshInterval = UPDATE_INTERVALS.alerts,
        historyDays = ALERT_CONFIG.historyDays,
    } = options;

    // Estados principales
    const [currentAlert, setCurrentAlert] = useState(null);
    const [trends, setTrends] = useState(null);
    const [alertHistory, setAlertHistory] = useState(null);
    
    // Estados de carga
    const [loading, setLoading] = useState(true);
    const [trendsLoading, setTrendsLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(true);
    
    // Estados de error
    const [error, setError] = useState(null);
    const [trendsError, setTrendsError] = useState(null);
    const [historyError, setHistoryError] = useState(null);
    
    // Estados de suscripción
    const [emailState, setEmailState] = useState('');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subscriptionLoading, setSubscriptionLoading] = useState(false);
    const [subscriptionMessage, setSubscriptionMessage] = useState('');
    
    // Ref para mantener el email actualizado (evita stale closure)
    const emailRef = useRef('');
    
    // Wrapper para setEmail que actualiza tanto el estado como el ref
    const setEmail = useCallback((value) => {
        emailRef.current = value;
        setEmailState(value);
    }, []);
    
    // Getter para email (usa el ref para valor actual)
    const email = emailState;
    
    // Estados de notificaciones push
    const [pushPermission, setPushPermission] = useState('default');
    
    // Metadatos
    const [lastUpdate, setLastUpdate] = useState(null);

    /**
     * Verifica el permiso de notificaciones push
     */
    const checkPushPermission = useCallback(() => {
        if ('Notification' in window) {
            setPushPermission(Notification.permission);
        }
    }, []);

    /**
     * Solicita permiso para notificaciones push
     */
    const requestPushPermission = useCallback(async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            setPushPermission(permission);
            
            if (permission === 'granted') {
                showPushNotification(
                    'Notificaciones Activadas',
                    'Recibirás alertas de calidad del aire en tu navegador.'
                );
            }
            
            return permission;
        }
        return 'unsupported';
    }, []);

    /**
     * Muestra una notificación push
     */
    const showPushNotification = useCallback((title, body, options = {}) => {
        if (Notification.permission === 'granted') {
            new Notification(title, {
                body,
                icon: '/vite.svg',
                badge: '/vite.svg',
                tag: 'air-quality-alert',
                requireInteraction: false,
                ...options,
            });
        }
    }, []);

    /**
     * Carga la configuración de notificaciones guardada
     */
    const loadNotificationSettings = useCallback(async () => {
        const savedEmail = localStorage.getItem('notificationEmail');
        if (savedEmail) {
            setEmail(savedEmail);
            
            try {
                const response = await alertService.checkSubscription(savedEmail);
                setIsSubscribed(response.is_active);
            } catch (err) {
                console.warn('Error verificando suscripción:', err);
                setIsSubscribed(false);
            }
        }
    }, []);

    /**
     * Obtiene la alerta actual
     */
    const fetchCurrentAlert = useCallback(async () => {
        try {
            setError(null);
            const response = await alertService.getCurrent();
            setCurrentAlert(response);
            setLastUpdate(new Date());
            
            // Mostrar notificación push si el nivel es alto
            if (response.overall_level?.value && 
                ['insalubre', 'muy_insalubre', 'peligroso'].includes(response.overall_level.value) &&
                pushPermission === 'granted') {
                showPushNotification(
                    '⚠️ Alerta de Calidad del Aire',
                    `Nivel: ${response.overall_level.value.toUpperCase()}. Se recomienda precaución.`
                );
            }
            
            return response;
        } catch (err) {
            console.error('Error fetching current alert:', err);
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, [pushPermission, showPushNotification]);

    /**
     * Obtiene las tendencias/predicciones
     */
    const fetchTrends = useCallback(async () => {
        try {
            setTrendsError(null);
            const response = await trendsService.getExpected();
            setTrends(response);
            return response;
        } catch (err) {
            console.error('Error fetching trends:', err);
            setTrendsError(err.message);
            return null;
        } finally {
            setTrendsLoading(false);
        }
    }, []);

    /**
     * Obtiene el historial de alertas
     */
    const fetchAlertHistory = useCallback(async (days = historyDays) => {
        try {
            setHistoryError(null);
            const response = await alertService.getHistory(days);
            setAlertHistory(response);
            return response;
        } catch (err) {
            console.error('Error fetching alert history:', err);
            setHistoryError(err.message);
            return null;
        } finally {
            setHistoryLoading(false);
        }
    }, [historyDays]);

    /**
     * Suscribe un email a las alertas
     * NOTA: Usa emailRef.current para obtener el valor más reciente del email
     */
    const subscribe = useCallback(async (emailToSubscribe = null) => {
        // Obtener el email de forma segura (asegurar que sea string)
        let emailToUse = '';
        if (typeof emailToSubscribe === 'string' && emailToSubscribe) {
            emailToUse = emailToSubscribe.trim();
        } else if (typeof emailRef.current === 'string' && emailRef.current) {
            emailToUse = emailRef.current.trim();
        } else if (typeof emailState === 'string' && emailState) {
            emailToUse = emailState.trim();
        }
        
        console.log('📧 Intentando suscribir:', emailToUse);
        console.log('📧 emailRef.current:', emailRef.current);
        console.log('📧 emailState actual:', emailState);
        
        // Validación de email más robusta
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailToUse || !emailRegex.test(emailToUse)) {
            console.log('❌ Email inválido:', emailToUse, '- Longitud:', emailToUse.length);
            setSubscriptionMessage('❌ Por favor ingrese un correo electrónico válido');
            setTimeout(() => setSubscriptionMessage(''), 3000);
            return false;
        }
        
        setSubscriptionLoading(true);
        
        try {
            await alertService.subscribe(emailToUse);
            localStorage.setItem('notificationEmail', emailToUse);
            setEmail(emailToUse);
            setIsSubscribed(true);
            setSubscriptionMessage('✅ Suscripción exitosa. Recibirás alertas cuando la calidad del aire empeore.');
            return true;
        } catch (err) {
            console.error('Error suscribiendo:', err);
            setSubscriptionMessage('❌ Error: ' + (err.message || 'No se pudo suscribir'));
            return false;
        } finally {
            setSubscriptionLoading(false);
            setTimeout(() => setSubscriptionMessage(''), 5000);
        }
    }, [emailState]); // Agregar emailState como dependencia para acceso al valor actual

    /**
     * Desuscribe un email de las alertas
     * NOTA: Usa emailRef.current para obtener el valor más reciente del email
     */
    const unsubscribe = useCallback(async (emailToUnsubscribe = null) => {
        // Usar el email pasado como argumento, o el valor actual del ref
        const emailToUse = emailToUnsubscribe || emailRef.current;
        
        setSubscriptionLoading(true);
        
        try {
            console.log('Intentando desuscribir:', emailToUse);
            const response = await alertService.unsubscribe(emailToUse);
            console.log('Respuesta de desuscripción:', response);
            
            // Actualizar estado local
            setIsSubscribed(false);
            setSubscriptionMessage('✅ ' + (response.message || 'Desuscripción exitosa'));
            
            // Limpiar localStorage
            localStorage.removeItem('notificationEmail');
            
            // Recargar historial para reflejar cambios
            fetchAlertHistory();
            
            return true;
        } catch (err) {
            console.error('Error desuscribiendo:', err);
            
            // Si el error es 404, igual marcar como desuscrito (ya no existe)
            if (err.message?.includes('404') || err.message?.includes('no encontrada')) {
                setIsSubscribed(false);
                localStorage.removeItem('notificationEmail');
                setSubscriptionMessage('✅ Desuscripción completada');
                return true;
            }
            
            setSubscriptionMessage('❌ Error: ' + (err.message || 'No se pudo desuscribir'));
            return false;
        } finally {
            setSubscriptionLoading(false);
            setTimeout(() => setSubscriptionMessage(''), 5000);
        }
    }, [email, fetchAlertHistory]);

    /**
     * Alterna el estado de suscripción
     */
    const toggleSubscription = useCallback(async () => {
        if (isSubscribed) {
            return await unsubscribe();
        } else {
            return await subscribe();
        }
    }, [isSubscribed, subscribe, unsubscribe]);

    /**
     * Refresca todos los datos
     */
    const refresh = useCallback(async () => {
        setLoading(true);
        setTrendsLoading(true);
        setHistoryLoading(true);
        
        await Promise.all([
            fetchCurrentAlert(),
            fetchTrends(),
            fetchAlertHistory(),
        ]);
    }, [fetchCurrentAlert, fetchTrends, fetchAlertHistory]);

    // Efecto inicial
    useEffect(() => {
        checkPushPermission();
        loadNotificationSettings();
        fetchCurrentAlert();
        fetchTrends();
        fetchAlertHistory();

        if (autoRefresh) {
            const interval = setInterval(fetchCurrentAlert, refreshInterval);
            return () => clearInterval(interval);
        }
    }, [
        checkPushPermission,
        loadNotificationSettings,
        fetchCurrentAlert,
        fetchTrends,
        fetchAlertHistory,
        autoRefresh,
        refreshInterval,
    ]);

    // Datos derivados
    const isLoading = loading || trendsLoading || historyLoading;
    const hasError = error || trendsError || historyError;
    const overallLevel = currentAlert?.overall_level?.value || 'bueno';
    const aqi = currentAlert?.aqi?.overall || null;

    return {
        // Datos principales
        currentAlert,
        trends,
        alertHistory,
        
        // Datos derivados
        overallLevel,
        aqi,
        
        // Estados de carga
        loading,
        trendsLoading,
        historyLoading,
        isLoading,
        
        // Errores
        error,
        trendsError,
        historyError,
        hasError,
        
        // Suscripción
        email,
        setEmail,
        isSubscribed,
        subscriptionLoading,
        subscriptionMessage,
        subscribe,
        unsubscribe,
        toggleSubscription,
        
        // Notificaciones push
        pushPermission,
        requestPushPermission,
        showPushNotification,
        
        // Metadatos
        lastUpdate,
        
        // Funciones
        refresh,
        fetchCurrentAlert,
        fetchTrends,
        fetchAlertHistory,
    };
};

export default useAlerts;
