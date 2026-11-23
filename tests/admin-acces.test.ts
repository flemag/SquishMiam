import { describe, it, expect } from "vitest";
import { cleDAccesCourante, prolongerAcces } from "@/lib/admin-acces";

const T = (iso: string | null) => (iso ? new Date(iso) : null);
const JOUR = 24 * 60 * 60 * 1000;

function cle(
  id: string,
  status: "UNUSED" | "ACTIVE" | "REVOKED",
  expiresAt: Date | null,
  activatedAt: Date | null = null
) {
  return { id, status, expiresAt, activatedAt };
}

describe("cleDAccesCourante", () => {
  it("renvoie null sans clé active", () => {
    expect(cleDAccesCourante([])).toBeNull();
    expect(
      cleDAccesCourante([
        cle("a", "UNUSED", null),
        cle("b", "REVOKED", T("2027-01-01T00:00:00Z")),
      ])
    ).toBeNull();
  });

  it("privilégie une clé illimitée", () => {
    const illimitee = cle("a", "ACTIVE", null, T("2026-01-01T00:00:00Z"));
    const datee = cle("b", "ACTIVE", T("2030-01-01T00:00:00Z"), T("2026-06-01T00:00:00Z"));
    expect(cleDAccesCourante([datee, illimitee])?.id).toBe("a");
  });

  it("prend l'expiration la plus lointaine", () => {
    const proche = cle("a", "ACTIVE", T("2026-12-01T00:00:00Z"), T("2026-11-01T00:00:00Z"));
    const loin = cle("b", "ACTIVE", T("2027-03-01T00:00:00Z"), T("2026-10-01T00:00:00Z"));
    expect(cleDAccesCourante([proche, loin])?.id).toBe("b");
  });

  it("préfère une clé valide à une clé active expirée", () => {
    const expiree = cle("a", "ACTIVE", T("2026-01-01T00:00:00Z"), T("2025-12-01T00:00:00Z"));
    const valide = cle("b", "ACTIVE", T("2027-06-01T00:00:00Z"), T("2026-10-01T00:00:00Z"));
    expect(cleDAccesCourante([expiree, valide])?.id).toBe("b");
  });

  it("départage une égalité d'expiration par l'activation la plus récente", () => {
    const ancienne = cle("a", "ACTIVE", T("2027-01-01T00:00:00Z"), T("2026-01-01T00:00:00Z"));
    const recente = cle("b", "ACTIVE", T("2027-01-01T00:00:00Z"), T("2026-06-01T00:00:00Z"));
    expect(cleDAccesCourante([ancienne, recente])?.id).toBe("b");
  });

  it("départage deux clés illimitées par l'activation la plus récente", () => {
    const ancienne = cle("a", "ACTIVE", null, T("2026-01-01T00:00:00Z"));
    const recente = cle("b", "ACTIVE", null, T("2026-06-01T00:00:00Z"));
    expect(cleDAccesCourante([ancienne, recente])?.id).toBe("b");
  });
});

describe("prolongerAcces", () => {
  const MAINTENANT = new Date("2026-11-22T12:00:00Z");

  it("jours null rend l'accès illimité", () => {
    expect(prolongerAcces(T("2026-12-01T00:00:00Z"), null, MAINTENANT)).toBeNull();
  });

  it("un accès déjà illimité le reste", () => {
    expect(prolongerAcces(null, 30, MAINTENANT)).toBeNull();
  });

  it("prolonge depuis maintenant une clé expirée", () => {
    expect(prolongerAcces(T("2026-11-01T00:00:00Z"), 7, MAINTENANT)?.toISOString()).toBe(
      "2026-11-29T12:00:00.000Z"
    );
  });

  it("ajoute les jours à une clé encore valide", () => {
    expect(prolongerAcces(T("2026-12-10T00:00:00Z"), 30, MAINTENANT)?.toISOString()).toBe(
      "2027-01-09T00:00:00.000Z"
    );
  });

  it("gère 90 jours", () => {
    const resultat = prolongerAcces(T("2026-12-10T00:00:00Z"), 90, MAINTENANT);
    expect(resultat?.getTime()).toBe(T("2026-12-10T00:00:00Z")!.getTime() + 90 * JOUR);
  });
});
