import type { DatabaseSync } from 'node:sqlite';
import { calculerHeuresRestantes, calculerPrevision } from '../../shared/calculations.js';
import type { AffaireAvecStats, AffaireInput, AlerteAffaire, BudgetCategorie, Categorie, CategorieTravail, DashboardData, Pointage, PointageInput } from '../../shared/types.js';

type AffaireRow = {
  id: number; nom: string; client: string; montantVenduHt: number; tauxHoraireReference: number;
  dateCreation: string; dateCloture: string | null; dateEcheance: string | null; terminee: number; commentaire: string;
  heuresConsommees: number; montantConsomme: number; creditRestantEuros: number;
  creditRestantHeures: number; tauxHoraireReel: number | null; ratioConsommation: number;
  heuresHuitSemaines: number;
};

const affaireSelect = `
  SELECT a.id, a.nom, a.client,
    a.montant_vendu_ht AS montantVenduHt,
    a.taux_horaire_reference AS tauxHoraireReference,
    a.date_creation AS dateCreation, a.date_cloture AS dateCloture, a.date_echeance AS dateEcheance,
    a.terminee, a.commentaire,
    ROUND(COALESCE(SUM(p.heures), 0), 2) AS heuresConsommees,
    ROUND(COALESCE(SUM(p.heures), 0) * a.taux_horaire_reference, 2) AS montantConsomme,
    ROUND(a.montant_vendu_ht - COALESCE(SUM(p.heures), 0) * a.taux_horaire_reference, 2) AS creditRestantEuros,
    ROUND((a.montant_vendu_ht - COALESCE(SUM(p.heures), 0) * a.taux_horaire_reference) / a.taux_horaire_reference, 2) AS creditRestantHeures,
    CASE WHEN COALESCE(SUM(p.heures), 0) > 0 THEN ROUND(a.montant_vendu_ht / SUM(p.heures), 2) ELSE NULL END AS tauxHoraireReel,
    CASE WHEN a.montant_vendu_ht > 0 THEN ROUND(COALESCE(SUM(p.heures), 0) * a.taux_horaire_reference / a.montant_vendu_ht * 100, 2) ELSE 0 END AS ratioConsommation
    ,ROUND(COALESCE(SUM(CASE WHEN p.date >= date('now', '-56 days') THEN p.heures ELSE 0 END), 0), 2) AS heuresHuitSemaines
  FROM affaires a LEFT JOIN pointages p ON p.affaire_id = a.id
`;

const mapAffaire = (row: AffaireRow): AffaireAvecStats => {
  const { heuresHuitSemaines, ...affaire } = row;
  const mapped = { ...affaire, terminee: Boolean(row.terminee) };
  return { ...mapped, prevision: calculerPrevision(mapped, row.heuresConsommees, heuresHuitSemaines) };
};

export class DataService {
  constructor(private readonly getDb: () => DatabaseSync) {}

  private categorieName(id: number): string | null {
    const row = this.getDb().prepare('SELECT nom FROM categories WHERE id = ?').get(id) as { nom: string } | undefined;
    return row?.nom ?? null;
  }

  private requireCategorie(nom: string): string {
    const value = nom.trim();
    const row = this.getDb().prepare('SELECT nom FROM categories WHERE nom = ? COLLATE NOCASE').get(value) as { nom: string } | undefined;
    if (!row) throw new Error(`Catégorie inconnue : ${value}`);
    return row.nom;
  }

  listCategories(): CategorieTravail[] {
    return this.getDb().prepare(`SELECT c.id, c.nom, c.ordre,
      (SELECT COUNT(*) FROM pointages p WHERE p.categorie = c.nom COLLATE NOCASE) AS usagePointages,
      (SELECT COUNT(*) FROM budgets_categories b WHERE b.categorie = c.nom COLLATE NOCASE AND b.heures_prevues > 0) AS usageBudgets
      FROM categories c ORDER BY c.ordre, c.nom COLLATE NOCASE`).all() as unknown as CategorieTravail[];
  }

  createCategorie(nom: string): number {
    const value = nom.trim();
    if (!value || value.length > 80) throw new Error('Le nom doit contenir entre 1 et 80 caractères.');
    const duplicate = this.getDb().prepare('SELECT id FROM categories WHERE nom = ? COLLATE NOCASE').get(value);
    if (duplicate) throw new Error('Cette catégorie existe déjà.');
    const ordre = (this.getDb().prepare('SELECT COALESCE(MAX(ordre), -1) + 1 AS ordre FROM categories').get() as { ordre: number }).ordre;
    return Number(this.getDb().prepare('INSERT INTO categories (nom, ordre) VALUES (?, ?)').run(value, ordre).lastInsertRowid);
  }

  ensureCategorie(nom: string): string {
    const value = nom.trim() || 'Autre';
    const existing = this.getDb().prepare('SELECT nom FROM categories WHERE nom = ? COLLATE NOCASE').get(value) as { nom: string } | undefined;
    if (existing) return existing.nom;
    this.createCategorie(value);
    return value;
  }

  renameCategorie(id: number, nom: string): void {
    const current = this.categorieName(id);
    if (!current) throw new Error('Catégorie introuvable.');
    const value = nom.trim();
    if (!value || value.length > 80) throw new Error('Le nom doit contenir entre 1 et 80 caractères.');
    const duplicate = this.getDb().prepare('SELECT id FROM categories WHERE nom = ? COLLATE NOCASE AND id <> ?').get(value, id);
    if (duplicate) throw new Error('Cette catégorie existe déjà.');
    const db = this.getDb();
    db.exec('BEGIN');
    try {
      db.prepare('UPDATE categories SET nom = ? WHERE id = ?').run(value, id);
      db.prepare('UPDATE pointages SET categorie = ? WHERE categorie = ? COLLATE NOCASE').run(value, current);
      db.prepare('UPDATE budgets_categories SET categorie = ? WHERE categorie = ? COLLATE NOCASE').run(value, current);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  removeCategorie(id: number, remplacementId?: number): void {
    const db = this.getDb();
    const current = this.categorieName(id);
    if (!current) throw new Error('Catégorie introuvable.');
    const total = (db.prepare('SELECT COUNT(*) AS count FROM categories').get() as { count: number }).count;
    if (total <= 1) throw new Error('Au moins une catégorie doit être conservée.');
    const replacement = remplacementId === undefined ? null : this.categorieName(remplacementId);
    if (remplacementId !== undefined && (!replacement || remplacementId === id)) throw new Error('Catégorie de remplacement invalide.');
    const usagePointages = (db.prepare('SELECT COUNT(*) AS count FROM pointages WHERE categorie = ? COLLATE NOCASE').get(current) as { count: number }).count;
    const usageBudgets = (db.prepare('SELECT COUNT(*) AS count FROM budgets_categories WHERE categorie = ? COLLATE NOCASE AND heures_prevues > 0').get(current) as { count: number }).count;
    if ((usagePointages > 0 || usageBudgets > 0) && !replacement) throw new Error('Cette catégorie est utilisée. Choisissez une catégorie de remplacement.');

    db.exec('BEGIN');
    try {
      if (replacement) {
        db.prepare('UPDATE pointages SET categorie = ? WHERE categorie = ? COLLATE NOCASE').run(replacement, current);
        const budgets = db.prepare('SELECT affaire_id AS affaireId, heures_prevues AS heuresPrevues FROM budgets_categories WHERE categorie = ? COLLATE NOCASE AND heures_prevues > 0')
          .all(current) as unknown as Array<{ affaireId: number; heuresPrevues: number }>;
        const merge = db.prepare(`INSERT INTO budgets_categories (affaire_id, categorie, heures_prevues) VALUES (?, ?, ?)
          ON CONFLICT(affaire_id, categorie) DO UPDATE SET heures_prevues = heures_prevues + excluded.heures_prevues`);
        for (const budget of budgets) merge.run(budget.affaireId, replacement, budget.heuresPrevues);
      }
      db.prepare('DELETE FROM budgets_categories WHERE categorie = ? COLLATE NOCASE').run(current);
      db.prepare('DELETE FROM categories WHERE id = ?').run(id);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  listAffaires(): AffaireAvecStats[] {
    const rows = this.getDb().prepare(`${affaireSelect} GROUP BY a.id ORDER BY a.terminee, a.date_creation DESC`).all() as AffaireRow[];
    return rows.map(mapAffaire);
  }

  getAffaire(id: number): AffaireAvecStats | null {
    const row = this.getDb().prepare(`${affaireSelect} WHERE a.id = ? GROUP BY a.id`).get(id) as AffaireRow | undefined;
    return row ? mapAffaire(row) : null;
  }

  createAffaire(input: AffaireInput): number {
    const result = this.getDb().prepare(`INSERT INTO affaires
      (nom, client, montant_vendu_ht, taux_horaire_reference, date_creation, date_cloture, date_echeance, terminee, commentaire)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(input.nom.trim(), input.client.trim(), input.montantVenduHt, input.tauxHoraireReference,
        input.dateCreation, input.dateCloture || null, input.dateEcheance || null, Number(input.terminee), input.commentaire.trim());
    return Number(result.lastInsertRowid);
  }

  updateAffaire(id: number, input: AffaireInput): void {
    this.getDb().prepare(`UPDATE affaires SET nom=?, client=?, montant_vendu_ht=?, taux_horaire_reference=?,
      date_creation=?, date_cloture=?, date_echeance=?, terminee=?, commentaire=? WHERE id=?`)
      .run(input.nom.trim(), input.client.trim(), input.montantVenduHt, input.tauxHoraireReference,
        input.dateCreation, input.dateCloture || null, input.dateEcheance || null, Number(input.terminee), input.commentaire.trim(), id);
  }

  removeAffaire(id: number): void { this.getDb().prepare('DELETE FROM affaires WHERE id = ?').run(id); }

  listPointages(affaireId?: number): Pointage[] {
    const sql = `SELECT id, affaire_id AS affaireId, date, heures, categorie, commentaire FROM pointages
      ${affaireId === undefined ? '' : 'WHERE affaire_id = ?'} ORDER BY date DESC, id DESC`;
    return this.getDb().prepare(sql).all(...(affaireId === undefined ? [] : [affaireId])) as unknown as Pointage[];
  }

  createPointage(input: PointageInput): number {
    const categorie = this.requireCategorie(input.categorie);
    const result = this.getDb().prepare(`INSERT INTO pointages (affaire_id, date, heures, categorie, commentaire)
      VALUES (?, ?, ?, ?, ?)`)
      .run(input.affaireId, input.date, input.heures, categorie, input.commentaire.trim());
    return Number(result.lastInsertRowid);
  }

  updatePointage(id: number, input: PointageInput): void {
    const categorie = this.requireCategorie(input.categorie);
    this.getDb().prepare('UPDATE pointages SET affaire_id=?, date=?, heures=?, categorie=?, commentaire=? WHERE id=?')
      .run(input.affaireId, input.date, input.heures, categorie, input.commentaire.trim(), id);
  }

  removePointage(id: number): void { this.getDb().prepare('DELETE FROM pointages WHERE id = ?').run(id); }

  createPointages(inputs: PointageInput[]): number {
    const db = this.getDb();
    const categories = new Map(this.listCategories().map((item) => [item.nom.toLocaleLowerCase('fr'), item.nom]));
    const statement = db.prepare(`INSERT INTO pointages (affaire_id, date, heures, categorie, commentaire)
      VALUES (?, ?, ?, ?, ?)`);
    db.exec('BEGIN');
    try {
      for (const input of inputs) {
        const categorie = categories.get(input.categorie.trim().toLocaleLowerCase('fr'));
        if (!categorie) throw new Error(`Catégorie inconnue : ${input.categorie}`);
        statement.run(input.affaireId, input.date, input.heures, categorie, input.commentaire.trim());
      }
      db.exec('COMMIT');
      return inputs.length;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  getBudgets(affaireId: number): BudgetCategorie[] {
    const rows = this.getDb().prepare(`SELECT b.categorie, b.heures_prevues AS heuresPrevues,
      COALESCE(SUM(p.heures), 0) AS heuresConsommees
      FROM budgets_categories b LEFT JOIN pointages p ON p.affaire_id = b.affaire_id AND p.categorie = b.categorie
      WHERE b.affaire_id = ? GROUP BY b.categorie, b.heures_prevues`).all(affaireId) as unknown as Array<{ categorie: Categorie; heuresPrevues: number; heuresConsommees: number }>;
    const byCategory = new Map(rows.map((row) => [row.categorie, row]));
    const consumed = this.getDb().prepare(`SELECT categorie, SUM(heures) AS heuresConsommees FROM pointages
      WHERE affaire_id = ? GROUP BY categorie`).all(affaireId) as unknown as Array<{ categorie: Categorie; heuresConsommees: number }>;
    const consumedMap = new Map(consumed.map((row) => [row.categorie, row.heuresConsommees]));
    const categories = this.getDb().prepare('SELECT nom FROM categories ORDER BY ordre, nom COLLATE NOCASE').all() as unknown as Array<{ nom: string }>;
    return categories.map(({ nom: categorie }) => {
      const heuresPrevues = byCategory.get(categorie)?.heuresPrevues ?? 0;
      const heuresConsommees = consumedMap.get(categorie) ?? 0;
      return { categorie, heuresPrevues, heuresConsommees, heuresRestantes: Math.round((heuresPrevues - heuresConsommees) * 100) / 100 };
    });
  }

  saveBudgets(affaireId: number, budgets: Array<{ categorie: Categorie; heuresPrevues: number }>): void {
    const db = this.getDb();
    const statement = db.prepare(`INSERT INTO budgets_categories (affaire_id, categorie, heures_prevues)
      VALUES (?, ?, ?) ON CONFLICT(affaire_id, categorie) DO UPDATE SET heures_prevues=excluded.heures_prevues`);
    db.exec('BEGIN');
    try {
      for (const budget of budgets) statement.run(affaireId, this.requireCategorie(budget.categorie), Math.max(0, budget.heuresPrevues));
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  dashboard(): DashboardData {
    const db = this.getDb();
    const summary = db.prepare(`SELECT
      SUM(CASE WHEN terminee = 0 THEN 1 ELSE 0 END) AS affairesActives,
      SUM(CASE WHEN terminee = 1 THEN 1 ELSE 0 END) AS affairesTerminees,
      COALESCE(SUM(montant_vendu_ht), 0) AS chiffreAffairesTotal FROM affaires`).get() as Omit<DashboardData, 'heuresMois' | 'heuresTotales' | 'heuresRestantes' | 'heuresParMois' | 'caProduitParMois' | 'rentabiliteParAffaire' | 'alertes'>;
    const hours = db.prepare(`SELECT COALESCE(SUM(heures), 0) AS heuresTotales,
      COALESCE(SUM(CASE WHEN strftime('%Y-%m', date) = strftime('%Y-%m', 'now', 'localtime') THEN heures ELSE 0 END), 0) AS heuresMois
      FROM pointages`).get() as Pick<DashboardData, 'heuresMois' | 'heuresTotales'>;
    const heuresParMois = db.prepare(`SELECT substr(date, 1, 7) AS mois, ROUND(SUM(heures), 2) AS heures
      FROM pointages GROUP BY substr(date, 1, 7) ORDER BY mois`).all() as DashboardData['heuresParMois'];
    const caProduitParMois = db.prepare(`WITH heures_affaire AS (
      SELECT affaire_id, SUM(heures) AS total_heures FROM pointages GROUP BY affaire_id
    ) SELECT substr(p.date, 1, 7) AS mois,
      ROUND(SUM(p.heures), 2) AS heures,
      ROUND(SUM(p.heures * CASE
        WHEN a.terminee = 1 AND ha.total_heures > 0 THEN a.montant_vendu_ht / ha.total_heures
        ELSE a.taux_horaire_reference END), 2) AS ca,
      ROUND(SUM(p.heures * CASE
        WHEN a.terminee = 1 AND ha.total_heures > 0 THEN a.montant_vendu_ht / ha.total_heures
        ELSE a.taux_horaire_reference END) / SUM(p.heures), 2) AS caParHeure
      FROM pointages p INNER JOIN affaires a ON a.id = p.affaire_id
      INNER JOIN heures_affaire ha ON ha.affaire_id = a.id
      GROUP BY substr(p.date, 1, 7) ORDER BY mois`).all() as DashboardData['caProduitParMois'];
    const affaires = this.listAffaires();
    const heuresRestantes = calculerHeuresRestantes(affaires);
    const rentabiliteParAffaire = affaires.map((a) => ({ nom: a.nom, credit: a.creditRestantEuros, consommation: a.ratioConsommation }));
    const alertes = affaires.filter((affaire) => !affaire.terminee).reduce<AlerteAffaire[]>((items, affaire) => {
      if (affaire.ratioConsommation > 100) items.push({ affaireId: affaire.id, nom: affaire.nom, niveau: 'depassement', message: `Budget dépassé de ${Math.abs(affaire.creditRestantHeures).toFixed(1)} h` });
      else if (affaire.prevision.depassementPrevu) items.push({ affaireId: affaire.id, nom: affaire.nom, niveau: 'attention', message: `Dépassement prévu : ${affaire.prevision.heuresProjetees?.toFixed(1)} h projetées` });
      else if (affaire.ratioConsommation >= 80) items.push({ affaireId: affaire.id, nom: affaire.nom, niveau: 'attention', message: `${affaire.ratioConsommation.toFixed(0)} % du budget consommé` });
      return items;
    }, []);
    return { ...summary, ...hours, heuresRestantes, heuresParMois, caProduitParMois, rentabiliteParAffaire, alertes };
  }
}
