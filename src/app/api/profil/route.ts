import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { normaliserTailleFoyer, objectifDepuisValeur } from "@/lib/profil";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { householdSize: true, goal: true, tokens: true },
  });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  return NextResponse.json({
    householdSize: normaliserTailleFoyer(user.householdSize),
    goal: objectifDepuisValeur(user.goal),
    tokens: user.tokens,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const data: { householdSize?: number; goal?: string } = {};
  if ("householdSize" in body) {
    data.householdSize = normaliserTailleFoyer((body as { householdSize?: unknown }).householdSize);
  }
  if ("goal" in body) {
    const goal = (body as { goal?: unknown }).goal;
    if (typeof goal !== "string") return NextResponse.json({ error: "Objectif invalide" }, { status: 400 });
    data.goal = objectifDepuisValeur(goal);
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Rien à enregistrer" }, { status: 400 });
  }

  const user = await db.user.update({
    where: { id: userId },
    data,
    select: { householdSize: true, goal: true, tokens: true },
  });

  return NextResponse.json({
    householdSize: normaliserTailleFoyer(user.householdSize),
    goal: objectifDepuisValeur(user.goal),
    tokens: user.tokens,
  });
}
