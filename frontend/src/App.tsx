
import { useEffect } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Reports from './pages/Reports'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Payments from './pages/Payments'
import Cash from './pages/Cash'

export default function App() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />

      <Route
        path="/mantenimientos/productos"
        element={<Products />}
      />

      <Route
        path="/mantenimientos/pagos"
        element={<Payments />}
      />

      <Route
        path="/mantenimientos/caja"
        element={<Cash />}
      />
<Route
  path="/reportes"
  element={<Reports />}
/>
      <Route
        path="*"
        element={
          <main className="main">
            <h1>Página no encontrada</h1>
            <NavLink to="/">Volver al dashboard</NavLink>
          </main>
        }
      />
    </Routes>
  )
}
