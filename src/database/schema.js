/**
 * SQLite Database Schema DDL & Performance Indexes
 * Normalized schema designed to handle 1,000,000+ business records.
 */

export const SCHEMA_VERSION = 1;

export const INITIAL_TABLES_SQL = `
-- Migration tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

-- Application key-value settings
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Clothing Categories
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TEXT NOT NULL
);

-- Master Clothing Products
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  sku TEXT UNIQUE,
  description TEXT,
  image_uri TEXT,
  default_purchase_cost INTEGER NOT NULL DEFAULT 0,
  default_selling_price INTEGER NOT NULL DEFAULT 0,
  min_stock_alert INTEGER NOT NULL DEFAULT 5,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Product Variations (Sizes & Colors)
CREATE TABLE IF NOT EXISTS product_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  color TEXT NOT NULL,
  sku TEXT UNIQUE,
  purchase_cost INTEGER,
  selling_price INTEGER,
  current_stock INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(product_id, size, color)
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Stock Movements (Audit log of every stock alteration)
CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  movement_type TEXT NOT NULL, -- PURCHASE, SALE, RETURN, DAMAGE, LOST, ADJUSTMENT
  quantity_change INTEGER NOT NULL, -- positive for increase, negative for deduction
  balance_after INTEGER NOT NULL,
  reference_type TEXT, -- 'PURCHASE', 'SALE', 'RETURN', 'MANUAL'
  reference_id INTEGER,
  reason TEXT,
  created_at TEXT NOT NULL
);

-- Purchases / Inward Stock
CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT NOT NULL UNIQUE,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  purchase_date TEXT NOT NULL, -- YYYY-MM-DD
  subtotal INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  additional_costs INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  balance_amount INTEGER NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'PAID', -- PAID, PARTIAL, UNPAID
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'COMPLETED', -- COMPLETED, CANCELLED
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Purchase Line Items
CREATE TABLE IF NOT EXISTS purchase_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  unit_cost INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

-- Sales / POS Transactions
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  customer_name_snapshot TEXT,
  customer_phone_snapshot TEXT,
  sale_date TEXT NOT NULL, -- YYYY-MM-DD
  subtotal INTEGER NOT NULL DEFAULT 0,
  discount_type TEXT DEFAULT 'NONE', -- NONE, PERCENTAGE, FIXED
  discount_value INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  balance_amount INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'CASH', -- CASH, CARD, BANK, WALLET
  payment_status TEXT NOT NULL DEFAULT 'PAID', -- PAID, PARTIAL, UNPAID
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'COMPLETED', -- COMPLETED, RETURNED, PARTIALLY_RETURNED, CANCELLED
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Sale Line Items (Snapshots preserve historical prices and costs for COGS calculation)
CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  product_name_snapshot TEXT NOT NULL,
  variant_name_snapshot TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_cost_snapshot INTEGER NOT NULL,
  unit_price_snapshot INTEGER NOT NULL,
  custom_unit_price INTEGER,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  subtotal INTEGER NOT NULL,
  returned_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Financial Payments (Against Sales, Customer Balances, or Purchases)
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_number TEXT NOT NULL UNIQUE,
  payment_type TEXT NOT NULL, -- SALE_PAYMENT, CUSTOMER_BALANCE_PAYMENT, PURCHASE_PAYMENT
  reference_id INTEGER, -- sale_id or purchase_id
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'CASH',
  payment_date TEXT NOT NULL, -- YYYY-MM-DD
  notes TEXT,
  created_at TEXT NOT NULL
);

-- Operating Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  expense_date TEXT NOT NULL, -- YYYY-MM-DD
  payment_method TEXT NOT NULL DEFAULT 'CASH',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Sales Returns
CREATE TABLE IF NOT EXISTS sales_returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  return_number TEXT NOT NULL UNIQUE,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  return_date TEXT NOT NULL, -- YYYY-MM-DD
  total_refund_amount INTEGER NOT NULL DEFAULT 0,
  refund_payment_method TEXT DEFAULT 'CASH',
  reason TEXT,
  created_at TEXT NOT NULL
);

-- Sales Return Items
CREATE TABLE IF NOT EXISTS sales_return_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  return_id INTEGER NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
  sale_item_id INTEGER NOT NULL REFERENCES sale_items(id) ON DELETE RESTRICT,
  variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  unit_refund_price INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  restock_eligible INTEGER NOT NULL DEFAULT 1, -- 1 = returned to inventory, 0 = damaged/written-off
  created_at TEXT NOT NULL
);
`;

export const HIGH_PERFORMANCE_INDEXES_SQL = `
-- Product & Variant Indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_variants_stock ON product_variants(current_stock);

-- Stock Movements Indexes (Indexed for audit history and fast balance checks)
CREATE INDEX IF NOT EXISTS idx_stock_mov_variant ON stock_movements(variant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_stock_mov_product ON stock_movements(product_id, created_at);
CREATE INDEX IF NOT EXISTS idx_stock_mov_created ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_mov_ref ON stock_movements(reference_type, reference_id);

-- Purchases Indexes
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_inv ON purchases(invoice_number);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purch ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_var ON purchase_items(variant_id);

-- Sales & Sale Items Indexes (Crucial for fast report aggregations over millions of rows)
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_inv ON sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_var ON sale_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_prod ON sale_items(product_id);

-- Payments Indexes
CREATE INDEX IF NOT EXISTS idx_payments_sale ON payments(reference_id);
CREATE INDEX IF NOT EXISTS idx_payments_cust ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- Expenses Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_cat ON expenses(category);

-- Returns Indexes
CREATE INDEX IF NOT EXISTS idx_returns_sale ON sales_returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_returns_date ON sales_returns(return_date);
CREATE INDEX IF NOT EXISTS idx_return_items_ret ON sales_return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_var ON sales_return_items(variant_id);
`;
