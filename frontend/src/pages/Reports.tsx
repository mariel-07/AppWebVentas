import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  Download,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'

import { api, type CashReport } from '../api'
import Shell from '../components/Shell'
import Kpi from '../components/Kpi'
import Panel from '../components/Panel'

const money = (n: number) =>
  `S/ ${Number(n || 0).toFixed(2)}`

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(
    'es-PE',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    },
  )
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function todayString() {
  return new Date().toLocaleDateString('en-CA')
}

function yesterdayString() {
  const date = new Date()
  date.setDate(date.getDate() - 1)

  return date.toLocaleDateString('en-CA')
}

function monthStartString() {
  const date = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  )

  return date.toLocaleDateString('en-CA')
}

export default function Reports() {
  const today = todayString()

  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)

  const [report, setReport] =
    useState<CashReport | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadReport(
    start = startDate,
    end = endDate,
  ) {
    if (!start || !end) {
      setError('Selecciona ambas fechas.')
      return
    }

    if (end < start) {
      setError(
        'La fecha final no puede ser menor que la fecha inicial.',
      )
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await api.cashReport(start, end)
      setReport(data)
    } catch (e) {
      setError(
        (e as Error).message ||
          'No se pudo generar el reporte.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadReport(today, today)
  }, [])

  function selectToday() {
    const date = todayString()

    setStartDate(date)
    setEndDate(date)

    void loadReport(date, date)
  }

  function selectYesterday() {
    const date = yesterdayString()

    setStartDate(date)
    setEndDate(date)

    void loadReport(date, date)
  }

  function selectMonth() {
    const start = monthStartString()
    const end = todayString()

    setStartDate(start)
    setEndDate(end)

    void loadReport(start, end)
  }

  function selectWeek() {
    const todayDate = new Date()
    const day = todayDate.getDay()

    const difference =
      day === 0 ? 6 : day - 1

    const monday = new Date(todayDate)
    monday.setDate(
      todayDate.getDate() - difference,
    )

    const start =
      monday.toLocaleDateString('en-CA')

    const end = todayString()

    setStartDate(start)
    setEndDate(end)

    void loadReport(start, end)
  }

  const summary = report?.summary

  const paymentMethods = report?.payment_methods

  const maxDaily = useMemo(() => {
    if (!report?.daily.length) return 1

    return Math.max(
      ...report.daily.map((item) =>
        Math.max(item.income, item.expenses),
      ),
      1,
    )
  }, [report])

  return (
    <Shell
      title="Reportes"
      subtitle="Consulta el comportamiento de caja, ventas e ingresos por período."
    >
      {error && (
        <div className="error" role="alert">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError('')}
          >
            ×
          </button>
        </div>
      )}

      <Panel
        title="Período del reporte"
        subtitle="Selecciona una fecha rápida o define un rango personalizado."
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 20,
          }}
        >
          <button
            type="button"
            className="btn btn-light"
            onClick={selectToday}
          >
            Hoy
          </button>

          <button
            type="button"
            className="btn btn-light"
            onClick={selectYesterday}
          >
            Ayer
          </button>

          <button
            type="button"
            className="btn btn-light"
            onClick={selectWeek}
          >
            Esta semana
          </button>

          <button
            type="button"
            className="btn btn-light"
            onClick={selectMonth}
          >
            Este mes
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          <label>
            <span className="form-label">
              Desde
            </span>

            <div className="money-input">
              <CalendarDays size={17} />

              <input
                type="date"
                value={startDate}
                onChange={(e) =>
                  setStartDate(e.target.value)
                }
              />
            </div>
          </label>

          <label>
            <span className="form-label">
              Hasta
            </span>

            <div className="money-input">
              <CalendarDays size={17} />

              <input
                type="date"
                value={endDate}
                onChange={(e) =>
                  setEndDate(e.target.value)
                }
              />
            </div>
          </label>

          <div
            style={{
              display: 'flex',
              alignItems: 'end',
            }}
          >
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void loadReport()}
              disabled={loading}
            >
              <RefreshCw
                size={16}
                className={
                  loading ? 'spin' : ''
                }
              />

              {loading
                ? 'Generando...'
                : 'Generar reporte'}
            </button>
          </div>
        </div>
      </Panel>

      {report && summary && (
        <>
          <div className="kpi-grid three">
            <Kpi
              label="Ventas"
              value={money(summary.sales)}
              icon={BarChart3}
              tone="blue"
              note={`${summary.sales_count} venta(s)`}
            />

            <Kpi
              label="Ingresos"
              value={money(summary.income)}
              icon={TrendingUp}
              tone="green"
              note="Dinero ingresado a caja"
            />

            <Kpi
              label="Egresos"
              value={money(summary.expenses)}
              icon={TrendingDown}
              tone="orange"
              note="Salidas registradas"
            />
          </div>

          <div className="kpi-grid three">
            <Kpi
              label="Neto"
              value={money(summary.net)}
              icon={Wallet}
              tone={
                summary.net >= 0
                  ? 'green'
                  : 'orange'
              }
              note="Ingresos menos egresos"
            />

            <Kpi
              label="Movimientos de ingreso"
              value={String(
                summary.income_movements,
              )}
              icon={CircleDollarSign}
              tone="violet"
              note="Operaciones registradas"
            />

            <Kpi
              label="Movimientos de egreso"
              value={String(
                summary.expense_movements,
              )}
              icon={CreditCard}
              tone="orange"
              note="Salidas registradas"
            />
          </div>

          <div className="cash-grid">
            <Panel
              title="Métodos de pago"
              subtitle="Distribución del dinero ingresado"
            >
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Método</th>
                      <th>Importe</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr>
                      <td>Efectivo</td>
                      <td>
                        {money(
                          paymentMethods?.cash || 0,
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td>Yape</td>
                      <td>
                        {money(
                          paymentMethods?.yape || 0,
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td>Plin</td>
                      <td>
                        {money(
                          paymentMethods?.plin || 0,
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td>Tarjeta</td>
                      <td>
                        {money(
                          paymentMethods?.card || 0,
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td>Transferencia</td>
                      <td>
                        {money(
                          paymentMethods?.transfer ||
                            0,
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td>Otros</td>
                      <td>
                        {money(
                          paymentMethods?.other || 0,
                        )}
                      </td>
                    </tr>

                    <tr className="total-row">
                      <td>Total ingresos</td>
                      <td>
                        {money(summary.income)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel
              title="Resumen diario"
              subtitle={`${formatDate(
                report.start_date,
              )} — ${formatDate(report.end_date)}`}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                {report.daily.map((item) => (
                  <div
                    key={item.date}
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        '90px 1fr',
                      gap: 12,
                      alignItems: 'center',
                    }}
                  >
                    <strong>
                      {formatDate(item.date)}
                    </strong>

                    <div>
                      <div
                        style={{
                          height: 8,
                          borderRadius: 999,
                          background:
                            'var(--border-color, #e5e7eb)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${
                              Math.max(
                                4,
                                (item.income /
                                  maxDaily) *
                                  100,
                              )
                            }%`,
                            height: '100%',
                            background:
                              'currentColor',
                            borderRadius: 999,
                          }}
                        />
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent:
                            'space-between',
                          marginTop: 6,
                          fontSize: 13,
                        }}
                      >
                        <span>
                          Ingresos:{' '}
                          {money(item.income)}
                        </span>

                        <span>
                          Egresos:{' '}
                          {money(item.expenses)}
                        </span>

                        <strong>
                          Neto:{' '}
                          {money(item.net)}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <Panel
            title="Movimientos del período"
            subtitle={`${report.movements.length} movimiento(s) encontrados`}
          >
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Concepto</th>
                    <th>Método</th>
                    <th>Importe</th>
                  </tr>
                </thead>

                <tbody>
                  {report.movements.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          textAlign: 'center',
                          padding: 30,
                        }}
                      >
                        No hay movimientos para
                        este período.
                      </td>
                    </tr>
                  ) : (
                    report.movements.map(
                      (movement) => (
                        <tr key={movement.id}>
                          <td>
                            {formatDateTime(
                              movement.date,
                            )}
                          </td>

                          <td>
                            <span
                              className={
                                movement.type.toLowerCase() ===
                                'ingreso'
                                  ? 'status paid'
                                  : 'status pending'
                              }
                            >
                              {movement.type}
                            </span>
                          </td>

                          <td>
                            {movement.concept}
                          </td>

                          <td>
                            {movement.payment_method}
                          </td>

                          <td>
                            <strong>
                              {money(
                                movement.amount,
                              )}
                            </strong>
                          </td>
                        </tr>
                      ),
                    )
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </Shell>
  )
}