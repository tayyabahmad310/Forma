/**
 * Application Theme and Design Tokens
 * Inspired by modern boutique & premium fashion store aesthetics.
 * Balanced typography, clean surfaces, muted accents, and crisp contrast.
 */

export const COLORS = {
  // Brand & Accent Colors
  primary: '#18181B', // Rich obsidian/black for primary actions and headings
  primaryHover: '#27272A',
  accent: '#C27803', // Warm camel / amber accent for highlights
  accentLight: '#FEF3C7',
  accentDark: '#92400E',

  // Semantic Financial & Stock Colors
  success: '#059669', // Emerald for profits, paid status, in-stock
  successLight: '#D1FAE5',
  successText: '#065F46',

  warning: '#D97706', // Amber for low-stock, partial payments
  warningLight: '#FEF3C7',
  warningText: '#92400E',

  danger: '#DC2626', // Crimson for out-of-stock, cancellations, expenses
  dangerLight: '#FEE2E2',
  dangerText: '#991B1B',

  info: '#2563EB', // Sapphire for returns, movements, customer info
  infoLight: '#DBEAFE',
  infoText: '#1E40AF',

  // Surfaces & Backgrounds
  background: '#F9FAFB', // Soft modern canvas
  surface: '#FFFFFF', // Clean card/container surface
  surfaceElevated: '#FFFFFF',
  surfaceSubtle: '#F4F4F5', // Subtle secondary surface (search bars, tag pills)

  // Typography
  textPrimary: '#09090B', // High contrast deep charcoal
  textSecondary: '#71717A', // Muted secondary text
  textTertiary: '#A1A1AA', // Subtle placeholder / timestamp
  textInverse: '#FFFFFF', // Text on primary button/badge

  // Borders & Dividers
  border: '#E4E4E7', // Fine border line
  borderLight: '#F4F4F5',
  borderDark: '#D4D4D8',

  // POS & Keypad special
  keypadBg: '#F4F4F5',
  keypadText: '#18181B',
  keypadHighlight: '#E4E4E7',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const TYPOGRAPHY = {
  h1: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
    letterSpacing: 0.2,
  },
  mono: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
};

export const SHADOWS = {
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};
