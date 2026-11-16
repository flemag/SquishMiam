export type GuardContext = {
  hasSession: boolean;
  isAdmin: boolean;
  licenseOk: boolean;
};

export type GuardDecision = { allow: boolean; redirectTo?: string };

/**
 * Décision pure d'accès aux routes protégées.
 * - /connexion est toujours accessible.
 * - Sans session → /connexion.
 * - /admin/* exige le rôle ADMIN (l'admin n'a pas besoin de clé).
 * - Les autres routes exigent une clé active (les clés expirées ne passent pas).
 */
export function routeGuard(pathname: string, ctx: GuardContext): GuardDecision {
  if (pathname === "/connexion") return { allow: true };
  if (!ctx.hasSession) return { allow: false, redirectTo: "/connexion" };
  if (pathname.startsWith("/admin")) {
    return ctx.isAdmin ? { allow: true } : { allow: false, redirectTo: "/" };
  }
  if (!ctx.licenseOk) return { allow: false, redirectTo: "/connexion?erreur=cle" };
  return { allow: true };
}
