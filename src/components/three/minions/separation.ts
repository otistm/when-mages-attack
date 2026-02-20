/**
 * Minion collision resolution — hard constraint that prevents overlap.
 *
 * Reads live positions from the minionPositionRegistry (no Zustand access).
 * Uses a spatial hash grid for O(N) neighbor lookups instead of O(N²).
 */

import { minionPositions, MinionPosEntry } from '@/utils/minionPositionRegistry';

const COLLISION_RADIUS = 1.2;
const PUSH_STRENGTH = 1.6;
const PASSES = 2;

const MIN_DIST = COLLISION_RADIUS * 2;
const MIN_DIST_SQ = MIN_DIST * MIN_DIST;

const CELL_SIZE = MIN_DIST + 0.5;

const _grid = new Map<string, string[]>();

function cellKey(x: number, z: number): string {
  const cx = Math.floor(x / CELL_SIZE);
  const cz = Math.floor(z / CELL_SIZE);
  return `${cx},${cz}`;
}

/**
 * Build a spatial hash grid from all live positions.
 * Call once per frame before resolving individual minions.
 */
export function buildCollisionGrid(): void {
  _grid.clear();
  const all = minionPositions.getAll();
  all.forEach((entry, id) => {
    const key = cellKey(entry.x, entry.z);
    let bucket = _grid.get(key);
    if (!bucket) {
      bucket = [];
      _grid.set(key, bucket);
    }
    bucket.push(id);
  });
}

/**
 * Given a desired position, resolve collisions using the spatial hash grid.
 * Returns corrected [x, z].
 */
export function resolveCollisions(
  myId: string,
  desiredX: number,
  desiredZ: number,
): [number, number] {
  let x = desiredX;
  let z = desiredZ;

  for (let pass = 0; pass < PASSES; pass++) {
    const cx = Math.floor(x / CELL_SIZE);
    const cz = Math.floor(z / CELL_SIZE);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const bucket = _grid.get(`${cx + dx},${cz + dz}`);
        if (!bucket) continue;

        for (let i = 0; i < bucket.length; i++) {
          const otherId = bucket[i];
          if (otherId === myId) continue;

          const other = minionPositions.get(otherId);
          if (!other) continue;

          const ddx = x - other.x;
          const ddz = z - other.z;
          const distSq = ddx * ddx + ddz * ddz;

          if (distSq >= MIN_DIST_SQ) continue;

          if (distSq < 0.0001) {
            const angle = Math.random() * Math.PI * 2;
            x += Math.cos(angle) * MIN_DIST;
            z += Math.sin(angle) * MIN_DIST;
            continue;
          }

          const dist = Math.sqrt(distSq);
          const overlap = MIN_DIST - dist;
          const nx = ddx / dist;
          const nz = ddz / dist;

          x += nx * overlap * PUSH_STRENGTH;
          z += nz * overlap * PUSH_STRENGTH;
        }
      }
    }
  }

  return [x, z];
}
