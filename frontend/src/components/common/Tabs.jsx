/**
 * Componente Tabs - Sistema de pestañas reutilizable
 * Fase 4 - Optimización: Componentes UI comunes
 */

import React from 'react';

/**
 * Contenedor principal de Tabs
 * @param {Object} props
 * @param {Array} props.tabs - Array de tabs [{id, label, icon, badge, disabled}]
 * @param {string} props.activeTab - ID del tab activo
 * @param {Function} props.onTabChange - Handler cuando cambia el tab
 * @param {string} props.variant - Variante: 'default', 'pills', 'underline', 'boxed'
 * @param {string} props.size - Tamaño: 'sm', 'md', 'lg'
 * @param {boolean} props.fullWidth - Si los tabs ocupan todo el ancho
 * @param {string} props.className - Clases adicionales
 */
const Tabs = ({
    tabs,
    activeTab,
    onTabChange,
    variant = 'default',
    size = 'md',
    fullWidth = false,
    className = '',
}) => {
    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-5 py-2.5 text-sm',
        lg: 'px-6 py-3 text-base',
    };

    const variantStyles = {
        default: {
            container: 'border-b border-gray-200',
            tab: 'border-b-2 border-transparent hover:border-gray-300',
            active: 'border-b-2 border-blue-600 text-blue-600',
            inactive: 'text-gray-500 hover:text-gray-700',
        },
        pills: {
            container: 'bg-gray-100 p-1 rounded-lg',
            tab: 'rounded-md',
            active: 'bg-white shadow-sm text-gray-900',
            inactive: 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
        },
        underline: {
            container: '',
            tab: 'border-b-2 border-transparent',
            active: 'border-b-2 border-blue-600 text-blue-600',
            inactive: 'text-gray-500 hover:text-gray-700 hover:border-gray-300',
        },
        boxed: {
            container: 'border-b border-gray-200',
            tab: 'border border-transparent rounded-t-lg -mb-px',
            active: 'bg-white border-gray-200 border-b-white text-blue-600',
            inactive: 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
        },
    };

    const styles = variantStyles[variant] || variantStyles.default;

    return (
        <div className={`${styles.container} ${className}`}>
            <nav className={`flex ${fullWidth ? '' : 'space-x-1'}`}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => !tab.disabled && onTabChange(tab.id)}
                        disabled={tab.disabled}
                        className={`
                            ${sizeClasses[size]}
                            ${styles.tab}
                            ${activeTab === tab.id ? styles.active : styles.inactive}
                            ${fullWidth ? 'flex-1' : ''}
                            ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                            font-medium transition-all duration-200
                            flex items-center justify-center gap-2
                        `}
                    >
                        {tab.icon && <span>{tab.icon}</span>}
                        <span className="hidden sm:inline">{tab.label}</span>
                        {tab.badge && (
                            <span className="ml-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                {tab.badge}
                            </span>
                        )}
                    </button>
                ))}
            </nav>
        </div>
    );
};

/**
 * Contenedor de contenido de tab
 */
export const TabContent = ({
    children,
    className = '',
    animate = true,
}) => {
    return (
        <div className={`
            ${animate ? 'animate-fade-in' : ''}
            ${className}
        `}>
            {children}
        </div>
    );
};

/**
 * Panel de tab individual (para usar con TabContent)
 */
export const TabPanel = ({
    children,
    id,
    activeTab,
    className = '',
}) => {
    if (id !== activeTab) return null;
    
    return (
        <TabContent className={className}>
            {children}
        </TabContent>
    );
};

/**
 * Variante: Tabs verticales
 */
export const VerticalTabs = ({
    tabs,
    activeTab,
    onTabChange,
    className = '',
}) => {
    return (
        <div className={`flex flex-col space-y-1 ${className}`}>
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => !tab.disabled && onTabChange(tab.id)}
                    disabled={tab.disabled}
                    className={`
                        px-4 py-3 text-left rounded-lg
                        transition-all duration-200
                        flex items-center gap-3
                        ${activeTab === tab.id 
                            ? 'bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-600' 
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }
                        ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                >
                    {tab.icon && <span className="text-lg">{tab.icon}</span>}
                    <span>{tab.label}</span>
                    {tab.badge && (
                        <span className="ml-auto px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {tab.badge}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
};

/**
 * Tabs con contenido integrado (todo en uno)
 */
export const TabsWithContent = ({
    tabs,
    defaultTab = null,
    variant = 'default',
    className = '',
    contentClassName = '',
}) => {
    const [activeTab, setActiveTab] = React.useState(defaultTab || tabs[0]?.id);

    const activeContent = tabs.find(tab => tab.id === activeTab)?.content;

    return (
        <div className={className}>
            <Tabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                variant={variant}
            />
            <div className={`mt-4 ${contentClassName}`}>
                <TabContent key={activeTab}>
                    {activeContent}
                </TabContent>
            </div>
        </div>
    );
};

/**
 * Tabs estilo "fundido" con contenido (el usado en AlertsAndPredictions)
 */
export const FusedTabs = ({
    tabs,
    activeTab,
    onTabChange,
    className = '',
}) => {
    return (
        <div className={`flex ${className}`}>
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => !tab.disabled && onTabChange(tab.id)}
                    disabled={tab.disabled}
                    className={`
                        relative flex items-center gap-2 px-5 py-3 font-medium 
                        transition-all duration-200
                        ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        ${activeTab === tab.id
                            ? 'text-blue-600 bg-white'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }
                    `}
                    style={activeTab === tab.id ? {
                        borderTopLeftRadius: '8px',
                        borderTopRightRadius: '8px',
                        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
                        marginBottom: '-1px',
                        borderTop: '3px solid #2563eb',
                        borderLeft: '1px solid #e5e7eb',
                        borderRight: '1px solid #e5e7eb',
                        background: 'white',
                        zIndex: 10
                    } : {}}
                >
                    {tab.icon && <span>{tab.icon}</span>}
                    <span className="hidden sm:inline">{tab.label}</span>
                </button>
            ))}
        </div>
    );
};

export default Tabs;
