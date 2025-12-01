/**
 * Generador de Reportes PDF - Calidad del Aire
 * Fase 4 - Refactorización: Utilidad centralizada
 */

import html2pdf from 'html2pdf.js';
import { getPollutantLevel } from './constants';

/**
 * Formatea la fecha en formato DD/MM/YYYY
 */
const formatDate = (date = new Date()) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

/**
 * Formatea la fecha y hora en formato DD/MM/YYYY, HH:MM a.m./p.m.
 */
const formatDateTime = (date = new Date()) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    return `${day}/${month}/${year}, ${hours}:${minutes} ${ampm}`;
};

/**
 * Formatea la fecha para nombre de archivo (DD-MM-YYYY)
 */
const formatDateForFilename = (date = new Date()) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
};

/**
 * Obtiene la conclusión basada en el nivel de PM2.5
 */
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

/**
 * Genera el contenido HTML del reporte
 */
const generateReportHTML = (airQualityData, weatherData, zoneData) => {
    const latestData = airQualityData[airQualityData.length - 1];
    const currentDate = formatDate();
    const currentDateTime = formatDateTime();

    // Procesar zonas si existen
    const zonesForReport = zoneData?.zones?.map(zone => ({
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
    })) || [];

    return `
        <div style="padding: 20px; font-family: Arial, sans-serif; max-width: 100%; box-sizing: border-box;">
            <h1 style="color: #1a365d; border-bottom: 3px solid #2563eb; padding-bottom: 10px; margin-top: 0;">
                🌍 Reporte de Calidad del Aire - Xalapa
            </h1>
            <p style="margin: 5px 0;"><strong>Fecha:</strong> ${currentDate}</p>
            <p style="margin: 5px 0;"><strong>Ubicación:</strong> Xalapa, Veracruz, México</p>
            
            <h2 style="color: #2c5282; margin-top: 25px; margin-bottom: 15px;">📊 Niveles de Contaminación Actuales</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr style="background-color: #f7fafc;">
                    <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Contaminante</th>
                    <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">Valor</th>
                    <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">Estado</th>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">PM2.5 (Partículas finas)</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${latestData?.pm25?.toFixed(2)} μg/m³</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${getPollutantLevel('pm25', latestData?.pm25)}</td>
                </tr>
                <tr style="background-color: #f9fafb;">
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">PM10 (Partículas gruesas)</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${latestData?.pm10?.toFixed(2)} μg/m³</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${getPollutantLevel('pm10', latestData?.pm10)}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">NO₂ (Dióxido de nitrógeno)</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${latestData?.no2?.toFixed(2)} μg/m³</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${getPollutantLevel('no2', latestData?.no2)}</td>
                </tr>
                <tr style="background-color: #f9fafb;">
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">O₃ (Ozono)</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${latestData?.o3?.toFixed(2)} μg/m³</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${getPollutantLevel('o3', latestData?.o3)}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">CO (Monóxido de carbono)</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${latestData?.co?.toFixed(3)} mg/m³</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${getPollutantLevel('co', latestData?.co)}</td>
                </tr>
            </table>

            ${zonesForReport.length > 0 ? `
            <h2 style="color: #2c5282; margin-top: 25px; margin-bottom: 10px;">🗺️ Contaminación por Zonas</h2>
            <p style="margin-bottom: 10px; color: #6b7280; font-size: 12px; font-style: italic;">
                Los valores por zona están ajustados según factores de infraestructura vial y tráfico en tiempo real.
            </p>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
                <tr style="background-color: #f7fafc;">
                    <th style="padding: 8px; border: 1px solid #e2e8f0;">Zona</th>
                    <th style="padding: 8px; border: 1px solid #e2e8f0;">Congestión</th>
                    <th style="padding: 8px; border: 1px solid #e2e8f0;">PM2.5</th>
                    <th style="padding: 8px; border: 1px solid #e2e8f0;">PM10</th>
                    <th style="padding: 8px; border: 1px solid #e2e8f0;">NO₂</th>
                    <th style="padding: 8px; border: 1px solid #e2e8f0;">Estado</th>
                </tr>
                ${zonesForReport.map((zone, idx) => `
                    <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                        <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: bold;">${zone.name}</td>
                        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center;">${zone.congestionLevel}%</td>
                        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center;">${zone.pm25} μg/m³</td>
                        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center;">${zone.pm10} μg/m³</td>
                        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center;">${zone.no2} μg/m³</td>
                        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center;">${zone.status}</td>
                    </tr>
                `).join('')}
            </table>
            ` : ''}

            <!-- Condiciones Meteorológicas -->
            <h2 style="color: #2c5282; margin-top: 25px; margin-bottom: 15px;">🌤️ Condiciones Meteorológicas</h2>
            <table style="width: 50%; border-collapse: collapse; margin-bottom: 25px;">
                <tr>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">🌡️ Temperatura</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; text-align: right;">${weatherData.temperature}°C</td>
                </tr>
                <tr style="background-color: #f9fafb;">
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">💧 Humedad</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; text-align: right;">${weatherData.humidity}%</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">💨 Velocidad del Viento</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; text-align: right;">${weatherData.wind_speed} km/h</td>
                </tr>
                <tr style="background-color: #f9fafb;">
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">☁️ Nubosidad</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; text-align: right;">${weatherData.cloud_cover}%</td>
                </tr>
            </table>

            <!-- Conclusión AL FINAL - Con page-break-inside: avoid -->
            <div style="page-break-inside: avoid;">
                <h2 style="color: #2c5282; margin-top: 25px; margin-bottom: 15px;">📝 Conclusión</h2>
                <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; margin-bottom: 15px;">
                    <p style="margin: 0 0 10px 0; line-height: 1.6;">
                        Según los niveles establecidos por organizaciones ambientales, la calidad del aire en Xalapa 
                        se encuentra actualmente en un nivel <strong>${getPollutantLevel('pm25', latestData?.pm25)}</strong>.
                    </p>
                    <p style="margin: 0; line-height: 1.6;">
                        ${getAirQualityConclusion(latestData?.pm25)}
                    </p>
                </div>
                
                ${zonesForReport.length > 0 ? `
                <div style="background-color: #fef3c7; padding: 12px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
                    <p style="margin: 0; font-size: 11px; line-height: 1.5;">
                        <strong>📌 Nota sobre variación por zonas:</strong> Los datos por zona reflejan las características 
                        únicas de infraestructura vial y tráfico en tiempo real de cada área de Xalapa. Las zonas con 
                        mayor densidad vial y congestión presentan niveles más elevados de contaminantes.
                    </p>
                </div>
                ` : ''}

                <div style="margin-top: 30px; padding-top: 15px; border-top: 2px solid #e2e8f0; color: #6b7280; font-size: 11px;">
                    <p style="margin: 5px 0;">Generado por el Sistema de Monitoreo de Calidad del Aire - Xalapa</p>
                    <p style="margin: 5px 0;">Fecha de generación: ${currentDateTime}</p>
                </div>
            </div>
        </div>
    `;
};

/**
 * Genera y descarga el reporte PDF
 */
export const generateReport = (airQualityData, weatherData, zoneData) => {
    if (!airQualityData || !weatherData) {
        console.error('No hay datos disponibles para generar el reporte');
        return false;
    }

    const dateForFilename = formatDateForFilename();

    const opt = {
        margin: [10, 10, 15, 10],
        filename: `reporte-calidad-aire-xalapa-${dateForFilename}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2,
            useCORS: true,
            letterRendering: true,
            logging: false
        },
        jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait',
            putOnlyUsedFonts: true,
            floatPrecision: 16
        },
        pagebreak: { 
            mode: ['avoid-all', 'css', 'legacy'],
            avoid: ['div', 'h2']
        }
    };

    const reportContent = generateReportHTML(airQualityData, weatherData, zoneData);

    const element = document.createElement('div');
    element.innerHTML = reportContent;
    
    html2pdf().set(opt).from(element).save();
    
    return true;
};

export default generateReport;
