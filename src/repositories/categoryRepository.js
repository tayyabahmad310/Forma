/**
 * Category Repository
 */

import { queryAll, queryFirst, execute } from '../database/queryUtils';
import { getCurrentTimestamp } from '../utils/date';

export async function getAllCategories() {
  return await queryAll('SELECT * FROM categories ORDER BY name ASC');
}

export async function getCategoryById(id) {
  return await queryFirst('SELECT * FROM categories WHERE id = ?', [id]);
}

export async function createCategory(name) {
  const now = getCurrentTimestamp();
  const res = await execute(
    'INSERT INTO categories (name, created_at) VALUES (?, ?)',
    [name.trim(), now]
  );
  return { id: res.lastInsertRowId, name: name.trim(), created_at: now };
}

export async function updateCategory(id, name) {
  await execute('UPDATE categories SET name = ? WHERE id = ?', [name.trim(), id]);
  return await getCategoryById(id);
}

export async function deleteCategory(id) {
  return await execute('DELETE FROM categories WHERE id = ?', [id]);
}
