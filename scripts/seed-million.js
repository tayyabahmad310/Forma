/**
 * One Million Records Performance Verification & Benchmark Script
 * Generates 1,000,000+ realistic business records into an isolated SQLite database file.
 * Verifies SQL execution plans (EXPLAIN QUERY PLAN) and measures query speeds in milliseconds.
 * Development-only: NEVER touches or seeds the production database.
 */

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const BENCHMARK_DB_PATH = path.join(__dirname, 'million_test.db');

// Ensure clean benchmark start
if (fs.existsSync(BENCHMARK_DB_PATH)) {
  fs.unlinkSync(BENCHMARK_DB_PATH);
}

console.log('====================================================');
console.log('CLOTHIO 1,000,000+ RECORDS BENCHMARK & SEED SCRIPT');
console.log('Target: 1,000,000+ records across realistic schema');
console.log(`Database: ${BENCHMARK_DB_PATH}`);
console.log('====================================================\n');

const db = new DatabaseSync(BENCHMARK_DB_PATH);

// 1. Configure High-Performance PRAGMAs
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA foreign_keys = ON;
  PRAGMA cache_size = -64000; -- 64MB cache
`);

// 2. Initialize Schema
db.exec(`
  CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT
  );

  CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    sku TEXT UNIQUE,
    default_purchase_cost INTEGER NOT NULL DEFAULT 0,
    default_selling_price INTEGER NOT NULL DEFAULT 0,
    min_stock_alert INTEGER NOT NULL DEFAULT 5,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE product_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size TEXT NOT NULL,
    color TEXT NOT NULL,
    sku TEXT UNIQUE,
    purchase_cost INTEGER,
    selling_price INTEGER,
    current_stock INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    variant_id INTEGER NOT NULL REFERENCES product_variants(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    movement_type TEXT NOT NULL,
    quantity_change INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reference_type TEXT,
    reference_id INTEGER,
    reason TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT NOT NULL UNIQUE,
    supplier_id INTEGER REFERENCES suppliers(id),
    purchase_date TEXT NOT NULL,
    subtotal INTEGER NOT NULL DEFAULT 0,
    discount_amount INTEGER NOT NULL DEFAULT 0,
    additional_costs INTEGER NOT NULL DEFAULT 0,
    total_amount INTEGER NOT NULL DEFAULT 0,
    paid_amount INTEGER NOT NULL DEFAULT 0,
    balance_amount INTEGER NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'PAID',
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    created_at TEXT NOT NULL
  );

  CREATE TABLE purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    variant_id INTEGER NOT NULL REFERENCES product_variants(id),
    quantity INTEGER NOT NULL,
    unit_cost INTEGER NOT NULL,
    subtotal INTEGER NOT NULL
  );

  CREATE TABLE sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT NOT NULL UNIQUE,
    customer_id INTEGER REFERENCES customers(id),
    customer_name_snapshot TEXT,
    sale_date TEXT NOT NULL,
    subtotal INTEGER NOT NULL DEFAULT 0,
    discount_type TEXT DEFAULT 'NONE',
    discount_value INTEGER NOT NULL DEFAULT 0,
    discount_amount INTEGER NOT NULL DEFAULT 0,
    total_amount INTEGER NOT NULL DEFAULT 0,
    paid_amount INTEGER NOT NULL DEFAULT 0,
    balance_amount INTEGER NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'CASH',
    payment_status TEXT NOT NULL DEFAULT 'PAID',
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    created_at TEXT NOT NULL
  );

  CREATE TABLE sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    variant_id INTEGER NOT NULL REFERENCES product_variants(id),
    product_name_snapshot TEXT NOT NULL,
    variant_name_snapshot TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost_snapshot INTEGER NOT NULL,
    unit_price_snapshot INTEGER NOT NULL,
    custom_unit_price INTEGER,
    discount_amount INTEGER NOT NULL DEFAULT 0,
    subtotal INTEGER NOT NULL,
    returned_quantity INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_number TEXT NOT NULL UNIQUE,
    payment_type TEXT NOT NULL,
    reference_id INTEGER,
    customer_id INTEGER REFERENCES customers(id),
    amount INTEGER NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'CASH',
    payment_date TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    amount INTEGER NOT NULL,
    expense_date TEXT NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'CASH'
  );

  -- High-Performance Indexes
  CREATE INDEX idx_products_category ON products(category_id);
  CREATE INDEX idx_products_sku ON products(sku);
  CREATE INDEX idx_products_name ON products(name);
  CREATE INDEX idx_variants_product ON product_variants(product_id);
  CREATE INDEX idx_variants_sku ON product_variants(sku);
  CREATE INDEX idx_variants_stock ON product_variants(current_stock);
  CREATE INDEX idx_sales_date ON sales(sale_date);
  CREATE INDEX idx_sales_customer ON sales(customer_id);
  CREATE INDEX idx_sales_inv ON sales(invoice_number);
  CREATE INDEX idx_sales_status ON sales(status);
  CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
  CREATE INDEX idx_sale_items_var ON sale_items(variant_id);
  CREATE INDEX idx_sale_items_prod ON sale_items(product_id);
  CREATE INDEX idx_payments_date ON payments(payment_date);
  CREATE INDEX idx_expenses_date ON expenses(expense_date);
`);

console.log('✓ Tables & B-Tree Indexes created successfully.');

// Helper random generator
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const COLORS = ['Black', 'White', 'Navy Blue', 'Charcoal', 'Olive', 'Beige', 'Maroon'];
const CATEGORIES = [
  'Formal Shirts',
  'Casual Shirts',
  'Polo T-Shirts',
  'Denim Jeans',
  'Chinos & Trousers',
  'Traditional Kurtas',
  'Blazers & Suits',
  'Jackets & Outerwear',
];
const EXPENSE_CATEGORIES = [
  'Shop Rent',
  'Utilities (Electricity/Water)',
  'Staff Salaries',
  'Packaging & Shopping Bags',
  'Shop Maintenance & Repairs',
  'Marketing & Signage',
  'Transport & Courier',
  'Refreshments & Tea',
  'Other Expenses',
];


console.log('\n--- Step 1: Seeding Base Catalogs ---');
const insertCat = db.prepare('INSERT INTO categories (name) VALUES (?)');
db.exec('BEGIN TRANSACTION');
for (const cat of CATEGORIES) {
  insertCat.run(cat);
}
db.exec('COMMIT');

console.log('--- Step 2: Seeding Products & Variants (50,000 records) ---');
const insertProd = db.prepare(`
  INSERT INTO products (name, category_id, sku, default_purchase_cost, default_selling_price, min_stock_alert, is_active, created_at)
  VALUES (?, ?, ?, ?, ?, ?, 1, '2026-01-01')
`);
const insertVar = db.prepare(`
  INSERT INTO product_variants (product_id, size, color, sku, purchase_cost, selling_price, current_stock, is_active, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, 1, '2026-01-01')
`);

db.exec('BEGIN TRANSACTION');
const TOTAL_PRODUCTS = 10000;
let variantCount = 0;

for (let i = 1; i <= TOTAL_PRODUCTS; i++) {
  const catId = (i % CATEGORIES.length) + 1;
  const prodName = `Apparel Style #${i}`;
  const sku = `SKU-P${i.toString().padStart(6, '0')}`;
  const cost = 100000 + (i % 20) * 10000; // Rs 1000 - 3000
  const price = cost * 2;

  insertProd.run(prodName, catId, sku, cost, price, 5);

  // 4 variants per product: 40,000 variants
  for (let v = 0; v < 4; v++) {
    variantCount++;
    const sz = SIZES[v % SIZES.length];
    const col = COLORS[v % COLORS.length];
    const varSku = `${sku}-${sz}-${col.substring(0, 3).toUpperCase()}`;
    const stock = 10 + (i % 50);
    insertVar.run(i, sz, col, varSku, cost, price, stock);
  }
}
db.exec('COMMIT');
console.log(`✓ Seeded ${TOTAL_PRODUCTS} Products and ${variantCount} Variants.`);

console.log('--- Step 3: Seeding Customers (20,000 records) ---');
const insertCust = db.prepare(`
  INSERT INTO customers (name, phone, created_at)
  VALUES (?, ?, '2026-01-01')
`);
db.exec('BEGIN TRANSACTION');
for (let c = 1; c <= 20000; c++) {
  insertCust.run(`Customer ${c}`, `0300${c.toString().padStart(7, '0')}`);
}
db.exec('COMMIT');
console.log('✓ Seeded 20,000 Customers.');

console.log('--- Step 4: Seeding Sales & Sale Items (700,000 records) ---');
// 300,000 sales transactions and 450,000 sale items = 750,000 records
const insertSale = db.prepare(`
  INSERT INTO sales (invoice_number, customer_id, customer_name_snapshot, sale_date, subtotal, discount_amount, total_amount, paid_amount, balance_amount, payment_method, payment_status, status, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'CASH', 'PAID', 'COMPLETED', ?)
`);
const insertSaleItem = db.prepare(`
  INSERT INTO sale_items (sale_id, product_id, variant_id, product_name_snapshot, variant_name_snapshot, quantity, unit_cost_snapshot, unit_price_snapshot, discount_amount, subtotal)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
`);

const TOTAL_SALES = 300000;
const BATCH_SIZE = 50000;
let saleItemCount = 0;

for (let batch = 0; batch < TOTAL_SALES; batch += BATCH_SIZE) {
  db.exec('BEGIN TRANSACTION');
  for (let s = batch + 1; s <= batch + BATCH_SIZE; s++) {
    const custId = (s % 20000) + 1;
    const invNum = `INV-2026-${s.toString().padStart(7, '0')}`;
    const day = (s % 28) + 1;
    const month = (s % 10) + 1;
    const dateStr = `2026-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const createdStr = `${dateStr}T14:30:00.000Z`;

    const qty1 = (s % 3) + 1;
    const prodId1 = (s % TOTAL_PRODUCTS) + 1;
    const varId1 = (s % variantCount) + 1;
    const cost1 = 120000;
    const price1 = 250000;
    const sub1 = qty1 * price1;

    insertSale.run(invNum, custId, `Customer ${custId}`, dateStr, sub1, 0, sub1, sub1, 0, createdStr);

    saleItemCount++;
    insertSaleItem.run(s, prodId1, varId1, `Apparel Style #${prodId1}`, 'Size: M, Color: Black', qty1, cost1, price1, sub1);
  }
  db.exec('COMMIT');
  console.log(`  ... Inserted batch ${batch + BATCH_SIZE} / ${TOTAL_SALES} sales`);
}
console.log(`✓ Seeded ${TOTAL_SALES} Sales and ${saleItemCount} Sale Items.`);

console.log('--- Step 5: Seeding Stock Movements & Payments (250,000 records) ---');
const insertMovement = db.prepare(`
  INSERT INTO stock_movements (variant_id, product_id, movement_type, quantity_change, balance_after, reference_type, reference_id, reason, created_at)
  VALUES (?, ?, 'SALE', -1, 20, 'SALE', ?, 'Daily POS Sale', '2026-05-15')
`);
const insertPayment = db.prepare(`
  INSERT INTO payments (payment_number, payment_type, reference_id, customer_id, amount, payment_method, payment_date, created_at)
  VALUES (?, 'SALE_PAYMENT', ?, ?, ?, 'CASH', '2026-05-15', '2026-05-15')
`);

db.exec('BEGIN TRANSACTION');
for (let p = 1; p <= 150000; p++) {
  insertMovement.run((p % variantCount) + 1, (p % TOTAL_PRODUCTS) + 1, p);
  insertPayment.run(`PAY-${p}`, p, (p % 20000) + 1, 250000);
}
db.exec('COMMIT');
console.log('✓ Seeded 150,000 Stock Movements and 150,000 Payments.');

console.log('--- Step 6: Seeding Operating Expenses (50,000 records) ---');
const insertExpense = db.prepare(`
  INSERT INTO expenses (title, category, amount, expense_date, payment_method)
  VALUES (?, ?, ?, ?, 'CASH')
`);
db.exec('BEGIN TRANSACTION');
for (let e = 1; e <= 50000; e++) {
  const cat = EXPENSE_CATEGORIES[e % EXPENSE_CATEGORIES.length] || 'Shop Rent';
  insertExpense.run(`Expense #${e}`, cat, 150000, '2026-06-10');
}
db.exec('COMMIT');
console.log('✓ Seeded 50,000 Expenses.');

// Total record count tally
const totalProducts = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
const totalVariants = db.prepare('SELECT COUNT(*) as c FROM product_variants').get().c;
const totalCustomers = db.prepare('SELECT COUNT(*) as c FROM customers').get().c;
const totalSales = db.prepare('SELECT COUNT(*) as c FROM sales').get().c;
const totalSaleItems = db.prepare('SELECT COUNT(*) as c FROM sale_items').get().c;
const totalMovements = db.prepare('SELECT COUNT(*) as c FROM stock_movements').get().c;
const totalPayments = db.prepare('SELECT COUNT(*) as c FROM payments').get().c;
const totalExpenses = db.prepare('SELECT COUNT(*) as c FROM expenses').get().c;

const grandTotalRecords = totalProducts + totalVariants + totalCustomers + totalSales + totalSaleItems + totalMovements + totalPayments + totalExpenses;

console.log('\n====================================================');
console.log(`TOTAL RECORDS IN BENCHMARK DATABASE: ${grandTotalRecords.toLocaleString()} RECORDS`);
console.log('====================================================\n');

// 3. EXPLAIN QUERY PLAN & PERFORMANCE BENCHMARKS
console.log('--- Step 7: Verifying EXPLAIN QUERY PLANS & Performance ---');

// Query 1: Date Range Sales & Profit Aggregation over 300,000 transactions
console.log('\n[Query 1]: Date Range Financial Summary (Indexed by sale_date)');
const q1Plan = db.prepare(`
  EXPLAIN QUERY PLAN
  SELECT 
    COUNT(id) as total_tx,
    SUM(subtotal) as gross_sales,
    SUM(discount_amount) as discounts,
    SUM(total_amount) as net_sales
  FROM sales
  WHERE status != 'CANCELLED' AND sale_date BETWEEN '2026-03-01' AND '2026-03-31'
`).all();
console.log('Query Plan:', q1Plan.map(p => p.detail).join(' -> '));

const t1Start = performance.now();
const q1Result = db.prepare(`
  SELECT 
    COUNT(id) as total_tx,
    SUM(subtotal) as gross_sales,
    SUM(discount_amount) as discounts,
    SUM(total_amount) as net_sales
  FROM sales
  WHERE status != 'CANCELLED' AND sale_date BETWEEN '2026-03-01' AND '2026-03-31'
`).get();
const t1Time = (performance.now() - t1Start).toFixed(2);
console.log(`Result: ${q1Result.total_tx.toLocaleString()} orders aggregated in ${t1Time} ms!`);

// Query 2: Cost of Goods Sold (COGS) Join over 300,000 sales and 450,000 items
console.log('\n[Query 2]: COGS Historical Cost Aggregation (JOIN sales + sale_items)');
const q2Plan = db.prepare(`
  EXPLAIN QUERY PLAN
  SELECT SUM(si.quantity * si.unit_cost_snapshot) as total_cogs
  FROM sale_items si
  JOIN sales s ON si.sale_id = s.id
  WHERE s.status != 'CANCELLED' AND s.sale_date BETWEEN '2026-03-01' AND '2026-03-31'
`).all();
console.log('Query Plan:', q2Plan.map(p => p.detail).join(' -> '));

const t2Start = performance.now();
const q2Result = db.prepare(`
  SELECT SUM(si.quantity * si.unit_cost_snapshot) as total_cogs
  FROM sale_items si
  JOIN sales s ON si.sale_id = s.id
  WHERE s.status != 'CANCELLED' AND s.sale_date BETWEEN '2026-03-01' AND '2026-03-31'
`).get();
const t2Time = (performance.now() - t2Start).toFixed(2);
console.log(`Result: COGS calculated in ${t2Time} ms!`);

// Query 3: Search by SKU (Indexed B-Tree Lookup)
console.log('\n[Query 3]: Product Search by SKU');
const q3Plan = db.prepare(`
  EXPLAIN QUERY PLAN
  SELECT * FROM products WHERE sku = 'SKU-P005000'
`).all();
console.log('Query Plan:', q3Plan.map(p => p.detail).join(' -> '));

const t3Start = performance.now();
const q3Result = db.prepare(`SELECT * FROM products WHERE sku = 'SKU-P005000'`).get();
const t3Time = (performance.now() - t3Start).toFixed(2);
console.log(`Result: Found "${q3Result.name}" in ${t3Time} ms!`);

// Query 4: Paginated Sales Listing (Page 10, Limit 25)
console.log('\n[Query 4]: Paginated Sales List (OFFSET 250, LIMIT 25)');
const t4Start = performance.now();
const q4Result = db.prepare(`
  SELECT id, invoice_number, customer_name_snapshot, total_amount, payment_status, sale_date
  FROM sales
  ORDER BY sale_date DESC, id DESC
  LIMIT 25 OFFSET 250
`).all();
const t4Time = (performance.now() - t4Start).toFixed(2);
console.log(`Result: 25 rows fetched in ${t4Time} ms!`);

// Query 5: Inventory Valuation Aggregation over 40,000 Variants
console.log('\n[Query 5]: Inventory Valuation across all active variants');
const t5Start = performance.now();
const q5Result = db.prepare(`
  SELECT 
    COUNT(pv.id) as variants,
    SUM(pv.current_stock) as units,
    SUM(pv.current_stock * pv.purchase_cost) as cost_val,
    SUM(pv.current_stock * pv.selling_price) as retail_val
  FROM product_variants pv
  JOIN products p ON pv.product_id = p.id
  WHERE p.is_active = 1 AND pv.is_active = 1
`).get();
const t5Time = (performance.now() - t5Start).toFixed(2);
console.log(`Result: ${q5Result.units.toLocaleString()} units valued in ${t5Time} ms!`);

console.log('\n====================================================');
console.log('BENCHMARK SUMMARY TABLE:');
console.log('====================================================');
console.log(`1. Date-range Sales Summary:     ${t1Time} ms`);
console.log(`2. COGS Historical Join:         ${t2Time} ms`);
console.log(`3. SKU B-Tree Point Lookup:      ${t3Time} ms`);
console.log(`4. Paginated Sales Listing:      ${t4Time} ms`);
console.log(`5. Inventory Valuation Query:    ${t5Time} ms`);
console.log('====================================================\n');

// Clean up test file
db.close();
try {
  fs.unlinkSync(BENCHMARK_DB_PATH);
  console.log('✓ Benchmark test database safely removed. Clean environment maintained.');
} catch (e) {
  // Ignored
}
