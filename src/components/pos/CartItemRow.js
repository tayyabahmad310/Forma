/**
 * POS Cart Item Row
 * Displays clothing item, size/color variant, quantity stepper,
 * custom discount, and subtotal.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
import { formatCurrency } from '../../utils/currency';

export default function CartItemRow({
  item,
  currencySymbol = 'Rs',
  onIncrement,
  onDecrement,
  onRemove,
  onEditDiscount,
}) {
  const unitPrice = item.customUnitPrice !== undefined && item.customUnitPrice !== null
    ? item.customUnitPrice
    : item.sellingPrice;

  return (
    <View style={styles.container}>
      <View style={styles.mainInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.productName}
          </Text>
          <TouchableOpacity
            onPress={onRemove}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
          </TouchableOpacity>
        </View>

        <View style={styles.variantBadgeRow}>
          <View style={styles.variantTag}>
            <Text style={styles.variantTagText}>Size: {item.size}</Text>
          </View>
          <View style={styles.variantTag}>
            <Text style={styles.variantTagText}>Color: {item.color}</Text>
          </View>
          {item.currentStock !== undefined && (
            <Text style={styles.stockNotice}>
              ({item.currentStock} in stock)
            </Text>
          )}
        </View>

        <View style={styles.actionRow}>
          {/* Stepper */}
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={onDecrement}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Ionicons name="remove" size={16} color={COLORS.textPrimary} />
            </TouchableOpacity>

            <Text style={styles.qtyText}>{item.quantity}</Text>

            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={onIncrement}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Ionicons name="add" size={16} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Price & Discount */}
          <TouchableOpacity
            style={styles.priceContainer}
            onPress={onEditDiscount}
          >
            <View style={styles.priceCol}>
              <Text style={styles.unitPriceText}>
                {formatCurrency(unitPrice, currencySymbol)} × {item.quantity}
              </Text>
              {item.discountAmount > 0 && (
                <Text style={styles.discountText}>
                  Disc: -{formatCurrency(item.discountAmount, currencySymbol)}
                </Text>
              )}
            </View>
            <Text style={styles.subtotalText}>
              {formatCurrency(item.subtotal, currencySymbol)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  mainInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  productName: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: SPACING.sm,
  },
  variantBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  variantTag: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    marginRight: SPACING.xs,
  },
  variantTagText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  stockNotice: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginLeft: SPACING.xs,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.sm,
    padding: 2,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    color: COLORS.textPrimary,
    minWidth: 32,
    textAlign: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceCol: {
    alignItems: 'flex-end',
    marginRight: SPACING.md,
  },
  unitPriceText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  discountText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    fontWeight: '500',
  },
  subtotalText: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
