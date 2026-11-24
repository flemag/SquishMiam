import { describe, it, expect } from "vitest";
import { calculerNiveau, plantesDebloquees, xpPourAction, NIVEAUX } from "@/lib/jardin";

describe("calculerNiveau", () => {
  it("niveau 1 pour 0 XP", () => {
    const r = calculerNiveau(0);
    expect(r.niveau).toBe(1);
    expect(r.xpActuel).toBe(0);
    expect(r.progression).toBe(0);
  });
  it("niveau 2 à 50 XP", () => {
    const r = calculerNiveau(50);
    expect(r.niveau).toBe(2);
    expect(r.xpPourSuivant).toBe(150);
  });
  it("niveau max pour XP très élevé", () => {
    const r = calculerNiveau(99999);
    expect(r.niveau).toBe(NIVEAUX.length);
    expect(r.progression).toBe(100);
  });
  it("gère un XP négatif comme 0", () => {
    expect(calculerNiveau(-10).niveau).toBe(1);
  });
});

describe("plantesDebloquees", () => {
  it("débloque la graine au niveau 1", () => {
    const plantes = plantesDebloquees(0);
    expect(plantes.length).toBeGreaterThanOrEqual(1);
    expect(plantes[0].emoji).toBe("🌱");
  });
  it("débloque plus de plantes avec plus d'XP", () => {
    const bas = plantesDebloquees(0);
    const haut = plantesDebloquees(500);
    expect(haut.length).toBeGreaterThan(bas.length);
  });
});

describe("xpPourAction", () => {
  it("retourne les bonnes valeurs", () => {
    expect(xpPourAction("repas_planifie")).toBe(5);
    expect(xpPourAction("course_cochee")).toBe(2);
    expect(xpPourAction("recette_ajoutee")).toBe(10);
    expect(xpPourAction("recette_validee")).toBe(15);
    expect(xpPourAction("semaine_complete")).toBe(50);
  });
});