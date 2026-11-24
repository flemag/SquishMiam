import type { RecetteExtraite } from "@/lib/import-recette";

/**
 * Modèles gratuits actifs sur OpenRouter (vérifiés le 2026-11-22). Les
 * identifiants `:free` disparaissent ou saturent régulièrement : on les essaie
 * dans l'ordre et on renvoie `null` si aucun ne répond utilisablement.
 */
export const MODELES_GRATUITS = [
  "particle-ai/particle-1:free",
  "baidu/ernie-5.5-flash-preview:free",
];

/**
 * Modèles gratuits avec capacité vision sur OpenRouter.
 * Essayés dans l'ordre ; le premier qui répond utilisablement l'emporte.
 */
export const MODELES_VISION = [
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.2-11b-vision-instruct:free",
  "qwen/qwen-2-vl-7b-instruct:free",
];

/**
 * Demande une réponse texte à OpenRouter en essayant les modèles gratuits dans
 * l'ordre, sous un délai global. Renvoie `null` sans clé, quota épuisé,
 * réponse vide ou délai dépassé : l'appelant décide du repli.
 */
export async function demanderReponseIa(
  messages: { role: string; content: string }[],
  {
    maxTokens = 700,
    temperature = 0.7,
    timeoutMs = 8000,
  }: { maxTokens?: number; temperature?: number; timeoutMs?: number } = {}
): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    for (const modele of MODELES_GRATUITS) {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://squishmiam.vercel.app",
          "X-Title": "SquishMiam",
        },
        body: JSON.stringify({
          model: modele,
          messages,
          temperature,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      if (!res.ok) continue;

      const data = await res.json().catch(() => null);
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content === "string" && content.trim()) {
        return content;
      }
    }

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Demande une réponse à un modèle vision en essayant les modèles gratuits
 * dans l'ordre, sous un délai global. L'image est envoyée en base64 (data URL).
 * Renvoie null sans clé, quota épuisé, réponse vide ou délai dépassé.
 */
export async function demanderReponseVision(
  messages: { role: string; content: string }[],
  imageBase64: string,
  {
    maxTokens = 1200,
    temperature = 0.5,
    timeoutMs = 15000,
  }: { maxTokens?: number; temperature?: number; timeoutMs?: number } = {}
): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Construire le message utilisateur avec l'image
    const userMessage = {
      role: "user",
      content: [
        { type: "text", text: messages[messages.length - 1]?.content ?? "" },
        { type: "image_url", image_url: { url: imageBase64 } },
      ],
    };

    const systemMessages = messages.filter((m) => m.role !== "user").map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const payload = [...systemMessages, userMessage];

    for (const modele of MODELES_VISION) {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://squishmiam.vercel.app",
          "X-Title": "SquishMiam",
        },
        body: JSON.stringify({
          model: modele,
          messages: payload,
          temperature,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      if (!res.ok) continue;

      const data = await res.json().catch(() => null);
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content === "string" && content.trim()) {
        return content;
      }
    }

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Nettoie le HTML brut pour n'en garder que le texte utile (titres, paragraphes, listes),
 * et limite la taille pour être ultra-économique en tokens d'API.
 */
function epurerHtmlPourIa(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 5000); // 5000 caractères max ≈ 1200 tokens max
}

/**
 * Tente d'extraire une recette structurée depuis le contenu d'une page
 * en utilisant un modèle gratuit via l'API OpenRouter (Fallback Niveau 2).
 */
export async function extraireRecetteParIa(html: string): Promise<RecetteExtraite | null> {
  const texteEpure = epurerHtmlPourIa(html);
  if (texteEpure.length < 50) {
    return null;
  }

  const systemPrompt = `Tu es un assistant culinaire expert. Ton rôle est d'extraire la recette de cuisine présente dans le texte fourni et de répondre EXCLUSIVEMENT avec un objet JSON valide (aucun markdown, aucun commentaire, uniquement le JSON brut).

Format JSON attendu :
{
  "title": "Nom de la recette",
  "servings": 4,
  "minutes": 30,
  "tags": ["tag1", "tag2"],
  "ingredients": [
    { "nom": "farine de blé", "quantite": 250, "unite": "g" },
    { "nom": "oeufs", "quantite": 3, "unite": "pièce" }
  ],
  "steps": [
    "Première étape",
    "Deuxième étape"
  ]
}

Règles :
- "servings" doit être un entier entre 1 et 12 (défaut: 1).
- "minutes" doit être un nombre entier représentant le temps total en minutes (optionnel).
- "ingredients" : chaque élément DOIT avoir au moins "nom". "quantite" est un nombre positif si précisé. "unite" est une unité (g, kg, ml, cl, l, pièce, boîte, c. à soupe, c. à café...).
- "steps" : liste ordonnée des étapes de préparation sous forme de chaînes de caractères.
- Si le texte ne contient aucune recette culinaire, réponds uniquement avec : null`;

  const content = await demanderReponseIa(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Voici le contenu de la page web :\n\n${texteEpure}` },
    ],
    { maxTokens: 1200, temperature: 0.1, timeoutMs: 9000 }
  );

  if (!content) {
    return null;
  }

  try {
    // Nettoyer les éventuels blocs ```json ... ```
    const jsonPropre = content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    if (jsonPropre === "null") {
      return null;
    }

    const parsed = JSON.parse(jsonPropre);
    if (!parsed || typeof parsed !== "object" || !parsed.title || !Array.isArray(parsed.ingredients)) {
      return null;
    }

    return {
      title: String(parsed.title).trim(),
      servings: typeof parsed.servings === "number" ? Math.min(12, Math.max(1, Math.round(parsed.servings))) : 1,
      minutes: typeof parsed.minutes === "number" && parsed.minutes > 0 ? Math.round(parsed.minutes) : undefined,
      tags: Array.isArray(parsed.tags) ? parsed.tags.map((t: unknown) => String(t).trim()).filter(Boolean) : [],
      ingredients: (parsed.ingredients as Array<{ nom?: unknown; quantite?: unknown; unite?: unknown }>)
        .filter((i) => i && typeof i.nom === "string" && i.nom.trim())
        .map((i) => ({
          nom: String(i.nom).trim(),
          quantite: typeof i.quantite === "number" && i.quantite > 0 ? i.quantite : undefined,
          unite: typeof i.unite === "string" && i.unite.trim() ? i.unite.trim() : undefined,
        })),
      steps: Array.isArray(parsed.steps) ? parsed.steps.map((s: unknown) => String(s).trim()).filter(Boolean) : [],
    };
  } catch {
    return null;
  }
}
