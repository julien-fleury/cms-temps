export const schema = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS affaires (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    client TEXT NOT NULL,
    montant_vendu_ht REAL NOT NULL CHECK (montant_vendu_ht >= 0),
    taux_horaire_reference REAL NOT NULL CHECK (taux_horaire_reference > 0),
    date_creation TEXT NOT NULL,
    date_cloture TEXT,
    terminee INTEGER NOT NULL DEFAULT 0 CHECK (terminee IN (0, 1)),
    commentaire TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS pointages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    affaire_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    heures REAL NOT NULL CHECK (heures > 0),
    categorie TEXT NOT NULL,
    commentaire TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (affaire_id) REFERENCES affaires(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_pointages_affaire ON pointages(affaire_id);
  CREATE INDEX IF NOT EXISTS idx_pointages_date ON pointages(date);
`;

export const seed = `
  INSERT INTO affaires (nom, client, montant_vendu_ht, taux_horaire_reference, date_creation, terminee, commentaire)
  VALUES
    ('Extension atelier', 'Ateliers Martin', 8500, 75, '2026-09-08', 0, 'Études et plans de fabrication'),
    ('Réaménagement bureaux', 'Novalys', 4200, 70, '2026-08-14', 0, 'Phase APD'),
    ('Passerelle technique', 'Métal Concept', 6800, 80, '2026-04-02', 1, 'Affaire livrée');

  INSERT INTO pointages (affaire_id, date, heures, categorie, commentaire)
  VALUES
    (1, '2026-09-10', 4.5, 'Réunion', 'Réunion de lancement'),
    (1, '2026-10-03', 18, 'Modélisation ensemble', 'Modèle principal'),
    (1, '2026-11-05', 12.5, 'Plans de détail', 'Détails assemblages'),
    (2, '2026-10-12', 8, 'Modélisation existant', 'Relevé et modèle'),
    (2, '2026-11-07', 16, 'Plans d''implantation', 'Implantation niveau 1'),
    (3, '2026-04-08', 22, 'Modélisation ensemble', 'Structure'),
    (3, '2026-05-16', 31, 'Dossier fabrication', 'Plans atelier');
`;
