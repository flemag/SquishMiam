import { describe, it, expect } from "vitest";
import {
  resumerSemaine,
  conseilsLocaux,
  construireContexteAnalyse,
  parserAnalyseIa,
  type EntreeSemaine,
} from "@/lib/analyse-miamz";

const DATES = ["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29"];
const PROFIL = { householdSize: 2, goal: "equilibre" };
const entree = (dateIso: string, titre: string, categorieNom: string | null = null, tags: string[] = []): EntreeSemaine => ({
  dateIso, slot: "DINER", titre, categorieNom, tags,
});

describe("resumerSemaine", () => {
  it("compte repas, jours vides et répétitions", () => {
    const r = resumerSemaine(DATES, [
      entree("2026-11-23", "Pâtes"),
      entree("2026-11-24", "Pâtes"),
      entree("2026-11-25", "Salade", "Végétarien", ["végé"]),
    ]);
    expect(r.nbRepas).toBe(3);
    expect(r.joursRemplis).toEqual(["2026-11-23", "2026-11-24", "2026-11-25"]);
    expect(r.joursVides).toHaveLength(4);
    expect(r.nbCreneauxVides).toBe(18);
    expect(r.repetitions).toEqual([{ titre: "Pâtes", fois: 2 }]);
    expect(r.categories).toEqual(["Végétarien"]);
    expect(r.titresDistincts).toBe(2);
  });

  it("gère une semaine vide et une semaine pleine", () => {
    expect(resumerSemaine(DATES, []).joursVides).toHaveLength(7);
    const pleine = DATES.flatMap((d) => [
      entree(d, `A-${d}`), entree(d, `B-${d}`), entree(d, `C-${d}`),
    ]);
    const r = resumerSemaine(DATES, pleine);
    expect(r.nbRepas).toBe(21);
    expect(r.joursVides).toEqual([]);
    expect(r.nbCreneauxVides).toBe(0);
  });
});

describe("conseilsLocaux", () => {
  it("invite à planifier quand la semaine est vide", () => {
    const r = conseilsLocaux({
      resume: resumerSemaine(DATES, []),
      courses: [],
      profil: PROFIL,
    });
    expect(r.conseils.length).toBeGreaterThan(0);
    expect(r.conseils.join(" ").toLowerCase()).toContain("vide");
    expect(r.suggestion).not.toBeNull();
  });

  it("signale les répétitions et les jours vides", () => {
    const r = conseilsLocaux({
      resume: resumerSemaine(DATES, [entree("2026-11-23", "Pâtes"), entree("2026-11-24", "Pâtes")]),
      courses: [{ nom: "Pâtes", rayon: "Épicerie", checked: false }],
      profil: PROFIL,
    });
    const texte = r.conseils.join(" ");
    expect(texte).toContain("Pâtes");
    expect(texte.toLowerCase()).toContain("jour");
  });

  it("ne dépasse jamais 4 conseils et reste bienveillant sur le poids", () => {
    const r = conseilsLocaux({
      resume: resumerSemaine(DATES, [entree("2026-11-23", "Pâtes"), entree("2026-11-24", "Pâtes")]),
      courses: [],
      profil: { householdSize: 1, goal: "perte_poids" },
    });
    expect(r.conseils.length).toBeLessThanOrEqual(4);
    const texte = r.conseils.join(" ").toLowerCase();
    expect(texte).toContain("légume");
    expect(texte).not.toMatch(/gross|régime strict|maigrir vite/);
  });

  it("félicite quand tout est coché et que la semaine est remplie", () => {
    const pleine = DATES.flatMap((d) => [entree(d, `A-${d}`), entree(d, `B-${d}`), entree(d, `C-${d}`)]);
    const r = conseilsLocaux({
      resume: resumerSemaine(DATES, pleine),
      courses: [{ nom: "Riz", rayon: "Épicerie", checked: true }],
      profil: PROFIL,
    });
    expect(r.conseils.length).toBeGreaterThan(0);
    expect(r.conseils.join(" ").toLowerCase()).toMatch(/coch|bravo|prêt/);
  });
});

describe("construireContexteAnalyse", () => {
  it("inclut le profil, les repas et la liste", () => {
    const texte = construireContexteAnalyse({
      dates: DATES,
      entrees: [entree("2026-11-23", "Pâtes", "Italien")],
      courses: [{ nom: "Riz", rayon: "Épicerie", checked: false }],
      profil: { householdSize: 3, goal: "perte_poids" },
    });
    expect(texte).toContain("3 personnes");
    expect(texte).toContain("Pâtes");
    expect(texte).toContain("Riz");
    expect(texte).toContain("perdre du poids");
  });
});

describe("parserAnalyseIa", () => {
  it("lit un JSON valide, même dans un bloc ```json", () => {
    const r = parserAnalyseIa('```json\n{"conseils":["A","B"],"suggestion":"Cuisine des légumes"}\n```');
    expect(r).toEqual({ conseils: ["A", "B"], suggestion: "Cuisine des légumes" });
  });

  it("borne à 4 conseils et 160 caractères", () => {
    const r = parserAnalyseIa(
      JSON.stringify({ conseils: ["1", "2", "3", "4", "5"], suggestion: "x".repeat(400) })
    );
    expect(r?.conseils).toHaveLength(4);
    expect(r?.suggestion?.length).toBe(160);
  });

  it("renvoie null pour une réponse inexploitable", () => {
    expect(parserAnalyseIa("pas du json")).toBeNull();
    expect(parserAnalyseIa('{"conseils":[]}')).toBeNull();
    expect(parserAnalyseIa("null")).toBeNull();
  });
});
