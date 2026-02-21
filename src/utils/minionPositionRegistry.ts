/**
 * Mutable position registry for minions — bypasses Zustand for per-frame
 * position/rotation updates so we avoid creating a new Map every frame.
 *
 * Minion useFrame hooks write here; collision resolution and targeting
 * queries read from here. The Zustand combatStore is only updated for
 * discrete state changes (spawning, attacking, dying).
 */

export interface MinionPosEntry {
  x: number;
  y: number;
  z: number;
  rotation: number;
  radius: number;
  mass: number;
  team: 'player' | 'enemy';
}

const positions = new Map<string, MinionPosEntry>();

export const minionPositions = {
  set(
    id: string,
    x: number, y: number, z: number,
    rotation: number,
    radius: number,
    mass: number,
    team: 'player' | 'enemy',
  ) {
    let entry = positions.get(id);
    if (!entry) {
      entry = { x, y, z, rotation, radius, mass, team };
      positions.set(id, entry);
    } else {
      entry.x = x;
      entry.y = y;
      entry.z = z;
      entry.rotation = rotation;
      entry.radius = radius;
      entry.mass = mass;
      entry.team = team;
    }
  },

  get(id: string): MinionPosEntry | undefined {
    return positions.get(id);
  },

  getAll(): Map<string, MinionPosEntry> {
    return positions;
  },

  remove(id: string) {
    positions.delete(id);
  },

  clear() {
    positions.clear();
  },
};
