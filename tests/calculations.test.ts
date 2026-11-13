import { describe, expect, it } from 'vitest';
import { calculerHeuresRestantes, calculerStatistiques, calculerTauxHoraireProduction, niveauRentabilite } from '../src/shared/calculations';

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

describe('règles de clôture et de charge restante', () => {
  it('utilise le taux réel pour une affaire terminée', () => {
    expect(calculerTauxHoraireProduction({ montantVenduHt: 5000, tauxHoraireReference: 70, terminee: true }, 50)).toBe(100);
    expect(calculerTauxHoraireProduction({ montantVenduHt: 5000, tauxHoraireReference: 70, terminee: false }, 50)).toBe(70);
  });

  it('additionne uniquement les crédits positifs des affaires actives', () => {
    expect(calculerHeuresRestantes([
      { terminee: false, creditRestantHeures: 12.5 },
      { terminee: false, creditRestantHeures: -3 },
      { terminee: true, creditRestantHeures: 8 },
    ])).toBe(12.5);
  });
});
