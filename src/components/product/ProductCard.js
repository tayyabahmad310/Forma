/**
 * Luxury Fashion 2-Column Product Card
 * Matches the reference image layout: rounded fashion image, title, price, category pill, quick add button.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { formatCurrency } from '../../utils/currency';
import Badge from '../common/Badge';

export default function ProductCard({
  product,
  onPress,
  onQuickAdd = null,
  currencySymbol = 'Rs',
  style,
}) {
  const stock = product.total_stock !== undefined ? product.total_stock : product.stock || 0;
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= (product.min_stock_alert || 5);

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Product Image / Illustration Hero Container */}
      <View style={styles.imageContainer}>
        <View style={styles.imagePlaceholder}>
          <Ionicons name="shirt-outline" size={36} color={COLORS.primaryLight} />
        </View>

        {/* Top Badges */}
        <View style={styles.topBadgeRow}>
          {product.category_name ? (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText} numberOfLines={1}>
                {product.category_name}
              </Text>
            </View>
          ) : <View />}

          {/* Stock Status Pill */}
          {isOutOfStock ? (
            <Badge label="Sold Out" variant="danger" size="sm" />
          ) : isLowStock ? (
            <Badge label={`Low: ${stock}`} variant="warning" size="sm" />
          ) : null}
        </View>
      </View>

      {/* Product Information */}
      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {product.name}
        </Text>

        <Text style={styles.sku} numberOfLines={1}>
          SKU: {product.sku || 'N/A'} {product.variant_count ? `• ${product.variant_count} sizes` : ''}
        </Text>

        {/* Bottom Price & Quick Add Row */}
        <View style={styles.bottomRow}>
          <View>
            <Text style={styles.priceLabel}>Price</Text>
            <Text style={styles.price}>
              {formatCurrency(product.selling_price || 0, currencySymbol)}
            </Text>
          </View>

          {onQuickAdd && (
            <TouchableOpacity
              style={[styles.addButton, isOutOfStock && styles.addButtonDisabled]}
              onPress={() => !isOutOfStock && onQuickAdd(product)}
              disabled={isOutOfStock}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="bag-add"
                size={16}
                color={isOutOfStock ? COLORS.textTertiary : COLORS.textInverse}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.subtle,
  },
  imageContainer: {
    height: 150,
    backgroundColor: COLORS.surfaceSubtle,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBadgeRow: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    maxWidth: '65%',
  },
  categoryPillText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  infoContainer: {
    padding: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.h3,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  sku: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginBottom: SPACING.sm,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  priceLabel: {
    fontSize: 10,
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  price: {
    ...TYPOGRAPHY.price,
    color: COLORS.primary,
  },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: COLORS.border,
  },
});
