/**
 * SpawnedToaster - Low-poly procedural 3D toaster that fires projectiles
 * 
 * Uses procedural geometry with flatShading for a stylised low-poly look.
 * Spawned from a card after initial cooldown.
 * Fires toast projectiles on cooldown.
 */

import { useRef, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { animated } from '@react-spring/three';
import * as THREE from 'three';
import { CardSlotConfig, ARENA } from '@/types';
import { useCardStore } from '@/stores/cardStore';
import { useConstructLifecycle } from '@/hooks/useConstructLifecycle';
import { useDamageFlash } from '@/hooks/useDamageFlash';
import { LowPolyToaster } from '@/components/three/models/LowPolyToaster';

interface SpawnedToasterProps {
  slot: CardSlotConfig;
  team: 'player' | 'enemy';
  onFire: (position: [number, number, number], damage: number) => void;
  damage: number;
  cooldown: number;
  isInfernal?: boolean;
  combatId: string;
  onDestroy?: () => void;
}

export function SpawnedToaster({ 
  slot, 
  team, 
  onFire, 
  damage, 
  cooldown,
  isInfernal = false,
  combatId,
  onDestroy,
}: SpawnedToasterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [isReady, setIsReady] = useState(false);
  const [cooldownProgress, setCooldownProgress] = useState(0);
  const lastFireRef = useRef(0);
  const shouldFireOnSpawn = useRef(true);

  const { spawned, isDying, springProps, currentHp, healthPercent, combatState } =
    useConstructLifecycle(combatId, onDestroy);

  const isDamaged = useDamageFlash(currentHp);
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
        setIsReady(true);
        onFire([slot.xPosition, 0.5, zPosition], damage);
        updateCooldown(slot.index, team, 0, false);
        setTimeout(() => setIsReady(false), 200);
      }
      return;
    }

    const elapsed = time - lastFireRef.current;
    const progress = Math.min(elapsed / cooldown, 1);
    setCooldownProgress(progress);
    updateCooldown(slot.index, team, progress, false);

    if (progress >= 1) {
      setIsReady(true);
      lastFireRef.current = time;
      onFire([slot.xPosition, 0.5, zPosition], damage);
      setTimeout(() => {
        setIsReady(false);
        updateCooldown(slot.index, team, 0, false);
      }, 200);
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
      <LowPolyToaster
        team={team}
        isInfernal={isInfernal}
        isReady={isReady && !isDying}
        cooldownProgress={cooldownProgress}
        isDamaged={isDamaged}
      />

      <group position={[2.4, 1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
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
    </animated.group>
  );
}

export default SpawnedToaster;
