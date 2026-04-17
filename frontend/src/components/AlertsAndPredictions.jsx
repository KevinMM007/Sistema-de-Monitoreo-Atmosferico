/**
 * AlertsAndPredictions - Sistema de alertas y predicciones
 * Fase 4 - Refactorizado: Usando hooks y componentes centralizados
 * 
 * Reducido de ~500 líneas a ~100 líneas
 */

import React, { useState, useCallback } from 'react';

// Hooks personalizados
import { useAlerts, useAirQuality } from '../hooks';

// Componentes comunes
import { FusedTabs, TabContent, LoadingSpinner } from './common';

// Componentes de alertas
import { CurrentStatusTab, TrendsTab, NotificationsTab } from './alerts';

// Definición de tabs
const TABS = [
    { id: 'current', label: 'Estado Actual', icon: '🌍' },
    { id: 'trends', label: 'Tendencias', icon: '📈' },
    { id: 'notifications', label: 'Notificaciones', icon: '🔔' },
];

/**
 * Componente principal de Alertas y Predicciones
 * @param {Object} props
 * @param {boolean} props.isVisible - Si el componente es visible (no usado directamente pero necesario para consistencia)
 */
const AlertsAndPredictions = ({ isVisible = true }) => {
    // Estado del tab activo
    const [activeTab, setActiveTab] = useState('current');

    // Hook de alertas (toda la lógica centralizada)
    const {
        // Datos
        currentAlert,
        trends,
        alertHistory,
        
        // Estados de carga
        loading,
        trendsLoading,
        
        // Suscripción por email
        email,
        setEmail,
        isSubscribed,
        subscriptionLoading,
        subscriptionMessage,
        subscribe,
        unsubscribe,
        checkSubscriptionByEmail,
        
        // Notificaciones push
        pushPermission,
        requestPushPermission,
    } = useAlerts();

    // Hook para datos de zona (necesario para CurrentStatusTab)
    // autoRefresh: true para mantener sincronizado con el Dashboard
    const { zoneData } = useAirQuality({ autoRefresh: true });

    // Handler para cambio de tab
    const handleTabChange = useCallback((tabId) => {
        setActiveTab(tabId);
    }, []);

    // Loading inicial
    if (loading && !currentAlert) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="xl" text="Cargando datos..." />
            </div>
        );
    }

    return (
        <div className="space-y-0">
            {/* Tabs de navegación */}
            <div className="bg-gray-100 px-2 pt-2 rounded-t-xl">
                <FusedTabs
                    tabs={TABS}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                />
            </div>

            {/* Contenido del tab activo */}
            <div 
                className="bg-white rounded-b-xl rounded-tr-xl shadow-lg p-3 sm:p-4 md:p-6 border border-gray-200 border-t-0"
                role="tabpanel"
                aria-label={`Panel de ${TABS.find(t => t.id === activeTab)?.label || 'contenido'}`}
            >
                {activeTab === 'current' && (
                    <TabContent>
                        <CurrentStatusTab 
                            alert={currentAlert} 
                            zoneData={zoneData} 
                        />
                    </TabContent>
                )}
                
                {activeTab === 'trends' && (
                    <TabContent>
                        <TrendsTab 
                            trends={trends} 
                            loading={trendsLoading}
                        />
                    </TabContent>
                )}
                
                {activeTab === 'notifications' && (
                    <TabContent>
                        <NotificationsTab
                            alertHistory={alertHistory}
                            email={email}
                            setEmail={setEmail}
                            isSubscribed={isSubscribed}
                            subscriptionLoading={subscriptionLoading}
                            subscriptionMessage={subscriptionMessage}
                            onSubscribe={subscribe}
                            onUnsubscribe={unsubscribe}
                            onCheckSubscription={checkSubscriptionByEmail}
                            pushPermission={pushPermission}
                            onRequestPushPermission={requestPushPermission}
                        />
                    </TabContent>
                )}
            </div>
        </div>
    );
};

export default AlertsAndPredictions;
