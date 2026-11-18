"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMiamz } from "@/components/miamz/fournisseur";
import { formatQuantite } from "@/lib/courses";
import { RAYONS } from "@/lib/rayons";
import FormulaireArticle from "@/components/courses/formulaire-article";

type ItemVue = {
  id: string;
  nom: string;
  quantite: number | null;
  unite: string | null;
  rayon: string;
  source: "PLAN" | "MANUEL";
  checked: boolean;
};

type Edition = {
  id: string;
  nom: string;
  unite: string;
  rayon: string;
  quantite: string;
  source: ItemVue["source"];
};

type Message = { texte: string; erreur: boolean };

const libelle = (item: ItemVue) =>
  item.quantite !== null ? `${item.nom} · ${formatQuantite(item.quantite, item.unite)}` : item.nom;

async function erreurDe(res: Response, defaut: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return typeof data.error === "string" ? data.error : defaut;
}

export default function ListeCourses({
  weekStart,
  groupes,
  masquees,
}: {
  weekStart: string;
  groupes: { rayon: string; items: ItemVue[] }[];
  masquees: ItemVue[];
}) {
  const router = useRouter();
  const { emettre } = useMiamz();
  // Une seule action réseau à la fois : la clé identifie le contrôle en attente.
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [edition, setEdition] = useState<Edition | null>(null);
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [masqueesOuvertes, setMasqueesOuvertes] = useState(false);

  async function generer() {
    setPending("generation");
    setMessage(null);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage({
          texte:
            data.ajoutes > 0
              ? `${data.ajoutes} article(s) ajouté(s) 🛒`
              : "Rien de nouveau — la liste est à jour !",
          erreur: false,
        });
        router.refresh();
      } else {
        setMessage({ texte: "Génération impossible — as-tu planifié ta semaine ?", erreur: true });
      }
    } catch {
      setMessage({ texte: "Génération impossible — réessaie.", erreur: true });
    } finally {
      setPending(null);
    }
  }

  async function cocher(id: string, checked: boolean) {
    setPending(`coche:${id}`);
    try {
      const res = await fetch(`/api/courses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked }),
      });
      if (res.ok && checked) emettre("course-cochee");
      if (!res.ok) {
        setMessage({ texte: await erreurDe(res, "Modification impossible — réessaie."), erreur: true });
      }
      router.refresh();
    } catch {
      setMessage({ texte: "Modification impossible — réessaie.", erreur: true });
    } finally {
      setPending(null);
    }
  }

  async function supprimer(id: string) {
    setPending(`suppression:${id}`);
    setMessage(null);
    try {
      const res = await fetch(`/api/courses/${id}`, { method: "DELETE" });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage({
          texte:
            data.traitement === "masquee"
              ? "Article masqué — retrouve-le en bas de la liste"
              : "Article supprimé",
          erreur: false,
        });
        router.refresh();
      } else {
        setMessage({ texte: await erreurDe(res, "Suppression impossible — réessaie."), erreur: true });
      }
    } catch {
      setMessage({ texte: "Suppression impossible — réessaie.", erreur: true });
    } finally {
      setPending(null);
    }
  }

  function ouvrirEdition(item: ItemVue) {
    setMessage(null);
    setEdition({
      id: item.id,
      nom: item.nom,
      unite: item.unite ?? "",
      rayon: item.rayon,
      quantite: item.quantite !== null ? String(item.quantite) : "",
      source: item.source,
    });
  }

  async function enregistrer() {
    if (!edition) return;

    const data: { quantite?: number | null; nom?: string; unite?: string; rayon?: string } = {};
    const quantite = edition.quantite.trim().replace(",", ".");
    if (quantite === "") {
      data.quantite = null;
    } else {
      const valeur = Number(quantite);
      if (!Number.isFinite(valeur) || valeur <= 0) {
        setMessage({ texte: "Quantité invalide", erreur: true });
        return;
      }
      data.quantite = valeur;
    }

    // Une ligne du plan ne peut changer que sa quantité : on n'envoie jamais
    // nom/unité/rayon, l'API les refuserait avec un 400.
    if (edition.source === "MANUEL") {
      const nom = edition.nom.trim();
      if (!nom) {
        setMessage({ texte: "Nom requis", erreur: true });
        return;
      }
      data.nom = nom;
      data.unite = edition.unite.trim();
      data.rayon = edition.rayon;
    }

    setPending(`edition:${edition.id}`);
    setMessage(null);
    try {
      const res = await fetch(`/api/courses/${edition.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setEdition(null);
        setMessage({ texte: "Article enregistré", erreur: false });
        router.refresh();
      } else {
        // 409 « Déjà dans la liste pour cette semaine » notamment : on garde le
        // formulaire ouvert pour que la saisie ne soit pas perdue.
        setMessage({ texte: await erreurDe(res, "Enregistrement impossible — réessaie."), erreur: true });
      }
    } catch {
      setMessage({ texte: "Enregistrement impossible — réessaie.", erreur: true });
    } finally {
      setPending(null);
    }
  }

  async function reveler(id: string) {
    setPending(`reaffichage:${id}`);
    setMessage(null);
    try {
      const res = await fetch(`/api/courses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masquee: false }),
      });
      if (res.ok) {
        setMessage({ texte: "Article réaffiché", erreur: false });
        router.refresh();
      } else {
        setMessage({ texte: await erreurDe(res, "Réaffichage impossible — réessaie."), erreur: true });
      }
    } catch {
      setMessage({ texte: "Réaffichage impossible — réessaie.", erreur: true });
    } finally {
      setPending(null);
    }
  }

  function articleAjoute(texte: string) {
    setMessage({ texte, erreur: false });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={generer}
          disabled={pending !== null}
          className="bouton"
        >
          {pending === "generation" ? "Génération…" : "Générer depuis le plan de la semaine"}
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

      {groupes.length === 0 ? (
        <div className="carte p-10 text-center">
          <div className="text-4xl">🛒</div>
          <p className="mt-3 font-medium text-texte-doux">Liste vide pour cette semaine.</p>
          <p className="mt-1 text-sm text-texte-tres-doux">Planifie des repas, puis clique sur « Générer ».</p>
        </div>
      ) : (
        groupes.map((g) => (
          <details key={g.rayon} open className="carte group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-5 py-3 [&::-webkit-details-marker]:hidden">
              <span className="text-sm font-semibold uppercase tracking-wide text-[#8fb5a2]">
                {g.rayon} · {g.items.filter((i) => i.checked).length}/{g.items.length}
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-texte-doux transition-transform group-open:rotate-180"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <ul className="flex flex-col gap-1 px-5 pb-4">
              {g.items.map((item) => {
                const enEdition = edition?.id === item.id;
                return (
                  <li key={item.id} className="border-b border-black/5 last:border-b-0">
                    <div className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-[#A8E6CF]/15">
                      <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={(e) => cocher(item.id, e.target.checked)}
                          disabled={pending !== null}
                          aria-label={`Cocher ${item.nom}`}
                          className="h-4 w-4 shrink-0 accent-[#4A6741]"
                        />
                        <span
                          className={
                            item.checked
                              ? "text-sm text-texte-tres-doux line-through"
                              : "text-sm text-foreground"
                          }
                        >
                          {libelle(item)}
                        </span>
                      </label>
                      {pending !== `suppression:${item.id}` && (
                        <button
                          type="button"
                          onClick={() => (enEdition ? setEdition(null) : ouvrirEdition(item))}
                          disabled={pending !== null}
                          aria-label={enEdition ? `Fermer l'édition de ${item.nom}` : `Modifier ${item.nom}`}
                          aria-expanded={enEdition}
                          className="bouton-secondaire h-11 w-11 shrink-0 px-0 text-base"
                        >
                          ✎
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => supprimer(item.id)}
                        disabled={pending !== null}
                        aria-label={`Supprimer ${item.nom}`}
                        className={
                          pending === `suppression:${item.id}`
                            ? "bouton-danger h-11 shrink-0 px-3"
                            : "bouton-danger h-11 w-11 shrink-0 px-0"
                        }
                      >
                        {pending === `suppression:${item.id}` ? "Suppression…" : "✕"}
                      </button>
                    </div>

                    {enEdition && edition && (
                      <div className="m-2 rounded-xl border border-black/10 p-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="flex flex-col gap-1 text-xs font-medium text-texte-doux">
                            Quantité
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              inputMode="decimal"
                              value={edition.quantite}
                              onChange={(e) => setEdition({ ...edition, quantite: e.target.value })}
                              disabled={pending !== null}
                              placeholder="Optionnel"
                              className="champ min-h-11 w-full"
                            />
                          </label>

                          {edition.source === "MANUEL" && (
                            <>
                              <label className="flex flex-col gap-1 text-xs font-medium text-texte-doux">
                                Nom
                                <input
                                  value={edition.nom}
                                  onChange={(e) => setEdition({ ...edition, nom: e.target.value })}
                                  disabled={pending !== null}
                                  maxLength={60}
                                  className="champ min-h-11 w-full"
                                />
                              </label>
                              <label className="flex flex-col gap-1 text-xs font-medium text-texte-doux">
                                Unité
                                <input
                                  value={edition.unite}
                                  onChange={(e) => setEdition({ ...edition, unite: e.target.value })}
                                  disabled={pending !== null}
                                  maxLength={20}
                                  placeholder="g, ml, pièce…"
                                  className="champ min-h-11 w-full"
                                />
                              </label>
                              <label className="flex flex-col gap-1 text-xs font-medium text-texte-doux">
                                Rayon
                                <select
                                  value={edition.rayon}
                                  onChange={(e) => setEdition({ ...edition, rayon: e.target.value })}
                                  disabled={pending !== null}
                                  className="champ min-h-11 w-full"
                                >
                                  {RAYONS.map((rayon) => (
                                    <option key={rayon} value={rayon}>
                                      {rayon}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </>
                          )}
                        </div>

                        {edition.source === "PLAN" && (
                          <p className="mt-2 text-xs text-texte-doux">
                            Article du planning — seule la quantité est modifiable
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={enregistrer}
                            disabled={pending !== null}
                            className="bouton min-h-11"
                          >
                            {pending === `edition:${edition.id}` ? "Enregistrement…" : "Enregistrer"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEdition(null)}
                            disabled={pending !== null}
                            className="bouton-secondaire min-h-11"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </details>
        ))
      )}

      <div>
        {ajoutOuvert ? (
          <FormulaireArticle
            weekStart={weekStart}
            onFerme={() => setAjoutOuvert(false)}
            onAjoute={articleAjoute}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setMessage(null);
              setAjoutOuvert(true);
            }}
            disabled={pending !== null}
            className="bouton min-h-11"
          >
            + Ajouter un article
          </button>
        )}
      </div>

      {masquees.length > 0 && (
        <section className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setMasqueesOuvertes((ouvert) => !ouvert)}
            disabled={pending !== null}
            aria-expanded={masqueesOuvertes}
            className="bouton-secondaire min-h-11 self-start"
          >
            {masqueesOuvertes
              ? "masquer"
              : `${masquees.length} article(s) masqué(s) — afficher`}
          </button>

          {masqueesOuvertes && (
            <div className="carte p-3">
              <ul className="flex flex-col gap-1">
                {masquees.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-2 py-1.5"
                  >
                    <span className="min-w-0 flex-1 text-sm text-texte-doux">{libelle(item)}</span>
                    <button
                      type="button"
                      onClick={() => reveler(item.id)}
                      disabled={pending !== null}
                      aria-label={`Réafficher ${item.nom}`}
                      className="bouton-secondaire min-h-11 shrink-0"
                    >
                      {pending === `reaffichage:${item.id}` ? "Réaffichage…" : "Réafficher"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
