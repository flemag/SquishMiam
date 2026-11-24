"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { messageErreur } from "@/lib/erreur-api";
import type { RecetteExtraite } from "@/lib/import-recette";
import type { RecetteVue } from "@/components/recettes/recettes-client";

type Resultat = {
  ingredients: string[];
  recettesMatchees: { id: string; title: string; score: number; matches: string[] }[];
  brouillon: RecetteExtraite | null;
};

export default function PhotoFrigo({ recettes }: { recettes: RecetteVue[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  function compresserImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxDim = 800;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas non supporté"));
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.onerror = () => reject(new Error("Image invalide"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Lecture impossible"));
      reader.readAsDataURL(file);
    });
  }

  async function choisirFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErreur(null);
    setResultat(null);
    try {
      const compressed = await compresserImage(file);
      setImage(compressed);
      setPreview(compressed);
    } catch {
      setErreur("Impossible de lire cette image — réessaie.");
    }
  }

  async function analyser() {
    if (!image || enCours) return;
    setEnCours(true);
    setErreur(null);
    setResultat(null);
    try {
      const res = await fetch("/api/recipes/photo-frigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResultat(data);
      } else {
        setErreur(await messageErreur(res, "Miamz n'a pas réussi à lire ton frigo — réessaie."));
      }
    } catch {
      setErreur("Miamz n'a pas réussi à lire ton frigo — réessaie.");
    } finally {
      setEnCours(false);
    }
  }

  function reinitialiser() {
    setImage(null);
    setPreview(null);
    setResultat(null);
    setErreur(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function ouvrirRecette(id: string) {
    const r = recettes.find((x) => x.id === id);
    if (r) {
      router.push(`/recettes?recette=${id}`);
    }
  }

  function utiliserBrouillon(recette: RecetteExtraite) {
    sessionStorage.setItem("brouillonPhotoFrigo", JSON.stringify(recette));
    router.push("/recettes/nouvelle");
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={choisirFichier}
        className="hidden"
        aria-label="Choisir une photo de frigo"
      />

      {!preview ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="bouton-secondaire min-h-11 w-full"
        >
          📸 Photo de frigo
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <img
              src={preview}
              alt="Photo de ton frigo"
              className="w-full rounded-2xl object-cover max-h-64"
            />
            <button
              type="button"
              onClick={reinitialiser}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white text-sm"
              aria-label="Supprimer la photo"
            >
              ✕
            </button>
          </div>

          {!resultat && (
            <button
              type="button"
              onClick={analyser}
              disabled={enCours}
              className="bouton min-h-11 w-full"
            >
              {enCours ? "Miamz observe ton frigo…" : "Analyser"}
            </button>
          )}

          {erreur && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-danger">{erreur}</p>
              <button
                type="button"
                onClick={analyser}
                disabled={enCours}
                className="bouton-secondaire min-h-11 w-full"
              >
                Réessayer
              </button>
            </div>
          )}

          {resultat && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Ingrédients détectés</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {resultat.ingredients.map((ing, i) => (
                    <span key={i} className="puce">{ing}</span>
                  ))}
                </div>
              </div>

              {resultat.recettesMatchees.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Tes recettes qui matchent</h3>
                  <ul className="mt-2 flex flex-col gap-2">
                    {resultat.recettesMatchees.slice(0, 5).map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => ouvrirRecette(r.id)}
                          className="carte flex w-full items-center justify-between p-3 text-left hover:bg-[#A8E6CF]/10"
                        >
                          <span className="text-sm font-medium text-foreground">{r.title}</span>
                          <span className="text-xs text-[#4A6741] font-medium">
                            {Math.round(r.score * 100)} %
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {resultat.brouillon && (
                <div className="rounded-2xl border border-[#A8E6CF] bg-[#A8E6CF]/10 p-3">
                  <h3 className="text-sm font-semibold text-foreground">Brouillon proposé</h3>
                  <p className="mt-1 text-sm text-texte-doux">{resultat.brouillon.title}</p>
                  <button
                    type="button"
                    onClick={() => {
                      utiliserBrouillon(resultat.brouillon!);
                      reinitialiser();
                    }}
                    className="bouton mt-2 min-h-11 w-full"
                  >
                    Utiliser ce brouillon
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={reinitialiser}
                className="bouton-secondaire min-h-11 w-full"
              >
                Nouvelle photo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
