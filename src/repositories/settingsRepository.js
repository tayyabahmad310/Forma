/**
 * Settings Repository
 * Key-value persistent settings in SQLite.
 */

import { queryAll, queryFirst, execute } from '../database/queryUtils';
import { getCurrentTimestamp } from '../utils/date';
import { DEFAULT_SETTINGS } from '../constants/config';

export async function getAllSettings() {
  const rows = await queryAll('SELECT key, value FROM app_settings');
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

export async function getSetting(key) {
  const row = await queryFirst('SELECT value FROM app_settings WHERE key = ?', [key]);
  if (row) return row.value;
  return DEFAULT_SETTINGS[key] || null;
}

export async function setSetting(key, value) {
  const now = getCurrentTimestamp();
  await execute(
    `INSERT INTO app_settings (key, value, updated_at) 
     VALUES (?, ?, ?) 
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, String(value), now]
  );
  return value;
}

export async function updateMultipleSettings(settingsMap) {
  const now = getCurrentTimestamp();
  for (const [key, value] of Object.entries(settingsMap)) {
    await execute(
      `INSERT INTO app_settings (key, value, updated_at) 
       VALUES (?, ?, ?) 
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, String(value), now]
    );
  }
  return await getAllSettings();
}
