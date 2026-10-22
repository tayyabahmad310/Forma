/**
 * Supplier Repository
 */

import { queryAll, queryFirst, execute } from '../database/queryUtils';
import { getCurrentTimestamp } from '../utils/date';

export async function getAllSuppliers() {
  return await queryAll('SELECT * FROM suppliers ORDER BY name ASC');
}

export async function getSuppliersPaginated({ search = '', limit = 20, offset = 0 }) {
  let whereSql = '';
  const params = [];

  if (search && search.trim() !== '') {
    whereSql = 'WHERE name LIKE ? OR phone LIKE ?';
    const term = `%${search.trim()}%`;
    params.push(term, term);
  }

  const sql = `
    SELECT 
      s.*,
      COALESCE(SUM(p.balance_amount), 0) as outstanding_balance,
      COUNT(p.id) as purchase_count
    FROM suppliers s
    LEFT JOIN purchases p ON s.id = p.supplier_id AND p.status = 'COMPLETED'
    ${whereSql}
    GROUP BY s.id
    ORDER BY s.name ASC
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);
  return await queryAll(sql, params);
}

export async function getSupplierById(id) {
  const sql = `
    SELECT 
      s.*,
      COALESCE(SUM(p.balance_amount), 0) as outstanding_balance,
      COUNT(p.id) as purchase_count
    FROM suppliers s
    LEFT JOIN purchases p ON s.id = p.supplier_id AND p.status = 'COMPLETED'
    WHERE s.id = ?
    GROUP BY s.id
  `;
  return await queryFirst(sql, [id]);
}

export async function createSupplier(data) {
  const now = getCurrentTimestamp();
  const { name, phone = null, email = null, address = null } = data;

  const res = await execute(
    `INSERT INTO suppliers (name, phone, email, address, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [name.trim(), phone ? phone.trim() : null, email ? email.trim() : null, address ? address.trim() : null, now]
  );
  return { id: res.lastInsertRowId, ...data, created_at: now };
}

export async function updateSupplier(id, data) {
  const { name, phone = null, email = null, address = null } = data;
  await execute(
    `UPDATE suppliers SET name = ?, phone = ?, email = ?, address = ? WHERE id = ?`,
    [name.trim(), phone ? phone.trim() : null, email ? email.trim() : null, address ? address.trim() : null, id]
  );
  return await getSupplierById(id);
}

export async function deleteSupplier(id) {
  return await execute('DELETE FROM suppliers WHERE id = ?', [id]);
}
