/**
 * SpawnedToaster - Low-poly procedural 3D toaster that fires projectiles
 * 
 * Uses procedural geometry with flatShading for a stylised low-poly look.
 * Spawned from a card after initial cooldown.
 * Fires toast projectiles on cooldown.
 */

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { CardSlotConfig, ARENA } from '@/types';
import { useCardStore } from '@/stores/cardStore';
import { useCombatStore } from '@/stores/combatStore';
import { LowPolyToaster } from '@/components/three/models/LowPolyToaster';


interface SpawnedToasterProps {
  slot: CardSlotConfig;
  team: 'player' | 'enemy';
  onFire: (position: [number, number, number], damage: number) => void;
  damage: number;
  cooldown: number;
  isInfernal?: boolean;
  combatId: string;       // ID in the combat store for HP tracking
  onDestroy?: () => void;  // Called when construct is destroyed
}

export function SpawnedToaster({ 
  slot, 
  team, 
  onFire, 
  damage, 
  cooldown,
  isInfernal = false,
  combatId,
  onDestroy,
}: SpawnedToasterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [isReady, setIsReady] = useState(false);
  const [spawned, setSpawned] = useState(false);
  const [isDying, setIsDying] = useState(false);
  const [isDamaged, setIsDamaged] = useState(false);
  const lastFireRef = useRef(0);
  const hasCalledDestroy = useRef(false);
  const cooldownProgressRef = useRef(0);
  const [cooldownProgress, setCooldownProgress] = useState(0);
  const prevHpRef = useRef<number | null>(null);
  
  // Read combat state for this construct
  const combatData = useCombatStore((state) => state.minions.get(combatId));
  const maxHp = combatData?.stats?.hp ?? 1;
  const currentHp = combatData?.currentHp ?? 0;
  const healthPercent = maxHp > 0 ? currentHp / maxHp : 0;
  const combatState = combatData?.state;
  
  // Detect damage for flash effect
  useEffect(() => {
    if (prevHpRef.current !== null && currentHp < prevHpRef.current) {
      setIsDamaged(true);
      const timer = setTimeout(() => setIsDamaged(false), 300);
      return () => clearTimeout(timer);
    }
    prevHpRef.current = currentHp;
  }, [currentHp]);
  
  const updateCooldown = useCardStore((state) => state.updateCooldown);
  
  const shouldFireOnSpawn = useRef(true);
  
  // Spawn animation
  const [springProps, springApi] = useSpring(() => ({
    scale: 0,
    positionY: -1,
    config: { tension: 300, friction: 20 },
  }));
  
  useEffect(() => {
    setSpawned(true);
    springApi.start({ scale: 1, positionY: 0 });
  }, [springApi]);
  
  // Handle death — when combat store says dying/dead or entity is removed
  useEffect(() => {
    if (isDying) return;
    
    if (!combatData || combatState === 'dying' || combatState === 'dead') {
      setIsDying(true);
      springApi.start({
        scale: 0,
        positionY: -1,
        config: { tension: 200, friction: 20 },
      });
      
      // Call onDestroy after death animation
      if (!hasCalledDestroy.current) {
        hasCalledDestroy.current = true;
        setTimeout(() => {
          onDestroy?.();
        }, 600);
      }
    }
  }, [combatData, combatState, isDying, springApi, onDestroy]);
  
  const zPosition = team === 'player' 
    ? ARENA.playerThroneZ - 2
    : ARENA.enemyThroneZ + 2;
  
  // Fire cooldown logic — stop firing when dying
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    
    if (!spawned || isDying) return;
    
    if (lastFireRef.current === 0) {
      lastFireRef.current = time;
      
      if (shouldFireOnSpawn.current) {
        shouldFireOnSpawn.current = false;
        setIsReady(true);
        
        const firePosition: [number, number, number] = [
          slot.xPosition,
          0.5,
          zPosition,
        ];
        onFire(firePosition, damage);
        
        updateCooldown(slot.index, team, 0, false);
        setTimeout(() => setIsReady(false), 200);
      }
      return;
    }
    
    const elapsed = time - lastFireRef.current;
    const progress = Math.min(elapsed / cooldown, 1);
    const isCooldownReady = progress >= 1;
    
    cooldownProgressRef.current = progress;
    setCooldownProgress(progress);
    updateCooldown(slot.index, team, progress, false);
    
    if (isCooldownReady) {
      setIsReady(true);
      lastFireRef.current = time;
      
      const firePosition: [number, number, number] = [
        slot.xPosition,
        0.5,
        zPosition,
      ];
      onFire(firePosition, damage);
      
      setTimeout(() => {
        setIsReady(false);
        updateCooldown(slot.index, team, 0, false);
      }, 200);
    }
  });
  
  const isPlayer = team === 'player';
  
  return (
    <animated.group
      ref={groupRef}
      position-x={slot.xPosition}
      position-y={springProps.positionY}
      position-z={zPosition}
      scale={springProps.scale}
      renderOrder={10}
    >
      <LowPolyToaster
        team={team}
        isInfernal={isInfernal}
        isReady={isReady && !isDying}
        cooldownProgress={cooldownProgress}
        isDamaged={isDamaged}
      />
      
      {/* Circular health ring – positioned to the side */}
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
  );
}

export default SpawnedToaster;
