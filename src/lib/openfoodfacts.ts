import type { NutritionPar100g } from "@/lib/nutrition";
import { normaliserNomIngredient } from "@/lib/nutrition";

const TIMEOUT_MS = 5000;

/**
 * Cherche les données nutritionnelles d'un ingrédient dans Open Food Facts.
 * Retourne null si introuvable ou en cas d'erreur.
 */
export async function chercherNutrition(nom: string): Promise<NutritionPar100g | null> {
  const terme = normaliserNomIngredient(nom);
  if (!terme) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(terme)}&json=1&page_size=3&fields=nutriments`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    const products = data?.products;
    if (!Array.isArray(products) || products.length === 0) return null;

    // Prendre le premier produit avec des données nutritionnelles
    for (const product of products) {
      const nutriments = product?.nutriments;
      if (!nutriments) continue;

      const calories = typeof nutriments["energy-kcal_100g"] === "number" ? nutriments["energy-kcal_100g"] : null;
      const proteines = typeof nutriments["proteins_100g"] === "number" ? nutriments["proteins_100g"] : null;
      const glucides = typeof nutriments["carbohydrates_100g"] === "number" ? nutriments["carbohydrates_100g"] : null;
      const lipides = typeof nutriments["fat_100g"] === "number" ? nutriments["fat_100g"] : null;

      if (calories !== null || proteines !== null || glucides !== null || lipides !== null) {
        return {
          calories: calories ?? 0,
          proteines: proteines ?? 0,
          glucides: glucides ?? 0,
          lipides: lipides ?? 0,
        };
      }
    }

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}