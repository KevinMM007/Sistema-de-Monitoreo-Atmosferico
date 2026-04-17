/**
 * Componente NotificationsTab - Tab de Notificaciones
 * 
 * 🆕 MEJORAS:
 * - Responsive design completo
 * - Accesibilidad mejorada (labels, aria-labels, roles)
 * - Formularios accesibles
 */

import React, { useState } from 'react';
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
    onCheckSubscription,

    // Push notifications
    pushPermission,
    onRequestPushPermission,
}) => {
    return (
        <div className="animate-fade-in space-y-4 sm:space-y-6">
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
                onCheckSubscription={onCheckSubscription}
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
                <ul className="space-y-1 text-xs sm:text-sm">
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
 */
const UserAlertSummary = ({ alertHistory, email }) => {
    const emailsSent = alertHistory?.emails_sent || 0;
    const moderateReadings = alertHistory?.moderate_events_count || 0;
    const unhealthyReadings = alertHistory?.unhealthy_events_count || 0;
    
    const totalReadings = alertHistory?.total_readings || 1;
    const goodReadings = totalReadings - moderateReadings - unhealthyReadings;
    const goodPercentage = Math.round((goodReadings / totalReadings) * 100);
    
    return (
        <section 
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl p-4 sm:p-5"
            aria-labelledby="summary-title"
        >
            <h3 id="summary-title" className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2">
                <span aria-hidden="true">📊</span>
                Resumen de Calidad del Aire (últimos 30 días)
            </h3>
            
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {/* Alertas enviadas por email */}
                <div className="bg-white/20 rounded-lg p-2 sm:p-4 text-center">
                    <div className="text-xl sm:text-3xl font-bold">{emailsSent}</div>
                    <div className="text-xs sm:text-sm text-white/80">
                        <span className="hidden sm:inline">Alertas enviadas a tu correo</span>
                        <span className="sm:hidden">Alertas</span>
                    </div>
                </div>
                
                {/* Tiempo con buena calidad */}
                <div className="bg-white/20 rounded-lg p-2 sm:p-4 text-center">
                    <div className="text-xl sm:text-3xl font-bold text-green-300">{goodPercentage}%</div>
                    <div className="text-xs sm:text-sm text-white/80">
                        <span className="hidden sm:inline">del tiempo con aire bueno</span>
                        <span className="sm:hidden">Aire bueno</span>
                    </div>
                </div>
                
                {/* Días analizados */}
                <div className="bg-white/20 rounded-lg p-2 sm:p-4 text-center">
                    <div className="text-xl sm:text-3xl font-bold">{alertHistory?.days_analyzed || 30}</div>
                    <div className="text-xs sm:text-sm text-white/80">
                        <span className="hidden sm:inline">días monitoreados</span>
                        <span className="sm:hidden">Días</span>
                    </div>
                </div>
            </div>
            
            {/* Mensaje contextual */}
            {emailsSent === 0 ? (
                <div className="mt-3 sm:mt-4 bg-white/10 rounded-lg p-2 sm:p-3 text-xs sm:text-sm">
                    <span className="text-white/90">
                        <span aria-hidden="true">✨</span> <strong>Buenas noticias:</strong> No has recibido alertas porque la calidad del aire 
                        no ha alcanzado niveles preocupantes.
                    </span>
                </div>
            ) : (
                <div className="mt-3 sm:mt-4 bg-white/10 rounded-lg p-2 sm:p-3 text-xs sm:text-sm">
                    <span className="text-white/90">
                        <span aria-hidden="true">📧</span> Has recibido {emailsSent} alerta(s) cuando los niveles superaron el umbral.
                    </span>
                </div>
            )}
            
            {/* Nota explicativa */}
            <div className="mt-2 sm:mt-3 text-xs text-white/60 italic">
                * Las alertas solo se envían cuando PM2.5 supera 35.4 µg/m³
            </div>
        </section>
    );
};

/**
 * Notificaciones por email - Con accesibilidad mejorada
 */
const EmailNotifications = ({
    email,
    setEmail,
    isSubscribed,
    subscriptionLoading,
    subscriptionMessage,
    onSubscribe,
    onUnsubscribe,
    onCheckSubscription,
}) => {
    // Generar un ID único para el campo de email
    const emailInputId = 'email-subscription-input';
    const emailDescriptionId = 'email-subscription-description';
    const statusMessageId = 'subscription-status-message';

    // Toggle para el modo "Verificar mi estado" (útil cuando entras desde
    // otro dispositivo donde localStorage no tiene tu correo guardado).
    const [isCheckingExisting, setIsCheckingExisting] = useState(false);
    const [checkInput, setCheckInput] = useState('');

    // Handler para suscribir pasando el email directamente
    const handleSubscribe = (e) => {
        e.preventDefault();
        console.log('📧 Click en Suscribir, email actual:', email);
        onSubscribe(email);
    };

    // Handler para desuscribir
    const handleUnsubscribe = () => {
        console.log('📧 Click en Desuscribir, email actual:', email);
        onUnsubscribe(email);
    };

    const handleCheck = async (e) => {
        e.preventDefault();
        if (!onCheckSubscription) return;
        const result = await onCheckSubscription(checkInput);
        if (result?.active) {
            // Suscripción encontrada y activa: cerramos el panel
            setIsCheckingExisting(false);
            setCheckInput('');
        }
    };
    
    return (
        <section 
            className="p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200"
            aria-labelledby="email-notifications-title"
        >
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <span className="text-2xl sm:text-3xl" aria-hidden="true">📧</span>
                <h3 id="email-notifications-title" className="text-lg sm:text-xl font-semibold text-gray-800">
                    Notificaciones por Correo
                </h3>
            </div>
            
            <p id={emailDescriptionId} className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                Recibe alertas automáticas por correo electrónico cuando los niveles de contaminación
                alcancen niveles preocupantes.
            </p>

            {/* Verificación de estado existente (cuando no hay localStorage) */}
            {!isSubscribed && onCheckSubscription && (
                <div className="mb-3 sm:mb-4">
                    {!isCheckingExisting ? (
                        <button
                            type="button"
                            onClick={() => setIsCheckingExisting(true)}
                            className="text-xs sm:text-sm text-blue-700 hover:text-blue-900 underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                        >
                            ¿Ya te suscribiste desde otro dispositivo? Verifica tu estado
                        </button>
                    ) : (
                        <form
                            onSubmit={handleCheck}
                            className="bg-white rounded-lg border border-blue-200 p-3 sm:p-4 space-y-2 sm:space-y-3"
                        >
                            <label htmlFor="check-existing-email" className="block text-xs sm:text-sm font-medium text-gray-700">
                                Ingresa tu correo para consultar tu suscripción
                            </label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="email"
                                    id="check-existing-email"
                                    placeholder="tu-correo@ejemplo.com"
                                    value={checkInput}
                                    onChange={(e) => setCheckInput(e.target.value)}
                                    required
                                    className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <Button
                                    type="submit"
                                    variant="primary"
                                    icon="🔍"
                                    disabled={subscriptionLoading || !checkInput}
                                    loading={subscriptionLoading}
                                    className="whitespace-nowrap"
                                    ariaLabel="Verificar estado de suscripción"
                                >
                                    Verificar
                                </Button>
                                <button
                                    type="button"
                                    onClick={() => { setIsCheckingExisting(false); setCheckInput(''); }}
                                    className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 underline px-2 focus:outline-none"
                                >
                                    Cancelar
                                </button>
                            </div>
                            <p className="text-xs text-gray-500">
                                Si ya estás suscrito, cargaremos tu información. Si no, puedes suscribirte abajo.
                            </p>
                        </form>
                    )}
                </div>
            )}

            {/* Formulario de suscripción */}
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="flex-1">
                    <label htmlFor={emailInputId} className="sr-only">
                        Correo electrónico para notificaciones
                    </label>
                    <input
                        type="email"
                        id={emailInputId}
                        name="email"
                        placeholder="tu-correo@ejemplo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isSubscribed}
                        required
                        aria-describedby={emailDescriptionId}
                        aria-invalid={subscriptionMessage && subscriptionMessage.includes('❌') ? 'true' : undefined}
                        className={`
                            w-full px-3 sm:px-4 py-2 sm:py-3 border-2 rounded-lg 
                            text-sm sm:text-base
                            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                            transition-all
                            ${isSubscribed 
                                ? 'bg-gray-100 cursor-not-allowed border-gray-200' 
                                : 'bg-white border-gray-300'
                            }
                        `}
                    />
                </div>
                
                {!isSubscribed ? (
                    <Button
                        type="submit"
                        variant="primary"
                        icon="🔔"
                        disabled={subscriptionLoading || !email}
                        loading={subscriptionLoading}
                        className="whitespace-nowrap"
                        ariaLabel="Suscribirse a notificaciones por correo"
                    >
                        <span className="hidden sm:inline">Suscribirme</span>
                        <span className="sm:hidden">Suscribir</span>
                    </Button>
                ) : (
                    <Button
                        type="button"
                        variant="danger"
                        icon="🔕"
                        onClick={handleUnsubscribe}
                        disabled={subscriptionLoading}
                        loading={subscriptionLoading}
                        className="whitespace-nowrap"
                        ariaLabel="Cancelar suscripción de notificaciones"
                    >
                        <span className="hidden sm:inline">Desuscribirme</span>
                        <span className="sm:hidden">Cancelar</span>
                    </Button>
                )}
            </form>
            
            {/* Mensaje de estado - con role para lectores de pantalla */}
            {subscriptionMessage && (
                <div 
                    id={statusMessageId}
                    role="status"
                    aria-live="polite"
                    className={`
                        mt-3 sm:mt-4 p-2 sm:p-3 rounded-lg font-medium animate-fade-in
                        text-xs sm:text-sm
                        ${subscriptionMessage.includes('✅')
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-red-100 text-red-800 border border-red-300'
                        }
                    `}
                >
                    {subscriptionMessage}
                </div>
            )}
            
            {/* Estado de suscripción activa */}
            {isSubscribed && (
                <div 
                    className="mt-3 sm:mt-4 p-2 sm:p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 sm:gap-3"
                    role="status"
                >
                    <span className="text-lg sm:text-xl" aria-hidden="true">✅</span>
                    <div>
                        <div className="font-medium text-green-800 text-sm sm:text-base">Notificaciones Activas</div>
                        <div className="text-xs sm:text-sm text-green-600">
                            Correo: <strong>{email}</strong>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

/**
 * Notificaciones Push del navegador
 */
const PushNotifications = ({ pushPermission, onRequestPermission }) => (
    <section 
        className="p-4 sm:p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200"
        aria-labelledby="push-notifications-title"
    >
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <span className="text-2xl sm:text-3xl" aria-hidden="true">🔔</span>
            <h3 id="push-notifications-title" className="text-lg sm:text-xl font-semibold text-gray-800">
                Notificaciones del Navegador
            </h3>
        </div>
        
        <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
            Recibe alertas instantáneas en tu navegador cuando la calidad del aire empeore.
            <span className="hidden sm:inline"> Las notificaciones aparecerán incluso si no tienes la página abierta.</span>
        </p>
        
        {pushPermission === 'granted' ? (
            <div 
                className="flex items-center gap-2 sm:gap-3 text-green-700 bg-green-100 p-3 sm:p-4 rounded-lg border border-green-200"
                role="status"
            >
                <span className="text-xl sm:text-2xl" aria-hidden="true">✅</span>
                <div>
                    <div className="font-semibold text-sm sm:text-base">Notificaciones activadas</div>
                    <div className="text-xs sm:text-sm text-green-600">
                        Recibirás alertas cuando la calidad del aire sea insalubre o peor.
                    </div>
                </div>
            </div>
        ) : pushPermission === 'denied' ? (
            <div 
                className="flex items-start gap-2 sm:gap-3 text-red-700 bg-red-100 p-3 sm:p-4 rounded-lg border border-red-200"
                role="alert"
            >
                <span className="text-xl sm:text-2xl flex-shrink-0" aria-hidden="true">❌</span>
                <div>
                    <div className="font-semibold text-sm sm:text-base">Notificaciones bloqueadas</div>
                    <div className="text-xs sm:text-sm">
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
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 w-full sm:w-auto"
                ariaLabel="Activar notificaciones del navegador"
            >
                Activar Notificaciones del Navegador
            </Button>
        )}
    </section>
);

export default React.memo(NotificationsTab);
