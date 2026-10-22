
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Plus,
  Package,
  CheckCircle2,
  Pencil,
  Trash2,
  X,
  Search,
  RefreshCw,
  ShoppingCart,
  ShoppingBag,
  Minus,
  CreditCard,
  Receipt,
  Trash,
  ClipboardList,
} from 'lucide-react'

import {
  api,
  type Product,
  type ProductInput,
  type Category,
} from '../api'

import Shell from '../components/Shell'
import Kpi from '../components/Kpi'
import Panel from '../components/Panel'
import Empty from '../components/Empty'

type Tab = 'sale' | 'products'

type CartItem = {
  product: Product
  quantity: number
}

const money = (n: number) => `S/ ${Number(n || 0).toFixed(2)}`

const blankForm = {
  sku: '',
  name: '',
  description: '',
  category_id: '',
  sale_price: '0',
  active: true,
}

export default function Products() {
  const [tab, setTab] = useState<Tab>('sale')

  const [items, setItems] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  const [show, setShow] = useState(false)
  const [edit, setEdit] = useState<Product | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ ...blankForm })
  const [loading, setLoading] = useState(false)

  // Nueva venta
  const [productSearch, setProductSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState('Efectivo')
  const [notes, setNotes] = useState('')
  const [savingSale, setSavingSale] = useState(false)

  async function load() {
    try {
      const [productsData, categoriesData] = await Promise.all([
        api.products(),
        api.categories(),
      ])

      setItems(productsData)
      setCategories(categoriesData)
      setError('')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    return items.filter((product) => {
      const categoryName =
        categories.find((category) => category.id === product.category_id)
          ?.name ?? ''

      return `${product.name} ${product.sku} ${categoryName}`
        .toLowerCase()
        .includes(term)
    })
  }, [items, categories, search])

  const suggestions = useMemo(() => {
    const term = productSearch.trim().toLowerCase()

    if (!term) return []

    return items
      .filter((product) =>
        product.active &&
        `${product.name} ${product.sku}`.toLowerCase().includes(term)
      )
      .slice(0, 7)
  }, [items, productSearch])

  const total = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum + Number(item.product.sale_price) * item.quantity,
        0,
      ),
    [cart],
  )

  const units = cart.reduce(
    (sum, item) => sum + item.quantity,
    0,
  )

  function addToCart(product: Product) {
    setError('')
    setSuccess('')

    const existing = cart.find(
      (item) => item.product.id === product.id,
    )

    // El backend sigue controlando el stock real.
    if (existing && existing.quantity >= product.stock) {
      setError(
        `No hay más unidades disponibles de ${product.name}.`,
      )
      return
    }

    if (!existing && product.stock <= 0) {
      setError(
        `El producto "${product.name}" no tiene unidades disponibles.`,
      )
      return
    }

    setCart((current) => {
      const found = current.find(
        (item) => item.product.id === product.id,
      )

      if (found) {
        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }

      return [...current, { product, quantity: 1 }]
    })

    setProductSearch('')
  }

  function changeQuantity(productId: number, quantity: number) {
    const product = items.find((item) => item.id === productId)
    if (!product) return

    if (quantity <= 0) {
      setCart((current) =>
        current.filter((item) => item.product.id !== productId),
      )
      return
    }

    if (quantity > product.stock) {
      setError(`No hay suficientes unidades de ${product.name}.`)
      return
    }

    setError('')
    setCart((current) =>
      current.map((item) =>
        item.product.id === productId
          ? { ...item, quantity }
          : item,
      ),
    )
  }

  function clearSale() {
    setCart([])
    setPaymentMethod('Efectivo')
    setNotes('')
    setProductSearch('')
    setError('')
    setSuccess('')
  }

  async function submitSale(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!cart.length) {
      setError('Agrega al menos un producto al carrito.')
      return
    }

    const payload = {
      customer_id: null,
      items: cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: Number(item.product.sale_price),
        discount: 0,
      })),
      // Se envían en cero porque el backend actual todavía
      // espera estos campos en el esquema de ventas.
      discount: 0,
      tax: 0,
      payment_method: paymentMethod,
      status: 'Completada',
      notes: notes.trim() || null,
    }

    setSavingSale(true)

    try {
      const sale = await api.addSale(payload)

      setSuccess(
        `Venta ${sale.sale_number} registrada correctamente. Total: ${money(sale.total)}.`,
      )

      clearSale()
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSavingSale(false)
    }
  }

  function openNew() {
    setEdit(null)
    setForm({ ...blankForm })
    setError('')
    setSuccess('')
    setShow(true)
  }

  function openEdit(product: Product) {
    setEdit(product)

    setForm({
      sku: product.sku,
      name: product.name,
      description: product.description ?? '',
      category_id:
        product.category_id == null
          ? ''
          : String(product.category_id),
      sale_price: String(product.sale_price),
      active: product.active,
    })

    setError('')
    setSuccess('')
    setShow(true)
  }

  function closeForm() {
    setShow(false)
    setEdit(null)
    setForm({ ...blankForm })
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const salePrice = Number(form.sale_price)

    if (!form.sku.trim() || !form.name.trim()) {
      setError('Ingresa el código y el nombre del producto.')
      return
    }

    if (!Number.isFinite(salePrice) || salePrice < 0) {
      setError('El precio de venta debe ser un número válido y no negativo.')
      return
    }

    /*
     * Compatibilidad temporal con tu API actual:
     * main.py todavía exige purchase_price, stock y min_stock.
     *
     * En productos nuevos se inicializa stock en 0 para no inventar
     * existencias. Para venderlos, deberán contar con stock registrado
     * en la base de datos o modificaremos el backend para no controlarlo.
     */
    const payload: ProductInput = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      category_id: form.category_id
        ? Number(form.category_id)
        : null,
      purchase_price: edit?.purchase_price ?? 0,
      sale_price: salePrice,
      stock: edit?.stock ?? 0,
      min_stock: edit?.min_stock ?? 0,
      active: form.active,
    }

    setLoading(true)

    try {
      if (edit) {
        await api.updateProduct(edit.id, payload)
        setSuccess('Producto actualizado correctamente.')
      } else {
        await api.addProduct(payload)
        setSuccess('Producto registrado correctamente.')
      }

      closeForm()
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function remove(product: Product) {
    if (
      !window.confirm(
        `¿Eliminar el producto "${product.name}"?`,
      )
    ) {
      return
    }

    setError('')
    setSuccess('')

    try {
      await api.deleteProduct(product.id)
      setSuccess('Producto eliminado correctamente.')
      await load()
    } catch (e) {
      setError(
        `No se pudo eliminar "${product.name}". ${(e as Error).message}`,
      )
    }
  }

  function categoryName(categoryId: number | null | undefined) {
    if (categoryId == null) return 'Sin categoría'

    return (
      categories.find((category) => category.id === categoryId)?.name ??
      `Categoría #${categoryId}`
    )
  }

  return (
    <Shell
      title="Productos"
      subtitle="Gestiona tus ventas y tu catálogo desde un solo módulo."
    >
      {error && (
        <div className="error" role="alert">
          <span>{error}</span>
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
          <span>{success}</span>
          <button
            type="button"
            onClick={() => setSuccess('')}
            aria-label="Cerrar mensaje"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Pestañas: Nueva venta primero, Productos después */}
      <div
        className="products-tabs"
        role="tablist"
        aria-label="Secciones del módulo"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'sale'}
          className={`products-tab ${tab === 'sale' ? 'active' : ''}`}
          onClick={() => {
            setTab('sale')
            setError('')
            setSuccess('')
          }}
        >
          <ShoppingCart size={18} />
          Nueva venta
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={tab === 'products'}
          className={`products-tab ${tab === 'products' ? 'active' : ''}`}
          onClick={() => {
            setTab('products')
            setError('')
            setSuccess('')
          }}
        >
          <Package size={18} />
          Productos
          <span className="products-tab-count">{items.length}</span>
        </button>
      </div>

      {tab === 'sale' ? (
        <>
          <div className="kpi-grid three">
            <Kpi
              label="Productos en catálogo"
              value={String(items.filter((product) => product.active).length)}
              icon={Package}
              tone="blue"
              note="Productos activos"
            />

            <Kpi
              label="Unidades en carrito"
              value={String(units)}
              icon={ShoppingBag}
              tone="green"
              note="Productos seleccionados"
            />

            <Kpi
              label="Total de la venta"
              value={money(total)}
              icon={Receipt}
              tone="blue"
              note="Sin descuentos ni impuestos adicionales"
            />
          </div>

          <Panel
            title="Nueva venta"
            subtitle="Busca los productos, elige las cantidades y registra la venta."
            action={
              <button
                type="button"
                className="btn btn-light"
                onClick={clearSale}
                disabled={savingSale}
              >
                <Trash size={15} />
                Limpiar
              </button>
            }
          >
            <form className="new-sale-form" onSubmit={submitSale}>
              <div className="sale-search-area">
                <label
                  className="sale-field-label"
                  htmlFor="sale-product-search"
                >
                  Buscar producto
                </label>

                <div className="product-search-field">
                  <div className="search-input-wrap">
                    <Search size={19} />

                    <input
                      id="sale-product-search"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Escribe el nombre o código SKU..."
                      autoComplete="off"
                    />

                    {productSearch && (
                      <button
                        type="button"
                        className="sale-search-clear"
                        onClick={() => setProductSearch('')}
                        aria-label="Limpiar búsqueda"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {productSearch.trim() && (
                    <div className="product-suggestions">
                      {suggestions.length ? (
                        suggestions.map((product) => (
                          <button
                            type="button"
                            className="product-suggestion"
                            key={product.id}
                            onClick={() => addToCart(product)}
                          >
                            <span className="suggestion-product-icon">
                              <Package size={19} />
                            </span>

                            <span className="suggestion-info">
                              <strong>{product.name}</strong>
                              <small>SKU: {product.sku}</small>
                            </span>

                            <span className="suggestion-price">
                              {money(product.sale_price)}
                              <span>+ Agregar</span>
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="no-products-found">
                          No se encontraron productos con esa búsqueda.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <p className="sale-help-text">
                  Selecciona un producto de las sugerencias para añadirlo al carrito.
                </p>
              </div>

              <div className="sale-cart-panel">
                <div className="sale-section-heading">
                  <div className="sale-heading-icon">
                    <ShoppingCart size={19} />
                  </div>

                  <div>
                    <h3>Productos seleccionados</h3>
                    <p>
                      {cart.length}{' '}
                      {cart.length === 1
                        ? 'tipo de producto'
                        : 'tipos de producto'}{' '}
                      en el carrito
                    </p>
                  </div>
                </div>

                {!cart.length ? (
                  <div className="sale-empty-cart">
                    <div className="sale-empty-icon">
                      <ShoppingBag size={28} />
                    </div>

                    <strong>Tu carrito está vacío</strong>
                    <p>Busca un producto arriba para agregarlo a la venta.</p>
                  </div>
                ) : (
                  <div className="sale-cart-table-wrap">
                    <table className="sale-cart-table">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Precio</th>
                          <th>Cantidad</th>
                          <th>Importe</th>
                          <th aria-label="Acciones" />
                        </tr>
                      </thead>

                      <tbody>
                        {cart.map(({ product, quantity }) => (
                          <tr key={product.id}>
                            <td>
                              <div className="sale-cart-product">
                                <strong>{product.name}</strong>
                                <small>SKU: {product.sku}</small>
                              </div>
                            </td>

                            <td>{money(product.sale_price)}</td>

                            <td>
                              <div className="sale-quantity-control">
                                <button
                                  type="button"
                                  onClick={() =>
                                    changeQuantity(product.id, quantity - 1)
                                  }
                                  aria-label={`Reducir cantidad de ${product.name}`}
                                >
                                  <Minus size={13} />
                                </button>

                                <input
                                  type="number"
                                  min="1"
                                  max={product.stock}
                                  value={quantity}
                                  onChange={(e) =>
                                    changeQuantity(
                                      product.id,
                                      Number(e.target.value),
                                    )
                                  }
                                  aria-label={`Cantidad de ${product.name}`}
                                />

                                <button
                                  type="button"
                                  disabled={quantity >= product.stock}
                                  onClick={() =>
                                    changeQuantity(product.id, quantity + 1)
                                  }
                                  aria-label={`Aumentar cantidad de ${product.name}`}
                                >
                                  <Plus size={13} />
                                </button>
                              </div>
                            </td>

                            <td>
                              <strong className="sale-line-total">
                                {money(product.sale_price * quantity)}
                              </strong>
                            </td>

                            <td>
                              <button
                                type="button"
                                className="btn-icon-danger"
                                onClick={() =>
                                  setCart((current) =>
                                    current.filter(
                                      (item) =>
                                        item.product.id !== product.id,
                                    ),
                                  )
                                }
                                aria-label={`Quitar ${product.name}`}
                                title="Quitar producto"
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

              <div className="sale-bottom-grid">
                <div className="sale-details-panel">
                  <div className="sale-section-heading">
                    <div className="sale-heading-icon">
                      <ClipboardList size={19} />
                    </div>

                    <div>
                      <h3>Datos de la venta</h3>
                      <p>Selecciona el método de pago.</p>
                    </div>
                  </div>

                  <div className="sale-options">
                    <label>
                      <span>
                        <CreditCard size={14} />
                        Método de pago
                      </span>

                      <select
                        value={paymentMethod}
                        onChange={(e) =>
                          setPaymentMethod(e.target.value)
                        }
                      >
                        <option value="Efectivo">Efectivo</option>
                        <option value="Tarjeta">Tarjeta</option>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Billetera digital">
                          Billetera digital
                        </option>
                        <option value="Crédito">Crédito / Fiado</option>
                      </select>
                    </label>

                    <label className="sale-note-field">
                      <span>Nota (opcional)</span>
                      <input
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        maxLength={500}
                        placeholder="Detalle de la venta..."
                      />
                    </label>
                  </div>

                  {paymentMethod === 'Crédito' && (
                    <p className="sale-credit-notice">
                      <CheckCircle2 size={15} />
                      La venta se registrará sin seleccionar un cliente.
                      Recuerda registrar la deuda del cliente desde el módulo
                      de cuentas por cobrar.
                    </p>
                  )}
                </div>

                <aside className="sale-summary-panel">
                  <div className="sale-summary-heading">
                    <Receipt size={19} />
                    Resumen de venta
                  </div>

                  <div className="sale-summary-row">
                    <span>Productos</span>
                    <strong>{units} unidades</strong>
                  </div>

                  <div className="sale-summary-row">
                    <span>Total de productos</span>
                    <strong>{money(total)}</strong>
                  </div>

                  <div className="sale-summary-divider" />

                  <div className="sale-grand-total">
                    <span>Total a pagar</span>
                    <strong>{money(total)}</strong>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary sale-submit-btn"
                    disabled={savingSale || !cart.length}
                  >
                    {savingSale ? (
                      <RefreshCw size={17} className="spin" />
                    ) : (
                      <CheckCircle2 size={18} />
                    )}

                    {savingSale
                      ? 'Registrando venta...'
                      : 'Registrar venta'}
                  </button>

                  <p className="sale-summary-footnote">
                    Verifica los productos y las cantidades antes de confirmar.
                  </p>
                </aside>
              </div>
            </form>
          </Panel>
        </>
      ) : (
        <>
          <div className="kpi-grid three">
            <Kpi
              label="Total de productos"
              value={String(items.length)}
              icon={Package}
              tone="blue"
              note="En el catálogo"
            />

            <Kpi
              label="Productos activos"
              value={String(items.filter((product) => product.active).length)}
              icon={CheckCircle2}
              tone="green"
              note="Disponibles en el catálogo"
            />

            <Kpi
              label="Categorías"
              value={String(categories.filter((category) => category.active).length)}
              icon={ShoppingBag}
              tone="blue"
              note="Categorías activas"
            />
          </div>

          <Panel
            title="Catálogo de productos"
            subtitle="Registra y administra los productos y sus precios de venta."
            action={
              <button
                type="button"
                className="btn btn-primary"
                onClick={openNew}
              >
                <Plus size={16} />
                Nuevo producto
              </button>
            }
          >
            {show && (
              <form className="form-card" onSubmit={submit}>
                <div className="form-card-head">
                  <h3>{edit ? 'Editar producto' : 'Registrar producto'}</h3>

                  <button
                    type="button"
                    className="icon-button"
                    onClick={closeForm}
                    aria-label="Cerrar formulario"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="form-grid">
                  <label>
                    Código / SKU
                    <input
                      value={form.sku}
                      onChange={(e) =>
                        setForm({ ...form, sku: e.target.value })
                      }
                      maxLength={40}
                      placeholder="Ej. GOL-001"
                      required
                    />
                  </label>

                  <label>
                    Nombre del producto
                    <input
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      maxLength={150}
                      placeholder="Ej. Paleta de fresa"
                      required
                    />
                  </label>

                  <label>
                    Categoría
                    <select
                      value={form.category_id}
                      onChange={(e) =>
                        setForm({ ...form, category_id: e.target.value })
                      }
                    >
                      <option value="">Sin categoría</option>

                      {categories
                        .filter((category) => category.active)
                        .map((category) => (
                          <option
                            key={category.id}
                            value={category.id}
                          >
                            {category.name}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label>
                    Precio de venta (S/)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.sale_price}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          sale_price: e.target.value,
                        })
                      }
                      required
                    />
                  </label>

                  <label>
                    Descripción
                    <input
                      value={form.description}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          description: e.target.value,
                        })
                      }
                      placeholder="Descripción opcional"
                    />
                  </label>

                  <label className="product-active-field">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          active: e.target.checked,
                        })
                      }
                    />
                    Producto activo y disponible para venta
                  </label>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={closeForm}
                    disabled={loading}
                  >
                    Cancelar
                  </button>

                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={loading}
                  >
                    {loading && (
                      <RefreshCw size={15} className="spin" />
                    )}

                    {loading
                      ? 'Guardando...'
                      : edit
                        ? 'Guardar cambios'
                        : 'Registrar producto'}
                  </button>
                </div>
              </form>
            )}

            <div className="table-toolbar">
              <div className="search-field">
                <Search size={17} />

                <input
                  placeholder="Buscar por nombre, código o categoría..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <span>{filtered.length} productos</span>

              <button
                type="button"
                className="btn btn-light"
                onClick={() => void load()}
              >
                <RefreshCw size={15} />
                Actualizar
              </button>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Precio de venta</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <span className="sku">{product.sku}</span>
                      </td>

                      <td>
                        <div className="product-cell">
                          <div className="product-symbol">
                            <Package size={17} />
                          </div>

                          <div>
                            <b>{product.name}</b>

                            {product.description && (
                              <small className="product-description">
                                {product.description}
                              </small>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>{categoryName(product.category_id)}</td>

                      <td>
                        <b>{money(product.sale_price)}</b>
                      </td>

                      <td>
                        <span
                          className={`status ${
                            product.active ? 'paid' : 'pending'
                          }`}
                        >
                          {product.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="action-btn"
                            title="Editar producto"
                            aria-label={`Editar ${product.name}`}
                            onClick={() => openEdit(product)}
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            className="action-btn danger"
                            title="Eliminar producto"
                            aria-label={`Eliminar ${product.name}`}
                            onClick={() => void remove(product)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!filtered.length && (
                <Empty
                  text={
                    items.length
                      ? 'No se encontraron productos. Prueba con otra búsqueda.'
                      : 'Todavía no hay productos registrados.'
                  }
                />
              )}
            </div>
          </Panel>
        </>
      )}
    </Shell>
  )
}
