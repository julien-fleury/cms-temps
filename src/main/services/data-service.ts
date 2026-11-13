import type { DatabaseSync } from 'node:sqlite';
import { calculerHeuresRestantes } from '../../shared/calculations.js';
import type { AffaireAvecStats, AffaireInput, DashboardData, Pointage, PointageInput } from '../../shared/types.js';

type AffaireRow = {
  id: number; nom: string; client: string; montantVenduHt: number; tauxHoraireReference: number;
  dateCreation: string; dateCloture: string | null; terminee: number; commentaire: string;
  heuresConsommees: number; montantConsomme: number; creditRestantEuros: number;
  creditRestantHeures: number; tauxHoraireReel: number | null; ratioConsommation: number;
};

const affaireSelect = `
  SELECT a.id, a.nom, a.client,
    a.montant_vendu_ht AS montantVenduHt,
    a.taux_horaire_reference AS tauxHoraireReference,
    a.date_creation AS dateCreation, a.date_cloture AS dateCloture,
    a.terminee, a.commentaire,
    ROUND(COALESCE(SUM(p.heures), 0), 2) AS heuresConsommees,
    ROUND(COALESCE(SUM(p.heures), 0) * a.taux_horaire_reference, 2) AS montantConsomme,
    ROUND(a.montant_vendu_ht - COALESCE(SUM(p.heures), 0) * a.taux_horaire_reference, 2) AS creditRestantEuros,
    ROUND((a.montant_vendu_ht - COALESCE(SUM(p.heures), 0) * a.taux_horaire_reference) / a.taux_horaire_reference, 2) AS creditRestantHeures,
    CASE WHEN COALESCE(SUM(p.heures), 0) > 0 THEN ROUND(a.montant_vendu_ht / SUM(p.heures), 2) ELSE NULL END AS tauxHoraireReel,
    CASE WHEN a.montant_vendu_ht > 0 THEN ROUND(COALESCE(SUM(p.heures), 0) * a.taux_horaire_reference / a.montant_vendu_ht * 100, 2) ELSE 0 END AS ratioConsommation
  FROM affaires a LEFT JOIN pointages p ON p.affaire_id = a.id
`;

const mapAffaire = (row: AffaireRow): AffaireAvecStats => ({ ...row, terminee: Boolean(row.terminee) });

export class DataService {
  constructor(private readonly getDb: () => DatabaseSync) {}

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
      (nom, client, montant_vendu_ht, taux_horaire_reference, date_creation, date_cloture, terminee, commentaire)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(input.nom.trim(), input.client.trim(), input.montantVenduHt, input.tauxHoraireReference,
        input.dateCreation, input.dateCloture || null, Number(input.terminee), input.commentaire.trim());
    return Number(result.lastInsertRowid);
  }

  updateAffaire(id: number, input: AffaireInput): void {
    this.getDb().prepare(`UPDATE affaires SET nom=?, client=?, montant_vendu_ht=?, taux_horaire_reference=?,
      date_creation=?, date_cloture=?, terminee=?, commentaire=? WHERE id=?`)
      .run(input.nom.trim(), input.client.trim(), input.montantVenduHt, input.tauxHoraireReference,
        input.dateCreation, input.dateCloture || null, Number(input.terminee), input.commentaire.trim(), id);
  }

  removeAffaire(id: number): void { this.getDb().prepare('DELETE FROM affaires WHERE id = ?').run(id); }

  listPointages(affaireId?: number): Pointage[] {
    const sql = `SELECT id, affaire_id AS affaireId, date, heures, categorie, commentaire FROM pointages
      ${affaireId === undefined ? '' : 'WHERE affaire_id = ?'} ORDER BY date DESC, id DESC`;
    return this.getDb().prepare(sql).all(...(affaireId === undefined ? [] : [affaireId])) as unknown as Pointage[];
  }

  createPointage(input: PointageInput): number {
    const result = this.getDb().prepare(`INSERT INTO pointages (affaire_id, date, heures, categorie, commentaire)
      VALUES (?, ?, ?, ?, ?)`)
      .run(input.affaireId, input.date, input.heures, input.categorie, input.commentaire.trim());
    return Number(result.lastInsertRowid);
  }

  updatePointage(id: number, input: PointageInput): void {
    this.getDb().prepare('UPDATE pointages SET affaire_id=?, date=?, heures=?, categorie=?, commentaire=? WHERE id=?')
      .run(input.affaireId, input.date, input.heures, input.categorie, input.commentaire.trim(), id);
  }

  removePointage(id: number): void { this.getDb().prepare('DELETE FROM pointages WHERE id = ?').run(id); }

  dashboard(): DashboardData {
    const db = this.getDb();
    const summary = db.prepare(`SELECT
      SUM(CASE WHEN terminee = 0 THEN 1 ELSE 0 END) AS affairesActives,
      SUM(CASE WHEN terminee = 1 THEN 1 ELSE 0 END) AS affairesTerminees,
      COALESCE(SUM(montant_vendu_ht), 0) AS chiffreAffairesTotal FROM affaires`).get() as Omit<DashboardData, 'heuresMois' | 'heuresTotales' | 'heuresRestantes' | 'heuresParMois' | 'caProduitParMois' | 'rentabiliteParAffaire'>;
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
    return { ...summary, ...hours, heuresRestantes, heuresParMois, caProduitParMois, rentabiliteParAffaire };
  }
}
