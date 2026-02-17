/**
 * Minion collision resolution — hard constraint that prevents overlap.
 *
 * After computing a desired position, call `resolveCollisions` to push the
 * minion out of any overlapping hitboxes. Uses iterative position-based
 * resolution with aggressive push to ensure minions never clip.
 */

import { useCombatStore } from '@/stores/combatStore';

/**
 * Every entity gets this collision radius. Two entities overlap when
 * their centers are closer than COLLISION_RADIUS * 2.
 */
const COLLISION_RADIUS = 1.2;

/**
 * Push multiplier — values >1 overshoot the exact separation so entities
 * bounce apart instead of sliding along each other.
 */
const PUSH_STRENGTH = 1.6;

/** Number of resolution passes per frame. More = more stable clusters. */
const PASSES = 5;

/**
 * Given a desired position, resolves collisions against every other alive
 * entity in the combat store and returns a corrected [x, z] that does not
 * overlap any of them.
 */
export function resolveCollisions(
  myId: string,
  desiredX: number,
  desiredZ: number,
): [number, number] {
  const store = useCombatStore.getState();
  const allMinions = store.getAliveMinions();

  let x = desiredX;
  let z = desiredZ;

  const minDist = COLLISION_RADIUS * 2;
  const minDistSq = minDist * minDist;

  for (let pass = 0; pass < PASSES; pass++) {
    for (const other of allMinions) {
      if (other.id === myId) continue;

      const dx = x - other.position[0];
      const dz = z - other.position[2];
      const distSq = dx * dx + dz * dz;

      if (distSq >= minDistSq) continue;

      // Exactly on top — random nudge
      if (distSq < 0.0001) {
        const angle = Math.random() * Math.PI * 2;
        x += Math.cos(angle) * minDist;
        z += Math.sin(angle) * minDist;
        continue;
      }

      const dist = Math.sqrt(distSq);
      const overlap = minDist - dist;
      const nx = dx / dist;
      const nz = dz / dist;

      // Push the full overlap with extra strength so they bounce apart
      x += nx * overlap * PUSH_STRENGTH;
      z += nz * overlap * PUSH_STRENGTH;
    }
  }

  return [x, z];
}
