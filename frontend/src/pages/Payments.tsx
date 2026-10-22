
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Plus,
  Wallet,
  CheckCircle2,
  CreditCard,
  X,
  Search,
  RefreshCw,
  Pencil,
} from 'lucide-react'

import { api, type Debt, type Customer } from '../api'
import Shell from '../components/Shell'
import Kpi from '../components/Kpi'
import Panel from '../components/Panel'
import Empty from '../components/Empty'

const money = (n: number) => `S/ ${Number(n || 0).toFixed(2)}`

const initialForm = {
  customer_name: '',
  description: '',
  original_amount: '',
}

export default function Payments() {
  const [items, setItems] = useState<Debt[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [show, setShow] = useState(false)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todas')
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)

  async function load() {
    try {
      const [debtsData, customersData] = await Promise.all([
        api.debts(),
        api.customers(),
      ])

      setItems(debtsData)
      setCustomers(customersData)
      setError('')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const pending = items.filter((d) => Number(d.balance) > 0)

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase()

    return items.filter((debt) => {
      const customer = customers.find(
        (c) => c.id === debt.customer_id,
      )

      const matchesSearch =
        !term ||
        (customer?.name ?? '').toLowerCase().includes(term) ||
        (debt.description ?? '').toLowerCase().includes(term) ||
        String(debt.id).includes(term)

      const balance = Number(debt.balance || 0)

      const matchesStatus =
        statusFilter === 'Todas' ||
        (statusFilter === 'Pendiente' && balance > 0) ||
        (statusFilter === 'Pagado' && balance <= 0)

      return matchesSearch && matchesStatus
    })
  }, [items, customers, search, statusFilter])

  function startNewDebt() {
    setEditingDebt(null)
    setForm({ ...initialForm })
    setShow(true)
    setError('')
    setSuccess('')
  }

  function startEditDebt(debt: Debt) {
    setEditingDebt(debt)
    setForm({
      customer_name: customerName(debt.customer_id),
      description: debt.description || '',
      original_amount: String(debt.original_amount ?? ''),
    })
    setShow(true)
    setError('')
    setSuccess('')
  }

  function cancelForm() {
    setShow(false)
    setEditingDebt(null)
    setForm({ ...initialForm })
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const customerNameValue = form.customer_name.trim()
    const description = form.description.trim()
    const amount = Number(form.original_amount)

    if (!customerNameValue) {
      setError('Escribe el nombre del cliente.')
      return
    }

    if (!description) {
      setError('Ingresa el concepto de la deuda.')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('El monto debe ser mayor que cero.')
      return
    }

    // Al editar, no permitimos que el monto original sea menor
    // que lo que el cliente ya abonó.
    if (editingDebt && amount < Number(editingDebt.paid_amount || 0)) {
      setError(
        `El monto no puede ser menor que lo ya abonado (${money(
          Number(editingDebt.paid_amount || 0),
        )}).`,
      )
      return
    }

    setLoading(true)

    try {
      if (editingDebt) {
        // Se actualiza la deuda existente, conservando los abonos.
        await api.updateDebt(editingDebt.id, {
          description,
          original_amount: amount,
        })

        setSuccess('La deuda se actualizó correctamente.')
      } else {
        // Busca el cliente por nombre; si no existe, lo registra.
        let customer = customers.find(
          (c) =>
            c.name.trim().toLowerCase() ===
            customerNameValue.toLowerCase(),
        )

        if (!customer) {
          customer = await api.addCustomer({
            name: customerNameValue,
          } as Omit<Customer, 'id'>)
        }

        await api.addDebt({
          customer_id: customer.id,
          description,
          original_amount: amount,
          due_date: null,
        })

        setSuccess('La cuenta por cobrar se registró correctamente.')
      }

      cancelForm()
      await load()
    } catch (e) {
      setError(
        (e as Error).message ||
          'No se pudo guardar la cuenta. Verifica los datos.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function pay(debt: Debt) {
    const balance = Number(debt.balance || 0)

    if (balance <= 0) {
      setError('Esta cuenta ya no tiene saldo pendiente.')
      return
    }

    const enteredAmount = window.prompt(
      `Saldo pendiente: ${money(balance)}\n¿Cuánto dinero recibiste?`,
      balance.toFixed(2),
    )

    if (enteredAmount === null) return

    const amount = Number(enteredAmount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Ingresa un monto válido mayor que cero.')
      return
    }

    if (amount > balance) {
      setError(`El abono no puede superar el saldo de ${money(balance)}.`)
      return
    }

    const paymentMethod = window.prompt(
      'Método de pago: Efectivo, Yape, Plin, Tarjeta o Transferencia',
      'Efectivo',
    )

    if (paymentMethod === null) return

    const allowedMethods = [
      'Efectivo',
      'Yape',
      'Plin',
      'Tarjeta',
      'Transferencia',
    ]

    const normalizedMethod = allowedMethods.find(
      (method) =>
        method.toLowerCase() === paymentMethod.trim().toLowerCase(),
    )

    if (!normalizedMethod) {
      setError('Selecciona un método de pago válido.')
      return
    }

    setError('')
    setSuccess('')

    try {
      await api.payDebt(debt.id, {
        amount,
        payment_method: normalizedMethod,
      })

      setSuccess('El abono se registró correctamente.')
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  function customerName(customerId: number) {
    return customers.find((c) => c.id === customerId)?.name
      ?? `Cliente #${customerId}`
  }

  return (
    <Shell
      title="Deudas / Cuentas por cobrar"
      subtitle="Registra deudas, edita sus montos y controla los abonos recibidos."
    >
      {error && (
        <div className="error" role="alert">
          {error}
          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Cerrar error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="success" role="status">
          {success}
          <button
            type="button"
            onClick={() => setSuccess('')}
            aria-label="Cerrar mensaje"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="kpi-grid three">
        <Kpi
          label="Saldo pendiente"
          value={money(
            pending.reduce((sum, d) => sum + Number(d.balance || 0), 0),
          )}
          icon={Wallet}
          tone="orange"
          note="Dinero por cobrar"
        />
        <Kpi
          label="Total abonado"
          value={money(
            items.reduce((sum, d) => sum + Number(d.paid_amount || 0), 0),
          )}
          icon={CheckCircle2}
          tone="green"
          note="Abonos registrados"
        />
        <Kpi
          label="Cuentas pendientes"
          value={String(pending.length)}
          icon={CreditCard}
          tone="blue"
          note="Con saldo por cobrar"
        />
      </div>

      <Panel
        title="Cuentas por cobrar"
        subtitle="Consulta, edita y registra los abonos de las deudas."
        action={
          <button
            type="button"
            className="btn btn-primary"
            onClick={show ? cancelForm : startNewDebt}
          >
            {show ? <X size={16} /> : <Plus size={16} />}
            {show ? 'Cancelar' : 'Nueva cuenta'}
          </button>
        }
      >
        {show && (
          <form className="form-card" onSubmit={submit}>
            <div className="form-card-head">
              <h3>
                {editingDebt
                  ? `Editar deuda #${editingDebt.id}`
                  : 'Registrar cuenta por cobrar'}
              </h3>

              <button
                type="button"
                className="icon-button"
                onClick={cancelForm}
                aria-label="Cerrar formulario"
              >
                <X size={18} />
              </button>
            </div>

            <div className="form-grid">
              <label>
                Nombre del cliente
                <input
                  value={form.customer_name}
                  onChange={(e) =>
                    setForm({ ...form, customer_name: e.target.value })
                  }
                  placeholder="Escribe el nombre del cliente"
                  maxLength={150}
                  required
                  disabled={Boolean(editingDebt)}
                />
                {editingDebt && (
                  <small>El cliente de esta deuda no se puede cambiar.</small>
                )}
              </label>

              <label>
                Concepto de la deuda
                <input
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Ej. Compra de productos"
                  maxLength={250}
                  required
                />
              </label>

              <label>
                Monto original (S/)
                <input
                  type="number"
                  min={Math.max(
                    0.01,
                    Number(editingDebt?.paid_amount || 0),
                  )}
                  step="0.01"
                  value={form.original_amount}
                  onChange={(e) =>
                    setForm({ ...form, original_amount: e.target.value })
                  }
                  placeholder="0.00"
                  required
                />
                {editingDebt && (
                  <small>
                    Ya abonado: {money(Number(editingDebt.paid_amount || 0))}.
                    Puedes aumentar el monto sin perder los abonos.
                  </small>
                )}
              </label>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-light"
                onClick={cancelForm}
              >
                Cancelar
              </button>

              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
              >
                {loading && <RefreshCw size={15} className="spin" />}
                {editingDebt ? 'Guardar cambios' : 'Guardar cuenta'}
              </button>
            </div>
          </form>
        )}

        <div className="payment-filters">
          <label className="payment-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente, concepto o número..."
            />
          </label>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filtrar por estado"
          >
            <option value="Todas">Todas las cuentas</option>
            <option value="Pendiente">Con saldo pendiente</option>
            <option value="Pagado">Pagadas</option>
          </select>

          <button
            type="button"
            className="btn btn-light"
            onClick={() => void load()}
          >
            <RefreshCw size={15} /> Actualizar
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Concepto</th>
                <th>Monto original</th>
                <th>Abonado</th>
                <th>Saldo</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>

            <tbody>
              {filteredItems.map((debt) => {
                const balance = Number(debt.balance || 0)
                const isPaid = balance <= 0
                const paidAmount = Number(debt.paid_amount || 0)

                return (
                  <tr key={debt.id}>
                    <td>
                      <div className="product-cell">
                        <div className="debt-avatar">
                          {customerName(debt.customer_id)
                            .slice(0, 1)
                            .toUpperCase()}
                        </div>
                        <b>{customerName(debt.customer_id)}</b>
                      </div>
                    </td>

                    <td>{debt.description || 'Sin descripción'}</td>
                    <td>{money(Number(debt.original_amount))}</td>
                    <td>{money(paidAmount)}</td>
                    <td><b>{money(balance)}</b></td>

                    <td>
                      <span
                        className={`status ${isPaid ? 'paid' : 'pending'}`}
                      >
                        {isPaid
                          ? 'Pagado'
                          : paidAmount > 0
                            ? 'Parcial'
                            : debt.status}
                      </span>
                    </td>

                    <td>
                      <div className="payment-actions">
                        <button
                          type="button"
                          className="btn btn-small btn-light"
                          onClick={() => startEditDebt(debt)}
                          title="Editar deuda"
                        >
                          <Pencil size={14} /> Editar
                        </button>

                        {!isPaid && (
                          <button
                            type="button"
                            className="btn btn-small btn-success"
                            onClick={() => void pay(debt)}
                          >
                            <CheckCircle2 size={14} /> Abonar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {!filteredItems.length && (
            <Empty
              text={
                items.length
                  ? 'No se encontraron cuentas con esos filtros.'
                  : 'Todavía no hay cuentas por cobrar registradas.'
              }
            />
          )}
        </div>
      </Panel>
    </Shell>
  )
}
