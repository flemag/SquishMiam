"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMiamz } from "@/components/miamz/fournisseur";

type ItemVue = { id: string; nom: string; affichage: string; checked: boolean };

export default function ListeCourses({
  weekStart,
  groupes,
}: {
  weekStart: string;
  groupes: { rayon: string; items: ItemVue[] }[];
}) {
  const router = useRouter();
  const { emettre } = useMiamz();
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function generer() {
    setEnCours(true);
    setMessage(null);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(data.ajoutes > 0 ? `${data.ajoutes} article(s) ajouté(s) 🛒` : "Rien de nouveau — la liste est à jour !");
        router.refresh();
      } else {
        setMessage("Génération impossible — as-tu planifié ta semaine ?");
      }
    } finally {
      setEnCours(false);
    }
  }

  async function cocher(id: string, checked: boolean) {
    const res = await fetch(`/api/courses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checked }),
    });
    if (res.ok && checked) emettre("course-cochee");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={generer}
          disabled={enCours}
          className="rounded-full bg-[#E07A5F] px-5 py-2.5 font-medium text-white transition hover:bg-[#c96a51] disabled:opacity-50"
        >
          {enCours ? "Génération…" : "Générer depuis le plan de la semaine"}
        </button>
        {message && <span className="text-sm text-[#4A6741]">{message}</span>}
      </div>

      {groupes.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
          <div className="text-4xl">🛒</div>
          <p className="mt-3 font-medium text-gray-600">Liste vide pour cette semaine.</p>
          <p className="mt-1 text-sm text-gray-400">Planifie des repas, puis clique sur « Générer ».</p>
        </div>
      ) : (
        groupes.map((g) => (
          <section key={g.rayon} className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#8fb5a2]">{g.rayon}</h2>
            <ul className="flex flex-col gap-1">
              {g.items.map((item) => (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-[#A8E6CF]/15">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => cocher(item.id, e.target.checked)}
                      className="h-4 w-4 accent-[#4A6741]"
                    />
                    <span className={item.checked ? "text-sm text-gray-400 line-through" : "text-sm text-gray-700"}>
                      {item.affichage}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
