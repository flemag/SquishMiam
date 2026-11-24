export type StatutBoutique = "privee" | "en_attente" | "publiee";

/** Détermine le statut boutique d'une recette selon ses drapeaux. */
export function statutBoutique({
  isPublic,
  validatedAt,
}: {
  isPublic: boolean;
  validatedAt: Date | null;
}): StatutBoutique {
  if (!isPublic) return "privee";
  if (!validatedAt) return "en_attente";
  return "publiee";
}

/** Champs à écrire lors d'une action de modération (publier / retirer). */
export function champsModeration(publie: boolean, now: Date): Record<string, unknown> {
  if (publie) {
    return { isPublic: true, publishedAt: now, validatedAt: now };
  }
  return {
    isPublic: false,
    publishedAt: null,
    validatedAt: null,
    validationCount: 0,
    validators: [],
    sharedWith: [],
  };
}