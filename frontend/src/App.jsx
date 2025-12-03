import React, { useState, useEffect, useCallback } from "react";
import AirQualityDashboard, { generateReport } from "./components/AirQualityDashboard.jsx";
import AlertsAndPredictions from "./components/AlertsAndPredictions.jsx";
import HistoricalDataDashboard from "./components/HistoricalDataDashboard.jsx";
import logoRevive from "./assets/logo_revive.png";

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [airQualityData, setAirQualityData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [zoneData, setZoneData] = useState(null);
  
  // 🆕 MEJORA: Estado para controlar generación del reporte
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  // Rastrear qué vistas han sido visitadas (para lazy mounting)
  const [visitedViews, setVisitedViews] = useState({ dashboard: true });

  // Efecto para cargar datos necesarios para el reporte
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch air quality data
        const airResponse = await fetch('/api/air-quality');
        if (airResponse.ok) {
          const airData = await airResponse.json();
          const now = new Date();
          const filteredData = airData.filter(item => {
            const itemDate = new Date(item.timestamp);
            return itemDate <= now;
          });
          setAirQualityData(filteredData);
        }

        // Fetch weather data
        const weatherResponse = await fetch('/api/weather');
        if (weatherResponse.ok) {
          const weatherData = await weatherResponse.json();
          setWeatherData(weatherData);
        }
        
        // Fetch zone data
        const zoneResponse = await fetch('/api/air-quality/by-zone');
        if (zoneResponse.ok) {
          const data = await zoneResponse.json();
          console.log('Zone data loaded for report:', data);
          setZoneData(data);
        }
      } catch (error) {
        console.error('Error fetching data for report:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 300000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, []);

  // Marcar vista como visitada cuando cambia
  useEffect(() => {
    if (!visitedViews[activeView]) {
      setVisitedViews(prev => ({ ...prev, [activeView]: true }));
    }
  }, [activeView, visitedViews]);

  // Cambiar de vista con efecto de trigger para resize
  const changeView = useCallback((view) => {
    setActiveView(view);
    // Disparar resize después de cambiar de vista para que los mapas se actualicen
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 500);
  }, []);

  // 🆕 MEJORA: Handler mejorado con estado de loading
  const handleGenerateReport = async () => {
    if (!airQualityData || !weatherData) {
      alert('No hay datos disponibles para generar el reporte');
      return;
    }
    
    if (!zoneData || !zoneData.zones || zoneData.zones.length === 0) {
      alert('⚠️ Los datos por zona aún no están disponibles. Por favor espera unos segundos y vuelve a intentar.');
      return;
    }
    
    // Activar estado de generación
    setIsGeneratingReport(true);
    
    try {
      console.log('Generando reporte con zoneData:', zoneData);
      
      // Pequeño delay para mostrar el estado de loading
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const success = generateReport(airQualityData, weatherData, zoneData);
      
      if (success) {
        // Mantener el estado de loading un poco más mientras se descarga
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Error generando reporte:', error);
      alert('❌ Error al generar el reporte. Por favor intenta de nuevo.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Estilos para vistas ocultas - NO usar display:none ni height:0
  // Esto mantiene las dimensiones para que Leaflet pueda calcular correctamente
  const getViewStyle = (viewName) => {
    const isActive = activeView === viewName;
    return {
      position: isActive ? 'relative' : 'absolute',
      top: isActive ? 'auto' : 0,
      left: isActive ? 'auto' : 0,
      right: isActive ? 'auto' : 0,
      opacity: isActive ? 1 : 0,
      pointerEvents: isActive ? 'auto' : 'none',
      zIndex: isActive ? 1 : 0,
      // Importante: NO usar visibility:hidden ni height:0
      // Esto permite que Leaflet calcule dimensiones correctamente
      transform: isActive ? 'none' : 'translateX(-100vw)',
    };
  };

  // 🆕 MEJORA: Determinar si el botón está deshabilitado
  const isReportButtonDisabled = !zoneData || !zoneData.zones || isGeneratingReport;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="w-full px-6">
          <div className="flex justify-between h-20">
            {/* Logo y Título */}
            <div className="flex items-center gap-4">
              <img 
                src={logoRevive} 
                alt="REVIVE Logo" 
                className="h-12 w-auto object-contain"
              />
              <div className="border-l-2 border-gray-300 h-12"></div>
              <div className="flex flex-col justify-center">
                <h1 className="text-xl font-bold text-gray-800">
                  Sistema de Calidad del Aire
                </h1>
                <p className="text-sm text-gray-600">Xalapa, Veracruz</p>
              </div>
            </div>
            
            {/* Botones de navegación */}
            <div className="flex items-center space-x-3">
              {/* Dashboard Button */}
              <button
                onClick={() => changeView('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeView === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-md transform scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </button>
              
              {/* Alerts and Predictions Button */}
              <button
                onClick={() => changeView('alerts')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeView === 'alerts'
                    ? 'bg-blue-600 text-white shadow-md transform scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Alertas y Predicciones
              </button>
              
              {/* Historical Data Button */}
              <button
                onClick={() => changeView('historical')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeView === 'historical'
                    ? 'bg-blue-600 text-white shadow-md transform scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Datos Históricos
              </button>
              
              {/* 🆕 MEJORA: Botón de Descarga con estado "Generando..." */}
              <button
                onClick={handleGenerateReport}
                disabled={isReportButtonDisabled}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all duration-200 transform ${
                  isGeneratingReport
                    ? 'bg-yellow-500 cursor-wait'
                    : isReportButtonDisabled
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 hover:shadow-lg hover:scale-105'
                } text-white`}
                title={
                  isGeneratingReport 
                    ? 'Generando reporte PDF...' 
                    : isReportButtonDisabled 
                    ? 'Esperando datos de zona...' 
                    : 'Descargar reporte PDF'
                }
              >
                {isGeneratingReport ? (
                  // Icono de carga animado
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>GENERANDO...</span>
                  </>
                ) : (
                  // Icono normal de descarga
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    <span>DESCARGAR REPORTE</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="w-full py-4 px-4 relative overflow-hidden">
        {/* Dashboard */}
        <div 
          className="transition-opacity duration-300"
          style={getViewStyle('dashboard')}
        >
          <AirQualityDashboard isVisible={activeView === 'dashboard'} />
        </div>
        
        {/* Alerts - lazy mount */}
        {visitedViews.alerts && (
          <div 
            className="transition-opacity duration-300"
            style={getViewStyle('alerts')}
          >
            <AlertsAndPredictions isVisible={activeView === 'alerts'} />
          </div>
        )}
        
        {/* Historical - lazy mount */}
        {visitedViews.historical && (
          <div 
            className="transition-opacity duration-300"
            style={getViewStyle('historical')}
          >
            <HistoricalDataDashboard isVisible={activeView === 'historical'} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
