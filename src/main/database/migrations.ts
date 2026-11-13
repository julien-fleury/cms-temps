import type { DatabaseSync } from 'node:sqlite';
import { DEFAULT_CATEGORIES } from '../../shared/types.js';

export const DATABASE_VERSION = 3;

function hasColumn(db: DatabaseSync, table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as unknown as Array<{ name: string }>;
  return rows.some((row) => row.name === column);
}

export function runMigrations(db: DatabaseSync): void {
  const current = (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
  if (current >= DATABASE_VERSION) return;

  db.exec('BEGIN');
  try {
    if (!hasColumn(db, 'affaires', 'date_echeance')) {
      db.exec('ALTER TABLE affaires ADD COLUMN date_echeance TEXT');
    }
    db.exec(`CREATE TABLE IF NOT EXISTS budgets_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      affaire_id INTEGER NOT NULL,
      categorie TEXT NOT NULL,
      heures_prevues REAL NOT NULL DEFAULT 0 CHECK (heures_prevues >= 0),
      UNIQUE (affaire_id, categorie),
      FOREIGN KEY (affaire_id) REFERENCES affaires(id) ON DELETE CASCADE
    )`);
    db.exec(`CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL COLLATE NOCASE UNIQUE,
      ordre INTEGER NOT NULL DEFAULT 0
    )`);
    const insertCategorie = db.prepare('INSERT OR IGNORE INTO categories (nom, ordre) VALUES (?, ?)');
    DEFAULT_CATEGORIES.forEach((nom, index) => insertCategorie.run(nom, index));
    const existingNames = db.prepare(`SELECT categorie AS nom FROM pointages
      UNION SELECT categorie AS nom FROM budgets_categories`).all() as unknown as Array<{ nom: string }>;
    existingNames.forEach((row, index) => insertCategorie.run(row.nom, DEFAULT_CATEGORIES.length + index));
    db.exec(`PRAGMA user_version = ${DATABASE_VERSION}`);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
