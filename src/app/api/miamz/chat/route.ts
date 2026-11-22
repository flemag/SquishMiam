import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateIso, weekStart } from "@/lib/plan";
import {
  formaterContexteCuisine,
  parserReponseMiamz,
  reponseCharmeLocal,
  type ContexteCuisine,
} from "@/lib/chat-miamz";

// Modèle gratuit actif sur OpenRouter (vérifié le 2026-11-22). Les anciens
// identifiants `:free` disparaissent régulièrement : le repli local couvre
// l'indisponibilité, mais garder cet identifiant à jour évite de perdre l'IA.
const MODELE = "google/gemma-4-31b-it:free";
const MESSAGE_MAX = 500;

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const historique = Array.isArray(body?.historique) ? body.historique : [];

  if (!message) {
    return NextResponse.json({ error: "Message requis" }, { status: 400 });
  }
  if (message.length > MESSAGE_MAX) {
    return NextResponse.json(
      { error: `Message trop long (${MESSAGE_MAX} caractères max)` },
      { status: 400 }
    );
  }

  // Charger le contexte réel de l'utilisateur
  const now = new Date();
  const debutSemaine = weekStart(now);
  const finSemaine = new Date(debutSemaine);
  finSemaine.setUTCDate(finSemaine.getUTCDate() + 7);

  const [recipes, planEntries] = await Promise.all([
    db.recipe.findMany({
      where: { createdById: userId },
      select: {
        id: true,
        title: true,
        minutes: true,
        tags: true,
        categorie: { select: { nom: true } },
      },
      orderBy: { title: "asc" },
    }),
    db.mealPlanEntry.findMany({
      where: {
        ownerId: userId,
        date: { gte: debutSemaine, lt: finSemaine },
      },
      include: { recipe: { select: { title: true } } },
      orderBy: { date: "asc" },
    }),
  ]);

  const contexte: ContexteCuisine = {
    recettes: recipes.map((r) => ({
      id: r.id,
      title: r.title,
      minutes: r.minutes,
      tags: r.tags,
      categorieNom: r.categorie?.nom ?? null,
    })),
    repasPrevus: planEntries.map((p) => ({
      dateIso: formatDateIso(p.date),
      slot: p.slot,
      titre: p.recipe.title,
    })),
  };

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    // Mode dégradé « Charme local » instantané
    return NextResponse.json(reponseCharmeLocal(message, contexte));
  }

  const contexteTexte = formaterContexteCuisine(contexte);

  const systemPrompt = `Tu es Miamz, la mascotte culinaire kawaii de l'application SquishMiam. Tu es une petite boulette de riz onigiri kawaii avec une feuille verte sur la tête. Ton ton est chaleureux, bienveillant, gourmand, enthousiaste et concis (1 à 3 phrases max).

Voici le contexte actuel de la cuisine de l'utilisateur :
${contexteTexte}

Règles de dialogue :
1. Privilégie les recettes de l'utilisateur si elles correspondent à sa demande.
2. Évite de proposer un plat déjà planifié cette semaine.
3. Réponds EXCLUSIVEMENT avec un objet JSON strict au format suivant (aucun texte en dehors du JSON) :
{
  "reponse": "Ton message mignon et direct en français...",
  "humeur": "motive",
  "recetteTitre": "Titre exact de la recette proposée si applicable"
}

Humeurs disponibles : content, fier, affame, repu, fete, concentre, calin, taquin, inquiet, surpris, motive, relax.`;

  const messagesPayload = [
    { role: "system", content: systemPrompt },
    ...historique.slice(-6).map((h: { role: string; content: string }) => ({
      role: h.role === "user" ? "user" : "assistant",
      content: String(h.content || "").slice(0, 1000),
    })),
    { role: "user", content: message },
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://squishmiam.vercel.app",
        "X-Title": "SquishMiam",
      },
      body: JSON.stringify({
        model: MODELE,
        messages: messagesPayload,
        temperature: 0.7,
        max_tokens: 300,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return NextResponse.json(reponseCharmeLocal(message, contexte));
    }

    const data = await res.json().catch(() => null);
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(reponseCharmeLocal(message, contexte));
    }

    const reponseMiamz = parserReponseMiamz(content, contexte.recettes);
    return NextResponse.json(reponseMiamz);
  } catch {
    return NextResponse.json(reponseCharmeLocal(message, contexte));
  } finally {
    clearTimeout(timer);
  }
}
