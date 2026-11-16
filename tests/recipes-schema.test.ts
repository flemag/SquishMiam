import { describe, it, expect } from "vitest";
import { recipeInput } from "@/lib/recipes-schema";

const valide = {
  title: "Pâtes carbonara",
  servings: 2,
  tags: ["rapide"],
  ingredients: [{ nom: "Spaghetti", quantite: 200, unite: "g" }],
  steps: ["Cuire", "Mélanger"],
};

describe("recipeInput", () => {
  it("accepte une recette valide", () => expect(recipeInput.safeParse(valide).success).toBe(true));

  it("refuse sans ingrédients", () =>
    expect(recipeInput.safeParse({ ...valide, ingredients: [] }).success).toBe(false));

  it("refuse servings hors bornes", () =>
    expect(recipeInput.safeParse({ ...valide, servings: 0 }).success).toBe(false));
});
