import type { Affaire, StatistiquesAffaire } from './types.js';

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
