/**
 * CardSlotTracker - Invisible 3D component that tracks slot position
 * and updates the card store with screen coordinates and cooldown state.
 * 
 * Card behavior based on type:
 * - CONSTRUCT: Spawns a minion at card position that then fights
 * - SPELL: Fires projectiles directly from card position
 */

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CardDefinition, CardSlotConfig, ARENA } from '@/types';
import { useCardStore } from '@/stores/cardStore';

interface CardSlotTrackerProps {
  slot: CardSlotConfig;
  team: 'player' | 'enemy';
  zPosition: number;
  card: CardDefinition;
  /** Called when spell card fires projectiles */
  onFire?: (position: [number, number, number], damage: number, card: CardDefinition) => void;
  /** Called when construct card spawns a minion */
  onSpawnMinion?: (card: CardDefinition) => void;
}

export function CardSlotTracker({
  slot,
  team,
  zPosition,
  card,
  onFire,
  onSpawnMinion,
}: CardSlotTrackerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lastTriggerRef = useRef(0);
  const hasFiredInitial = useRef(false);
  
  const { camera, size } = useThree();
  
  const addCard = useCardStore((state) => state.addCard);
  const updateCooldown = useCardStore((state) => state.updateCooldown);
  const updateScreenPosition = useCardStore((state) => state.updateScreenPosition);
  
  const cooldownDuration = card.cooldown ?? 5;
  
  // Register card on mount
  useEffect(() => {
    addCard(slot.index, card, team);
  }, [slot.index, card, team, addCard]);
  
  // Get spawn position for minions (in front of the card, in the arena)
  const getSpawnPosition = (): [number, number, number] => {
    // Spawn minions inside the combat zone, near the card's X position
    const spawnZ = team === 'player' 
      ? ARENA.combatZoneEnd - 1  // Player minions spawn at bottom of combat zone
      : ARENA.combatZoneStart + 1; // Enemy minions spawn at top of combat zone
    
    return [slot.xPosition, 0.5, spawnZ];
  };
  
  // Track if construct has been spawned (only spawn once)
  const constructSpawned = useRef(false);
  
  // Update screen position and cooldown every frame
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    
    const time = clock.elapsedTime;
    
    // Convert 3D position to screen coordinates
    // In top-down view, project from ground plane (Y=0)
    const vector = new THREE.Vector3(slot.xPosition, 0, zPosition);
    vector.project(camera);
    
    const x = (vector.x * 0.5 + 0.5) * size.width;
    const y = (-vector.y * 0.5 + 0.5) * size.height;
    
    updateScreenPosition(slot.index, team, x, y);
    
    // For CONSTRUCT cards, spawn after first cooldown completes
    if (card.type === 'CONSTRUCT') {
      if (!constructSpawned.current) {
        // Track cooldown until first spawn
        const elapsed = time - lastTriggerRef.current;
        const progress = Math.min(elapsed / cooldownDuration, 1);
        const isReady = progress >= 1;
        
        updateCooldown(slot.index, team, progress, isReady);
        
        // Spawn construct when first cooldown completes
        if (isReady) {
          constructSpawned.current = true;
          lastTriggerRef.current = time;
          onSpawnMinion?.(card);
        }
      } else {
        // After spawning, show as full (construct handles its own firing)
        updateCooldown(slot.index, team, 1, false);
      }
      return;
    }
    
    // SPELL cooldown logic - repeating trigger
    const elapsed = time - lastTriggerRef.current;
    const progress = Math.min(elapsed / cooldownDuration, 1);
    const isReady = progress >= 1;
    
    updateCooldown(slot.index, team, progress, isReady);
    
    // Trigger spell when cooldown completes
    if (isReady) {
      lastTriggerRef.current = time;
      const firePosition: [number, number, number] = [slot.xPosition, 1.0, zPosition];
      onFire?.(firePosition, card.baseStats.attack, card);
    }
  });
  
  // Invisible group just for position tracking
  return (
    <group ref={groupRef} position={[slot.xPosition, 0, zPosition]} />
  );
}

export default CardSlotTracker;
