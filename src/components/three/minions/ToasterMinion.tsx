/**
 * ToasterMinion - Walks to the center of the arena, then fires toast on cooldown.
 *
 * Behavior:
 * 1. Spawns near its team's HP bar
 * 2. Walks toward the center of the arena
 * 3. Once at center, stops and fires toast projectiles on cooldown
 * 4. Can be attacked and destroyed
 * 5. Only one toaster exists at a time (enforced by Arena spawn logic)
 */

import { useRef, useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';

import { useCombatStore } from '@/stores/combatStore';
import { useBattleStatsStore } from '@/stores/battleStatsStore';
import { getCardDefinition } from '@/data/cards';
import { resolveCollisions } from './separation';
import { minionPositions } from '@/utils/minionPositionRegistry';
import { LowPolyToaster } from '@/components/three/models/LowPolyToaster';
import type { CombatMinion } from '@/stores/combatStore';
import type { CardDefinition } from '@/types';

const ARENA_CENTER: [number, number, number] = [0, 0.5, 0];
const ARRIVE_THRESHOLD = 6.0;

interface ToasterMinionProps {
  data: CombatMinion;
  onFire: (
    position: [number, number, number],
    damage: number,
    card?: CardDefinition,
    firingTeam?: 'player' | 'enemy'
  ) => void;
}

export function ToasterMinion({ data, onFire }: ToasterMinionProps) {
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);
  const lastFireTimeRef = useRef(0);
  const [isReady, setIsReady] = useState(false);
  const [cooldownProgress, setCooldownProgress] = useState(0);
  const [isDamaged, setIsDamaged] = useState(false);
  const prevHpRef = useRef<number>(data.currentHp);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialPosition = useMemo<[number, number, number]>(() => [...data.position], []);

  const positionRef = useRef<[number, number, number]>([...initialPosition]);
  const rotationRef = useRef(data.rotation);
  const idRef = useRef(data.id);
  const arrivedRef = useRef(false);

  const cardDef = useMemo(() => getCardDefinition(data.cardDefinitionId), [data.cardDefinitionId]);
  const fireCooldown = cardDef?.cooldown ?? 5;
  const isInfernal = data.cardDefinitionId === 'burning_toaster';

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

  // Detect damage for flash
  useEffect(() => {
    if (data.currentHp < prevHpRef.current) {
      setIsDamaged(true);
      const timer = setTimeout(() => setIsDamaged(false), 300);
      prevHpRef.current = data.currentHp;
      return () => clearTimeout(timer);
    }
    prevHpRef.current = data.currentHp;
  }, [data.currentHp]);

  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;

    const store = useCombatStore.getState();
    const me = store.getMinion(idRef.current);
    if (!me) return;
    if (me.state === 'dead' || me.state === 'dying' || me.state === 'spawning') return;

    const px = positionRef.current[0];
    const py = positionRef.current[1];
    const pz = positionRef.current[2];

    const dx = ARENA_CENTER[0] - px;
    const dz = ARENA_CENTER[2] - pz;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 0.05) {
      const targetRot = Math.atan2(dx, dz);
      let rot = rotationRef.current;
      let diff = targetRot - rot;
      if (diff > Math.PI) diff -= Math.PI * 2;
      if (diff < -Math.PI) diff += Math.PI * 2;
      rot += diff * Math.min(1, 8 * delta);
      rotationRef.current = rot;
    }
    if (innerRef.current) innerRef.current.rotation.y = rotationRef.current;

    if (!arrivedRef.current && dist > ARRIVE_THRESHOLD) {
      if (me.state !== 'moving') {
        store.updateMinion(idRef.current, { state: 'moving' });
      }
      const spd = (me.speed || 2) * (1 + Math.max(0, 1 - dist / 10) * 0.5);
      const nx = dx / dist;
      const nz = dz / dist;
      const newX = px + nx * spd * delta;
      const newZ = pz + nz * spd * delta;
      const [resolvedX, resolvedZ] = resolveCollisions(idRef.current, newX, newZ);
      positionRef.current = [resolvedX, py, resolvedZ];
    } else {
      arrivedRef.current = true;
      const [resolvedX, resolvedZ] = resolveCollisions(idRef.current, px, pz);
      positionRef.current = [resolvedX, py, resolvedZ];

      if (me.state !== 'attacking') {
        store.updateMinion(idRef.current, { state: 'attacking' });
      }

      const now = state.clock.elapsedTime;
      const elapsed = now - lastFireTimeRef.current;
      const progress = lastFireTimeRef.current > 0 ? Math.min(elapsed / fireCooldown, 1) : 1;
      setCooldownProgress(progress);

      if (elapsed >= fireCooldown || lastFireTimeRef.current === 0) {
        lastFireTimeRef.current = now;
        setIsReady(true);
        setTimeout(() => setIsReady(false), 200);

        const firePos: [number, number, number] = [
          positionRef.current[0],
          positionRef.current[1] + 0.5,
          positionRef.current[2],
        ];
        onFire(firePos, me.stats.attack, cardDef, me.team);

        useBattleStatsStore.getState().recordDamage(me.cardDefinitionId, me.stats.attack);
      }
    }

    g.position.x = positionRef.current[0];
    g.position.y = positionRef.current[1];
    g.position.z = positionRef.current[2];

    minionPositions.set(
      idRef.current,
      positionRef.current[0], positionRef.current[1], positionRef.current[2],
      rotationRef.current,
      me.collisionRadius, me.stats.mass, me.team,
    );
  });

  const healthPercent = data.currentHp / data.stats.hp;
  const isPlayer = data.team === 'player';

  return (
    <group ref={groupRef} position={initialPosition}>
      <animated.group ref={innerRef} scale={spawnSpring.scale} renderOrder={10}>
        <LowPolyToaster
          team={data.team}
          isInfernal={isInfernal}
          isReady={isReady}
          cooldownProgress={arrivedRef.current ? cooldownProgress : 0}
          isDamaged={isDamaged}
        />

        {/* Circular health ring – positioned to the side */}
        <group position={[2.4, 1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
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

export default ToasterMinion;
