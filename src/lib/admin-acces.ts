export type CleAcces = {
  id: string;
  status: "UNUSED" | "ACTIVE" | "REVOKED";
  expiresAt: Date | null;
  activatedAt: Date | null;
};

export function cleDAccesCourante<T extends CleAcces>(cles: readonly T[]): T | null {
  const actives = cles.filter((c) => c.status === "ACTIVE");
  if (actives.length === 0) return null;

  return actives.reduce((meilleure, candidate) => {
    // 1. Illimitée prioritaire.
    if (meilleure.expiresAt === null && candidate.expiresAt !== null) return meilleure;
    if (candidate.expiresAt === null && meilleure.expiresAt !== null) return candidate;

    // 2. Expiration la plus lointaine.
    if (candidate.expiresAt && meilleure.expiresAt) {
      const ecart = candidate.expiresAt.getTime() - meilleure.expiresAt.getTime();
      if (ecart > 0) return candidate;
      if (ecart < 0) return meilleure;
    }

    // 3. Activation la plus récente (null = plus ancienne).
    const activation = (c: T) => c.activatedAt?.getTime() ?? 0;
    return activation(candidate) > activation(meilleure) ? candidate : meilleure;
  });
}

export function prolongerAcces(
  expiresAt: Date | null,
  jours: number | null,
  maintenant: Date
): Date | null {
  if (jours === null) return null;
  if (expiresAt === null) return null;

  const base = expiresAt.getTime() > maintenant.getTime() ? expiresAt : maintenant;
  return new Date(base.getTime() + jours * 24 * 60 * 60 * 1000);
}
