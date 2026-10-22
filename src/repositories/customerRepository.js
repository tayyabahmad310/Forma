/**
 * Customer Repository
 * Manages customer directory and balance ledger.
 */

import { queryAll, queryFirst, execute } from '../database/queryUtils';
import { getCurrentTimestamp } from '../utils/date';

export async function getAllCustomers() {
  return await queryAll('SELECT * FROM customers ORDER BY name ASC');
}

export async function getCustomersPaginated({
  search = '',
  hasBalanceOnly = false,
  limit = 20,
  offset = 0,
}) {
  const whereClauses = [];
  const params = [];

  if (search && search.trim() !== '') {
    whereClauses.push('(c.name LIKE ? OR c.phone LIKE ?)');
    const term = `%${search.trim()}%`;
    params.push(term, term);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const havingSql = hasBalanceOnly ? 'HAVING outstanding_balance > 0' : '';

  const sql = `
    SELECT 
      c.*,
      COALESCE(SUM(CASE WHEN s.status != 'CANCELLED' THEN s.balance_amount ELSE 0 END), 0) as outstanding_balance,
      COUNT(CASE WHEN s.status != 'CANCELLED' THEN s.id ELSE NULL END) as total_orders
    FROM customers c
    LEFT JOIN sales s ON c.id = s.customer_id
    ${whereSql}
    GROUP BY c.id
    ${havingSql}
    ORDER BY c.name ASC
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);
  return await queryAll(sql, params);
}

export async function getCustomerById(id) {
  const sql = `
    SELECT 
      c.*,
      COALESCE(SUM(CASE WHEN s.status != 'CANCELLED' THEN s.balance_amount ELSE 0 END), 0) as outstanding_balance,
      COUNT(CASE WHEN s.status != 'CANCELLED' THEN s.id ELSE NULL END) as total_orders
    FROM customers c
    LEFT JOIN sales s ON c.id = s.customer_id
    WHERE c.id = ?
    GROUP BY c.id
  `;
  return await queryFirst(sql, [id]);
}

export async function createCustomer(data) {
  const now = getCurrentTimestamp();
  const { name, phone = null, notes = null } = data;

  const res = await execute(
    `INSERT INTO customers (name, phone, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [name.trim(), phone ? phone.trim() : null, notes ? notes.trim() : null, now, now]
  );

  return { id: res.lastInsertRowId, ...data, created_at: now };
}

export async function updateCustomer(id, data) {
  const now = getCurrentTimestamp();
  const { name, phone = null, notes = null } = data;

  await execute(
    `UPDATE customers SET name = ?, phone = ?, notes = ?, updated_at = ? WHERE id = ?`,
    [name.trim(), phone ? phone.trim() : null, notes ? notes.trim() : null, now, id]
  );

  return await getCustomerById(id);
}

/**
 * Get recent sales for a customer
 */
export async function getCustomerSales(customerId, limit = 10) {
  const sql = `
    SELECT * FROM sales 
    WHERE customer_id = ?
    ORDER BY sale_date DESC, id DESC
    LIMIT ?
  `;
  return await queryAll(sql, [customerId, limit]);
}
