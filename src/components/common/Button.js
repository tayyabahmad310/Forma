/**
 * Reusable Button Component
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';

export default function Button({
  title,
  onPress,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
  size = 'md', // 'sm' | 'md' | 'lg'
  icon = null,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  style = null,
  textStyle = null,
}) {
  const getButtonStyles = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryButton;
      case 'outline':
        return styles.outlineButton;
      case 'danger':
        return styles.dangerButton;
      case 'ghost':
        return styles.ghostButton;
      case 'primary':
      default:
        return styles.primaryButton;
    }
  };

  const getTextStyles = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryText;
      case 'outline':
        return styles.outlineText;
      case 'danger':
        return styles.dangerText;
      case 'ghost':
        return styles.ghostText;
      case 'primary':
      default:
        return styles.primaryText;
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return styles.smButton;
      case 'lg':
        return styles.lgButton;
      case 'md':
      default:
        return styles.mdButton;
    }
  };

  const iconColor =
    variant === 'primary' || variant === 'danger'
      ? COLORS.textInverse
      : variant === 'outline'
      ? COLORS.textPrimary
      : COLORS.textPrimary;

  return (
    <TouchableOpacity
      style={[
        styles.baseButton,
        getButtonStyles(),
        getSizeStyles(),
        disabled && styles.disabledButton,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? COLORS.textInverse : COLORS.primary}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && (
            <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={iconColor} style={styles.leftIcon} />
          )}
          <Text style={[styles.baseText, getTextStyles(), textStyle]}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={iconColor} style={styles.rightIcon} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    marginRight: SPACING.sm,
  },
  rightIcon: {
    marginLeft: SPACING.sm,
  },
  baseText: {
    fontWeight: '600',
    textAlign: 'center',
  },

  // Sizes
  smButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  mdButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  lgButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },

  // Variants
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  primaryText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textInverse,
    fontWeight: '600',
  },

  secondaryButton: {
    backgroundColor: COLORS.surfaceSubtle,
  },
  secondaryText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
  },

  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  outlineText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
  },

  dangerButton: {
    backgroundColor: COLORS.danger,
  },
  dangerText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textInverse,
    fontWeight: '600',
  },

  ghostButton: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.primary,
  },

  disabledButton: {
    opacity: 0.5,
  },
});
