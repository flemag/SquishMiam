// Réconciliation pure entre les lignes existantes d'une liste de courses et la
// projection recalculée du plan. Aucun import : fonction 100 % testable.

export type SourceLigne = "PLAN" | "MANUEL";

export type LigneExistante = {
  id: string;
  nom: string;
  quantite: number | null;
  unite: string | null;
  rayon: string;
  checked: boolean;
  masquee: boolean;
  source: SourceLigne;
};

export type LigneProjetee = { nom: string; quantite: number | null; unite: string | null; rayon: string };

export type PlanReconciliation = {
  aCreer: LigneProjetee[];
  aMettreAJour: { id: string; quantite: number | null; rayon: string }[];
  aSupprimer: string[]; // ids
};

// Convention identique à aggregateGroceries et aux routes existantes.
function cleDeFusion(nom: string, unite: string | null): string {
  return `${nom.trim().toLowerCase()}|${unite ?? ""}`;
}

export function reconcilerListe(existantes: LigneExistante[], projection: LigneProjetee[]): PlanReconciliation {
  const plan: PlanReconciliation = { aCreer: [], aMettreAJour: [], aSupprimer: [] };

  // deux Maps par clé : lignes PLAN / lignes MANUELLES
  const planParCle = new Map<string, LigneExistante>();
  const manuellesParCle = new Map<string, LigneExistante>();
  for (const ligne of existantes) {
    const cle = cleDeFusion(ligne.nom, ligne.unite);
    if (ligne.source === "MANUEL") manuellesParCle.set(cle, ligne);
    else planParCle.set(cle, ligne);
  }

  // Passe 1 : la projection met à jour les lignes PLAN connues, sinon crée.
  // Les clés couvertes par une ligne MANUELLE sont bouclées (bouclier).
  const clesProjetees = new Set<string>();
  for (const ligne of projection) {
    const cle = cleDeFusion(ligne.nom, ligne.unite);
    clesProjetees.add(cle);
    if (manuellesParCle.has(cle)) continue;
    const existante = planParCle.get(cle);
    if (!existante) {
      plan.aCreer.push({ nom: ligne.nom, quantite: ligne.quantite, unite: ligne.unite, rayon: ligne.rayon });
    } else if (existante.quantite !== ligne.quantite || existante.rayon !== ligne.rayon) {
      plan.aMettreAJour.push({ id: existante.id, quantite: ligne.quantite, rayon: ligne.rayon });
    }
  }

  // Passe 2 : les lignes PLAN dont la clé a disparu de la projection sont purgées.
  for (const ligne of existantes) {
    if (ligne.source !== "PLAN") continue;
    if (!clesProjetees.has(cleDeFusion(ligne.nom, ligne.unite))) plan.aSupprimer.push(ligne.id);
  }

  return plan;
}
