"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CleVue = {
  id: string;
  code: string;
  durationDays: number | null;
  status: string;
  expiresAt: Date | string | null;
  activatedAt: Date | string | null;
  statut: string;
};

const DUREES: { label: string; value: number | null }[] = [
  { label: "7 jours", value: 7 },
  { label: "30 jours", value: 30 },
  { label: "90 jours", value: 90 },
  { label: "Illimitée", value: null },
];

const STATUT_STYLES: Record<string, string> = {
  inutilisee: "bg-[#A8E6CF] text-[#2e5340]",
  active: "bg-[#C9B6E4] text-[#43325e]",
  expiree: "bg-gray-200 text-gray-500",
  revoquee: "bg-[#FFB5C2] text-[#8c2f3f]",
};

export default function ClesAdmin({ initialKeys }: { initialKeys: CleVue[] }) {
  const router = useRouter();
  const [count, setCount] = useState(5);
  const [duree, setDuree] = useState<number | null>(30);
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function generer() {
    setEnCours(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, durationDays: duree }),
      });
      if (res.ok) {
        setMessage(`${count} clé(s) générée(s) ✨`);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error ?? "Erreur pendant la génération.");
      }
    } finally {
      setEnCours(false);
    }
  }

  async function revoquer(id: string) {
    await fetch(`/api/admin/keys/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-medium text-gray-700">Nouvelles clés</h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            Nombre
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-20 rounded-full border border-gray-200 px-3 py-2 text-center outline-none focus:border-[#A8E6CF]"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            Durée
            <select
              value={duree === null ? "illimitee" : duree}
              onChange={(e) => setDuree(e.target.value === "illimitee" ? null : Number(e.target.value))}
              className="rounded-full border border-gray-200 px-3 py-2 outline-none focus:border-[#A8E6CF]"
            >
              {DUREES.map((d) => (
                <option key={d.label} value={d.value === null ? "illimitee" : d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={generer}
            disabled={enCours}
            className="rounded-full bg-[#4A6741] px-5 py-2 font-medium text-white transition hover:bg-[#3d5535] disabled:opacity-50"
          >
            {enCours ? "Génération…" : "Générer"}
          </button>
          {message && <span className="text-sm text-[#4A6741]">{message}</span>}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-medium text-gray-700">Toutes les clés ({initialKeys.length})</h2>
        {initialKeys.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune clé pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Durée</th>
                  <th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2">Expire</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {initialKeys.map((k) => (
                  <tr key={k.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-mono text-xs">{k.code}</td>
                    <td className="px-3 py-2">{k.durationDays === null ? "∞" : `${k.durationDays} j`}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-3 py-1 text-xs ${STATUT_STYLES[k.statut] ?? "bg-gray-100"}`}>
                        {k.statut}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {k.status !== "REVOKED" && (
                        <button
                          onClick={() => revoquer(k.id)}
                          className="rounded-full px-3 py-1 text-xs text-[#B0413E] hover:bg-[#FFB5C2]/20"
                        >
                          Révoquer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
