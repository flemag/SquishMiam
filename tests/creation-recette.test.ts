import { describe, it, expect } from "vitest";
import { ideeValide, parserRecetteGeneree, MAX_IDEE } from "@/lib/creation-recette";

describe("ideeValide", () => {
  it("accepte une idée courte et refuse vide ou trop longue", () => {
    expect(ideeValide("gratin de courgettes")).toBe(true);
    expect(ideeValide("   ")).toBe(false);
    expect(ideeValide("x".repeat(MAX_IDEE + 1))).toBe(false);
  });
});

describe("parserRecetteGeneree", () => {
  it("lit un brouillon JSON valide", () => {
    const r = parserRecetteGeneree(
      JSON.stringify({
        title: "Gratin de courgettes",
        servings: 4,
        minutes: 35,
        tags: ["végé", "rapide"],
        ingredients: [{ nom: "courgettes", quantite: 3, unite: "pièce" }],
        steps: ["Préchauffer le four.", "Enfourner 30 min."],
      })
    );
    expect(r?.title).toBe("Gratin de courgettes");
    expect(r?.servings).toBe(4);
    expect(r?.minutes).toBe(35);
    expect(r?.ingredients).toHaveLength(1);
    expect(r?.steps).toHaveLength(2);
  });

  it("accepte un bloc ```json et nettoie les champs", () => {
    const r = parserRecetteGeneree(
      '```json\n{"title":"Tarte","servings":99,"tags":["  ","végé"],"ingredients":[{"nom":"pomme"}],"steps":["Mélanger."]}\n```'
    );
    expect(r?.servings).toBe(12);
    expect(r?.tags).toEqual(["végé"]);
    expect(r?.minutes).toBeUndefined();
  });

  it("renvoie null si la réponse est inexploitable", () => {
    expect(parserRecetteGeneree("pas du json")).toBeNull();
    expect(parserRecetteGeneree("null")).toBeNull();
    expect(parserRecetteGeneree('{"title":"","ingredients":[]}')).toBeNull();
    expect(parserRecetteGeneree('{"title":"Tarte"}')).toBeNull();
  });
});