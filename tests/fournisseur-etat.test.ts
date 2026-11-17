import { describe, it, expect } from "vitest";
import { prochainEtat } from "@/components/miamz/fournisseur-etat";

const initial = {
  repasSemaine: 3,
  dernierEvenement: null,
  dernierEvenementHorodatage: null,
  semaineCompleteEmise: false,
};

describe("prochainEtat", () => {
  it("incrémente les repas et horodate le dernier événement", () => {
    const etat = prochainEtat(initial, "repas-planifie", new Date(2026, 0, 15, 12, 0));
    expect(etat.repasSemaine).toBe(4);
    expect(etat.dernierEvenement?.type).toBe("repas-planifie");
    expect(etat.dernierEvenement?.ilYAms).toBe(0);
    expect(etat.dernierEvenementHorodatage).toBe(new Date(2026, 0, 15, 12, 0).getTime());
  });

  it("décrémente les repas sans passer sous zéro", () => {
    const etat = prochainEtat({ ...initial, repasSemaine: 0 }, "repas-retire", new Date());
    expect(etat.repasSemaine).toBe(0);
    expect(etat.dernierEvenement?.type).toBe("repas-retire");
  });

  it("course-cochee et recette-creee ne touchent pas au compteur", () => {
    const course = prochainEtat(initial, "course-cochee", new Date());
    expect(course.repasSemaine).toBe(3);
    expect(course.dernierEvenement?.type).toBe("course-cochee");
    const recette = prochainEtat(initial, "recette-creee", new Date());
    expect(recette.repasSemaine).toBe(3);
    expect(recette.dernierEvenement?.type).toBe("recette-creee");
  });

  it("émet semaine-complete une seule fois quand la semaine est pleine (3 services × 7 jours = 21)", () => {
    // 3 services par jour désormais : pas d'émission à l'ancien seuil de 14…
    const quatorze = prochainEtat(
      { ...initial, repasSemaine: 13 },
      "repas-planifie",
      new Date()
    );
    expect(quatorze.dernierEvenement?.type).toBe("repas-planifie");
    expect(quatorze.semaineCompleteEmise).toBe(false);
    // …mais émission au 21e repas.
    const premier = prochainEtat(
      { ...initial, repasSemaine: 20 },
      "repas-planifie",
      new Date()
    );
    expect(premier.repasSemaine).toBe(21);
    expect(premier.dernierEvenement?.type).toBe("semaine-complete");
    expect(premier.semaineCompleteEmise).toBe(true);
    const apres = prochainEtat(premier, "repas-retire", new Date());
    const retour = prochainEtat(apres, "repas-planifie", new Date());
    expect(retour.dernierEvenement?.type).toBe("repas-planifie"); // pas de re-émission
  });
});
