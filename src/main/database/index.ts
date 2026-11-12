import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { schema, seed } from './schema.js';

export class DatabaseManager {
  private database: DatabaseSync;

  constructor(public readonly path: string) {
    const isNew = !fs.existsSync(path);
    this.database = this.open(isNew);
  }

  private open(addExamples = false): DatabaseSync {
    const db = new DatabaseSync(this.path);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    db.exec(schema);
    const count = (db.prepare('SELECT COUNT(*) AS count FROM affaires').get() as { count: number }).count;
    if (addExamples && count === 0) db.exec(seed);
    return db;
  }

  get db(): DatabaseSync { return this.database; }

  async backup(destination: string): Promise<void> {
    this.database.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    fs.copyFileSync(this.path, destination);
  }

  restore(source: string): void {
    const candidate = new DatabaseSync(source, { readOnly: true });
    try {
      const required = candidate.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name IN ('affaires', 'pointages')").get() as { count: number };
      if (required.count !== 2) throw new Error('La sauvegarde ne contient pas le schéma CMS Temps.');
    } finally {
      candidate.close();
    }
    this.database.close();
    try {
      fs.copyFileSync(source, this.path);
      this.database = this.open(false);
    } catch (error) {
      this.database = this.open(false);
      throw error;
    }
  }

  close(): void { this.database.close(); }
}
