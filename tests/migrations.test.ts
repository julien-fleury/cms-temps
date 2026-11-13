import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DatabaseManager } from '../src/main/database/index';

const files: string[] = [];
afterEach(() => { for (const file of files.splice(0)) { for (const suffix of ['', '-wal', '-shm']) fs.rmSync(`${file}${suffix}`, { force: true }); } });

describe('migrations SQLite', () => {
  it('met à niveau une base 1.0 sans supprimer ses données', () => {
    const file = path.join(os.tmpdir(), `cms-temps-migration-${Date.now()}.sqlite`); files.push(file);
    const legacy = new DatabaseSync(file);
    legacy.exec(`CREATE TABLE affaires (id INTEGER PRIMARY KEY, nom TEXT, client TEXT, montant_vendu_ht REAL, taux_horaire_reference REAL, date_creation TEXT, date_cloture TEXT, terminee INTEGER, commentaire TEXT);
      CREATE TABLE pointages (id INTEGER PRIMARY KEY, affaire_id INTEGER, date TEXT, heures REAL, categorie TEXT, commentaire TEXT);
      INSERT INTO affaires VALUES (1, 'Test migration', 'Client', 1000, 100, '2026-01-01', NULL, 0, 'Conservé');
      INSERT INTO pointages VALUES (1, 1, '2026-01-02', 2, 'Catégorie historique', 'Conservé');`);
    legacy.close();

    const manager = new DatabaseManager(file);
    const affaire = manager.db.prepare('SELECT nom, date_echeance FROM affaires WHERE id=1').get() as { nom: string; date_echeance: null };
    const version = manager.db.prepare('PRAGMA user_version').get() as { user_version: number };
    const budgets = manager.db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE name='budgets_categories'").get() as { count: number };
    expect(affaire.nom).toBe('Test migration');
    expect(affaire.date_echeance).toBeNull();
    expect(version.user_version).toBe(3);
    expect(budgets.count).toBe(1);
    const categories = manager.db.prepare('SELECT COUNT(*) AS count FROM categories').get() as { count: number };
    expect(categories.count).toBe(10);
    const historical = manager.db.prepare("SELECT COUNT(*) AS count FROM categories WHERE nom='Catégorie historique'").get() as { count: number };
    expect(historical.count).toBe(1);
    manager.close();
  });
});
