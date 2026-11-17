import { describe, it, expect } from "vitest";
import { reconcilerListe, type LigneExistante } from "@/lib/reconciliation-courses";

describe("reconcilerListe", () => {
  it("crée les clés absentes de la base", () => {
    const plan = reconcilerListe([], [{ nom: "Carottes", quantite: 400, unite: "g", rayon: "Legumes" }]);
    expect(plan.aCreer).toEqual([{ nom: "Carottes", quantite: 400, unite: "g", rayon: "Legumes" }]);
    expect(plan.aMettreAJour).toEqual([]);
    expect(plan.aSupprimer).toEqual([]);
  });

  it("met à jour quantité et rayon d'une ligne PLAN existante, sans toucher checked/masquee", () => {
    const plan = reconcilerListe(
      [
        {
          id: "a",
          nom: "carottes",
          quantite: 200,
          unite: "g",
          rayon: "Legumes",
          checked: true,
          masquee: false,
          source: "PLAN",
        },
      ],
      [{ nom: "carottes", quantite: 400, unite: "g", rayon: "Legumes" }],
    );
    // exactement ces 3 clés : checked/masquee/nom ne font pas partie de la mise à jour
    expect(plan.aMettreAJour).toEqual([{ id: "a", quantite: 400, rayon: "Legumes" }]);
    expect(plan.aCreer).toEqual([]);
    expect(plan.aSupprimer).toEqual([]);
  });

  it("supprime les lignes PLAN dont la clé a disparu (masquée ou non)", () => {
    const plan = reconcilerListe(
      [
        {
          id: "b",
          nom: "courgettes",
          quantite: 300,
          unite: "g",
          rayon: "Legumes",
          checked: false,
          masquee: false,
          source: "PLAN",
        },
        {
          id: "c",
          nom: "crevettes",
          quantite: 200,
          unite: "g",
          rayon: "Épicerie",
          checked: false,
          masquee: true,
          source: "PLAN",
        },
      ],
      [],
    );
    expect(plan.aSupprimer).toEqual(["b", "c"]);
    expect(plan.aCreer).toEqual([]);
    expect(plan.aMettreAJour).toEqual([]);
  });

  it("ligne PLAN masquée toujours projetée → mise à jour, pas de suppression", () => {
    const plan = reconcilerListe(
      [
        {
          id: "c",
          nom: "crevettes",
          quantite: 200,
          unite: "g",
          rayon: "Épicerie",
          checked: false,
          masquee: true,
          source: "PLAN",
        },
      ],
      [{ nom: "crevettes", quantite: 500, unite: "g", rayon: "Épicerie" }],
    );
    expect(plan.aMettreAJour).toEqual([{ id: "c", quantite: 500, rayon: "Épicerie" }]);
    expect(plan.aSupprimer).toEqual([]);
  });

  it("bouclier : une ligne MANUELLE couvre sa clé", () => {
    const plan = reconcilerListe(
      [
        {
          id: "m",
          nom: "sucre",
          quantite: 100,
          unite: "g",
          rayon: "Épicerie",
          checked: false,
          masquee: false,
          source: "MANUEL",
        },
      ],
      [{ nom: "sucre", quantite: 500, unite: "g", rayon: "Épicerie" }],
    );
    expect(plan.aCreer).toEqual([]);
    expect(plan.aMettreAJour).toEqual([]);
    expect(plan.aSupprimer).toEqual([]);
  });

  it("décrémente puis purge un ingrédient partagé", () => {
    const base: LigneExistante[] = [
      {
        id: "b",
        nom: "beurre",
        quantite: 500,
        unite: "g",
        rayon: "Épicerie",
        checked: false,
        masquee: false,
        source: "PLAN",
      },
    ];

    // la projection recalculée ne compte plus que 200 g → décrément
    const plan1 = reconcilerListe(base, [{ nom: "beurre", quantite: 200, unite: "g", rayon: "Épicerie" }]);
    expect(plan1.aMettreAJour).toEqual([{ id: "b", quantite: 200, rayon: "Épicerie" }]);
    expect(plan1.aSupprimer).toEqual([]);

    // la base a appliqué la mise à jour, puis la projection retombe à zéro (clé absente) → purge
    base[0].quantite = 200;
    const plan2 = reconcilerListe(base, []);
    expect(plan2.aSupprimer).toEqual(["b"]);
    expect(plan2.aCreer).toEqual([]);
    expect(plan2.aMettreAJour).toEqual([]);
  });

  it("quantité null (pincée) : null vers null inchangé, null vers valeur mise à jour", () => {
    const plan = reconcilerListe(
      [
        {
          id: "s",
          nom: "sel",
          quantite: null,
          unite: "pincée",
          rayon: "Épicerie",
          checked: false,
          masquee: false,
          source: "PLAN",
        },
        {
          id: "p",
          nom: "poivre",
          quantite: null,
          unite: "pincée",
          rayon: "Épicerie",
          checked: false,
          masquee: false,
          source: "PLAN",
        },
      ],
      [
        { nom: "sel", quantite: null, unite: "pincée", rayon: "Épicerie" },
        { nom: "poivre", quantite: 2, unite: "pincée", rayon: "Épicerie" },
      ],
    );
    expect(plan.aMettreAJour).toEqual([{ id: "p", quantite: 2, rayon: "Épicerie" }]);
    expect(plan.aCreer).toEqual([]);
    expect(plan.aSupprimer).toEqual([]);
  });

  it('casse : "Carotte" en base, "carotte" projeté → même clé, mise à jour, nom de la base inchangé', () => {
    const plan = reconcilerListe(
      [
        {
          id: "a",
          nom: "Carotte",
          quantite: 200,
          unite: "g",
          rayon: "Legumes",
          checked: false,
          masquee: false,
          source: "PLAN",
        },
      ],
      [{ nom: "carotte", quantite: 400, unite: "g", rayon: "Legumes" }],
    );
    // la clé de fusion ignore la casse : pas de création en doublon, nom de la base préservé
    expect(plan.aMettreAJour).toEqual([{ id: "a", quantite: 400, rayon: "Legumes" }]);
    expect(plan.aCreer).toEqual([]);
  });

  it("lignes MANUELLES jamais dans aSupprimer ni aMettreAJour, même clé absente de la projection", () => {
    const plan = reconcilerListe(
      [
        {
          id: "m",
          nom: "sucre",
          quantite: 100,
          unite: "g",
          rayon: "Épicerie",
          checked: false,
          masquee: false,
          source: "MANUEL",
        },
        {
          id: "b",
          nom: "farine",
          quantite: 250,
          unite: "g",
          rayon: "Épicerie",
          checked: false,
          masquee: false,
          source: "PLAN",
        },
      ],
      [],
    );
    expect(plan.aSupprimer).toEqual(["b"]);
    expect(plan.aMettreAJour).toEqual([]);
  });
});
