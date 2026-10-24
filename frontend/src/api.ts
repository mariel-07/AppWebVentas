
const API = "http://127.0.0.1:8000";

// ===============================
// TIPOS
// ===============================

export type Product = {
  id: number;
  sku: string;
  name: string;
  description?: string | null;
  category_id?: number | null;
  purchase_price: number;
  sale_price: number;
  stock: number;
  min_stock: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Customer = {
  id: number;
  name: string;
  document_type?: string | null;
  document_number?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  active: boolean;
  created_at?: string;
};

export type Debt = {
  id: number;
  sale_id?: number | null;
  customer_id: number;
  description?: string | null;
  original_amount: number;
  paid_amount: number;
  balance: number | null;
  due_date?: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
};

export type SaleItem = {
  id?: number;
  sale_id?: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  discount: number;
  line_total?: number;
};

export type Sale = {
  id: number;
  sale_number: string;
  customer_id?: number | null;
  sale_date: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_method: string;
  status: string;
  notes?: string | null;
  items: SaleItem[];
  created_at?: string;
};

export type Dashboard = {
  products: number;
  low_stock: number;
  pending: number;
  paid_today: number;
  sales_today: number;
};

export type ProductInput = {
  sku: string;
  name: string;
  description?: string | null;
  category_id?: number | null;
  purchase_price: number;
  sale_price: number;
  stock: number;
  min_stock: number;
  active?: boolean;
};


export type DebtInput = {
  customer_id: number;
  sale_id?: number | null;
  description?: string | null;
  original_amount: number;
  paid_amount?: number;
};


export type DebtPaymentInput = {
  amount: number;
  payment_method: string;
};

export type SaleItemInput = {
  product_id: number;
  quantity: number;
  unit_price?: number;
  discount?: number;
};

export type SaleInput = {
  customer_id?: number | null;
  items: SaleItemInput[];
  discount?: number;
  tax?: number;
  payment_method?: string;
  status?: string;
  notes?: string | null;
};

export type Category = {
  id: number
  name: string
  description?: string | null
  active: boolean
}
export type CashReport = {
  start_date: string;
  end_date: string;

  summary: {
    sales: number;
    income: number;
    expenses: number;
    net: number;
    sales_count: number;
    income_movements: number;
    expense_movements: number;
  };

  payment_methods: {
    cash: number;
    yape: number;
    plin: number;
    card: number;
    transfer: number;
    other: number;
  };

  daily: {
    date: string;
    sales: number;
    income: number;
    expenses: number;
    net: number;
  }[];

  movements: {
    id: number;
    date: string;
    type: string;
    concept: string;
    amount: number;
    payment_method: string;
    sale_id?: number | null;
    receivable_payment_id?: number | null;
    notes?: string | null;
  }[];
};
// ===============================
// PETICIONES HTTP
// ===============================

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  headers.set("Accept", "application/json");

  let response: Response;

  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      `No se pudo conectar con el servidor: ${API}. Verifica que FastAPI esté ejecutándose.`
    );
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const detail = data?.detail;

    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail
              .map((item: { msg?: string }) => item.msg || "")
              .filter(Boolean)
              .join(", ")
          : `Error HTTP ${response.status}`;

    throw new Error(message || `Error HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

// ===============================
// API DEL SISTEMA
// ===============================

export const api = {
  
  // ===============================
// REPORTES
// ===============================

cashReport: (startDate: string, endDate: string) =>
  request<CashReport>(
    `/api/reports/cash?start_date=${encodeURIComponent(
      startDate,
    )}&end_date=${encodeURIComponent(endDate)}`
  ),
  
updateDebt: (
  id: number,
  data: {
    description: string
    original_amount: number
  },
) =>
  request<Debt>(`/api/receivables/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // PRODUCTOS

  products: () =>
    request<Product[]>("/api/products"),

  addProduct: (product: ProductInput) =>
    request<Product>("/api/products", {
      method: "POST",
      body: JSON.stringify(product),
    }),

  updateProduct: (id: number, product: ProductInput) =>
    request<Product>(`/api/products/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(product),
    }),

  deleteProduct: (id: number) =>
    request<void>(`/api/products/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  // CLIENTES

  


  customers: () =>
    request<Customer[]>("/api/customers"),

  addCustomer: (customer: {
    name: string;
    document_type?: string | null;
    document_number?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  }) =>
    request<Customer>("/api/customers", {
      method: "POST",
      body: JSON.stringify(customer),
    }),

  // CUENTAS POR COBRAR

categories: () =>
  request<Category[]>('/api/categories'),

  debts: () =>
    request<Debt[]>("/api/receivables"),

  addDebt: (debt: DebtInput) =>
    request<Debt>("/api/receivables", {
      method: "POST",
      body: JSON.stringify(debt),
    }),

  payDebt: (id: number, payment: DebtPaymentInput) =>
    request<Debt>(
      `/api/receivables/${encodeURIComponent(id)}/pay`,
      {
        method: "POST",
        body: JSON.stringify(payment),
      }
    ),

  // VENTAS

  sales: () =>
    request<Sale[]>("/api/sales"),

  addSale: (sale: SaleInput) =>
    request<Sale>("/api/sales", {
      method: "POST",
      body: JSON.stringify(sale),
    }),

  // DASHBOARD

  dashboard: () =>
    request<Dashboard>("/api/dashboard"),
};
