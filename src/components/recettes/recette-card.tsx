type RecetteCarte = {
  id: string;
  title: string;
  servings: number;
  minutes: number | null;
  tags: string[];
};

/**
 * Carte recette : un unique <button> (plus d'interactif imbriqué) — le tap
 * ouvre la fiche en bottom sheet ; la suppression vit dans la fiche.
 */
export default function RecetteCard({ recette, onOuvrir }: { recette: RecetteCarte; onOuvrir: () => void }) {
  return (
    <button type="button" onClick={onOuvrir} className="carte w-full p-5 text-left transition">
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
    </button>
  );
}
