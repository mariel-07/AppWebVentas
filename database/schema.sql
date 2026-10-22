-- Ejecutar en Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  category_name text not null default 'General',
  price numeric(12,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  reference text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.receivables (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  concept text not null,
  amount numeric(12,2) not null check (amount >= 0),
  status text not null default 'Pendiente' check (status in ('Pendiente','Pagado')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  internet_amount numeric(12,2) not null default 0 check (internet_amount >= 0),
  print_amount numeric(12,2) not null default 0 check (print_amount >= 0),
  product_amount numeric(12,2) not null default 0 check (product_amount >= 0),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.cash_closings (
  id uuid primary key default gen_random_uuid(),
  business_date date not null default current_date,
  opening_cash numeric(12,2) not null default 109,
  print_total numeric(12,2) not null default 14.10,
  product_total numeric(12,2) not null default 72.80,
  payment_total numeric(12,2) not null default 0,
  recharge_total numeric(12,2) not null default 0,
  bills numeric(12,2) not null default 0,
  coins numeric(12,2) not null default 0,
  debts numeric(12,2) not null default 0,
  other_amount numeric(12,2) not null default 0,
  yape numeric(12,2) not null default 25.40,
  expected_total numeric(12,2) not null default 195.90,
  counted_total numeric(12,2) not null default 0,
  difference numeric(12,2) not null default -195.90,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_name on public.products(name);
create index if not exists idx_receivables_status on public.receivables(status);
create index if not exists idx_sales_created_at on public.sales(created_at desc);
create index if not exists idx_cash_closings_date on public.cash_closings(business_date desc);

-- Datos iniciales opcionales para empezar con ejemplos.
insert into public.categories(name) values ('Golosinas'), ('Bebidas'), ('Útiles'), ('Impresiones'), ('General')
on conflict (name) do nothing;

insert into public.products(sku,name,category_name,price,stock) values
('PRD-001','Galletas','Golosinas',1.50,12),
('PRD-002','Agua mineral','Bebidas',2.00,4),
('PRD-003','Caramelos','Golosinas',0.50,3),
('PRD-004','Lapicero azul','Útiles',1.00,20)
on conflict (sku) do nothing;

insert into public.receivables(customer_name,concept,amount,status) values
('Cliente de ejemplo','Impresiones pendientes',25.40,'Pendiente'),
('Cliente frecuente','Abono anterior',15.00,'Pagado')
on conflict do nothing;
