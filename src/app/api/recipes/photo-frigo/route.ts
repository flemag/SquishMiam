import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { demanderReponseVision } from "@/lib/openrouter";
import { parserPhotoFrigo, matcherRecettes } from "@/lib/photo-frigo";
import { phraseProfil } from "@/lib/profil";

const DELAI_IA_MS = 15000;

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const image = typeof body?.image === "string" ? body.image : "";

  if (!image) {
    return NextResponse.json({ error: "Image requise" }, { status: 400 });
  }

  // Limite de taille : ~2 Mo en base64
  if (image.length > 2 * 1024 * 1024 * 1.4) {
    return NextResponse.json({ error: "Image trop grande (2 Mo max)" }, { status: 400 });
  }

  // Charger les recettes de l'utilisateur
  const recipes = await db.recipe.findMany({
    where: { createdById: userId },
    select: {
      id: true,
      title: true,
      ingredients: true,
    },
  });

  const recettes = recipes.map((r) => ({
    id: r.id,
    title: r.title,
    ingredients: Array.isArray(r.ingredients)
      ? (r.ingredients as { nom: string }[]).filter((i) => i && typeof i.nom === "string")
      : [],
  }));

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { householdSize: true, goal: true },
  });

  const profil = { householdSize: user?.householdSize ?? 1, goal: user?.goal ?? "equilibre" };

  const systemPrompt = `Tu es Miamz, petit chef kawaii. Analyse cette photo de frigo et identifie les ingrédients visibles.
Réponds EXCLUSIVEMENT avec un objet JSON valide (aucun markdown, aucun commentaire), au format :
{
  "ingredients": ["courgettes", "fromage", "œufs", "lait"],
  "brouillon": {
    "title": "Nom de la recette",
    "servings": 2,
    "minutes": 30,
    "tags": ["végé"],
    "ingredients": [{ "nom": "courgettes", "quantite": 2, "unite": "pièce" }],
    "steps": ["Préchauffer le four.", "Enfourner 25 min."]
  }
}
Règles :
- "ingredients" : liste des ingrédients visibles dans le frigo (noms simples, en français).
- "brouillon" : optionnel. Si tu as assez d'ingrédients pour proposer une recette, remplis-le. Sinon, mets null.
- Le brouillon doit utiliser les ingrédients détectés.
- Adapte-toi au profil : ${phraseProfil(profil)}.`;

  const contenu = await demanderReponseVision(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: "Voici la photo de mon frigo. Quels ingrédients vois-tu ?" },
    ],
    image,
    { maxTokens: 1200, temperature: 0.5, timeoutMs: DELAI_IA_MS }
  );

  if (!contenu) {
    return NextResponse.json({ error: "Miamz n'a pas réussi à lire ton frigo — réessaie." }, { status: 422 });
  }

  const parsed = parserPhotoFrigo(contenu);
  if (!parsed) {
    return NextResponse.json({ error: "Miamz n'a pas réussi à lire ton frigo — réessaie." }, { status: 422 });
  }

  const recettesMatchees = matcherRecettes(parsed.ingredients, recettes);

  return NextResponse.json({
    ingredients: parsed.ingredients,
    recettesMatchees,
    brouillon: parsed.brouillon ?? null,
  });
}