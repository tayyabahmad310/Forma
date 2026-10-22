/**
 * Sales Returns and Refund Repository
 * Handles full/partial returns, restocking logic, and return audits.
 */

import { queryAll, queryFirst, execute, withTransaction } from '../database/queryUtils';
import { getCurrentTimestamp, getTodayDateString } from '../utils/date';
import { recordStockMovement } from './stockMovementRepository';
import { MOVEMENT_TYPES } from '../constants/config';

export async function generateReturnNumber() {
  const todayStr = getTodayDateString().replace(/-/g, '');
  const prefix = `RET-${todayStr}-`;
  const row = await queryFirst(
    `SELECT return_number FROM sales_returns WHERE return_number LIKE ? ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );
  if (!row) {
    return `${prefix}0001`;
  }
  const lastSeq = parseInt(row.return_number.replace(prefix, ''), 10) || 0;
  return `${prefix}${String(lastSeq + 1).padStart(4, '0')}`;
}

export async function getReturnsPaginated({
  saleId = null,
  startDate = null,
  endDate = null,
  limit = 20,
  offset = 0,
}) {
  const whereClauses = [];
  const params = [];

  if (saleId) {
    whereClauses.push('sr.sale_id = ?');
    params.push(saleId);
  }
  if (startDate && endDate) {
    whereClauses.push('sr.return_date BETWEEN ? AND ?');
    params.push(startDate, endDate);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT 
      sr.*,
      s.invoice_number as sale_invoice_number,
      c.name as customer_name,
      COUNT(sri.id) as return_item_count
    FROM sales_returns sr
    JOIN sales s ON sr.sale_id = s.id
    LEFT JOIN customers c ON sr.customer_id = c.id
    LEFT JOIN sales_return_items sri ON sr.id = sri.return_id
    ${whereSql}
    GROUP BY sr.id
    ORDER BY sr.created_at DESC, sr.id DESC
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);
  return await queryAll(sql, params);
}

export async function getReturnById(id) {
  const sql = `
    SELECT 
      sr.*,
      s.invoice_number as sale_invoice_number,
      c.name as customer_name
    FROM sales_returns sr
    JOIN sales s ON sr.sale_id = s.id
    LEFT JOIN customers c ON sr.customer_id = c.id
    WHERE sr.id = ?
  `;
  return await queryFirst(sql, [id]);
}

export async function getReturnItems(returnId) {
  const sql = `
    SELECT 
      sri.*,
      si.product_name_snapshot,
      si.variant_name_snapshot,
      si.unit_price_snapshot
    FROM sales_return_items sri
    JOIN sale_items si ON sri.sale_item_id = si.id
    WHERE sri.return_id = ?
  `;
  return await queryAll(sql, [returnId]);
}

/**
 * Process a sales return atomically.
 */
export async function createSalesReturn({
  saleId,
  customerId = null,
  returnDate = null,
  totalRefundAmount = 0,
  refundPaymentMethod = 'CASH',
  reason = null,
  items = [], // array of { saleItemId, variantId, quantity, unitRefundPrice, subtotal, restockEligible }
}) {
  const now = getCurrentTimestamp();
  const date = returnDate || getTodayDateString();
  const returnNumber = await generateReturnNumber();

  return await withTransaction(async (db) => {
    // 1. Verify that returning quantities do not exceed unreturned quantities
    for (const item of items) {
      const saleItem = await db.getFirstAsync(
        'SELECT quantity, returned_quantity FROM sale_items WHERE id = ?',
        [item.saleItemId]
      );
      if (!saleItem) {
        throw new Error(`Sale item #${item.saleItemId} not found.`);
      }
      const remainingUnreturned = saleItem.quantity - saleItem.returned_quantity;
      if (item.quantity > remainingUnreturned) {
        throw new Error(
          `Cannot return ${item.quantity} units. Only ${remainingUnreturned} remaining unreturned units for this item.`
        );
      }
    }

    // 2. Insert master return record
    const retRes = await db.runAsync(
      `INSERT INTO sales_returns (
        return_number, sale_id, customer_id, return_date,
        total_refund_amount, refund_payment_method, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        returnNumber,
        saleId,
        customerId || null,
        date,
        totalRefundAmount,
        refundPaymentMethod,
        reason || null,
        now,
      ]
    );

    const returnId = retRes.lastInsertRowId;

    // 3. Insert return items, update sale_items, and adjust stock if restock eligible
    for (const item of items) {
      const restockEligible = item.restockEligible ? 1 : 0;

      await db.runAsync(
        `INSERT INTO sales_return_items (
          return_id, sale_item_id, variant_id, quantity,
          unit_refund_price, subtotal, restock_eligible, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          returnId,
          item.saleItemId,
          item.variantId,
          item.quantity,
          item.unitRefundPrice,
          item.subtotal,
          restockEligible,
          now,
        ]
      );

      // Update sale_item returned_quantity
      await db.runAsync(
        'UPDATE sale_items SET returned_quantity = returned_quantity + ? WHERE id = ?',
        [item.quantity, item.saleItemId]
      );

      // If restock eligible, add back to inventory stock
      const variant = await db.getFirstAsync(
        'SELECT id, product_id, current_stock FROM product_variants WHERE id = ?',
        [item.variantId]
      );

      if (variant) {
        if (restockEligible === 1) {
          const newStock = variant.current_stock + item.quantity;
          await db.runAsync(
            'UPDATE product_variants SET current_stock = ?, updated_at = ? WHERE id = ?',
            [newStock, now, item.variantId]
          );

          await recordStockMovement({
            variantId: item.variantId,
            productId: variant.product_id,
            movementType: MOVEMENT_TYPES.RETURN,
            quantityChange: item.quantity,
            balanceAfter: newStock,
            referenceType: 'RETURN',
            referenceId: returnId,
            reason: `Return ${returnNumber}: Restocked eligible units`,
          }, db);
        } else {
          // Damaged/written off - record movement without increasing sellable stock
          await recordStockMovement({
            variantId: item.variantId,
            productId: variant.product_id,
            movementType: MOVEMENT_TYPES.DAMAGE,
            quantityChange: 0,
            balanceAfter: variant.current_stock,
            referenceType: 'RETURN_DAMAGED',
            referenceId: returnId,
            reason: `Return ${returnNumber}: Returned damaged/discarded (not restocked)`,
          }, db);
        }
      }
    }

    // 4. Update parent sale status
    const allSaleItems = await db.getAllAsync(
      'SELECT quantity, returned_quantity FROM sale_items WHERE sale_id = ?',
      [saleId]
    );

    const isFullyReturned = allSaleItems.every((si) => si.quantity === si.returned_quantity);
    const saleStatus = isFullyReturned ? 'RETURNED' : 'PARTIALLY_RETURNED';

    await db.runAsync(
      'UPDATE sales SET status = ?, updated_at = ? WHERE id = ?',
      [saleStatus, now, saleId]
    );

    return returnId;
  });
}
