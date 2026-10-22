
import { useEffect, useMemo, useState } from 'react'
import {
  Banknote,
  CircleDollarSign,
  CheckCircle2,
  AlertTriangle,
  ReceiptText,
  RefreshCw,
} from 'lucide-react'

import { api } from '../api'
import Shell from '../components/Shell'
import Kpi from '../components/Kpi'
import Panel from '../components/Panel'

const money = (n: number) => `S/ ${Number(n || 0).toFixed(2)}`

type DashboardData = {
  products: number
  low_stock: number
  pending: number
  paid_today: number
  sales_today: number
}

type SaleRecord = {
  id: number
  sale_number: string
  sale_date: string
  total: number
  payment_method: string
  status: string
}

type CashValues = {
  bills: number
  coins: number
  yape: number
  other: number
}

export default function Cash() {
  const [dashboard, setDashboard] = useState<DashboardData>({
    products: 0,
    low_stock: 0,
    pending: 0,
    paid_today: 0,
    sales_today: 0,
  })

  const [sales, setSales] = useState<SaleRecord[]>([])
  const [values, setValues] = useState<CashValues>({
    bills: 0,
    coins: 0,
    yape: 0,
    other: 0,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    try {
      const [dashboardData, salesData] = await Promise.all([
        api.dashboard(),
        api.sales(),
      ])

      setDashboard(dashboardData)
      setSales(salesData as SaleRecord[])
    } catch (e) {
      setError(
        (e as Error).message ||
          'No se pudieron cargar los datos de caja.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const today = new Date().toLocaleDateString('en-CA')

  const todaySales = useMemo(
    () =>
      sales.filter(
        (sale) =>
          sale.sale_date?.slice(0, 10) === today &&
          sale.status !== 'Anulada',
      ),
    [sales, today],
  )

  const salesByMethod = useMemo(() => {
    const result = {
      cash: 0,
      digital: 0,
      card: 0,
      transfer: 0,
      credit: 0,
      other: 0,
    }

    for (const sale of todaySales) {
      const method = sale.payment_method?.trim().toLowerCase() ?? ''
      const total = Number(sale.total || 0)

      if (['efectivo', 'cash'].includes(method)) {
        result.cash += total
      } else if (
        ['yape', 'plin', 'billetera digital', 'pago digital'].includes(method)
      ) {
        result.digital += total
      } else if (
        ['tarjeta', 'tarjeta de crédito', 'tarjeta de debito', 'tarjeta de débito'].includes(method)
      ) {
        result.card += total
      } else if (
        ['transferencia', 'transferencia bancaria'].includes(method)
      ) {
        result.transfer += total
      } else if (
        ['crédito', 'credito', 'fiado', 'por cobrar'].includes(method)
      ) {
        result.credit += total
      } else {
        result.other += total
      }
    }

    return result
  }, [todaySales])

  const expected =
    salesByMethod.cash +
    salesByMethod.digital +
    salesByMethod.card +
    salesByMethod.transfer +
    salesByMethod.other +
    Number(dashboard.paid_today || 0)

  const counted =
    Number(values.bills || 0) +
    Number(values.coins || 0) +
    Number(values.yape || 0) +
    Number(values.other || 0)

  const difference = Number((counted - expected).toFixed(2))

  function updateValue(key: keyof CashValues, value: number) {
    setValues((current) => ({
      ...current,
      [key]: Math.max(0, Number.isFinite(value) ? value : 0),
    }))
    setSuccess('')
  }

  function resetCount() {
    setValues({
      bills: 0,
      coins: 0,
      yape: 0,
      other: 0,
    })
    setSuccess('')
  }

  function validateCount() {
    setSuccess(
      difference === 0
        ? 'El conteo coincide con los ingresos esperados.'
        : difference > 0
          ? 'Conteo calculado. Revisa el sobrante de caja.'
          : 'Conteo calculado. Revisa el faltante de caja.',
    )
  }

  const fields: {
    key: keyof CashValues
    label: string
    hint: string
  }[] = [
    {
      key: 'bills',
      label: 'Billetes',
      hint: 'Total de billetes contados',
    },
    {
      key: 'coins',
      label: 'Monedas',
      hint: 'Total de monedas contadas',
    },
    {
      key: 'yape',
      label: 'Yape / pagos digitales',
      hint: 'Importe digital contado',
    },
    {
      key: 'other',
      label: 'Otros ingresos contados',
      hint: 'Otros importes recibidos',
    },
  ]

  return (
    <Shell
      title="Caja / Arqueo"
      subtitle="Consulta las ventas del día y compara los ingresos esperados con el dinero contado."
    >
      {error && (
        <div className="error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')}>
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="success" role="status">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess('')}>
            ×
          </button>
        </div>
      )}

      <div className="kpi-grid three">
        <Kpi
          label="Ingresos esperados"
          value={money(expected)}
          icon={Banknote}
          tone="blue"
          note="Ventas cobradas y abonos de hoy"
        />

        <Kpi
          label="Total contado"
          value={money(counted)}
          icon={CircleDollarSign}
          tone="violet"
          note="Importes ingresados en el arqueo"
        />

        <Kpi
          label="Diferencia"
          value={money(difference)}
          icon={difference === 0 ? CheckCircle2 : AlertTriangle}
          tone={difference === 0 ? 'green' : 'orange'}
          note={
            difference === 0
              ? 'Caja cuadrada'
              : difference > 0
                ? 'Sobrante por revisar'
                : 'Faltante por revisar'
          }
        />
      </div>

      <div className="cash-grid">
        <Panel
          title="Resumen de ingresos"
          subtitle="Ventas registradas para la fecha actual"
          action={
            <button
              type="button"
              className="btn btn-light"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw
                size={15}
                className={loading ? 'spin' : ''}
              />
              Actualizar
            </button>
          }
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Importe</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>Ventas en efectivo</td>
                  <td>{money(salesByMethod.cash)}</td>
                </tr>
                <tr>
                  <td>Yape / pagos digitales</td>
                  <td>{money(salesByMethod.digital)}</td>
                </tr>
                <tr>
                  <td>Tarjetas</td>
                  <td>{money(salesByMethod.card)}</td>
                </tr>
                <tr>
                  <td>Transferencias</td>
                  <td>{money(salesByMethod.transfer)}</td>
                </tr>
                <tr>
                  <td>Otros métodos de pago</td>
                  <td>{money(salesByMethod.other)}</td>
                </tr>
                <tr>
                  <td>Abonos de cuentas por cobrar</td>
                  <td>{money(Number(dashboard.paid_today || 0))}</td>
                </tr>
                <tr>
                  <td>Ventas al crédito (no cobradas)</td>
                  <td>{money(salesByMethod.credit)}</td>
                </tr>
                <tr className="total-row">
                  <td>Ingresos esperados</td>
                  <td>{money(expected)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="cash-note">
            <ReceiptText size={18} />
            <span>
              Los importes se obtienen de las ventas y los abonos
              registrados. Las ventas al crédito se muestran por separado
              porque todavía no representan dinero recibido.
            </span>
          </div>
        </Panel>

        <Panel
          title="Conteo físico y digital"
          subtitle="Ingresa el dinero que tienes al realizar el arqueo"
        >
          <div className="count-form">
            {fields.map((field) => (
              <label className="count-row" key={field.key}>
                <span>
                  <b>{field.label}</b>
                  <small>{field.hint}</small>
                </span>

                <div className="money-input">
                  <span>S/</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={values[field.key]}
                    onChange={(e) =>
                      updateValue(field.key, Number(e.target.value))
                    }
                  />
                </div>
              </label>
            ))}
          </div>

          <div className="count-total">
            <span>Total contado</span>
            <b>{money(counted)}</b>
          </div>

          <div
            className={`difference-box ${
              difference === 0
                ? 'difference-good'
                : 'difference-bad'
            }`}
          >
            <div>
              <small>DIFERENCIA DE CAJA</small>
              <strong>{money(difference)}</strong>
              <span>
                {difference === 0
                  ? 'El arqueo está cuadrado'
                  : difference > 0
                    ? 'Hay un sobrante por revisar'
                    : 'Hay un faltante por revisar'}
              </span>
            </div>

            {difference === 0 ? (
              <CheckCircle2 size={27} />
            ) : (
              <AlertTriangle size={27} />
            )}
          </div>

          <div className="cash-actions">
            <button
              type="button"
              className="btn btn-light"
              onClick={resetCount}
            >
              Limpiar conteo
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={validateCount}
              disabled={loading}
            >
              <CheckCircle2 size={16} />
              Revisar arqueo
            </button>
          </div>
        </Panel>
      </div>
    </Shell>
  )
}
