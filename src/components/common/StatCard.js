/**
 * KPI Stat Card for Dashboard & Financial Reports
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import Card from './Card';

export default function StatCard({
  title,
  value,
  subtitle = null,
  icon = 'wallet-outline',
  iconColor = COLORS.primary,
  iconBg = COLORS.surfaceSubtle,
  trend = null, // e.g. "+12% vs last week"
  trendType = 'positive', // 'positive' | 'negative' | 'neutral'
  onPress = null,
  style = null,
}) {
  return (
    <Card style={[styles.card, style]} onPress={onPress}>
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        {trend && (
          <View style={styles.trendContainer}>
            <Text
              style={[
                styles.trendText,
                trendType === 'positive' && styles.trendPositive,
                trendType === 'negative' && styles.trendNegative,
              ]}
            >
              {trend}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {subtitle && (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.lg,
    flex: 1,
    minWidth: 150,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendContainer: {
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.surfaceSubtle,
  },
  trendText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  trendPositive: {
    color: COLORS.success,
  },
  trendNegative: {
    color: COLORS.danger,
  },
  value: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  title: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
});
