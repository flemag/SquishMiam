import { describe, it, expect } from "vitest";
import {
  OBJECTIF_DEFAUT,
  OBJECTIF_LABELS,
  TAILLE_FOYER_MAX,
  TAILLE_FOYER_MIN,
  normaliserTailleFoyer,
  objectifDepuisValeur,
  phraseProfil,
} from "@/lib/profil";

describe("normaliserTailleFoyer", () => {
  it("accepte les entiers dans les bornes", () => {
    expect(normaliserTailleFoyer(1)).toBe(1);
    expect(normaliserTailleFoyer("4")).toBe(4);
    expect(normaliserTailleFoyer(12)).toBe(12);
  });

  it("borne et arrondit", () => {
    expect(normaliserTailleFoyer(0)).toBe(TAILLE_FOYER_MIN);
    expect(normaliserTailleFoyer(-3)).toBe(TAILLE_FOYER_MIN);
    expect(normaliserTailleFoyer(99)).toBe(TAILLE_FOYER_MAX);
    expect(normaliserTailleFoyer(2.6)).toBe(3);
  });

  it("retombe sur 1 pour une valeur invalide", () => {
    expect(normaliserTailleFoyer(undefined)).toBe(1);
    expect(normaliserTailleFoyer(null)).toBe(1);
    expect(normaliserTailleFoyer("beaucoup")).toBe(1);
    expect(normaliserTailleFoyer(NaN)).toBe(1);
  });
});

describe("objectifDepuisValeur", () => {
  it("reconnaît les objectifs connus", () => {
    expect(objectifDepuisValeur("perte_poids")).toBe("perte_poids");
    expect(objectifDepuisValeur("prise_masse")).toBe("prise_masse");
  });

  it("retombe sur l'équilibre sinon", () => {
    expect(objectifDepuisValeur("inconnu")).toBe(OBJECTIF_DEFAUT);
    expect(objectifDepuisValeur(null)).toBe(OBJECTIF_DEFAUT);
    expect(objectifDepuisValeur(42)).toBe(OBJECTIF_DEFAUT);
  });
});

describe("phraseProfil", () => {
  it("mentionne le foyer et l'objectif", () => {
    const phrase = phraseProfil({ householdSize: 3, goal: "perte_poids" });
    expect(phrase).toContain("3 personnes");
    expect(phrase).toContain(OBJECTIF_LABELS.perte_poids.toLowerCase());
  });

  it("reste neutre sans objectif particulier", () => {
    const phrase = phraseProfil({ householdSize: 1, goal: "equilibre" });
    expect(phrase).toContain("1 personne");
    expect(phrase).toContain("pas d'objectif");
  });
});
