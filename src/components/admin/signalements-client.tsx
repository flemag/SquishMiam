"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { messageErreur } from "@/lib/erreur-api";
import FeuilleModale from "@/components/ui/feuille-modale";

export type ReportAdminVue = {
  id: string;
  reason: string;
  detail: string | null;
  status: "PENDING" | "REVIEWED" | "DISMISSED";
  createdAt: string;
  recipe: { id: string; title: string; createdById: string; createdBy: { name: string | null } };
  reporter: { id: string; name: string | null; email: string | null };
};

type Dialogue = { type: "supprimer"; report: ReportAdminVue } | null;

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  REVIEWED: "Revu",
  DISMISSED: "Rejeté",
  all: "Tous",
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-[#FFB5C2]/20 text-[#8c2f3f]",
  REVIEWED: "bg-[#A8E6CF]/20 text-[#2e5340]",
  DISMISSED: "bg-[#C9B6E4]/20 text-[#43325e]",
  all: "bg-[#C9B6E4]/20 text-[#43325e]",
};

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  "inapproprié": "Contenu inapproprié",
  autre: "Autre",
};

export default function SignalementsClient() {
  const router = useRouter();
  const [statusFiltre, setStatusFiltre] = useState<"PENDING" | "REVIEWED" | "DISMISSED" | "all">("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [dialogue, setDialogue] = useState<Dialogue>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);

  const [reports, setReports] = useState<
    (ReportAdminVue & { recipeTitle: string; reporterName: string | null })[]
  >([]);

  const loadReports = async (pageNum: number, append = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pageNum.toString(), limit: "20" });
      if (statusFiltre !== "all") params.set("status", statusFiltre);
      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (append) {
          setReports((prev) => [...prev, ...data.reports]);
        } else {
          setReports(data.reports);
        }
        setPage(data.pagination.page);
        setHasMore(data.pagination.page < data.pagination.totalPages);
      } else {
        setErreur(await messageErreur(res, "Impossible de charger les signalements"));
      }
    } catch {
      setErreur("Impossible de charger les signalements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports(1, false);
  }, [statusFiltre]);

  const handleStatusChange = async (reportId: string, newStatus: "REVIEWED" | "DISMISSED") => {
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setMessage({ texte: `Signalement ${newStatus === "REVIEWED" ? "revu" : "rejeté"}`, erreur: false });
        loadReports(1, false);
      } else {
        setErreur(await messageErreur(res, "Impossible de changer le statut"));
      }
    } catch {
      setErreur("Impossible de changer le statut");
    } finally {
      setEnCours(false);
    }
  };

  const ouvrirSupprimer = (report: ReportAdminVue) => {
    setDialogue({ type: "supprimer", report });
  };

  const supprimer = async () => {
    if (!dialogue || dialogue.type !== "supprimer") return;
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/admin/reports/${dialogue.report.id}`, { method: "DELETE" });
      if (res.ok) {
        setMessage({ texte: `Signalement et recette « ${dialogue.report.recipe.title} » supprimés`, erreur: false });
        setDialogue(null);
        loadReports(1, false);
      } else {
        setErreur(await messageErreur(res, "Suppression impossible"));
      }
    } catch {
      setErreur("Suppression impossible — réessaie.");
    } finally {
      setEnCours(false);
    }
  };

  const fermer = () => {
    if (enCours) return;
    setDialogue(null);
    setErreur(null);
  };

  return (
    <div>
      {/* Filtre status */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "PENDING", "REVIEWED", "DISMISSED"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFiltre(s)}
            aria-pressed={statusFiltre === s}
            className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-medium transition ${
              statusFiltre === s
                ? STATUS_STYLES[s]
                : "border border-bordure bg-white text-texte-doux hover:bg-[#A8E6CF]/30"
            }`}
          >
            {s === "all" ? "Tous" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {message && (
        <div role="status" aria-live="polite" className={`mb-4 text-sm ${message.erreur ? "text-danger" : "text-[#4A6741]"} `}>
          {message.texte}
        </div>
      )}

      {reports.length === 0 ? (
        <p className="text-sm text-texte-tres-doux">Aucun signalement.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reports.map((r) => (
            <li key={r.id} className="carte p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex flex-col gap-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{r.recipe.title}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[r.status]}`}
                    >
                      {STATUS_LABELS[r.status]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-texte-doux">
                    <span>Raison : {REASON_LABELS[r.reason]}</span>
                    <span>Par {r.reporter.name ?? r.reporter.email}</span>
                    <span>{new Date(r.createdAt).toLocaleDateString("fr-FR")}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => handleStatusChange(r.id, "REVIEWED")}
                        disabled={enCours}
                        className="bouton min-h-11 shrink-0"
                      >
                        Marquer comme revu
                      </button>
                      <button
                        onClick={() => handleStatusChange(r.id, "DISMISSED")}
                        disabled={enCours}
                        className="bouton-secondaire min-h-11 shrink-0"
                      >
                        Rejeter
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => ouvrirSupprimer(r)}
                    disabled={enCours}
                    className="min-h-11 rounded-full px-3 text-sm text-danger hover:bg-[#FFB5C2]/20 disabled:opacity-60"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
              {dialogue?.type === "supprimer" && dialogue.report.id === r.id && (
                <p role="status" aria-live="polite" className="mt-2 text-xs text-danger">
                  Confirmation : supprimer la recette « {r.recipe.title} » et le signalement ?
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasMore && !loading && (
        <div className="mt-4">
          <button onClick={() => loadReports(page + 1, true)} className="bouton-secondaire w-full min-h-11">
            Voir plus
          </button>
        </div>
      )}

      {dialogue?.type === "supprimer" && (
        <FeuilleModale
          ouvert
          onFermer={() => { setDialogue(null); }}
          titre="Supprimer recette et signalement"
          footer={
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setDialogue(null)} disabled={enCours} className="bouton-secondaire min-h-11 flex-1">
                Annuler
              </button>
              <button type="button" onClick={supprimer} disabled={enCours} className="bouton-danger min-h-11 flex-1">
                {enCours ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          }
        >
          <p className="text-sm text-texte-doux">
            Supprimer la recette « {dialogue.report.recipe.title} » et son signalement ? Cette action est irréversible.
          </p>
          {erreur && <p className="mt-2 text-sm text-danger">{erreur}</p>}
        </FeuilleModale>
      )}

      {message && (
        <div role="status" aria-live="polite" className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded-xl text-sm ${message.erreur ? "bg-danger text-white" : "bg-[#4A6741] text-white"}`}>
          {message.texte}
        </div>
      )}
    </div>
  );
}