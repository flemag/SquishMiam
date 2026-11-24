import { db } from "@/lib/db";

/**
 * Attribue des XP à un utilisateur et enregistre la transaction.
 * Retourne le nouveau total d'XP.
 */
export async function ajouterXp(
  userId: string,
  amount: number,
  raison: string
): Promise<number> {
  if (amount <= 0) return 0;

  const result = await db.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { xp: { increment: amount } },
      select: { xp: true },
    });

    await tx.tokenTransaction.create({
      data: {
        userId,
        amount,
        reason: `xp:${raison}`,
      },
    });

    return updated.xp;
  });

  return result;
}