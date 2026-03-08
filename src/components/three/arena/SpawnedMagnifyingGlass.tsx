import { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { CardSlotConfig, ARENA } from '@/types';
import { useGameStore } from '@/stores/gameStore';
import { useBattleStatsStore } from '@/stores/battleStatsStore';
import { LowPolyMagnifyingGlass } from '@/components/three/models/LowPolyMagnifyingGlass';

const CHARGE_DURATION = 1.8;
const FIRE_DURATION = 1.2;
const FADEOUT_DURATION = 0.8;

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
  onDestroy,
}: SpawnedMagnifyingGlassProps) {
  const groupRef = useRef<THREE.Group>(null);
  const phaseRef = useRef<'charging' | 'firing' | 'fadeout' | 'done'>('charging');
  const timerRef = useRef(0);
  const hasFiredRef = useRef(false);
  const [cooldownProgress, setCooldownProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const recordDamage = useBattleStatsStore((state) => state.recordDamage);

  const [springProps, springApi] = useSpring(() => ({
    scale: 0,
    positionY: -2,
    config: { tension: 200, friction: 18 },
  }));

  useEffect(() => {
    springApi.start({ scale: 1, positionY: 0 });
  }, [springApi]);

  const dealCrystalDamage = useCallback(() => {
    if (hasFiredRef.current) return;
    hasFiredRef.current = true;

    const gs = useGameStore.getState();
    if (team === 'player') {
      gs.dealDamageToEnemy(damage);
    } else {
      gs.dealDamageToPlayer(damage);
    }

    gs.addCameraTrauma(0.4);
    recordDamage('magnifying_glass', damage);
  }, [team, damage, recordDamage]);

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
        dealCrystalDamage();
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

  const crystalZ = team === 'player' ? ARENA.enemyThroneZ : ARENA.playerThroneZ;

  return (
    <animated.group
      ref={groupRef}
      position-x={0}
      position-y={springProps.positionY}
      position-z={crystalZ}
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
