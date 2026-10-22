/**
 * Reusable Status & Tag Badge Component
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';

export default function Badge({
  label,
  variant = 'default', // 'success' | 'warning' | 'danger' | 'info' | 'default'
  size = 'md', // 'sm' | 'md'
  style = null,
}) {
  const getBadgeStyle = () => {
    switch (variant) {
      case 'success':
        return { bg: COLORS.successLight, text: COLORS.successText };
      case 'warning':
        return { bg: COLORS.warningLight, text: COLORS.warningText };
      case 'danger':
        return { bg: COLORS.dangerLight, text: COLORS.dangerText };
      case 'info':
        return { bg: COLORS.infoLight, text: COLORS.infoText };
      case 'default':
      default:
        return { bg: COLORS.surfaceSubtle, text: COLORS.textSecondary };
    }
  };

  const { bg, text } = getBadgeStyle();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg },
        size === 'sm' && styles.badgeSm,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: text },
          size === 'sm' && styles.textSm,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeSm: {
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 1,
  },
  text: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  textSm: {
    fontSize: 10,
    lineHeight: 12,
  },
});
