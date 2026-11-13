import type { Affaire, AffaireAvecStats, StatistiquesAffaire } from './types.js';

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
