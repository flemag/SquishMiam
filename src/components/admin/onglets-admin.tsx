"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ONGLETS = [
  { href: "/admin", label: "Vue d'ensemble" },
  { href: "/admin/cles", label: "Clés" },
  { href: "/admin/categories", label: "Catégories" },
  { href: "/admin/utilisateurs", label: "Utilisateurs" },
];

export default function OngletsAdmin() {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections admin" className="mx-auto w-full max-w-4xl px-2">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {ONGLETS.map((onglet) => {
          const actif =
            onglet.href === "/admin" ? pathname === "/admin" : pathname.startsWith(onglet.href);
          return (
            <Link
              key={onglet.href}
              href={onglet.href}
              aria-current={actif ? "page" : undefined}
              className={`flex min-h-11 shrink-0 items-center rounded-t-xl px-4 text-sm font-medium transition ${
                actif
                  ? "bg-[#4A6741] text-white"
                  : "text-texte-doux hover:bg-[#A8E6CF]/30"
              }`}
            >
              {onglet.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}