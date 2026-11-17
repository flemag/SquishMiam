"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RecetteResume = {
  id: string;
  title: string;
  servings: number;
  minutes: number | null;
  tags: string[];
};

export default function RecetteCard({ recette }: { recette: RecetteResume }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);

  async function supprimer() {
    setEnCours(true);
    await fetch(`/api/recipes/${recette.id}`, { method: "DELETE" });
    router.refresh();
    setEnCours(false);
  }

  return (
    <div className="carte p-5 transition">
      <h3 className="font-semibold text-foreground">{recette.title}</h3>
      <p className="mt-1 text-sm text-texte-doux">
        {recette.servings} portion{recette.servings > 1 ? "s" : ""}
        {recette.minutes ? ` · ${recette.minutes} min` : ""}
      </p>
      {recette.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {recette.tags.map((t) => (
            <span key={t} className="puce">
              {t}
            </span>
          ))}
        </div>
      )}
      <button
        onClick={supprimer}
        disabled={enCours}
        className="mt-4 text-xs text-danger/70 hover:text-danger"
      >
        {enCours ? "Suppression…" : "Supprimer"}
      </button>
    </div>
  );
}
