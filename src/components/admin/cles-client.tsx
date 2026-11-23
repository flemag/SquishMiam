"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { messageErreur } from "@/lib/erreur-api";

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
  expiree: "bg-gray-200 text-texte-doux",
  revoquee: "bg-[#FFB5C2] text-[#8c2f3f]",
};

type Message = { texte: string; erreur: boolean };

export default function ClesAdmin({ initialKeys }: { initialKeys: CleVue[] }) {
  const router = useRouter();
  const [count, setCount] = useState(5);
  const [duree, setDuree] = useState<number | null>(30);
  const [message, setMessage] = useState<Message | null>(null);
  const [enCours, setEnCours] = useState(false);
  // Une seule révocation à la fois : la clé identifie la ligne en attente.
  const [revocation, setRevocation] = useState<string | null>(null);
  // Erreur de révocation rattachée à sa ligne : visible là où l'on a cliqué.
  const [erreurRevocation, setErreurRevocation] = useState<{ id: string; message: string } | null>(null);

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
        setMessage({ texte: `${count} clé(s) générée(s) ✨`, erreur: false });
        router.refresh();
      } else {
        setMessage({ texte: await messageErreur(res, "Erreur pendant la génération."), erreur: true });
      }
    } catch {
      setMessage({ texte: "Génération impossible — réessaie.", erreur: true });
    } finally {
      setEnCours(false);
    }
  }

  async function revoquer(id: string) {
    if (revocation !== null) return;
    setRevocation(id);
    setErreurRevocation(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        setErreurRevocation({ id, message: await messageErreur(res, "Révocation impossible — réessaie.") });
      }
    } catch {
      setErreurRevocation({ id, message: "Révocation impossible — réessaie." });
    } finally {
      setRevocation(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="carte p-6">
        <h2 className="mb-4 font-medium text-foreground">Nouvelles clés</h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-texte-doux">
            Nombre
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="champ w-20 text-center"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-texte-doux">
            Durée
            <select
              value={duree === null ? "illimitee" : duree}
              onChange={(e) => setDuree(e.target.value === "illimitee" ? null : Number(e.target.value))}
              className="champ"
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
            className="bouton"
          >
            {enCours ? "Génération…" : "Générer"}
          </button>
          {message && (
            <span
              role="status"
              aria-live="polite"
              className={`text-sm ${message.erreur ? "text-danger" : "text-[#4A6741]"}`}
            >
              {message.texte}
            </span>
          )}
        </div>
      </section>

      <section className="carte p-6">
        <h2 className="mb-4 font-medium text-foreground">Toutes les clés ({initialKeys.length})</h2>
        {initialKeys.length === 0 ? (
          <p className="text-sm text-texte-tres-doux">Aucune clé pour le moment.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {initialKeys.map((k) => (
              <li key={k.id} className="rounded-xl border border-bordure p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-all font-mono text-xs">{k.code}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-texte-doux">
                      <span
                        className={`rounded-full px-2 py-0.5 ${STATUT_STYLES[k.statut] ?? "bg-gray-100"}`}
                      >
                        {k.statut}
                      </span>
                      <span>{k.durationDays === null ? "Illimitée" : `${k.durationDays} j`}</span>
                      <span>
                        {k.expiresAt
                          ? `Expire le ${new Date(k.expiresAt).toLocaleDateString("fr-FR")}`
                          : "Sans expiration"}
                      </span>
                    </div>
                  </div>
                  {k.status !== "REVOKED" && (
                    <button
                      onClick={() => revoquer(k.id)}
                      disabled={revocation !== null}
                      className="min-h-11 shrink-0 rounded-full px-3 text-xs text-danger hover:bg-[#FFB5C2]/20 disabled:opacity-60"
                    >
                      {revocation === k.id ? "Révocation…" : "Révoquer"}
                    </button>
                  )}
                </div>
                {erreurRevocation?.id === k.id && (
                  <p role="status" aria-live="polite" className="mt-2 text-xs text-danger">
                    {erreurRevocation.message}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
