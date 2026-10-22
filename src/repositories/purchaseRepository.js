/**
 * Purchase Repository
 * Handles inward stock purchases, supplier credits, and atomic stock increment.
 */

import { queryAll, queryFirst, execute, withTransaction } from '../database/queryUtils';
import { getCurrentTimestamp, getTodayDateString } from '../utils/date';
import { recordStockMovement } from './stockMovementRepository';
import { MOVEMENT_TYPES } from '../constants/config';

/**
 * Generate unique purchase invoice reference: e.g. PUR-20261022-0001
 */
export async function generatePurchaseInvoiceNumber() {
  const todayStr = getTodayDateString().replace(/-/g, '');
  const prefix = `PUR-${todayStr}-`;
  const row = await queryFirst(
    `SELECT invoice_number FROM purchases WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );
  if (!row) {
    return `${prefix}0001`;
  }
  const lastSeq = parseInt(row.invoice_number.replace(prefix, ''), 10) || 0;
  return `${prefix}${String(lastSeq + 1).padStart(4, '0')}`;
}

export async function getPurchasesPaginated({
  supplierId = null,
  startDate = null,
  endDate = null,
  status = null,
  limit = 20,
  offset = 0,
}) {
  const whereClauses = [];
  const params = [];

  if (supplierId) {
    whereClauses.push('p.supplier_id = ?');
    params.push(supplierId);
  }
  if (startDate && endDate) {
    whereClauses.push('p.purchase_date BETWEEN ? AND ?');
    params.push(startDate, endDate);
  }
  if (status) {
    whereClauses.push('p.status = ?');
    params.push(status);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT 
      p.*,
      s.name as supplier_name,
      s.phone as supplier_phone,
      COUNT(pi.id) as item_count
    FROM purchases p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
    ${whereSql}
    GROUP BY p.id
    ORDER BY p.purchase_date DESC, p.id DESC
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);
  return await queryAll(sql, params);
}

export async function getPurchaseById(id) {
  const sql = `
    SELECT 
      p.*,
      s.name as supplier_name,
      s.phone as supplier_phone
    FROM purchases p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.id = ?
  `;
  return await queryFirst(sql, [id]);
}

export async function getPurchaseItems(purchaseId) {
  const sql = `
    SELECT 
      pi.*,
      p.name as product_name,
      pv.size,
      pv.color,
      pv.sku as variant_sku
    FROM purchase_items pi
    JOIN products p ON pi.product_id = p.id
    JOIN product_variants pv ON pi.variant_id = pv.id
    WHERE pi.purchase_id = ?
    ORDER BY pi.id ASC
  `;
  return await queryAll(sql, [purchaseId]);
}

/**
 * Record a new purchase and atomically increase inventory stock.
 */
export async function createPurchase({
  invoiceNumber = null,
  supplierId = null,
  purchaseDate = null,
  subtotal = 0,
  discountAmount = 0,
  additionalCosts = 0,
  totalAmount = 0,
  paidAmount = 0,
  paymentStatus = 'PAID',
  notes = null,
  items = [], // array of { productId, variantId, quantity, unitCost, subtotal }
}) {
  const now = getCurrentTimestamp();
  const date = purchaseDate || getTodayDateString();
  const balanceAmount = Math.max(0, totalAmount - paidAmount);
  const invNumber = invoiceNumber || (await generatePurchaseInvoiceNumber());

  return await withTransaction(async (db) => {
    // 1. Insert master purchase
    const purchRes = await db.runAsync(
      `INSERT INTO purchases (
        invoice_number, supplier_id, purchase_date, subtotal,
        discount_amount, additional_costs, total_amount, paid_amount,
        balance_amount, payment_status, notes, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?)`,
      [
        invNumber,
        supplierId || null,
        date,
        subtotal,
        discountAmount,
        additionalCosts,
        totalAmount,
        paidAmount,
        balanceAmount,
        paymentStatus,
        notes || null,
        now,
        now,
      ]
    );

    const purchaseId = purchRes.lastInsertRowId;

    // 2. Insert items and update stock for each variant
    for (const item of items) {
      await db.runAsync(
        `INSERT INTO purchase_items (
          purchase_id, product_id, variant_id, quantity, unit_cost, subtotal, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [purchaseId, item.productId, item.variantId, item.quantity, item.unitCost, item.subtotal, now]
      );

      // Fetch variant for stock and update
      const variant = await db.getFirstAsync(
        'SELECT current_stock, purchase_cost FROM product_variants WHERE id = ?',
        [item.variantId]
      );

      const oldStock = variant ? variant.current_stock : 0;
      const newStock = oldStock + item.quantity;

      // Update variant stock & purchase cost
      await db.runAsync(
        'UPDATE product_variants SET current_stock = ?, purchase_cost = ?, updated_at = ? WHERE id = ?',
        [newStock, item.unitCost, now, item.variantId]
      );

      // Record stock movement
      await recordStockMovement({
        variantId: item.variantId,
        productId: item.productId,
        movementType: MOVEMENT_TYPES.PURCHASE,
        quantityChange: item.quantity,
        balanceAfter: newStock,
        referenceType: 'PURCHASE',
        referenceId: purchaseId,
        reason: `Purchase Invoice ${invNumber}`,
      }, db);
    }

    return purchaseId;
  });
}

/**
 * Cancel a completed purchase, safely reversing stock effects.
 */
export async function cancelPurchase(purchaseId) {
  const now = getCurrentTimestamp();
  return await withTransaction(async (db) => {
    const purchase = await db.getFirstAsync(
      'SELECT * FROM purchases WHERE id = ?',
      [purchaseId]
    );
    if (!purchase) throw new Error('Purchase not found');
    if (purchase.status === 'CANCELLED') throw new Error('Purchase is already cancelled');

    const items = await db.getAllAsync(
      'SELECT * FROM purchase_items WHERE purchase_id = ?',
      [purchaseId]
    );

    // Verify stock availability before reversal
    for (const item of items) {
      const variant = await db.getFirstAsync(
        'SELECT current_stock FROM product_variants WHERE id = ?',
        [item.variantId]
      );
      if (!variant || variant.current_stock < item.quantity) {
        throw new Error(
          `Cannot cancel purchase: Variant ID ${item.variantId} does not have sufficient stock to reverse (${variant?.current_stock || 0} available, need ${item.quantity}).`
        );
      }
    }

    // Reverse stock for each item
    for (const item of items) {
      const variant = await db.getFirstAsync(
        'SELECT current_stock FROM product_variants WHERE id = ?',
        [item.variantId]
      );
      const newStock = variant.current_stock - item.quantity;

      await db.runAsync(
        'UPDATE product_variants SET current_stock = ?, updated_at = ? WHERE id = ?',
        [newStock, now, item.variantId]
      );

      await recordStockMovement({
        variantId: item.variantId,
        productId: item.productId,
        movementType: MOVEMENT_TYPES.ADJUSTMENT,
        quantityChange: -item.quantity,
        balanceAfter: newStock,
        referenceType: 'PURCHASE_CANCEL',
        referenceId: purchaseId,
        reason: `Cancellation of Purchase ${purchase.invoice_number}`,
      }, db);
    }

    // Update purchase status
    await db.runAsync(
      'UPDATE purchases SET status = "CANCELLED", balance_amount = 0, updated_at = ? WHERE id = ?',
      [now, purchaseId]
    );

    return true;
  });
}
