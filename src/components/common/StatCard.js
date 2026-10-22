/**
 * Luxury Fashion StatCard Component
 * High-level business metric card with warm tinted backgrounds and crisp typography.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, SHADOWS } from '../../constants/theme';

export default function StatCard({
  title,
  value,
  subtitle = null,
  icon = null,
  trend = null, // e.g. "+12%"
  trendPositive = true,
  variant = 'default', // 'default' | 'primary' | 'success' | 'warning' | 'danger'
  style,
}) {
  const getVariantDetails = () => {
    switch (variant) {
      case 'primary':
        return {
          bg: COLORS.primarySurface,
          iconBg: COLORS.primary,
          iconColor: COLORS.textInverse,
          valueColor: COLORS.primary,
        };
      case 'success':
        return {
          bg: COLORS.successLight,
          iconBg: COLORS.success,
          iconColor: COLORS.textInverse,
          valueColor: COLORS.successText,
        };
      case 'warning':
        return {
          bg: COLORS.warningLight,
          iconBg: COLORS.warning,
          iconColor: COLORS.textInverse,
          valueColor: COLORS.warningText,
        };
      case 'danger':
        return {
          bg: COLORS.dangerLight,
          iconBg: COLORS.danger,
          iconColor: COLORS.textInverse,
          valueColor: COLORS.dangerText,
        };
      case 'default':
      default:
        return {
          bg: COLORS.surface,
          iconBg: COLORS.surfaceSubtle,
          iconColor: COLORS.primary,
          valueColor: COLORS.textPrimary,
        };
    }
  };

  const config = getVariantDetails();

  return (
    <View style={[styles.card, { backgroundColor: config.bg }, style]}>
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {icon && (
          <View style={[styles.iconCircle, { backgroundColor: config.iconBg }]}>
            <Ionicons name={icon} size={16} color={config.iconColor} />
          </View>
        )}
      </View>

      <Text style={[styles.value, { color: config.valueColor }]} numberOfLines={1}>
        {value}
      </Text>

      {(subtitle || trend) && (
        <View style={styles.bottomRow}>
          {trend && (
            <View style={styles.trendRow}>
              <Ionicons
                name={trendPositive ? 'trending-up' : 'trending-down'}
                size={14}
                color={trendPositive ? COLORS.success : COLORS.danger}
              />
              <Text
                style={[
                  styles.trendText,
                  { color: trendPositive ? COLORS.success : COLORS.danger },
                ]}
              >
                {trend}
              </Text>
            </View>
          )}
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.subtle,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    ...TYPOGRAPHY.priceLarge,
    marginBottom: SPACING.xs,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trendText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    flex: 1,
  },
});
