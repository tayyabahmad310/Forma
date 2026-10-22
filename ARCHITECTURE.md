# Clothio — Technical Architecture & Implementation Documentation

## 1. System Overview

Clothio is a production-oriented, offline-first clothing inventory, point-of-sale (POS), and business profit manager application designed for Android mobile devices.

The application operates with zero external network connectivity, zero cloud databases, and zero server dependencies. All business records, customer transactions, stock levels, and audit logs are persisted in a local, normalized SQLite relational database running in WAL mode.

---

## 2. Five-Layer Architecture

The codebase enforces strict separation of concerns across 5 architectural layers:

```
┌────────────────────────────────────────────────────────┐
│  1. UI Screens & Reusable Components                   │
│     (src/screens/*, src/components/*)                  │
├────────────────────────────────────────────────────────┤
│  2. Application Hooks & Lightweight State              │
│     (src/context/AppContext.js, AuthContext.js)        │
├────────────────────────────────────────────────────────┤
│  3. Business Services & Validation (Local Backend)     │
│     (src/services/*: receipt, backup, auth)            │
├────────────────────────────────────────────────────────┤
│  4. Database Repositories & SQL Queries                │
│     (src/repositories/*: product, sale, purchase...)   │
├────────────────────────────────────────────────────────┤
│  5. SQLite Engine, Versioned Migrations & PRAGMAs      │
│     (src/database/connection.js, schema.js, etc.)      │
└────────────────────────────────────────────────────────┘
```

1. **Layer 1: UI Screens and Components**:
   - Built with React Native and JavaScript (ES6+).
   - Clean, boutique clothing store aesthetic (inspired by modern fashion retail UI).
   - UI components contain zero raw SQL or direct storage access; they invoke hooks and services.
2. **Layer 2: Application Hooks and State**:
   - Lightweight React Context (`AppContext`, `AuthContext`).
   - No heavy state management dependencies (no Redux).
   - Manages store profile, active currency, and data version reload notifications.
3. **Layer 3: Business Services & Validation**:
   - Acts as the on-device "backend".
   - Handles offline PDF generation, transactional JSON backup/restore, and cryptographic PIN hashing.
4. **Layer 4: Database Repositories**:
   - Encapsulates parameterized SQL queries.
   - Enforces pagination (`LIMIT`, `OFFSET`), SQL-side aggregations, and atomic transactions.
5. **Layer 5: SQLite Database & Migrations**:
   - `expo-sqlite` engine.
   - `PRAGMA journal_mode = WAL;`
   - `PRAGMA synchronous = NORMAL;`
   - `PRAGMA foreign_keys = ON;`
   - Version tracking in `schema_migrations`.

---

## 3. Relational Schema & Performance Indexes

### Core Tables
1. `schema_migrations`: Version tracking (`version`, `applied_at`).
2. `app_settings`: Key-value application configuration.
3. `categories`: Clothing categories (e.g. Formal Shirts, Denim, Kurtas).
4. `suppliers`: Clothing manufacturers and fabric distributors.
5. `products`: Master clothing products (name, category_id, sku, default purchase cost, default selling price, min stock threshold).
6. `product_variants`: Size (XS..3XL) and color combinations, with individual SKUs and current stock levels.
7. `stock_movements`: Complete immutable audit log of every stock alteration (PURCHASE, SALE, RETURN, DAMAGE, LOST, ADJUSTMENT).
8. `purchases`: Inward purchase orders from suppliers with payment status and balances.
9. `purchase_items`: Line items for purchases with variant references and unit costs.
10. `customers`: Customer directory for tracking store credit and repeat purchases.
11. `sales`: Master POS sales transactions with customer snapshots, totals, and payment status.
12. `sale_items`: Sale line items preserving historical `unit_cost_snapshot` and `unit_price_snapshot` for historical COGS calculation.
13. `payments`: Payment receipts against sales or customer balances.
14. `expenses`: Operating shop expenses (Rent, Utilities, Staff Salaries, Maintenance).
15. `sales_returns`: Sales return orders with refund amounts.
16. `sales_return_items`: Return line items with restocking flags (`restock_eligible = 1` vs `0`).

### High-Performance Indexes
- `idx_products_category` ON `products(category_id)`
- `idx_products_sku` ON `products(sku)`
- `idx_products_name` ON `products(name)`
- `idx_variants_product` ON `product_variants(product_id)`
- `idx_variants_sku` ON `product_variants(sku)`
- `idx_variants_stock` ON `product_variants(current_stock)`
- `idx_sales_date` ON `sales(sale_date)`
- `idx_sales_customer` ON `sales(customer_id)`
- `idx_sales_inv` ON `sales(invoice_number)`
- `idx_sales_status` ON `sales(status)`
- `idx_sale_items_sale` ON `sale_items(sale_id)`
- `idx_sale_items_var` ON `sale_items(variant_id)`
- `idx_sale_items_prod` ON `sale_items(product_id)`
- `idx_payments_date` ON `payments(payment_date)`
- `idx_expenses_date` ON `expenses(expense_date)`
- `idx_returns_date` ON `sales_returns(return_date)`

---

## 4. Performance Benchmark (1,020,000 Records)

Verified using `node scripts/seed-million.js`:

| Benchmark Operation | Dataset Size | Measured Execution Time | Query Plan Strategy |
|---|---|---|---|
| **Date-Range Sales Aggregation** | 300,000 sales transactions | **45.78 ms** | `SEARCH sales USING INDEX idx_sales_date` |
| **Historical COGS Join** | 300,000 sales + 300,000 items | **108.58 ms** | `SEARCH s USING INDEX idx_sales_date` -> `SEARCH si USING INDEX idx_sale_items_sale` |
| **Product Point Lookup by SKU** | 10,000 products | **0.07 ms** | `SEARCH products USING INDEX sqlite_autoindex_products_1` |
| **Paginated Sales Listing** | 300,000 sales (Offset 250, Limit 25) | **0.13 ms** | `INDEX SCAN` with early limit cutoff |
| **Inventory Valuation** | 40,000 variants (1.38M units) | **9.08 ms** | Aggregation with index traversal |

---

## 5. Accounting & Business Rules

All financial figures are calculated from stored SQLite records without floating-point errors (stored in integer minor currency units, where 1 PKR = 100 paisas):

1. **Net Sales**:
   $$\text{Net Sales} = \text{Gross Sales} - \text{Discounts} - \text{Sales Returns}$$
2. **Cost of Goods Sold (COGS)**:
   $$\text{COGS} = \sum (\text{Sold Qty} \times \text{Unit Cost Snapshot}) - \sum (\text{Restocked Returned Qty} \times \text{Unit Cost Snapshot})$$
   *Note: Historical cost snapshot is locked at the moment of sale and never modified even if future purchase prices change.*
3. **Gross Profit**:
   $$\text{Gross Profit} = \text{Net Sales} - \text{COGS}$$
4. **Net Operating Profit**:
   $$\text{Net Operating Profit} = \text{Gross Profit} - \text{Operating Expenses}$$
5. **Inventory Valuation**:
   $$\text{Cost Value} = \sum (\text{Variant Current Stock} \times \text{Variant Cost})$$
   $$\text{Retail Value} = \sum (\text{Variant Current Stock} \times \text{Variant Selling Price})$$

---

## 6. Local Security Architecture

- **PIN Storage**: Uses `expo-secure-store` backed by Android Keystore.
- **Hashing**: Salted SHA-256 (`expo-crypto`). A 16-byte cryptographically random salt is generated and prepended to the user PIN before hashing. Plaintext PINs are never persisted.
- **Auto-Lock**: React Native `AppState` event listener triggers immediate app lock when the application moves to the Android background.

---

## 7. Android Build Options (No Local Java/Android Required)

Since your PC may not have Java or the Android SDK installed, and Expo Cloud (EAS) is not desired, the project is configured with automated **GitHub Actions CI/CD** to build standalone APKs directly on GitHub's build servers at zero cost.

### Option A: Build via GitHub Actions (Recommended)

The repository includes [`.github/workflows/build-apk.yml`](file:///d:/projects/apps/clothio/.github/workflows/build-apk.yml).

#### How to trigger and get your APK:
1. Push this repository to your GitHub account:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git branch -M main
   git push -u origin main
   ```
2. On your GitHub repository page:
   - Click the **"Actions"** tab.
   - Select **"Build Android APK (Local/Offline)"** on the left.
   - Click the **"Run workflow"** button on the right, select `release`, `debug`, or `both`, and click **Run workflow**.
3. When the workflow finishes (typically 3–5 minutes):
   - Click into the completed workflow run.
   - Under the **Artifacts** section at the bottom, download `clothio-release-apk` or `clothio-debug-apk`.
   - Transfer the `.apk` file to your Android phone and install!
4. **Automatic Release on Git Tag**:
   - Pushing a version tag (e.g. `git tag v1.0.0 && git push origin v1.0.0`) automatically publishes a GitHub Release with the APK attached.

---

### Option B: Local Android Build (If Java & Android SDK are installed)

If you configure native tools locally in the future:
- **Prerequisites**: OpenJDK 17 or 21 (`JAVA_HOME`) and Android SDK 36 (`ANDROID_HOME`).
- **Build Commands**:
```bash
# Debug APK:
npm run build:apk:debug
# Output: android/app/build/outputs/apk/debug/app-debug.apk

# Release APK:
npm run build:apk
# Output: android/app/build/outputs/apk/release/app-release.apk
```

