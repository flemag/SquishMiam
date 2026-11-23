import { describe, it, expect } from "vitest";
import { regrouperActiviteParSemaine } from "@/lib/admin-stats";

// Lundi 16 novembre 2026, 12:00 UTC. Semaine courante : 2026-11-16.
const MAINTENANT = new Date("2026-11-16T12:00:00Z");
const VIDE = { inscriptions: [], recettes: [], cles: [] };

describe("regrouperActiviteParSemaine", () => {
  it("renvoie exactement nbSemaines semaines, croissantes, semaine courante incluse", () => {
    const semaines = regrouperActiviteParSemaine(VIDE, 6, MAINTENANT);
    expect(semaines.map((s) => s.debut)).toEqual([
      "2026-10-12",
      "2026-10-19",
      "2026-10-26",
      "2026-11-02",
      "2026-11-09",
      "2026-11-16",
    ]);
  });

  it("laisse les semaines vides à zéro", () => {
    const semaines = regrouperActiviteParSemaine(VIDE, 3, MAINTENANT);
    expect(semaines).toEqual([
      { debut: "2026-11-02", inscriptions: 0, recettes: 0, cles: 0 },
      { debut: "2026-11-09", inscriptions: 0, recettes: 0, cles: 0 },
      { debut: "2026-11-16", inscriptions: 0, recettes: 0, cles: 0 },
    ]);
  });

  it("range un lundi 00:00 UTC dans sa semaine et un dimanche 23:59 dans la précédente", () => {
    const semaines = regrouperActiviteParSemaine(
      {
        inscriptions: [new Date("2026-11-16T00:00:00Z")],
        recettes: [new Date("2026-11-15T23:59:59Z")],
        cles: [],
      },
      6,
      MAINTENANT
    );
    expect(semaines[5]).toMatchObject({ debut: "2026-11-16", inscriptions: 1, recettes: 0 });
    expect(semaines[4]).toMatchObject({ debut: "2026-11-09", inscriptions: 0, recettes: 1 });
  });

  it("ignore les dates antérieures à la fenêtre", () => {
    const semaines = regrouperActiviteParSemaine(
      {
        inscriptions: [new Date("2026-10-11T23:59:59Z")],
        recettes: [new Date("2026-10-12T00:00:00Z")],
        cles: [],
      },
      6,
      MAINTENANT
    );
    expect(semaines[0]).toMatchObject({ debut: "2026-10-12", inscriptions: 0, recettes: 1 });
    expect(semaines.reduce((n, s) => n + s.inscriptions, 0)).toBe(0);
  });

  it("ignore un événement daté après la semaine courante", () => {
    const semaines = regrouperActiviteParSemaine(
      { inscriptions: [new Date("2026-11-23T00:00:00Z")], recettes: [], cles: [] },
      6,
      MAINTENANT
    );
    expect(semaines.reduce((n, s) => n + s.inscriptions, 0)).toBe(0);
  });

  it("compte chaque type d'événement dans sa propre série", () => {
    const semaines = regrouperActiviteParSemaine(
      {
        inscriptions: [new Date("2026-11-02T08:00:00Z"), new Date("2026-11-03T08:00:00Z")],
        recettes: [new Date("2026-11-02T09:00:00Z")],
        cles: [new Date("2026-11-16T09:00:00Z"), new Date("2026-11-16T10:00:00Z")],
      },
      6,
      MAINTENANT
    );
    expect(semaines[3]).toEqual({
      debut: "2026-11-02",
      inscriptions: 2,
      recettes: 1,
      cles: 0,
    });
    expect(semaines[5]).toEqual({
      debut: "2026-11-16",
      inscriptions: 0,
      recettes: 0,
      cles: 2,
    });
  });

  it("renvoie un tableau vide si nbSemaines <= 0", () => {
    expect(regrouperActiviteParSemaine(VIDE, 0, MAINTENANT)).toEqual([]);
    expect(regrouperActiviteParSemaine(VIDE, -2, MAINTENANT)).toEqual([]);
  });
});
