import { describe, it, expect } from "vitest";
import { normaliserNomIngredient, calculerNutritionRecette, agregerSemaine, objectifCalorique } from "@/lib/nutrition";

describe("normaliserNomIngredient", () => {
  it("minuscule, sans accents, trim", () => {
    expect(normaliserNomIngredient("  Courgettes  ")).toBe("courgettes");
    expect(normaliserNomIngredient("Œufs")).toBe("œufs");
  });
});

describe("calculerNutritionRecette", () => {
  const lookup = (nom: string) => {
    if (nom === "courgettes") return { calories: 17, proteines: 1, glucides: 3, lipides: 0 };
    if (nom === "fromage") return { calories: 400, proteines: 25, glucides: 2, lipides: 33 };
    return null;
  };

  it("calcule les macros depuis les ingrédients", () => {
    const r = calculerNutritionRecette(
      [{ nom: "courgettes", quantite: 300, unite: "g" }, { nom: "fromage", quantite: 100, unite: "g" }],
      lookup
    );
    expect(r).not.toBeNull();
    expect(r!.calories).toBeGreaterThan(0);
    expect(r!.proteines).toBeGreaterThan(0);
  });

  it("renvoie null si aucun ingrédient n'a de données", () => {
    const r = calculerNutritionRecette([{ nom: "xyz", quantite: 100, unite: "g" }], () => null);
    expect(r).toBeNull();
  });

  it("gère les quantités en kg, ml, pièce, boîte", () => {
    const r = calculerNutritionRecette(
      [{ nom: "courgettes", quantite: 1, unite: "kg" }],
      lookup
    );
    expect(r).not.toBeNull();
  });
});

describe("agregerSemaine", () => {
  it("groupe par date et somme les macros", () => {
    const r = agregerSemaine([
      { date: "2026-11-24", servings: 2, nutrition: { calories: 300, proteines: 10, glucides: 40, lipides: 12 } },
      { date: "2026-11-24", servings: 1, nutrition: { calories: 200, proteines: 5, glucides: 30, lipides: 8 } },
      { date: "2026-11-25", servings: 1, nutrition: { calories: 400, proteines: 20, glucides: 50, lipides: 15 } },
    ]);
    expect(r).toHaveLength(2);
    expect(r[0].date).toBe("2026-11-24");
    expect(r[0].calories).toBe(300 * 2 + 200 * 1);
  });
});

describe("objectifCalorique", () => {
  it("retourne les bonnes valeurs", () => {
    expect(objectifCalorique("equilibre")).toBe(2000);
    expect(objectifCalorique("perte_poids")).toBe(1600);
    expect(objectifCalorique("prise_masse")).toBe(2500);
    expect(objectifCalorique("sante")).toBe(1800);
    expect(objectifCalorique("famille")).toBe(2000);
    expect(objectifCalorique("inconnu")).toBe(2000);
  });
});