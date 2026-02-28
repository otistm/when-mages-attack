/**
 * SpawnedBattery - 3D battery construct that fires electrical projectiles
 * 
 * Uses the procedural LowPolyBattery model.
 * Fires projectiles on cooldown with electric glow effects.
 */

import { useRef, useState, useCallback } from 'react';
import { animated } from '@react-spring/three';
import * as THREE from 'three';
import { CardSlotConfig } from '@/types';
import { useConstructLifecycle } from '@/hooks/useConstructLifecycle';
import { useConstructFiring } from '@/hooks/useConstructFiring';
import { useDamageFlash } from '@/hooks/useDamageFlash';
import { LowPolyBattery } from '../models/LowPolyBattery';
import { HealthRing } from './HealthRing';

interface SpawnedBatteryProps {
  slot: CardSlotConfig;
  team: 'player' | 'enemy';
  onFire: (position: [number, number, number], damage: number) => void;
  damage: number;
  cooldown: number;
  combatId: string;
  onDestroy?: () => void;
}

export function SpawnedBattery({
  slot,
  team,
  onFire,
  damage,
  cooldown,
  combatId,
  onDestroy,
}: SpawnedBatteryProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [isReady, setIsReady] = useState(false);

  const { spawned, isDying, springProps, currentHp, healthPercent, combatState } =
    useConstructLifecycle(combatId, onDestroy);

  const isDamaged = useDamageFlash(currentHp);

  const handleBeforeFire = useCallback(() => {
    setIsReady(true);
    setTimeout(() => setIsReady(false), 200);
  }, []);

  const { zPosition } = useConstructFiring({
    spawned, isDying, slot, team, cooldown, damage, onFire,
    onBeforeFire: handleBeforeFire,
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
      <LowPolyBattery
        team={team}
        isDamaged={isDamaged}
        state={combatState}
      />
      <HealthRing healthPercent={healthPercent} team={team} yOffset={2.4} />

      {isReady && !isDying && (
        <pointLight
          position={[0, 1.0, 0]}
          color={team === 'player' ? '#00ffff' : '#ff4444'}
          intensity={15}
          distance={10}
          decay={2}
        />
      )}
    </animated.group>
  );
}

export default SpawnedBattery;
