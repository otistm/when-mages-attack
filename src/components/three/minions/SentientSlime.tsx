/**
 * SentientSlime - Low-poly procedural slime minion
 * 
 * Movement uses direct THREE.js manipulation in useFrame.
 * A stable memoized position prop ensures R3F sets the initial position 
 * correctly and never resets it on re-render.
 * 
 * Ability: "Split" — on death, spawns two smaller slimes.
 */

import { useRef, useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';

import { LowPolySlime } from '../models/LowPolySlime';
import { useCombatStore } from '@/stores/combatStore';
import { useGameStore } from '@/stores/gameStore';
import { useDamageStore } from '@/stores/damageStore';
import { useBattleStatsStore } from '@/stores/battleStatsStore';
import { useUIStore } from '@/stores/uiStore';
import { resolveCollisions } from './separation';
import { getCardDefinition } from '@/data/cards';
import type { CombatMinion } from '@/stores/combatStore';

// Slime trail shared geometry and material
const trailGeo = new THREE.CircleGeometry(0.4, 6);
trailGeo.rotateX(-Math.PI / 2);

const TRAIL_MAX = 40;

interface TrailDrop {
  id: number;
  position: [number, number, number];
  life: number;
  color: string;
}

let trailIdCounter = 0;

interface SentientSlimeProps {
  data: CombatMinion;
  sizeScale?: number;
}

export function SentientSlime({ data, sizeScale = 1 }: SentientSlimeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);
  const lastAttackTimeRef = useRef(0);
  const hasSplit = useRef(false);

  // Stable initial position — only computed once on mount, never changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialPosition = useMemo<[number, number, number]>(() => [...data.position], []);

  // Local refs for frame-by-frame state — avoids reading stale React props
  const positionRef = useRef<[number, number, number]>([...initialPosition]);
  const rotationRef = useRef(data.rotation);
  const idRef = useRef(data.id);
  const teamRef = useRef(data.team);

  // Each slime gets a unique random target-X offset for different approach paths
  const targetXOffset = useRef((Math.random() - 0.5) * 6);

  // Slime trail
  const [trails, setTrails] = useState<TrailDrop[]>([]);
  const trailTimer = useRef(0);
  const lastTrailPos = useRef<[number, number, number]>([...initialPosition]);
  const trailColor = data.team === 'player' ? '#76ff03' : '#ff4444';

  // Spawn scale animation
  const [spawnSpring, spawnApi] = useSpring(() => ({
    scale: 0,
    config: { tension: 300, friction: 10 },
  }));

  useEffect(() => {
    spawnApi.start({ scale: 1 * sizeScale });
  }, [spawnApi, sizeScale]);

  // Handle death — trigger Split ability
  useEffect(() => {
    if (data.state === 'dying' && !hasSplit.current) {
      hasSplit.current = true;

      const hasSplitAbility = data.abilities.some((a) => a.id === 'split');

      if (hasSplitAbility && sizeScale >= 0.9) {
        const slimeDef = getCardDefinition('sentient_slime');
        if (slimeDef) {
          const miniSlimeDef = {
            ...slimeDef,
            id: 'sentient_slime_mini',
            name: 'Mini Slime',
            baseStats: {
              ...slimeDef.baseStats,
              hp: Math.max(2, Math.floor(slimeDef.baseStats.hp * 0.5)),
              maxHp: Math.max(2, Math.floor(slimeDef.baseStats.maxHp * 0.5)),
              attack: Math.max(1, Math.floor(slimeDef.baseStats.attack * 0.5)),
              speed: slimeDef.baseStats.speed * 1.3,
            },
            abilities: [],
          };

          const deathPos: [number, number, number] = [...positionRef.current];
          const deathTeam = teamRef.current;

          setTimeout(() => {
            const store = useCombatStore.getState();
            const offsetX = 0.8;
            const id1 = store.spawnMinion(miniSlimeDef, deathTeam, 0);
            store.updateMinion(id1, {
              position: [deathPos[0] - offsetX, deathPos[1], deathPos[2]],
            });
            const id2 = store.spawnMinion(miniSlimeDef, deathTeam, 0);
            store.updateMinion(id2, {
              position: [deathPos[0] + offsetX, deathPos[1], deathPos[2]],
            });
          }, 200);
        }
      }

      spawnApi.start({ scale: 0, config: { tension: 200, friction: 20 } });
    }
  }, [data.state, data.abilities, sizeScale, spawnApi]);

  // Main loop — reads store directly, writes position via THREE.js
  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;

    const store = useCombatStore.getState();
    const me = store.getMinion(idRef.current);
    if (!me) return;
    if (me.state === 'dead' || me.state === 'dying' || me.state === 'spawning') return;

    // Current position from our local ref (NOT from store or props)
    const px = positionRef.current[0];
    const py = positionRef.current[1];
    const pz = positionRef.current[2];

    // Target: closest enemy minion, or the opponent's HP bar
    const enemy = store.getClosestEnemy(positionRef.current, me.team);

    let tx: number, tz: number;
    let isMinion = false;

    if (enemy) {
      tx = enemy.position[0];
      tz = enemy.position[2];
      isMinion = true;
    } else {
      // Target the HP bar's actual 3D world position (computed from screen coords)
      const ui = useUIStore.getState();
      tz = me.team === 'player' ? ui.enemyHPBarWorldZ : ui.playerHPBarWorldZ;
      tx = targetXOffset.current;
    }

    const dx = tx - px;
    const dz = tz - pz;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Rotate toward target
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

    // Squishy bounce animation
    if (modelRef.current) {
      const t = state.clock.elapsedTime;
      const sy = 1 + Math.sin(t * 4) * 0.12;
      const sxz = 1 - Math.sin(t * 4) * 0.06;
      modelRef.current.scale.set(sizeScale * sxz, sizeScale * sy, sizeScale * sxz);
    }

    // Attack range
    const range = isMinion ? me.attackRange : 2.0;

    // Attack on cooldown when in range
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

    // Move if not in range
    if (dist > range) {
      if (me.state !== 'moving') {
        store.updateMinion(idRef.current, { state: 'moving' });
      }

      const speed = me.speed;
      const bonus = Math.max(0, 1 - dist / 10) * 0.5;
      const spd = speed * (1 + bonus);
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

    // Write position to THREE.js group
    g.position.x = positionRef.current[0];
    g.position.y = positionRef.current[1];
    g.position.z = positionRef.current[2];

    // Spawn slime trail drops while moving
    trailTimer.current += delta;
    const movedDist = Math.sqrt(
      (positionRef.current[0] - lastTrailPos.current[0]) ** 2 +
      (positionRef.current[2] - lastTrailPos.current[2]) ** 2,
    );
    if (movedDist > 0.8 && trailTimer.current > 0.15) {
      trailTimer.current = 0;
      lastTrailPos.current = [...positionRef.current];
      setTrails((prev) => {
        const next = [
          ...prev,
          {
            id: trailIdCounter++,
            position: [positionRef.current[0], 0.02, positionRef.current[2]] as [number, number, number],
            life: 1.0,
            color: trailColor,
          },
        ];
        if (next.length > TRAIL_MAX) return next.slice(next.length - TRAIL_MAX);
        return next;
      });
    }

    // Sync to store for targeting by other entities
    store.updateMinion(idRef.current, {
      position: [positionRef.current[0], positionRef.current[1], positionRef.current[2]],
      rotation: rotationRef.current,
    });
  });

  // Fade and clean up trail drops
  useEffect(() => {
    if (trails.length === 0) return;
    const interval = setInterval(() => {
      setTrails((prev) =>
        prev
          .map((t) => ({ ...t, life: t.life - 0.02 }))
          .filter((t) => t.life > 0),
      );
    }, 50);
    return () => clearInterval(interval);
  }, [trails.length > 0]);

  const healthPercent = data.currentHp / data.stats.hp;
  const isPlayer = data.team === 'player';

  return (
    <>
      {/* Slime trail — rendered in world space, not parented to slime */}
      {trails.map((t) => (
        <mesh
          key={t.id}
          geometry={trailGeo}
          position={t.position}
          scale={[0.5 + (1 - t.life) * 0.4, 1, 0.5 + (1 - t.life) * 0.4]}
        >
          <meshBasicMaterial
            color={t.color}
            transparent
            opacity={t.life * 0.45}
            depthWrite={false}
          />
        </mesh>
      ))}

      <group ref={groupRef} position={initialPosition}>
        <animated.group ref={innerRef} scale={spawnSpring.scale} renderOrder={10}>
          <group ref={modelRef}>
            <LowPolySlime team={data.team} isDamaged={data.state === 'attacking'} state={data.state} />
          </group>

          {/* Circular health ring */}
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
    </>
  );
}

export default SentientSlime;
