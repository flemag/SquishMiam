import { describe, it, expect } from "vitest";
import { peutValider, calculerJetonsApresValidation, estValidee, peutPartager, MAX_TOKENS, VALIDATIONS_FOR_BADGE } from "@/lib/boutique";

describe("boutique logic", () => {
  it("peutValider: true si recette publique, pas auteur, pas déjà validé", () => {
    expect(peutValider({ validationCount: 0, validators: [], authorId: "u1" }, "u2")).toBe(true);
  });
  it("peutValider: false si auteur", () => {
    expect(peutValider({ validationCount: 0, validators: [], authorId: "u1" }, "u1")).toBe(false);
  });
  it("peutValider: false si déjà validé par cet user", () => {
    expect(peutValider({ validationCount: 1, validators: ["u2"], authorId: "u1" }, "u2")).toBe(false);
  });
  it("peutValider: false si pas publique (validationCount = -1 convention)", () => {
    expect(peutValider({ validationCount: -1, validators: [], authorId: "u1" }, "u2")).toBe(false);
  });

  it("calculerJetonsApresValidation: +1 si < MAX_TOKENS", () => {
    expect(calculerJetonsApresValidation(0)).toBe(1);
    expect(calculerJetonsApresValidation(5)).toBe(6);
    expect(calculerJetonsApresValidation(9)).toBe(10);
  });
  it("calculerJetonsApresValidation: max 10", () => {
    expect(calculerJetonsApresValidation(10)).toBe(10);
    expect(calculerJetonsApresValidation(15)).toBe(10);
  });

  it("estValidee: true >= 3", () => {
    expect(estValidee(2)).toBe(false);
    expect(estValidee(3)).toBe(true);
    expect(estValidee(5)).toBe(true);
  });

  it("peutPartager: true seulement si validatedAt non null", () => {
    expect(peutPartager({ validatedAt: new Date() })).toBe(true);
    expect(peutPartager({ validatedAt: null })).toBe(false);
  });
});