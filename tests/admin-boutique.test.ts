import { describe, it, expect } from "vitest";
import { statutBoutique, champsModeration } from "@/lib/admin-boutique";

describe("statutBoutique", () => {
  it("distingue privée, en attente et publiée", () => {
    expect(statutBoutique({ isPublic: false, validatedAt: null })).toBe("privee");
    expect(statutBoutique({ isPublic: true, validatedAt: null })).toBe("en_attente");
    expect(statutBoutique({ isPublic: true, validatedAt: new Date() })).toBe("publiee");
  });
});

describe("champsModeration", () => {
  it("publie d'office en horodatant", () => {
    const now = new Date("2026-11-24T10:00:00Z");
    expect(champsModeration(true, now)).toEqual({
      isPublic: true,
      publishedAt: now,
      validatedAt: now,
    });
  });

  it("retire proprement et remet les compteurs à zéro", () => {
    expect(champsModeration(false, new Date())).toEqual({
      isPublic: false,
      publishedAt: null,
      validatedAt: null,
      validationCount: 0,
      validators: [],
      sharedWith: [],
    });
  });
});