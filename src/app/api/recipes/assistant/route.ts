import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { demanderReponseIa } from "@/lib/openrouter";
import { ideeValide, parserRecetteGeneree, MAX_IDEE } from "@/lib/creation-recette";
import { phraseProfil } from "@/lib/profil";

const DELAI_IA_MS = 9000;

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const idee = typeof body?.idee === "string" ? body.idee.trim() : "";

  if (!ideeValide(idee)) {
    return NextResponse.json(
      { error: `Décris ton idée en quelques mots (${MAX_IDEE} caractères max).` },
      { status: 400 }
    );
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { householdSize: true, goal: true },
  });

  const profil = { householdSize: user?.householdSize ?? 1, goal: user?.goal ?? "equilibre" };

  const systemPrompt = `Tu es Miamz, petit chef kawaii. À partir de l'idée de l'utilisateur, écris un brouillon de recette complet en français.
Réponds EXCLUSIVEMENT avec un objet JSON valide (aucun markdown, aucun commentaire), au format :
{
  "title": "Nom de la recette",
  "servings": 4,
  "minutes": 35,
  "tags": ["végé", "rapide"],
  "ingredients": [
    { "nom": "courgettes", "quantite": 3, "unite": "pièce" },
    { "nom": "fromage râpé", "quantite": 50, "unite": "g" }
  ],
  "steps": [
    "Préchauffer le four à 180°C.",
    "Disposer les courgettes dans un plat.",
    "Enfourner 30 minutes."
  ]
}
Règles :
- "servings" : entier 1–12 (pense au foyer de l'utilisateur).
- "minutes" : entier positif en minutes (optionnel).
- 3 à 8 ingrédients, chacun avec "nom" (requis), "quantite" (nombre > 0, optionnel), "unite" (optionnel : g, kg, ml, cl, l, pièce, boîte, c. à soupe, c. à café...).
- 3 à 8 étapes, phrases complètes.
- Quantités réalistes pour le nombre de portions.
- Adapte-toi au profil : ${phraseProfil(profil)}.`;

  const contenu = await demanderReponseIa(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: idee },
    ],
    { maxTokens: 900, temperature: 0.7, timeoutMs: DELAI_IA_MS }
  );

  if (!contenu) {
    return NextResponse.json({ error: "Miamz n'a pas pu écrire cette recette — réessaie." }, { status: 422 });
  }

  const recette = parserRecetteGeneree(contenu);
  if (!recette) {
    return NextResponse.json({ error: "Miamz n'a pas pu écrire cette recette — réessaie." }, { status: 422 });
  }

  return NextResponse.json({ recette });
}