/**
 * Minion Component - Generic combat unit with AI behavior
 * 
 * Movement uses direct THREE.js manipulation in useFrame.
 * A stable memoized position prop ensures R3F sets the initial position 
 * correctly and never resets it on re-render.
 */

import { useRef, useEffect, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import { Sphere, Cylinder, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

import { useCombatStore } from '@/stores/combatStore';
import { useGameStore } from '@/stores/gameStore';
import { useDamageStore } from '@/stores/damageStore';
import { useBattleStatsStore } from '@/stores/battleStatsStore';
import { useUIStore } from '@/stores/uiStore';
import { resolveCollisions } from './separation';
import { minionPositions } from '@/utils/minionPositionRegistry';
import { ARENA_BOUNDS } from '@/types';
import type { CombatMinion } from '@/stores/combatStore';

const _hpBgGeo = new THREE.PlaneGeometry(0.8, 0.15);
const _hpFillGeo = new THREE.PlaneGeometry(1, 0.12);
const _hpBgMat = new THREE.MeshBasicMaterial({ color: '#000000', opacity: 0.6, transparent: true });

interface MinionProps {
  data: CombatMinion;
  modelPath?: string;
  modelScale?: number;
}

export function Minion({ data, modelPath, modelScale = 1 }: MinionProps) {
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);
  const lastAttackTimeRef = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialPosition = useMemo<[number, number, number]>(() => [...data.position], []);

  const positionRef = useRef<[number, number, number]>([...initialPosition]);
  const rotationRef = useRef(data.rotation);
  const idRef = useRef(data.id);

  const targetXOffset = useRef((Math.random() - 0.5) * 6);

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

    const enemy = store.getClosestEnemy(positionRef.current, me.team);
    let tx: number, tz: number;
    let isMinion = false;

    if (enemy) {
      tx = enemy.position[0];
      tz = enemy.position[2];
      isMinion = true;
    } else {
      const ui = useUIStore.getState();
      tz = me.team === 'player' ? ui.enemyHPBarWorldZ : ui.playerHPBarWorldZ;
      tx = targetXOffset.current;
      tz = Math.max(ARENA_BOUNDS.minZ, Math.min(ARENA_BOUNDS.maxZ, tz));
      tx = Math.max(ARENA_BOUNDS.minX, Math.min(ARENA_BOUNDS.maxX, tx));
    }

    const dx = tx - px;
    const dz = tz - pz;
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

    const enemyRadius = enemy ? (minionPositions.get(enemy.id)?.radius ?? 0.75) : 0;
    const meleeRange = me.collisionRadius + enemyRadius + 0.5;
    const range = isMinion ? Math.max(me.attackRange, meleeRange) : me.attackRange;

    if (dist <= range) {
      const now = state.clock.elapsedTime;
      if (now - lastAttackTimeRef.current >= me.attackCooldown) {
        lastAttackTimeRef.current = now;
        if (isMinion && enemy) {
          store.damageMinion(enemy.id, me.stats.attack);
          useDamageStore.getState().addDamageEvent(me.stats.attack, enemy.team, enemy.position);
          useGameStore.getState().addCameraTrauma(0.03);
        } else {
          const tgt = me.team === 'player' ? 'enemy' : 'player';
          const gs = useGameStore.getState();
          if (tgt === 'enemy') gs.dealDamageToEnemy(me.stats.attack);
          else gs.dealDamageToPlayer(me.stats.attack);
          useDamageStore.getState().addDamageEvent(me.stats.attack, tgt, [tx, py, tz]);
          gs.addCameraTrauma(0.05);
        }
        // Track all melee damage (to minions and HP bar) in battle stats
        useBattleStatsStore.getState().recordDamage(me.cardDefinitionId, me.stats.attack);
        store.updateMinion(idRef.current, { state: 'attacking' });
      }
    }

    if (dist > range) {
      if (me.state !== 'moving') {
        store.updateMinion(idRef.current, { state: 'moving' });
      }
      const spd = me.speed * (1 + Math.max(0, 1 - dist / 10) * 0.5);
      const nx = dx / dist;
      const nz = dz / dist;
      const newX = px + nx * spd * delta;
      const newZ = pz + nz * spd * delta;
      const [resolvedX, resolvedZ] = resolveCollisions(idRef.current, newX, newZ);
      positionRef.current = [resolvedX, py, resolvedZ];
    } else {
      // In attack range — still resolve collisions so we don't overlap
      const [resolvedX, resolvedZ] = resolveCollisions(idRef.current, px, pz);
      positionRef.current = [resolvedX, py, resolvedZ];
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

  const healthBarY = modelPath ? 2.0 * modelScale : 1.5;

  return (
    <group ref={groupRef} position={initialPosition}>
      <animated.group ref={innerRef} scale={spawnSpring.scale} renderOrder={10}>
        {modelPath ? (
          <Suspense fallback={<DefaultMinionMesh color={data.color} isPlayer={isPlayer} />}>
            <GLBModel path={modelPath} scale={modelScale} />
          </Suspense>
        ) : (
          <DefaultMinionMesh color={data.color} isPlayer={isPlayer} />
        )}
        <group position={[0, healthBarY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh geometry={_hpBgGeo} material={_hpBgMat} />
          <mesh position={[(healthPercent - 1) * 0.4, 0, 0.01]} scale={[0.78 * healthPercent, 1, 1]} geometry={_hpFillGeo}>
            <meshBasicMaterial color={isPlayer ? '#4ade80' : '#f87171'} />
          </mesh>
        </group>
      </animated.group>
    </group>
  );
}

function DefaultMinionMesh({ color, isPlayer }: { color: string; isPlayer: boolean }) {
  return (
    <>
      <Cylinder args={[0.3, 0.4, 1, 8]} position={[0, 0.5, 0]} castShadow>
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.3}
          emissive={color} emissiveIntensity={0.15} />
      </Cylinder>
      <Sphere args={[0.25, 16, 16]} position={[0, 1.1, 0]} castShadow>
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.3}
          emissive={color} emissiveIntensity={0.2} />
      </Sphere>
      <Sphere args={[0.08, 8, 8]} position={[0.1, 1.15, 0.2]}>
        <meshBasicMaterial color={isPlayer ? '#00ff88' : '#ff4444'} />
      </Sphere>
      <Sphere args={[0.08, 8, 8]} position={[-0.1, 1.15, 0.2]}>
        <meshBasicMaterial color={isPlayer ? '#00ff88' : '#ff4444'} />
      </Sphere>
    </>
  );
}

function GLBModel({ path, scale }: { path: string; scale: number }) {
  const { scene } = useGLTF(path);
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

  return <primitive object={model} scale={scale} />;
}

export default Minion;
