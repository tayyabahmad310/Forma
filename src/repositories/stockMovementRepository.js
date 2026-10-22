/**
 * Stock Movement Repository
 * Provides audit logging and movement history for clothing inventory.
 */

import { queryAll, queryFirst, execute } from '../database/queryUtils';
import { getCurrentTimestamp } from '../utils/date';

/**
 * Record a stock movement into the audit trail.
 * @param {Object} movement
 * @param {import('expo-sqlite').SQLiteDatabase} [customDb] - Optional transaction DB instance
 */
export async function recordStockMovement(movement, customDb = null) {
  const {
    variantId,
    productId,
    movementType,
    quantityChange,
    balanceAfter,
    referenceType = null,
    referenceId = null,
    reason = null,
  } = movement;

  const now = getCurrentTimestamp();
  const sql = `
    INSERT INTO stock_movements (
      variant_id, product_id, movement_type, quantity_change,
      balance_after, reference_type, reference_id, reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    variantId,
    productId,
    movementType,
    quantityChange,
    balanceAfter,
    referenceType,
    referenceId,
    reason,
    now,
  ];

  if (customDb) {
    const res = await customDb.runAsync(sql, params);
    return res.lastInsertRowId;
  }
  const res = await execute(sql, params);
  return res.lastInsertRowId;
}

/**
 * Get paginated stock movements with product and variant names
 */
export async function getStockMovementsPaginated({
  productId = null,
  variantId = null,
  movementType = null,
  limit = 20,
  offset = 0,
}) {
  let whereClauses = [];
  let params = [];

  if (productId) {
    whereClauses.push('sm.product_id = ?');
    params.push(productId);
  }
  if (variantId) {
    whereClauses.push('sm.variant_id = ?');
    params.push(variantId);
  }
  if (movementType) {
    whereClauses.push('sm.movement_type = ?');
    params.push(movementType);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT 
      sm.*,
      p.name as product_name,
      pv.size,
      pv.color,
      pv.sku as variant_sku
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    JOIN product_variants pv ON sm.variant_id = pv.id
    ${whereSql}
    ORDER BY sm.created_at DESC, sm.id DESC
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);
  return await queryAll(sql, params);
}
