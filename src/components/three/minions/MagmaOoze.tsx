/**
 * MagmaOoze - Heated slime that leaves a trail of fire.
 *
 * Based on SentientSlime locomotion but with:
 * - Fire trail that persists and damages enemies walking through it
 * - Burn status effect applied on ram attack
 * - Slower, heavier movement with molten visual
 * - No split ability
 */

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';

import { LowPolyMagmaOoze } from '../models/LowPolyMagmaOoze';
import { useCombatStore } from '@/stores/combatStore';
import { useGameStore } from '@/stores/gameStore';
import { useDamageStore } from '@/stores/damageStore';
import { useBattleStatsStore } from '@/stores/battleStatsStore';

import { resolveCollisions } from './separation';
import { minionPositions } from '@/utils/minionPositionRegistry';
import type { MinionComponentProps } from '@/data/minionRegistry';
import { ARENA_BOUNDS, ARENA } from '@/types';
import type { CombatMinion } from '@/stores/combatStore';

/* ── Fire trail ring geometry (flat on ground) ─────────────────────── */
const trailGeo = new THREE.RingGeometry(0.15, 0.5, 8);
trailGeo.rotateX(-Math.PI / 2);

const TRAIL_MAX = 50;
const TRAIL_PERSIST = 4.0; // seconds the trail stays alive (matches card text)
const TRAIL_DAMAGE = 2;    // damage per tick to enemies in the fire
const TRAIL_DMG_INTERVAL = 1.0;
const TRAIL_HIT_RADIUS = 0.6;

interface TrailSlot {
  life: number;
  x: number;
  z: number;
  team: 'player' | 'enemy';
}

interface MagmaOozeProps {
  data: CombatMinion;
  sizeScale?: number;
  onFire?: MinionComponentProps['onFire'];
}

export function MagmaOoze({ data, sizeScale = 1 }: MagmaOozeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);
  const lastAttackTimeRef = useRef(0);

  const attackAnimTimer = useRef(-1);
  const attackDamageDealt = useRef(false);
  const attackTargetInfo = useRef<{
    isMinion: boolean;
    enemyId: string | null;
    tx: number;
    tz: number;
  } | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialPosition = useMemo<[number, number, number]>(() => [...data.position], []);

  const positionRef = useRef<[number, number, number]>([...initialPosition]);
  const rotationRef = useRef(data.rotation);
  const idRef = useRef(data.id);
  const teamRef = useRef(data.team);

  const targetXOffset = useRef((Math.random() - 0.5) * 6);

  /* ── Trail state ─────────────────────────────────────────────────── */
  const trailSlots = useRef<TrailSlot[]>(
    Array.from({ length: TRAIL_MAX }, () => ({ life: 0, x: 0, z: 0, team: data.team })),
  );
  const trailMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const trailTimer = useRef(0);
  const trailWriteIdx = useRef(0);
  const lastTrailPos = useRef<[number, number, number]>([...initialPosition]);
  const trailDmgClock = useRef(0);

  const trailMats = useMemo(() =>
    Array.from({ length: TRAIL_MAX }, () => new THREE.MeshBasicMaterial({
      color: '#FF4500',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    })),
    [],
  );

  /* ── Spawn animation ─────────────────────────────────────────────── */
  const [spawnSpring, spawnApi] = useSpring(() => ({
    scale: 0,
    config: { tension: 300, friction: 10 },
  }));

  useEffect(() => {
    spawnApi.start({ scale: 1 * sizeScale });
  }, [spawnApi, sizeScale]);

  /* ── Death animation ─────────────────────────────────────────────── */
  useEffect(() => {
    if (data.state === 'dying') {
      spawnApi.start({ scale: 0, config: { tension: 200, friction: 20 } });
    }
  }, [data.state, spawnApi]);

  /* ── Main loop ───────────────────────────────────────────────────── */
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
      tz = me.team === 'player' ? ARENA.enemyThroneZ : ARENA.playerThroneZ;
      tx = targetXOffset.current;
      tz = Math.max(ARENA_BOUNDS.minZ, Math.min(ARENA_BOUNDS.maxZ, tz));
      tx = Math.max(ARENA_BOUNDS.minX, Math.min(ARENA_BOUNDS.maxX, tx));
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
      rot += diff * Math.min(1, 6 * delta);
      rotationRef.current = rot;
    }
    if (innerRef.current) innerRef.current.rotation.y = rotationRef.current;

    const enemyRadius = enemy ? (minionPositions.get(enemy.id)?.radius ?? 0.75) : 0;
    const meleeRange = me.collisionRadius + enemyRadius + 0.5;
    const range = isMinion ? Math.max(me.attackRange, meleeRange) : me.collisionRadius * 0.5;

    /* ── Ram attack animation ─────────────────────────────────────── */
    const WINDUP_DUR = 0.35;
    const SLAM_DUR = 0.12;
    const RECOVER_DUR = 0.35;
    const ATTACK_TOTAL = WINDUP_DUR + SLAM_DUR + RECOVER_DUR;
    const REEL_BACK = -1.2;
    const SLAM_FORWARD = 2.5;

    if (dist <= range) {
      const now = state.clock.elapsedTime;
      if (now - lastAttackTimeRef.current >= me.attackCooldown && attackAnimTimer.current < 0) {
        lastAttackTimeRef.current = now;
        attackAnimTimer.current = 0;
        attackDamageDealt.current = false;
        attackTargetInfo.current = { isMinion, enemyId: enemy?.id ?? null, tx, tz };
        store.updateMinion(idRef.current, { state: 'attacking' });
      }
    }

    /* ── Model animation: attack ram → hop → idle breathing ──────── */
    if (modelRef.current) {
      const t = state.clock.elapsedTime;
      const isMoving = dist > range && attackAnimTimer.current < 0;

      if (attackAnimTimer.current >= 0) {
        attackAnimTimer.current += delta;
        const at = attackAnimTimer.current;

        if (at < WINDUP_DUR) {
          const p = at / WINDUP_DUR;
          const ease = p * p;
          modelRef.current.position.z = REEL_BACK * ease;
          modelRef.current.position.y = 0;
          const sy = 1 - 0.35 * ease;
          const sxz = 1 + 0.3 * ease;
          modelRef.current.scale.set(sizeScale * sxz, sizeScale * sy, sizeScale * sxz);
        } else if (at < WINDUP_DUR + SLAM_DUR) {
          const p = (at - WINDUP_DUR) / SLAM_DUR;
          const ease = 1 - (1 - p) * (1 - p);
          const z = REEL_BACK + (SLAM_FORWARD - REEL_BACK) * ease;
          modelRef.current.position.z = z;
          modelRef.current.position.y = Math.sin(p * Math.PI) * 0.3;
          const sy = 0.65 + 0.6 * ease;
          const sxz = 1.3 - 0.45 * ease;
          modelRef.current.scale.set(sizeScale * sxz, sizeScale * sy, sizeScale * sxz);

          // Deal damage + apply burn at impact
          if (p > 0.75 && !attackDamageDealt.current) {
            attackDamageDealt.current = true;
            const info = attackTargetInfo.current;
            if (info) {
              if (info.isMinion && info.enemyId) {
                const target = store.getMinion(info.enemyId);
                if (target) {
                  store.damageMinion(info.enemyId, me.stats.attack, 'burn');
                  useDamageStore.getState().addDamageEvent(me.stats.attack, target.team, target.position);
                  useGameStore.getState().addCameraTrauma(0.06);
                }
              } else {
                const tgt = me.team === 'player' ? 'enemy' : 'player';
                const gs = useGameStore.getState();
                if (tgt === 'enemy') gs.dealDamageToEnemy(me.stats.attack);
                else gs.dealDamageToPlayer(me.stats.attack);
                useDamageStore.getState().addDamageEvent(me.stats.attack, tgt, [info.tx, py, info.tz]);
                gs.addCameraTrauma(0.08);

                // Apply burn status to the HP bar
                gs.applyStatusEffect(tgt, {
                  type: 'burn',
                  damagePerTick: 2,
                  tickInterval: 1.0,
                  duration: 3.0,
                }, me.cardDefinitionId);
              }
              useBattleStatsStore.getState().recordDamage(me.cardDefinitionId, me.stats.attack);
            }
          }
        } else if (at < ATTACK_TOTAL) {
          const p = (at - WINDUP_DUR - SLAM_DUR) / RECOVER_DUR;
          const ease = 1 - (1 - p) * (1 - p);
          const overshoot = Math.sin(p * Math.PI) * -0.25;
          modelRef.current.position.z = SLAM_FORWARD * (1 - ease) + overshoot;
          modelRef.current.position.y = 0;
          const sy = 1.25 - 0.25 * ease;
          const sxz = 0.85 + 0.15 * ease;
          modelRef.current.scale.set(sizeScale * sxz, sizeScale * sy, sizeScale * sxz);
        } else {
          attackAnimTimer.current = -1;
          attackDamageDealt.current = false;
          attackTargetInfo.current = null;
          modelRef.current.position.z = 0;
          modelRef.current.position.y = 0;
          modelRef.current.scale.set(sizeScale, sizeScale, sizeScale);
        }
      } else if (isMoving) {
        // Heavier hop — slower, lower
        const hopPeriod = 0.5;
        const hopPhase = (t % hopPeriod) / hopPeriod;
        const hopArc = Math.sin(hopPhase * Math.PI);
        modelRef.current.position.y = hopArc * 0.4;
        modelRef.current.position.z = 0;
        const sy = 0.88 + hopArc * 0.25;
        const sxz = 1.08 - hopArc * 0.15;
        modelRef.current.scale.set(sizeScale * sxz, sizeScale * sy, sizeScale * sxz);
      } else {
        modelRef.current.position.y = 0;
        modelRef.current.position.z = 0;
        const sy = 1 + Math.sin(t * 2.5) * 0.05;
        const sxz = 1 - Math.sin(t * 2.5) * 0.03;
        modelRef.current.scale.set(sizeScale * sxz, sizeScale * sy, sizeScale * sxz);
      }
    }

    /* ── Movement ─────────────────────────────────────────────────── */
    if (dist > range && attackAnimTimer.current < 0) {
      if (me.state !== 'moving') {
        store.updateMinion(idRef.current, { state: 'moving' });
      }

      const speed = me.speed;
      const bonus = Math.max(0, 1 - dist / 10) * 0.3;
      const spd = speed * (1 + bonus);
      const nx = dx / dist;
      const nz = dz / dist;

      const newX = px + nx * spd * delta;
      const newZ = pz + nz * spd * delta;
      const [resolvedX, resolvedZ] = resolveCollisions(idRef.current, newX, newZ);
      positionRef.current = [resolvedX, py, resolvedZ];
    } else {
      const [resolvedX, resolvedZ] = resolveCollisions(idRef.current, px, pz);
      positionRef.current = [resolvedX, py, resolvedZ];
    }

    g.position.x = positionRef.current[0];
    g.position.y = positionRef.current[1];
    g.position.z = positionRef.current[2];

    /* ── Fire trail placement ─────────────────────────────────────── */
    trailTimer.current += delta;
    const movedDist = Math.sqrt(
      (positionRef.current[0] - lastTrailPos.current[0]) ** 2 +
      (positionRef.current[2] - lastTrailPos.current[2]) ** 2,
    );
    if (movedDist > 0.6 && trailTimer.current > 0.1) {
      trailTimer.current = 0;
      lastTrailPos.current = [...positionRef.current];
      const slot = trailSlots.current[trailWriteIdx.current % TRAIL_MAX];
      slot.life = TRAIL_PERSIST;
      slot.x = positionRef.current[0];
      slot.z = positionRef.current[2];
      slot.team = teamRef.current;
      trailWriteIdx.current++;
    }

    /* ── Trail rendering + damage tick ────────────────────────────── */
    trailDmgClock.current += delta;
    const shouldDamage = trailDmgClock.current >= TRAIL_DMG_INTERVAL;
    if (shouldDamage) trailDmgClock.current = 0;

    for (let i = 0; i < TRAIL_MAX; i++) {
      const s = trailSlots.current[i];
      const mesh = trailMeshRefs.current[i];
      if (!mesh) continue;
      if (s.life <= 0) {
        mesh.visible = false;
        continue;
      }
      s.life -= delta;
      mesh.visible = true;
      mesh.position.set(s.x, 0.03, s.z);

      const lifeNorm = s.life / TRAIL_PERSIST;
      const sc = 0.6 + (1 - lifeNorm) * 0.3;
      mesh.scale.set(sc, 1, sc);
      trailMats[i].opacity = lifeNorm * 0.7;

      // Color shifts from bright orange → dark red as it fades
      const r = 1.0;
      const g = 0.15 + lifeNorm * 0.15;
      const b = 0;
      trailMats[i].color.setRGB(r, g, b);

      // Damage enemies standing in the fire trail
      if (shouldDamage && s.life > 0) {
        const enemyTeam = s.team === 'player' ? 'enemy' : 'player';
        const enemies = store.getMinionsByTeam(enemyTeam);
        for (const m of enemies) {
          if (m.state === 'dead' || m.state === 'dying') continue;
          const mdx = m.position[0] - s.x;
          const mdz = m.position[2] - s.z;
          const mDist = Math.sqrt(mdx * mdx + mdz * mdz);
          if (mDist < TRAIL_HIT_RADIUS) {
            store.damageMinion(m.id, TRAIL_DAMAGE, 'burn');
            useDamageStore.getState().addDamageEvent(TRAIL_DAMAGE, m.team, m.position);
          }
        }
      }
    }

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
    <>
      {/* Fire trail meshes */}
      {trailMats.map((mat, i) => (
        <mesh
          key={i}
          ref={(el) => { trailMeshRefs.current[i] = el; }}
          geometry={trailGeo}
          material={mat}
          visible={false}
        />
      ))}

      <group ref={groupRef} position={initialPosition}>
        <animated.group ref={innerRef} scale={spawnSpring.scale} renderOrder={10}>
          <group ref={modelRef}>
            <LowPolyMagmaOoze team={data.team} isDamaged={data.state === 'attacking'} state={data.state} />
          </group>

          {/* Health ring */}
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

export default MagmaOoze;
