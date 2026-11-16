import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { licenseStatus } from "@/lib/licenses";
import ClesAdmin from "@/components/admin/cles-client";

export default async function AdminClesPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/connexion");

  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "ADMIN") redirect("/");

  const keys = await db.licenseKey.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, code: true, durationDays: true, status: true, expiresAt: true, activatedAt: true, createdAt: true },
  });
  const now = new Date();

  return (
    <main className="min-h-screen bg-[#FFF9E6] p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 text-2xl font-semibold text-[#4A6741]">Clés d&apos;activation</h1>
        <p className="mb-6 text-sm text-gray-500">Génère des clés, regarde leur statut, révoque à la demande.</p>
        <ClesAdmin
          initialKeys={keys.map((k) => ({
            ...k,
            statut: licenseStatus({ status: k.status, expiresAt: k.expiresAt }, now),
          }))}
        />
      </div>
    </main>
  );
}
