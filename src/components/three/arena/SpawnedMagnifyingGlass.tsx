import { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { CardSlotConfig } from '@/types';
import { useCardStore } from '@/stores/cardStore';
import { useCombatStore } from '@/stores/combatStore';
import { useGameStore } from '@/stores/gameStore';
import { useDamageStore } from '@/stores/damageStore';
import { useBattleStatsStore } from '@/stores/battleStatsStore';
import { LowPolyMagnifyingGlass } from '@/components/three/models/LowPolyMagnifyingGlass';

const CHARGE_DURATION = 1.8;
const FIRE_DURATION = 1.2;
const FADEOUT_DURATION = 0.8;
const AOE_RADIUS = 8.0;
const DAMAGE_MULTIPLIER = 3;

interface SpawnedMagnifyingGlassProps {
  slot: CardSlotConfig;
  team: 'player' | 'enemy';
  onFire: (position: [number, number, number], damage: number) => void;
  damage: number;
  cooldown: number;
  combatId: string;
  onDestroy?: () => void;
}

export function SpawnedMagnifyingGlass({
  slot,
  team,
  damage,
  combatId,
  onDestroy,
}: SpawnedMagnifyingGlassProps) {
  const groupRef = useRef<THREE.Group>(null);
  const phaseRef = useRef<'charging' | 'firing' | 'fadeout' | 'done'>('charging');
  const timerRef = useRef(0);
  const hasFiredRef = useRef(false);
  const [cooldownProgress, setCooldownProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const exhaustCard = useCardStore((state) => state.exhaustCard);
  const recordDamage = useBattleStatsStore((state) => state.recordDamage);

  const [springProps, springApi] = useSpring(() => ({
    scale: 0,
    positionY: -2,
    config: { tension: 200, friction: 18 },
  }));

  useEffect(() => {
    springApi.start({ scale: 1, positionY: 0 });
  }, [springApi]);

  const dealAoeDamage = useCallback(() => {
    if (hasFiredRef.current) return;
    hasFiredRef.current = true;

    const store = useCombatStore.getState();
    const enemyTeam = team === 'player' ? 'enemy' : 'player';
    const targets = store.getMinionsByTeam(enemyTeam);
    const totalDamage = damage * DAMAGE_MULTIPLIER;
    let totalDealt = 0;

    for (const t of targets) {
      const dist = Math.sqrt(t.position[0] ** 2 + t.position[2] ** 2);
      if (dist <= AOE_RADIUS) {
        const falloff = 1 - (dist / AOE_RADIUS) * 0.4;
        const dmg = Math.max(1, Math.floor(totalDamage * falloff));
        store.damageMinion(t.id, dmg, 'burn');
        useDamageStore.getState().addDamageEvent(dmg, t.team, t.position);
        totalDealt += dmg;
      }
    }

    // Also damage the enemy HP bar
    const gs = useGameStore.getState();
    const hpDmg = Math.floor(totalDamage * 0.5);
    if (team === 'player') {
      gs.dealDamageToEnemy(hpDmg);
    } else {
      gs.dealDamageToPlayer(hpDmg);
    }
    totalDealt += hpDmg;

    gs.addCameraTrauma(0.4);
    recordDamage('magnifying_glass', totalDealt);

    exhaustCard(slot.index, team);
  }, [team, damage, slot.index, exhaustCard, recordDamage]);

  useFrame((_, delta) => {
    const phase = phaseRef.current;
    if (phase === 'done') return;

    timerRef.current += delta;

    if (phase === 'charging') {
      const progress = Math.min(timerRef.current / CHARGE_DURATION, 1);
      setCooldownProgress(progress);

      if (progress >= 1) {
        phaseRef.current = 'firing';
        timerRef.current = 0;
        setIsReady(true);
        dealAoeDamage();
      }
    } else if (phase === 'firing') {
      if (timerRef.current >= FIRE_DURATION) {
        phaseRef.current = 'fadeout';
        timerRef.current = 0;
        setIsReady(false);
        setCooldownProgress(0);

        springApi.start({
          scale: 0,
          positionY: 3,
          config: { tension: 120, friction: 20 },
        });
      }
    } else if (phase === 'fadeout') {
      if (timerRef.current >= FADEOUT_DURATION) {
        phaseRef.current = 'done';
        onDestroy?.();
      }
    }
  });

  return (
    <animated.group
      ref={groupRef}
      position-x={0}
      position-y={springProps.positionY}
      position-z={0}
      scale={springProps.scale}
      renderOrder={10}
    >
      <LowPolyMagnifyingGlass
        team={team}
        isReady={isReady}
        cooldownProgress={cooldownProgress}
        isDamaged={false}
      />
    </animated.group>
  );
}

export default SpawnedMagnifyingGlass;
