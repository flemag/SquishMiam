import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { exigerAdmin } from "@/lib/admin-session";

export async function GET(req: Request) {
  await exigerAdmin();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as "PENDING" | "REVIEWED" | "DISMISSED" | null;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [reports, total] = await Promise.all([
    db.report.findMany({
      where,
      select: {
        id: true,
        reason: true,
        detail: true,
        status: true,
        createdAt: true,
        recipe: { select: { id: true, title: true, createdById: true, createdBy: { select: { name: true } } } },
        reporter: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.report.count({ where }),
  ]);

  return NextResponse.json({
    reports,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}