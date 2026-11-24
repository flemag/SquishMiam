import { db } from "@/lib/db";
import { exigerAdmin } from "@/lib/admin-session";
import { libelleMotif } from "@/lib/jetons-admin";
import JetonsClient from "@/components/admin/jetons-client";

export default async function AdminJetonsPage() {
  await exigerAdmin();

  const [users, transactions] = await Promise.all([
    db.user.findMany({
      orderBy: { tokens: "desc" },
      take: 100,
      select: { id: true, name: true, email: true, role: true, tokens: true },
    }),
    db.tokenTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  const recipeIds = [...new Set(transactions.map((t) => t.recipeId).filter(Boolean))] as string[];
  const recipes = recipeIds.length > 0
    ? await db.recipe.findMany({ where: { id: { in: recipeIds } }, select: { id: true, title: true } })
    : [];
  const recipeTitleById = new Map(recipes.map((r) => [r.id, r.title]));

  const utilisateurs = users.map((u) => ({
    id: u.id,
    nom: u.name ?? u.email,
    email: u.email,
    role: u.role,
    tokens: u.tokens,
  }));

  const txs = transactions.map((t) => ({
    id: t.id,
    userId: t.userId,
    nom: t.user.name ?? t.user.email,
    email: t.user.email,
    amount: t.amount,
    reason: t.reason,
    libelle: libelleMotif(t.reason),
    recette: t.recipeId ? (recipeTitleById.get(t.recipeId) ?? null) : null,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-miamz-vert">Jetons</h1>
      <p className="mb-6 text-sm text-texte-doux">
        Crédite ou débite les jetons des utilisateurs, avec un motif.
      </p>
      <JetonsClient utilisateurs={utilisateurs} transactions={txs} />
    </div>
  );
}