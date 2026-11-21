import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { estUrlSecurisee, extraireJsonLdRecipe } from "@/lib/import-recette";
import { extraireRecetteParIa } from "@/lib/openrouter";

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";

  if (!url) {
    return NextResponse.json({ error: "L'URL est requise." }, { status: 400 });
  }

  if (!estUrlSecurisee(url)) {
    return NextResponse.json({ error: "URL invalide ou non autorisée." }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  let html = "";
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Impossible d'accéder au site distant (erreur ${res.status}).` },
        { status: 422 }
      );
    }

    const text = await res.text();
    // Limiter la taille analysée à 2 Mo max
    html = text.slice(0, 2 * 1024 * 1024);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "name" in err && err.name === "AbortError") {
      return NextResponse.json(
        { error: "La page distante a mis trop de temps à répondre (timeout)." },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: "Impossible de joindre la page demandée." },
      { status: 422 }
    );
  } finally {
    clearTimeout(timer);
  }

  // Niveau 1 : Extraction JSON-LD instantanée (zéro token)
  const recetteJsonLd = extraireJsonLdRecipe(html);
  if (recetteJsonLd && recetteJsonLd.title && recetteJsonLd.ingredients.length > 0) {
    return NextResponse.json({ recette: recetteJsonLd, source: "json-ld" });
  }

  // Niveau 2 : Fallback IA OpenRouter
  const recetteIa = await extraireRecetteParIa(html);
  if (recetteIa && recetteIa.title && recetteIa.ingredients.length > 0) {
    return NextResponse.json({ recette: recetteIa, source: "ia" });
  }

  return NextResponse.json(
    { error: "Aucune recette exploitable trouvée sur cette page." },
    { status: 422 }
  );
}
