/**
 * Dictionnaire ordonné des rayons : l'ordre de ce tableau définit l'ordre
 * d'affichage de la liste de courses.
 */
export const RAYONS = [
  "Fruits & légumes",
  "Crémerie",
  "Viandes & poissons",
  "Boulangerie",
  "Surgelés",
  "Boissons",
  "Épicerie",
  "Hygiène",
] as const;

export type Rayon = (typeof RAYONS)[number];

const MOTS_CLES: Record<Rayon, string[]> = {
  "Fruits & légumes": [
    "tomate", "carotte", "salade", "oignon", "ail", "échalote", "courgette", "aubergine",
    "poivron", "concombre", "épinard", "brocoli", "champignon", "pomme", "banane", "citron",
    "orange", "fraise", "framboise", "myrtille", "raisin", "poire", "mangue", "avocat",
    "céleri", "poireau", "navet", "potiron", "butternut", "haricot vert", "petit pois",
    "maïs", "basilic", "persil", "ciboulette", "menthe", "coriandre", "gingembre",
  ],
  Boulangerie: ["pain", "baguette", "brioche", "tortilla", "naan", "pita", "chapelure"],
  Crémerie: [
    "lait", "beurre", "crème", "yaourt", "fromage", "gruyère", "emmental", "mozzarella",
    "parmesan", "feta", "chèvre", "œuf", "oeuf", "ricotta", "mascarpone", "kiri",
  ],
  "Viandes & poissons": [
    "poulet", "boeuf", "bœuf", "veau", "porc", "agneau", "dinde", "canard", "saucisse",
    "lardon", "jambon", "steak", "côtelette", "saumon", "thon", "cabillaud", "lotte",
    "crevette", "moule", "sardine", "anchois", "fruits de mer",
  ],
  Surgelés: ["surgelé", "congelé", "glace", "glaçon", "frite"],
  Épicerie: [
    "farine", "sucre", "sel", "poivre", "huile", "vinaigre", "pâtes", "spaghetti", "riz",
    "quinoa", "boulgour", "lentille", "pois chiche", "haricot blanc", "haricot rouge",
    "conserv", "boîte de", "levure", "vanille", "cannelle", "paprika", "cumin", "curry",
    "muscade", "laurier", "thym", "romarin", "origan", "bouillon", "fond de", "sauce",
    "moutarde", "ketchup", "mayonnaise", "miel", "confiture", "chocolat", "cacao",
    "amande", "noisette", "noix", "pignon", "olive", "câpre", "lait de coco", "brique",
  ],
  Boissons: ["eau", "jus", "soda", "coca", "limonade", "vin", "bière", "sirop", "café", "thé", "infusion"],
  Hygiène: ["essuie-tout", "papier", "sopalin", "sac poubelle", "aluminium", "film", "vaisselle"],
};

export function mapToRayon(ingredientNom: string): string {
  const nom = ingredientNom.toLowerCase();
  for (const rayon of RAYONS) {
    if (MOTS_CLES[rayon].some((mot) => nom.includes(mot.trim()))) {
      return rayon;
    }
  }
  return "Épicerie";
}
