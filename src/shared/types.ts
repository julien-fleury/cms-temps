export const CATEGORIES = [
  'Réunion', 'Modélisation existant', 'Modélisation ensemble',
  "Plans d'implantation", "Plans d'ensemble", 'Plans de détail',
  'Dossier fabrication', 'Mise à jour', 'Autre',
] as const;

export type Categorie = (typeof CATEGORIES)[number];

export interface Affaire {
  id: number;
  nom: string;
  client: string;
  montantVenduHt: number;
  tauxHoraireReference: number;
  dateCreation: string;
  dateCloture: string | null;
  dateEcheance: string | null;
  terminee: boolean;
  commentaire: string;
}

export type AffaireInput = Omit<Affaire, 'id'>;

export interface Pointage {
  id: number;
  affaireId: number;
  date: string;
  heures: number;
  categorie: Categorie;
  commentaire: string;
}

export type PointageInput = Omit<Pointage, 'id'>;

export interface StatistiquesAffaire {
  heuresConsommees: number;
  montantConsomme: number;
  creditRestantEuros: number;
  creditRestantHeures: number;
  tauxHoraireReel: number | null;
  ratioConsommation: number;
}

export interface PrevisionAffaire {
  budgetHeures: number;
  rythmeHebdomadaire: number;
  heuresProjetees: number | null;
  dateEpuisementBudget: string | null;
  depassementPrevu: boolean;
}

export interface AffaireAvecStats extends Affaire, StatistiquesAffaire {
  prevision: PrevisionAffaire;
}

export interface BudgetCategorie {
  categorie: Categorie;
  heuresPrevues: number;
  heuresConsommees: number;
  heuresRestantes: number;
}

export interface AlerteAffaire {
  affaireId: number;
  nom: string;
  niveau: 'attention' | 'depassement';
  message: string;
}

export interface DashboardData {
  affairesActives: number;
  affairesTerminees: number;
  heuresMois: number;
  heuresTotales: number;
  heuresRestantes: number;
  chiffreAffairesTotal: number;
  heuresParMois: Array<{ mois: string; heures: number }>;
  caProduitParMois: Array<{ mois: string; heures: number; ca: number; caParHeure: number }>;
  rentabiliteParAffaire: Array<{ nom: string; credit: number; consommation: number }>;
  alertes: AlerteAffaire[];
}

export interface ImportResult { affaires: number; pointages: number; }

export interface CmsApi {
  affaires: {
    list: () => Promise<AffaireAvecStats[]>;
    get: (id: number) => Promise<AffaireAvecStats | null>;
    create: (input: AffaireInput) => Promise<number>;
    update: (id: number, input: AffaireInput) => Promise<void>;
    remove: (id: number) => Promise<void>;
  };
  pointages: {
    list: (affaireId?: number) => Promise<Pointage[]>;
    create: (input: PointageInput) => Promise<number>;
    update: (id: number, input: PointageInput) => Promise<void>;
    remove: (id: number) => Promise<void>;
    createMany: (inputs: PointageInput[]) => Promise<number>;
  };
  budgets: {
    get: (affaireId: number) => Promise<BudgetCategorie[]>;
    save: (affaireId: number, budgets: Array<{ categorie: Categorie; heuresPrevues: number }>) => Promise<void>;
  };
  dashboard: () => Promise<DashboardData>;
  exportExcel: () => Promise<string | null>;
  importExcel: () => Promise<ImportResult | null>;
  reportPdf: (affaireId: number) => Promise<string | null>;
  backup: () => Promise<string | null>;
  restore: () => Promise<boolean>;
}
