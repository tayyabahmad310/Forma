/**
 * Local Backup and Restore Service
 * Fully offline, versioned JSON backup and atomic transactional restore.
 */

import { File, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDb } from '../database/connection';
import { getCurrentTimestamp, getTodayDateString } from '../utils/date';
import { checkDatabaseIntegrity } from '../database/queryUtils';

const BACKUP_VERSION = 1;

export const BACKUP_TABLES_ORDER = [
  'categories',
  'suppliers',
  'products',
  'product_variants',
  'customers',
  'purchases',
  'purchase_items',
  'sales',
  'sale_items',
  'payments',
  'expenses',
  'stock_movements',
  'sales_returns',
  'sales_return_items',
  'app_settings',
];

/**
 * Export complete local database to a user-shareable JSON file.
 * @returns {Promise<{ uri: string, filename: string, recordCounts: Object }>}
 */
export async function exportDatabaseBackup() {
  const db = getDb();
  const timestamp = getCurrentTimestamp();
  const dateTag = getTodayDateString().replace(/-/g, '');
  const timeTag = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
  const filename = `clothio_backup_${dateTag}_${timeTag}.json`;
  const fileUri = `${FileSystem.documentDirectory}${filename}`;

  const backupData = {};
  const recordCounts = {};

  // Fetch all tables
  for (const table of BACKUP_TABLES_ORDER) {
    try {
      const rows = await db.getAllAsync(`SELECT * FROM ${table}`);
      backupData[table] = rows;
      recordCounts[table] = rows.length;
    } catch (err) {
      console.warn(`Could not export table ${table}:`, err);
      backupData[table] = [];
      recordCounts[table] = 0;
    }
  }

  const exportPayload = {
    app: 'clothio',
    version: BACKUP_VERSION,
    exported_at: timestamp,
    table_order: BACKUP_TABLES_ORDER,
    record_counts: recordCounts,
    data: backupData,
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  await FileSystem.writeAsStringAsync(fileUri, jsonString, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Prompt user to save/share file to external storage / local files
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Export Clothio Backup',
      UTI: 'public.json',
    });
  }

  return { uri: fileUri, filename, recordCounts };
}

/**
 * Pick and validate an existing JSON backup file from device storage
 * @returns {Promise<Object>} The parsed and verified backup payload
 */
export async function pickBackupFile() {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/json', '*/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const fileUri = result.assets[0].uri;
  const content = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  let payload;
  try {
    payload = JSON.parse(content);
  } catch (err) {
    throw new Error('Invalid backup file: File is not valid JSON.');
  }

  if (payload.app !== 'clothio') {
    throw new Error('Invalid backup file: Not a Clothio backup archive.');
  }

  if (!payload.data || typeof payload.data !== 'object') {
    throw new Error('Invalid backup file: Missing dataset payload.');
  }

  return payload;
}

/**
 * Atomically restore local SQLite database from verified backup payload.
 * Executes all deletions and insertions inside a single transaction.
 * Automatically rolls back if anything fails.
 * @param {Object} payload
 */
export async function restoreDatabaseBackup(payload) {
  if (!payload || payload.app !== 'clothio' || !payload.data) {
    throw new Error('Invalid backup data structure.');
  }

  const db = getDb();
  const now = getCurrentTimestamp();

  await db.withTransactionAsync(async () => {
    // 1. Delete existing records in reverse dependency order
    const reverseOrder = [...BACKUP_TABLES_ORDER].reverse();
    for (const table of reverseOrder) {
      await db.runAsync(`DELETE FROM ${table}`);
    }

    // 2. Insert records in forward dependency order
    for (const table of BACKUP_TABLES_ORDER) {
      const rows = payload.data[table] || [];
      if (rows.length === 0) continue;

      // Extract columns from first item
      const columns = Object.keys(rows[0]);
      const placeholders = columns.map(() => '?').join(', ');
      const insertSql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

      for (const row of rows) {
        const values = columns.map((col) => row[col]);
        await db.runAsync(insertSql, values);
      }
    }
  });

  // Check integrity after restore
  const integrity = await checkDatabaseIntegrity();
  if (!integrity.ok) {
    throw new Error(`Integrity check failed after restore: ${integrity.message}`);
  }

  return true;
}
