import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateIso, getWeekDates, weekStart } from "@/lib/plan";
import { demanderReponseIa } from "@/lib/openrouter";
import {
  conseilsLocaux,
  construireContexteAnalyse,
  parserAnalyseIa,
  resumerSemaine,
  type EntreeSemaine,
  type ItemCourses,
  type ProfilAnalyse,
} from "@/lib/analyse-miamz";

const DELAI_IA_MS = 8000;

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const portee = body?.portee;
  if (portee !== "semaine" && portee !== "courses") {
    return NextResponse.json({ error: "Portée invalide (semaine ou courses)" }, { status: 400 });
  }

  const semaine = typeof body?.semaine === "string" ? body.semaine : "";
  const semaineValide = /^\d{4}-\d{2}-\d{2}$/.test(semaine) && !isNaN(new Date(semaine).getTime());
  const debut = weekStart(semaineValide ? new Date(semaine) : new Date());
  const fin = new Date(debut);
  fin.setUTCDate(fin.getUTCDate() + 7);
  const dates = getWeekDates(debut).map(formatDateIso);

  const [repas, courses, utilisateur] = await Promise.all([
    db.mealPlanEntry.findMany({
      where: { ownerId: userId, date: { gte: debut, lt: fin } },
      select: {
        date: true,
        slot: true,
        recipe: { select: { title: true, tags: true, categorie: { select: { nom: true } } } },
      },
      orderBy: [{ date: "asc" }, { slot: "asc" }, { order: "asc" }],
    }),
    db.groceryListItem.findMany({
      where: { ownerId: userId, weekStart: debut, masquee: false },
      select: { nom: true, rayon: true, checked: true },
    }),
    db.user.findUnique({ where: { id: userId }, select: { householdSize: true, goal: true } }),
  ]);

  const entrees: EntreeSemaine[] = repas.map((r) => ({
    dateIso: formatDateIso(r.date),
    slot: r.slot,
    titre: r.recipe.title,
    categorieNom: r.recipe.categorie?.nom ?? null,
    tags: r.recipe.tags,
  }));

  const items: ItemCourses[] = courses.map((c) => ({ nom: c.nom, rayon: c.rayon, checked: c.checked }));

  const profil: ProfilAnalyse = {
    householdSize: utilisateur?.householdSize ?? 1,
    goal: utilisateur?.goal ?? "equilibre",
  };

  const resume = resumerSemaine(dates, entrees);
  const repli = conseilsLocaux({ resume, courses: items, profil });

  const contexte = construireContexteAnalyse({ dates, entrees, courses: items, profil });
  const systemPrompt = `Tu es Miamz, la mascotte culinaire kawaii de SquishMiam. Analyse la semaine de l'utilisateur et donne des conseils utiles.

${contexte}

Règles :
1. 3 à 4 conseils concrets, 160 caractères maximum chacun, tutoiement chaleureux.
2. Appuie-toi sur les vrais repas, les vrais jours vides et la vraie liste de courses.
3. Adapte-toi au foyer et à l'objectif, sans jamais culpabiliser ni parler de régime strict.
4. Une seule suggestion d'action concrète, optionnelle.
5. Réponds EXCLUSIVEMENT avec un objet JSON strict (aucun texte dehors) :
{"conseils": ["...", "..."], "suggestion": "..."}`;

  const contenu = await demanderReponseIa(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: portee === "semaine" ? "Analyse ma semaine." : "Analyse mes courses." },
    ],
    { maxTokens: 400, temperature: 0.5, timeoutMs: DELAI_IA_MS }
  );

  const ia = contenu ? parserAnalyseIa(contenu) : null;

  return NextResponse.json({
    conseils: ia?.conseils ?? repli.conseils,
    suggestion: ia?.suggestion ?? repli.suggestion,
    source: ia ? "ia" : "local",
  });
}
