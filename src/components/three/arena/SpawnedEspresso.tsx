/**
 * SpawnedEspresso - 3D espresso cup construct
 * 
 * Uses the procedural LowPolyEspresso model.
 * Vibrates with caffeine energy and fires speed-boosting projectiles.
 */

import { useRef } from 'react';
import { animated } from '@react-spring/three';
import * as THREE from 'three';
import { CardSlotConfig } from '@/types';
import { useConstructLifecycle } from '@/hooks/useConstructLifecycle';
import { useConstructFiring } from '@/hooks/useConstructFiring';
import { useDamageFlash } from '@/hooks/useDamageFlash';
import { LowPolyEspresso } from '../models/LowPolyEspresso';
import { HealthRing } from './HealthRing';

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

  const { spawned, isDying, springProps, currentHp, healthPercent, combatState } =
    useConstructLifecycle(combatId, onDestroy);

  const isDamaged = useDamageFlash(currentHp);

  const { zPosition } = useConstructFiring({
    spawned, isDying, slot, team, cooldown, damage, onFire,
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
      <LowPolyEspresso
        team={team}
        isDamaged={isDamaged}
        state={combatState}
      />
      <HealthRing healthPercent={healthPercent} team={team} yOffset={3.2} />
    </animated.group>
  );
}

export default SpawnedEspresso;
