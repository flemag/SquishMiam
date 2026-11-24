import { describe, it, expect } from "vitest";
import {
  parseDureeIso,
  parseServings,
  parseLigneIngredient,
  extraireJsonLdRecipe,
  estUrlSecurisee,
} from "@/lib/import-recette";

describe("parseDureeIso", () => {
  it("parse les durées ISO 8601 (PT30M, PT1H15M, PT2H)", () => {
    expect(parseDureeIso("PT30M")).toBe(30);
    expect(parseDureeIso("PT1H15M")).toBe(75);
    expect(parseDureeIso("PT2H")).toBe(120);
    expect(parseDureeIso("PT45S")).toBe(1); // arrondi au moins 1 min si non nul
  });

  it("parse les durées exprimées en texte classique", () => {
    expect(parseDureeIso("25 min")).toBe(25);
    expect(parseDureeIso("1h30")).toBe(90);
    expect(parseDureeIso("40")).toBe(40);
  });

  it("retourne null si la durée est vide ou invalide", () => {
    expect(parseDureeIso("")).toBeNull();
    expect(parseDureeIso("inconnu")).toBeNull();
  });
});

describe("parseServings", () => {
  it("extrait les nombres depuis du texte ou des nombres", () => {
    expect(parseServings(4)).toBe(4);
    expect(parseServings("4")).toBe(4);
    expect(parseServings("Pour 6 personnes")).toBe(6);
    expect(parseServings("8 parts")).toBe(8);
  });

  it("borne entre 1 et 12 avec défaut à 1", () => {
    expect(parseServings("0")).toBe(1);
    expect(parseServings("50")).toBe(12);
    expect(parseServings("invalide")).toBe(1);
    expect(parseServings(undefined)).toBe(1);
  });
});

describe("parseLigneIngredient", () => {
  it("parse quantité, unité et nom pour des formats standards", () => {
    expect(parseLigneIngredient("250 g de farine de blé")).toEqual({
      nom: "farine de blé",
      quantite: 250,
      unite: "g",
    });
    expect(parseLigneIngredient("2 c. à soupe d'huile d'olive")).toEqual({
      nom: "huile d'olive",
      quantite: 2,
      unite: "c. à soupe",
    });
    expect(parseLigneIngredient("500ml de lait")).toEqual({
      nom: "lait",
      quantite: 500,
      unite: "ml",
    });
    expect(parseLigneIngredient("3 oeufs")).toEqual({
      nom: "oeufs",
      quantite: 3,
      unite: "pièce",
    });
  });

  it("gère les ingrédients sans quantité ou unité", () => {
    expect(parseLigneIngredient("Sel et poivre")).toEqual({
      nom: "Sel et poivre",
    });
  });
});

describe("estUrlSecurisee", () => {
  it("autorise les URLs web valides http et https publiques", () => {
    expect(estUrlSecurisee("https://www.marmiton.org/recettes/recette_123.aspx")).toBe(true);
    expect(estUrlSecurisee("http://monblog.fr/recette")).toBe(true);
  });

  it("rejette les protocoles non http/https", () => {
    expect(estUrlSecurisee("ftp://example.com")).toBe(false);
    expect(estUrlSecurisee("file:///etc/passwd")).toBe(false);
    expect(estUrlSecurisee("javascript:alert(1)")).toBe(false);
  });

  it("rejette les adresses locales, privées et loopback (anti-SSRF)", () => {
    expect(estUrlSecurisee("http://localhost:3000")).toBe(false);
    expect(estUrlSecurisee("http://127.0.0.1:8080")).toBe(false);
    expect(estUrlSecurisee("http://192.168.1.1/admin")).toBe(false);
    expect(estUrlSecurisee("http://10.0.0.5")).toBe(false);
    expect(estUrlSecurisee("http://172.16.0.1")).toBe(false);
    expect(estUrlSecurisee("http://[::1]")).toBe(false);
  });
});

describe("extraireJsonLdRecipe", () => {
  it("extrait correctement une recette schema.org simple", () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Recipe",
            "name": "Tarte aux pommes",
            "recipeYield": "6 personnes",
            "totalTime": "PT45M",
            "recipeIngredient": [
              "200g de pâte feuilletée",
              "4 pommes golden",
              "2 cuillères à soupe de sucre"
            ],
            "recipeInstructions": [
              { "@type": "HowToStep", "text": "Éplucher les pommes et les couper en lamelles." },
              { "@type": "HowToStep", "text": "Disposer sur la pâte et enfourner 30 minutes." }
            ],
            "keywords": "dessert, tarte, facile"
          }
          </script>
        </head>
      </html>
    `;

    const res = extraireJsonLdRecipe(html);
    expect(res).not.toBeNull();
    expect(res?.title).toBe("Tarte aux pommes");
    expect(res?.servings).toBe(6);
    expect(res?.minutes).toBe(45);
    expect(res?.ingredients).toHaveLength(3);
    expect(res?.ingredients[0]).toEqual({ nom: "pâte feuilletée", quantite: 200, unite: "g" });
    expect(res?.steps).toEqual([
      "Éplucher les pommes et les couper en lamelles.",
      "Disposer sur la pâte et enfourner 30 minutes.",
    ]);
    expect(res?.tags).toContain("dessert");
  });

  it("extrait une recette imbriquée dans un @graph", () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@graph": [
              { "@type": "WebSite", "name": "Mon Site" },
              {
                "@type": "Recipe",
                "name": "Pâtes au pesto",
                "recipeYield": "2",
                "cookTime": "PT15M",
                "recipeIngredient": ["200 g de pennes", "50 g de parmesan"],
                "recipeInstructions": ["Cuire les pâtes.", "Ajouter le pesto."]
              }
            ]
          }
          </script>
        </head>
      </html>
    `;

    const res = extraireJsonLdRecipe(html);
    expect(res).not.toBeNull();
    expect(res?.title).toBe("Pâtes au pesto");
    expect(res?.servings).toBe(2);
    expect(res?.minutes).toBe(15);
  });

  it("renvoie null si aucun JSON-LD de recette n'est présent", () => {
    const html = `<html><body><h1>Bienvenue sur mon site</h1></body></html>`;
    expect(extraireJsonLdRecipe(html)).toBeNull();
  });
});
