import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import UnsubscribePage from './components/UnsubscribePage.jsx'

// 🆕 Routing mínimo: si la URL es /unsubscribe (enlace del correo de alerta),
// montamos la página dedicada en lugar del dashboard completo.
// Se hace aquí para evitar que los useEffect de App se ejecuten en esa ruta
// (peticiones a /api/air-quality, etc. que no tienen sentido en la vista de
// confirmación de desuscripción).
const isUnsubscribeRoute =
  typeof window !== 'undefined' && window.location.pathname === '/unsubscribe'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isUnsubscribeRoute ? <UnsubscribePage /> : <App />}
  </StrictMode>,
)
