/**
 * Componente WeatherCard - Muestra condiciones meteorológicas
 * Fase 4 - Refactorización del Dashboard
 */

import React from 'react';
import { Card, StatCard } from '../common';

const WeatherCard = ({ weatherData, loading = false, className = '' }) => {
    if (loading) {
        return (
            <Card title="Condiciones Meteorológicas" className={className}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-gray-100 p-4 rounded-lg animate-pulse h-24" />
                    ))}
                </div>
            </Card>
        );
    }

    if (!weatherData) {
        return (
            <Card title="Condiciones Meteorológicas" className={className}>
                <p className="text-gray-500 text-center py-8">
                    No hay datos meteorológicos disponibles
                </p>
            </Card>
        );
    }

    const weatherStats = [
        {
            title: 'Temperatura',
            value: weatherData.temperature,
            unit: '°C',
            icon: '🌡️',
            bgColor: 'bg-red-50',
        },
        {
            title: 'Humedad',
            value: weatherData.humidity,
            unit: '%',
            icon: '💧',
            bgColor: 'bg-blue-50',
        },
        {
            title: 'Viento',
            value: weatherData.wind_speed,
            unit: 'km/h',
            icon: '💨',
            bgColor: 'bg-gray-50',
        },
        {
            title: 'Nubosidad',
            value: weatherData.cloud_cover,
            unit: '%',
            icon: '☁️',
            bgColor: 'bg-gray-50',
        },
    ];

    return (
        <Card title="Condiciones Meteorológicas" icon="🌤️" className={className}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {weatherStats.map((stat) => (
                    <StatCard
                        key={stat.title}
                        title={stat.title}
                        value={stat.value}
                        unit={stat.unit}
                        icon={stat.icon}
                        bgColor={stat.bgColor}
                    />
                ))}
            </div>
        </Card>
    );
};

export default React.memo(WeatherCard);
