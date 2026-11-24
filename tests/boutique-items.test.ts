import { describe, it, expect } from "vitest";
import { validerArticle, peutAcheter, metadonneesThemeValides } from "@/lib/boutique-items";

describe("metadonneesThemeValides", () => {
  it("accepte un thème valide", () => {
    expect(metadonneesThemeValides({ primary: "#FFB5C2", secondary: "#A8E6CF", accent: "#C9B6E4", background: "#FFF9E6", text: "#3A2E2E" })).toBe(true);
  });
  it("refuse un thème incomplet ou invalide", () => {
    expect(metadonneesThemeValides({ primary: "#FFB5C2" })).toBe(false);
    expect(metadonneesThemeValides(null)).toBe(false);
    expect(metadonneesThemeValides("string")).toBe(false);
  });
});

describe("validerArticle", () => {
  it("accepte un article valide", () => {
    expect(validerArticle({ type: "theme", nom: "Rose", prix: 5, metadata: { primary: "#FFB5C2", secondary: "#A8E6CF", accent: "#C9B6E4", background: "#FFF9E6", text: "#3A2E2E" } })).toEqual({ ok: true });
    expect(validerArticle({ type: "accessoire", nom: "Chapeau", prix: 0, metadata: {} })).toEqual({ ok: true });
    expect(validerArticle({ type: "pack", nom: "Pack végé", prix: 3, metadata: { recipeIds: ["r1", "r2"] } })).toEqual({ ok: true });
  });
  it("refuse un article invalide", () => {
    expect(validerArticle({ type: "inconnu", nom: "X", prix: 0, metadata: {} }).ok).toBe(false);
    expect(validerArticle({ type: "theme", nom: "", prix: 0, metadata: {} }).ok).toBe(false);
    expect(validerArticle({ type: "theme", nom: "X", prix: -1, metadata: {} }).ok).toBe(false);
    expect(validerArticle({ type: "theme", nom: "X", prix: 0, metadata: {} }).ok).toBe(false);
    expect(validerArticle({ type: "pack", nom: "X", prix: 0, metadata: {} }).ok).toBe(false);
  });
});

describe("peutAcheter", () => {
  it("peut acheter si pas déjà acheté et assez de jetons", () => {
    expect(peutAcheter({ tokens: 5, prix: 3, dejaAchete: false })).toBe(true);
    expect(peutAcheter({ tokens: 0, prix: 0, dejaAchete: false })).toBe(true);
  });
  it("ne peut pas acheter si déjà acheté ou solde insuffisant", () => {
    expect(peutAcheter({ tokens: 5, prix: 3, dejaAchete: true })).toBe(false);
    expect(peutAcheter({ tokens: 2, prix: 3, dejaAchete: false })).toBe(false);
  });
});