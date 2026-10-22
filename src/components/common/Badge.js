/**
 * Luxury Fashion Badge Component
 * Delicate pill badge with warm tinted surfaces.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';

export default function Badge({
  label,
  variant = 'default', // 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default'
  size = 'md', // 'sm' | 'md'
  style,
  textStyle,
}) {
  const getBadgeStyle = () => {
    switch (variant) {
      case 'primary':
        return {
          container: styles.primaryBadge,
          text: styles.primaryText,
        };
      case 'success':
        return {
          container: styles.successBadge,
          text: styles.successText,
        };
      case 'warning':
        return {
          container: styles.warningBadge,
          text: styles.warningText,
        };
      case 'danger':
        return {
          container: styles.dangerBadge,
          text: styles.dangerText,
        };
      case 'info':
        return {
          container: styles.infoBadge,
          text: styles.infoText,
        };
      case 'default':
      default:
        return {
          container: styles.defaultBadge,
          text: styles.defaultText,
        };
    }
  };

  const badgeStyle = getBadgeStyle();

  return (
    <View
      style={[
        styles.baseBadge,
        size === 'sm' ? styles.smBadge : styles.mdBadge,
        badgeStyle.container,
        style,
      ]}
    >
      <Text
        style={[
          styles.baseText,
          size === 'sm' ? styles.smText : styles.mdText,
          badgeStyle.text,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  baseBadge: {
    borderRadius: RADIUS.pill,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseText: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  smBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  smText: {
    fontSize: 10,
    lineHeight: 14,
  },
  mdBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mdText: {
    fontSize: 11,
    lineHeight: 15,
  },

  primaryBadge: {
    backgroundColor: COLORS.primarySurface,
  },
  primaryText: {
    color: COLORS.primary,
  },

  successBadge: {
    backgroundColor: COLORS.successLight,
  },
  successText: {
    color: COLORS.successText,
  },

  warningBadge: {
    backgroundColor: COLORS.warningLight,
  },
  warningText: {
    color: COLORS.warningText,
  },

  dangerBadge: {
    backgroundColor: COLORS.dangerLight,
  },
  dangerText: {
    color: COLORS.dangerText,
  },

  infoBadge: {
    backgroundColor: COLORS.infoLight,
  },
  infoText: {
    color: COLORS.infoText,
  },

  defaultBadge: {
    backgroundColor: COLORS.surfaceSubtle,
  },
  defaultText: {
    color: COLORS.textSecondary,
  },
});
