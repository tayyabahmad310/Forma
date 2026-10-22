/**
 * Currency and Money Utility Functions
 * Stored internally as integer minor units (paisas/cents) to prevent any floating point rounding issues.
 * 1 PKR = 100 minor units (e.g. Rs 1,500.00 = 150000 minor units).
 */

/**
 * Format minor units into human-readable currency string.
 * @param {number} minorUnits - Amount in minor units (integer)
 * @param {string} [symbol='Rs'] - Currency symbol
 * @param {boolean} [showDecimals=false] - Whether to show .00
 * @returns {string} Formatted string, e.g. "Rs 1,500" or "Rs 1,500.50"
 */
export function formatCurrency(minorUnits, symbol = 'Rs', showDecimals = false) {
  if (minorUnits === null || minorUnits === undefined || isNaN(minorUnits)) {
    return `${symbol} 0`;
  }

  const isNegative = minorUnits < 0;
  const absUnits = Math.abs(Math.round(minorUnits));
  const majorUnits = Math.floor(absUnits / 100);
  const remainder = absUnits % 100;

  // Format with thousand separators
  const majorFormatted = majorUnits.toLocaleString('en-US');

  let result = '';
  if (showDecimals || remainder > 0) {
    const decimalPart = remainder.toString().padStart(2, '0');
    result = `${symbol} ${majorFormatted}.${decimalPart}`;
  } else {
    result = `${symbol} ${majorFormatted}`;
  }

  return isNegative ? `-${result}` : result;
}

/**
 * Convert user input (major units, e.g. "1500" or 1500.50) into integer minor units.
 * @param {number|string} input - Major currency amount
 * @returns {number} Integer minor units
 */
export function toMinorUnits(input) {
  if (input === null || input === undefined || input === '') {
    return 0;
  }
  const cleanInput = typeof input === 'string' ? input.replace(/[^0-9.-]/g, '') : input;
  const num = parseFloat(cleanInput);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Convert integer minor units into major units number (for form inputs).
 * @param {number} minorUnits
 * @returns {number} Major units float
 */
export function toMajorUnits(minorUnits) {
  if (!minorUnits) return 0;
  return minorUnits / 100;
}

/**
 * Calculate line item discount based on discount type and value.
 * @param {number} subtotalMinor - Line subtotal in minor units
 * @param {'NONE'|'PERCENTAGE'|'FIXED'} discountType
 * @param {number} discountValue - e.g. 10 for 10%, or minor units for fixed
 * @returns {number} Discount amount in minor units
 */
export function calculateDiscount(subtotalMinor, discountType, discountValue) {
  if (!discountType || discountType === 'NONE' || !discountValue || discountValue <= 0) {
    return 0;
  }

  if (discountType === 'PERCENTAGE') {
    const percentage = Math.min(100, Math.max(0, discountValue));
    return Math.round((subtotalMinor * percentage) / 100);
  }

  if (discountType === 'FIXED') {
    return Math.min(subtotalMinor, Math.max(0, discountValue));
  }

  return 0;
}
