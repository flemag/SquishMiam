import { db } from "@/lib/db";
import { exigerAdmin } from "@/lib/admin-session";
import { licenseStatus } from "@/lib/licenses";
import ClesAdmin from "@/components/admin/cles-client";

export default async function AdminClesPage() {
  await exigerAdmin();

  const keys = await db.licenseKey.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, code: true, durationDays: true, status: true, expiresAt: true, activatedAt: true, createdAt: true },
  });
  const now = new Date();

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-miamz-vert">Clés d&apos;activation</h1>
      <p className="mb-6 text-sm text-texte-doux">
        Génère des clés, regarde leur statut, révoque à la demande.
      </p>
      <ClesAdmin
        initialKeys={keys.map((k) => ({
          ...k,
          statut: licenseStatus({ status: k.status, expiresAt: k.expiresAt }, now),
        }))}
      />
    </div>
  );
}
