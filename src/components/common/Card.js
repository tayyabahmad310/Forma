/**
 * Luxury Fashion Card Component
 * Crisp rounded container, warm subtle border, delicate shadow.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';

export default function Card({
  children,
  style,
  onPress = null,
  activeOpacity = 0.75,
  variant = 'default', // 'default' | 'elevated' | 'subtle' | 'outline'
}) {
  const getVariantStyle = () => {
    switch (variant) {
      case 'elevated':
        return styles.elevatedCard;
      case 'subtle':
        return styles.subtleCard;
      case 'outline':
        return styles.outlineCard;
      case 'default':
      default:
        return styles.defaultCard;
    }
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.baseCard, getVariantStyle(), style]}
        onPress={onPress}
        activeOpacity={activeOpacity}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.baseCard, getVariantStyle(), style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  baseCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  defaultCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.subtle,
  },
  elevatedCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  subtleCard: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  outlineCard: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
