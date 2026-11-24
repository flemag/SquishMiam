"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { messageErreur } from "@/lib/erreur-api";
import { MOTIFS_JETONS, LIBELLES_MOTIF } from "@/lib/jetons-admin";

export type UtilisateurJetonVue = {
  id: string;
  nom: string;
  email: string;
  role: string;
  tokens: number;
};

export type TransactionVue = {
  id: string;
  userId: string;
  nom: string;
  email: string;
  amount: number;
  reason: string;
  libelle: string;
  recette: string | null;
  createdAt: string;
};

export default function JetonsClient({
  utilisateurs: initiaux,
  transactions: initiales,
}: {
  utilisateurs: UtilisateurJetonVue[];
  transactions: TransactionVue[];
}) {
  const router = useRouter();
  const [recherche, setRecherche] = useState("");
  const [userId, setUserId] = useState("");
  const [montant, setMontant] = useState("");
  const [sens, setSens] = useState<"credit" | "debit">("credit");
  const [motif, setMotif] = useState<string>(MOTIFS_JETONS[0]);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);

  const utilisateurs = initiaux.filter((u) => {
    const q = recherche.trim().toLowerCase();
    if (!q) return true;
    return u.nom.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  async function appliquer() {
    if (!userId || !montant.trim() || enCours) return;
    setEnCours(true);
    setMessage(null);

    const abs = Math.abs(parseInt(montant, 10));
    const amount = sens === "debit" ? -abs : abs;

    try {
      const res = await fetch("/api/admin/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount, reason: motif }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({ texte: `Solde mis à jour : ${data.tokens} jeton(s).`, erreur: false });
        setMontant("");
        router.refresh();
      } else {
        setMessage({ texte: data.error ?? "Application impossible — réessaie.", erreur: true });
      }
    } catch {
      setMessage({ texte: "Application impossible — réessaie.", erreur: true });
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="carte rounded-2xl border border-[#A8E6CF]/50 bg-[#A8E6CF]/10 p-4 text-sm text-texte-doux">
        <p className="font-semibold text-foreground">Règles</p>
        <p>• 1 jeton par validation de recette, plafond 10.</p>
        <p>• Les gestes de l&apos;admin ne comptent pas dans le plafond.</p>
      </div>

      <div className="carte flex flex-col gap-3 p-4">
        <h2 className="text-sm font-semibold text-foreground">Créditer / débiter</h2>

        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un utilisateur…"
          aria-label="Rechercher un utilisateur"
          className="champ w-full rounded-full"
        />

        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          aria-label="Utilisateur"
          className="champ min-h-11"
        >
          <option value="">— Choisir —</option>
          {utilisateurs.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nom} ({u.tokens} jeton{u.tokens > 1 ? "s" : ""})
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSens("credit")}
            aria-pressed={sens === "credit"}
            className={`min-h-11 flex-1 rounded-xl px-3 text-sm font-medium transition ${
              sens === "credit" ? "bg-[#4A6741] text-white" : "border border-bordure bg-white text-texte-doux"
            }`}
          >
            + Créditer
          </button>
          <button
            type="button"
            onClick={() => setSens("debit")}
            aria-pressed={sens === "debit"}
            className={`min-h-11 flex-1 rounded-xl px-3 text-sm font-medium transition ${
              sens === "debit" ? "bg-[#B0413E] text-white" : "border border-bordure bg-white text-texte-doux"
            }`}
          >
            − Débiter
          </button>
        </div>

        <input
          type="number"
          min={1}
          max={1000}
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          placeholder="Montant"
          aria-label="Montant"
          className="champ"
        />

        <select
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          aria-label="Motif"
          className="champ min-h-11"
        >
          {MOTIFS_JETONS.map((m) => (
            <option key={m} value={m}>
              {LIBELLES_MOTIF[m]}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={appliquer}
          disabled={!userId || !montant.trim() || enCours}
          className="bouton min-h-11 w-full"
        >
          {enCours ? "Application…" : "Appliquer"}
        </button>

        {message && (
          <p className={`text-sm font-medium ${message.erreur ? "text-danger" : "text-[#4A6741]"}`}>
            {message.texte}
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Historique</h2>
        {initiales.length === 0 ? (
          <p className="text-sm text-texte-doux">Aucune transaction.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {initiales.map((t) => (
              <li key={t.id} className="carte flex flex-col gap-1 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{t.nom}</span>
                  <span
                    className={`text-sm font-semibold ${
                      t.amount > 0 ? "text-[#4A6741]" : "text-[#B0413E]"
                    }`}
                  >
                    {t.amount > 0 ? "+" : ""}
                    {t.amount}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-texte-doux">
                  <span>{t.libelle}</span>
                  {t.recette && <span>• {t.recette}</span>}
                  <span>• {new Date(t.createdAt).toLocaleString("fr-FR")}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}