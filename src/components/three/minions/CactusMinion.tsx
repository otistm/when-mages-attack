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

import { useRef, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

import { useCombatStore } from '@/stores/combatStore';
import { useBattleStatsStore } from '@/stores/battleStatsStore';
import { getCardDefinition } from '@/data/cards';
import { resolveCollisions } from './separation';
import type { CombatMinion } from '@/stores/combatStore';
import type { CardDefinition } from '@/types';

useGLTF.preload('/assets/models/potted_cactus.glb');

const NEEDLE_COUNT = 5;
const SPREAD_RADIUS = 0.6;

interface CactusMinionProps {
  data: CombatMinion;
  onFire: (
    position: [number, number, number],
    damage: number,
    card?: CardDefinition,
    firingTeam?: 'player' | 'enemy'
  ) => void;
}

export function CactusMinion({ data, onFire }: CactusMinionProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lastFireTimeRef = useRef(0);

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

  // Fire a radial burst of needles
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
        onFire(firePos, me.stats.attack, cardDef, me.team);
      }, i * 40);
    }

    useBattleStatsStore.getState().recordDamage(me.cardDefinitionId, me.stats.attack * NEEDLE_COUNT);
  }, [onFire, cardDef]);

  useFrame((state) => {
    const g = groupRef.current;
    const store = useCombatStore.getState();
    const me = store.getMinion(idRef.current);
    if (!me) return;
    if (me.state === 'dead' || me.state === 'dying' || me.state === 'spawning') return;

    // Resolve collisions even though stationary — prevents overlap at spawn
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

    store.updateMinion(idRef.current, {
      position: [...positionRef.current],
    });

    // Fire on cooldown
    const now = state.clock.elapsedTime;

    if (lastFireTimeRef.current === 0) {
      lastFireTimeRef.current = now;
      fireNeedleBurst();
      return;
    }

    if (now - lastFireTimeRef.current >= fireCooldown) {
      lastFireTimeRef.current = now;
      fireNeedleBurst();
    }
  });

  const healthPercent = data.currentHp / data.stats.hp;
  const isPlayer = data.team === 'player';

  return (
    <group ref={groupRef} position={initialPosition}>
      <animated.group scale={spawnSpring.scale} renderOrder={10}>
        <Suspense fallback={<CactusFallback />}>
          <CactusModel team={data.team} />
        </Suspense>

        {/* Health bar */}
        <group position={[0, 3.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <planeGeometry args={[1.6, 0.22]} />
            <meshBasicMaterial color="#000000" opacity={0.6} transparent />
          </mesh>
          <mesh position={[(healthPercent - 1) * 0.8, 0, 0.01]}>
            <planeGeometry args={[1.56 * healthPercent, 0.18]} />
            <meshBasicMaterial color={isPlayer ? '#4ade80' : '#f87171'} />
          </mesh>
        </group>

        {/* Ambient glow */}
        <pointLight
          position={[0, 1.2, 0]}
          color="#32CD32"
          intensity={2}
          distance={4}
          decay={2}
        />
      </animated.group>
    </group>
  );
}

function CactusModel({ team }: { team: 'player' | 'enemy' }) {
  const { scene } = useGLTF('/assets/models/potted_cactus.glb');
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

  return (
    <primitive
      object={model}
      scale={4.0}
      rotation={[-0.3, team === 'player' ? 0 : Math.PI, 0]}
    />
  );
}

function CactusFallback() {
  return (
    <group scale={3.0}>
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.3, 0.3, 8]} />
        <meshBasicMaterial color="#8B4513" />
      </mesh>
      <mesh position={[0, 0.5, 0]} castShadow>
        <sphereGeometry args={[0.25, 8, 8]} />
        <meshBasicMaterial color="#228B22" />
      </mesh>
    </group>
  );
}

export default CactusMinion;
