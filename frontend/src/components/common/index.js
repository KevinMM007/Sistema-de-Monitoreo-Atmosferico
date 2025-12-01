/**
 * Exportación centralizada de Componentes UI Comunes
 * Fase 4 - Optimización
 * 
 * Uso:
 * import { Card, Button, Badge, LoadingSpinner } from '../components/common';
 */

// Loading & Spinners
export { 
    default as LoadingSpinner, 
    SkeletonLoader, 
    LoadingOverlay 
} from './LoadingSpinner';

// Cards
export { 
    default as Card, 
    ColoredCard, 
    InfoCard, 
    InteractiveCard 
} from './Card';

// Statistics Cards
export { 
    default as StatCard, 
    StatCardLarge, 
    StatGrid, 
    PollutantStatCard, 
    ComparisonStatCard 
} from './StatCard';

// Badges
export { 
    default as Badge, 
    AirQualityBadge, 
    StatusBadge, 
    CountBadge, 
    TrendBadge 
} from './Badge';

// Tabs
export { 
    default as Tabs, 
    TabContent, 
    TabPanel, 
    VerticalTabs, 
    TabsWithContent, 
    FusedTabs 
} from './Tabs';

// Buttons
export { 
    default as Button, 
    IconButton, 
    ButtonGroup, 
    ToggleButton, 
    FloatingActionButton 
} from './Button';

// Data Status
export { 
    default as DataStatus, 
    TrafficDataIndicator, 
    DataSourceBadge, 
    DataVerificationPanel,
    EmptyState, 
    ErrorState 
} from './DataStatus';
