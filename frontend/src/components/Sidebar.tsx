
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Wallet,
  Banknote,
  FileText,
  Menu,
  X,
  ShoppingBag,
} from 'lucide-react'

const navigation = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/mantenimientos/productos', label: 'Productos', icon: Package },
  { to: '/mantenimientos/pagos', label: 'Deudas / Cuentas por cobrar', icon: Wallet },
  { to: '/mantenimientos/caja', label: 'Caja / Arqueo', icon: Banknote },
  { to: '/reportes', label: 'Reportes', icon: FileText },
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        className="mobile-menu"
        onClick={() => setOpen(!open)}
        aria-label="Abrir menú"
      >
        <Menu size={21} />
      </button>

      {open && (
        <div
          className="mobile-shade"
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <ShoppingBag size={23} />
          </div>

          <div>
            <b>
              HEG<span>ORAS</span>
            </b>
            <small>INTERNET</small>
          </div>

          <button
            className="close-menu"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
          >
            <X />
          </button>
        </div>

        <div className="workspace">
          <div className="workspace-logo">N</div>

          <div>
            <b>Internet Hegoras</b>
            <small>Panel de negocio</small>
          </div>

          <span className="online-dot" />
        </div>

        <p className="nav-caption">MENÚ PRINCIPAL</p>

        <nav>
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">✦</div>

            <b>¿Necesitas ayuda?</b>

            <p>
              Revisa tus movimientos y mantén tu negocio al día.
            </p>
          </div>

          <div className="user-mini">
            <div className="avatar">DR</div>

            <div>
              <b>Dulce Ramos</b>
              <small>Administradora</small>
            </div>

            <span className="user-menu">•••</span>
          </div>
        </div>
      </aside>
    </>
  )
}
