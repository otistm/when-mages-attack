/**
 * CardSlotTracker - Invisible 3D component that tracks slot position
 * and updates the card store with cooldown state.
 *
 * Screen position is written to a mutable registry (no Zustand set()).
 * Cooldown is only written to the store when it meaningfully changes.
 *
 * Supports populationCap — when the number of alive minions matching
 * the card's populationFamily reaches the cap, cooldown freezes until
 * one dies.
 */

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CardDefinition, CardSlotConfig } from '@/types';
import { useCardStore } from '@/stores/cardStore';
import { useCombatStore } from '@/stores/combatStore';
import { cardScreenPositions } from '@/utils/cardScreenPositions';

interface CardSlotTrackerProps {
  slot: CardSlotConfig;
  team: 'player' | 'enemy';
  zPosition: number;
  card: CardDefinition;
  onFire?: (position: [number, number, number], damage: number, card: CardDefinition) => void;
  onSpawnMinion?: (card: CardDefinition) => void;
}

const _vec3 = new THREE.Vector3();

export function CardSlotTracker({
  slot,
  team,
  zPosition,
  card,
  onFire,
  onSpawnMinion,
}: CardSlotTrackerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lastTriggerRef = useRef(0);
  const lastWrittenProgress = useRef(-1);
  const lastWrittenReady = useRef(false);
  const pausedAtRef = useRef<number | null>(null);

  const { camera, size } = useThree();

  const addCard = useCardStore((state) => state.addCard);
  const updateCooldown = useCardStore((state) => state.updateCooldown);

  const cooldownDuration = card.cooldown ?? 5;
  const popCap = card.populationCap;
  const popFamily = card.populationFamily;

  useEffect(() => {
    addCard(slot.index, card, team);
  }, [slot.index, card, team, addCard]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    const time = clock.elapsedTime;

    _vec3.set(slot.xPosition, 0, zPosition);
    _vec3.project(camera);

    const x = (_vec3.x * 0.5 + 0.5) * size.width;
    const y = (-_vec3.y * 0.5 + 0.5) * size.height;

    cardScreenPositions.set(slot.index, team, x, y);

    // Population cap check — freeze cooldown while at cap
    if (popCap != null && popFamily) {
      const alive = useCombatStore.getState().getMinionsByTeam(team);
      const familyCount = alive.filter((m) => popFamily.includes(m.cardDefinitionId)).length;

      if (familyCount >= popCap) {
        if (pausedAtRef.current === null) {
          pausedAtRef.current = time;
        }
        // Keep cooldown bar visually full (ready) but don't fire
        if (lastWrittenProgress.current !== 1 || lastWrittenReady.current !== false) {
          lastWrittenProgress.current = 1;
          lastWrittenReady.current = false;
          updateCooldown(slot.index, team, 1, false);
        }
        return;
      }

      // Resumed from pause — shift the trigger time so cooldown restarts
      if (pausedAtRef.current !== null) {
        lastTriggerRef.current = time;
        pausedAtRef.current = null;
      }
    }

    const elapsed = time - lastTriggerRef.current;
    const progress = Math.min(elapsed / cooldownDuration, 1);
    const isReady = progress >= 1;

    const roundedProgress = Math.round(progress * 50) / 50;
    if (roundedProgress !== lastWrittenProgress.current || isReady !== lastWrittenReady.current) {
      lastWrittenProgress.current = roundedProgress;
      lastWrittenReady.current = isReady;
      updateCooldown(slot.index, team, progress, isReady);
    }

    if (isReady) {
      lastTriggerRef.current = time;

      if (card.type === 'CONSTRUCT' || card.type === 'MINION') {
        onSpawnMinion?.(card);
      } else {
        const firePosition: [number, number, number] = [slot.xPosition, 1.0, zPosition];
        onFire?.(firePosition, card.baseStats.attack, card);
      }
    }
  });

  return (
    <group ref={groupRef} position={[slot.xPosition, 0, zPosition]} />
  );
}

export default CardSlotTracker;
