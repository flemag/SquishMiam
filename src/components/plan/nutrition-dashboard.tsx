"use client";

import { agregerSemaine, objectifCalorique } from "@/lib/nutrition";

export default function NutritionDashboard({
  entries,
  goal,
}: {
  entries: { date: string; servings: number; nutrition: { calories: number; proteines: number; glucides: number; lipides: number } | null }[];
  goal: string;
}) {
  const jours = agregerSemaine(entries);
  if (jours.length === 0) return null;

  const totalCalories = jours.reduce((s, j) => s + j.calories, 0);
  const totalProteines = jours.reduce((s, j) => s + j.proteines, 0);
  const totalGlucides = jours.reduce((s, j) => s + j.glucides, 0);
  const totalLipides = jours.reduce((s, j) => s + j.lipides, 0);
  const moyCalories = Math.round(totalCalories / jours.length);
  const objectif = objectifCalorique(goal);

  return (
    <div className="carte p-4">
      <h3 className="text-sm font-semibold text-foreground">Nutrition de la semaine</h3>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-[#4A6741]">{moyCalories}</p>
          <p className="text-xs text-texte-doux">kcal/jour (moy.)</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-[#4A6741]">{Math.round(totalProteines / jours.length)}g</p>
          <p className="text-xs text-texte-doux">Protéines/jour</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-[#4A6741]">{Math.round(totalGlucides / jours.length)}g</p>
          <p className="text-xs text-texte-doux">Glucides/jour</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-[#4A6741]">{Math.round(totalLipides / jours.length)}g</p>
          <p className="text-xs text-texte-doux">Lipides/jour</p>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-texte-doux">
          <span>Objectif : {objectif} kcal/jour</span>
          <span>{Math.round((moyCalories / objectif) * 100)} %</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#A8E6CF]/30">
          <div
            className="h-full rounded-full bg-[#4A6741] transition-all"
            style={{ width: `${Math.min(100, (moyCalories / objectif) * 100)}%` }}
          />
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-1">
        {jours.map((j) => (
          <div key={j.date} className="flex items-center justify-between text-xs text-texte-doux">
            <span>{new Date(j.date + "T00:00:00Z").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })}</span>
            <span>{j.calories} kcal · P{j.proteines}g G{j.glucides}g L{j.lipides}g</span>
          </div>
        ))}
      </div>
    </div>
  );
}