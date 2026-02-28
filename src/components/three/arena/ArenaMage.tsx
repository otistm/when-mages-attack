/**
 * ArenaMage - 3D targetable entity that replaces FloorHealthBar.
 *
 * Simple toon-shaded sphere per side. Reads health and status effects
 * from the game store for damage flash and status color shifts.
 */

import { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/stores/gameStore';
import { ARENA, StatusEffectType } from '@/types';
import { STATUS_PRIORITY } from '@/data/constants';
import { createToonMaterial } from '@/shaders/ToonMaterials';

const sphereGeo = new THREE.IcosahedronGeometry(1, 2);

const STATUS_EMISSIVE: Record<StatusEffectType, string> = {
  burn: '#ff6600',
  shocked: '#ffdd00',
  freeze: '#66ddff',
  poison: '#44ff44',
  blighted: '#aa44ff',
};

interface ArenaMageProps {
  side: 'player' | 'enemy';
}

export function ArenaMage({ side }: ArenaMageProps) {
  const player = useGameStore((state) => state.player);
  const enemy = useGameStore((state) => state.enemy);
  const data = side === 'player' ? player : enemy;

  const meshRef = useRef<THREE.Mesh>(null);
  const [isDamaged, setIsDamaged] = useState(false);
  const prevHealthRef = useRef(data.health);
  const damageFlash = useRef(0);

  const activeStatus = useMemo<StatusEffectType | null>(() => {
    return STATUS_PRIORITY.find((s) => data.statusEffects.includes(s)) ?? null;
  }, [data.statusEffects]);

  const isPlayer = side === 'player';
  const baseColor = isPlayer ? '#4ade80' : '#f87171';
  const baseEmissive = isPlayer ? '#2e7d32' : '#7d2e2e';

  const mat = useMemo(
    () =>
      createToonMaterial({
        color: baseColor,
        bands: 3,
        emissive: baseEmissive,
        emissiveIntensity: 0.3,
      }),
    [baseColor, baseEmissive],
  );

  useEffect(() => {
    if (data.health < prevHealthRef.current) {
      setIsDamaged(true);
      damageFlash.current = 1;
    }
    prevHealthRef.current = data.health;
  }, [data.health]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;

    if (damageFlash.current > 0) {
      damageFlash.current -= delta * 4;
      mat.emissiveIntensity = 0.3 + damageFlash.current * 2;
      mat.emissive.setHex(0xffffff);
      if (damageFlash.current <= 0) {
        setIsDamaged(false);
      }
    } else {
      const statusHex = activeStatus ? STATUS_EMISSIVE[activeStatus] : baseEmissive;
      const pulse = activeStatus
        ? 0.3 + Math.sin(t * 4) * 0.15
        : 0.3 + Math.sin(t * 2) * 0.05;
      mat.emissiveIntensity = pulse;
      mat.emissive.set(statusHex);
    }

    const breathe = 1 + Math.sin(t * 2) * 0.03;
    meshRef.current.scale.setScalar(breathe);
  });

  const zPosition = side === 'player' ? ARENA.playerThroneZ : ARENA.enemyThroneZ;

  return (
    <group position={[0, 1.5, zPosition]}>
      <mesh ref={meshRef} geometry={sphereGeo} material={mat} castShadow />
      <pointLight
        position={[0, 0.5, 0]}
        color={baseColor}
        intensity={1.0}
        distance={6}
        decay={2}
      />
    </group>
  );
}

export default ArenaMage;
