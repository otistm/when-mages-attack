/**
 * SpawnedCactus - 3D potted cactus construct that fires spine projectiles
 * 
 * Uses the procedural LowPolyCactus model.
 * Spawned from the Potted Cactus card after initial cooldown.
 * Fires spine projectiles on cooldown with swell animation.
 */

import { useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { animated } from '@react-spring/three';
import * as THREE from 'three';
import { CardSlotConfig, ARENA } from '@/types';
import { useCardStore } from '@/stores/cardStore';
import { useConstructLifecycle } from '@/hooks/useConstructLifecycle';
import { useDamageFlash } from '@/hooks/useDamageFlash';
import { LowPolyCactus } from '../models/LowPolyCactus';

const NEEDLE_COUNT = 5;

interface SpawnedCactusProps {
  slot: CardSlotConfig;
  team: 'player' | 'enemy';
  onFire: (position: [number, number, number], damage: number) => void;
  damage: number;
  cooldown: number;
  combatId: string;
  onDestroy?: () => void;
}

export function SpawnedCactus({
  slot,
  team,
  onFire,
  damage,
  cooldown,
  combatId,
  onDestroy,
}: SpawnedCactusProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lastFireRef = useRef(0);
  const swellRef = useRef(0);

  const { spawned, isDying, springProps, currentHp, healthPercent, combatState } =
    useConstructLifecycle(combatId, onDestroy);

  const isDamaged = useDamageFlash(currentHp);
  const updateCooldown = useCardStore((state) => state.updateCooldown);

  const zPosition = team === 'player'
    ? ARENA.playerThroneZ - 2
    : ARENA.enemyThroneZ + 2;

  const fireNeedleBurst = useCallback(() => {
    const spreadRadius = 0.6;
    for (let i = 0; i < NEEDLE_COUNT; i++) {
      const angle = (i / NEEDLE_COUNT) * Math.PI * 2;
      const offsetX = Math.cos(angle) * spreadRadius;
      const offsetZ = Math.sin(angle) * spreadRadius;
      const firePosition: [number, number, number] = [
        slot.xPosition + offsetX,
        0.8,
        zPosition + offsetZ,
      ];
      setTimeout(() => {
        onFire(firePosition, damage);
      }, i * 40);
    }
  }, [slot.xPosition, zPosition, onFire, damage]);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    if (!spawned || isDying) return;

    if (lastFireRef.current === 0) {
      lastFireRef.current = time;
      return;
    }

    const elapsed = time - lastFireRef.current;
    const progress = Math.min(elapsed / cooldown, 1);
    updateCooldown(slot.index, team, progress, false);
    swellRef.current = progress;

    if (progress >= 1) {
      fireNeedleBurst();
      lastFireRef.current = time;
      swellRef.current = 0;
      updateCooldown(slot.index, team, 0, false);
    }
  });

  return (
    <animated.group
      ref={groupRef}
      position-x={slot.xPosition}
      position-y={springProps.positionY}
      position-z={zPosition}
      scale={springProps.scale}
      renderOrder={10}
    >
      <LowPolyCactus
        team={team}
        isDamaged={isDamaged}
        state={combatState}
        swellRef={swellRef}
      />

      <group position={[2.0, 1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <ringGeometry args={[0.32, 0.48, 32, 1, 0, Math.PI * 2]} />
          <meshBasicMaterial color="#1a1a1a" opacity={0.5} transparent side={THREE.DoubleSide} />
        </mesh>
        {healthPercent > 0 && (
          <mesh position={[0, 0, 0.01]}>
            <ringGeometry args={[0.34, 0.46, 32, 1, Math.PI / 2, healthPercent * Math.PI * 2]} />
            <meshBasicMaterial color={team === 'player' ? '#4ade80' : '#f87171'} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>

      {swellRef.current > 0.8 && !isDying && (
        <pointLight
          position={[0, 1.8, 0]}
          color="#90EE90"
          intensity={10}
          distance={8}
          decay={2}
        />
      )}
    </animated.group>
  );
}

export default SpawnedCactus;
