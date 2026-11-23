import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

/**
 * Contrôle ADMIN des pages serveur. Retourne l'id de l'admin courant.
 * Le middleware protège déjà les pages, mais chaque page refait le contrôle
 * (défense en profondeur et rendu direct possible).
 */
export async function exigerAdmin(): Promise<string> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/connexion");

  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "ADMIN") redirect("/");
  return userId;
}