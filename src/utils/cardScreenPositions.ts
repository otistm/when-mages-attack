/**
 * Mutable screen position registry for card slots.
 * Updated every frame by CardSlotTracker; read by UI components on demand.
 * Avoids per-frame Zustand set() calls.
 */

export interface CardScreenPos {
  x: number;
  y: number;
}

const positions = new Map<string, CardScreenPos>();

function key(slotIndex: number, team: string): string {
  return `${team}-${slotIndex}`;
}

export const cardScreenPositions = {
  set(slotIndex: number, team: string, x: number, y: number) {
    let entry = positions.get(key(slotIndex, team));
    if (!entry) {
      entry = { x, y };
      positions.set(key(slotIndex, team), entry);
    } else {
      entry.x = x;
      entry.y = y;
    }
  },

  get(slotIndex: number, team: string): CardScreenPos | undefined {
    return positions.get(key(slotIndex, team));
  },

  clear() {
    positions.clear();
  },
};
