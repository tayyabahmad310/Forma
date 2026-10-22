/**
 * Luxury Fashion Pill Button Component
 * Rounded pill shape, warm terracotta/cognac solid & charcoal variants, smooth touch feedback.
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

export default function Button({
  title,
  onPress,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size = 'md', // 'sm' | 'md' | 'lg'
  icon = null,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          button: styles.secondaryButton,
          text: styles.secondaryText,
          iconColor: COLORS.textInverse,
        };
      case 'outline':
        return {
          button: styles.outlineButton,
          text: styles.outlineText,
          iconColor: COLORS.primary,
        };
      case 'ghost':
        return {
          button: styles.ghostButton,
          text: styles.ghostText,
          iconColor: COLORS.textPrimary,
        };
      case 'danger':
        return {
          button: styles.dangerButton,
          text: styles.dangerText,
          iconColor: COLORS.textInverse,
        };
      case 'primary':
      default:
        return {
          button: styles.primaryButton,
          text: styles.primaryText,
          iconColor: COLORS.textInverse,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          button: styles.smButton,
          text: styles.smText,
          iconSize: 16,
        };
      case 'lg':
        return {
          button: styles.lgButton,
          text: styles.lgText,
          iconSize: 22,
        };
      case 'md':
      default:
        return {
          button: styles.mdButton,
          text: styles.mdText,
          iconSize: 18,
        };
    }
  };

  const variantStyle = getVariantStyles();
  const sizeStyle = getSizeStyles();

  return (
    <TouchableOpacity
      style={[
        styles.baseButton,
        variantStyle.button,
        sizeStyle.button,
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
          color={variant === 'outline' || variant === 'ghost' ? COLORS.primary : COLORS.textInverse}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon}
              size={sizeStyle.iconSize}
              color={variantStyle.iconColor}
              style={styles.leftIcon}
            />
          )}
          <Text
            style={[
              styles.baseText,
              variantStyle.text,
              sizeStyle.text,
              disabled && styles.disabledText,
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons
              name={icon}
              size={sizeStyle.iconSize}
              color={variantStyle.iconColor}
              style={styles.rightIcon}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseText: {
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  leftIcon: {
    marginRight: SPACING.sm,
  },
  rightIcon: {
    marginLeft: SPACING.sm,
  },

  // Variants
  primaryButton: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.subtle,
  },
  primaryText: {
    color: COLORS.textInverse,
  },

  secondaryButton: {
    backgroundColor: COLORS.secondary,
  },
  secondaryText: {
    color: COLORS.textInverse,
  },

  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  outlineText: {
    color: COLORS.primary,
  },

  ghostButton: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: COLORS.textPrimary,
  },

  dangerButton: {
    backgroundColor: COLORS.danger,
  },
  dangerText: {
    color: COLORS.textInverse,
  },

  disabledButton: {
    backgroundColor: COLORS.border,
    borderColor: COLORS.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledText: {
    color: COLORS.textTertiary,
  },

  // Sizes
  smButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 36,
  },
  smText: {
    fontSize: 13,
  },

  mdButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 48,
  },
  mdText: {
    fontSize: 15,
  },

  lgButton: {
    paddingVertical: 16,
    paddingHorizontal: 28,
    minHeight: 54,
  },
  lgText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
