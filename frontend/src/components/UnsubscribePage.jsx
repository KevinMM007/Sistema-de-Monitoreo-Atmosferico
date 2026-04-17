/**
 * UnsubscribePage - Página de desuscripción con un clic
 *
 * Se monta cuando el usuario llega a la ruta /unsubscribe?email=...&token=...
 * desde el enlace incluido en los correos de alerta.
 *
 * Flujo:
 * 1. Lee `email` y `token` desde los query params de la URL.
 * 2. Llama a alertService.unsubscribeViaLink(email, token).
 * 3. Muestra estado de carga, éxito o error.
 * 4. Ofrece un botón para volver al dashboard principal.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { alertService } from '../services/api';
import { LoadingSpinner, Button } from './common';
import logoRevive from '../assets/logo_revive.png';

const UnsubscribePage = () => {
    // Estados posibles: 'loading' | 'success' | 'error' | 'invalid'
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');

    const processUnsubscribe = useCallback(async () => {
        try {
            const params = new URLSearchParams(window.location.search);
            const emailParam = params.get('email');
            const tokenParam = params.get('token');

            if (!emailParam || !tokenParam) {
                setStatus('invalid');
                setMessage(
                    'El enlace de desuscripción es incompleto. Faltan parámetros obligatorios (email o token).'
                );
                return;
            }

            setEmail(emailParam);

            const response = await alertService.unsubscribeViaLink(emailParam, tokenParam);

            setStatus('success');
            setMessage(
                response?.message ||
                    `La dirección ${emailParam} ha sido desuscrita correctamente. Ya no recibirás más alertas de calidad del aire.`
            );
        } catch (err) {
            console.error('Error al desuscribir:', err);
            setStatus('error');
            setMessage(
                err?.message ||
                    'No se pudo completar la desuscripción. El enlace puede haber expirado o ya haber sido utilizado.'
            );
        }
    }, []);

    useEffect(() => {
        processUnsubscribe();
    }, [processUnsubscribe]);

    const goToDashboard = () => {
        window.location.href = '/';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                {/* Encabezado con logo */}
                <div className="bg-white px-6 py-5 border-b border-gray-200 flex items-center gap-3">
                    <img
                        src={logoRevive}
                        alt="Logo REVIVE"
                        className="h-10 w-auto object-contain"
                    />
                    <div>
                        <h1 className="text-base font-bold text-gray-800">
                            Sistema de Calidad del Aire
                        </h1>
                        <p className="text-xs text-gray-500">Xalapa, Veracruz</p>
                    </div>
                </div>

                {/* Contenido dinámico según estado */}
                <div className="px-6 py-8 text-center">
                    {status === 'loading' && (
                        <>
                            <LoadingSpinner size="xl" text="Procesando desuscripción..." />
                            <p className="mt-4 text-sm text-gray-600">
                                Estamos verificando tu enlace, esto tomará solo un momento.
                            </p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
                                <svg
                                    className="w-10 h-10 text-green-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">
                                Desuscripción confirmada
                            </h2>
                            <p className="text-sm text-gray-600 mb-6">{message}</p>
                            {email && (
                                <p className="text-xs text-gray-500 mb-6">
                                    Puedes volver a suscribirte cuando quieras desde el
                                    panel de notificaciones del dashboard.
                                </p>
                            )}
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
                                <svg
                                    className="w-10 h-10 text-red-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">
                                No se pudo desuscribir
                            </h2>
                            <p className="text-sm text-gray-600 mb-6">{message}</p>
                            <p className="text-xs text-gray-500 mb-6">
                                Si el problema persiste, puedes desuscribirte manualmente
                                desde el dashboard.
                            </p>
                        </>
                    )}

                    {status === 'invalid' && (
                        <>
                            <div className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100">
                                <svg
                                    className="w-10 h-10 text-yellow-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                                    />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">
                                Enlace inválido
                            </h2>
                            <p className="text-sm text-gray-600 mb-6">{message}</p>
                        </>
                    )}

                    {status !== 'loading' && (
                        <Button variant="primary" onClick={goToDashboard} icon="🏠">
                            Volver al dashboard
                        </Button>
                    )}
                </div>

                {/* Pie */}
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-center">
                    <p className="text-xs text-gray-500">
                        Sistema de monitoreo de calidad del aire · Xalapa, Ver.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UnsubscribePage;
