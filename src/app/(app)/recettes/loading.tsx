import ChargementMiamz from "@/components/miamz/chargement";

export default function RecettesLoading() {
  return (
    <main className="flex flex-col gap-4">
      <ChargementMiamz />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="carte h-40 p-5">
            <div className="miamz-squelette h-5 w-2/3 rounded-full bg-gray-200" />
            <div className="miamz-squelette mt-2 h-4 w-1/3 rounded-full bg-gray-200" />
          </div>
        ))}
      </div>
    </main>
  );
}
