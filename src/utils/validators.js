/**
 * Input Validation Utilities
 */

export function validateRequired(value, fieldName = 'Field') {
  if (value === null || value === undefined || String(value).trim() === '') {
    return `${fieldName} is required`;
  }
  return null;
}

export function validatePositiveNumber(value, fieldName = 'Amount', allowZero = false) {
  const num = Number(value);
  if (isNaN(num)) {
    return `${fieldName} must be a valid number`;
  }
  if (allowZero ? num < 0 : num <= 0) {
    return `${fieldName} must be greater than ${allowZero ? 'or equal to 0' : '0'}`;
  }
  return null;
}

export function validateInteger(value, fieldName = 'Quantity') {
  const num = Number(value);
  if (isNaN(num) || !Number.isInteger(num)) {
    return `${fieldName} must be an integer`;
  }
  if (num <= 0) {
    return `${fieldName} must be at least 1`;
  }
  return null;
}

export function validateSKU(sku) {
  if (!sku || sku.trim() === '') return null; // optional
  const clean = sku.trim();
  if (clean.length < 2 || clean.length > 32) {
    return 'SKU must be between 2 and 32 characters';
  }
  return null;
}
