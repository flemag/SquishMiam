"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMiamz } from "@/components/miamz/fournisseur";
import type { CategorieVue } from "@/lib/categories";
import { CATEGORIE_AUTRE } from "@/lib/categories";
import AssistantRecette from "./assistant-recette";
import type { RecetteExtraite } from "@/lib/import-recette";

const UNITES = ["g", "kg", "ml", "cl", "l", "pièce", "boîte"];

type LigneIngredient = { nom: string; quantite: string; unite: string };

export default function FormulaireRecette({
  categories: categoriesInitiales,
  portionsDefaut = 1,
}: {
  categories: CategorieVue[];
  portionsDefaut?: number;
}) {
  const router = useRouter();
  const { emettre } = useMiamz();
  const [title, setTitle] = useState("");
  const [servings, setServings] = useState(portionsDefaut);
  const [minutes, setMinutes] = useState("");
  const [tags, setTags] = useState("");
  const [ingredients, setIngredients] = useState<LigneIngredient[]>([
    { nom: "", quantite: "", unite: "g" },
  ]);
  const [steps, setSteps] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  // Catégorie
  const [categories, setCategories] = useState<CategorieVue[]>(categoriesInitiales);
  const [categorieId, setCategorieId] = useState(
    categories.find((c) => c.id === CATEGORIE_AUTRE)?.id ?? categories[0]?.id ?? ""
  );
  const [nouvelleCat, setNouvelleCat] = useState("");
  const [catPrecedente, setCatPrecedente] = useState(categorieId);
  const [creationCat, setCreationCat] = useState(false);
  const [erreurCat, setErreurCat] = useState<string | null>(null);

  // Importation par URL
  const [voletImport, setVoletImport] = useState(false);
  const [urlImport, setUrlImport] = useState("");
  const [importEnCours, setImportEnCours] = useState(false);
  const [erreurImport, setErreurImport] = useState<string | null>(null);
  const [succesImport, setSuccesImport] = useState(false);

  // Préremplir depuis un brouillon photo frigo (sessionStorage)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem("brouillonPhotoFrigo");
    if (!raw) return;
    try {
      const r = JSON.parse(raw);
      remplirDepuisRecette(r);
      sessionStorage.removeItem("brouillonPhotoFrigo");
      setMessage(null);
    } catch {
      // ignore
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Remplit le formulaire depuis une recette extraite (IA ou import URL). */
  function remplirDepuisRecette(r: RecetteExtraite) {
    if (r.title) setTitle(r.title);
    if (typeof r.servings === "number") setServings(r.servings);
    if (r.minutes) setMinutes(String(r.minutes));
    if (Array.isArray(r.tags) && r.tags.length > 0) setTags(r.tags.join(", "));
    if (Array.isArray(r.ingredients) && r.ingredients.length > 0) {
      setIngredients(
        r.ingredients.map((ing) => ({
          nom: ing.nom,
          quantite: ing.quantite !== undefined ? String(ing.quantite) : "",
          unite: ing.unite && UNITES.includes(ing.unite) ? ing.unite : "g",
        }))
      );
    }
    if (Array.isArray(r.steps) && r.steps.length > 0) {
      setSteps(r.steps.join("\n"));
    }
  }

  function ligne(index: number, champ: Partial<LigneIngredient>) {
    setIngredients((lignes) => lignes.map((l, i) => (i === index ? { ...l, ...champ } : l)));
  }

  async function creerCategorie() {
    const nom = nouvelleCat.trim();
    if (!nom) return;
    setCreationCat(true);
    setErreurCat(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.categorie) {
        const c: CategorieVue = { id: data.categorie.id, nom: data.categorie.nom };
        setCategories((prev) => {
          const sans = prev.filter((p) => p.id !== c.id);
          return [...sans, c].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
        });
        setCategorieId(c.id);
        setNouvelleCat("");
      } else {
        setErreurCat(data.error ?? "Création impossible — réessaie.");
      }
    } catch {
      setErreurCat("Création impossible — réessaie.");
    } finally {
      setCreationCat(false);
    }
  }

  async function importerUrl() {
    const url = urlImport.trim();
    if (!url) return;
    setImportEnCours(true);
    setErreurImport(null);
    setSuccesImport(false);
    try {
      const res = await fetch("/api/recipes/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.recette) {
        remplirDepuisRecette(data.recette);
        setSuccesImport(true);
        setUrlImport("");
      } else {
        setErreurImport(data.error ?? "Impossible d'importer cette recette.");
      }
    } catch {
      setErreurImport("Erreur réseau lors de l'import.");
    } finally {
      setImportEnCours(false);
    }
  }

  async function enregistrer() {
    const ingredientsParses = ingredients
      .filter((l) => l.nom.trim())
      .map((l) => ({
        nom: l.nom.trim(),
        quantite: l.quantite ? Number(l.quantite.replace(",", ".")) : undefined,
        unite: l.unite || undefined,
      }));

    setEnCours(true);
    setMessage(null);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          servings,
          minutes: minutes ? Number(minutes) : undefined,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          ingredients: ingredientsParses,
          steps: steps.split("\n").map((s) => s.trim()).filter(Boolean),
          categorieId: categorieId !== "__nouvelle" ? categorieId : undefined,
        }),
      });
      if (res.ok) {
        emettre("recette-creee");
        router.push("/recettes");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error ?? "Recette invalide — vérifie les champs.");
      }
    } catch {
      setMessage("Enregistrement impossible — réessaie.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-miamz-vert">Nouvelle recette</h1>

      {/* Assistant IA — Brouillon de recette */}
      <AssistantRecette onBrouillon={remplirDepuisRecette} />

      {/* Volet Importation par URL */}
      <div className="carte mb-6 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔗</span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Importer depuis le web</h2>
              <p className="text-xs text-texte-doux">Marmiton, 750g, CuisineAZ, blogs de cuisine...</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setVoletImport(!voletImport);
              setErreurImport(null);
              setSuccesImport(false);
            }}
            className="bouton-secondaire min-h-9 px-3 text-xs"
          >
            {voletImport ? "Fermer" : "Coller un lien"}
          </button>
        </div>

        {voletImport && (
          <div className="mt-3 flex flex-col gap-2 border-t border-bordure pt-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="url"
                value={urlImport}
                onChange={(e) => setUrlImport(e.target.value)}
                placeholder="https://www.marmiton.org/recettes/..."
                aria-label="URL de la recette à importer"
                className="champ min-w-0 flex-1"
                disabled={importEnCours}
              />
              <button
                type="button"
                onClick={importerUrl}
                disabled={!urlImport.trim() || importEnCours}
                className="bouton min-h-11 px-5 sm:min-h-9"
              >
                {importEnCours ? "Analyse…" : "Importer"}
              </button>
            </div>
            {erreurImport && <p className="text-xs text-danger">{erreurImport}</p>}
            {succesImport && (
              <p className="text-xs font-medium text-[#4A6741]">
                ✓ Recette importée avec succès ! Tu peux l&apos;ajuster ci-dessous avant d&apos;enregistrer.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="carte flex flex-col gap-5 p-6">
        <label className="flex flex-col gap-1 text-sm text-texte-doux">
          Titre
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Gratin de courgettes"
            className="champ"
          />
        </label>

        <div className="flex gap-4">
          <label className="flex flex-1 flex-col gap-1 text-sm text-texte-doux">
            Portions
            <input
              type="number"
              min={1}
              max={12}
              value={servings}
              onChange={(e) => setServings(Number(e.target.value))}
              className="champ"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm text-texte-doux">
            Minutes
            <input
              type="number"
              min={1}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="30"
              className="champ"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm text-texte-doux">
          Tags (séparés par des virgules)
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="végé, rapide, familial"
            className="champ"
          />
        </label>

        {/* Catégorie */}
        <div className="flex flex-col gap-1 text-sm text-texte-doux">
          Catégorie
          <select
            value={categorieId}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__nouvelle") {
                setCatPrecedente(categorieId);
              }
              setCategorieId(v);
              setErreurCat(null);
            }}
            aria-label="Catégorie"
            className="champ"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
            <option value="__nouvelle">＋ Nouvelle catégorie…</option>
          </select>
          {categorieId === "__nouvelle" && (
            <div className="mt-1 flex flex-wrap gap-2">
              <input
                value={nouvelleCat}
                onChange={(e) => setNouvelleCat(e.target.value)}
                placeholder="Nom de la catégorie"
                className="champ min-w-0 flex-1"
              />
              <button
                onClick={creerCategorie}
                disabled={!nouvelleCat.trim() || creationCat}
                className="bouton min-h-11"
              >
                {creationCat ? "Création…" : "Créer"}
              </button>
              <button
                onClick={() => {
                  setCategorieId(catPrecedente);
                  setNouvelleCat("");
                  setErreurCat(null);
                }}
                className="bouton-secondaire min-h-11"
              >
                Annuler
              </button>
            </div>
          )}
          {erreurCat && <p className="text-sm text-danger">{erreurCat}</p>}
        </div>

        <div className="flex flex-col gap-2 text-sm text-texte-doux">
          Ingrédients
          {ingredients.map((l, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={l.nom}
                onChange={(e) => ligne(i, { nom: e.target.value })}
                placeholder="Courgettes"
                className="champ min-w-0 flex-1"
              />
              <input
                value={l.quantite}
                onChange={(e) => ligne(i, { quantite: e.target.value })}
                placeholder="500"
                className="champ w-20 text-center"
              />
              <select
                value={l.unite}
                onChange={(e) => ligne(i, { unite: e.target.value })}
                className="champ"
              >
                {UNITES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <button
            onClick={() => setIngredients((l) => [...l, { nom: "", quantite: "", unite: "g" }])}
            className="self-start rounded-full px-3 py-1.5 text-sm text-[#4A6741] hover:bg-[#A8E6CF]/30"
          >
            + Ajouter un ingrédient
          </button>
        </div>

        <label className="flex flex-col gap-1 text-sm text-texte-doux">
          Étapes (une par ligne)
          <textarea
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            rows={4}
            placeholder={"Préchauffer le four…\nMélanger…"}
            className="champ py-2.5"
          />
        </label>

        {message && <p className="text-sm text-danger">{message}</p>}

        <button
          onClick={enregistrer}
          disabled={enCours || categorieId === "__nouvelle"}
          className="bouton"
        >
          {enCours ? "Enregistrement…" : "Enregistrer la recette"}
        </button>
      </div>
    </main>
  );
}
