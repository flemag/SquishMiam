"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { mapToRayon, RAYONS } from "@/lib/rayons";

export default function FormulaireArticle({
  weekStart,
  onFerme,
  onAjoute,
}: {
  weekStart: string;
  onFerme: () => void;
  onAjoute: (texte: string) => void;
}) {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [quantite, setQuantite] = useState("");
  const [unite, setUnite] = useState("");
  const [rayon, setRayon] = useState<string>(mapToRayon(""));
  const [rayonManuel, setRayonManuel] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function envoyer(e: FormEvent) {
    e.preventDefault();
    const nomPropre = nom.trim();
    if (!nomPropre) {
      setErreur("Nom requis");
      return;
    }

    // Le blur du nom n'est pas garanti (Entrée, touche « Go » du clavier mobile) :
    // le rayon automatique est résolu à l'envoi, pas seulement au blur. Un choix
    // manuel de l'utilisateur reste prioritaire, même si le nom change ensuite.
    const rayonFinal = rayonManuel ? rayon : mapToRayon(nomPropre);
    if (!rayonManuel) setRayon(rayonFinal);

    const body: {
      weekStart: string;
      nom: string;
      rayon: string;
      quantite?: number;
      unite?: string;
    } = { weekStart, nom: nomPropre, rayon: rayonFinal };

    const quantitePropre = quantite.trim().replace(",", ".");
    if (quantitePropre !== "") {
      const valeur = Number(quantitePropre);
      if (!Number.isFinite(valeur) || valeur <= 0) {
        setErreur("Quantité invalide");
        return;
      }
      body.quantite = valeur;
    }

    const unitePropre = unite.trim();
    if (unitePropre !== "") body.unite = unitePropre;

    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch("/api/courses/item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        onFerme();
        onAjoute("Article ajouté à la liste 🛒");
        router.refresh();
      } else {
        // 409 « Déjà dans la liste pour cette semaine » notamment : le
        // formulaire reste ouvert, la saisie est conservée.
        const data = await res.json().catch(() => ({}));
        setErreur(typeof data.error === "string" ? data.error : "Ajout impossible — réessaie.");
      }
    } catch {
      setErreur("Ajout impossible — réessaie.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <form onSubmit={envoyer} className="carte p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-foreground">Ajouter un article</h2>
      {erreur && <p className="mt-2 text-sm text-danger">{erreur}</p>}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-texte-doux sm:col-span-2">
          Nom
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            onBlur={() => {
              if (!rayonManuel) setRayon(mapToRayon(nom));
            }}
            required
            maxLength={60}
            placeholder="Ex. : tomates"
            className="champ min-h-11 w-full"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-texte-doux">
          Quantité
          <input
            type="number"
            min="0.01"
            step="any"
            inputMode="decimal"
            value={quantite}
            onChange={(e) => setQuantite(e.target.value)}
            placeholder="Optionnel"
            className="champ min-h-11 w-full"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-texte-doux">
          Unité
          <input
            value={unite}
            onChange={(e) => setUnite(e.target.value)}
            maxLength={20}
            placeholder="g, ml, pièce…"
            className="champ min-h-11 w-full"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-texte-doux sm:col-span-2">
          Rayon
          <select
            value={rayon}
            onChange={(e) => {
              setRayon(e.target.value);
              setRayonManuel(true);
            }}
            className="champ min-h-11 w-full"
          >
            {RAYONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" disabled={enCours} className="bouton min-h-11">
          {enCours ? "Ajout…" : "Ajouter"}
        </button>
        <button
          type="button"
          onClick={onFerme}
          disabled={enCours}
          className="bouton-secondaire min-h-11"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
