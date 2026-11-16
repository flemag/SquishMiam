import { describe, it, expect } from "vitest";
import { mapToRayon, scaleQuantity, aggregateGroceries, formatQuantite } from "@/lib/courses";

describe("mapToRayon", () => {
  it("classe les ingrédients courants", () => {
    expect(mapToRayon("Tomates cerises")).toBe("Fruits & légumes");
    expect(mapToRayon("yaourt nature")).toBe("Crémerie");
    expect(mapToRayon("Blanc de poulet")).toBe("Viandes & poissons");
    expect(mapToRayon("Ingrédient inconnu")).toBe("Épicerie");
  });
});

describe("scaleQuantity", () => {
  it("multiplie et borne à 2 décimales", () => {
    expect(scaleQuantity(1.5, 2, 3)).toBe(2.25);
    expect(scaleQuantity(200, 2, 4)).toBe(400);
  });
});

describe("aggregateGroceries", () => {
  it("fusionne même nom + même unité, sépare les unités différentes", () => {
    const result = aggregateGroceries([
      {
        recipe: {
          servings: 2,
          ingredients: [
            { nom: "Tomates", quantite: 500, unite: "g" },
            { nom: "Farine", quantite: 0.5, unite: "kg" },
          ],
        },
        servings: 2,
      },
      {
        recipe: { servings: 4, ingredients: [{ nom: "Tomates", quantite: 1, unite: "kg" }] },
        servings: 4,
      },
    ]);
    const tomates = result.flatMap((r) => r.items).filter((i) => i.nom === "Tomates");
    expect(tomates).toHaveLength(2); // 500 g et 1 kg restent séparés
    expect(tomates[0].quantite).toBe(500);
  });

  it("additionne même nom + même unité", () => {
    const result = aggregateGroceries([
      { recipe: { servings: 2, ingredients: [{ nom: "Œufs", quantite: 3, unite: "pièce" }] }, servings: 2 },
      { recipe: { servings: 2, ingredients: [{ nom: "Œufs", quantite: 3, unite: "pièce" }] }, servings: 2 },
    ]);
    const flat = result.flatMap((r) => r.items);
    expect(flat).toHaveLength(1);
    expect(flat[0].quantite).toBe(6);
  });
});

describe("formatQuantite", () => {
  it("affiche à la française", () => {
    expect(formatQuantite(2.25, "kg")).toBe("2,25 kg");
    expect(formatQuantite(6, "pièce")).toBe("6 pièce");
  });
});
