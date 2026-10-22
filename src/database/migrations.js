/**
 * Database Migrations System
 * Tracks schema version in schema_migrations table and executes updates sequentially.
 */

import { SCHEMA_VERSION, INITIAL_TABLES_SQL, HIGH_PERFORMANCE_INDEXES_SQL } from './schema';
import { DEFAULT_SETTINGS, DEFAULT_CATEGORIES } from '../constants/config';
import { getCurrentTimestamp } from '../utils/date';

/**
 * Execute pending migrations on the database
 * @param {import('expo-sqlite').SQLiteDatabase} db
 */
export async function runMigrations(db) {
  // Ensure schema_migrations table exists
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  // Check current schema version
  const currentVersionRow = await db.getFirstAsync(
    'SELECT MAX(version) as version FROM schema_migrations'
  );
  const currentVersion = currentVersionRow?.version || 0;

  if (currentVersion < 1) {
    // Migration 1: Initial schema, indexes, and baseline settings
    await db.withTransactionAsync(async () => {
      // 1. Create tables
      await db.execAsync(INITIAL_TABLES_SQL);

      // 2. Create performance indexes
      await db.execAsync(HIGH_PERFORMANCE_INDEXES_SQL);

      // 3. Seed default application settings
      const now = getCurrentTimestamp();
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        await db.runAsync(
          'INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)',
          [key, value, now]
        );
      }

      // 4. Seed default clothing categories
      for (const catName of DEFAULT_CATEGORIES) {
        await db.runAsync(
          'INSERT OR IGNORE INTO categories (name, created_at) VALUES (?, ?)',
          [catName, now]
        );
      }

      // 5. Record migration 1
      await db.runAsync(
        'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
        [1, now]
      );
    });
  }

  // Future migrations (e.g. if (currentVersion < 2) { ... }) can be added here
}
