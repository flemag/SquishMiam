export const MOTIFS_JETONS = ["bonus", "correction", "geste"] as const;
export type MotifJeton = (typeof MOTIFS_JETONS)[number];

export const LIBELLES_MOTIF: Record<string, string> = {
  bonus: "Bonus",
  correction: "Correction",
  geste: "Geste de l'admin",
  validation: "Validation",
  achat: "Achat",
};

/** Libellé français d'un motif (tolérant pour motifs historiques). */
export function libelleMotif(reason: string): string {
  return LIBELLES_MOTIF[reason] ?? reason;
}

/**
 * Valide un mouvement de jetons admin.
 * - amount : entier non nul, |amount| ≤ 1000
 * - reason : doit appartenir à MOTIFS_JETONS
 * - solde : ne doit pas devenir négatif si amount < 0
 */
export function validerMouvement({
  amount,
  reason,
  solde,
}: {
  amount: unknown;
  reason: unknown;
  solde: number;
}): { ok: true; amount: number; reason: MotifJeton } | { ok: false; raison: string } {
  // Montant
  if (
    typeof amount !== "number" ||
    !Number.isInteger(amount) ||
    amount === 0 ||
    Math.abs(amount) > 1000
  ) {
    return { ok: false, raison: "Montant invalide (1 à 1000)." };
  }

  // Motif
  if (typeof reason !== "string" || !MOTIFS_JETONS.includes(reason as MotifJeton)) {
    return { ok: false, raison: "Motif inconnu." };
  }

  // Solde insuffisant pour un débit
  if (amount < 0 && solde + amount < 0) {
    return { ok: false, raison: "Solde insuffisant." };
  }

  return { ok: true, amount, reason: reason as MotifJeton };
}