import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseManager } from '../src/main/database/index';
import { DataService } from '../src/main/services/data-service';

const files: string[] = [];
afterEach(() => { for (const file of files.splice(0)) { for (const suffix of ['', '-wal', '-shm']) fs.rmSync(`${file}${suffix}`, { force: true }); } });

describe('catégories de pointage', () => {
  it('renomme une catégorie sans perdre ses pointages et budgets', () => {
    const file = path.join(os.tmpdir(), `cms-temps-categories-${Date.now()}.sqlite`); files.push(file);
    const manager = new DatabaseManager(file);
    const service = new DataService(() => manager.db);
    const affaireId = service.createAffaire({ nom: 'Test', client: 'Client', montantVenduHt: 1000, tauxHoraireReference: 100, dateCreation: '2026-01-01', dateCloture: null, dateEcheance: null, terminee: false, commentaire: '' });
    const categorieId = service.createCategorie('Relevé sur site');
    service.createPointage({ affaireId, date: '2026-01-02', heures: 2, categorie: 'Relevé sur site', commentaire: '' });
    service.saveBudgets(affaireId, [{ categorie: 'Relevé sur site', heuresPrevues: 4 }]);

    service.renameCategorie(categorieId, 'Relevé terrain');

    expect(service.listPointages(affaireId)[0].categorie).toBe('Relevé terrain');
    expect(service.getBudgets(affaireId).find((item) => item.categorie === 'Relevé terrain')?.heuresPrevues).toBe(4);
    manager.close();
  });

  it('exige un remplacement et transfère les données avant suppression', () => {
    const file = path.join(os.tmpdir(), `cms-temps-categories-delete-${Date.now()}.sqlite`); files.push(file);
    const manager = new DatabaseManager(file);
    const service = new DataService(() => manager.db);
    const affaireId = service.createAffaire({ nom: 'Test', client: 'Client', montantVenduHt: 1000, tauxHoraireReference: 100, dateCreation: '2026-01-01', dateCloture: null, dateEcheance: null, terminee: false, commentaire: '' });
    const sourceId = service.createCategorie('Ancienne tâche');
    const replacementId = service.createCategorie('Nouvelle tâche');
    service.createPointage({ affaireId, date: '2026-01-02', heures: 2, categorie: 'Ancienne tâche', commentaire: '' });
    service.saveBudgets(affaireId, [{ categorie: 'Ancienne tâche', heuresPrevues: 4 }, { categorie: 'Nouvelle tâche', heuresPrevues: 3 }]);

    expect(() => service.removeCategorie(sourceId)).toThrow(/utilisée/);
    service.removeCategorie(sourceId, replacementId);

    expect(service.listPointages(affaireId)[0].categorie).toBe('Nouvelle tâche');
    expect(service.getBudgets(affaireId).find((item) => item.categorie === 'Nouvelle tâche')?.heuresPrevues).toBe(7);
    expect(service.listCategories().some((item) => item.id === sourceId)).toBe(false);
    manager.close();
  });
});
