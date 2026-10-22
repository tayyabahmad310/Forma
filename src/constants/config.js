/**
 * Default App Configurations & Business Options
 */

export const DEFAULT_SETTINGS = {
  business_name: 'Clothio Apparel & Boutique',
  business_phone: '+92 300 1234567',
  business_address: 'Main Commercial Market, Lahore, Pakistan',
  currency_code: 'PKR',
  currency_symbol: 'Rs',
  receipt_footer: 'Thank you for shopping with Clothio! Returns accepted within 7 days with original receipt.',
  default_min_stock_alert: '5',
  pin_security_enabled: 'false',
  pin_auto_lock: 'false',
};

export const CLOTHING_SIZES = [
  'Free Size',
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  '3XL',
  '28',
  '30',
  '32',
  '34',
  '36',
  '38',
];

export const CLOTHING_COLORS = [
  'Black',
  'White',
  'Navy Blue',
  'Charcoal Grey',
  'Beige',
  'Olive Green',
  'Maroon',
  'Camel',
  'Brown',
  'Sky Blue',
  'Pink',
  'Mustard',
  'Multicolor',
];

export const DEFAULT_CATEGORIES = [
  'Shirts & Tops',
  'Trousers & Jeans',
  'T-Shirts & Polos',
  'Dresses & Kurtis',
  'Jackets & Outerwear',
  'Suits & Formal',
  'Traditional Wear',
  'Accessories',
];

export const EXPENSE_CATEGORIES = [
  'Shop Rent',
  'Utilities (Electricity/Water)',
  'Staff Salaries',
  'Packaging & Shopping Bags',
  'Shop Maintenance & Repairs',
  'Marketing & Signage',
  'Transport & Courier',
  'Refreshments & Tea',
  'Other Expenses',
];

export const PAYMENT_METHODS = [
  { id: 'CASH', label: 'Cash' },
  { id: 'CARD', label: 'Credit/Debit Card' },
  { id: 'BANK', label: 'Bank Transfer' },
  { id: 'WALLET', label: 'EasyPaisa / JazzCash' },
];

export const MOVEMENT_TYPES = {
  PURCHASE: 'PURCHASE',
  SALE: 'SALE',
  RETURN: 'RETURN',
  DAMAGE: 'DAMAGE',
  LOST: 'LOST',
  ADJUSTMENT: 'ADJUSTMENT',
};

export const DISCOUNT_TYPES = {
  NONE: 'NONE',
  PERCENTAGE: 'PERCENTAGE',
  FIXED: 'FIXED',
};
