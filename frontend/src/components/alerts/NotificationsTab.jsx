/**
 * Componente NotificationsTab - Tab de Notificaciones
 * Fase 4 - Refactorización de AlertsAndPredictions
 * 
 * CORREGIDO: Clarificación de estadísticas y terminología
 */

import React from 'react';
import { Button, InfoCard } from '../common';

const NotificationsTab = ({
    // Datos de historial
    alertHistory,
    
    // Email subscription
    email,
    setEmail,
    isSubscribed,
    subscriptionLoading,
    subscriptionMessage,
    onSubscribe,
    onUnsubscribe,
    
    // Push notifications
    pushPermission,
    onRequestPushPermission,
}) => {
    return (
        <div className="animate-fade-in space-y-6">
            {/* Resumen SOLO si el usuario está suscrito */}
            {isSubscribed && alertHistory && (
                <UserAlertSummary alertHistory={alertHistory} email={email} />
            )}

            {/* Notificaciones por Correo */}
            <EmailNotifications
                email={email}
                setEmail={setEmail}
                isSubscribed={isSubscribed}
                subscriptionLoading={subscriptionLoading}
                subscriptionMessage={subscriptionMessage}
                onSubscribe={onSubscribe}
                onUnsubscribe={onUnsubscribe}
            />

            {/* Notificaciones Push */}
            <PushNotifications
                pushPermission={pushPermission}
                onRequestPermission={onRequestPushPermission}
            />

            {/* Información adicional */}
            <InfoCard
                title="¿Cuándo recibiré notificaciones?"
                type="neutral"
                icon="💡"
            >
                <ul className="space-y-1">
                    <li>• <strong>Correo electrónico:</strong> Cuando PM2.5 supere 35.4 µg/m³ (nivel insalubre)</li>
                    <li>• <strong>Navegador:</strong> Cuando la calidad del aire cambie a nivel "Insalubre" o peor</li>
                    <li>• Las notificaciones se envían máximo una vez por hora para evitar spam</li>
                </ul>
            </InfoCard>
        </div>
    );
};

/**
 * Resumen de alertas para el usuario suscrito
 * NOTA: Los "eventos moderados/insalubres" son MEDICIONES registradas en la base de datos
 * donde los niveles estuvieron en esos rangos, NO alertas enviadas al usuario.
 */
const UserAlertSummary = ({ alertHistory, email }) => {
    // Obtener estadísticas del historial
    const emailsSent = alertHistory?.emails_sent || 0;
    const moderateReadings = alertHistory?.moderate_events_count || 0;
    const unhealthyReadings = alertHistory?.unhealthy_events_count || 0;
    
    // Calcular el porcentaje de tiempo con buena calidad
    const totalReadings = alertHistory?.total_readings || 1;
    const goodReadings = totalReadings - moderateReadings - unhealthyReadings;
    const goodPercentage = Math.round((goodReadings / totalReadings) * 100);
    
    return (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl p-5">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                📊 Resumen de Calidad del Aire (últimos 30 días)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Alertas enviadas por email */}
                <div className="bg-white/20 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold">{emailsSent}</div>
                    <div className="text-sm text-white/80">Alertas enviadas a tu correo</div>
                </div>
                
                {/* Tiempo con buena calidad */}
                <div className="bg-white/20 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-green-300">{goodPercentage}%</div>
                    <div className="text-sm text-white/80">del tiempo con aire bueno</div>
                </div>
                
                {/* Días analizados */}
                <div className="bg-white/20 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold">{alertHistory?.days_analyzed || 30}</div>
                    <div className="text-sm text-white/80">días monitoreados</div>
                </div>
            </div>
            
            {/* Mensaje contextual */}
            {emailsSent === 0 ? (
                <div className="mt-4 bg-white/10 rounded-lg p-3 text-sm">
                    <span className="text-white/90">
                        ✨ <strong>Buenas noticias:</strong> No has recibido alertas porque la calidad del aire 
                        no ha alcanzado niveles preocupantes. ¡El aire en Xalapa ha estado mayormente bueno!
                    </span>
                </div>
            ) : (
                <div className="mt-4 bg-white/10 rounded-lg p-3 text-sm">
                    <span className="text-white/90">
                        📧 Has recibido {emailsSent} alerta(s) cuando los niveles superaron el umbral de seguridad.
                    </span>
                </div>
            )}
            
            {/* Nota explicativa */}
            <div className="mt-3 text-xs text-white/60 italic">
                * Las alertas solo se envían cuando PM2.5 supera 35.4 µg/m³ (nivel insalubre para grupos sensibles)
            </div>
        </div>
    );
};

/**
 * Notificaciones por email
 */
const EmailNotifications = ({
    email,
    setEmail,
    isSubscribed,
    subscriptionLoading,
    subscriptionMessage,
    onSubscribe,
    onUnsubscribe,
}) => (
    <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
        <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">📧</span>
            <h3 className="text-xl font-semibold text-gray-800">
                Notificaciones por Correo
            </h3>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
            Recibe alertas automáticas por correo electrónico cuando los niveles de contaminación 
            alcancen niveles preocupantes. ¡No te pierdas ninguna alerta importante!
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3">
            <input
                type="email"
                placeholder="tu-correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubscribed}
                className={`
                    flex-1 px-4 py-3 border-2 rounded-lg 
                    focus:outline-none focus:ring-2 focus:ring-blue-500 
                    transition-all
                    ${isSubscribed 
                        ? 'bg-gray-100 cursor-not-allowed border-gray-200' 
                        : 'bg-white border-gray-300'
                    }
                `}
            />
            
            {!isSubscribed ? (
                <Button
                    variant="primary"
                    icon="🔔"
                    onClick={onSubscribe}
                    disabled={subscriptionLoading || !email}
                    loading={subscriptionLoading}
                    className="whitespace-nowrap"
                >
                    Suscribirme
                </Button>
            ) : (
                <Button
                    variant="danger"
                    icon="🔕"
                    onClick={onUnsubscribe}
                    disabled={subscriptionLoading}
                    loading={subscriptionLoading}
                    className="whitespace-nowrap"
                >
                    Desuscribirme
                </Button>
            )}
        </div>
        
        {/* Mensaje de estado */}
        {subscriptionMessage && (
            <div className={`
                mt-4 p-3 rounded-lg font-medium animate-fade-in
                ${subscriptionMessage.includes('✅')
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }
            `}>
                {subscriptionMessage}
            </div>
        )}
        
        {/* Estado de suscripción */}
        {isSubscribed && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <span className="text-xl">✅</span>
                <div>
                    <div className="font-medium text-green-800">Notificaciones Activas</div>
                    <div className="text-sm text-green-600">
                        Correo registrado: <strong>{email}</strong>
                    </div>
                </div>
            </div>
        )}
    </div>
);

/**
 * Notificaciones Push del navegador
 */
const PushNotifications = ({ pushPermission, onRequestPermission }) => (
    <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
        <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🔔</span>
            <h3 className="text-xl font-semibold text-gray-800">
                Notificaciones del Navegador
            </h3>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
            Recibe alertas instantáneas en tu navegador cuando la calidad del aire empeore.
            Las notificaciones aparecerán incluso si no tienes la página abierta.
        </p>
        
        {pushPermission === 'granted' ? (
            <div className="flex items-center gap-3 text-green-700 bg-green-100 p-4 rounded-lg border border-green-200">
                <span className="text-2xl">✅</span>
                <div>
                    <div className="font-semibold">Notificaciones del navegador activadas</div>
                    <div className="text-sm text-green-600">
                        Recibirás alertas cuando la calidad del aire sea insalubre o peor.
                    </div>
                </div>
            </div>
        ) : pushPermission === 'denied' ? (
            <div className="flex items-center gap-3 text-red-700 bg-red-100 p-4 rounded-lg border border-red-200">
                <span className="text-2xl">❌</span>
                <div>
                    <div className="font-semibold">Notificaciones bloqueadas</div>
                    <div className="text-sm">
                        Para activarlas, haz clic en el ícono de candado en la barra de direcciones 
                        y permite las notificaciones.
                    </div>
                </div>
            </div>
        ) : (
            <Button
                variant="primary"
                icon="🔔"
                onClick={onRequestPermission}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
                Activar Notificaciones del Navegador
            </Button>
        )}
    </div>
);

export default React.memo(NotificationsTab);
