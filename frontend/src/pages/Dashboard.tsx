
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Package,
  CheckCircle2,
  Search,
  Trash2,
  X,
  RefreshCw,
  CreditCard,
  CircleDollarSign,
  ArrowUpRight,
  TrendingUp,
  Plus,
} from 'lucide-react'

import { api, type Product, type Debt, type Sale, type SaleItemInput } from '../api'
import Shell from '../components/Shell'
import Kpi from '../components/Kpi'
import Panel from '../components/Panel'
import Empty from '../components/Empty'

const money = (n: number) => `S/ ${Number(n || 0).toFixed(2)}`

type CartItem = {
  product: Product
  quantity: number
}

export default function Dashboard() {
  const [sales, setSales] = useState<Sale[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchProduct, setSearchProduct] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState('Efectivo')
  const [notes, setNotes] = useState('')

  async function load() {
    try {
      const [salesData, debtsData, productsData] = await Promise.all([
        api.sales(),
        api.debts(),
        api.products(),
      ])

      setSales(salesData)
      setDebts(debtsData)
      setProducts(productsData)
      setError('')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const availableProducts = useMemo(() => {
    const term = searchProduct.trim().toLowerCase()

    if (!term) return []

    return products
      .filter((p) => p.active && p.stock > 0)
      .filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term),
      )
      .slice(0, 8)
  }, [products, searchProduct])

  function addToCart(product: Product) {
    setError('')
    setSuccess('')

    const existing = cart.find((item) => item.product.id === product.id)

    if (existing) {
      if (existing.quantity >= product.stock) {
        setError(`Solo hay ${product.stock} unidades de ${product.name}.`)
        return
      }

      setCart((current) =>
        current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      )
    } else {
      setCart((current) => [...current, { product, quantity: 1 }])
    }

    setSearchProduct('')
  }

  function changeQuantity(productId: number, quantity: number) {
    const product = products.find((p) => p.id === productId)
    if (!product) return

    if (quantity < 1) {
      removeFromCart(productId)
      return
    }

    if (quantity > product.stock) {
      setError(`Solo hay ${product.stock} unidades de ${product.name}.`)
      return
    }

    setError('')
    setCart((current) =>
      current.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item,
      ),
    )
  }

  function removeFromCart(productId: number) {
    setCart((current) =>
      current.filter((item) => item.product.id !== productId),
    )
  }

  const total = cart.reduce(
    (sum, item) =>
      sum + Number(item.product.sale_price) * item.quantity,
    0,
  )

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (cart.length === 0) {
      setError('Busca y agrega al menos un producto a la venta.')
      return
    }

    const items: SaleItemInput[] = cart.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: Number(item.product.sale_price),
      discount: 0,
    }))

    setLoading(true)

    try {
      await api.addSale({
        customer_id: null,
        items,
        discount: 0,
        tax: 0,
        payment_method: paymentMethod,
        status: 'Completada',
        notes: notes.trim() || null,
      })

      setCart([])
      setSearchProduct('')
      setPaymentMethod('Efectivo')
      setNotes('')
      setShowForm(false)
      setSuccess('¡Venta registrada correctamente!')
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const today = sales.reduce((sum, item) => {
    const saleDate = item.sale_date ? new Date(item.sale_date) : null

    if (!saleDate || Number.isNaN(saleDate.getTime())) return sum

    const now = new Date()
    const isToday =
      saleDate.getFullYear() === now.getFullYear() &&
      saleDate.getMonth() === now.getMonth() &&
      saleDate.getDate() === now.getDate()

    return isToday && item.status !== 'Anulada'
      ? sum + Number(item.total || 0)
      : sum
  }, 0)

  function productName(productId: number) {
    return products.find((p) => p.id === productId)?.name
      ?? `Producto #${productId}`
  }

  return (
    <Shell title="Dashboard" subtitle="Este es el resumen de tu negocio hoy.">
      <div className="welcome-strip">
        <div>
          <span className="welcome-tag">HEGORAS</span>
          <h2>Bienvenido <span>✦</span></h2>
          <p>Este es el resumen de tu operación. ¡Que tengas un excelente día!</p>
        </div>

        <div className="welcome-art">
          <div className="art-circle">
            <TrendingUp size={30} />
          </div>
          <div>
            <b>Tu negocio, en orden</b>
            <small>Controla ventas, caja e inventario.</small>
          </div>
        </div>
      </div>

      {error && (
        <div className="error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Cerrar error">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="success" role="status">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess('')} aria-label="Cerrar mensaje">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="kpi-grid">
        <Kpi
          label="Productos registrados"
          value={String(products.length)}
          icon={Package}
          tone="blue"
          note="En el catálogo"
        />
        <Kpi
          label="Cuentas pendientes"
          value={money(debts.reduce((sum, d) => sum + Number(d.balance || 0), 0))}
          icon={CreditCard}
          tone="orange"
          note="Saldo por cobrar"
        />
        <Kpi
          label="Ventas de hoy"
          value={money(today)}
          icon={CircleDollarSign}
          tone="green"
          note="Ventas no anuladas"
        />
      </div>

      <div className="dashboard-grid">
        <div className="stack">
          <Panel
            title="Registro de ventas"
            subtitle="Productos, útiles escolares y golosinas"
            action={
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setShowForm((current) => !current)
                  setError('')
                  setSuccess('')
                }}
              >
                {showForm ? <X size={16} /> : <Plus size={16} />}
                {showForm ? 'Cancelar' : 'Nueva venta'}
              </button>
            }
          >
            {showForm && (
              <form className="inline-form" onSubmit={submit}>
                <div className="product-search-field">
                  <label htmlFor="product-search">Buscar producto por nombre o SKU</label>
                  <div className="search-input-wrap">
                    <Search size={17} />
                    <input
                      id="product-search"
                      type="text"
                      autoComplete="off"
                      placeholder="Ej.: lapicero, chupete, cuaderno..."
                      value={searchProduct}
                      onChange={(e) => setSearchProduct(e.target.value)}
                    />
                  </div>

                  {searchProduct.trim() !== '' && (
                    <div className="product-suggestions">
                      {availableProducts.map((product) => (
                        <button
                          type="button"
                          key={product.id}
                          className="product-suggestion"
                          onClick={() => addToCart(product)}
                        >
                          <span className="suggestion-info">
                            <b>{product.name}</b>
                            <small>SKU: {product.sku}</small>
                          </span>
                          <span className="suggestion-price">
                            {money(Number(product.sale_price))}
                            <Plus size={16} />
                          </span>
                        </button>
                      ))}

                      {availableProducts.length === 0 && (
                        <p className="no-products-found">
                          No se encontraron productos disponibles.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="cart-section">
                  <h3>Productos seleccionados</h3>

                  {cart.length === 0 ? (
                    <Empty text="Busca un producto arriba para agregarlo a la venta." />
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Producto</th>
                            <th>Precio</th>
                            <th>Cantidad</th>
                            <th>Importe</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {cart.map((item) => (
                            <tr key={item.product.id}>
                              <td>
                                <b>{item.product.name}</b>
                                <small className="cart-sku">{item.product.sku}</small>
                              </td>
                              <td>{money(Number(item.product.sale_price))}</td>
                              <td>
                                <input
                                  className="quantity-input"
                                  type="number"
                                  min="1"
                                  max={item.product.stock}
                                  value={item.quantity}
                                  aria-label={`Cantidad de ${item.product.name}`}
                                  onChange={(e) =>
                                    changeQuantity(
                                      item.product.id,
                                      Number(e.target.value),
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <b>{money(Number(item.product.sale_price) * item.quantity)}</b>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="btn-icon-danger"
                                  title="Quitar producto"
                                  onClick={() => removeFromCart(item.product.id)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="sale-options">
                  <label>
                    Método de pago
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="Efectivo">Efectivo</option>
                      <option value="Tarjeta">Tarjeta</option>
                      <option value="Transferencia">Transferencia</option>
                      <option value="Yape">Yape</option>
                      <option value="Plin">Plin</option>
                    </select>
                  </label>

                  <label>
                    Nota (opcional)
                    <input
                      type="text"
                      maxLength={500}
                      placeholder="Detalle de la venta"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </label>
                </div>

                <div className="sale-total">
                  <span>Total de productos: <b>{cart.reduce((sum, item) => sum + item.quantity, 0)}</b></span>
                  <strong>Total: {money(total)}</strong>
                </div>

                <div className="sale-form-actions">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => {
                      setCart([])
                      setSearchProduct('')
                      setNotes('')
                      setPaymentMethod('Efectivo')
                      setError('')
                    }}
                  >
                    <Trash2 size={16} /> Limpiar
                  </button>

                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={loading || cart.length === 0}
                  >
                    {loading ? <RefreshCw className="spin" size={16} /> : <CheckCircle2 size={16} />}
                    {loading ? 'Guardando...' : 'Registrar venta'}
                  </button>
                </div>
              </form>
            )}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>N.º de venta</th>
                    <th>Productos</th>
                    <th>Fecha</th>
                    <th>Pago</th>
                    <th>Total</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((item) => (
                    <tr key={item.id}>
                      <td><b>{item.sale_number}</b></td>
                      <td>
                        {item.items?.length
                          ? item.items.map((detail) =>
                              `${productName(detail.product_id)} × ${detail.quantity}`,
                            ).join(', ')
                          : 'Sin detalle'}
                      </td>
                      <td>
                        {item.sale_date
                          ? new Date(item.sale_date).toLocaleString('es-PE')
                          : '—'}
                      </td>
                      <td>{item.payment_method}</td>
                      <td><b>{money(Number(item.total))}</b></td>
                      <td>
                        <span className={`status ${item.status === 'Anulada' ? 'pending' : 'paid'}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!sales.length && (
                <Empty text="Aún no hay ventas registradas. Usa Nueva venta para comenzar." />
              )}
            </div>
          </Panel>
        </div>

        <div className="stack">
          <Panel
            title="Cuentas por cobrar"
            subtitle="Seguimiento de deudas"
            action={
              <NavLink className="text-link" to="/mantenimientos/pagos">
                Ver todas <ArrowUpRight size={14} />
              </NavLink>
            }
          >
            <div className="debt-list">
              {debts.slice(0, 4).map((d) => (
                <div className="debt-item" key={d.id}>
                  <div className="debt-avatar">
                    {String(d.customer_id).slice(0, 1)}
                  </div>
                  <div className="debt-name">
                    <b>Cliente #{d.customer_id}</b>
                    <small>{d.description || 'Cuenta por cobrar'}</small>
                  </div>
                  <div className="debt-amount">
                    <b>{money(Number(d.balance || 0))}</b>
                    <span className={`status ${d.status === 'Pagado' ? 'paid' : 'pending'}`}>
                      {d.status}
                    </span>
                  </div>
                </div>
              ))}

              {!debts.length && <Empty text="No hay cuentas por cobrar." />}
            </div>
          </Panel>

          <Panel
            title="Resumen de caja"
            subtitle="Totales calculados a partir de la información disponible"
            action={
              <NavLink className="text-link" to="/mantenimientos/caja">
                Ver caja <ArrowUpRight size={14} />
              </NavLink>
            }
          >
            <div className="cash-summary">
              <div>
                <span>Ventas de hoy</span>
                <b>{money(today)}</b>
              </div>
              <div>
                <span>Saldo por cobrar</span>
                <b>{money(debts.reduce((sum, d) => sum + Number(d.balance || 0), 0))}</b>
              </div>
              <div>
                <span>Productos registrados</span>
                <b>{products.length}</b>
              </div>
            </div>

            <div className="cash-hint">
              <CheckCircle2 size={16} />
              Los importes se calculan con los datos recibidos de la API.
            </div>
          </Panel>
        </div>
      </div>
    </Shell>
  )
}
