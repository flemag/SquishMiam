import { formatDateIso, weekStart } from "@/lib/plan";

export type ActiviteSemaine = {
  debut: string;
  inscriptions: number;
  recettes: number;
  cles: number;
};

export type EvenementsActivite = {
  inscriptions: readonly Date[];
  recettes: readonly Date[];
  cles: readonly Date[];
};

export function regrouperActiviteParSemaine(
  evenements: EvenementsActivite,
  nbSemaines: number,
  maintenant: Date
): ActiviteSemaine[] {
  if (nbSemaines <= 0) return [];

  const courante = weekStart(maintenant);
  const semaines: ActiviteSemaine[] = [];
  const index = new Map<string, number>();

  for (let i = nbSemaines - 1; i >= 0; i--) {
    const debut = new Date(courante);
    debut.setUTCDate(debut.getUTCDate() - i * 7);
    const cle = formatDateIso(debut);
    index.set(cle, semaines.length);
    semaines.push({ debut: cle, inscriptions: 0, recettes: 0, cles: 0 });
  }

  function compter(dates: readonly Date[], champ: "inscriptions" | "recettes" | "cles") {
    for (const date of dates) {
      const i = index.get(formatDateIso(weekStart(date)));
      if (i !== undefined) semaines[i][champ] += 1;
    }
  }

  compter(evenements.inscriptions, "inscriptions");
  compter(evenements.recettes, "recettes");
  compter(evenements.cles, "cles");
  return semaines;
}
