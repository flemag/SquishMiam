import MiamzSvg from "./svg";

const MESSAGES = [
  "Miamz mijote…",
  "On fouette les œufs…",
  "On coupe les petits légumes…",
  "Ça chauffe !",
  "On dresse les assiettes…",
];

/**
 * Chargement Miamz (plan 2c) — composant serveur, aucun hook : rendu
 * uniquement côté serveur, aucun risque d'hydratation. Le message par défaut
 * est pioché via Date.now() (décision du design doc, plutôt que Math.random).
 */
export default function ChargementMiamz({ message }: { message?: string }) {
  const texte = message ?? MESSAGES[Date.now() % MESSAGES.length];
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-3 py-12">
      <MiamzSvg taille={72} pose="content" animation="miamz-attente 1.6s ease-in-out infinite" />
      <p className="text-sm text-texte-doux">{texte}</p>
    </div>
  );
}
