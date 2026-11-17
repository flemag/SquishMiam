import ChargementMiamz from "@/components/miamz/chargement";

export default function PlanLoading() {
  return (
    <main className="flex flex-col gap-4">
      <ChargementMiamz />
      <div className="carte flex flex-col gap-3 p-4">
        <div className="miamz-squelette h-6 w-2/3 rounded-full bg-gray-200" />
        <div className="miamz-squelette h-4 w-1/3 rounded-full bg-gray-200" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="carte h-28 p-2">
            <div className="miamz-squelette h-3 w-1/2 rounded-full bg-gray-200" />
          </div>
        ))}
      </div>
    </main>
  );
}
