import { phraseProfil } from "@/lib/profil";

export type EntreeSemaine = {
  dateIso: string;
  slot: string;
  titre: string;
  categorieNom: string | null;
  tags: string[];
};

export type ItemCourses = {
  nom: string;
  rayon: string;
  checked: boolean;
};

export type ProfilAnalyse = {
  householdSize: number;
  goal: string;
};

export type ResumeSemaine = {
  nbRepas: number;
  joursRemplis: string[];
  joursVides: string[];
  repetitions: { titre: string; fois: number }[];
  categories: string[];
  tags: string[];
  titresDistincts: number;
  nbCreneauxVides: number;
};

export type Analyse = {
  conseils: string[];
  suggestion: string | null;
};

const MAX_CONSEILS = 4;
const MAX_CARACTERES = 160;
const CRENEAUX_PAR_JOUR = 3;
const LEGUMES = /végé|vege|legume|légume|salade|poisson|soupe/i;

const labelJour = (dateIso: string) =>
  new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${dateIso}T00:00:00Z`)
  );

/** Résumé factuel de la semaine : ce que Miamz peut observer sans IA. */
export function resumerSemaine(dates: string[], entrees: EntreeSemaine[]): ResumeSemaine {
  const joursRemplis = dates.filter((d) => entrees.some((e) => e.dateIso === d));
  const joursVides = dates.filter((d) => !entrees.some((e) => e.dateIso === d));

  const comptes = new Map<string, number>();
  for (const e of entrees) comptes.set(e.titre, (comptes.get(e.titre) ?? 0) + 1);
  const repetitions = [...comptes.entries()]
    .filter(([, fois]) => fois >= 2)
    .map(([titre, fois]) => ({ titre, fois }));

  const categories = [...new Set(entrees.map((e) => e.categorieNom).filter((c): c is string => !!c))];
  const tags = [...new Set(entrees.flatMap((e) => e.tags))];

  return {
    nbRepas: entrees.length,
    joursRemplis,
    joursVides,
    repetitions,
    categories,
    tags,
    titresDistincts: comptes.size,
    nbCreneauxVides: Math.max(0, dates.length * CRENEAUX_PAR_JOUR - entrees.length),
  };
}

/** Conseils déterministes, priorisés — le repli garanti quand l'IA ne répond pas. */
export function conseilsLocaux({
  resume,
  courses,
  profil,
}: {
  resume: ResumeSemaine;
  courses: ItemCourses[];
  profil: ProfilAnalyse;
}): Analyse {
  const conseils: string[] = [];
  let suggestion: string | null = null;

  if (resume.nbRepas === 0) {
    conseils.push("Ta semaine est encore vide : ajoute 2–3 repas pour commencer.");
    suggestion = "Ouvre le planning et remplis le dîner de ce soir.";
  } else {
    if (resume.joursVides.length > 0) {
      const exemple = resume.joursVides.slice(0, 2).map(labelJour).join(" et ");
      conseils.push(
        `Il reste ${resume.joursVides.length} jour${resume.joursVides.length > 1 ? "s" : ""} sans repas (${exemple}).`
      );
    }

    const repetition = resume.repetitions[0];
    if (repetition) {
      conseils.push(`« ${repetition.titre} » revient ${repetition.fois} fois cette semaine : varie les plaisirs.`);
    }

    if (resume.nbRepas >= 3 && resume.titresDistincts < 3) {
      conseils.push("Ajoute un peu de variété : un plat de légumes, de poisson ou de légumineuses.");
    }

    const aDesLegumes = [...resume.categories, ...resume.tags].some((v) => LEGUMES.test(v));
    if (profil.goal === "perte_poids" && !aDesLegumes) {
      conseils.push("Pour ton objectif, mise sur des assiettes de légumes rassasiantes.");
    }
  }

  if (courses.length === 0) {
    conseils.push("Ta liste de courses est vide : elle se remplit toute seule depuis le planning.");
  } else if (courses.every((c) => c.checked)) {
    conseils.push("Toute la liste est cochée, bravo : ton panier est prêt !");
  }

  if (conseils.length === 0) {
    conseils.push("Ta semaine a l'air équilibrée : continue comme ça !");
  }

  return { conseils: conseils.slice(0, MAX_CONSEILS), suggestion };
}

/** Contexte compact injecté dans le prompt : repas, courses, profil. */
export function construireContexteAnalyse({
  dates,
  entrees,
  courses,
  profil,
}: {
  dates: string[];
  entrees: EntreeSemaine[];
  courses: ItemCourses[];
  profil: ProfilAnalyse;
}): string {
  const lignesRepas =
    entrees.length > 0
      ? entrees
          .map(
            (e) =>
              `- ${e.dateIso} (${e.slot}) : ${e.titre}${e.categorieNom ? ` [${e.categorieNom}]` : ""}`
          )
          .join("\n")
      : "Aucun repas planifié.";

  const lignesCourses =
    courses.length > 0
      ? courses
          .map((c) => `- ${c.nom} (${c.rayon}) — ${c.checked ? "coché" : "à acheter"}`)
          .join("\n")
      : "Liste de courses vide.";

  return `Semaine du ${dates[0] ?? "?"} au ${dates[dates.length - 1] ?? "?"}.\nRepas :\n${lignesRepas}\nCourses :\n${lignesCourses}\n${phraseProfil(profil)}`;
}

/** Parse la réponse IA ; toute forme inexploitable renvoie null (repli local). */
export function parserAnalyseIa(contenu: string): Analyse | null {
  if (!contenu || typeof contenu !== "string") return null;

  const nettoye = contenu
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(nettoye);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const objet = parsed as Record<string, unknown>;
  if (!Array.isArray(objet.conseils)) return null;

  const conseils = objet.conseils
    .filter((c): c is string => typeof c === "string")
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, MAX_CONSEILS)
    .map((c) => c.slice(0, MAX_CARACTERES));

  if (conseils.length === 0) return null;

  const suggestion =
    typeof objet.suggestion === "string" && objet.suggestion.trim()
      ? objet.suggestion.trim().slice(0, MAX_CARACTERES)
      : null;

  return { conseils, suggestion };
}
