/**
 * SQLite Connection Manager
 * Configures WAL mode, synchronous=NORMAL, foreign keys, and busy timeout.
 */

import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

const DB_NAME = 'clothio.db';
let dbInstance = null;
let initPromise = null;

/**
 * Initialize and open SQLite database connection with performance PRAGMAs.
 * @returns {Promise<SQLite.SQLiteDatabase>}
 */
export async function initDatabase() {
  if (dbInstance) {
    return dbInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);

      // Execute essential performance & reliability PRAGMAs
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA foreign_keys = ON;
        PRAGMA busy_timeout = 5000;
      `);

      // Run versioned migrations
      await runMigrations(db);

      dbInstance = db;
      return db;
    } catch (error) {
      console.error('Failed to initialize SQLite database:', error);
      throw error;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * Get active database instance or throw if not initialized.
 * @returns {SQLite.SQLiteDatabase}
 */
export function getDb() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
}

/**
 * Close database connection (used during restore or reset).
 */
export async function closeDatabase() {
  if (dbInstance) {
    try {
      await dbInstance.closeAsync();
    } catch (e) {
      console.warn('Error closing database:', e);
    }
    dbInstance = null;
  }
}
