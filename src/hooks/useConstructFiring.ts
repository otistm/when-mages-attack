import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useCardStore } from '@/stores/cardStore';
import { CardSlotConfig, ARENA } from '@/types';

export interface ConstructFiringOptions {
  spawned: boolean;
  isDying: boolean;
  slot: CardSlotConfig;
  team: 'player' | 'enemy';
  cooldown: number;
  damage: number;
  onFire: (position: [number, number, number], damage: number) => void;
  /** Optional callback right before firing (e.g. to trigger an animation) */
  onBeforeFire?: () => void;
}

/**
 * Manages the cooldown-based firing loop for stationary constructs.
 * Fires on spawn, then on each cooldown expiry.
 */
export function useConstructFiring({
  spawned,
  isDying,
  slot,
  team,
  cooldown,
  damage,
  onFire,
  onBeforeFire,
}: ConstructFiringOptions) {
  const lastFireRef = useRef(0);
  const shouldFireOnSpawn = useRef(true);
  const updateCooldown = useCardStore((state) => state.updateCooldown);

  const zPosition = team === 'player'
    ? ARENA.playerThroneZ - 2
    : ARENA.enemyThroneZ + 2;

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    if (!spawned || isDying) return;

    if (lastFireRef.current === 0) {
      lastFireRef.current = time;
      if (shouldFireOnSpawn.current) {
        shouldFireOnSpawn.current = false;
        onBeforeFire?.();
        onFire([slot.xPosition, 0.5, zPosition], damage);
        updateCooldown(slot.index, team, 0, false);
      }
      return;
    }

    const elapsed = time - lastFireRef.current;
    const progress = Math.min(elapsed / cooldown, 1);
    updateCooldown(slot.index, team, progress, false);

    if (progress >= 1) {
      lastFireRef.current = time;
      onBeforeFire?.();
      onFire([slot.xPosition, 0.5, zPosition], damage);
      setTimeout(() => {
        updateCooldown(slot.index, team, 0, false);
      }, 200);
    }
  });

  return { zPosition };
}
