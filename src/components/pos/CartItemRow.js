/**
 * Luxury Fashion Cart Item Row
 * Matches reference image layout: rounded fashion thumbnail, title, size/color badge,
 * quantity stepper [-] 1 [+], total price, and subtle delete icon.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
import { formatCurrency } from '../../utils/currency';

export default function CartItemRow({
  item,
  onIncrement,
  onDecrement,
  onRemove,
  currencySymbol = 'Rs',
}) {
  const lineTotal = item.unit_price * item.quantity;

  return (
    <View style={styles.container}>
      {/* Thumbnail */}
      <View style={styles.thumbnailContainer}>
        <Ionicons name="shirt-outline" size={24} color={COLORS.primaryLight} />
      </View>

      {/* Item Info */}
      <View style={styles.detailsContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.product_name}
          </Text>
          <TouchableOpacity
            onPress={onRemove}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={17} color={COLORS.danger} />
          </TouchableOpacity>
        </View>

        {/* Variant Pills (Size & Color) */}
        <View style={styles.variantPillContainer}>
          {item.size ? (
            <View style={styles.variantChip}>
              <Text style={styles.variantText}>Size: {item.size}</Text>
            </View>
          ) : null}
          {item.color ? (
            <View style={styles.variantChip}>
              <Text style={styles.variantText}>{item.color}</Text>
            </View>
          ) : null}
        </View>

        {/* Bottom Stepper & Price Row */}
        <View style={styles.bottomRow}>
          {/* Stepper [-] qty [+] */}
          <View style={styles.stepperContainer}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={onDecrement}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="remove" size={14} color={COLORS.textPrimary} />
            </TouchableOpacity>

            <Text style={styles.quantityText}>{item.quantity}</Text>

            <TouchableOpacity
              style={styles.stepBtn}
              onPress={onIncrement}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="add" size={14} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Line Total */}
          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              {formatCurrency(lineTotal, currencySymbol)}
            </Text>
            {item.quantity > 1 && (
              <Text style={styles.unitPrice}>
                {formatCurrency(item.unit_price, currencySymbol)} each
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thumbnailContainer: {
    width: 68,
    height: 78,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  productName: {
    ...TYPOGRAPHY.h3,
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: SPACING.xs,
  },
  deleteButton: {
    padding: 2,
  },
  variantPillContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginVertical: 4,
  },
  variantChip: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  variantText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.textPrimary,
    paddingHorizontal: 10,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    ...TYPOGRAPHY.price,
    color: COLORS.primary,
  },
  unitPrice: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
});
