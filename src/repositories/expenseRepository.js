/**
 * Expense Repository
 * Manages operating business expenses (Rent, Utilities, Salaries, etc.)
 */

import { queryAll, queryFirst, execute } from '../database/queryUtils';
import { getCurrentTimestamp, getTodayDateString } from '../utils/date';

export async function getExpensesPaginated({
  category = null,
  startDate = null,
  endDate = null,
  limit = 20,
  offset = 0,
}) {
  const whereClauses = [];
  const params = [];

  if (category && category !== 'All') {
    whereClauses.push('category = ?');
    params.push(category);
  }
  if (startDate && endDate) {
    whereClauses.push('expense_date BETWEEN ? AND ?');
    params.push(startDate, endDate);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT * FROM expenses
    ${whereSql}
    ORDER BY expense_date DESC, id DESC
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);
  return await queryAll(sql, params);
}

export async function getExpenseById(id) {
  return await queryFirst('SELECT * FROM expenses WHERE id = ?', [id]);
}

export async function createExpense(data) {
  const now = getCurrentTimestamp();
  const {
    title,
    category,
    amount,
    expenseDate = null,
    paymentMethod = 'CASH',
    notes = null,
  } = data;

  const date = expenseDate || getTodayDateString();

  const res = await execute(
    `INSERT INTO expenses (
      title, category, amount, expense_date, payment_method, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [title.trim(), category, amount, date, paymentMethod, notes ? notes.trim() : null, now, now]
  );

  return { id: res.lastInsertRowId, ...data, created_at: now };
}

export async function updateExpense(id, data) {
  const now = getCurrentTimestamp();
  const { title, category, amount, expenseDate, paymentMethod = 'CASH', notes = null } = data;

  await execute(
    `UPDATE expenses SET 
      title = ?, category = ?, amount = ?, expense_date = ?,
      payment_method = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
    [title.trim(), category, amount, expenseDate, paymentMethod, notes ? notes.trim() : null, now, id]
  );

  return await getExpenseById(id);
}

export async function deleteExpense(id) {
  return await execute('DELETE FROM expenses WHERE id = ?', [id]);
}
