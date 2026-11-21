import { describe, it, expect } from "vitest";
import { CATEGORIE_AUTRE, normaliserCategorie } from "@/lib/categories";

describe("normaliserCategorie", () => {
  it("normalise accents, casse et œ/æ", () => {
    expect(normaliserCategorie("Végé")).toBe("vege");
    expect(normaliserCategorie("VÉGÉ")).toBe("vege");
    expect(normaliserCategorie("Œufs & brunch")).toBe("oeufs & brunch");
  });
  it("compacte les espaces internes et les bords", () => {
    expect(normaliserCategorie("  Pâtes,   riz & céréales  ")).toBe("pates, riz & cereales");
  });
  it("renvoie une chaîne vide pour un nom vide ou blanc", () => {
    expect(normaliserCategorie("")).toBe("");
    expect(normaliserCategorie("   ")).toBe("");
  });
  it("expose l'id stable de la catégorie par défaut", () => {
    expect(CATEGORIE_AUTRE).toBe("cat-autre");
  });
});
