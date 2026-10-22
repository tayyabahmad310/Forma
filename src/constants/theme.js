/**
 * Application Theme and Design Tokens
 * Luxury Boutique & Fashion Store Aesthetics
 * Exact match to high-end fashion POS & Inventory design system:
 * Deep Cognac / Terracotta primary, soft charcoal secondary, warm linen background,
 * rounded pill buttons, and refined typography.
 */

export const COLORS = {
  // Brand Primary & Accents (Warm Cognac / Terracotta)
  primary: '#5B2413', // Rich warm terracotta / saddle leather
  primaryHover: '#461B0E',
  primaryDark: '#36140A',
  primaryLight: '#7A331D',
  primaryMuted: '#94452C',
  primarySurface: '#FAF2EE', // Ultra-soft warm blush for active states & highlights

  // Secondary & Neutral Dark (Soft Charcoal / Obsidian)
  secondary: '#121A1C', // Soft deep charcoal / elegant black
  secondaryHover: '#1E282B',
  secondaryMuted: '#2D3A3E',

  // Neutrals & Surfaces
  background: '#F8F7F5', // Warm linen cream canvas (no harsh sterile grey)
  surface: '#FFFFFF', // Pure crisp card surface
  surfaceElevated: '#FFFFFF',
  surfaceSubtle: '#F1EDE8', // Soft warm stone for search bars, chips & inputs
  surfaceHighlight: '#EFEAE4', // Active pill / card hover

  // Borders & Dividers
  border: '#EBE6DF', // Fine warm hairline border
  borderLight: '#F5F1EB',
  borderDark: '#D8D1C7',

  // Typography
  textPrimary: '#121A1C', // High readability soft obsidian
  textSecondary: '#6C6C6C', // Warm graphite grey
  textTertiary: '#9E9892', // Subtle placeholder / timestamp
  textInverse: '#FFFFFF', // Clean white on dark / terracotta buttons
  textAccent: '#5B2413',

  // Semantic Financial & Stock Colors
  success: '#2D6A4F', // Forest olive green for profit, in-stock, paid
  successLight: '#E8F5EE',
  successText: '#1B4332',

  // Warning & Low Stock
  warning: '#B45309', // Warm amber for low-stock, pending
  warningLight: '#FEF3C7',
  warningText: '#78350F',

  // Danger & Expenses
  danger: '#B91C1C', // Deep crimson for out-of-stock, cancellations, expenses
  dangerLight: '#FEE2E2',
  dangerText: '#7F1D1D',

  // Info & Movements
  info: '#2B5C8F', // Navy sapphire for transfers, credit ledgers
  infoLight: '#EBF3FA',
  infoText: '#1A365D',

  // Hero Banner Accent
  bannerCard: '#D7C4B7', // Warm mocha / sand card for promo banner
  bannerCardText: '#2C1810',

  // POS & Keypad
  keypadBg: '#F1EDE8',
  keypadText: '#121A1C',
  keypadHighlight: '#E4DDD5',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
};

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  pill: 9999, // Signature rounded pill style
  full: 9999,
};

export const TYPOGRAPHY = {
  display: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.6,
  },
  h1: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
    letterSpacing: -0.4,
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
  bodyBold: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  bodySmallMedium: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
    letterSpacing: 0.2,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  priceLarge: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  mono: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
};

export const SHADOWS = {
  subtle: {
    shadowColor: '#121A1C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    shadowColor: '#121A1C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  floating: {
    shadowColor: '#5B2413',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  modal: {
    shadowColor: '#121A1C',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 10,
  },
};
