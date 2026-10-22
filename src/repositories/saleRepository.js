/**
 * Sales and POS Repository
 * Handles transaction creation, historical cost/price snapshots,
 * atomic stock deductions, and receipt data retrieval.
 */

import { queryAll, queryFirst, execute, withTransaction } from '../database/queryUtils';
import { getCurrentTimestamp, getTodayDateString } from '../utils/date';
import { recordStockMovement } from './stockMovementRepository';
import { MOVEMENT_TYPES } from '../constants/config';

/**
 * Generate unique human-readable invoice number: INV-YYYYMMDD-XXXX
 */
export async function generateSaleInvoiceNumber() {
  const todayStr = getTodayDateString().replace(/-/g, '');
  const prefix = `INV-${todayStr}-`;
  const row = await queryFirst(
    `SELECT invoice_number FROM sales WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );
  if (!row) {
    return `${prefix}0001`;
  }
  const lastSeq = parseInt(row.invoice_number.replace(prefix, ''), 10) || 0;
  return `${prefix}${String(lastSeq + 1).padStart(4, '0')}`;
}

export async function getSalesPaginated({
  customerId = null,
  startDate = null,
  endDate = null,
  status = null,
  searchInvoice = null,
  limit = 20,
  offset = 0,
}) {
  const whereClauses = [];
  const params = [];

  if (customerId) {
    whereClauses.push('s.customer_id = ?');
    params.push(customerId);
  }
  if (startDate && endDate) {
    whereClauses.push('s.sale_date BETWEEN ? AND ?');
    params.push(startDate, endDate);
  }
  if (status) {
    whereClauses.push('s.status = ?');
    params.push(status);
  }
  if (searchInvoice && searchInvoice.trim() !== '') {
    whereClauses.push('(s.invoice_number LIKE ? OR s.customer_name_snapshot LIKE ?)');
    const term = `%${searchInvoice.trim()}%`;
    params.push(term, term);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT 
      s.*,
      c.name as customer_name,
      c.phone as customer_phone,
      COUNT(si.id) as item_count,
      SUM(si.quantity) as total_units_sold
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN sale_items si ON s.id = si.sale_id
    ${whereSql}
    GROUP BY s.id
    ORDER BY s.created_at DESC, s.id DESC
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);
  return await queryAll(sql, params);
}

export async function getSaleById(id) {
  const sql = `
    SELECT 
      s.*,
      c.name as customer_name,
      c.phone as customer_phone,
      c.notes as customer_notes
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE s.id = ?
  `;
  return await queryFirst(sql, [id]);
}

export async function getSaleItems(saleId) {
  const sql = `
    SELECT 
      si.*,
      p.image_uri,
      pv.size,
      pv.color,
      pv.sku as variant_sku
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN product_variants pv ON si.variant_id = pv.id
    WHERE si.sale_id = ?
    ORDER BY si.id ASC
  `;
  return await queryAll(sql, [saleId]);
}

/**
 * Complete a sale atomically.
 * Stock deduction, snapshots, payments, and movements are executed in a single SQLite transaction.
 */
export async function createSale({
  customerId = null,
  customerNameSnapshot = 'Walk-in Customer',
  customerPhoneSnapshot = null,
  saleDate = null,
  subtotal = 0,
  discountType = 'NONE',
  discountValue = 0,
  discountAmount = 0,
  totalAmount = 0,
  paidAmount = 0,
  paymentMethod = 'CASH',
  notes = null,
  items = [], // array of { productId, variantId, productName, variantName, quantity, unitPrice, unitCost, customUnitPrice, discountAmount, subtotal }
}) {
  const now = getCurrentTimestamp();
  const date = saleDate || getTodayDateString();
  const balanceAmount = Math.max(0, totalAmount - paidAmount);
  const paymentStatus = balanceAmount === 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';
  const invoiceNumber = await generateSaleInvoiceNumber();

  return await withTransaction(async (db) => {
    // 1. Stock verification for all items prior to deduction
    for (const item of items) {
      const variant = await db.getFirstAsync(
        'SELECT id, current_stock FROM product_variants WHERE id = ?',
        [item.variantId]
      );
      if (!variant) {
        throw new Error(`Variant #${item.variantId} not found in inventory.`);
      }
      if (variant.current_stock < item.quantity) {
        throw new Error(
          `Insufficient stock for "${item.productName} (${item.variantName})". Available: ${variant.current_stock}, Requested: ${item.quantity}`
        );
      }
    }

    // 2. Insert master sale record
    const saleRes = await db.runAsync(
      `INSERT INTO sales (
        invoice_number, customer_id, customer_name_snapshot, customer_phone_snapshot,
        sale_date, subtotal, discount_type, discount_value, discount_amount,
        total_amount, paid_amount, balance_amount, payment_method,
        payment_status, notes, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?)`,
      [
        invoiceNumber,
        customerId || null,
        customerNameSnapshot || 'Walk-in Customer',
        customerPhoneSnapshot || null,
        date,
        subtotal,
        discountType || 'NONE',
        discountValue || 0,
        discountAmount || 0,
        totalAmount,
        paidAmount,
        balanceAmount,
        paymentMethod || 'CASH',
        paymentStatus,
        notes || null,
        now,
        now,
      ]
    );

    const saleId = saleRes.lastInsertRowId;

    // 3. Insert line items with snapshots and deduct variant stock
    for (const item of items) {
      await db.runAsync(
        `INSERT INTO sale_items (
          sale_id, product_id, variant_id, product_name_snapshot,
          variant_name_snapshot, quantity, unit_cost_snapshot,
          unit_price_snapshot, custom_unit_price, discount_amount,
          subtotal, returned_quantity, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [
          saleId,
          item.productId,
          item.variantId,
          item.productName,
          item.variantName,
          item.quantity,
          item.unitCost, // historical cost snapshot
          item.unitPrice,
          item.customUnitPrice || null,
          item.discountAmount || 0,
          item.subtotal,
          now,
        ]
      );

      // Deduct stock from variant
      const currentVariant = await db.getFirstAsync(
        'SELECT current_stock FROM product_variants WHERE id = ?',
        [item.variantId]
      );
      const newStock = currentVariant.current_stock - item.quantity;

      await db.runAsync(
        'UPDATE product_variants SET current_stock = ?, updated_at = ? WHERE id = ?',
        [newStock, now, item.variantId]
      );

      // Record audit stock movement
      await recordStockMovement({
        variantId: item.variantId,
        productId: item.productId,
        movementType: MOVEMENT_TYPES.SALE,
        quantityChange: -item.quantity,
        balanceAfter: newStock,
        referenceType: 'SALE',
        referenceId: saleId,
        reason: `Sale Invoice ${invoiceNumber}`,
      }, db);
    }

    // 4. Record initial payment if paidAmount > 0
    if (paidAmount > 0) {
      const paymentNumber = `PAY-${invoiceNumber}`;
      await db.runAsync(
        `INSERT INTO payments (
          payment_number, payment_type, reference_id, customer_id,
          amount, payment_method, payment_date, notes, created_at
        ) VALUES (?, 'SALE_PAYMENT', ?, ?, ?, ?, ?, 'Initial payment at checkout', ?)`,
        [paymentNumber, saleId, customerId || null, paidAmount, paymentMethod, date, now]
      );
    }

    return { saleId, invoiceNumber };
  });
}
