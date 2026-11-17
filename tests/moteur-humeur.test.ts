import { describe, it, expect } from "vitest";
import { evaluerHumeur } from "@/lib/moteur-humeur";

const base = { repasSemaine: 5, dernierEvenement: null };

describe("evaluerHumeur", () => {
  it("endormi de 23h00 à 5h59, content sinon par défaut", () => {
    expect(evaluerHumeur({ ...base, maintenant: new Date(2026, 0, 15, 23, 0) })).toBe("endormi");
    expect(evaluerHumeur({ ...base, maintenant: new Date(2026, 0, 15, 5, 59) })).toBe("endormi");
    expect(evaluerHumeur({ ...base, maintenant: new Date(2026, 0, 15, 6, 0) })).toBe("content");
    expect(evaluerHumeur({ ...base, maintenant: new Date(2026, 0, 15, 14, 0) })).toBe("content");
  });

  it("relax de 21h à 23h si la semaine est déjà fournie", () => {
    expect(evaluerHumeur({ ...base, maintenant: new Date(2026, 0, 15, 21, 0) })).toBe("relax");
  });

  it("affame entre 18h et 21h si aucun repas planifié", () => {
    expect(
      evaluerHumeur({ ...base, repasSemaine: 0, maintenant: new Date(2026, 0, 15, 18, 30) })
    ).toBe("affame");
    expect(
      evaluerHumeur({ ...base, repasSemaine: 5, maintenant: new Date(2026, 0, 15, 18, 30) })
    ).not.toBe("affame");
  });

  it("fete si semaine-complete de moins de 5 min — prioritaire sur l'heure", () => {
    const ctx = {
      ...base,
      repasSemaine: 14,
      dernierEvenement: { type: "semaine-complete" as const, ilYAms: 4 * 60 * 1000 },
      maintenant: new Date(2026, 0, 15, 23, 30), // même la nuit
    };
    expect(evaluerHumeur(ctx)).toBe("fete");
  });

  it("concentre juste après une planification, motive après une recette, taquin après courses cochées", () => {
    const ev = (type: any, ms: number) => ({ ...base, dernierEvenement: { type, ilYAms: ms }, maintenant: new Date(2026, 0, 15, 12, 0) });
    expect(evaluerHumeur(ev("repas-planifie", 10_000))).toBe("concentre");
    expect(evaluerHumeur(ev("recette-creee", 60_000))).toBe("motive");
    expect(evaluerHumeur(ev("course-cochee", 10_000))).toBe("taquin");
  });

  it("fier à partir de 10 repas planifiés (hors événements récents)", () => {
    expect(evaluerHumeur({ ...base, repasSemaine: 10, maintenant: new Date(2026, 0, 15, 14, 0) })).toBe("fier");
  });

  it("le dernier événement remplace le précédent (rafale)", () => {
    const ctx = { ...base, dernierEvenement: { type: "repas-retire" as const, ilYAms: 5_000 }, maintenant: new Date(2026, 0, 15, 12, 0) };
    expect(evaluerHumeur(ctx)).toBe("content"); // pas d'humeur collée aux vieux événements
  });
});
