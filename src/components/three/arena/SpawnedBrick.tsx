/**
 * SpawnedBrick - 3D rune brick construct that fires projectiles
 * 
 * Uses the procedural LowPolyBrick model.
 * Hovers menacingly, launches upward and slams down on fire cooldown.
 */

import { useRef, useState, useCallback } from 'react';
import { animated } from '@react-spring/three';
import * as THREE from 'three';
import { CardSlotConfig } from '@/types';
import { useConstructLifecycle } from '@/hooks/useConstructLifecycle';
import { useConstructFiring } from '@/hooks/useConstructFiring';
import { useDamageFlash } from '@/hooks/useDamageFlash';
import { LowPolyBrick } from '../models/LowPolyBrick';
import { HealthRing } from './HealthRing';

interface SpawnedBrickProps {
  slot: CardSlotConfig;
  team: 'player' | 'enemy';
  onFire: (position: [number, number, number], damage: number) => void;
  damage: number;
  cooldown: number;
  combatId: string;
  onDestroy?: () => void;
}

export function SpawnedBrick({
  slot,
  team,
  onFire,
  damage,
  cooldown,
  combatId,
  onDestroy,
}: SpawnedBrickProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [isReady, setIsReady] = useState(false);

  const { spawned, isDying, springProps, currentHp, healthPercent, combatState } =
    useConstructLifecycle(combatId, onDestroy);

  const isDamaged = useDamageFlash(currentHp);

  const handleBeforeFire = useCallback(() => {
    setIsReady(true);
    setTimeout(() => setIsReady(false), 800);
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
      <LowPolyBrick
        team={team}
        isDamaged={isDamaged}
        state={combatState}
        isReady={isReady}
      />
      <HealthRing healthPercent={healthPercent} team={team} yOffset={2.8} />
    </animated.group>
  );
}

export default SpawnedBrick;
