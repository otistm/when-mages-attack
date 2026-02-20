/**
 * SpawnedEspresso - 3D espresso cup construct
 * 
 * Uses the procedural LowPolyEspresso model.
 * Vibrates with caffeine energy and fires speed-boosting projectiles.
 */

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { CardSlotConfig, ARENA } from '@/types';
import { useCardStore } from '@/stores/cardStore';
import { useCombatStore } from '@/stores/combatStore';
import { LowPolyEspresso } from '../models/LowPolyEspresso';

interface SpawnedEspressoProps {
  slot: CardSlotConfig;
  team: 'player' | 'enemy';
  onFire: (position: [number, number, number], damage: number) => void;
  damage: number;
  cooldown: number;
  combatId: string;
  onDestroy?: () => void;
}

export function SpawnedEspresso({
  slot,
  team,
  onFire,
  damage,
  cooldown,
  combatId,
  onDestroy,
}: SpawnedEspressoProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [spawned, setSpawned] = useState(false);
  const [isDying, setIsDying] = useState(false);
  const [isDamaged, setIsDamaged] = useState(false);
  const lastFireRef = useRef(0);
  const hasCalledDestroy = useRef(false);
  const prevHpRef = useRef<number | null>(null);

  const combatData = useCombatStore((state) => state.minions.get(combatId));
  const maxHp = combatData?.stats?.hp ?? 1;
  const currentHp = combatData?.currentHp ?? 0;
  const healthPercent = maxHp > 0 ? currentHp / maxHp : 0;
  const combatState = combatData?.state;

  const updateCooldown = useCardStore((state) => state.updateCooldown);
  const shouldFireOnSpawn = useRef(true);

  const [springProps, springApi] = useSpring(() => ({
    scale: 0,
    positionY: -1,
    config: { tension: 300, friction: 20 },
  }));

  useEffect(() => {
    setSpawned(true);
    springApi.start({ scale: 1, positionY: 0 });
  }, [springApi]);

  useEffect(() => {
    if (prevHpRef.current !== null && currentHp < prevHpRef.current) {
      setIsDamaged(true);
      const timer = setTimeout(() => setIsDamaged(false), 300);
      prevHpRef.current = currentHp;
      return () => clearTimeout(timer);
    }
    prevHpRef.current = currentHp;
  }, [currentHp]);

  useEffect(() => {
    if (isDying) return;
    if (!combatData || combatState === 'dying' || combatState === 'dead') {
      setIsDying(true);
      springApi.start({
        scale: 0,
        positionY: -1,
        config: { tension: 200, friction: 20 },
      });
      if (!hasCalledDestroy.current) {
        hasCalledDestroy.current = true;
        setTimeout(() => { onDestroy?.(); }, 600);
      }
    }
  }, [combatData, combatState, isDying, springApi, onDestroy]);

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
      onFire([slot.xPosition, 0.5, zPosition], damage);
      setTimeout(() => {
        updateCooldown(slot.index, team, 0, false);
      }, 200);
    }
  });

  const isPlayer = team === 'player';

  return (
    <animated.group
      ref={groupRef}
      position-x={slot.xPosition}
      position-y={springProps.positionY}
      position-z={zPosition}
      scale={springProps.scale}
      renderOrder={10}
    >
      <LowPolyEspresso
        team={team}
        isDamaged={isDamaged}
        state={combatState}
      />

      {/* Health bar */}
      <group position={[0, 3.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <planeGeometry args={[1.6, 0.22]} />
          <meshBasicMaterial color="#000000" opacity={0.6} transparent />
        </mesh>
        <mesh position={[(healthPercent - 1) * 0.8, 0, 0.01]}>
          <planeGeometry args={[1.56 * healthPercent, 0.18]} />
          <meshBasicMaterial color={isPlayer ? '#4ade80' : '#f87171'} />
        </mesh>
      </group>
    </animated.group>
  );
}

export default SpawnedEspresso;
