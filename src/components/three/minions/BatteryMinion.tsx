/**
 * BatteryMinion - Rolling AA battery that emits chain lightning
 *
 * Movement: rolls toward the nearest enemy, rotating around X axis
 * proportional to distance traveled (realistic rolling).
 *
 * Attack: emits chain lightning arcs to all enemies within range,
 * dealing damage to the closest and chaining visual arcs to up to
 * 2 additional nearby enemies.
 */

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';

import { LowPolyBattery } from '../models/LowPolyBattery';
import { useCombatStore } from '@/stores/combatStore';
import { useGameStore } from '@/stores/gameStore';
import { useDamageStore } from '@/stores/damageStore';
import { useBattleStatsStore } from '@/stores/battleStatsStore';

import { resolveCollisions } from './separation';
import { minionPositions } from '@/utils/minionPositionRegistry';
import { ARENA_BOUNDS, ARENA } from '@/types';
import type { MinionComponentProps } from '@/data/minionRegistry';
import type { CombatMinion } from '@/stores/combatStore';

const BATTERY_RADIUS = 0.6;
const CHAIN_RANGE = 5;
const MAX_CHAIN_TARGETS = 2;
const CHAIN_DAMAGE_FALLOFF = 0.5;
const AURA_RADIUS = 1.5;
const AURA_COOLDOWN = 1.0;

const BOLT_SEGMENTS = 8;

// Cluster explosion constants
const CLUSTER_SIZE = 3;
const COLLISION_OVERLAP_FACTOR = 0.85; // fraction of combined radii — must physically overlap, not just touch
const EXPLOSION_DAMAGE = 15;
const EXPLOSION_AOE_RADIUS = 5.0;
const EXPLOSION_BOLT_COUNT = 12;

// Prevents multiple batteries in the same cluster from each triggering the explosion
const _explodedThisFrame = new Set<string>();
let _lastExplodeFrame = -1;

const _lightningMat = new THREE.LineBasicMaterial({
  color: 0x00ffff,
  transparent: true,
  opacity: 0.85,
  blending: THREE.AdditiveBlending,
});

interface BatteryMinionProps {
  data: CombatMinion;
  sizeScale?: number;
  onFire?: MinionComponentProps['onFire'];
}

export function BatteryMinion({ data }: BatteryMinionProps) {
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);
  const lastAttackTimeRef = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialPosition = useMemo<[number, number, number]>(() => [...data.position], []);

  const positionRef = useRef<[number, number, number]>([...initialPosition]);
  const rotationRef = useRef(data.rotation);
  const rollAngleRef = useRef(0);
  const idRef = useRef(data.id);

  const targetXOffset = useRef((Math.random() - 0.5) * 6);

  const isPlayer = data.team === 'player';

  // Chain lightning bolt visuals (pre-allocated pool)
  const chainBolts = useMemo(() => {
    return Array.from({ length: MAX_CHAIN_TARGETS + 1 }, () => {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(BOLT_SEGMENTS * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = _lightningMat.clone();
      mat.color = new THREE.Color(isPlayer ? 0x00ffff : 0xff4444);
      const line = new THREE.Line(geo, mat);
      line.frustumCulled = false;
      line.visible = false;
      return line;
    });
  }, [isPlayer]);

  const chainBoltTimers = useRef<number[]>(new Array(MAX_CHAIN_TARGETS + 1).fill(0));
  const auraCooldowns = useRef<Map<string, number>>(new Map());

  // Explosion bolts — radial arcs from detonation point
  const explosionBolts = useMemo(() => {
    return Array.from({ length: EXPLOSION_BOLT_COUNT }, () => {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(BOLT_SEGMENTS * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({
        color: isPlayer ? 0x00ffff : 0xff4444,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        linewidth: 2,
      });
      const line = new THREE.Line(geo, mat);
      line.frustumCulled = false;
      line.visible = false;
      return line;
    });
  }, [isPlayer]);
  const explosionBoltTimers = useRef<number[]>(new Array(EXPLOSION_BOLT_COUNT).fill(0));
  const hasExploded = useRef(false);

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
      tz = me.team === 'player' ? ARENA.enemyThroneZ : ARENA.playerThroneZ;
      tx = targetXOffset.current;
      tz = Math.max(ARENA_BOUNDS.minZ, Math.min(ARENA_BOUNDS.maxZ, tz));
      tx = Math.max(ARENA_BOUNDS.minX, Math.min(ARENA_BOUNDS.maxX, tx));
    }

    const dx = tx - px;
    const dz = tz - pz;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Face target
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
    const range = isMinion ? Math.max(me.attackRange, meleeRange) : me.collisionRadius * 0.5;

    // Chain lightning attack — fires while rolling, doesn't stop
    const now = state.clock.elapsedTime;
    if (dist <= range && now - lastAttackTimeRef.current >= me.attackCooldown) {
      lastAttackTimeRef.current = now;

      if (isMinion && enemy) {
        store.damageMinion(enemy.id, me.stats.attack, 'shocked');
        useDamageStore.getState().addDamageEvent(me.stats.attack, enemy.team, enemy.position);
        useGameStore.getState().addCameraTrauma(0.04);

        fireLightningBolt(0, px, py, pz, enemy.position[0], enemy.position[1] + 0.5, enemy.position[2]);

        const enemyTeam = me.team === 'player' ? 'enemy' : 'player';
        const allEnemies = store.getMinionsByTeam(enemyTeam);
        let chainsUsed = 0;
        for (const other of allEnemies) {
          if (chainsUsed >= MAX_CHAIN_TARGETS) break;
          if (other.id === enemy.id) continue;
          const cdx = other.position[0] - enemy.position[0];
          const cdz = other.position[2] - enemy.position[2];
          const chainDist = Math.sqrt(cdx * cdx + cdz * cdz);
          if (chainDist <= CHAIN_RANGE) {
            const chainDmg = Math.max(1, Math.floor(me.stats.attack * CHAIN_DAMAGE_FALLOFF));
            store.damageMinion(other.id, chainDmg, 'shocked');
            useDamageStore.getState().addDamageEvent(chainDmg, other.team, other.position);

            fireLightningBolt(
              chainsUsed + 1,
              enemy.position[0], enemy.position[1] + 0.5, enemy.position[2],
              other.position[0], other.position[1] + 0.5, other.position[2],
            );
            chainsUsed++;
          }
        }
      } else {
        const tgt = me.team === 'player' ? 'enemy' : 'player';
        const gs = useGameStore.getState();
        if (tgt === 'enemy') gs.dealDamageToEnemy(me.stats.attack);
        else gs.dealDamageToPlayer(me.stats.attack);
        useDamageStore.getState().addDamageEvent(me.stats.attack, tgt, [tx, py, tz]);
        gs.addCameraTrauma(0.05);

        fireLightningBolt(0, px, py, pz, tx, py + 0.5, tz);
      }
      useBattleStatsStore.getState().recordDamage(me.cardDefinitionId, me.stats.attack);
    }

    // Always roll toward the target — only stop when right on top of it
    let moveDist = 0;
    const stopDist = 0.5;
    if (dist > stopDist) {
      if (me.state !== 'moving') {
        store.updateMinion(idRef.current, { state: 'moving' });
      }
      const spd = me.speed * (1 + Math.max(0, 1 - dist / 10) * 0.5);
      const nx = dx / dist;
      const nz = dz / dist;
      const newX = px + nx * spd * delta;
      const newZ = pz + nz * spd * delta;
      const [resolvedX, resolvedZ] = resolveCollisions(idRef.current, newX, newZ);
      moveDist = Math.sqrt((resolvedX - px) ** 2 + (resolvedZ - pz) ** 2);
      positionRef.current = [resolvedX, py, resolvedZ];
    } else {
      const [resolvedX, resolvedZ] = resolveCollisions(idRef.current, px, pz);
      positionRef.current = [resolvedX, py, resolvedZ];
    }

    rollAngleRef.current += moveDist / BATTERY_RADIUS;

    g.position.x = positionRef.current[0];
    g.position.y = positionRef.current[1];
    g.position.z = positionRef.current[2];

    // Fade out chain bolts
    for (let i = 0; i < chainBolts.length; i++) {
      if (chainBoltTimers.current[i] > 0) {
        chainBoltTimers.current[i] -= delta;
        const bolt = chainBolts[i];
        const mat = bolt.material as THREE.LineBasicMaterial;
        mat.opacity = Math.max(0, chainBoltTimers.current[i] / 0.15) * 0.85;
        if (chainBoltTimers.current[i] <= 0) {
          bolt.visible = false;
        }
      }
    }

    // Fade out explosion bolts
    for (let i = 0; i < EXPLOSION_BOLT_COUNT; i++) {
      if (explosionBoltTimers.current[i] > 0) {
        explosionBoltTimers.current[i] -= delta;
        const bolt = explosionBolts[i];
        const mat = bolt.material as THREE.LineBasicMaterial;
        mat.opacity = Math.max(0, explosionBoltTimers.current[i] / 0.35) * 0.95;
        if (explosionBoltTimers.current[i] <= 0) {
          bolt.visible = false;
        }
      }
    }

    // Discharge aura — shock enemies on contact (no direct damage, status only)
    const enemyTeamAura = me.team === 'player' ? 'enemy' : 'player';
    const auraEnemies = store.getMinionsByTeam(enemyTeamAura);
    const cx = positionRef.current[0];
    const cz = positionRef.current[2];

    for (const target of auraEnemies) {
      const adx = target.position[0] - cx;
      const adz = target.position[2] - cz;
      const aDist = Math.sqrt(adx * adx + adz * adz);
      if (aDist > AURA_RADIUS) continue;

      const lastShock = auraCooldowns.current.get(target.id) ?? 0;
      if (now - lastShock < AURA_COOLDOWN) continue;

      auraCooldowns.current.set(target.id, now);
      store.applyMinionStatus(target.id, 'shocked', { duration: 1.0, damagePerTick: 0, tickInterval: 0.5 });
    }

    // ── Cluster Explosion: 3 batteries collide → electric burst ────
    // Reset per-frame guard on new frame
    const frameId = Math.round(state.clock.elapsedTime * 1000);
    if (frameId !== _lastExplodeFrame) {
      _explodedThisFrame.clear();
      _lastExplodeFrame = frameId;
    }

    if (!hasExploded.current && !_explodedThisFrame.has(idRef.current)) {
      const allies = store.getMinionsByTeam(me.team);
      const myRadius = me.collisionRadius;

      // Find other batteries that are physically colliding with this one
      // (center distance < sum of radii * overlap factor)
      const collidingBatteries: CombatMinion[] = [];

      for (const ally of allies) {
        if (ally.id === idRef.current) continue;
        if (ally.cardDefinitionId !== 'old_battery') continue;
        if (_explodedThisFrame.has(ally.id)) continue;

        const adx = ally.position[0] - cx;
        const adz = ally.position[2] - cz;
        const aDist = Math.sqrt(adx * adx + adz * adz);
        const collisionThreshold = (myRadius + ally.collisionRadius) * COLLISION_OVERLAP_FACTOR;
        if (aDist <= collisionThreshold) {
          collidingBatteries.push(ally);
        }
      }

      if (collidingBatteries.length >= CLUSTER_SIZE - 1) {
        // Pick the closest CLUSTER_SIZE-1 batteries
        collidingBatteries.sort((a, b) => {
          const da = (a.position[0] - cx) ** 2 + (a.position[2] - cz) ** 2;
          const db = (b.position[0] - cx) ** 2 + (b.position[2] - cz) ** 2;
          return da - db;
        });
        const cluster = collidingBatteries.slice(0, CLUSTER_SIZE - 1);

        // Verify all pairs in the cluster are actually colliding
        let allColliding = true;
        for (let i = 0; i < cluster.length && allColliding; i++) {
          for (let j = i + 1; j < cluster.length; j++) {
            const pdx = cluster[i].position[0] - cluster[j].position[0];
            const pdz = cluster[i].position[2] - cluster[j].position[2];
            const pDist = Math.sqrt(pdx * pdx + pdz * pdz);
            const pairThreshold = (cluster[i].collisionRadius + cluster[j].collisionRadius) * COLLISION_OVERLAP_FACTOR;
            if (pDist > pairThreshold) {
              allColliding = false;
              break;
            }
          }
        }
        if (allColliding) {
          _explodedThisFrame.add(idRef.current);
          for (const m of cluster) _explodedThisFrame.add(m.id);
          hasExploded.current = true;

          // Compute explosion center
          let epx = cx, epz = cz;
          for (const m of cluster) {
            epx += m.position[0];
            epz += m.position[2];
          }
          epx /= CLUSTER_SIZE;
          epz /= CLUSTER_SIZE;

          // Fire radial explosion bolts from center
          for (let i = 0; i < EXPLOSION_BOLT_COUNT; i++) {
            const angle = (i / EXPLOSION_BOLT_COUNT) * Math.PI * 2;
            const boltLen = EXPLOSION_AOE_RADIUS * (0.6 + Math.random() * 0.4);
            fireExplosionBolt(
              i,
              epx, py + 0.5, epz,
              epx + Math.cos(angle) * boltLen,
              py + 0.3 + Math.random() * 1.5,
              epz + Math.sin(angle) * boltLen,
            );
          }

          // AoE damage to all enemies in explosion radius
          const enemyTeam = me.team === 'player' ? 'enemy' : 'player';
          const targets = store.getMinionsByTeam(enemyTeam);
          for (const t of targets) {
            const tdx = t.position[0] - epx;
            const tdz = t.position[2] - epz;
            const tDist = Math.sqrt(tdx * tdx + tdz * tdz);
            if (tDist <= EXPLOSION_AOE_RADIUS) {
              const falloff = 1 - (tDist / EXPLOSION_AOE_RADIUS) * 0.5;
              const dmg = Math.max(1, Math.floor(EXPLOSION_DAMAGE * falloff));
              store.damageMinion(t.id, dmg, 'shocked');
              useDamageStore.getState().addDamageEvent(dmg, t.team, t.position);
            }
          }

          // Also damage the HP bar if close enough
          const hpZ = me.team === 'player' ? ARENA.enemyThroneZ : ARENA.playerThroneZ;
          const hpDist = Math.abs(epz - hpZ);
          if (hpDist <= EXPLOSION_AOE_RADIUS) {
            const falloff = 1 - (hpDist / EXPLOSION_AOE_RADIUS) * 0.5;
            const dmg = Math.max(1, Math.floor(EXPLOSION_DAMAGE * falloff));
            const tgt = me.team === 'player' ? 'enemy' : 'player';
            const gs = useGameStore.getState();
            if (tgt === 'enemy') gs.dealDamageToEnemy(dmg);
            else gs.dealDamageToPlayer(dmg);
            useDamageStore.getState().addDamageEvent(dmg, tgt, [epx, py, hpZ]);
            gs.applyStatusEffect(tgt, {
              type: 'shocked',
              damagePerTick: 0,
              tickInterval: 0.5,
              duration: 2.0,
            }, me.cardDefinitionId);
          }

          useGameStore.getState().addCameraTrauma(0.35);
          useBattleStatsStore.getState().recordDamage(me.cardDefinitionId, EXPLOSION_DAMAGE);

          // Kill all batteries in the cluster (including self)
          store.damageMinion(idRef.current, 9999);
          for (const m of cluster) {
            store.damageMinion(m.id, 9999);
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

  function fireLightningBolt(
    boltIndex: number,
    sx: number, sy: number, sz: number,
    ex: number, ey: number, ez: number,
  ) {
    const bolt = chainBolts[boltIndex];
    if (!bolt) return;

    bolt.visible = true;
    chainBoltTimers.current[boltIndex] = 0.15;
    (bolt.material as THREE.LineBasicMaterial).opacity = 0.85;

    const positions = bolt.geometry.attributes.position.array as Float32Array;
    // Offset to local space of the group
    const gx = positionRef.current[0];
    const gy = positionRef.current[1];
    const gz = positionRef.current[2];

    for (let j = 0; j < BOLT_SEGMENTS; j++) {
      const t = j / (BOLT_SEGMENTS - 1);
      let x = (sx - gx) + ((ex - gx) - (sx - gx)) * t;
      let y = (sy - gy) + ((ey - gy) - (sy - gy)) * t;
      let z = (sz - gz) + ((ez - gz) - (sz - gz)) * t;

      if (j > 0 && j < BOLT_SEGMENTS - 1) {
        x += (Math.random() - 0.5) * 0.6;
        y += (Math.random() - 0.5) * 0.6;
        z += (Math.random() - 0.5) * 0.6;
      }

      positions[j * 3] = x;
      positions[j * 3 + 1] = y;
      positions[j * 3 + 2] = z;
    }
    bolt.geometry.attributes.position.needsUpdate = true;
  }

  function fireExplosionBolt(
    boltIndex: number,
    sx: number, sy: number, sz: number,
    ex: number, ey: number, ez: number,
  ) {
    const bolt = explosionBolts[boltIndex];
    if (!bolt) return;

    bolt.visible = true;
    explosionBoltTimers.current[boltIndex] = 0.35;
    (bolt.material as THREE.LineBasicMaterial).opacity = 0.95;

    const positions = bolt.geometry.attributes.position.array as Float32Array;
    const gx = positionRef.current[0];
    const gy = positionRef.current[1];
    const gz = positionRef.current[2];

    for (let j = 0; j < BOLT_SEGMENTS; j++) {
      const t = j / (BOLT_SEGMENTS - 1);
      let x = (sx - gx) + ((ex - gx) - (sx - gx)) * t;
      let y = (sy - gy) + ((ey - gy) - (sy - gy)) * t;
      let z = (sz - gz) + ((ez - gz) - (sz - gz)) * t;

      if (j > 0 && j < BOLT_SEGMENTS - 1) {
        x += (Math.random() - 0.5) * 1.2;
        y += (Math.random() - 0.5) * 1.2;
        z += (Math.random() - 0.5) * 1.2;
      }

      positions[j * 3] = x;
      positions[j * 3 + 1] = y;
      positions[j * 3 + 2] = z;
    }
    bolt.geometry.attributes.position.needsUpdate = true;
  }

  const healthPercent = data.currentHp / data.stats.hp;

  return (
    <group ref={groupRef} position={initialPosition}>
      <animated.group ref={innerRef} scale={spawnSpring.scale} renderOrder={10}>
        <LowPolyBattery
          team={data.team}
          isDamaged={data.state === 'attacking'}
          state={data.state}
          rollAngleRef={rollAngleRef}
          skipYRotation
        />

        {/* Chain lightning bolt visuals */}
        {chainBolts.map((bolt, i) => (
          <primitive key={`chain-${i}`} object={bolt} />
        ))}

        {/* Cluster explosion bolt visuals */}
        {explosionBolts.map((bolt, i) => (
          <primitive key={`explode-${i}`} object={bolt} />
        ))}

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
  );
}

export default BatteryMinion;
