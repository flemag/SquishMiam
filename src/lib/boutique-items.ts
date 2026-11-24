export type TypeArticle = "theme" | "accessoire" | "pack";

const TYPES_VALIDES: TypeArticle[] = ["theme", "accessoire", "pack"];

/** Vérifie qu'une métadonnée de thème est valide (couleurs hex). */
export function metadonneesThemeValides(meta: unknown): boolean {
  if (!meta || typeof meta !== "object") return false;
  const m = meta as Record<string, unknown>;
  const champs = ["primary", "secondary", "accent", "background", "text"];
  return champs.every((c) => typeof m[c] === "string" && /^#[0-9a-fA-F]{3,8}$/.test(m[c] as string));
}

/** Valide un article de boutique. */
export function validerArticle({
  type,
  nom,
  prix,
  metadata,
}: {
  type: unknown;
  nom: unknown;
  prix: unknown;
  metadata: unknown;
}): { ok: true } | { ok: false; raison: string } {
  if (typeof type !== "string" || !TYPES_VALIDES.includes(type as TypeArticle)) {
    return { ok: false, raison: "Type invalide (theme, accessoire ou pack)." };
  }
  if (typeof nom !== "string" || !nom.trim()) {
    return { ok: false, raison: "Nom requis." };
  }
  if (typeof prix !== "number" || !Number.isInteger(prix) || prix < 0) {
    return { ok: false, raison: "Prix invalide (entier ≥ 0)." };
  }
  if (type === "theme" && !metadonneesThemeValides(metadata)) {
    return { ok: false, raison: "Métadonnées de thème invalides (couleurs hex requises)." };
  }
  if (type === "pack") {
    const m = metadata as Record<string, unknown> | null;
    if (!m || !Array.isArray(m.recipeIds)) {
      return { ok: false, raison: "Un pack doit contenir des recipeIds." };
    }
  }
  return { ok: true };
}

/** Vérifie si un utilisateur peut acheter un article. */
export function peutAcheter({
  tokens,
  prix,
  dejaAchete,
}: {
  tokens: number;
  prix: number;
  dejaAchete: boolean;
}): boolean {
  if (dejaAchete) return false;
  if (prix === 0) return true;
  return tokens >= prix;
}