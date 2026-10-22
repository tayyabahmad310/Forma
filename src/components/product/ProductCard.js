/**
 * Product Card Component for Catalog & Stock View
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
import { formatCurrency } from '../../utils/currency';
import Card from '../common/Card';
import Badge from '../common/Badge';

export default function ProductCard({
  product,
  currencySymbol = 'Rs',
  onPress,
  style = null,
}) {
  const totalStock = product.total_stock !== undefined ? product.total_stock : 0;
  const minAlert = product.min_stock_alert !== undefined ? product.min_stock_alert : 5;

  let stockVariant = 'success';
  let stockLabel = `${totalStock} in stock`;

  if (totalStock <= 0) {
    stockVariant = 'danger';
    stockLabel = 'Out of stock';
  } else if (totalStock <= minAlert) {
    stockVariant = 'warning';
    stockLabel = `Low: ${totalStock} left`;
  }

  return (
    <Card style={[styles.card, style]} onPress={onPress}>
      <View style={styles.row}>
        {/* Clothing Thumbnail Placeholder */}
        <View style={styles.imagePlaceholder}>
          <Ionicons name="shirt-outline" size={24} color={COLORS.textSecondary} />
        </View>

        {/* Info */}
        <View style={styles.infoCol}>
          <View style={styles.topMeta}>
            {product.category_name && (
              <Text style={styles.categoryText}>{product.category_name}</Text>
            )}
            <Badge label={stockLabel} variant={stockVariant} size="sm" />
          </View>

          <Text style={styles.nameText} numberOfLines={1}>
            {product.name}
          </Text>

          <View style={styles.bottomMeta}>
            <Text style={styles.priceText}>
              {formatCurrency(product.default_selling_price, currencySymbol)}
            </Text>

            <View style={styles.skuRow}>
              {product.variant_count > 0 && (
                <Text style={styles.variantCount}>
                  {product.variant_count} variant{product.variant_count > 1 ? 's' : ''}
                </Text>
              )}
              {product.sku && <Text style={styles.skuText}>#{product.sku}</Text>}
            </View>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imagePlaceholder: {
    width: 54,
    height: 54,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  infoCol: {
    flex: 1,
  },
  topMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  categoryText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  nameText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: 4,
  },
  bottomMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  skuRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  variantCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
  },
  skuText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
});
