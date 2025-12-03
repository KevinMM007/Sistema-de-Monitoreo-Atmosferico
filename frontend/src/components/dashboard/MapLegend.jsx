import React, { useState } from 'react';
import { AIR_QUALITY_LEVELS } from '../../utils/constants';

const MapLegend = ({ className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);

    const levels = [
        { key: 'bueno', color: '#10b981', label: 'Bueno', description: '0-12 µg/m³' },
        { key: 'moderado', color: '#eab308', label: 'Moderado', description: '12-35 µg/m³' },
        { key: 'insalubre_sensibles', color: '#f97316', label: 'Insalubre', description: '35-55 µg/m³' },
        { key: 'muy_insalubre', color: '#ef4444', label: 'Muy Insalubre', description: '55-150 µg/m³' },
        { key: 'peligroso', color: '#7c2d12', label: 'Peligroso', description: '>150 µg/m³' },
    ];

    return (
        <div className={`relative ${className}`}>
            {/* Botón para abrir/cerrar la leyenda */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg
                    transition-all duration-200 shadow-md
                    ${isOpen 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-white text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                    }
                `}
                title="Ver índices de calidad del aire"
            >
                {/* Icono de paleta de colores */}
                <svg 
                    className="w-5 h-5" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                >
                    <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" 
                    />
                </svg>
                <span className="text-sm font-medium">Índices</span>
                {/* Flecha indicadora */}
                <svg 
                    className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
            </button>

            {/* Panel de la leyenda */}
            {isOpen && (
                <>
                    {/* Overlay para cerrar al hacer clic afuera */}
                    <div 
                        className="fixed inset-0 z-[999]"
                        onClick={() => setIsOpen(false)}
                    />
                    
                    {/* Tarjeta de la leyenda */}
                    <div className="absolute bottom-12 left-0 z-[1000] animate-fade-in">
                        <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden min-w-[220px]">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-white flex items-center gap-2">
                                        <span>🌬️</span>
                                        Calidad del Aire
                                    </h4>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="text-white/80 hover:text-white transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <p className="text-white/80 text-xs mt-1">
                                    Índice basado en PM2.5
                                </p>
                            </div>
                            
                            {/* Lista de niveles */}
                            <div className="p-3 space-y-1">
                                {levels.map(({ key, color, label, description }) => (
                                    <div 
                                        key={key} 
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        {/* Indicador de color */}
                                        <div 
                                            className="w-4 h-4 rounded-md shadow-sm flex-shrink-0"
                                            style={{ backgroundColor: color }}
                                        />
                                        
                                        {/* Información */}
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm font-semibold text-gray-800 block">
                                                {label}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {description}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Footer */}
                            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                                <p className="text-xs text-gray-500 text-center">
                                    Pasa el cursor sobre las zonas para más detalles
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default React.memo(MapLegend);
