import { useState, useEffect, useRef } from 'react';
import { useSpring } from '@react-spring/three';
import { useCombatStore } from '@/stores/combatStore';

/**
 * Manages the spawn/death lifecycle for constructs (toasters, cacti, batteries, etc.).
 * Returns spring props for animated.group, plus combat data and health state.
 */
export function useConstructLifecycle(combatId: string, onDestroy?: () => void) {
  const [spawned, setSpawned] = useState(false);
  const [isDying, setIsDying] = useState(false);
  const hasCalledDestroy = useRef(false);

  const combatData = useCombatStore((state) => state.minions.get(combatId));
  const maxHp = combatData?.stats?.hp ?? 1;
  const currentHp = combatData?.currentHp ?? 0;
  const healthPercent = maxHp > 0 ? currentHp / maxHp : 0;
  const combatState = combatData?.state;

  const [springProps, springApi] = useSpring(() => ({
    scale: 0,
    positionY: -1,
    config: { tension: 300, friction: 20 },
  }));

  useEffect(() => {
    setSpawned(true);
    springApi.start({ scale: 1, positionY: 0 });
  }, [springApi]);

  useEffect(() => {
    if (isDying) return;
    if (!combatData || combatState === 'dying' || combatState === 'dead') {
      setIsDying(true);
      springApi.start({
        scale: 0,
        positionY: -1,
        config: { tension: 200, friction: 20 },
      });
      if (!hasCalledDestroy.current) {
        hasCalledDestroy.current = true;
        setTimeout(() => { onDestroy?.(); }, 600);
      }
    }
  }, [combatData, combatState, isDying, springApi, onDestroy]);

  return {
    spawned,
    isDying,
    springProps,
    springApi,
    combatData,
    maxHp,
    currentHp,
    healthPercent,
    combatState,
  };
}
