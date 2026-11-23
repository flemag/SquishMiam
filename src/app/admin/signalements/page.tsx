import { exigerAdmin } from "@/lib/admin-session";
import SignalementsClient from "@/components/admin/signalements-client";

export default async function AdminSignalementsPage() {
  await exigerAdmin();
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-miamz-vert">Signalements</h1>
      <p className="mb-6 text-sm text-texte-doux">
        Gère les signalements de recettes (spam, contenu inapproprié, etc.).
      </p>
      <SignalementsClient />
    </div>
  );
}