import { describe, expect, it } from 'vitest';
import { calculerStatistiques, niveauRentabilite } from '../src/shared/calculations';

describe('calculerStatistiques', () => {
  it('calcule les crédits et le taux réel', () => {
    expect(calculerStatistiques({ montantVenduHt: 5000, tauxHoraireReference: 50 }, 60)).toEqual({
      heuresConsommees: 60, montantConsomme: 3000, creditRestantEuros: 2000,
      creditRestantHeures: 40, tauxHoraireReel: 83.33, ratioConsommation: 60,
    });
  });
  it('gère une affaire sans pointage', () => {
    expect(calculerStatistiques({ montantVenduHt: 1000, tauxHoraireReference: 50 }, 0).tauxHoraireReel).toBeNull();
  });
  it('signale un dépassement', () => { expect(niveauRentabilite(101)).toBe('depassement'); expect(niveauRentabilite(80)).toBe('attention'); expect(niveauRentabilite(79)).toBe('rentable'); });
});
