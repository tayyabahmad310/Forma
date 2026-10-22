/**
 * Payment Repository
 * Handles cash collections, partial payment installments, and balance receipts.
 */

import { queryAll, queryFirst, execute, withTransaction } from '../database/queryUtils';
import { getCurrentTimestamp, getTodayDateString } from '../utils/date';

export async function generatePaymentNumber() {
  const todayStr = getTodayDateString().replace(/-/g, '');
  const prefix = `REC-${todayStr}-`;
  const row = await queryFirst(
    `SELECT payment_number FROM payments WHERE payment_number LIKE ? ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );
  if (!row) {
    return `${prefix}0001`;
  }
  const lastSeq = parseInt(row.payment_number.replace(prefix, ''), 10) || 0;
  return `${prefix}${String(lastSeq + 1).padStart(4, '0')}`;
}

export async function getPaymentsForSale(saleId) {
  const sql = `
    SELECT * FROM payments 
    WHERE reference_id = ? AND payment_type IN ('SALE_PAYMENT', 'CUSTOMER_BALANCE_PAYMENT')
    ORDER BY created_at ASC
  `;
  return await queryAll(sql, [saleId]);
}

export async function getPaymentsPaginated({
  customerId = null,
  startDate = null,
  endDate = null,
  limit = 20,
  offset = 0,
}) {
  const whereClauses = [];
  const params = [];

  if (customerId) {
    whereClauses.push('p.customer_id = ?');
    params.push(customerId);
  }
  if (startDate && endDate) {
    whereClauses.push('p.payment_date BETWEEN ? AND ?');
    params.push(startDate, endDate);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT 
      p.*,
      c.name as customer_name,
      s.invoice_number as sale_invoice_number
    FROM payments p
    LEFT JOIN customers c ON p.customer_id = c.id
    LEFT JOIN sales s ON p.reference_id = s.id
    ${whereSql}
    ORDER BY p.payment_date DESC, p.id DESC
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);
  return await queryAll(sql, params);
}

/**
 * Record a payment against an outstanding sale.
 * Atomically increases sale.paid_amount, reduces sale.balance_amount, and updates payment_status.
 */
export async function recordSalePayment({
  saleId,
  amount,
  paymentMethod = 'CASH',
  paymentDate = null,
  notes = null,
}) {
  const now = getCurrentTimestamp();
  const date = paymentDate || getTodayDateString();
  const paymentNumber = await generatePaymentNumber();

  return await withTransaction(async (db) => {
    // 1. Fetch current sale
    const sale = await db.getFirstAsync('SELECT * FROM sales WHERE id = ?', [saleId]);
    if (!sale) throw new Error('Sale not found');
    if (sale.balance_amount <= 0) {
      throw new Error('This sale has already been fully paid.');
    }
    if (amount > sale.balance_amount) {
      throw new Error(`Payment amount (${amount}) exceeds remaining balance (${sale.balance_amount}).`);
    }

    const newPaidAmount = sale.paid_amount + amount;
    const newBalanceAmount = sale.balance_amount - amount;
    const newStatus = newBalanceAmount === 0 ? 'PAID' : 'PARTIAL';

    // 2. Insert payment record
    const payRes = await db.runAsync(
      `INSERT INTO payments (
        payment_number, payment_type, reference_id, customer_id,
        amount, payment_method, payment_date, notes, created_at
      ) VALUES (?, 'CUSTOMER_BALANCE_PAYMENT', ?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentNumber,
        saleId,
        sale.customer_id || null,
        amount,
        paymentMethod,
        date,
        notes || null,
        now,
      ]
    );

    // 3. Update sale balance and status
    await db.runAsync(
      `UPDATE sales SET 
        paid_amount = ?, balance_amount = ?, payment_status = ?, updated_at = ?
       WHERE id = ?`,
      [newPaidAmount, newBalanceAmount, newStatus, now, saleId]
    );

    return payRes.lastInsertRowId;
  });
}
