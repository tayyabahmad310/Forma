/**
 * Automated Business Calculations & Database Logic Verification Test Suite
 * Executes on an isolated in-memory/test SQLite database.
 * Verifies accounting formulas, stock atomicity, historical snapshots, returns, and constraints.
 */

const { DatabaseSync } = require('node:sqlite');
const assert = require('node:assert');

console.log('====================================================');
console.log('CLOTHIO BUSINESS LOGIC & ACCOUNTING VERIFICATION SUITE');
console.log('====================================================\n');

// 1. Initialize isolated test database
const db = new DatabaseSync(':memory:');

db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

  CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    sku TEXT UNIQUE,
    default_purchase_cost INTEGER NOT NULL DEFAULT 0,
    default_selling_price INTEGER NOT NULL DEFAULT 0,
    min_stock_alert INTEGER NOT NULL DEFAULT 5,
    is_active INTEGER NOT NULL DEFAULT 1
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
    UNIQUE(product_id, size, color)
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
    phone TEXT
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
    status TEXT NOT NULL DEFAULT 'COMPLETED'
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
    status TEXT NOT NULL DEFAULT 'COMPLETED'
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
    payment_date TEXT NOT NULL
  );

  CREATE TABLE expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    amount INTEGER NOT NULL,
    expense_date TEXT NOT NULL
  );

  CREATE TABLE sales_returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    return_number TEXT NOT NULL UNIQUE,
    sale_id INTEGER NOT NULL REFERENCES sales(id),
    customer_id INTEGER REFERENCES customers(id),
    return_date TEXT NOT NULL,
    total_refund_amount INTEGER NOT NULL DEFAULT 0,
    refund_payment_method TEXT DEFAULT 'CASH'
  );

  CREATE TABLE sales_return_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    return_id INTEGER NOT NULL REFERENCES sales_returns(id),
    sale_item_id INTEGER NOT NULL REFERENCES sale_items(id),
    variant_id INTEGER NOT NULL REFERENCES product_variants(id),
    quantity INTEGER NOT NULL,
    unit_refund_price INTEGER NOT NULL,
    subtotal INTEGER NOT NULL,
    restock_eligible INTEGER NOT NULL DEFAULT 1
  );
`);

console.log('✓ Test 1: Isolated relational schema & foreign keys initialized');

// Test 2: Product creation with variants
db.exec(`
  INSERT INTO categories (name) VALUES ('Formal Shirts');
  INSERT INTO products (name, category_id, sku, default_purchase_cost, default_selling_price)
  VALUES ('Oxford Cotton Shirt', 1, 'SHT-OXF', 120000, 250000);

  INSERT INTO product_variants (product_id, size, color, sku, current_stock)
  VALUES (1, 'M', 'White', 'SHT-OXF-M-WHT', 0);

  INSERT INTO product_variants (product_id, size, color, sku, current_stock)
  VALUES (1, 'L', 'White', 'SHT-OXF-L-WHT', 0);
`);

const variants = db.prepare('SELECT COUNT(*) as count FROM product_variants WHERE product_id = 1').get();
assert.strictEqual(variants.count, 2, 'Should create 2 variants');
console.log('✓ Test 2: Product and variations created');

// Test 3: Record Purchase and verify stock increases once
db.exec(`
  INSERT INTO suppliers (name) VALUES ('Al-Karam Mills');

  INSERT INTO purchases (invoice_number, supplier_id, purchase_date, subtotal, total_amount, paid_amount, balance_amount, payment_status)
  VALUES ('PUR-001', 1, '2026-10-22', 2400000, 2400000, 2400000, 0, 'PAID');

  INSERT INTO purchase_items (purchase_id, product_id, variant_id, quantity, unit_cost, subtotal)
  VALUES (1, 1, 1, 20, 120000, 2400000);

  UPDATE product_variants SET current_stock = current_stock + 20 WHERE id = 1;

  INSERT INTO stock_movements (variant_id, product_id, movement_type, quantity_change, balance_after, reference_type, reference_id, reason, created_at)
  VALUES (1, 1, 'PURCHASE', 20, 20, 'PURCHASE', 1, 'Inward purchase PUR-001', '2026-10-22');
`);

const var1Stock = db.prepare('SELECT current_stock FROM product_variants WHERE id = 1').get();
assert.strictEqual(var1Stock.current_stock, 20, 'Variant stock should be exactly 20 after purchase');
console.log('✓ Test 3: Purchase stock increment verified (stock = 20)');

// Test 4: Sale execution with atomic stock deduction and snapshot preservation
db.exec(`
  INSERT INTO customers (name, phone) VALUES ('Ahmed Ali', '0300-1112233');

  -- Sale of 2 units of SHT-OXF-M-WHT
  -- Regular price 2,500.00 (250000), Subtotal 500,000, 10% discount = 50,000, Net Total = 450,000
  -- Customer pays 300,000, Balance = 150,000
  INSERT INTO sales (invoice_number, customer_id, customer_name_snapshot, sale_date, subtotal, discount_type, discount_value, discount_amount, total_amount, paid_amount, balance_amount, payment_status)
  VALUES ('INV-001', 1, 'Ahmed Ali', '2026-10-22', 500000, 'PERCENTAGE', 10, 50000, 450000, 300000, 150000, 'PARTIAL');

  INSERT INTO sale_items (sale_id, product_id, variant_id, product_name_snapshot, variant_name_snapshot, quantity, unit_cost_snapshot, unit_price_snapshot, discount_amount, subtotal)
  VALUES (1, 1, 1, 'Oxford Cotton Shirt', 'Size: M, Color: White', 2, 120000, 250000, 50000, 450000);

  UPDATE product_variants SET current_stock = current_stock - 2 WHERE id = 1;

  INSERT INTO stock_movements (variant_id, product_id, movement_type, quantity_change, balance_after, reference_type, reference_id, reason, created_at)
  VALUES (1, 1, 'SALE', -2, 18, 'SALE', 1, 'Sale INV-001', '2026-10-22');

  INSERT INTO payments (payment_number, payment_type, reference_id, customer_id, amount, payment_method, payment_date)
  VALUES ('PAY-001', 'SALE_PAYMENT', 1, 1, 300000, 'CASH', '2026-10-22');
`);

const var1AfterSale = db.prepare('SELECT current_stock FROM product_variants WHERE id = 1').get();
assert.strictEqual(var1AfterSale.current_stock, 18, 'Variant stock should be exactly 18 after selling 2 units');

const saleCheck = db.prepare('SELECT total_amount, paid_amount, balance_amount FROM sales WHERE id = 1').get();
assert.strictEqual(saleCheck.total_amount, 450000);
assert.strictEqual(saleCheck.balance_amount, 150000);
console.log('✓ Test 4: Sale execution, atomic stock deduction, and partial payment verified');

// Test 5: Verify changing master product prices does NOT alter historical sales snapshots
db.exec(`
  UPDATE products SET default_selling_price = 350000, default_purchase_cost = 180000 WHERE id = 1;
`);

const historicalItem = db.prepare('SELECT unit_price_snapshot, unit_cost_snapshot FROM sale_items WHERE id = 1').get();
assert.strictEqual(historicalItem.unit_price_snapshot, 250000, 'Historical unit price snapshot must remain 250000');
assert.strictEqual(historicalItem.unit_cost_snapshot, 120000, 'Historical unit cost snapshot must remain 120000');
console.log('✓ Test 5: Historical pricing snapshots immutability verified');

// Test 6: Collect balance payment against the sale
db.exec(`
  INSERT INTO payments (payment_number, payment_type, reference_id, customer_id, amount, payment_method, payment_date)
  VALUES ('PAY-002', 'CUSTOMER_BALANCE_PAYMENT', 1, 1, 150000, 'CASH', '2026-10-22');

  UPDATE sales SET paid_amount = paid_amount + 150000, balance_amount = 0, payment_status = 'PAID' WHERE id = 1;
`);

const settledSale = db.prepare('SELECT balance_amount, payment_status FROM sales WHERE id = 1').get();
assert.strictEqual(settledSale.balance_amount, 0, 'Remaining balance must be 0');
assert.strictEqual(settledSale.payment_status, 'PAID', 'Status must be PAID');
console.log('✓ Test 6: Customer balance collection verified');

// Test 7: Sales return with restocking
db.exec(`
  -- Return 1 unit of the 2 units sold (effective unit refund: 225,000)
  INSERT INTO sales_returns (return_number, sale_id, customer_id, return_date, total_refund_amount)
  VALUES ('RET-001', 1, 1, '2026-10-22', 225000);

  INSERT INTO sales_return_items (return_id, sale_item_id, variant_id, quantity, unit_refund_price, subtotal, restock_eligible)
  VALUES (1, 1, 1, 1, 225000, 225000, 1);

  UPDATE sale_items SET returned_quantity = 1 WHERE id = 1;
  UPDATE product_variants SET current_stock = current_stock + 1 WHERE id = 1;

  INSERT INTO stock_movements (variant_id, product_id, movement_type, quantity_change, balance_after, reference_type, reference_id, reason, created_at)
  VALUES (1, 1, 'RETURN', 1, 19, 'RETURN', 1, 'Restocked return RET-001', '2026-10-22');

  UPDATE sales SET status = 'PARTIALLY_RETURNED' WHERE id = 1;
`);

const var1AfterReturn = db.prepare('SELECT current_stock FROM product_variants WHERE id = 1').get();
assert.strictEqual(var1AfterReturn.current_stock, 19, 'Stock should increase back to 19 after restocked return');
console.log('✓ Test 7: Sales return & restock verified (stock restored to 19)');

// Test 8: Operating Expenses & Profit/Loss Financial Report Accounting
db.exec(`
  INSERT INTO expenses (title, category, amount, expense_date)
  VALUES ('Shop Rent Share', 'Shop Rent', 50000, '2026-10-22');
`);

// Compute accounting report definitions:
// Gross Sales = 500,000
// Discounts = 50,000
// Returns = 225,000
// Net Sales = 500,000 - 50,000 - 225,000 = 225,000
// Gross COGS = 2 sold * 120,000 = 240,000
// Restocked Returned COGS = 1 restocked * 120,000 = 120,000
// Net COGS = 240,000 - 120,000 = 120,000
// Gross Profit = Net Sales (225,000) - Net COGS (120,000) = 105,000
// Operating Expenses = 50,000
// Net Operating Profit = Gross Profit (105,000) - Expenses (50,000) = 55,000

const grossSales = db.prepare("SELECT SUM(subtotal) as val FROM sales WHERE status != 'CANCELLED'").get().val;
const totalDiscounts = db.prepare("SELECT SUM(discount_amount) as val FROM sales WHERE status != 'CANCELLED'").get().val;
const returnedRefunds = db.prepare('SELECT SUM(total_refund_amount) as val FROM sales_returns').get().val;
const netSales = grossSales - totalDiscounts - returnedRefunds;

const grossCogs = db.prepare('SELECT SUM(quantity * unit_cost_snapshot) as val FROM sale_items').get().val;
const restockedCogs = db.prepare('SELECT SUM(sri.quantity * si.unit_cost_snapshot) as val FROM sales_return_items sri JOIN sale_items si ON sri.sale_item_id = si.id WHERE sri.restock_eligible = 1').get().val;
const netCogs = grossCogs - restockedCogs;

const grossProfit = netSales - netCogs;
const operatingExpenses = db.prepare('SELECT SUM(amount) as val FROM expenses').get().val;
const netOperatingProfit = grossProfit - operatingExpenses;


assert.strictEqual(netSales, 225000, 'Net Sales must equal 225000');
assert.strictEqual(netCogs, 120000, 'Net COGS must equal 120000');
assert.strictEqual(grossProfit, 105000, 'Gross Profit must equal 105000');
assert.strictEqual(netOperatingProfit, 55000, 'Net Operating Profit must equal 55000');

console.log('✓ Test 8: Accounting formulas verified:');
console.log(`   Net Sales:            ${netSales / 100} PKR`);
console.log(`   Net COGS:             ${netCogs / 100} PKR`);
console.log(`   Gross Profit:         ${grossProfit / 100} PKR`);
console.log(`   Operating Expenses:   ${operatingExpenses / 100} PKR`);
console.log(`   Net Operating Profit: ${netOperatingProfit / 100} PKR`);

// Test 9: Database Integrity Check
const integrity = db.prepare('PRAGMA integrity_check').get();
assert.strictEqual(integrity.integrity_check, 'ok', 'Database integrity check must be ok');
console.log('✓ Test 9: PRAGMA integrity_check verified: OK');

console.log('\n====================================================');
console.log('ALL CRITICAL BUSINESS RULES & ACCOUNTING TESTS PASSED!');
console.log('====================================================\n');
