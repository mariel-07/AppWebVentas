
import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

interface ShellProps {
  title: string
  subtitle: string
  children: ReactNode
}

export default function Shell({
  title,
  subtitle,
  children,
}: ShellProps) {
  return (
    <>
      <Sidebar />

      <main className="main">
        <Header title={title} subtitle={subtitle} />

        {children}

        <footer>
          © 2026 Internet Hegoras
          <span> • </span>
          Sistema de gestión comercial
        </footer>
      </main>
    </>
  )
}
