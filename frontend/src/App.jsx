/**
 * App.jsx - Componente principal de la aplicación
 * 
 * 🆕 MEJORAS IMPLEMENTADAS:
 * - Responsive design completo (móviles, tablets, desktop)
 * - Menú hamburguesa para dispositivos móviles
 * - Accesibilidad mejorada (aria-labels, roles, focus states)
 * - Navegación por teclado
 * - FIX: Usa servicios de API centralizados para producción
 */

import React, { useState, useEffect, useCallback } from "react";
import AirQualityDashboard, { generateReport } from "./components/AirQualityDashboard.jsx";
import AlertsAndPredictions from "./components/AlertsAndPredictions.jsx";
import HistoricalDataDashboard from "./components/HistoricalDataDashboard.jsx";
import logoRevive from "./assets/logo_revive.png";

// 🆕 FIX: Importar servicios de API para usar URLs correctas en producción
import { airQualityService, weatherService } from "./services/api";

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [airQualityData, setAirQualityData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [zoneData, setZoneData] = useState(null);
  
  // Estado para controlar generación del reporte
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  // 🆕 Estado para menú móvil
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Rastrear qué vistas han sido visitadas (para lazy mounting)
  const [visitedViews, setVisitedViews] = useState({ dashboard: true });

  // Cerrar menú móvil al cambiar tamaño de ventana
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cerrar menú móvil al presionar Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen]);

  // 🆕 FIX: Usar servicios de API centralizados en lugar de fetch directo
  // Esto asegura que se usen las URLs correctas tanto en desarrollo como producción
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Usar servicio de API para calidad del aire
        const airData = await airQualityService.getLatest();
        if (airData && Array.isArray(airData)) {
          const now = new Date();
          const filteredData = airData.filter(item => {
            const itemDate = new Date(item.timestamp);
            return itemDate <= now;
          });
          setAirQualityData(filteredData);
          console.log('✅ Datos de calidad del aire cargados para reporte:', filteredData.length);
        }

        // Usar servicio de API para clima
        const weather = await weatherService.getCurrent();
        if (weather) {
          setWeatherData(weather);
          console.log('✅ Datos meteorológicos cargados para reporte');
        }
        
        // Usar servicio de API para datos por zona
        const zones = await airQualityService.getByZone();
        if (zones) {
          setZoneData(zones);
          console.log('✅ Datos por zona cargados para reporte:', zones.zones?.length || 0, 'zonas');
        }
      } catch (error) {
        console.error('❌ Error fetching data for report:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 300000); // Actualizar cada 5 minutos
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
    setIsMobileMenuOpen(false); // Cerrar menú móvil al cambiar vista
    
    // Disparar resize después de cambiar de vista para que los mapas se actualicen
    setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 500);
  }, []);

  // Handler mejorado con estado de loading
  const handleGenerateReport = async () => {
    if (!airQualityData || !weatherData) {
      alert('No hay datos disponibles para generar el reporte');
      return;
    }
    
    if (!zoneData || !zoneData.zones || zoneData.zones.length === 0) {
      alert('⚠️ Los datos por zona aún no están disponibles. Por favor espera unos segundos y vuelve a intentar.');
      return;
    }
    
    setIsGeneratingReport(true);
    setIsMobileMenuOpen(false);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const success = generateReport(airQualityData, weatherData, zoneData);
      
      if (success) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Error generando reporte:', error);
      alert('❌ Error al generar el reporte. Por favor intenta de nuevo.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Estilos para vistas ocultas
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
      transform: isActive ? 'none' : 'translateX(-100vw)',
    };
  };

  const isReportButtonDisabled = !zoneData || !zoneData.zones || isGeneratingReport;

  // Configuración de botones de navegación
  const navButtons = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      shortLabel: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'alerts',
      label: 'Alertas y Predicciones',
      shortLabel: 'Alertas',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    {
      id: 'historical',
      label: 'Datos Históricos',
      shortLabel: 'Histórico',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ==================== NAVBAR ==================== */}
      <nav className="bg-white shadow-lg sticky top-0 z-50" role="navigation" aria-label="Navegación principal">
        <div className="w-full px-4 sm:px-6">
          <div className="flex justify-between items-center h-16 md:h-20">
            
            {/* Logo y Título */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <img 
                src={logoRevive} 
                alt="Logo de REVIVE - Red de Viveros de Biodiversidad" 
                className="h-10 md:h-12 w-auto object-contain"
              />
              <div className="hidden sm:block border-l-2 border-gray-300 h-10 md:h-12" aria-hidden="true"></div>
              <div className="flex flex-col justify-center">
                <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 leading-tight">
                  <span className="hidden sm:inline">Sistema de Calidad del Aire</span>
                  <span className="sm:hidden">Calidad del Aire</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden xs:block">Xalapa, Veracruz</p>
              </div>
            </div>
            
            {/* Botones de navegación - Desktop */}
            <div className="hidden md:flex items-center space-x-2 lg:space-x-3" role="menubar">
              {navButtons.map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => changeView(btn.id)}
                  role="menuitem"
                  aria-current={activeView === btn.id ? 'page' : undefined}
                  className={`
                    flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-sm font-medium 
                    transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    ${activeView === btn.id
                      ? 'bg-blue-600 text-white shadow-md transform scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                    }
                  `}
                >
                  {btn.icon}
                  <span className="hidden lg:inline">{btn.label}</span>
                  <span className="lg:hidden">{btn.shortLabel}</span>
                </button>
              ))}
              
              {/* Botón Descargar Reporte - Desktop */}
              <button
                onClick={handleGenerateReport}
                disabled={isReportButtonDisabled}
                aria-label={
                  isGeneratingReport 
                    ? 'Generando reporte PDF...' 
                    : isReportButtonDisabled 
                    ? 'Esperando datos de zona...' 
                    : 'Descargar reporte PDF'
                }
                className={`
                  flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-sm font-medium 
                  shadow-md transition-all duration-200 transform text-white
                  focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                  ${isGeneratingReport
                    ? 'bg-yellow-500 cursor-wait'
                    : isReportButtonDisabled
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 hover:shadow-lg hover:scale-105'
                  }
                `}
              >
                {isGeneratingReport ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="hidden lg:inline">GENERANDO...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    <span className="hidden lg:inline">DESCARGAR REPORTE</span>
                    <span className="lg:hidden">PDF</span>
                  </>
                )}
              </button>
            </div>

            {/* Botón hamburguesa - Mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Menú móvil desplegable */}
        <div
          id="mobile-menu"
          className={`
            md:hidden transition-all duration-300 ease-in-out overflow-hidden
            ${isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
          `}
          role="menu"
          aria-hidden={!isMobileMenuOpen}
        >
          <div className="px-4 py-3 space-y-2 bg-gray-50 border-t border-gray-200">
            {navButtons.map((btn) => (
              <button
                key={btn.id}
                onClick={() => changeView(btn.id)}
                role="menuitem"
                tabIndex={isMobileMenuOpen ? 0 : -1}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-medium
                  transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${activeView === btn.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }
                `}
              >
                {btn.icon}
                <span>{btn.label}</span>
                {activeView === btn.id && (
                  <svg className="w-5 h-5 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
            
            {/* Botón Descargar - Mobile */}
            <button
              onClick={handleGenerateReport}
              disabled={isReportButtonDisabled}
              tabIndex={isMobileMenuOpen ? 0 : -1}
              className={`
                w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg font-medium
                transition-all duration-200 text-white mt-3
                focus:outline-none focus:ring-2 focus:ring-green-500
                ${isGeneratingReport
                  ? 'bg-yellow-500 cursor-wait'
                  : isReportButtonDisabled
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
                }
              `}
            >
              {isGeneratingReport ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Generando reporte...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  <span>Descargar Reporte PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </nav>
      
      {/* ==================== CONTENIDO PRINCIPAL ==================== */}
      <main 
        className="w-full py-2 sm:py-4 px-2 sm:px-4 relative overflow-hidden"
        role="main"
        aria-label="Contenido principal"
      >
        {/* Dashboard */}
        <div 
          className="transition-opacity duration-300"
          style={getViewStyle('dashboard')}
          role="tabpanel"
          aria-label="Panel del Dashboard"
          hidden={activeView !== 'dashboard'}
        >
          <AirQualityDashboard isVisible={activeView === 'dashboard'} />
        </div>
        
        {/* Alerts - lazy mount */}
        {visitedViews.alerts && (
          <div 
            className="transition-opacity duration-300"
            style={getViewStyle('alerts')}
            role="tabpanel"
            aria-label="Panel de Alertas y Predicciones"
            hidden={activeView !== 'alerts'}
          >
            <AlertsAndPredictions isVisible={activeView === 'alerts'} />
          </div>
        )}
        
        {/* Historical - lazy mount */}
        {visitedViews.historical && (
          <div 
            className="transition-opacity duration-300"
            style={getViewStyle('historical')}
            role="tabpanel"
            aria-label="Panel de Datos Históricos"
            hidden={activeView !== 'historical'}
          >
            <HistoricalDataDashboard isVisible={activeView === 'historical'} />
          </div>
        )}
      </main>

      {/* Overlay para cerrar menú móvil al hacer clic fuera */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default App;
