import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MapContainer, TileLayer, Rectangle, Popup } from 'react-leaflet';
import { Calendar, Download, TrendingUp, AlertCircle, Map, Database } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const HistoricalDataDashboard = () => {
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [timeScale, setTimeScale] = useState('daily'); // hourly, daily, monthly
    const [selectedPollutants, setSelectedPollutants] = useState(['pm25', 'pm10', 'no2']);
    const [historicalData, setHistoricalData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [statistics, setStatistics] = useState(null);
    const [zoneStatistics, setZoneStatistics] = useState(null);
    const [osmAnalysis, setOsmAnalysis] = useState(null);
    const [loadingOSM, setLoadingOSM] = useState(false);
    const [showMap, setShowMap] = useState(true);

    const pollutantInfo = {
        pm25: { name: 'PM2.5', color: '#8b5cf6', unit: 'μg/m³' },
        pm10: { name: 'PM10', color: '#3b82f6', unit: 'μg/m³' },
        no2: { name: 'NO₂', color: '#f59e0b', unit: 'μg/m³' },
        o3: { name: 'O₃', color: '#10b981', unit: 'μg/m³' },
        co: { name: 'CO', color: '#ef4444', unit: 'mg/m³' }
    };

    // Definir las zonas de Xalapa
    const XALAPA_ZONES = [
        {
            name: 'Centro',
            bounds: [[19.5200, -96.9250], [19.5500, -96.8900]]
        },
        {
            name: 'Norte',
            bounds: [[19.5500, -96.9750], [19.5900, -96.8550]]
        },
        {
            name: 'Sur',
            bounds: [[19.4900, -96.9750], [19.5200, -96.8550]]
        },
        {
            name: 'Este',
            bounds: [[19.4900, -96.8900], [19.5900, -96.7900]]
        },
        {
            name: 'Oeste',
            bounds: [[19.4900, -97.0200], [19.5900, -96.9250]]
        }
    ];

    // Función para obtener análisis de OSM
    const fetchOSMAnalysis = async () => {
        setLoadingOSM(true);
        try {
            const response = await fetch('/api/zones/osm-analysis');
            if (response.ok) {
                const data = await response.json();
                setOsmAnalysis(data);
            }
        } catch (err) {
            console.error('Error obteniendo análisis OSM:', err);
        } finally {
            setLoadingOSM(false);
        }
    };

    // Función para obtener datos históricos
    const fetchHistoricalData = async () => {
        setLoading(true);
        setError(null);
        
        // Validar rango de fechas
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 365) {
            setError('El rango máximo permitido es de 1 año (365 días). Por favor ajusta las fechas.');
            setLoading(false);
            return;
        }
        
        if (end < start) {
            setError('La fecha de fin debe ser posterior a la fecha de inicio.');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(
                `/api/air-quality/historical?start=${dateRange.start}&end=${dateRange.end}&scale=${timeScale}`
            );

            if (!response.ok) {
                const errorData = await response.json();
                if (errorData.detail && typeof errorData.detail === 'string') {
                    throw new Error(errorData.detail);
                } else {
                    throw new Error('Error al obtener datos históricos. Por favor verifica que el rango de fechas no exceda 1 año.');
                }
            }

            const data = await response.json();
            
            // Si la respuesta contiene un error, mostrarlo
            if (data.detail) {
                throw new Error(data.detail);
            }
            
            setHistoricalData(data.data || []);
            setStatistics(data.statistics || null);
            
            // Calcular estadísticas por zona con datos OSM
            if (osmAnalysis && data.statistics) {
                calculateZoneStatistics(data.data, data.statistics);
            }
        } catch (err) {
            setError(err.message);
            setHistoricalData([]);
            setStatistics(null);
        } finally {
            setLoading(false);
        }
    };

    // Calcular estadísticas por zona basadas en datos OSM
    const calculateZoneStatistics = (data, globalStats) => {
        if (!data || !globalStats) return;

        // Validar que globalStats tenga los datos necesarios
        const requiredPollutants = ['pm25', 'pm10', 'no2', 'o3', 'co'];
        const hasAllStats = requiredPollutants.every(p => 
            globalStats[p] && 
            typeof globalStats[p].avg !== 'undefined' &&
            typeof globalStats[p].max !== 'undefined' &&
            typeof globalStats[p].min !== 'undefined'
        );

        if (!hasAllStats) {
            console.warn('Estadísticas globales incompletas, no se pueden calcular estadísticas por zona');
            return;
        }

        const zoneStats = {};
        
        XALAPA_ZONES.forEach(zone => {
            // Buscar factor de OSM o usar valor por defecto
            let pollutionFactor = 1.0;
            
            if (osmAnalysis && osmAnalysis.zones) {
                const osmZone = osmAnalysis.zones.find(z => z.zone_name === zone.name);
                if (osmZone && osmZone.pollution_factor) {
                    pollutionFactor = osmZone.pollution_factor;
                }
            }
            
            // Aplicar factores de forma más suave y diferenciada por contaminante
            // Los factores ahora están entre 0.8 y 1.5, así que el ajuste es más sutil
            
            // Función auxiliar para aplicar factor de forma suave
            const applyFactor = (value, factor, sensitivity = 1.0) => {
                if (typeof value !== 'number' || isNaN(value)) return 0;
                // Calcular desviación del factor respecto a 1.0
                const deviation = (factor - 1.0) * sensitivity;
                // Aplicar desviación de forma suave
                return value * (1.0 + deviation);
            };
            
            zoneStats[zone.name] = {
                pm25: {
                    // PM2.5 es muy sensible al tráfico (sensibilidad 1.0)
                    avg: applyFactor(globalStats.pm25?.avg || 0, pollutionFactor, 1.0),
                    max: applyFactor(globalStats.pm25?.max || 0, pollutionFactor, 0.8),
                    min: applyFactor(globalStats.pm25?.min || 0, pollutionFactor, 0.5)
                },
                pm10: {
                    // PM10 también sensible pero menos que PM2.5 (sensibilidad 0.9)
                    avg: applyFactor(globalStats.pm10?.avg || 0, pollutionFactor, 0.9),
                    max: applyFactor(globalStats.pm10?.max || 0, pollutionFactor, 0.7),
                    min: applyFactor(globalStats.pm10?.min || 0, pollutionFactor, 0.4)
                },
                no2: {
                    // NO2 muy afectado por tráfico vehicular (sensibilidad 1.2)
                    avg: applyFactor(globalStats.no2?.avg || 0, pollutionFactor, 1.2),
                    max: applyFactor(globalStats.no2?.max || 0, pollutionFactor, 1.0),
                    min: applyFactor(globalStats.no2?.min || 0, pollutionFactor, 0.6)
                },
                o3: {
                    // O3 inversamente relacionado con tráfico (más tráfico = menos O3)
                    // Usar factor inverso
                    avg: applyFactor(globalStats.o3?.avg || 0, 2.0 - pollutionFactor, 0.8),
                    max: applyFactor(globalStats.o3?.max || 0, 2.0 - pollutionFactor, 0.6),
                    min: applyFactor(globalStats.o3?.min || 0, 2.0 - pollutionFactor, 0.4)
                },
                co: {
                    // CO moderadamente afectado por tráfico (sensibilidad 0.8)
                    avg: applyFactor(globalStats.co?.avg || 0, pollutionFactor, 0.8),
                    max: applyFactor(globalStats.co?.max || 0, pollutionFactor, 0.6),
                    min: applyFactor(globalStats.co?.min || 0, pollutionFactor, 0.4)
                },
                pollutionFactor: pollutionFactor
            };
        });

        setZoneStatistics(zoneStats);
    };

    useEffect(() => {
        fetchHistoricalData();
        fetchOSMAnalysis();
    }, [dateRange, timeScale]);
    
    // Recalcular estadísticas cuando se obtengan datos de OSM
    useEffect(() => {
        if (statistics && osmAnalysis && historicalData) {
            calculateZoneStatistics(historicalData, statistics);
        }
    }, [osmAnalysis, statistics, historicalData]);

    // Función para exportar datos
    const exportData = (format) => {
        if (!historicalData || historicalData.length === 0) return;

        let content = '';
        let filename = `calidad_aire_${dateRange.start}_${dateRange.end}`;

        if (format === 'csv') {
            // Crear CSV
            const headers = ['Fecha', ...selectedPollutants.map(p => pollutantInfo[p].name)];
            content = headers.join(',') + '\n';
            
            historicalData.forEach(row => {
                const values = [row.timestamp, ...selectedPollutants.map(p => row[p])];
                content += values.join(',') + '\n';
            });
            
            filename += '.csv';
        } else if (format === 'json') {
            content = JSON.stringify(historicalData, null, 2);
            filename += '.json';
        }

        // Descargar archivo
        const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Calcular tendencia
    const calculateTrend = (data, pollutant) => {
        if (!data || data.length < 2) return { trend: 'stable', percentage: 0 };
        
        const firstValue = data[0][pollutant];
        const lastValue = data[data.length - 1][pollutant];
        
        if (!firstValue || firstValue === 0) return { trend: 'stable', percentage: 0 };
        
        const percentage = ((lastValue - firstValue) / firstValue) * 100;
        
        if (Math.abs(percentage) < 5) return { trend: 'stable', percentage };
        return { trend: percentage > 0 ? 'increasing' : 'decreasing', percentage };
    };

    // Función para obtener color según nivel de contaminación
    const getPollutantColor = (value, pollutant) => {
        const thresholds = {
            pm25: { good: 12, moderate: 35.4, unhealthy: 55.4 },
            pm10: { good: 54, moderate: 154, unhealthy: 254 },
            no2: { good: 53, moderate: 100, unhealthy: 360 },
            o3: { good: 50, moderate: 100, unhealthy: 150 },
            co: { good: 4.4, moderate: 9.4, unhealthy: 12.4 }
        };

        const t = thresholds[pollutant];
        if (!t) return '#808080';
        if (value <= t.good) return '#00E400';
        if (value <= t.moderate) return '#FFFF00';
        if (value <= t.unhealthy) return '#FF7E00';
        return '#FF0000';
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold mb-4">Datos Históricos de Calidad del Aire</h2>
                
                {/* Controles de fecha y escala */}
                <div className="mb-2">
                    <p className="text-sm text-gray-600">
                        <span className="font-semibold">Nota:</span> El rango máximo permitido es de 1 año (365 días)
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha Inicio
                        </label>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha Fin
                        </label>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Escala de Tiempo
                        </label>
                        <select
                            value={timeScale}
                            onChange={(e) => setTimeScale(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="hourly">Por Hora</option>
                            <option value="daily">Por Día</option>
                            <option value="monthly">Por Mes</option>
                        </select>
                    </div>
                </div>

                {/* Selector de contaminantes */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contaminantes a mostrar:
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(pollutantInfo).map(([key, info]) => (
                            <label key={key} className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={selectedPollutants.includes(key)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedPollutants([...selectedPollutants, key]);
                                        } else {
                                            setSelectedPollutants(selectedPollutants.filter(p => p !== key));
                                        }
                                    }}
                                    className="mr-2"
                                />
                                <span className="px-3 py-1 rounded-lg text-sm"
                                      style={{ backgroundColor: `${info.color}20`, color: info.color }}>
                                    {info.name}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="flex gap-2">
                    <button
                        onClick={() => fetchHistoricalData()}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Cargando...' : 'Actualizar Datos'}
                    </button>
                    
                    <button
                        onClick={() => setShowMap(!showMap)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                    >
                        <Map size={16} />
                        {showMap ? 'Ocultar Mapa' : 'Mostrar Mapa'}
                    </button>
                    
                    <button
                        onClick={() => exportData('csv')}
                        disabled={!historicalData || historicalData.length === 0 || loading}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        <Download size={16} />
                        Exportar CSV
                    </button>
                    
                    <button
                        onClick={() => exportData('json')}
                        disabled={!historicalData || historicalData.length === 0 || loading}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        <Download size={16} />
                        Exportar JSON
                    </button>
                </div>
            </div>

            {/* Mensajes de error */}
            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {/* Estadísticas */}
            {statistics && (
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {selectedPollutants.map(pollutant => {
                        const stats = statistics[pollutant];
                        if (!stats || typeof stats.avg === 'undefined') return null;
                        
                        const info = pollutantInfo[pollutant];
                        const trend = calculateTrend(historicalData, pollutant);
                        
                        return (
                            <div key={pollutant} className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-semibold text-gray-700 mb-2">{info.name}</h4>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span>Promedio:</span>
                                        <span className="font-medium">{stats.avg.toFixed(2)} {info.unit}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Máximo:</span>
                                        <span className="font-medium">{stats.max.toFixed(2)} {info.unit}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Mínimo:</span>
                                        <span className="font-medium">{stats.min.toFixed(2)} {info.unit}</span>
                                    </div>
                                    <div className="flex items-center gap-1 mt-2">
                                        <TrendingUp 
                                            size={16} 
                                            className={trend.trend === 'decreasing' ? 'rotate-180' : ''}
                                            style={{ color: trend.trend === 'stable' ? '#6b7280' : 
                                                    trend.trend === 'increasing' ? '#ef4444' : '#10b981' }}
                                        />
                                        <span className="text-xs">
                                            {Math.abs(trend.percentage).toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Gráfica principal */}
            {historicalData && historicalData.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">Evolución Temporal</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={historicalData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                                dataKey="timestamp" 
                                tickFormatter={(value) => {
                                    const date = new Date(value);
                                    if (timeScale === 'hourly') {
                                        return date.toLocaleString('es-MX', { 
                                            day: '2-digit', 
                                            hour: '2-digit' 
                                        });
                                    } else if (timeScale === 'daily') {
                                        return date.toLocaleDateString('es-MX', { 
                                            month: 'short', 
                                            day: '2-digit' 
                                        });
                                    } else {
                                        return date.toLocaleDateString('es-MX', { 
                                            year: 'numeric', 
                                            month: 'short' 
                                        });
                                    }
                                }}
                            />
                            <YAxis />
                            <Tooltip 
                                labelFormatter={(value) => new Date(value).toLocaleString('es-MX')}
                                formatter={(value, name) => {
                                    const unit = Object.values(pollutantInfo).find(p => p.name === name)?.unit || '';
                                    return [`${value.toFixed(2)} ${unit}`, name];
                                }}
                            />
                            <Legend />
                            {selectedPollutants.map(pollutant => (
                                <Line
                                    key={pollutant}
                                    type="monotone"
                                    dataKey={pollutant}
                                    name={pollutantInfo[pollutant].name}
                                    stroke={pollutantInfo[pollutant].color}
                                    strokeWidth={2}
                                    dot={false}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Mapa de zonas con contaminación histórica */}
            {showMap && zoneStatistics && (
                <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">
                        Distribución Histórica por Zonas
                        {osmAnalysis && (
                            <span className="text-sm font-normal text-gray-600 ml-2">
                                <Database size={14} className="inline mr-1" />
                                Basado en datos reales de OpenStreetMap
                            </span>
                        )}
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Mapa */}
                        <div className="h-[400px] rounded-lg overflow-hidden">
                            <MapContainer
                                center={[19.5438, -96.9102]}
                                zoom={11}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                />
                                {XALAPA_ZONES.map((zone, index) => {
                                    const zoneStats = zoneStatistics[zone.name];
                                    if (!zoneStats || !zoneStats.pm25) return null;
                                    
                                    // Usar PM2.5 como indicador principal
                                    const pm25Avg = zoneStats.pm25.avg;
                                    const color = getPollutantColor(pm25Avg, 'pm25');
                                    
                                    // Obtener métricas OSM si están disponibles
                                    const osmZone = osmAnalysis?.zones?.find(z => z.zone_name === zone.name);
                                    
                                    return (
                                        <Rectangle
                                            key={index}
                                            bounds={zone.bounds}
                                            pathOptions={{
                                                color: '#FFFFFF',
                                                weight: 2,
                                                fillColor: color,
                                                fillOpacity: 0.5
                                            }}
                                        >
                                            <Popup>
                                                <div className="p-2">
                                                    <h4 className="font-bold text-lg mb-2">{zone.name}</h4>
                                                    <div className="space-y-2">
                                                        <div className="bg-gray-50 p-2 rounded">
                                                            <div className="text-sm font-semibold mb-1">Contaminantes</div>
                                                            <div className="space-y-1 text-sm">
                                                                <div className="flex justify-between">
                                                                    <span>PM2.5:</span>
                                                                    <span>{pm25Avg.toFixed(1)} μg/m³</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span>PM10:</span>
                                                                    <span>{zoneStats.pm10.avg.toFixed(1)} μg/m³</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span>NO₂:</span>
                                                                    <span>{zoneStats.no2.avg.toFixed(1)} μg/m³</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        {osmZone && osmZone.metrics && !osmZone.metrics.error && (
                                                            <div className="bg-blue-50 p-2 rounded">
                                                                <div className="text-sm font-semibold mb-1">Infraestructura (OSM)</div>
                                                                <div className="space-y-1 text-xs">
                                                                    <div className="flex justify-between">
                                                                        <span>Vías principales:</span>
                                                                        <span>{osmZone.metrics.main_roads_count}</span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span>Densidad vial:</span>
                                                                        <span>{osmZone.metrics.road_density_km_per_km2} km/km²</span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span>Factor calculado:</span>
                                                                        <span>{osmZone.pollution_factor}x</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Rectangle>
                                    );
                                })}
                            </MapContainer>
                        </div>

                        {/* Tabla de ranking de zonas con métricas OSM */}
                        <div>
                            <h4 className="font-semibold mb-3">Ranking de Contaminación por Zona</h4>
                            {loadingOSM && (
                                <div className="text-center py-4">
                                    <p className="text-gray-600">Cargando datos de infraestructura...</p>
                                </div>
                            )}
                            <div className="space-y-2">
                                {XALAPA_ZONES
                                    .filter(zone => {
                                        const stats = zoneStatistics[zone.name];
                                        return stats && stats.pm25 && typeof stats.pm25.avg === 'number';
                                    })
                                    .sort((a, b) => {
                                        const aStats = zoneStatistics[a.name];
                                        const bStats = zoneStatistics[b.name];
                                        return bStats.pm25.avg - aStats.pm25.avg;
                                    })
                                    .map((zone, index) => {
                                        const stats = zoneStatistics[zone.name];
                                        const osmZone = osmAnalysis?.zones?.find(z => z.zone_name === zone.name);
                                        
                                        return (
                                            <div key={zone.name} className="bg-gray-50 rounded-lg p-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold">
                                                            {index + 1}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold">{zone.name}</div>
                                                            {osmZone && osmZone.metrics && !osmZone.metrics.error ? (
                                                                <div className="text-xs text-gray-600">
                                                                    <span className="text-green-600 font-medium">
                                                                        <Database size={10} className="inline mr-1" />
                                                                        Datos reales OSM
                                                                    </span>
                                                                    - Factor: {osmZone.pollution_factor}x
                                                                </div>
                                                            ) : (
                                                                <div className="text-xs text-gray-600">
                                                                    Factor estimado: {stats.pollutionFactor.toFixed(2)}x
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-semibold">
                                                            {stats.pm25.avg.toFixed(1)} μg/m³
                                                        </div>
                                                        <div className="text-xs text-gray-600">
                                                            PM2.5 promedio
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {osmZone && osmZone.metrics && !osmZone.metrics.error && (
                                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                                            <div>
                                                                <span className="text-gray-500">Vías:</span>
                                                                <span className="font-medium ml-1">
                                                                    {osmZone.metrics.total_road_length_km} km
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500">POIs:</span>
                                                                <span className="font-medium ml-1">
                                                                    {osmZone.metrics.total_pois}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500">Área:</span>
                                                                <span className="font-medium ml-1">
                                                                    {osmZone.metrics.zone_area_km2} km²
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                            
                            {/* Explicación de factores OSM */}
                            {osmAnalysis && osmAnalysis.zones && (
                                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                                    <h5 className="font-semibold text-green-900 text-sm mb-2">
                                        <Database size={14} className="inline mr-1" />
                                        Factores basados en OpenStreetMap
                                    </h5>
                                    <ul className="text-xs text-green-800 space-y-1">
                                        <li>• Densidad vial ponderada (40% del factor)</li>
                                        <li>• Cantidad de vías principales (25%)</li>
                                        <li>• Zonas comerciales e industriales (25%)</li>
                                        <li>• Puntos de interés con alto tráfico (10%)</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Información sobre los datos */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Información sobre los datos</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Los datos históricos provienen de Open Meteo y la base de datos local</li>
                    <li>• La distribución por zonas ahora usa datos reales de infraestructura vial de OpenStreetMap</li>
                    <li>• Los factores de contaminación se calculan basándose en densidad vial, tipos de vías y uso de suelo</li>
                    <li>• Esta metodología proporciona estimaciones más precisas y basadas en evidencia</li>
                </ul>
            </div>
        </div>
    );
};

export default HistoricalDataDashboard;
