import ChargementMiamz from "@/components/miamz/chargement";

export default function CoursesLoading() {
  return (
    <main className="flex flex-col gap-6">
      <ChargementMiamz />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="carte p-5">
          <div className="miamz-squelette h-4 w-24 rounded-full bg-gray-200" />
          <div className="mt-3 flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <div
                key={j}
                className="miamz-squelette h-6 rounded-full bg-gray-200"
                style={{ width: `${88 - j * 9}%` }}
              />
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
