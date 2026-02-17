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

import { useRef, useEffect, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

import { useCombatStore } from '@/stores/combatStore';
import { useDamageStore } from '@/stores/damageStore';
import { useBattleStatsStore } from '@/stores/battleStatsStore';
import { getCardDefinition } from '@/data/cards';
import { resolveCollisions } from './separation';
import type { CombatMinion } from '@/stores/combatStore';
import type { CardDefinition } from '@/types';

useGLTF.preload('/assets/models/toaster_cel.glb');

const ARENA_CENTER: [number, number, number] = [0, 0.5, 0];
const ARRIVE_THRESHOLD = 1.0;

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialPosition = useMemo<[number, number, number]>(() => [...data.position], []);

  const positionRef = useRef<[number, number, number]>([...initialPosition]);
  const rotationRef = useRef(data.rotation);
  const idRef = useRef(data.id);
  const arrivedRef = useRef(false);

  const cardDef = useMemo(() => getCardDefinition(data.cardDefinitionId), [data.cardDefinitionId]);
  const fireCooldown = cardDef?.cooldown ?? 5;

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

    // Rotate to face direction of travel (or toward center if arrived)
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
      // Walk toward center
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
      // Arrived at center — fire toast on cooldown
      arrivedRef.current = true;
      const [resolvedX, resolvedZ] = resolveCollisions(idRef.current, px, pz);
      positionRef.current = [resolvedX, py, resolvedZ];

      if (me.state !== 'attacking') {
        store.updateMinion(idRef.current, { state: 'attacking' });
      }

      const now = state.clock.elapsedTime;
      if (now - lastFireTimeRef.current >= fireCooldown) {
        lastFireTimeRef.current = now;

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

    store.updateMinion(idRef.current, {
      position: [...positionRef.current],
      rotation: rotationRef.current,
    });
  });

  const healthPercent = data.currentHp / data.stats.hp;
  const isPlayer = data.team === 'player';

  return (
    <group ref={groupRef} position={initialPosition}>
      <animated.group ref={innerRef} scale={spawnSpring.scale} renderOrder={10}>
        <Suspense fallback={<ToasterFallback />}>
          <ToasterModel />
        </Suspense>

        {/* Health bar */}
        <group position={[0, 3.0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <planeGeometry args={[1.2, 0.18]} />
            <meshBasicMaterial color="#000000" opacity={0.6} transparent />
          </mesh>
          <mesh position={[(healthPercent - 1) * 0.6, 0, 0.01]}>
            <planeGeometry args={[1.16 * healthPercent, 0.14]} />
            <meshBasicMaterial color={isPlayer ? '#4ade80' : '#f87171'} />
          </mesh>
        </group>

        {/* Ambient glow */}
        <pointLight
          position={[0, 1.0, 0]}
          color={isPlayer ? '#ffaa00' : '#ff4444'}
          intensity={2}
          distance={4}
          decay={2}
        />
      </animated.group>
    </group>
  );
}

function ToasterModel() {
  const { scene } = useGLTF('/assets/models/toaster_cel.glb');
  const model = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  return <primitive object={model} scale={2.5} />;
}

function ToasterFallback() {
  return (
    <mesh position={[0, 0.4, 0]} castShadow>
      <boxGeometry args={[0.6, 0.8, 0.4]} />
      <meshBasicMaterial color="#c0c0c0" />
    </mesh>
  );
}

export default ToasterMinion;
