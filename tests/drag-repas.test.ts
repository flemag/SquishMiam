import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDragRepas, type EntryVue } from "@/lib/drag-repas";

// Mock des données minimales
const SLOTS = ["PETIT_DEJEUNER", "DEJEUNER", "DINER"] as const;
const DATES = ["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29"];
const ENTRY: EntryVue = { id: "e1", date: "2026-11-23", slot: "DINER", servings: 2, recipeId: "r1", title: "Plat", order: 0 };
const ENTRIES: EntryVue[] = [
  { ...ENTRY, id: "e1", order: 0 },
  { ...ENTRY, id: "e2", date: "2026-11-23", slot: "DINER", order: 1 },
  { ...ENTRY, id: "e3", date: "2026-11-23", slot: "DINER", order: 2 },
];

describe("useDragRepas", () => {
  it("startDrag initialise l'état avec la position courante", () => {
    const { result } = renderHook(() => useDragRepas());
    act(() => result.current.startDrag("e1", 100, 200, ENTRY, ENTRIES, DATES, SLOTS));
    expect(result.current.dragState).toMatchObject({
      entryId: "e1",
      currentSlot: "DINER",
      currentOrder: 0,
      currentDate: "2026-11-23",
    });
  });

  it("moveDrag horizontal change le créneau cible (clamp dans slots)", () => {
    const { result } = renderHook(() => useDragRepas());
    act(() => result.current.startDrag("e1", 100, 200, ENTRY, ENTRIES, DATES, SLOTS));
    // Déplacement vers la droite → slot suivant
    act(() => result.current.moveDrag(300, 200)); // ~200px droite
    expect(result.current.dragState?.currentSlot).toBe("DINER"); // encore DINER (seuil non franchi)
    act(() => result.current.moveDrag(500, 200)); // seuil franchi
    expect(result.current.dragState?.currentSlot).toBe("PETIT_DEJEUNER"); // jour suivant, premier slot (selon logique)
  });

  it("moveDrag vertical change l'order dans le créneau", () => {
    const { result } = renderHook(() => useDragRepas());
    act(() => result.current.startDrag("e1", 100, 200, ENTRY, ENTRIES, DATES, SLOTS));
    act(() => result.current.moveDrag(100, 300)); // 100px bas
    expect(result.current.dragState?.currentOrder).toBe(1); // inséré après e2
  });

  it("endDrag retourne les nouvelles valeurs si changé", async () => {
    const { result } = renderHook(() => useDragRepas());
    act(() => result.current.startDrag("e1", 100, 200, ENTRY, ENTRIES, DATES, SLOTS));
    act(() => result.current.moveDrag(100, 400)); // bas → order 2
    const res = await act(async () => await result.current.endDrag());
    expect(res).toEqual({ date: "2026-11-23", slot: "DINER", order: 2 });
  });

  it("endDrag retourne null si position inchangée", async () => {
    const { result } = renderHook(() => useDragRepas());
    act(() => result.current.startDrag("e1", 100, 200, ENTRY, ENTRIES, DATES, SLOTS));
    act(() => result.current.moveDrag(100, 200)); // pas de déplacement significatif
    const res = await act(async () => await result.current.endDrag());
    expect(res).toBeNull();
  });

  it("cancelDrag remet l'état à null", () => {
    const { result } = renderHook(() => useDragRepas());
    act(() => result.current.startDrag("e1", 100, 200, ENTRY, ENTRIES, DATES, SLOTS));
    act(() => result.current.cancelDrag());
    expect(result.current.dragState).toBeNull();
  });
});