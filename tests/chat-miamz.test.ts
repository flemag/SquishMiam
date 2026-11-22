import { describe, it, expect } from "vitest";
import {
  formaterContexteCuisine,
  parserReponseMiamz,
  reponseCharmeLocal,
  type ContexteCuisine,
} from "@/lib/chat-miamz";

describe("formaterContexteCuisine", () => {
  it("formate lisiblement la liste des recettes et des repas prévus", () => {
    const contexte: ContexteCuisine = {
      recettes: [
        { id: "1", title: "Gratin de courgettes", minutes: 30, tags: ["végé"], categorieNom: "Végé" },
        { id: "2", title: "Saumon au four", minutes: 20, tags: ["rapide"], categorieNom: "Poisson" },
      ],
      repasPrevus: [
        { dateIso: "2026-11-21", slot: "DINER", titre: "Saumon au four" },
      ],
    };

    const res = formaterContexteCuisine(contexte);
    expect(res).toContain("Gratin de courgettes");
    expect(res).toContain("Saumon au four");
    expect(res).toContain("Repas déjà prévus cette semaine :");
    expect(res).toContain("2026-11-21 (DINER) : Saumon au four");
  });

  it("gère une cuisine vide gracieusement", () => {
    const contexte: ContexteCuisine = { recettes: [], repasPrevus: [] };
    const res = formaterContexteCuisine(contexte);
    expect(res).toContain("Aucune recette enregistrée pour le moment.");
    expect(res).toContain("Aucun repas planifié.");
  });
});

describe("parserReponseMiamz", () => {
  const recettes = [
    { id: "rec-1", title: "Gratin de courgettes" },
    { id: "rec-2", title: "Curry de lentilles" },
  ];

  it("parse un JSON valide retourné par l'IA", () => {
    const json = JSON.stringify({
      reponse: "Je te conseille le Gratin de courgettes !",
      humeur: "motive",
      recetteTitre: "Gratin de courgettes",
    });

    const res = parserReponseMiamz(json, recettes);
    expect(res.reponse).toBe("Je te conseille le Gratin de courgettes !");
    expect(res.humeur).toBe("motive");
    expect(res.actions).toEqual([
      { label: "Voir la recette : Gratin de courgettes", lien: "/recettes" },
      { label: "Ouvrir le planning", lien: "/plan" },
    ]);
  });

  it("tolère du markdown autour du JSON", () => {
    const texte = `\`\`\`json\n{"reponse":"Miam !","humeur":"fete"}\n\`\`\``;
    const res = parserReponseMiamz(texte, recettes);
    expect(res.reponse).toBe("Miam !");
    expect(res.humeur).toBe("fete");
  });

  it("gère un texte brut non JSON en fallback", () => {
    const texte = "Bonjour Steve ! Que veux-tu cuisiner aujourd'hui ?";
    const res = parserReponseMiamz(texte, recettes);
    expect(res.reponse).toContain("Bonjour Steve");
    expect(res.humeur).toBe("content");
  });

  it("remplace null et les tableaux JSON par une phrase amicale", () => {
    for (const texte of ["null", "[]", "[1,2,3]"]) {
      const res = parserReponseMiamz(texte, recettes);
      expect(res.reponse).not.toBe("null");
      expect(res.reponse).not.toContain("[");
      expect(res.humeur).toBe("surpris");
    }
  });

  it("ignore une humeur non textuelle sans planter", () => {
    const res = parserReponseMiamz('{"reponse":"Miam !","humeur":42}', recettes);
    expect(res.reponse).toBe("Miam !");
    expect(res.humeur).toBe("content");
  });

  it("tolère des espaces avant les balises de code", () => {
    const texte = `\n  \`\`\`json\n{"reponse":"Ça marche !","humeur":"fier"}\n\`\`\`  \n`;
    const res = parserReponseMiamz(texte, recettes);
    expect(res.reponse).toBe("Ça marche !");
    expect(res.humeur).toBe("fier");
  });

  it("retire le gras markdown des bulles", () => {
    const res = parserReponseMiamz('{"reponse":"Essaie **le curry** ce soir !","humeur":"content"}', recettes);
    expect(res.reponse).toBe("Essaie le curry ce soir !");
  });

  it("détecte une recette citée sans champ recetteTitre", () => {
    const res = parserReponseMiamz(
      '{"reponse":"Je te propose le Curry de lentilles, c\'est parfait !","humeur":"motive"}',
      recettes
    );
    expect(res.actions?.[0]).toEqual({
      label: "Voir la recette : Curry de lentilles",
      lien: "/recettes",
    });
  });

  it("ne montre pas un JSON cassé", () => {
    const res = parserReponseMiamz('{"reponse":"Miam"', recettes);
    expect(res.reponse).toContain("reformuler");
    expect(res.humeur).toBe("surpris");
  });
});

describe("reponseCharmeLocal", () => {
  const contexte: ContexteCuisine = {
    recettes: [
      { id: "1", title: "Pâtes au pesto", minutes: 15, tags: ["rapide", "végé"], categorieNom: "Pâtes" },
      { id: "2", title: "Poulet rôti", minutes: 60, tags: ["familial"], categorieNom: "Viande" },
    ],
    repasPrevus: [],
  };

  it("répond chaleureusement à 'on mange quoi ce soir'", () => {
    const res = reponseCharmeLocal("On mange quoi ce soir ?", contexte);
    expect(res.reponse.length).toBeGreaterThan(10);
    expect(["motive", "content", "affame"]).toContain(res.humeur);
    expect(res.actions).toBeDefined();
  });

  it("filtre les recettes rapides si demandé", () => {
    const res = reponseCharmeLocal("une idée rapide en moins de 20 min ?", contexte);
    expect(res.reponse).toContain("Pâtes au pesto");
  });

  it("donne un conseil gentil quand il n'y a aucune recette", () => {
    const res = reponseCharmeLocal("On mange quoi ?", { recettes: [], repasPrevus: [] });
    expect(res.reponse).toContain("Tu n'as pas encore de recette");
    expect(res.humeur).toBe("taquin");
  });

  it("salue sans proposer un dîner", () => {
    const res = reponseCharmeLocal("Bonjour Miamz !", contexte);
    expect(res.reponse).toContain("Coucou");
    expect(res.actions).toBeUndefined();
  });

  it("préfère une recette rapide non déjà planifiée", () => {
    const ctx: ContexteCuisine = {
      recettes: [
        ...contexte.recettes,
        { id: "3", title: "Omelette express", minutes: 10, tags: ["rapide"] },
      ],
      repasPrevus: [{ dateIso: "2026-11-22", slot: "DINER", titre: "Pâtes au pesto" }],
    };
    const res = reponseCharmeLocal("une idée rapide en moins de 20 min ?", ctx);
    expect(res.reponse).toContain("Omelette express");
    expect(res.reponse).not.toContain("Pâtes au pesto");
  });

  it("est déterministe pour un même message", () => {
    const a = reponseCharmeLocal("On mange quoi ce soir ?", contexte);
    const b = reponseCharmeLocal("On mange quoi ce soir ?", contexte);
    expect(a).toEqual(b);
  });
});
