import { describe, it, expect } from "vitest";
import { decisionRenommage, decisionFusion } from "@/lib/admin-categories";

const CATEGORIES = [
  { id: "cat-vege", nom: "Végé", cle: "vege", masquee: false },
  { id: "cat-viande", nom: "Viande", cle: "viande", masquee: false },
  { id: "cat-autre", nom: "Autre", cle: "autre", masquee: false },
  { id: "cat-cachee", nom: "Cachée", cle: "cachee", masquee: true },
];

describe("decisionRenommage", () => {
  it("normalise accents, casse et espaces", () => {
    expect(decisionRenommage("  VÉGÉ  ", "cat-vege", CATEGORIES)).toEqual({
      ok: true,
      cle: "vege",
    });
  });

  it("accepte une variante du propre nom de la catégorie", () => {
    expect(decisionRenommage("VEGE", "cat-vege", CATEGORIES)).toEqual({ ok: true, cle: "vege" });
  });

  it("refuse un nom vide après normalisation", () => {
    expect(decisionRenommage("   ", "cat-vege", CATEGORIES)).toEqual({ ok: false, raison: "vide" });
  });

  it("refuse un nom de plus de 60 caractères", () => {
    expect(decisionRenommage("x".repeat(61), "cat-vege", CATEGORIES)).toEqual({
      ok: false,
      raison: "trop-long",
    });
  });

  it("accepte un nom de 60 caractères", () => {
    expect(decisionRenommage("x".repeat(60), "cat-vege", CATEGORIES)).toEqual({
      ok: true,
      cle: "x".repeat(60),
    });
  });

  it("signale une collision avec une autre catégorie", () => {
    expect(decisionRenommage(" Viande ", "cat-vege", CATEGORIES)).toEqual({
      ok: false,
      raison: "collision",
      categorie: { id: "cat-viande", nom: "Viande" },
    });
  });
});

describe("decisionFusion", () => {
  it("accepte deux catégories distinctes et visibles", () => {
    expect(decisionFusion("cat-vege", "cat-viande", CATEGORIES)).toEqual({ ok: true });
  });

  it("refuse la fusion vers soi-même", () => {
    expect(decisionFusion("cat-vege", "cat-vege", CATEGORIES)).toEqual({
      ok: false,
      raison: "meme-categorie",
    });
  });

  it("refuse de fusionner la catégorie de repli « Autre » comme source", () => {
    expect(decisionFusion("cat-autre", "cat-vege", CATEGORIES)).toEqual({
      ok: false,
      raison: "source-autre",
    });
  });

  it("refuse une cible masquée", () => {
    expect(decisionFusion("cat-vege", "cat-cachee", CATEGORIES)).toEqual({
      ok: false,
      raison: "cible-masquee",
    });
  });

  it("autorise une source masquée vers une cible visible", () => {
    expect(decisionFusion("cat-cachee", "cat-viande", CATEGORIES)).toEqual({ ok: true });
  });

  it("donne priorité à « même catégorie » sur « cible masquée »", () => {
    expect(decisionFusion("cat-cachee", "cat-cachee", CATEGORIES)).toEqual({
      ok: false,
      raison: "meme-categorie",
    });
  });

  it("refuse une source ou une cible inconnue", () => {
    expect(decisionFusion("cat-inconnue", "cat-vege", CATEGORIES)).toEqual({
      ok: false,
      raison: "inconnue",
    });
    expect(decisionFusion("cat-vege", "cat-inconnue", CATEGORIES)).toEqual({
      ok: false,
      raison: "inconnue",
    });
  });
});
