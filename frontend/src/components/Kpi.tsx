
import type { ElementType, ReactNode } from 'react'
import { TrendingUp } from 'lucide-react'

interface KpiProps {
  label: string
  value: string
  icon: ElementType
  tone?: string
  note?: ReactNode
}

export default function Kpi({
  label,
  value,
  icon: Icon,
  tone = 'blue',
  note,
}: KpiProps) {
  return (
    <div className={`kpi ${tone === 'gradient' ? 'kpi-gradient' : ''}`}>
      <div className="kpi-top">
        <span>{label}</span>
        <div className={`kpi-icon ${tone}`}>
          <Icon size={19} />
        </div>
      </div>

      <strong>{value}</strong>

      <div className="kpi-note">
        {note || (
          <>
            <span className="trend">
              <TrendingUp size={13} /> 0.0%
            </span>
            <span> vs. ayer</span>
          </>
        )}
      </div>
    </div>
  )
}
