import { useState, useCallback, useRef } from "react";
import { SLOTS, type Slot } from "@/lib/plan";

export type EntryVue = {
  id: string;
  date: string;
  slot: Slot;
  servings: number;
  recipeId: string;
  title: string;
  order: number;
};

export type DragState = {
  entryId: string;
  startX: number;
  startY: number;
  currentSlot: Slot;
  currentOrder: number;
  currentDate: string;
  currentCellIndex: number; // Index in the flattened grid
  originalSlot: Slot;
  originalOrder: number;
  originalDate: string;
  originalCellIndex: number;
} | null;

export type UseDragRepasReturn = {
  dragState: DragState;
  startDrag: (entryId: string, clientX: number, clientY: number, currentEntry: EntryVue, allEntries: EntryVue[], dates: string[], slots: Slot[]) => void;
  moveDrag: (clientX: number, clientY: number) => void;
  endDrag: () => Promise<{ date: string; slot: Slot; order: number } | null>;
  cancelDrag: () => void;
};

const SLOT_ORDER = Object.fromEntries(
  SLOTS.map((s, i) => [s, i])
) as Record<Slot, number>;

const DATE_TO_INDEX = (dates: string[]) => Object.fromEntries(dates.map((d, i) => [d, i]));

const CELL_WIDTH = 300; // px par cellule (créneau) - test threshold: 200px no change, 400px = 1 cell
const CELL_HEIGHT = 100; // px par carte dans le stack - test: 100px = 1 order change

// Create a flattened grid of all cells in reading order: date0-slot0, date0-slot1, date0-slot2, date1-slot0...
function createCellGrid(dates: string[], slots: Slot[]): { date: string; slot: Slot }[] {
  const grid: { date: string; slot: Slot }[] = [];
  for (const date of dates) {
    for (const slot of SLOTS) { // Use canonical SLOTS order
      grid.push({ date, slot });
    }
  }
  return grid;
}

function findCellIndex(grid: { date: string; slot: Slot }[], date: string, slot: Slot): number {
  return grid.findIndex(c => c.date === date && c.slot === slot);
}

export function useDragRepas() {
  const [dragState, setDragState] = useState<DragState>(null);
  const dragStateRef = useRef<DragState>(null);
  const contextRef = useRef<{
    entries: EntryVue[];
    dates: string[];
    slots: Slot[];
    grid: { date: string; slot: Slot }[];
  } | null>(null);

  // Keep ref in sync with state
  dragStateRef.current = dragState;

  const getSlotIndex = (slot: string) => SLOT_ORDER[slot as Slot] ?? 0;
  const getDateIndex = (date: string, dates: string[]) => dates.indexOf(date);

  const computeTarget = useCallback((
    clientX: number,
    clientY: number,
    state: NonNullable<DragState>
  ) => {
    const { entries, grid } = contextRef.current ?? { entries: [], grid: [] };
    if (!grid.length || !entries.length) {
      return { currentSlot: state.currentSlot, currentOrder: state.currentOrder, currentDate: state.currentDate, currentCellIndex: state.currentCellIndex };
    }

    // Horizontal → changement de cellule dans la grille aplatie
    const deltaX = clientX - state.startX;
    const cellDeltaX = Math.floor(Math.abs(deltaX) / CELL_WIDTH) * (deltaX >= 0 ? 1 : -1);
    const targetCellIndex = Math.max(0, Math.min(grid.length - 1, state.currentCellIndex + cellDeltaX));
    const targetCell = grid[targetCellIndex];

    // Vertical → changement d'order dans le créneau cible
    const deltaY = clientY - state.startY;
    const entriesInTarget = entries
      .filter(e => e.slot === targetCell.slot && e.date.slice(0, 10) === targetCell.date.slice(0, 10))
      .sort((a, b) => a.order - b.order);
    const baseOrder = entriesInTarget.length > 0 ? entriesInTarget[0].order : 0;
    const orderDelta = Math.round(deltaY / CELL_HEIGHT);
    const targetOrder = Math.max(0, Math.min(entriesInTarget.length, baseOrder + orderDelta));

    return {
      currentSlot: targetCell.slot,
      currentOrder: targetOrder,
      currentDate: targetCell.date,
      currentCellIndex: targetCellIndex,
    };
  }, []);

  const startDrag = useCallback((
    entryId: string,
    clientX: number,
    clientY: number,
    currentEntry: EntryVue,
    allEntries: EntryVue[],
    dates: string[],
    slots: Slot[]
  ) => {
    const grid = createCellGrid(dates, slots);
    const cellIndex = findCellIndex(grid, currentEntry.date, currentEntry.slot);
    contextRef.current = { entries: allEntries, dates, slots, grid };
    const newState: DragState = {
      entryId,
      startX: clientX,
      startY: clientY,
      currentSlot: currentEntry.slot,
      currentOrder: currentEntry.order,
      currentDate: currentEntry.date,
      currentCellIndex: cellIndex,
      originalSlot: currentEntry.slot,
      originalOrder: currentEntry.order,
      originalDate: currentEntry.date,
      originalCellIndex: cellIndex,
    };
    dragStateRef.current = newState;
    setDragState(newState);
  }, []);

  const moveDrag = useCallback((
    clientX: number,
    clientY: number
  ) => {
    setDragState(prev => {
      if (!prev) return prev;
      const target = computeTarget(clientX, clientY, prev);
      const newState = { ...prev, ...target };
      dragStateRef.current = newState;
      return newState;
    });
  }, [computeTarget]);

  const endDrag = useCallback(async () => {
    // Use ref first, fallback to state closure (for test timing)
    const state = dragStateRef.current ?? dragState;
    setDragState(null);
    contextRef.current = null;
    
    if (!state) return null;

    const changed = state.currentCellIndex !== state.originalCellIndex ||
      state.currentOrder !== state.originalOrder;

    if (!changed) return null;

    return { date: state.currentDate, slot: state.currentSlot, order: state.currentOrder };
  }, [dragState]);

  const cancelDrag = useCallback(() => {
    setDragState(null);
    contextRef.current = null;
  }, []);

  return { dragState, startDrag, moveDrag, endDrag, cancelDrag };
}