import { describe, it, expect } from "vitest";
import { validerMouvement, libelleMotif, MOTIFS_JETONS } from "@/lib/jetons-admin";

describe("validerMouvement", () => {
  it("accepte un crédit et un débit valides", () => {
    expect(validerMouvement({ amount: 5, reason: "bonus", solde: 0 })).toEqual({
      ok: true,
      amount: 5,
      reason: "bonus",
    });
    expect(validerMouvement({ amount: -2, reason: "correction", solde: 4 })).toEqual({
      ok: true,
      amount: -2,
      reason: "correction",
    });
  });

  it("refuse un montant nul, décimal ou hors limite", () => {
    expect(validerMouvement({ amount: 0, reason: "bonus", solde: 0 }).ok).toBe(false);
    expect(validerMouvement({ amount: 1.5, reason: "bonus", solde: 0 }).ok).toBe(false);
    expect(validerMouvement({ amount: 1001, reason: "bonus", solde: 0 }).ok).toBe(false);
  });

  it("refuse un motif inconnu", () => {
    expect(validerMouvement({ amount: 3, reason: "pirate", solde: 0 }).ok).toBe(false);
  });

  it("refuse un débit supérieur au solde", () => {
    const r = validerMouvement({ amount: -5, reason: "geste", solde: 2 });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.raison).toContain("Solde insuffisant");
  });

  it("expose les motifs et leurs libellés", () => {
    expect(MOTIFS_JETONS).toContain("bonus");
    expect(libelleMotif("validation")).toBe("Validation");
    expect(libelleMotif("mystere")).toBe("mystere");
  });
});