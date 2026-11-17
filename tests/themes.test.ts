import { describe, it, expect } from "vitest";
import { bullesPourChemin, themeDepuisValeur, THEMES, THEME_DEFAUT } from "@/lib/themes";

describe("themeDepuisValeur", () => {
  it("accepte les 3 ids valides", () => {
    expect(themeDepuisValeur("manga")).toBe("manga");
    expect(themeDepuisValeur("doux")).toBe("doux");
    expect(themeDepuisValeur("pique-nique")).toBe("pique-nique");
  });
  it("retombe sur manga si absent ou invalide", () => {
    expect(themeDepuisValeur(undefined)).toBe("manga");
    expect(themeDepuisValeur(null)).toBe("manga");
    expect(themeDepuisValeur("")).toBe("manga");
    expect(themeDepuisValeur("SOMBRE")).toBe("manga");
    expect(themeDepuisValeur("manga; path=/evil")).toBe("manga");
  });
});

describe("THEMES", () => {
  it("propose 3 thèmes avec labels et aperçu", () => {
    expect(THEMES).toHaveLength(3);
    expect(THEMES.map((t) => t.id)).toContain(THEME_DEFAUT);
    for (const t of THEMES) {
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.apercu.fond).toMatch(/^#/);
      expect(t.apercu.accent).toMatch(/^#/);
    }
  });
});

describe("bullesPourChemin", () => {
  it("donne un pool propre à chaque page", () => {
    const plan = bullesPourChemin("/plan");
    const recettes = bullesPourChemin("/recettes");
    const courses = bullesPourChemin("/courses");
    expect(plan.length).toBeGreaterThanOrEqual(3);
    expect(recettes).toEqual(bullesPourChemin("/recettes/nouvelle")); // préfixe
    expect(plan).not.toEqual(recettes);
    expect(courses).not.toEqual(plan);
  });
  it("donne le pool générique partout ailleurs, jamais vide", () => {
    const defaut = bullesPourChemin("/admin/cles");
    expect(defaut.length).toBeGreaterThanOrEqual(3);
    expect(bullesPourChemin("/")).toEqual(defaut);
  });
});
