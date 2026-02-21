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
import { useUIStore } from '@/stores/uiStore';
import { resolveCollisions } from './separation';
import { minionPositions } from '@/utils/minionPositionRegistry';
import { ARENA_BOUNDS } from '@/types';
import type { CombatMinion } from '@/stores/combatStore';

const BATTERY_RADIUS = 0.6;
const CHAIN_RANGE = 5;
const MAX_CHAIN_TARGETS = 2;
const CHAIN_DAMAGE_FALLOFF = 0.5;
const AURA_RADIUS = 1.5;
const AURA_COOLDOWN = 1.0;

const BOLT_SEGMENTS = 8;

const _lightningMat = new THREE.LineBasicMaterial({
  color: 0x00ffff,
  transparent: true,
  opacity: 0.85,
  blending: THREE.AdditiveBlending,
});

interface BatteryMinionProps {
  data: CombatMinion;
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
    const range = isMinion ? Math.max(me.attackRange, meleeRange) : me.attackRange;

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
