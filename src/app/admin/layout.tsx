import Link from "next/link";
import { exigerAdmin } from "@/lib/admin-session";
import MiamzStatuette from "@/components/miamz-statuette";
import OngletsAdmin from "@/components/admin/onglets-admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await exigerAdmin();

  return (
    <div className="min-h-screen pb-10">
      <header className="border-b border-bordure bg-fond-voile">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/admin"
            className="flex min-h-11 items-center gap-2 text-lg font-semibold text-[#4A6741]"
          >
            <MiamzStatuette size={30} /> Miamz Admin
          </Link>
          <Link
            href="/plan"
            className="flex min-h-11 items-center rounded-full px-4 text-sm font-medium text-texte-doux transition hover:bg-[#A8E6CF]/30"
          >
            Retour à l&apos;app
          </Link>
        </div>
        <OngletsAdmin />
      </header>
      <main className="mx-auto w-full max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}