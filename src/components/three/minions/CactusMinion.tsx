/**
 * CactusMinion - Spawns at a random arena position and fires needles radially.
 *
 * Behavior:
 * 1. Spawns at a random position in the arena
 * 2. Stays stationary
 * 3. Fires 5 spine projectiles in all directions on cooldown
 * 4. Can be attacked and destroyed
 * 5. Multiple can exist simultaneously
 */

import { useRef, useEffect, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';

import { LowPolyCactus } from '../models/LowPolyCactus';
import { useCombatStore } from '@/stores/combatStore';
import { useBattleStatsStore } from '@/stores/battleStatsStore';
import { getCardDefinition } from '@/data/cards';
import { resolveCollisions } from './separation';
import { minionPositions } from '@/utils/minionPositionRegistry';
import type { CombatMinion } from '@/stores/combatStore';
import type { CardDefinition } from '@/types';

const NEEDLE_COUNT = 5;
const SPREAD_RADIUS = 0.6;

interface CactusMinionProps {
  data: CombatMinion;
  sizeScale?: number;
  onFire?: (
    position: [number, number, number],
    damage: number,
    card?: CardDefinition,
    firingTeam?: 'player' | 'enemy'
  ) => void;
}

export function CactusMinion({ data, onFire }: CactusMinionProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lastFireTimeRef = useRef(0);
  const swellRef = useRef(0);
  const isDamagedRef = useRef(false);
  const prevHpRef = useRef(data.currentHp);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialPosition = useMemo<[number, number, number]>(() => [...data.position], []);

  const positionRef = useRef<[number, number, number]>([...initialPosition]);
  const idRef = useRef(data.id);

  const cardDef = useMemo(() => getCardDefinition(data.cardDefinitionId), [data.cardDefinitionId]);
  const fireCooldown = cardDef?.cooldown ?? 6;

  const [spawnSpring, spawnApi] = useSpring(() => ({
    scale: 0,
    config: { tension: 300, friction: 10 },
  }));

  useEffect(() => {
    spawnApi.start({ scale: 1 });
  }, [spawnApi]);

  useEffect(() => {
    if (data.state === 'dying') {
      spawnApi.start({ scale: 0, config: { tension: 200, friction: 20 } });
    }
  }, [data.state, spawnApi]);

  // Detect damage
  useEffect(() => {
    if (data.currentHp < prevHpRef.current) {
      isDamagedRef.current = true;
      const timer = setTimeout(() => { isDamagedRef.current = false; }, 300);
      prevHpRef.current = data.currentHp;
      return () => clearTimeout(timer);
    }
    prevHpRef.current = data.currentHp;
  }, [data.currentHp]);

  const fireNeedleBurst = useCallback(() => {
    const me = useCombatStore.getState().getMinion(idRef.current);
    if (!me) return;

    const pos = me.position;
    for (let i = 0; i < NEEDLE_COUNT; i++) {
      const angle = (i / NEEDLE_COUNT) * Math.PI * 2;
      const offsetX = Math.cos(angle) * SPREAD_RADIUS;
      const offsetZ = Math.sin(angle) * SPREAD_RADIUS;
      const firePos: [number, number, number] = [
        pos[0] + offsetX,
        pos[1] + 0.5,
        pos[2] + offsetZ,
      ];
      setTimeout(() => {
        onFire?.(firePos, me.stats.attack, cardDef, me.team);
      }, i * 40);
    }

    useBattleStatsStore.getState().recordDamage(me.cardDefinitionId, me.stats.attack * NEEDLE_COUNT);
  }, [onFire, cardDef]);

  useFrame((state, delta) => {
    const g = groupRef.current;
    const store = useCombatStore.getState();
    const me = store.getMinion(idRef.current);
    if (!me) return;
    if (me.state === 'dead' || me.state === 'dying' || me.state === 'spawning') return;

    const px = positionRef.current[0];
    const py = positionRef.current[1];
    const pz = positionRef.current[2];
    const [resolvedX, resolvedZ] = resolveCollisions(idRef.current, px, pz);
    positionRef.current = [resolvedX, py, resolvedZ];

    if (g) {
      g.position.x = resolvedX;
      g.position.y = py;
      g.position.z = resolvedZ;
    }

    minionPositions.set(
      idRef.current,
      positionRef.current[0], positionRef.current[1], positionRef.current[2],
      0,
      me.collisionRadius, me.stats.mass, me.team,
    );

    const now = state.clock.elapsedTime;

    if (lastFireTimeRef.current === 0) {
      lastFireTimeRef.current = now;
      return;
    }

    const elapsed = now - lastFireTimeRef.current;
    const progress = Math.min(elapsed / fireCooldown, 1);

    swellRef.current = progress;

    if (now - lastFireTimeRef.current >= fireCooldown) {
      fireNeedleBurst();
      lastFireTimeRef.current = now;
      swellRef.current = 0;
    }
  });

  const healthPercent = data.currentHp / data.stats.hp;
  const isPlayer = data.team === 'player';

  return (
    <group ref={groupRef} position={initialPosition}>
      <animated.group scale={spawnSpring.scale} renderOrder={10}>
        <LowPolyCactus
          team={data.team}
          isDamaged={isDamagedRef.current}
          state={data.state}
          swellRef={swellRef}
        />

        {/* Circular health ring */}
        <group position={[2.0, 1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <ringGeometry args={[0.32, 0.48, 32, 1, 0, Math.PI * 2]} />
            <meshBasicMaterial color="#1a1a1a" opacity={0.5} transparent side={THREE.DoubleSide} />
          </mesh>
          {healthPercent > 0 && (
            <mesh position={[0, 0, 0.01]}>
              <ringGeometry args={[0.34, 0.46, 32, 1, Math.PI / 2, healthPercent * Math.PI * 2]} />
              <meshBasicMaterial color={isPlayer ? '#4ade80' : '#f87171'} side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      </animated.group>
    </group>
  );
}

export default CactusMinion;
