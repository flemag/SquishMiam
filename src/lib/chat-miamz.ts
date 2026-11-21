import type { HumeurId } from "@/lib/humeurs";

export type ReponseMiamz = {
  reponse: string;
  humeur: HumeurId;
  actions?: { label: string; lien: string }[];
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

const HUMEURS_VALIDES = new Set<HumeurId>([
  "content",
  "fier",
  "decu",
  "affame",
  "repu",
  "endormi",
  "fete",
  "concentre",
  "calin",
  "taquin",
  "inquiet",
  "surpris",
  "motive",
  "relax",
]);

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

/**
 * Parse la réponse renvoyée par le modèle pour extraire texte, humeur et actions.
 */
export function parserReponseMiamz(
  texteBrut: string,
  recettesDisponibles: { id: string; title: string }[]
): ReponseMiamz {
  if (!texteBrut || typeof texteBrut !== "string") {
    return {
      reponse: "Miam ! Je suis un peu perdu dans mes pensées, peux-tu répéter ?",
      humeur: "surpris",
    };
  }

  // Nettoyage des éventuels blocs ```json
  const texteNettoye = texteBrut
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(texteNettoye);
    if (parsed && typeof parsed === "object") {
      const reponse = typeof parsed.reponse === "string" ? parsed.reponse.trim() : "";
      const humeurBrute = (parsed.humeur || "").toLowerCase().trim() as HumeurId;
      const humeur: HumeurId = HUMEURS_VALIDES.has(humeurBrute) ? humeurBrute : "content";

      const actions: { label: string; lien: string }[] = [];

      // Détecter si une recette a été proposée
      const recetteTitre = parsed.recetteTitre || parsed.recetteProposee;
      let recetteTrouvee = null;
      if (typeof recetteTitre === "string" && recetteTitre.trim()) {
        const nomNormalise = recetteTitre.trim().toLowerCase();
        recetteTrouvee = recettesDisponibles.find(
          (r) => r.title.toLowerCase() === nomNormalise || nomNormalise.includes(r.title.toLowerCase())
        );
      }

      if (recetteTrouvee) {
        actions.push({
          label: `Voir la recette : ${recetteTrouvee.title}`,
          lien: `/recettes`,
        });
        actions.push({
          label: "Ouvrir le planning",
          lien: "/plan",
        });
      }

      return {
        reponse: reponse || texteBrut,
        humeur,
        actions: actions.length > 0 ? actions : undefined,
      };
    }
  } catch {
    // Si ce n'est pas du JSON, on renvoie le texte brut gentiment
  }

  return {
    reponse: texteBrut.trim(),
    humeur: "content",
  };
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

  // Filtrer par durée rapide si demandé
  if (msg.includes("rapide") || msg.includes("20 min") || msg.includes("vite") || msg.includes("express")) {
    const rapides = contexte.recettes.filter((r) => r.minutes && r.minutes <= 25);
    const choix = rapides[0] || contexte.recettes[0];
    return {
      reponse: `Pour aller vite, je te conseille **${choix.title}**${choix.minutes ? ` (prêt en ${choix.minutes} minutes)` : ""} ! C'est rapide et super bon. 🍙`,
      humeur: "motive",
      actions: [
        { label: `Voir : ${choix.title}`, lien: "/recettes" },
        { label: "Planifier ce repas", lien: "/plan" },
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
    const choix = veges[0] || contexte.recettes[0];
    return {
      reponse: `Que dis-tu de **${choix.title}** ? C'est parfait pour un repas végé plein de saveurs ! 🌱`,
      humeur: "content",
      actions: [
        { label: `Voir : ${choix.title}`, lien: "/recettes" },
        { label: "Ajouter au planning", lien: "/plan" },
      ],
    };
  }

  // Choix par défaut : préférer une recette qui n'est pas encore planifiée cette semaine
  const titresPlanifies = new Set(contexte.repasPrevus.map((p) => p.titre.toLowerCase()));
  const nonPlanifiees = contexte.recettes.filter((r) => !titresPlanifies.has(r.title.toLowerCase()));
  const choix = nonPlanifiees[Math.floor(Math.random() * nonPlanifiees.length)] || contexte.recettes[0];

  return {
    reponse: `Pour ce soir, je te propose **${choix.title}**${choix.minutes ? ` (${choix.minutes} min)` : ""} ! Ça te tente ? Miam miam ! ✨`,
    humeur: "motive",
    actions: [
      { label: `Voir : ${choix.title}`, lien: "/recettes" },
      { label: "Mettre au planning", lien: "/plan" },
    ],
  };
}
