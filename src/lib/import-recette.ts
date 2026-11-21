/**
 * Utilitaires purs pour l'extraction et le parsing de recettes depuis le web.
 */

export type RecetteExtraite = {
  title: string;
  servings: number;
  minutes?: number;
  tags: string[];
  ingredients: { nom: string; quantite?: number; unite?: string }[];
  steps: string[];
};

/** Parse une durée ISO 8601 (PT30M, PT1H15M) ou un format textuel français (1h30, 25 min) en minutes. */
export function parseDureeIso(valeur: string): number | null {
  if (!valeur || typeof valeur !== "string") return null;
  const str = valeur.trim();
  if (!str) return null;

  // Format ISO 8601 (PT1H15M, PT45S, etc.)
  const isoMatch = str.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (isoMatch) {
    const heures = parseInt(isoMatch[1] || "0", 10);
    const minutes = parseInt(isoMatch[2] || "0", 10);
    const secondes = parseInt(isoMatch[3] || "0", 10);
    const total = heures * 60 + minutes + (secondes > 0 ? 1 : 0);
    return total > 0 ? total : null;
  }

  // Format type 1h30 ou 1h
  const hMatch = str.match(/(\d+)\s*h\s*(\d+)?/i);
  if (hMatch) {
    const h = parseInt(hMatch[1], 10);
    const m = hMatch[2] ? parseInt(hMatch[2], 10) : 0;
    return h * 60 + m;
  }

  // Format type 25 min ou 25 minutes
  const minMatch = str.match(/(\d+)\s*min/i);
  if (minMatch) {
    return parseInt(minMatch[1], 10);
  }

  // Nombre pur
  const numMatch = str.match(/^(\d+)$/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }

  return null;
}

/** Extrait et valide un nombre de portions (1 à 12, défaut 2). */
export function parseServings(valeur: unknown): number {
  if (typeof valeur === "number" && !isNaN(valeur)) {
    if (valeur <= 0) return 2;
    return Math.min(12, Math.max(1, Math.round(valeur)));
  }
  if (typeof valeur === "string") {
    const match = valeur.match(/\d+/);
    if (match) {
      const n = parseInt(match[0], 10);
      if (n <= 0) return 2;
      return Math.min(12, Math.max(1, n));
    }
  }
  return 2;
}

/** Découpe une ligne d'ingrédient brute ("250 g de farine", "3 oeufs") en nom, quantité et unité. */
export function parseLigneIngredient(texte: string): { nom: string; quantite?: number; unite?: string } {
  const propre = texte.trim().replace(/\s+/g, " ");
  if (!propre) return { nom: "" };

  // Regex pour détecter une quantité au début (ex. 250, 1.5, 1,5, 1/2)
  const pattern = /^(\d+(?:[.,]\d+)?|\d+\/\d+)\s*(g|kg|ml|cl|l|c\.\s*à\s*soupe|cuillères?\s*à\s*soupe|c\.\s*à\s*café|cuillères?\s*à\s*café|pincée|tranches?|gousses?|boîtes?|pots?|morceaux?)?(?:\s+(?:de|d'|d’))?\s+(.+)$/i;
  const match = propre.match(pattern);

  if (match) {
    let qteStr = match[1].replace(",", ".");
    let qte: number;
    if (qteStr.includes("/")) {
      const [num, den] = qteStr.split("/").map(Number);
      qte = den ? num / den : 1;
    } else {
      qte = parseFloat(qteStr);
    }

    let unite = match[2]?.trim().toLowerCase();
    if (unite) {
      if (unite.startsWith("c. à soupe") || unite.startsWith("cuillère à soupe") || unite.startsWith("cuillere à soupe")) {
        unite = "c. à soupe";
      } else if (unite.startsWith("c. à café") || unite.startsWith("cuillère à café") || unite.startsWith("cuillere à café")) {
        unite = "c. à café";
      }
    }

    let nom = match[3].trim();
    // Nettoyer un éventuel résidu "de " / "d'" / "d’"
    nom = nom.replace(/^(?:de\s+|d['’])/i, "").trim();

    return {
      nom,
      quantite: isNaN(qte) ? undefined : qte,
      unite: unite || "pièce",
    };
  }

  // Cas spécial pour un nombre suivi directement d'un aliment (ex: "3 oeufs")
  const simpleCount = propre.match(/^(\d+)\s+([a-zA-ZÀ-ÿ\s'-]+)$/);
  if (simpleCount) {
    const qte = parseInt(simpleCount[1], 10);
    const nom = simpleCount[2].trim();
    return {
      nom,
      quantite: qte,
      unite: "pièce",
    };
  }

  return { nom: propre };
}

/** Vérifie si une URL est sûre pour une requête sortante (anti-SSRF). */
export function estUrlSecurisee(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();

    // Rejet localhost, loopback, private IP ranges
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "[::1]" ||
      host.endsWith(".local") ||
      host.endsWith(".internal")
    ) {
      return false;
    }

    // IP privée IPv4
    if (/^(?:10\.|192\.168\.|172\.(?:1[6-9]|2[0-9]|3[0-1])\.|169\.254\.)/.test(host)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/** Extrait une recette depuis les balises JSON-LD schema.org/Recipe d'un document HTML. */
export function extraireJsonLdRecipe(html: string): RecetteExtraite | null {
  const scriptRegex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const content = match[1].trim();
      const parsed = JSON.parse(content);

      const items = Array.isArray(parsed)
        ? parsed
        : parsed["@graph"] && Array.isArray(parsed["@graph"])
        ? parsed["@graph"]
        : [parsed];

      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const type = item["@type"];
        const isRecipe =
          type === "Recipe" ||
          (Array.isArray(type) && type.includes("Recipe"));

        if (isRecipe) {
          const title = (item.name || item.headline || "").toString().trim();
          if (!title) continue;

          const servings = parseServings(item.recipeYield);
          const rawMinutes = item.totalTime || item.cookTime || item.prepTime;
          const minutes = rawMinutes ? parseDureeIso(rawMinutes.toString()) ?? undefined : undefined;

          // Ingrédients
          const rawIngredients: string[] = Array.isArray(item.recipeIngredient)
            ? item.recipeIngredient
            : Array.isArray(item.ingredients)
            ? item.ingredients
            : [];
          const ingredients = rawIngredients
            .map((i) => (typeof i === "string" ? parseLigneIngredient(i) : null))
            .filter((i): i is { nom: string; quantite?: number; unite?: string } => Boolean(i && i.nom));

          // Étapes
          const rawSteps = item.recipeInstructions;
          let steps: string[] = [];
          if (Array.isArray(rawSteps)) {
            for (const step of rawSteps) {
              if (typeof step === "string") {
                steps.push(step.trim());
              } else if (step && typeof step === "object") {
                if (typeof step.text === "string") {
                  steps.push(step.text.trim());
                } else if (typeof step.name === "string") {
                  steps.push(step.name.trim());
                }
              }
            }
          } else if (typeof rawSteps === "string") {
            steps = rawSteps.split("\n").map((s) => s.trim()).filter(Boolean);
          }

          // Tags / mots-clés
          const tags: string[] = [];
          if (typeof item.keywords === "string") {
            tags.push(...item.keywords.split(",").map((k: string) => k.trim()).filter(Boolean));
          } else if (Array.isArray(item.keywords)) {
            tags.push(...item.keywords.map((k: unknown) => String(k).trim()).filter(Boolean));
          }
          if (typeof item.recipeCategory === "string") {
            tags.push(item.recipeCategory.trim());
          }

          return {
            title,
            servings,
            minutes,
            tags: [...new Set(tags)],
            ingredients,
            steps: steps.filter(Boolean),
          };
        }
      }
    } catch {
      // JSON invalide dans ce script, on continue vers le suivant
    }
  }

  return null;
}
