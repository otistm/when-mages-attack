/**
 * Minion collision resolution — hard constraint that prevents overlap.
 *
 * After computing a desired position, call `resolveCollisions` to push the
 * minion out of any overlapping hitboxes.  Uses iterative position‑based
 * resolution (3 passes) so clusters of minions still separate cleanly.
 *
 * The hitbox radius is the same for every entity in the combat store
 * (minions AND registered constructs).
 */

import { useCombatStore } from '@/stores/combatStore';

/** Minimum center-to-center distance between any two entities. */
const HITBOX_RADIUS = 1.6;

/**
 * Given a desired position, resolves collisions against every other alive
 * entity in the combat store and returns a corrected [x, z] that does not
 * overlap any of them.
 *
 * The caller's Y coordinate is unchanged.
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

  // Multiple passes handle cascading pushes (pushed away from A into B)
  for (let pass = 0; pass < 3; pass++) {
    for (const other of allMinions) {
      if (other.id === myId) continue;

      const dx = x - other.position[0];
      const dz = z - other.position[2];
      const distSq = dx * dx + dz * dz;
      const minDist = HITBOX_RADIUS;

      if (distSq >= minDist * minDist) continue;

      // Exactly on top — random nudge
      if (distSq < 0.0001) {
        const angle = Math.random() * Math.PI * 2;
        x += Math.cos(angle) * minDist * 0.6;
        z += Math.sin(angle) * minDist * 0.6;
        continue;
      }

      const dist = Math.sqrt(distSq);
      const overlap = minDist - dist;
      const nx = dx / dist;
      const nz = dz / dist;

      // Push *this* entity out by the full overlap (other entities resolve
      // their own collisions in their own useFrame).
      x += nx * overlap;
      z += nz * overlap;
    }
  }

  return [x, z];
}
