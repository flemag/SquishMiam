import { describe, it, expect } from "vitest";
import { correspondRecette, filtrerRecettes, normaliser, nomsIngredients, trierRecettes } from "@/lib/recherche-recettes";

describe("normaliser", () => {
  it("retire accents, œ, æ et met en minuscules", () => {
    expect(normaliser("Œufs à la crème")).toBe("oeufs a la creme");
    expect(normaliser("Ça, l'œil d'Anaïs")).toBe("ca, l'oeil d'anais");
  });
});

describe("nomsIngredients", () => {
  it("extrait les noms d'un Json tolérant", () => {
    expect(nomsIngredients([{ nom: "pâtes" }, { quantite: 2 }, "farine", null])).toEqual(["pâtes", "farine"]);
    expect(nomsIngredients(null)).toEqual([]);
    expect(nomsIngredients("pas un tableau")).toEqual([]);
  });
});

describe("correspondRecette", () => {
  const gratin = { title: "Gratin de courgettes", ingredientNoms: ["courgettes", "crème fraîche", "emmental"] };
  it("matche un jeton sur le titre ou un ingrédient (sous-chaîne)", () => {
    expect(correspondRecette(gratin, "courgette")).toBe(true);
    expect(correspondRecette(gratin, "emmental")).toBe(true);
    expect(correspondRecette(gratin, "courget")).toBe(true);
    expect(correspondRecette(gratin, "tomate")).toBe(false);
  });
  it("exige tous les jetons (ET), chacun sur le titre OU un ingrédient (OU)", () => {
    expect(correspondRecette(gratin, "gratin courgettes")).toBe(true);
    expect(correspondRecette(gratin, "gratin emmental")).toBe(true);
    expect(correspondRecette(gratin, "gratin tomate")).toBe(false);
  });
  it("ignore accents et œ", () => {
    expect(correspondRecette({ title: "Œufs brouillés", ingredientNoms: ["œufs", "beurre"] }, "oeufs")).toBe(true);
    expect(correspondRecette(gratin, "creme fraiche")).toBe(true);
  });
  it("requête vide ou blanche = tout matche", () => {
    expect(correspondRecette(gratin, "")).toBe(true);
    expect(correspondRecette(gratin, "   ")).toBe(true);
  });
});

const base = { id: "x", tags: [] as string[] };
const a = { ...base, id: "a", title: "Salade", minutes: 20, ingredientNoms: ["riz", "thon"], tags: ["végé", "rapide"], categorieId: "cat-salade" };
const b = { ...base, id: "b", title: "Bœuf bourguignon", minutes: 45, ingredientNoms: ["bœuf", "carotte"], tags: ["végé"], categorieId: "cat-viande" };
const c = { ...base, id: "c", title: "Mystère", minutes: null, ingredientNoms: [], tags: [], categorieId: null };

describe("filtrerRecettes", () => {
  it("filtre par durée : minutes null dans Toutes, hors ≤N", () => {
    expect(filtrerRecettes([a, b, c], { requete: "", tags: [], dureeMax: null }).map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(filtrerRecettes([a, b, c], { requete: "", tags: [], dureeMax: 30 }).map((r) => r.id)).toEqual(["a"]);
  });
  it("filtre par tags cumulables (ET)", () => {
    expect(filtrerRecettes([a, b, c], { requete: "", tags: ["végé", "rapide"], dureeMax: null }).map((r) => r.id)).toEqual(["a"]);
  });
  it("combine requête, durée et tags", () => {
    expect(filtrerRecettes([a, b, c], { requete: "boeuf", tags: [], dureeMax: null }).map((r) => r.id)).toEqual(["b"]);
  });
  it("filtre par catégorie (égalité stricte) et null = toutes", () => {
    expect(filtrerRecettes([a, b, c], { requete: "", tags: [], dureeMax: null, categorieId: "cat-salade" }).map((r) => r.id)).toEqual(["a"]);
    expect(filtrerRecettes([a, b, c], { requete: "", tags: [], dureeMax: null, categorieId: null }).map((r) => r.id)).toEqual(["a", "b", "c"]);
  });
  it("combine catégorie, durée et texte en ET", () => {
    expect(filtrerRecettes([a, b, c], { requete: "salade", tags: [], dureeMax: 20, categorieId: "cat-salade" }).map((r) => r.id)).toEqual(["a"]);
    expect(filtrerRecettes([a, b, c], { requete: "salade", tags: [], dureeMax: 10, categorieId: "cat-salade" })).toEqual([]);
    expect(filtrerRecettes([a, b, c], { requete: "boeuf", tags: [], dureeMax: null, categorieId: "cat-salade" })).toEqual([]);
  });
  it("une recette sans catégorie n'apparaît pas sous une catégorie", () => {
    expect(filtrerRecettes([c], { requete: "", tags: [], dureeMax: null, categorieId: "cat-salade" })).toEqual([]);
  });
});

describe("trierRecettes", () => {
  it("recent conserve l'ordre d'entrée", () => {
    expect(trierRecettes([b, a, c], "recent").map((r) => r.id)).toEqual(["b", "a", "c"]);
  });
  it("alpha trie en français", () => {
    expect(trierRecettes([b, a, c], "alpha").map((r) => r.id)).toEqual(["b", "c", "a"]); // Bœuf, Mystère, Salade
  });
  it("duree croissant avec null en dernier", () => {
    expect(trierRecettes([c, b, a], "duree").map((r) => r.id)).toEqual(["a", "b", "c"]);
  });
});
