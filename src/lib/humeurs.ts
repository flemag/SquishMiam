/**
 * Catalogue des humeurs de Miamz — purement descriptif, aucun déclencheur ici
 * (le moteur d'humeur vit dans moteur-humeur.ts). Les nombres de variantes
 * correspondent aux keyframes CSS définies dans globals.css.
 */

export const HUMEURS = [
  "content",
  "fier",
  "decu",
  "affame",
  "repu",
  "endormi",
  "fete",
  "concentre",
  "calin",
  "taquin",
  "inquiet",
  "surpris",
  "motive",
  "relax",
] as const;

export type HumeurId = (typeof HUMEURS)[number];

export const VARIANTES_PAR_HUMEUR: Record<HumeurId, number> = {
  content: 4,
  fier: 3,
  decu: 3,
  affame: 3,
  repu: 3,
  endormi: 3,
  fete: 4,
  concentre: 3,
  calin: 3,
  taquin: 3,
  inquiet: 3,
  surpris: 3,
  motive: 3,
  relax: 4,
};

const MESSAGES: Record<HumeurId, string[]> = {
  content: [
    "Qu'est-ce qu'on cuisine aujourd'hui ?",
    "Tout roule, j'adore cette ambiance !",
    "Ton frigo et moi, on veille sur toi.",
    "Une petite faim de bien manger ?",
  ],
  fier: [
    "Regarde cette semaine, c'est du grand art !",
    "Je suis si fier de nous !",
    "On gère la cuisine comme des chefs.",
  ],
  decu: [
    "Pas grave, on retente demain ?",
    "Bon… ce n'était pas notre jour. Ça arrive aux meilleurs !",
    "Je ne juge pas. Enfin si, un peu. Mais gentiment.",
  ],
  affame: [
    "On mange quoi ce soir ? J'ai UNE idée…",
    "Mon riz grésille d'impatience !",
    "Planifie-moi un truc, je meurs de faim (moralement).",
  ],
  repu: [
    "Mmmh… quel bon repas.",
    "Je fais une sieste digestive, tu gères ?",
    "Ça, c'était bon. Bravo le chef.",
  ],
  endormi: [
    "Zzz… pense à demain, je regarde.",
    "Le four est éteint, moi aussi.",
    "Bonne nuit… les restes veillent.",
  ],
  fete: [
    "SEMAINE COMPLÈTE ! Danse du grain de riz !",
    "Tous les repas de la semaine, je folle !",
    "Tu as tué la charge mentale ! Confettis de sésame !",
  ],
  concentre: [
    "Je réfléchis… laisse-moi deux secondes.",
    "Hmm, ça se planifie sérieusement.",
    "Chut, je calcule les portions.",
  ],
  calin: [
    "Viens là, câlin de boulette.",
    "Tu fais de ton mieux, et ça se voit.",
    "Je suis là, quoi qu'il arrive.",
  ],
  taquin: [
    "Encore des pâtes ? Numéroté et archi-connu !",
    "Ohé, tu as coché ça à la vitesse de l'éclair.",
    "Je ne dirai rien sur le Nutella. Presque rien.",
  ],
  inquiet: [
    "Il me semble qu'un produit frôle sa date limite…",
    "Je suis sûr qu'on peut éviter ce gaspillage.",
    "Chut… tu as pensé au budget de la semaine ?",
  ],
  surpris: [
    "Oh ! Je ne m'y attendais pas !",
    "Wahou, quelle nouvelliste !",
    "Ça, c'est inattendu. J'adore !",
  ],
  motive: [
    "Nouvelle recette ! On la teste ce soir ?",
    "Hâte de la voir en vrai !",
    "Ajoutée au bloc-notes, chef !",
  ],
  relax: [
    "Profite, la semaine est bien partie.",
    "Coin repos : thyms et lavande.",
    "Respire, je garde la cuisine.",
  ],
};

function pick<T>(tableau: readonly T[], graine: number): T {
  const i = ((graine % tableau.length) + tableau.length) % tableau.length;
  return tableau[i];
}

export function pickVariante(humeur: HumeurId, graine: number): number {
  const n = VARIANTES_PAR_HUMEUR[humeur];
  return ((graine % n) + n) % n;
}

export function pickMessage(humeur: HumeurId, graine: number): string {
  return pick(MESSAGES[humeur], graine);
}
