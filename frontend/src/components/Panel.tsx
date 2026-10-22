
import type { ReactNode } from 'react'

interface PanelProps {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}

export default function Panel({
  title,
  subtitle,
  action,
  children,
}: PanelProps) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>

        {action}
      </div>

      {children}
    </section>
  )
}
