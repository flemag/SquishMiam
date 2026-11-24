import { HUMEURS, type HumeurId } from "@/lib/humeurs";

export type ActionMiamz =
  | { label: string; lien: string }
  | { label: string; planifier: { recetteId: string; titre: string } };

export type ReponseMiamz = {
  reponse: string;
  humeur: HumeurId;
  actions?: ActionMiamz[];
};

export type ContexteCuisine = {
  recettes: {
    id: string;
    title: string;
    minutes?: number | null;
    tags: string[];
    categorieNom?: string | null;
  }[];
  repasPrevus: {
    dateIso: string;
    slot: string;
    titre: string;
  }[];
};

const HUMEURS_VALIDES = new Set<HumeurId>(HUMEURS);

/**
 * Formate le contexte culinaire pour guider Miamz et l'IA
 * avec les vraies données de l'utilisateur.
 */
export function formaterContexteCuisine(contexte: ContexteCuisine): string {
  const lignesRecettes =
    contexte.recettes.length > 0
      ? contexte.recettes
          .map((r) => {
            const meta = [
              r.categorieNom ? `Catégorie: ${r.categorieNom}` : "",
              r.minutes ? `${r.minutes} min` : "",
              r.tags.length > 0 ? `Tags: [${r.tags.join(", ")}]` : "",
            ]
              .filter(Boolean)
              .join(" | ");
            return `- ${r.title}${meta ? ` (${meta})` : ""}`;
          })
          .join("\n")
      : "Aucune recette enregistrée pour le moment.";

  const lignesPlan =
    contexte.repasPrevus.length > 0
      ? contexte.repasPrevus
          .map((p) => `- ${p.dateIso} (${p.slot}) : ${p.titre}`)
          .join("\n")
      : "Aucun repas planifié.";

  return `Recettes enregistrées dans le carnet :\n${lignesRecettes}\n\nRepas déjà prévus cette semaine :\n${lignesPlan}`;
}

const REPONSE_INDECISE: ReponseMiamz = {
  reponse: "Miam ! Je n'ai pas bien saisi ma propre réponse. Tu peux reformuler ?",
  humeur: "surpris",
};

/** Les bulles affichent du texte brut : on retire le gras markdown. */
function sansMarkdown(texte: string): string {
  return texte.replace(/\*\*(.+?)\*\*/g, "$1").trim();
}

/**
 * Parse la réponse renvoyée par le modèle pour extraire texte, humeur et actions.
 * Tolère les blocs ```json, le texte brut, et retombe sur une phrase amicale
 * plutôt que d'afficher du JSON brut quand la réponse est inexploitable.
 */
export function parserReponseMiamz(
  texteBrut: string,
  recettesDisponibles: { id: string; title: string }[]
): ReponseMiamz {
  if (!texteBrut || typeof texteBrut !== "string") {
    return REPONSE_INDECISE;
  }

  // Nettoyage des éventuels blocs ```json (y compris précédés d'un saut de ligne).
  const texteNettoye = texteBrut
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: unknown = null;
  let jsonValide = false;
  try {
    parsed = JSON.parse(texteNettoye);
    jsonValide = true;
  } catch {
    parsed = null;
  }

  if (jsonValide) {
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return REPONSE_INDECISE;
    }

    const objet = parsed as Record<string, unknown>;
    const reponse = typeof objet.reponse === "string" ? sansMarkdown(objet.reponse) : "";
    if (!reponse) {
      return REPONSE_INDECISE;
    }

    const humeurBrute =
      typeof objet.humeur === "string" ? (objet.humeur.toLowerCase().trim() as HumeurId) : null;
    const humeur: HumeurId = humeurBrute && HUMEURS_VALIDES.has(humeurBrute) ? humeurBrute : "content";

    // Détecter la recette proposée : champ dédié, sinon titre cité dans le texte.
    const recetteTitre =
      typeof objet.recetteTitre === "string"
        ? objet.recetteTitre
        : typeof objet.recetteProposee === "string"
          ? objet.recetteProposee
          : null;

    const candidates = [...recettesDisponibles].sort((a, b) => b.title.length - a.title.length);
    const reponseMinuscule = reponse.toLowerCase();
    const recetteTrouvee =
      (recetteTitre
        ? candidates.find(
            (r) =>
              r.title.toLowerCase() === recetteTitre.toLowerCase().trim() ||
              recetteTitre.toLowerCase().includes(r.title.toLowerCase())
          )
        : undefined) ?? candidates.find((r) => reponseMinuscule.includes(r.title.toLowerCase()));

    const actions: ActionMiamz[] = [];
    if (recetteTrouvee) {
      actions.push({
        label: `Voir la recette : ${recetteTrouvee.title}`,
        lien: `/recettes?recette=${recetteTrouvee.id}`,
      });
      actions.push({
        label: "Mettre au planning",
        planifier: { recetteId: recetteTrouvee.id, titre: recetteTrouvee.title },
      });
    }

    return {
      reponse,
      humeur,
      actions: actions.length > 0 ? actions : undefined,
    };
  }

  const texte = sansMarkdown(texteNettoye);
  // JSON cassé (`{`, `[`, `null`…) : ne jamais l'afficher tel quel.
  if (!texte || /^[[{]/.test(texte) || texte === "null" || texte === "undefined") {
    return REPONSE_INDECISE;
  }

  return { reponse: texte, humeur: "content" };
}

/**
 * Moteur de repli « Charme local » quand OpenRouter est indisponible ou hors quota.
 * Il formule une réponse intelligente et personnalisée basée sur les recettes du foyer.
 */
export function reponseCharmeLocal(message: string, contexte: ContexteCuisine): ReponseMiamz {
  const msg = message.toLowerCase().trim();

  if (contexte.recettes.length === 0) {
    return {
      reponse:
        "Tu n'as pas encore de recette enregistrée dans ta cuisine ! 📖 Ajoute ta première recette et je pourrai t'aider à choisir tes repas.",
      humeur: "taquin",
      actions: [{ label: "Créer une recette", lien: "/recettes/nouvelle" }],
    };
  }

  const titresPlanifies = new Set(contexte.repasPrevus.map((p) => p.titre.toLowerCase()));
  const choisir = (liste: ContexteCuisine["recettes"]) => {
    const nonPlanifiees = liste.filter((r) => !titresPlanifies.has(r.title.toLowerCase()));
    const pool = nonPlanifiees.length > 0 ? nonPlanifiees : liste;
    // Déterministe : le même message propose la même recette (testable).
    return pool[msg.length % pool.length] ?? pool[0];
  };

  if (/^(bonjour|salut|coucou|hello|hey)\b/.test(msg)) {
    return {
      reponse:
        "Coucou ! Je suis là pour t'aider à trouver une idée de repas. Tu veux quelque chose de rapide, de végétarien, ou je te propose une recette du carnet ? 🍙",
      humeur: "content",
    };
  }

  // Filtrer par durée rapide si demandé
  if (msg.includes("rapide") || msg.includes("20 min") || msg.includes("vite") || msg.includes("express")) {
    const rapides = contexte.recettes.filter((r) => r.minutes && r.minutes <= 25);
    const choix = choisir(rapides.length > 0 ? rapides : contexte.recettes);
    return {
      reponse: `Pour aller vite, je te conseille ${choix.title}${choix.minutes ? ` (prêt en ${choix.minutes} minutes)` : ""} ! C'est rapide et super bon. 🍙`,
      humeur: "motive",
      actions: [
        { label: `Voir : ${choix.title}`, lien: `/recettes?recette=${choix.id}` },
        {
          label: "Planifier ce repas",
          planifier: { recetteId: choix.id, titre: choix.title },
        },
      ],
    };
  }

  // Filtrer par végétarien si demandé
  if (msg.includes("végé") || msg.includes("vegetarien") || msg.includes("légume")) {
    const veges = contexte.recettes.filter(
      (r) =>
        r.tags.some((t) => t.toLowerCase().includes("végé")) ||
        (r.categorieNom && r.categorieNom.toLowerCase().includes("végé"))
    );
    const choix = choisir(veges.length > 0 ? veges : contexte.recettes);
    return {
      reponse: `Que dis-tu de ${choix.title} ? C'est parfait pour un repas végé plein de saveurs ! 🌱`,
      humeur: "content",
      actions: [
        { label: `Voir : ${choix.title}`, lien: `/recettes?recette=${choix.id}` },
        {
          label: "Ajouter au planning",
          planifier: { recetteId: choix.id, titre: choix.title },
        },
      ],
    };
  }

  // Choix par défaut : préférer une recette qui n'est pas encore planifiée cette semaine
  const choix = choisir(contexte.recettes);

  return {
    reponse: `Pour ce soir, je te propose ${choix.title}${choix.minutes ? ` (${choix.minutes} min)` : ""} ! Ça te tente ? Miam miam ! ✨`,
    humeur: "motive",
    actions: [
      { label: `Voir : ${choix.title}`, lien: `/recettes?recette=${choix.id}` },
      {
        label: "Mettre au planning",
        planifier: { recetteId: choix.id, titre: choix.title },
      },
    ],
  };
}
