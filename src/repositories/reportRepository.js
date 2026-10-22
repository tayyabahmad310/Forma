/**
 * Financial Reports & Analytics Repository
 * High-performance SQL aggregations for COGS, Gross Profit,
 * Operating Profit, Inventory Valuation, and Trend Analysis.
 * Designed to aggregate millions of records entirely within SQLite.
 */

import { queryAll, queryFirst } from '../database/queryUtils';
import { getTodayDateString } from '../utils/date';

/**
 * Get comprehensive financial summary for a given date range.
 * Net Sales = Gross Sales - Discounts - Returns
 * Net COGS = Historical Cost of Goods Sold - Restocked Returned Cost
 * Gross Profit = Net Sales - Net COGS
 * Net Operating Profit = Gross Profit - Operating Expenses
 */
export async function getFinancialSummary({ startDate, endDate }) {
  // 1. Sales & Discounts Aggregation
  const salesAgg = await queryFirst(
    `SELECT 
      COUNT(id) as total_transactions,
      COALESCE(SUM(subtotal), 0) as gross_sales,
      COALESCE(SUM(discount_amount), 0) as total_discounts,
      COALESCE(SUM(total_amount), 0) as sales_after_discount,
      COALESCE(SUM(paid_amount), 0) as collected_amount,
      COALESCE(SUM(balance_amount), 0) as credit_amount
    FROM sales
    WHERE status != 'CANCELLED' AND sale_date BETWEEN ? AND ?`,
    [startDate, endDate]
  );

  // 2. Returns Aggregation
  const returnsAgg = await queryFirst(
    `SELECT 
      COUNT(id) as total_returns,
      COALESCE(SUM(total_refund_amount), 0) as total_refunds
    FROM sales_returns
    WHERE return_date BETWEEN ? AND ?`,
    [startDate, endDate]
  );

  // 3. Cost of Goods Sold (COGS) Aggregation using stored historical cost snapshots
  const cogsAgg = await queryFirst(
    `SELECT 
      COALESCE(SUM(si.quantity * si.unit_cost_snapshot), 0) as gross_cogs
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE s.status != 'CANCELLED' AND s.sale_date BETWEEN ? AND ?`,
    [startDate, endDate]
  );

  // 4. Returned restocked goods cost deduction from COGS
  const returnedCogsAgg = await queryFirst(
    `SELECT 
      COALESCE(SUM(sri.quantity * si.unit_cost_snapshot), 0) as restocked_cogs
    FROM sales_return_items sri
    JOIN sales_returns sr ON sri.return_id = sr.id
    JOIN sale_items si ON sri.sale_item_id = si.id
    WHERE sri.restock_eligible = 1 AND sr.return_date BETWEEN ? AND ?`,
    [startDate, endDate]
  );

  // 5. Operating Expenses Aggregation
  const expensesAgg = await queryFirst(
    `SELECT 
      COUNT(id) as expense_count,
      COALESCE(SUM(amount), 0) as total_expenses
    FROM expenses
    WHERE expense_date BETWEEN ? AND ?`,
    [startDate, endDate]
  );

  // 6. Purchases for the period (Inventory acquisition, not operating expense)
  const purchasesAgg = await queryFirst(
    `SELECT 
      COUNT(id) as purchase_count,
      COALESCE(SUM(total_amount), 0) as total_purchases,
      COALESCE(SUM(paid_amount), 0) as purchases_paid,
      COALESCE(SUM(balance_amount), 0) as purchases_payable
    FROM purchases
    WHERE status = 'COMPLETED' AND purchase_date BETWEEN ? AND ?`,
    [startDate, endDate]
  );

  // 7. Actual Customer Cash Collected in Date Range (including balance payments)
  const cashCollectedAgg = await queryFirst(
    `SELECT 
      COALESCE(SUM(amount), 0) as total_cash_in
    FROM payments
    WHERE payment_type IN ('SALE_PAYMENT', 'CUSTOMER_BALANCE_PAYMENT') 
      AND payment_date BETWEEN ? AND ?`,
    [startDate, endDate]
  );

  // Financial Computations according to master prompt definitions:
  const grossSales = salesAgg?.gross_sales || 0;
  const discounts = salesAgg?.total_discounts || 0;
  const returnedSales = returnsAgg?.total_refunds || 0;
  const netSales = Math.max(0, grossSales - discounts - returnedSales);

  const grossCogs = cogsAgg?.gross_cogs || 0;
  const restockedCogs = returnedCogsAgg?.restocked_cogs || 0;
  const netCogs = Math.max(0, grossCogs - restockedCogs);

  const grossProfit = netSales - netCogs;
  const operatingExpenses = expensesAgg?.total_expenses || 0;
  const netOperatingProfit = grossProfit - operatingExpenses;

  return {
    period: { startDate, endDate },
    transactionCount: salesAgg?.total_transactions || 0,
    grossSales,
    discounts,
    returnedSales,
    netSales,
    grossCogs,
    restockedCogs,
    netCogs,
    grossProfit,
    operatingExpenses,
    netOperatingProfit,
    totalPurchases: purchasesAgg?.total_purchases || 0,
    purchasesPayable: purchasesAgg?.purchases_payable || 0,
    totalCashCollected: cashCollectedAgg?.total_cash_in || 0,
    unpaidCustomerCredit: salesAgg?.credit_amount || 0,
  };
}

/**
 * Get current inventory valuation and stock levels
 */
export async function getInventoryValuation() {
  const valuation = await queryFirst(`
    SELECT 
      COUNT(DISTINCT p.id) as total_products,
      COUNT(pv.id) as total_variants,
      COALESCE(SUM(pv.current_stock), 0) as total_units_in_stock,
      COALESCE(SUM(pv.current_stock * COALESCE(pv.purchase_cost, p.default_purchase_cost, 0)), 0) as total_cost_value,
      COALESCE(SUM(pv.current_stock * COALESCE(pv.selling_price, p.default_selling_price, 0)), 0) as total_retail_value
    FROM product_variants pv
    JOIN products p ON pv.product_id = p.id
    WHERE p.is_active = 1 AND pv.is_active = 1
  `);

  const lowStockCount = await queryFirst(`
    SELECT COUNT(*) as count FROM (
      SELECT p.id
      FROM products p
      JOIN product_variants pv ON p.id = pv.product_id AND pv.is_active = 1
      WHERE p.is_active = 1
      GROUP BY p.id
      HAVING SUM(pv.current_stock) <= p.min_stock_alert AND SUM(pv.current_stock) > 0
    )
  `);

  const outOfStockCount = await queryFirst(`
    SELECT COUNT(*) as count FROM (
      SELECT p.id
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.is_active = 1
      WHERE p.is_active = 1
      GROUP BY p.id
      HAVING COALESCE(SUM(pv.current_stock), 0) <= 0
    )
  `);

  return {
    totalProducts: valuation?.total_products || 0,
    totalVariants: valuation?.total_variants || 0,
    totalUnitsInStock: valuation?.total_units_in_stock || 0,
    totalCostValue: valuation?.total_cost_value || 0,
    totalRetailValue: valuation?.total_retail_value || 0,
    potentialProfit: (valuation?.total_retail_value || 0) - (valuation?.total_cost_value || 0),
    lowStockCount: lowStockCount?.count || 0,
    outOfStockCount: outOfStockCount?.count || 0,
  };
}

/**
 * Get data for the main Business Dashboard
 */
export async function getDashboardData() {
  const today = getTodayDateString();

  // 1. Today's financial metrics
  const todaySummary = await getFinancialSummary({ startDate: today, endDate: today });

  // 2. Total outstanding customer balance across the entire shop
  const customerBalanceRow = await queryFirst(`
    SELECT COALESCE(SUM(balance_amount), 0) as total_receivable
    FROM sales
    WHERE status != 'CANCELLED'
  `);

  // 3. Inventory valuation
  const inventoryValuation = await getInventoryValuation();

  // 4. Low stock alert products (up to 5 items)
  const lowStockItems = await queryAll(`
    SELECT 
      p.id,
      p.name,
      p.sku,
      p.min_stock_alert,
      COALESCE(SUM(pv.current_stock), 0) as current_stock
    FROM products p
    JOIN product_variants pv ON p.id = pv.product_id AND pv.is_active = 1
    WHERE p.is_active = 1
    GROUP BY p.id
    HAVING current_stock <= p.min_stock_alert
    ORDER BY current_stock ASC
    LIMIT 5
  `);

  // 5. Recent 5 sales
  const recentSales = await queryAll(`
    SELECT 
      s.id,
      s.invoice_number,
      s.customer_name_snapshot,
      s.sale_date,
      s.total_amount,
      s.paid_amount,
      s.payment_status,
      s.status,
      s.created_at
    FROM sales s
    ORDER BY s.created_at DESC, s.id DESC
    LIMIT 5
  `);

  return {
    today: todaySummary,
    totalCustomerReceivables: customerBalanceRow?.total_receivable || 0,
    inventory: inventoryValuation,
    lowStockAlerts: lowStockItems,
    recentSales,
  };
}

/**
 * Best selling clothing products
 */
export async function getBestSellingProducts({ startDate, endDate, limit = 10 }) {
  const sql = `
    SELECT 
      si.product_id,
      si.product_name_snapshot as product_name,
      p.image_uri,
      c.name as category_name,
      SUM(si.quantity) as units_sold,
      SUM(si.subtotal) as total_revenue,
      SUM(si.subtotal - (si.quantity * si.unit_cost_snapshot)) as total_profit
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN products p ON si.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE s.status != 'CANCELLED' AND s.sale_date BETWEEN ? AND ?
    GROUP BY si.product_id
    ORDER BY units_sold DESC
    LIMIT ?
  `;
  return await queryAll(sql, [startDate, endDate, limit]);
}

/**
 * Daily sales breakdown for chart/trend
 */
export async function getDailySalesTrend({ startDate, endDate }) {
  const sql = `
    SELECT 
      s.sale_date,
      COUNT(s.id) as transaction_count,
      COALESCE(SUM(s.total_amount), 0) as daily_sales,
      COALESCE(SUM(s.subtotal - s.discount_amount - (si_cogs.cogs)), 0) as estimated_profit
    FROM sales s
    LEFT JOIN (
      SELECT sale_id, SUM(quantity * unit_cost_snapshot) as cogs
      FROM sale_items
      GROUP BY sale_id
    ) si_cogs ON s.id = si_cogs.sale_id
    WHERE s.status != 'CANCELLED' AND s.sale_date BETWEEN ? AND ?
    GROUP BY s.sale_date
    ORDER BY s.sale_date ASC
  `;
  return await queryAll(sql, [startDate, endDate]);
}

/**
 * Expense breakdown by category
 */
export async function getExpensesByCategory({ startDate, endDate }) {
  const sql = `
    SELECT 
      category,
      COUNT(id) as count,
      COALESCE(SUM(amount), 0) as total_amount
    FROM expenses
    WHERE expense_date BETWEEN ? AND ?
    GROUP BY category
    ORDER BY total_amount DESC
  `;
  return await queryAll(sql, [startDate, endDate]);
}
