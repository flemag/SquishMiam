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
    <div className="rounded-3xl bg-white p-5 shadow-sm transition hover:shadow-md">
      <h3 className="font-semibold text-gray-800">{recette.title}</h3>
      <p className="mt-1 text-sm text-gray-500">
        {recette.servings} portion{recette.servings > 1 ? "s" : ""}
        {recette.minutes ? ` · ${recette.minutes} min` : ""}
      </p>
      {recette.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {recette.tags.map((t) => (
            <span key={t} className="rounded-full bg-[#A8E6CF]/40 px-2.5 py-0.5 text-xs text-[#2e5340]">
              {t}
            </span>
          ))}
        </div>
      )}
      <button
        onClick={supprimer}
        disabled={enCours}
        className="mt-4 text-xs text-[#B0413E]/70 hover:text-[#B0413E]"
      >
        {enCours ? "Suppression…" : "Supprimer"}
      </button>
    </div>
  );
}
