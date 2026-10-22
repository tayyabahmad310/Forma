/**
 * Parameterized Database Query Helpers
 * Ensures safe execution, consistent error logging, and performance metrics.
 */

import { getDb } from './connection';

/**
 * Execute a parameterized query returning all matching rows.
 * @param {string} sql
 * @param {Array<any>} [params=[]]
 * @returns {Promise<Array<any>>}
 */
export async function queryAll(sql, params = []) {
  const db = getDb();
  return await db.getAllAsync(sql, params);
}

/**
 * Execute a parameterized query returning the first matching row or null.
 * @param {string} sql
 * @param {Array<any>} [params=[]]
 * @returns {Promise<any|null>}
 */
export async function queryFirst(sql, params = []) {
  const db = getDb();
  const row = await db.getFirstAsync(sql, params);
  return row || null;
}

/**
 * Execute an INSERT, UPDATE, or DELETE query.
 * @param {string} sql
 * @param {Array<any>} [params=[]]
 * @returns {Promise<{ lastInsertRowId: number, changes: number }>}
 */
export async function execute(sql, params = []) {
  const db = getDb();
  const result = await db.runAsync(sql, params);
  return {
    lastInsertRowId: result.lastInsertRowId,
    changes: result.changes,
  };
}

/**
 * Execute a batch of operations inside an atomic transaction.
 * Automatically rolls back if any operation fails.
 * @param {Function} callback - Async function receiving the db instance
 * @returns {Promise<any>}
 */
export async function withTransaction(callback) {
  const db = getDb();
  return await db.withTransactionAsync(async () => {
    return await callback(db);
  });
}

/**
 * Perform a SQLite PRAGMA integrity_check to verify database health.
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
export async function checkDatabaseIntegrity() {
  const db = getDb();
  try {
    const rows = await db.getAllAsync('PRAGMA integrity_check;');
    const isOk = rows.length === 1 && rows[0].integrity_check === 'ok';
    return {
      ok: isOk,
      message: isOk ? 'Database integrity verified: OK' : JSON.stringify(rows),
    };
  } catch (error) {
    return {
      ok: false,
      message: `Integrity check error: ${error.message}`,
    };
  }
}

/**
 * Get approximate row counts for diagnostic and performance reporting.
 * @returns {Promise<Object>}
 */
export async function getDatabaseStats() {
  const db = getDb();
  const tables = [
    'products',
    'product_variants',
    'categories',
    'suppliers',
    'purchases',
    'purchase_items',
    'customers',
    'sales',
    'sale_items',
    'payments',
    'expenses',
    'stock_movements',
    'sales_returns',
  ];

  const stats = {};
  for (const table of tables) {
    try {
      const row = await db.getFirstAsync(`SELECT COUNT(*) as count FROM ${table}`);
      stats[table] = row?.count || 0;
    } catch {
      stats[table] = 0;
    }
  }

  return stats;
}
