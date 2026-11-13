import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { schema, seed } from './schema.js';
import { DATABASE_VERSION, runMigrations } from './migrations.js';

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
    runMigrations(db);
    const count = (db.prepare('SELECT COUNT(*) AS count FROM affaires').get() as { count: number }).count;
    if (addExamples && count === 0) db.exec(seed);
    db.exec(`PRAGMA user_version = ${DATABASE_VERSION}`);
    return db;
  }

  get db(): DatabaseSync { return this.database; }

  async backup(destination: string): Promise<void> {
    this.database.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    fs.copyFileSync(this.path, destination);
  }

  async automaticBackup(directory: string, keep = 10): Promise<string> {
    fs.mkdirSync(directory, { recursive: true });
    const date = new Date().toLocaleDateString('en-CA');
    const destination = `${directory}/cms-temps-auto-${date}.sqlite`;
    if (!fs.existsSync(destination)) await this.backup(destination);
    const files = fs.readdirSync(directory)
      .filter((name) => /^cms-temps-auto-\d{4}-\d{2}-\d{2}\.sqlite$/.test(name))
      .sort()
      .reverse();
    for (const obsolete of files.slice(keep)) fs.unlinkSync(`${directory}/${obsolete}`);
    return destination;
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
