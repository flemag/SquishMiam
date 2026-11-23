import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { exigerAuteur } from "@/lib/recipes";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;

  try {
    await exigerAuteur(id, userId);
  } catch (err) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status || 403 });
  }

  const body = await req.json().catch(() => ({}));
  const publish = body?.publish === true;

  const now = new Date();

  if (publish) {
    // Publication : reset validationCount, validators, publishedAt
    await db.recipe.update({
      where: { id },
      data: {
        isPublic: true,
        publishedAt: now,
        validationCount: 0,
        validators: [],
      },
    });
  } else {
    // Retrait : tout nettoyer
    await db.recipe.update({
      where: { id },
      data: {
        isPublic: false,
        publishedAt: null,
        validatedAt: null,
        validationCount: 0,
        validators: [],
        sharedWith: [],
      },
    });
  }

  return NextResponse.json({ ok: true });
}