import React, { useState, useEffect } from 'react';

const AlertsAndPredictions = () => {
    const [currentAlert, setCurrentAlert] = useState(null);
    const [zoneData, setZoneData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [subscriptionLoading, setSubscriptionLoading] = useState(false);

    useEffect(() => {
        fetchCurrentData();
        loadNotificationSettings();
        
        // Actualizar cada 5 minutos
        const interval = setInterval(() => {
            fetchCurrentData();
        }, 300000);
        
        return () => clearInterval(interval);
    }, []);

    const loadNotificationSettings = async () => {
        const savedEmail = localStorage.getItem('notificationEmail');
        if (savedEmail) {
            setEmail(savedEmail);
            
            // Verificar estado real en el servidor
            try {
                const response = await fetch(`http://localhost:8000/api/alerts/subscription/${savedEmail}`);
                if (response.ok) {
                    const data = await response.json();
                    setIsSubscribed(data.is_active);
                } else {
                    // Si no existe en el servidor, limpiar localStorage
                    setIsSubscribed(false);
                }
            } catch (error) {
                console.error('Error verificando suscripción:', error);
                setIsSubscribed(false);
            }
        }
    };

    const fetchCurrentData = async () => {
        try {
            // Obtener datos de alertas del endpoint actual
            const alertResponse = await fetch('http://localhost:8000/api/alerts/current');
            if (alertResponse.ok) {
                const alertData = await alertResponse.json();
                setCurrentAlert(alertData);
            }

            // Obtener datos por zona para mostrar información consistente
            const zoneResponse = await fetch('http://localhost:8000/api/air-quality/by-zone');
            if (zoneResponse.ok) {
                const data = await zoneResponse.json();
                setZoneData(data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async () => {
        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setNotificationMessage('❌ Por favor ingrese un correo electrónico válido');
            setTimeout(() => setNotificationMessage(''), 3000);
            return;
        }
        
        setSubscriptionLoading(true);
        
        try {
            const response = await fetch('http://localhost:8000/api/alerts/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('notificationEmail', email);
                setIsSubscribed(true);
                setNotificationMessage('✅ Suscripción exitosa. Recibirás alertas cuando la calidad del aire sea moderada o peor.');
                
                // NO enviar correo de prueba automáticamente
                // Los correos solo se enviarán cuando haya alertas reales
            } else {
                const errorData = await response.json();
                setNotificationMessage('❌ Error: ' + (errorData.detail || 'No se pudo suscribir'));
            }
        } catch (error) {
            console.error('Error suscribiendo:', error);
            setNotificationMessage('❌ Error de conexión. Verifica que el servidor esté corriendo.');
        } finally {
            setSubscriptionLoading(false);
            setTimeout(() => setNotificationMessage(''), 5000);
        }
    };

    const handleUnsubscribe = async () => {
        setSubscriptionLoading(true);
        
        try {
            const response = await fetch(`http://localhost:8000/api/alerts/unsubscribe/${email}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                const data = await response.json();
                setIsSubscribed(false);
                setNotificationMessage('✅ ' + data.message);
            } else {
                const errorData = await response.json();
                setNotificationMessage('❌ Error: ' + (errorData.detail || 'No se pudo desuscribir'));
            }
        } catch (error) {
            console.error('Error desuscribiendo:', error);
            setNotificationMessage('❌ Error de conexión');
        } finally {
            setSubscriptionLoading(false);
            setTimeout(() => setNotificationMessage(''), 5000);
        }
    };

    const getAlertColor = (level) => {
        const colors = {
            'bueno': '#10b981',
            'moderado': '#f59e0b',
            'insalubre_sensibles': '#f97316',
            'insalubre': '#ef4444',
            'muy_insalubre': '#dc2626',
            'peligroso': '#7c2d12'
        };
        return colors[level] || '#6b7280';
    };

    const getAlertIcon = (level) => {
        const icons = {
            'bueno': '😊',
            'moderado': '😐',
            'insalubre_sensibles': '😷',
            'insalubre': '🤒',
            'muy_insalubre': '😵',
            'peligroso': '☠️'
        };
        return icons[level] || '❓';
    };

    const AlertCard = ({ alert, zoneData }) => {
        if (!alert) return null;
        
        const alertColor = getAlertColor(alert.overall_level?.value);
        const alertIcon = getAlertIcon(alert.overall_level?.value);
        
        return (
            <div className={`rounded-lg p-6 border-2`} style={{ borderColor: alertColor }}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold flex items-center gap-2">
                        <span className="text-3xl">{alertIcon}</span>
                        Estado Actual: {alert.overall_level?.value?.toUpperCase().replace(/_/g, ' ')}
                    </h3>
                    <div className="text-sm text-gray-500">
                        {new Date(alert.timestamp).toLocaleString()}
                    </div>
                </div>
                
                {alert.aqi && (
                    <div className="mb-4 p-4 bg-gray-50 rounded">
                        <h4 className="font-semibold mb-2">Índice de Calidad del Aire (AQI)</h4>
                        <div className="flex items-center gap-4">
                            <div className="text-3xl font-bold" style={{ color: alertColor }}>
                                {alert.aqi.overall?.toFixed(0) || 'N/A'}
                            </div>
                            <div className="text-sm">
                                {alert.aqi.pm25 && <div>PM2.5: {alert.aqi.pm25.toFixed(0)}</div>}
                                {alert.aqi.pm10 && <div>PM10: {alert.aqi.pm10.toFixed(0)}</div>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Mostrar datos por zona si están disponibles */}
                {zoneData && zoneData.zones && zoneData.zones.length > 0 && (
                    <div className="mb-4 p-4 bg-blue-50 rounded">
                        <h4 className="font-semibold mb-3">Niveles por Zona</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {zoneData.zones.map((zone, index) => (
                                <div key={index} className="bg-white p-3 rounded border">
                                    <div className="font-medium text-sm mb-1">{zone.zone_name}</div>
                                    <div className="text-xs text-gray-600">
                                        <div>PM2.5: {zone.pollutants.pm25.toFixed(1)} µg/m³</div>
                                        <div>Congestión: {zone.traffic.congestion_level.toFixed(1)}%</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {alert.recommendations && (
                    <div className="space-y-3">
                        <div className="p-4 bg-blue-50 rounded">
                            <h4 className="font-semibold mb-2">Recomendaciones Generales</h4>
                            <p>{alert.recommendations.general}</p>
                        </div>
                        
                        <div className="p-4 bg-yellow-50 rounded">
                            <h4 className="font-semibold mb-2">Grupos Sensibles</h4>
                            <p>{alert.recommendations.sensitive}</p>
                        </div>
                        
                        {alert.recommendations.activities && (
                            <div className="p-4 bg-green-50 rounded">
                                <h4 className="font-semibold mb-2">Actividades Recomendadas</h4>
                                <ul className="list-disc list-inside">
                                    {alert.recommendations.activities.map((activity, index) => (
                                        <li key={index}>{activity}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
                
                {alert.alerts && alert.alerts.length > 0 && (
                    <div className="mt-4 p-4 bg-red-50 rounded">
                        <h4 className="font-semibold mb-2">Contaminantes en Alerta</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {alert.alerts.map((pollutantAlert, index) => (
                                <div key={index} className="bg-white p-2 rounded border">
                                    <div className="font-medium">{pollutantAlert.pollutant.toUpperCase()}</div>
                                    <div className="text-sm">{pollutantAlert.value.toFixed(2)}</div>
                                    <div className="text-xs text-gray-500">{pollutantAlert.level.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Cargando estado actual...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
                <div className="border-b">
                    <h2 className="text-xl font-bold px-6 py-4">Estado Actual de la Calidad del Aire</h2>
                </div>
                
                <div className="p-6">
                    <AlertCard alert={currentAlert} zoneData={zoneData} />
                    
                    {/* Sección de Notificaciones Mejorada */}
                    <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-3xl">📧</span>
                            <h3 className="text-xl font-semibold">Notificaciones por Correo</h3>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-4">
                            Recibe alertas automáticas por correo electrónico cuando los niveles de contaminación 
                            alcancen niveles preocupantes. ¡No te pierdas ninguna alerta importante!
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                            <input
                                type="email"
                                placeholder="tu-correo@ejemplo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isSubscribed}
                                className={`flex-1 px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                                    isSubscribed ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                                }`}
                            />
                            
                            {!isSubscribed ? (
                                <button
                                    onClick={handleSubscribe}
                                    disabled={subscriptionLoading || !email}
                                    className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                                        subscriptionLoading || !email
                                            ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                                            : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                                    }`}
                                >
                                    {subscriptionLoading ? '⏳ Procesando...' : '🔔 Suscribirme'}
                                </button>
                            ) : (
                                <button
                                    onClick={handleUnsubscribe}
                                    disabled={subscriptionLoading}
                                    className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                                        subscriptionLoading
                                            ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                                            : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                                    }`}
                                >
                                    {subscriptionLoading ? '⏳ Procesando...' : '🔕 Desuscribirme'}
                                </button>
                            )}
                        </div>
                        
                        {notificationMessage && (
                            <div className={`mt-4 p-4 rounded-lg font-medium animate-fade-in ${
                                notificationMessage.includes('✅')
                                    ? 'bg-green-100 text-green-800 border-2 border-green-300'
                                    : 'bg-red-100 text-red-800 border-2 border-red-300'
                            }`}>
                                {notificationMessage}
                            </div>
                        )}
                        
                        {isSubscribed && (
                            <div className="mt-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                                <div className="flex items-center gap-2 text-green-800">
                                    <span className="text-2xl">✅</span>
                                    <div>
                                        <div className="font-semibold">Notificaciones Activas</div>
                                        <div className="text-sm">Correo registrado: <strong>{email}</strong></div>
                                        <div className="text-xs mt-1">Recibirás alertas cuando la calidad del aire sea moderada o peor</div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Información adicional */}
                        <div className="mt-4 p-3 bg-blue-100 rounded-lg text-sm text-blue-800">
                            <div className="font-semibold mb-1">ℹ️ ¿Qué incluyen las notificaciones?</div>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                <li>Nivel actual de calidad del aire con código de colores</li>
                                <li>Índice AQI y valores de contaminantes</li>
                                <li>Recomendaciones personalizadas para tu salud</li>
                                <li>Actividades recomendadas según el nivel de contaminación</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AlertsAndPredictions;
