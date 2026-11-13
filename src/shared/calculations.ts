import type { Affaire, AffaireAvecStats, PrevisionAffaire, StatistiquesAffaire } from './types.js';

const round = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculerStatistiques(
  affaire: Pick<Affaire, 'montantVenduHt' | 'tauxHoraireReference'>,
  heuresConsommees: number,
): StatistiquesAffaire {
  const heures = Math.max(0, heuresConsommees);
  const montantConsomme = heures * affaire.tauxHoraireReference;
  const creditEuros = affaire.montantVenduHt - montantConsomme;

  return {
    heuresConsommees: round(heures),
    montantConsomme: round(montantConsomme),
    creditRestantEuros: round(creditEuros),
    creditRestantHeures: affaire.tauxHoraireReference > 0 ? round(creditEuros / affaire.tauxHoraireReference) : 0,
    tauxHoraireReel: heures > 0 ? round(affaire.montantVenduHt / heures) : null,
    ratioConsommation: affaire.montantVenduHt > 0 ? round((montantConsomme / affaire.montantVenduHt) * 100) : 0,
  };
}

export function niveauRentabilite(ratio: number): 'rentable' | 'attention' | 'depassement' {
  if (ratio > 100) return 'depassement';
  if (ratio >= 80) return 'attention';
  return 'rentable';
}

export function calculerTauxHoraireProduction(
  affaire: Pick<Affaire, 'montantVenduHt' | 'tauxHoraireReference' | 'terminee'>,
  heuresConsommees: number,
): number {
  if (affaire.terminee && heuresConsommees > 0) return round(affaire.montantVenduHt / heuresConsommees);
  return affaire.tauxHoraireReference;
}

export function calculerHeuresRestantes(
  affaires: Array<Pick<AffaireAvecStats, 'terminee' | 'creditRestantHeures'>>,
): number {
  return round(affaires
    .filter((affaire) => !affaire.terminee)
    .reduce((total, affaire) => total + Math.max(0, affaire.creditRestantHeures), 0));
}

export function calculerPrevision(
  affaire: Pick<Affaire, 'montantVenduHt' | 'tauxHoraireReference' | 'dateEcheance' | 'terminee'>,
  heuresConsommees: number,
  heuresHuitSemaines: number,
  today = new Date(),
): PrevisionAffaire {
  const budgetHeures = affaire.tauxHoraireReference > 0 ? affaire.montantVenduHt / affaire.tauxHoraireReference : 0;
  const rythmeHebdomadaire = heuresHuitSemaines / 8;
  const restantes = budgetHeures - heuresConsommees;
  let dateEpuisementBudget: string | null = null;
  if (!affaire.terminee && rythmeHebdomadaire > 0 && restantes > 0) {
    const exhaustion = new Date(today);
    exhaustion.setDate(exhaustion.getDate() + Math.ceil((restantes / rythmeHebdomadaire) * 7));
    dateEpuisementBudget = exhaustion.toLocaleDateString('en-CA');
  }
  let heuresProjetees: number | null = null;
  if (!affaire.terminee && affaire.dateEcheance && rythmeHebdomadaire > 0) {
    const deadline = new Date(`${affaire.dateEcheance}T12:00:00`);
    const weeks = Math.max(0, (deadline.getTime() - today.getTime()) / 604_800_000);
    heuresProjetees = round(heuresConsommees + weeks * rythmeHebdomadaire);
  }
  return {
    budgetHeures: round(budgetHeures),
    rythmeHebdomadaire: round(rythmeHebdomadaire),
    heuresProjetees,
    dateEpuisementBudget,
    depassementPrevu: heuresProjetees !== null && heuresProjetees > budgetHeures,
  };
}
