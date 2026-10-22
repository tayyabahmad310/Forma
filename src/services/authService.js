/**
 * Local Authentication and PIN Security Service
 * Implements salted SHA-256 PIN hashing stored via Expo SecureStore.
 * Never stores plain text PINs.
 */

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { getSetting, setSetting } from '../repositories/settingsRepository';

const PIN_HASH_KEY = 'clothio_pin_hash';
const PIN_SALT_KEY = 'clothio_pin_salt';

/**
 * Generate a random cryptographic salt
 */
async function generateSalt() {
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash PIN with salt using SHA-256
 */
async function hashPin(pin, salt) {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`
  );
}

/**
 * Check if PIN security is currently enabled
 * @returns {Promise<boolean>}
 */
export async function isPinEnabled() {
  try {
    const settingVal = await getSetting('pin_security_enabled');
    if (settingVal !== 'true') return false;

    // Check if secure hash exists
    const storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
    return Boolean(storedHash);
  } catch (err) {
    console.warn('Error checking PIN status:', err);
    return false;
  }
}

/**
 * Set or change application PIN
 * @param {string} newPin - 4-6 digit string
 */
export async function setupPin(newPin) {
  if (!newPin || newPin.length < 4) {
    throw new Error('PIN must be at least 4 digits');
  }

  const salt = await generateSalt();
  const hash = await hashPin(newPin, salt);

  await SecureStore.setItemAsync(PIN_SALT_KEY, salt);
  await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
  await setSetting('pin_security_enabled', 'true');
  return true;
}

/**
 * Verify an entered PIN against the stored hash
 * @param {string} enteredPin
 * @returns {Promise<boolean>}
 */
export async function verifyPin(enteredPin) {
  try {
    const salt = await SecureStore.getItemAsync(PIN_SALT_KEY);
    const storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY);

    if (!salt || !storedHash) {
      return false;
    }

    const enteredHash = await hashPin(enteredPin, salt);
    return enteredHash === storedHash;
  } catch (error) {
    console.error('Error verifying PIN:', error);
    return false;
  }
}

/**
 * Remove/Disable PIN protection
 */
export async function disablePin(currentPin) {
  const isValid = await verifyPin(currentPin);
  if (!isValid) {
    throw new Error('Incorrect current PIN. Cannot disable PIN lock.');
  }

  await SecureStore.deleteItemAsync(PIN_SALT_KEY);
  await SecureStore.deleteItemAsync(PIN_HASH_KEY);
  await setSetting('pin_security_enabled', 'false');
  return true;
}
