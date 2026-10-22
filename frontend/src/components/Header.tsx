
import { Bell, Search } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="topbar">
      <div>
        <div className="breadcrumbs">
          Internet Hegoras <span>/</span> <b>{title}</b>
        </div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="top-actions">
        <button className="icon-button" aria-label="Buscar">
          <Search size={19} />
        </button>

        <button
          className="icon-button notification"
          aria-label="Notificaciones"
        >
          <Bell size={19} />
          <i />
        </button>

        <div className="top-user">
          <div className="avatar">DR</div>
          <div>
            <b>Dulce Ramos</b>
            <small>Administradora</small>
          </div>
        </div>
      </div>
    </header>
  )
}
