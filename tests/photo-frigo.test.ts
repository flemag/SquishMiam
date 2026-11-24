import { describe, it, expect } from "vitest";
import { normaliserIngredient, extraireIngredients, matcherRecettes, parserPhotoFrigo } from "@/lib/photo-frigo";

describe("normaliserIngredient", () => {
  it("minuscule, sans accents, sans articles", () => {
    expect(normaliserIngredient("  Courgettes  ")).toBe("courgette");
    expect(normaliserIngredient("les œufs")).toBe("oeuf");
    expect(normaliserIngredient("de la farine")).toBe("farine");
  });
});

describe("extraireIngredients", () => {
  it("parse un JSON valide", () => {
    expect(extraireIngredients('{"ingredients":["courgettes","fromage","oeufs"]}')).toEqual(["courgettes", "fromage", "oeufs"]);
  });
  it("parse une liste texte", () => {
    expect(extraireIngredients("courgettes, fromage, œufs")).toEqual(["courgettes", "fromage", "oeufs"]);
  });
  it("renvoie [] pour du vide", () => {
    expect(extraireIngredients("")).toEqual([]);
    expect(extraireIngredients("null")).toEqual([]);
  });
});

describe("matcherRecettes", () => {
  const recettes = [
    { id: "1", title: "Gratin de courgettes", ingredients: [{ nom: "courgettes" }, { nom: "fromage" }, { nom: "oeufs" }] },
    { id: "2", title: "Pâtes au pesto", ingredients: [{ nom: "pâtes" }, { nom: "pesto" }] },
  ];
  it("trouve les recettes qui matchent", () => {
    const r = matcherRecettes(["courgettes", "fromage", "oeufs", "lait"], recettes);
    expect(r[0].id).toBe("1");
    expect(r[0].score).toBe(1); // 3/3
    expect(r[0].matches).toContain("courgettes");
  });
  it("ne propose pas les recettes sans match", () => {
    const r = matcherRecettes(["courgettes", "fromage", "oeufs", "lait"], recettes);
    expect(r.find((x) => x.id === "2")).toBeUndefined();
  });
  it("trie par score décroissant", () => {
    const r = matcherRecettes(["courgettes", "fromage", "pâtes"], recettes);
    expect(r.length).toBe(2);
    expect(r[0].score).toBeGreaterThanOrEqual(r[1].score);
  });
});

describe("parserPhotoFrigo", () => {
  it("parse une réponse complète", () => {
    const r = parserPhotoFrigo(JSON.stringify({
      ingredients: ["courgettes", "fromage"],
      brouillon: { title: "Gratin", servings: 2, ingredients: [{ nom: "courgettes" }], steps: ["Cuire."] },
    }));
    expect(r?.ingredients).toEqual(["courgettes", "fromage"]);
    expect(r?.brouillon?.title).toBe("Gratin");
  });
  it("renvoie null si inexploitable", () => {
    expect(parserPhotoFrigo("pas du json")).toBeNull();
    expect(parserPhotoFrigo('{"ingredients":[]}')).toBeNull();
  });
});