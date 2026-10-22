/**
 * Product & Variant Repository
 * Handles clothing items, sizing, colors, inventory levels, and paginated searches.
 */

import { queryAll, queryFirst, execute, withTransaction } from '../database/queryUtils';
import { getCurrentTimestamp } from '../utils/date';
import { recordStockMovement } from './stockMovementRepository';
import { MOVEMENT_TYPES } from '../constants/config';

/**
 * Get paginated list of products with aggregated total stock and variant count.
 * Uses SQL-side filtering and pagination.
 */
export async function getProductsPaginated({
  search = '',
  categoryId = null,
  stockStatus = 'all', // 'all', 'in_stock', 'low_stock', 'out_of_stock'
  activeOnly = true,
  limit = 20,
  offset = 0,
}) {
  const whereClauses = [];
  const params = [];

  if (activeOnly) {
    whereClauses.push('p.is_active = 1');
  }

  if (categoryId) {
    whereClauses.push('p.category_id = ?');
    params.push(categoryId);
  }

  if (search && search.trim() !== '') {
    const term = `%${search.trim()}%`;
    whereClauses.push('(p.name LIKE ? OR p.sku LIKE ? OR EXISTS (SELECT 1 FROM product_variants pv_search WHERE pv_search.product_id = p.id AND pv_search.sku LIKE ?))');
    params.push(term, term, term);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Having clause for stock status filters
  let havingSql = '';
  if (stockStatus === 'in_stock') {
    havingSql = 'HAVING total_stock > p.min_stock_alert';
  } else if (stockStatus === 'low_stock') {
    havingSql = 'HAVING total_stock > 0 AND total_stock <= p.min_stock_alert';
  } else if (stockStatus === 'out_of_stock') {
    havingSql = 'HAVING total_stock <= 0';
  }

  const sql = `
    SELECT 
      p.*,
      c.name as category_name,
      COALESCE(SUM(pv.current_stock), 0) as total_stock,
      COUNT(pv.id) as variant_count
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.is_active = 1
    ${whereSql}
    GROUP BY p.id
    ${havingSql}
    ORDER BY p.name ASC
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);
  return await queryAll(sql, params);
}

/**
 * Get single product by ID with category info.
 */
export async function getProductById(id) {
  const sql = `
    SELECT 
      p.*,
      c.name as category_name,
      COALESCE(SUM(pv.current_stock), 0) as total_stock
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.is_active = 1
    WHERE p.id = ?
    GROUP BY p.id
  `;
  return await queryFirst(sql, [id]);
}

/**
 * Get all variants for a given product.
 */
export async function getVariantsByProductId(productId) {
  const sql = `
    SELECT * FROM product_variants 
    WHERE product_id = ? AND is_active = 1 
    ORDER BY size ASC, color ASC
  `;
  return await queryAll(sql, [productId]);
}

/**
 * Get product with all its active variants.
 */
export async function getProductWithVariants(productId) {
  const product = await getProductById(productId);
  if (!product) return null;
  const variants = await getVariantsByProductId(productId);
  return { ...product, variants };
}

/**
 * Get variant by ID with parent product info.
 */
export async function getVariantById(variantId) {
  const sql = `
    SELECT 
      pv.*,
      p.name as product_name,
      p.default_selling_price as product_default_price,
      p.default_purchase_cost as product_default_cost,
      p.min_stock_alert
    FROM product_variants pv
    JOIN products p ON pv.product_id = p.id
    WHERE pv.id = ?
  `;
  return await queryFirst(sql, [variantId]);
}

/**
 * Create a new product and its variants atomically inside a transaction.
 */
export async function createProduct(productData, variantsData = []) {
  const now = getCurrentTimestamp();
  const {
    name,
    categoryId = null,
    sku = null,
    description = null,
    imageUri = null,
    defaultPurchaseCost = 0,
    defaultSellingPrice = 0,
    minStockAlert = 5,
  } = productData;

  return await withTransaction(async (db) => {
    // 1. Insert product
    const prodRes = await db.runAsync(
      `INSERT INTO products (
        name, category_id, sku, description, image_uri,
        default_purchase_cost, default_selling_price, min_stock_alert,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        name.trim(),
        categoryId || null,
        sku ? sku.trim() : null,
        description ? description.trim() : null,
        imageUri || null,
        defaultPurchaseCost,
        defaultSellingPrice,
        minStockAlert,
        now,
        now,
      ]
    );

    const productId = prodRes.lastInsertRowId;

    // 2. Insert variants (if none provided, create standard/default variant)
    const variantsToInsert = variantsData.length > 0 ? variantsData : [
      { size: 'Free Size', color: 'Standard', initialStock: 0 }
    ];

    for (const v of variantsToInsert) {
      const vSku = v.sku ? v.sku.trim() : null;
      const initialStock = v.initialStock ? parseInt(v.initialStock, 10) : 0;
      const purchaseCost = v.purchaseCost !== undefined ? v.purchaseCost : defaultPurchaseCost;
      const sellingPrice = v.sellingPrice !== undefined ? v.sellingPrice : defaultSellingPrice;

      const varRes = await db.runAsync(
        `INSERT INTO product_variants (
          product_id, size, color, sku, purchase_cost, selling_price,
          current_stock, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
          productId,
          v.size || 'Free Size',
          v.color || 'Standard',
          vSku,
          purchaseCost,
          sellingPrice,
          initialStock,
          now,
          now,
        ]
      );

      const variantId = varRes.lastInsertRowId;

      // If initial stock was given, record movement
      if (initialStock > 0) {
        await recordStockMovement({
          variantId,
          productId,
          movementType: MOVEMENT_TYPES.ADJUSTMENT,
          quantityChange: initialStock,
          balanceAfter: initialStock,
          reason: 'Initial stock on product creation',
        }, db);
      }
    }

    return productId;
  });
}

/**
 * Update product master information.
 */
export async function updateProduct(id, productData) {
  const now = getCurrentTimestamp();
  const {
    name,
    categoryId = null,
    sku = null,
    description = null,
    imageUri = null,
    defaultPurchaseCost = 0,
    defaultSellingPrice = 0,
    minStockAlert = 5,
  } = productData;

  await execute(
    `UPDATE products SET 
      name = ?, category_id = ?, sku = ?, description = ?, image_uri = ?,
      default_purchase_cost = ?, default_selling_price = ?, min_stock_alert = ?,
      updated_at = ?
    WHERE id = ?`,
    [
      name.trim(),
      categoryId || null,
      sku ? sku.trim() : null,
      description ? description.trim() : null,
      imageUri || null,
      defaultPurchaseCost,
      defaultSellingPrice,
      minStockAlert,
      now,
      id,
    ]
  );

  return await getProductById(id);
}

/**
 * Add a new variant to an existing product.
 */
export async function addVariant(productId, variantData) {
  const now = getCurrentTimestamp();
  const {
    size,
    color,
    sku = null,
    purchaseCost = null,
    sellingPrice = null,
    initialStock = 0,
  } = variantData;

  return await withTransaction(async (db) => {
    const res = await db.runAsync(
      `INSERT INTO product_variants (
        product_id, size, color, sku, purchase_cost, selling_price,
        current_stock, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        productId,
        size.trim(),
        color.trim(),
        sku ? sku.trim() : null,
        purchaseCost,
        sellingPrice,
        initialStock,
        now,
        now,
      ]
    );

    const variantId = res.lastInsertRowId;

    if (initialStock > 0) {
      await recordStockMovement({
        variantId,
        productId,
        movementType: MOVEMENT_TYPES.ADJUSTMENT,
        quantityChange: initialStock,
        balanceAfter: initialStock,
        reason: 'Initial stock on variant creation',
      }, db);
    }

    return variantId;
  });
}

/**
 * Search variants for POS checkout.
 * Returns active variants with parent product name, prices, and stock.
 */
export async function searchVariantsForPOS(searchTerm = '', limit = 30) {
  const params = [];
  let whereClause = 'WHERE p.is_active = 1 AND pv.is_active = 1';

  if (searchTerm && searchTerm.trim() !== '') {
    const term = `%${searchTerm.trim()}%`;
    whereClause += ' AND (p.name LIKE ? OR p.sku LIKE ? OR pv.sku LIKE ? OR pv.size LIKE ? OR pv.color LIKE ?)';
    params.push(term, term, term, term, term);
  }

  const sql = `
    SELECT 
      pv.id as variant_id,
      pv.product_id,
      p.name as product_name,
      p.image_uri,
      pv.size,
      pv.color,
      pv.sku as variant_sku,
      p.sku as product_sku,
      COALESCE(pv.selling_price, p.default_selling_price) as selling_price,
      COALESCE(pv.purchase_cost, p.default_purchase_cost) as purchase_cost,
      pv.current_stock
    FROM product_variants pv
    JOIN products p ON pv.product_id = p.id
    ${whereClause}
    ORDER BY p.name ASC, pv.size ASC
    LIMIT ?
  `;

  params.push(limit);
  return await queryAll(sql, params);
}

/**
 * Adjust stock manually (e.g. Damage, Loss, Correction) and record in audit trail.
 */
export async function adjustVariantStock({
  variantId,
  quantityChange, // can be negative (e.g. -2 for damage) or positive (+5 for correction)
  movementType, // 'DAMAGE', 'LOST', 'ADJUSTMENT'
  reason,
}) {
  return await withTransaction(async (db) => {
    // 1. Fetch current variant
    const variant = await db.getFirstAsync(
      'SELECT id, product_id, current_stock FROM product_variants WHERE id = ?',
      [variantId]
    );
    if (!variant) throw new Error('Variant not found');

    const newStock = variant.current_stock + quantityChange;
    if (newStock < 0) {
      throw new Error(`Insufficient stock. Current: ${variant.current_stock}, attempted change: ${quantityChange}`);
    }

    // 2. Update variant stock
    const now = getCurrentTimestamp();
    await db.runAsync(
      'UPDATE product_variants SET current_stock = ?, updated_at = ? WHERE id = ?',
      [newStock, now, variantId]
    );

    // 3. Record stock movement
    await recordStockMovement({
      variantId,
      productId: variant.product_id,
      movementType,
      quantityChange,
      balanceAfter: newStock,
      reason,
    }, db);

    return newStock;
  });
}
