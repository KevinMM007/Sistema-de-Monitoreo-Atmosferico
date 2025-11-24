import React, { useState, useEffect, useRef } from 'react';
import { LineChart, XAxis, YAxis, Tooltip, Legend, Line } from 'recharts';
import { MapContainer, TileLayer, Rectangle, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import html2pdf from 'html2pdf.js';

const POLLUTANT_INFO = {
    pm25: {
        name: 'PM2.5',
        unit: 'µg/m³',
        format: (value) => `${value.toFixed(2)} µg/m³`
    },
    pm10: {
        name: 'PM10',
        unit: 'µg/m³',
        format: (value) => `${value.toFixed(2)} µg/m³`
    },
    no2: {
        name: 'NO₂',
        unit: 'µg/m³',
        format: (value) => `${value.toFixed(2)} µg/m³`
    },
    o3: {
        name: 'O₃',
        unit: 'µg/m³',
        format: (value) => `${value.toFixed(2)} µg/m³`
    },
    co: {
        name: 'CO',
        unit: 'mg/m³',
        format: (value) => `${value.toFixed(2)} mg/m³`
    }
};

const POLLUTANT_THRESHOLDS = {
    pm25: {
        good: 12,
        moderate: 35.4,
        unhealthy: 55.4,
        veryUnhealthy: 150.4
    },
    pm10: {
        good: 54,
        moderate: 154,
        unhealthy: 254,
        veryUnhealthy: 354
    },
    no2: {
        good: 53,
        moderate: 100,
        unhealthy: 360,
        veryUnhealthy: 649
    },
    o3: {
        good: 50,
        moderate: 100,
        unhealthy: 150,
        veryUnhealthy: 200
    },
    co: {
        good: 4.4,
        moderate: 9.4,
        unhealthy: 12.4,
        veryUnhealthy: 15.4
    }
};

const XALAPA_MAIN_AREAS = [
    {
      name: 'Centro',
      bounds: [
        [19.5200, -96.9250],
        [19.5500, -96.8900]
      ]
    },
    {
      name: 'Norte',
      bounds: [
        [19.5500, -96.9750],
        [19.5900, -96.8550]
      ]
    },
    {
      name: 'Sur',
      bounds: [
        [19.4900, -96.9750],
        [19.5200, -96.8550]
      ]
    },
    {
      name: 'Este',
      bounds: [
        [19.4900, -96.8900],
        [19.5900, -96.7900]
      ]
    },
    {
      name: 'Oeste',
      bounds: [
        [19.4900, -97.0200],
        [19.5900, -96.9250]
      ]
    }
];

const getPollutantColor = (pollutant, value) => {
    const thresholds = POLLUTANT_THRESHOLDS[pollutant];
    if (value <= thresholds.good) return '#00E400';
    if (value <= thresholds.moderate) return '#FFFF00';
    if (value <= thresholds.unhealthy) return '#FF7E00';
    if (value <= thresholds.veryUnhealthy) return '#FF0000';
    return '#7F004D';
};

const getPollutantLevel = (pollutant, value) => {
    const thresholds = POLLUTANT_THRESHOLDS[pollutant];
    if (value <= thresholds.good) return 'Bueno';
    if (value <= thresholds.moderate) return 'Moderado';
    if (value <= thresholds.unhealthy) return 'Insalubre';
    if (value <= thresholds.veryUnhealthy) return 'Muy Insalubre';
    return 'Peligroso';
};

const MapBoundsHandler = () => {
    const map = useMap();
    
    useEffect(() => {
        map.options.bounceAtZoomLimits = false;
        
        const bounds = [
            [19.3800, -97.1500],
            [19.7000, -96.6500]
        ];
        
        map.on('drag', function() {
            map.panInsideBounds(bounds, { animate: false });
        });
        
        map.on('moveend', function() {
            if (!map.getBounds().intersects(bounds)) {
                map.fitBounds(bounds);
            }
        });
        
        return () => {
            map.off('drag');
            map.off('moveend');
        };
    }, [map]);
    
    return null;
};

const MapLegend = () => (
    <div className="bg-white/95 backdrop-blur-sm p-4 rounded-lg border border-gray-300 shadow-lg">
        <h4 className="font-bold mb-3 text-gray-800">Calidad del Aire</h4>
        <div className="space-y-2">
            <div className="flex items-center">
                <div className="w-4 h-4 bg-[#00E400] mr-3 rounded-sm border border-gray-400"></div>
                <span className="text-sm font-medium text-gray-700">Bueno</span>
            </div>
            <div className="flex items-center">
                <div className="w-4 h-4 bg-[#FFFF00] mr-3 rounded-sm border border-gray-400"></div>
                <span className="text-sm font-medium text-gray-700">Moderado</span>
            </div>
            <div className="flex items-center">
                <div className="w-4 h-4 bg-[#FF7E00] mr-3 rounded-sm border border-gray-400"></div>
                <span className="text-sm font-medium text-gray-700">Insalubre</span>
            </div>
            <div className="flex items-center">
                <div className="w-4 h-4 bg-[#FF0000] mr-3 rounded-sm border border-gray-400"></div>
                <span className="text-sm font-medium text-gray-700">Muy Insalubre</span>
            </div>
            <div className="flex items-center">
                <div className="w-4 h-4 bg-[#7F004D] mr-3 rounded-sm border border-gray-400"></div>
                <span className="text-sm font-medium text-gray-700">Peligroso</span>
            </div>
        </div>
    </div>
);

const WeatherConditions = ({ weatherData }) => {
    if (!weatherData) return null;

    return (
        <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-xl font-bold mb-4">Condiciones Meteorológicas</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                        <span className="text-red-500">🌡️</span>
                        <span className="text-gray-600">Temperatura</span>
                    </div>
                    <p className="text-2xl mt-2">{weatherData.temperature}°C</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                        <span className="text-blue-500">💧</span>
                        <span className="text-gray-600">Humedad</span>
                    </div>
                    <p className="text-2xl mt-2">{weatherData.humidity}%</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500">💨</span>
                        <span className="text-gray-600">Viento</span>
                    </div>
                    <p className="text-2xl mt-2">{weatherData.wind_speed} km/h</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500">☁️</span>
                        <span className="text-gray-600">Nubosidad</span>
                    </div>
                    <p className="text-2xl mt-2">{weatherData.cloud_cover}%</p>
                </div>
            </div>
        </div>
    );
};

const getAirQualityConclusion = (pm25Level) => {
    if (pm25Level <= 12) {
        return "Las condiciones son seguras para realizar actividades al aire libre.";
    } else if (pm25Level <= 35.4) {
        return "Se recomienda precaución para grupos sensibles en actividades prolongadas al aire libre.";
    } else if (pm25Level <= 55.4) {
        return "Se recomienda limitar las actividades prolongadas al aire libre.";
    } else if (pm25Level <= 150.4) {
        return "Se recomienda evitar actividades al aire libre y usar protección respiratoria.";
    } else {
        return "Condiciones peligrosas. Se recomienda permanecer en interiores.";
    }
};

const generateReport = (airQualityData, weatherData, zoneData) => {
    if (!airQualityData || !weatherData) {
        console.error('No hay datos disponibles para generar el reporte');
        return;
    }

    const latestData = airQualityData[airQualityData.length - 1];
    const currentDate = new Date().toLocaleDateString();

    console.log('=== GENERANDO REPORTE PDF ===');
    console.log('zoneData:', zoneData);

    const zonesForReport = zoneData && zoneData.zones ? zoneData.zones.map(zone => ({
        name: zone.zone_name,
        congestionLevel: zone.traffic.congestion_level.toFixed(1),
        pm25: zone.pollutants.pm25.toFixed(2),
        pm10: zone.pollutants.pm10.toFixed(2),
        no2: zone.pollutants.no2.toFixed(2),
        o3: zone.pollutants.o3.toFixed(2),
        co: zone.pollutants.co.toFixed(3),
        status: getPollutantLevel('pm25', zone.pollutants.pm25),
        osmFactor: zone.factors.osm_factor,
        trafficFactor: zone.factors.traffic_factor
    })) : [];
    
    const reportContent = `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
            <h1 style="color: #1a365d;">Reporte de Calidad del Aire - Xalapa</h1>
            <p><strong>Fecha:</strong> ${currentDate}</p>
            <p><strong>Ubicación:</strong> Xalapa, Veracruz</p>
            
            <h2 style="color: #2c5282;">Niveles de Contaminación Actuales (Promedio General)</h2>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background-color: #f7fafc;">
                    <th style="padding: 8px; border: 1px solid #e2e8f0;">Contaminante</th>
                    <th style="padding: 8px; border: 1px solid #e2e8f0;">Valor</th>
                    <th style="padding: 8px; border: 1px solid #e2e8f0;">Estado</th>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">PM2.5</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">${latestData?.pm25?.toFixed(2)} μg/m³</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">${getPollutantLevel('pm25', latestData?.pm25)}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">PM10</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">${latestData?.pm10?.toFixed(2)} μg/m³</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">${getPollutantLevel('pm10', latestData?.pm10)}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">NO₂</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">${latestData?.no2?.toFixed(2)} μg/m³</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">${getPollutantLevel('no2', latestData?.no2)}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">O₃</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">${latestData?.o3?.toFixed(2)} μg/m³</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">${getPollutantLevel('o3', latestData?.o3)}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">CO</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">${latestData?.co?.toFixed(3)} mg/m³</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">${getPollutantLevel('co', latestData?.co)}</td>
                </tr>
            </table>

            ${zonesForReport.length > 0 ? `
            <h2 style="color: #2c5282;">Contaminación por Zonas</h2>
            <p style="margin-bottom: 10px;">
                <em>Los valores por zona están ajustados según factores de infraestructura vial y tráfico en tiempo real.</em>
            </p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background-color: #f7fafc;">
                    <th style="padding: 8px; border: 1px solid #e2e8f0;">Zona</th>
                    <th style="padding: 8px; border: 1px solid #e2e8f0;">Congestión</th>
                    <th style="padding: 8px; border: 1px solid #e2e8f0;">PM2.5</th>
                    <th style="padding: 8px; border: 1px solid #e2e8f0;">PM10</th>
                    <th style="padding: 8px; border: 1px solid #e2e8f0;">NO₂</th>
                    <th style="padding: 8px; border: 1px solid #e2e8f0;">Estado</th>
                </tr>
                ${zonesForReport.map(zone => `
                    <tr>
                        <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">${zone.name}</td>
                        <td style="padding: 8px; border: 1px solid #e2e8f0;">${zone.congestionLevel}%</td>
                        <td style="padding: 8px; border: 1px solid #e2e8f0;">${zone.pm25} μg/m³</td>
                        <td style="padding: 8px; border: 1px solid #e2e8f0;">${zone.pm10} μg/m³</td>
                        <td style="padding: 8px; border: 1px solid #e2e8f0;">${zone.no2} μg/m³</td>
                        <td style="padding: 8px; border: 1px solid #e2e8f0;">${zone.status}</td>
                    </tr>
                `).join('')}
            </table>
            ` : ''}

            <div style="page-break-before: always;"></div>

            <h2 style="color: #2c5282;">Condiciones Meteorológicas</h2>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">Temperatura</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">${weatherData.temperature}°C</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">Humedad</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">${weatherData.humidity}%</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">Velocidad del Viento</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">${weatherData.wind_speed} km/h</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">Nubosidad</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">${weatherData.cloud_cover}%</td>
                </tr>
            </table>

            <h2 style="color: #2c5282;">Conclusión</h2>
            <p>Según los niveles establecidos por organizaciones ambientales, la calidad del aire en Xalapa se encuentra actualmente en un nivel
            <strong>${getPollutantLevel('pm25', latestData?.pm25)}</strong>.
            ${getAirQualityConclusion(latestData?.pm25)}</p>

            ${zonesForReport.length > 0 ? `
                <p style="margin-top: 10px;">
                    <strong>Nota sobre variación por zonas:</strong> Los datos por zona reflejan las características 
                    únicas de infraestructura vial y tráfico en tiempo real de cada área de Xalapa. Las zonas con 
                    mayor densidad vial y congestión presentan niveles más elevados de contaminantes.
                </p>
            ` : ''}
        </div>
    `;

    const opt = {
        margin: [15, 15, 15, 15],
        filename: `reporte-calidad-aire-${currentDate}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2,
            useCORS: true,
            letterRendering: true
        },
        jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait',
            putOnlyUsedFonts: true,
            floatPrecision: 16
        },
        pagebreak: { mode: 'css', before: '.page-break' }
    };

    const element = document.createElement('div');
    element.innerHTML = reportContent;
    
    const style = document.createElement('style');
    style.textContent = `
        @media print {
            .page-break { page-break-before: always; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
        }
    `;
    element.appendChild(style);
    
    html2pdf().set(opt).from(element).save();
};

const QuadrantRectangle = ({ area, zoneData }) => {
    if (!zoneData || !zoneData.zones) return null;

    const zone = zoneData.zones.find(z => z.zone_name === area.name);
    if (!zone) return null;

    const pollutants = zone.pollutants;
    const traffic = zone.traffic;
    const factors = zone.factors;

    return (
        <Rectangle
            bounds={area.bounds}
            pathOptions={{
                color: '#FFFFFF',
                weight: 2,
                fillColor: getPollutantColor('pm25', pollutants.pm25),
                fillOpacity: 0.35
            }}
        >
            <Popup>
                <div style={{ padding: '12px', minWidth: '220px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', color: '#1f2937' }}>
                        {area.name}
                    </h3>
                    <div style={{ display: 'grid', gap: '6px' }}>
                        <div style={{ backgroundColor: '#f3f4f6', padding: '6px', borderRadius: '4px' }}>
                            <div style={{ fontWeight: '600', marginBottom: '4px', color: '#4b5563' }}>Contaminantes</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>PM2.5:</span>
                                <span>{pollutants.pm25.toFixed(2)} µg/m³</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>PM10:</span>
                                <span>{pollutants.pm10.toFixed(2)} µg/m³</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>NO₂:</span>
                                <span>{pollutants.no2.toFixed(2)} µg/m³</span>
                            </div>
                        </div>
                        
                        <div style={{ backgroundColor: '#dbeafe', padding: '6px', borderRadius: '4px' }}>
                            <div style={{ fontWeight: '600', marginBottom: '4px', color: '#1e40af' }}>Tráfico</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Congestión:</span>
                                <span>{traffic.congestion_level.toFixed(1)}%</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Datos reales:</span>
                                <span>{traffic.has_real_data ? 'Sí' : 'No'}</span>
                            </div>
                        </div>
                        
                        <div style={{ backgroundColor: '#dcfce7', padding: '6px', borderRadius: '4px' }}>
                            <div style={{ fontWeight: '600', marginBottom: '4px', color: '#166534' }}>Factores</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>OSM:</span>
                                <span>{factors.osm_factor}x</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Tráfico:</span>
                                <span>{factors.traffic_factor}x</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Combinado:</span>
                                <span>{factors.combined_factor}x</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Popup>
        </Rectangle>
    );
};

const AirQualityDashboard = () => {
    const [airQualityData, setAirQualityData] = useState(null);
    const [error, setError] = useState(null);
    const [dataSource, setDataSource] = useState('loading');
    const [weatherData, setWeatherData] = useState(null);
    const [zoneData, setZoneData] = useState(null);
    const [showTrafficImpact, setShowTrafficImpact] = useState(true);
    const [dataSourceInfo, setDataSourceInfo] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    useEffect(() => {
        const fetchZoneData = async () => {
            try {
                console.log('Obteniendo datos por zona...');
                const response = await fetch('/api/air-quality/by-zone');
                if (response.ok) {
                    const data = await response.json();
                    console.log('Datos por zona obtenidos:', data);
                    setZoneData(data);
                }
            } catch (error) {
                console.error('Error fetching zone data:', error);
            }
        };

        fetchZoneData();
        const interval = setInterval(fetchZoneData, 300000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/air-quality');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                
                const now = new Date();
                const filteredData = data.filter(item => {
                    const itemDate = new Date(item.timestamp);
                    return itemDate <= now;
                });
                
                filteredData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                const last12Hours = filteredData.slice(-12);
                
                const isRealData = data && data.length > 0 && data[0].source !== 'fallback';
                const hasRealDataFlag = data && data.length > 0 && data[0].is_real_data === true;
                
                setAirQualityData(last12Hours);
                setDataSource(isRealData || hasRealDataFlag ? 'real' : 'fallback');
                setLastUpdate(new Date());
                
                try {
                    const statusResponse = await fetch('/api/collector-status');
                    if (statusResponse.ok) {
                        const statusData = await statusResponse.json();
                        setDataSourceInfo(statusData);
                    }
                } catch (statusErr) {
                    console.error('Error fetching collector status:', statusErr);
                }
            } catch (err) {
                console.error('Error fetching data:', err);
                setError(err.message);
                setDataSource('error');
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 300000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchWeatherData = async () => {
            try {
                const response = await fetch('/api/weather');
                if (response.ok) {
                    const data = await response.json();
                    setWeatherData(data);
                }
            } catch (error) {
                console.error('Error fetching weather data:', error);
            }
        };

        fetchWeatherData();
        const interval = setInterval(fetchWeatherData, 300000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-4 w-full">
            <div className={`p-4 mb-4 rounded-lg border ${
                dataSource === 'real'
                ? 'bg-green-50 border-green-300 text-green-800'
                : dataSource === 'fallback'
                    ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
                    : 'bg-gray-50 border-gray-300 text-gray-800'
            }`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {dataSource === 'real' ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        ) : dataSource === 'fallback' ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 animate-spin" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                            </svg>
                        )}
                        <div>
                            <div className="font-semibold">
                                {dataSource === 'real'
                                    ? 'Datos en Tiempo Real'
                                    : dataSource === 'fallback'
                                    ? 'Datos Simulados - API No Disponible'
                                    : 'Conectando con fuente de datos...'
                                }
                            </div>
                            {dataSource === 'fallback' && (
                                <div className="text-sm mt-1">
                                    Los datos mostrados son estimaciones basadas en patrones típicos de contaminación.
                                </div>
                            )}
                        </div>
                    </div>
                    {lastUpdate && (
                        <div className="text-sm">
                            Última actualización: {lastUpdate.toLocaleTimeString()}
                        </div>
                    )}
                </div>
            </div>

            {zoneData && zoneData.metadata && zoneData.metadata.has_traffic_data && (
                <div className="p-2 mb-4 rounded bg-blue-100 text-blue-800">
                    <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Usando datos de tráfico y OSM en tiempo real para cálculos precisos por zona</span>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 w-full">
                <div className="bg-white rounded-lg shadow-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Mapa de Calidad del Aire</h2>
                        <span className="text-sm text-gray-500">Área: Xalapa, Veracruz</span>
                    </div>
                    <div className="relative">
                        <div style={{ height: '600px', borderRadius: '0.5rem' }}>
                            <MapContainer
                                center={[19.5438, -96.9102]}
                                zoom={11}
                                minZoom={11}
                                maxZoom={14}
                                maxBounds={[
                                    [19.3800, -97.1500],
                                    [19.7000, -96.6500]
                                ]}
                                maxBoundsViscosity={1.0}
                                scrollWheelZoom={true}
                                zoomControl={true}
                                attributionControl={true}
                                style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                />
                                <MapBoundsHandler />
                                {showTrafficImpact && zoneData && XALAPA_MAIN_AREAS.map((area, index) => (
                                    <QuadrantRectangle
                                        key={index}
                                        area={area}
                                        zoneData={zoneData}
                                    />
                                ))}
                            </MapContainer>
                        </div>

                        <div className="absolute top-4 right-4 z-[1000]">
                            <button
                                onClick={() => setShowTrafficImpact(!showTrafficImpact)}
                                className="bg-white px-4 py-2 rounded shadow hover:bg-gray-100 transition-colors"
                            >
                                {showTrafficImpact ? 'Ocultar Cuadrantes' : 'Ver Cuadrantes'}
                            </button>
                        </div>

                        <div className="absolute bottom-4 left-4 z-[1000]">
                            <MapLegend />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-4">
                    <h2 className="text-xl font-bold mb-4">Niveles de Contaminantes</h2>
                    {error ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-red-600">Error: {error}</p>
                        </div>
                    ) : !airQualityData ? (
                        <div className="flex items-center justify-center h-64">
                            <p className="text-gray-500">Cargando datos...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-3">
                                <div className="w-full overflow-x-auto">
                                    <LineChart width={700} height={350} data={airQualityData}>
                                    <XAxis
                                        dataKey="timestamp"
                                        tickFormatter={(timestamp) => {
                                            const date = new Date(timestamp);
                                            return date.toLocaleTimeString('es-MX', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true
                                            });
                                        }}
                                    />
                                    <YAxis />
                                    <Tooltip
                                        formatter={(value, name, {dataKey}) => {
                                            const pollutant = POLLUTANT_INFO[dataKey];
                                            return [pollutant.format(value), pollutant.name];
                                        }}
                                        labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                                    />
                                    <Legend />
                                    {Object.entries(POLLUTANT_INFO).map(([key, info]) => (
                                        <Line
                                            key={key}
                                            type="monotone"
                                            dataKey={key}
                                            name={info.name}
                                            stroke={
                                                key === 'pm25' ? '#8b5cf6' :
                                                key === 'pm10' ? '#3b82f6' :
                                                key === 'no2' ? '#ffc658' :
                                                key === 'o3' ? '#ff7300' :
                                                '#ff0000'
                                            }
                                            dot={false}
                                        />
                                    ))}
                                </LineChart>
                                    </div>
                            </div>

                            <div className="mt-4 md:col-span-3">
                                <h2 className="text-xl font-bold mb-4">Estadísticas Actuales</h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                    {Object.entries(POLLUTANT_INFO).map(([key, info]) => {
                                        const currentValue = airQualityData[airQualityData.length - 1][key];
                                        return (
                                            <div key={key} className="bg-gray-50 p-3 rounded-lg hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-center">
                                                    <h3 className="text-md font-semibold">
                                                        {info.name} ({info.unit})
                                                    </h3>
                                                    <span
                                                        className="px-2 py-1 rounded text-sm text-white"
                                                        style={{ backgroundColor: getPollutantColor(key, currentValue) }}
                                                    >
                                                        {getPollutantLevel(key, currentValue)}
                                                    </span>
                                                </div>
                                                <p className="text-xl mt-1">
                                                    {info.format(currentValue)}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4">
                <WeatherConditions weatherData={weatherData} />
            </div>
        </div>
    );
};

export { generateReport };
export default AirQualityDashboard;
