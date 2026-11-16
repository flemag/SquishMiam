"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import MiamzStatuette from "@/components/miamz-statuette";

const LIENS = [
  { href: "/plan", label: "Plan" },
  { href: "/recettes", label: "Recettes" },
  { href: "/courses", label: "Courses" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-[#4A6741]/10 bg-[#FFF9E6]/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/plan" className="flex items-center gap-2 text-lg font-semibold text-[#4A6741]">
          <MiamzStatuette size={34} /> Miamz
        </Link>
        <nav className="flex items-center gap-1">
          {LIENS.map((lien) => {
            const actif = pathname.startsWith(lien.href);
            return (
              <Link
                key={lien.href}
                href={lien.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  actif ? "bg-[#4A6741] text-white" : "text-gray-600 hover:bg-[#A8E6CF]/30"
                }`}
              >
                {lien.label}
              </Link>
            );
          })}
          <button
            onClick={() => signOut({ callbackUrl: "/connexion" })}
            className="ml-2 rounded-full px-3 py-2 text-sm text-gray-400 transition hover:bg-[#FFB5C2]/25 hover:text-[#B0413E]"
            title="Se déconnecter"
          >
            Déconnexion
          </button>
        </nav>
      </div>
    </header>
  );
}
