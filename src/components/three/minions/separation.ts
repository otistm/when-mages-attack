/**
 * Minion collision resolution — per-unit radii, mass-weighted push,
 * team-aware separation, and arena boundary clamping.
 *
 * Reads live positions (including radius, mass, team) from the
 * minionPositionRegistry. Uses a spatial hash grid for O(N) lookups.
 */

import { minionPositions } from '@/utils/minionPositionRegistry';
import { ARENA_BOUNDS } from '@/types';

const PUSH_STRENGTH = 2.0;
const PASSES = 3;

/**
 * Same-team units get full push so allies spread out.
 * Cross-team units get slightly reduced push but still prevent clipping.
 */
const ALLY_PUSH = 1.0;
const ENEMY_PUSH = 0.7;

const MAX_RADIUS = 2.5;
const CELL_SIZE = MAX_RADIUS * 2 + 0.5;

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
 * Given a desired position, resolve collisions using per-unit radii,
 * mass-weighted displacement, and team-aware push factors.
 * Returns corrected [x, z] clamped to arena bounds.
 */
export function resolveCollisions(
  myId: string,
  desiredX: number,
  desiredZ: number,
): [number, number] {
  let x = desiredX;
  let z = desiredZ;

  const me = minionPositions.get(myId);
  if (!me) return [x, z];

  const myRadius = me.radius;
  const myMass = me.mass;
  const myTeam = me.team;

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

          const minDist = myRadius + other.radius;
          const minDistSq = minDist * minDist;

          const ddx = x - other.x;
          const ddz = z - other.z;
          const distSq = ddx * ddx + ddz * ddz;

          if (distSq >= minDistSq) continue;

          if (distSq < 0.0001) {
            const angle = Math.random() * Math.PI * 2;
            x += Math.cos(angle) * minDist * 0.5;
            z += Math.sin(angle) * minDist * 0.5;
            continue;
          }

          const dist = Math.sqrt(distSq);
          const overlap = minDist - dist;
          const nx = ddx / dist;
          const nz = ddz / dist;

          const sameTeam = myTeam === other.team;
          const teamFactor = sameTeam ? ALLY_PUSH : ENEMY_PUSH;

          const totalMass = myMass + other.mass;
          const myPushRatio = totalMass > 0 ? other.mass / totalMass : 0.5;

          const push = overlap * PUSH_STRENGTH * teamFactor * myPushRatio;
          x += nx * push;
          z += nz * push;
        }
      }
    }
  }

  // Clamp to arena bounds (accounting for unit radius)
  const bMinX = ARENA_BOUNDS.minX + myRadius;
  const bMaxX = ARENA_BOUNDS.maxX - myRadius;
  const bMinZ = ARENA_BOUNDS.minZ + myRadius;
  const bMaxZ = ARENA_BOUNDS.maxZ - myRadius;

  if (x < bMinX) x = bMinX;
  else if (x > bMaxX) x = bMaxX;
  if (z < bMinZ) z = bMinZ;
  else if (z > bMaxZ) z = bMaxZ;

  return [x, z];
}
