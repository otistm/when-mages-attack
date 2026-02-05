/**
 * Arena Component - The main combat zone
 * 
 * Flow:
 * 1. Cards trigger on cooldown
 * 2. CONSTRUCT cards spawn stationary constructs that fire projectiles
 * 3. SPELL cards fire projectiles directly
 * 4. Projectiles home toward minions first, then HP bar
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import { Box } from '@react-three/drei';
import * as THREE from 'three';

import { ArenaLighting } from './ArenaLighting';
import { ArenaEnvironment } from './ArenaEnvironment';
import { ArenaFloor } from './ArenaFloor';
import { CardSlotTracker } from './CardSlotTracker';
import { SpawnedToaster } from './SpawnedToaster';
import { MinionManager } from '../minions/MinionManager';
import { ImpactEffects, SpawnEffects, ToastProjectile, DamageNumbers } from '../effects';
import { useCameraShake } from '@/hooks/useCameraShake';
import { useCombatStore } from '@/stores/combatStore';
import { useGameStore } from '@/stores/gameStore';
import { useUIStore } from '@/stores/uiStore';
import { useCardStore } from '@/stores/cardStore';
import { ARENA, CARD_SLOTS, CardDefinition, CardSlotConfig, StatusEffectConfig } from '@/types';
import { getCardDefinition } from '@/data/cards';

interface Projectile {
  id: string;
  startPosition: [number, number, number];
  targetMinionId?: string;      // Target a specific minion
  targetTeam: 'player' | 'enemy'; // Which team's HP bar to target if no minions
  damage: number;
  delay: number;
  statusEffect?: StatusEffectConfig;
  sourceCardId?: string;
}

interface SpawnedConstruct {
  id: string;
  card: CardDefinition;
  slot: CardSlotConfig;
  team: 'player' | 'enemy';
}

let projectileIdCounter = 0;
let constructIdCounter = 0;

/**
 * Convert screen coordinates to 3D world position on the ground plane (Y=0)
 */
function screenToWorld(
  screenX: number, 
  screenY: number, 
  camera: THREE.Camera,
  canvasWidth: number,
  canvasHeight: number
): THREE.Vector3 {
  // Convert screen coords to normalized device coordinates (-1 to 1)
  const ndcX = (screenX / canvasWidth) * 2 - 1;
  const ndcY = -(screenY / canvasHeight) * 2 + 1;
  
  // Create a ray from camera through the screen point
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  
  // Intersect with ground plane (Y=0)
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const target = new THREE.Vector3();
  raycaster.ray.intersectPlane(groundPlane, target);
  
  return target || new THREE.Vector3(0, 0, 0);
}

export function Arena() {
  // Apply camera shake effect
  useCameraShake();
  
  // Get camera, viewport, and gl context for screen-to-world conversion
  const { camera, size, gl } = useThree();
  
  // HP bar screen positions from UI store
  const playerHPBarRect = useUIStore((state) => state.playerHPBarRect);
  const enemyHPBarRect = useUIStore((state) => state.enemyHPBarRect);
  const canvasBounds = useUIStore((state) => state.canvasBounds);
  const setCanvasRect = useUIStore((state) => state.setCanvasRect);
  const setCanvasBounds = useUIStore((state) => state.setCanvasBounds);
  
  // Update canvas dimensions and bounds in store
  useEffect(() => {
    setCanvasRect(size.width, size.height);
    
    // Get canvas element bounding rect
    const canvas = gl.domElement;
    const updateBounds = () => {
      const rect = canvas.getBoundingClientRect();
      setCanvasBounds(rect.left, rect.top, rect.width, rect.height);
    };
    
    updateBounds();
    window.addEventListener('resize', updateBounds);
    const interval = setInterval(updateBounds, 500);
    
    return () => {
      window.removeEventListener('resize', updateBounds);
      clearInterval(interval);
    };
  }, [size.width, size.height, gl.domElement, setCanvasRect, setCanvasBounds]);
  
  // Combat store for minion management
  const hasEnemyMinions = useCombatStore((state) => state.hasEnemyMinions);
  const getClosestEnemy = useCombatStore((state) => state.getClosestEnemy);
  const damageMinion = useCombatStore((state) => state.damageMinion);
  const spawnMinion = useCombatStore((state) => state.spawnMinion);
  
  // Game store for HP bar damage and status effects
  const player = useGameStore((state) => state.player);
  const enemy = useGameStore((state) => state.enemy);
  const damagePlayer = useGameStore((state) => state.dealDamageToPlayer);
  const damageEnemy = useGameStore((state) => state.dealDamageToEnemy);
  const applyStatusEffect = useGameStore((state) => state.applyStatusEffect);
  const tickStatusEffects = useGameStore((state) => state.tickStatusEffects);
  
  // Check for game over
  const gameOver = player.health <= 0 || enemy.health <= 0;
  
  // Tick status effects (burn damage, etc.)
  useFrame((_, delta) => {
    if (!gameOver) {
      tickStatusEffects(delta);
    }
  });

  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [constructs, setConstructs] = useState<SpawnedConstruct[]>([]);
  const spawnedSlots = useRef<Set<string>>(new Set());
  
  // Clear constructs and projectiles when game is over
  useEffect(() => {
    if (gameOver) {
      setConstructs([]);
      setProjectiles([]);
      spawnedSlots.current.clear();
    }
  }, [gameOver]);

  // Get player cards from cardStore (populated by crafting scene)
  const playerCards = useCardStore((state) => state.cards.filter(c => c.team === 'player'));
  const playerCardSlots = playerCards.map(c => ({ slotIndex: c.slotIndex, card: c.card }));

  // Handle card firing - spawns projectiles targeting enemy minions or HP bar
  const handleCardFire = useCallback((
    position: [number, number, number], 
    damage: number,
    card?: CardDefinition
  ) => {
    const [startX, startY, startZ] = position;
    const statusEffect = card?.statusEffect;
    const sourceCardId = card?.id;
    
    // Spawn two toasts
    const newProjectiles: Projectile[] = [];
    
    for (let i = 0; i < 2; i++) {
      // Find a target - prefer minions, fall back to HP bar
      const closestEnemy = getClosestEnemy(position, 'player');
      
      newProjectiles.push({
        id: `toast-${projectileIdCounter++}`,
        startPosition: [
          startX + (i === 0 ? -0.2 : 0.2), 
          startY + 0.2, 
          startZ
        ],
        targetMinionId: closestEnemy?.id,
        targetTeam: 'enemy',
        damage: i === 0 ? Math.ceil(damage / 2) : Math.floor(damage / 2),
        delay: i * 0.08, // Slight stagger between toasts
        statusEffect,
        sourceCardId,
      });
    }

    if (newProjectiles.length > 0) {
      setProjectiles((prev) => [...prev, ...newProjectiles]);
    }
  }, [getClosestEnemy]);
  
  // Handle CONSTRUCT spawn from card (spawns once, then construct handles its own cooldown)
  const handleConstructSpawn = useCallback((
    slotIndex: number,
    card: CardDefinition,
    team: 'player' | 'enemy'
  ) => {
    const slotKey = `${team}-${slotIndex}`;
    
    // Only spawn once per slot
    if (spawnedSlots.current.has(slotKey)) return;
    spawnedSlots.current.add(slotKey);
    
    const slot = CARD_SLOTS[slotIndex];
    setConstructs(prev => [...prev, {
      id: `construct-${constructIdCounter++}`,
      card,
      slot,
      team,
    }]);
  }, []);
  
  // Handle projectile impact
  const handleProjectileComplete = useCallback((
    id: string,
    impactPosition: [number, number, number]
  ) => {
    const proj = projectiles.find(p => p.id === id);
    if (!proj) {
      setProjectiles((prev) => prev.filter((p) => p.id !== id));
      return;
    }
    
    const damage = proj.damage;
    
    // Try to damage target minion
    if (proj.targetMinionId) {
      damageMinion(proj.targetMinionId, damage, proj.statusEffect?.type);
    } else {
      // No minion target - damage HP bar
      if (proj.targetTeam === 'enemy') {
        damageEnemy(damage);
        if (proj.statusEffect) {
          applyStatusEffect('enemy', proj.statusEffect, proj.sourceCardId);
        }
      } else {
        damagePlayer(damage);
        if (proj.statusEffect) {
          applyStatusEffect('player', proj.statusEffect, proj.sourceCardId);
        }
      }
    }
    
    setProjectiles((prev) => prev.filter((p) => p.id !== id));
  }, [projectiles, damageMinion, damagePlayer, damageEnemy, applyStatusEffect]);

  // Get current target position for a projectile
  const getTargetPosition = useCallback((proj: Projectile): [number, number, number] => {
    // If targeting a minion, get its current position
    if (proj.targetMinionId) {
      const minion = useCombatStore.getState().getMinion(proj.targetMinionId);
      if (minion && minion.state !== 'dying' && minion.state !== 'dead') {
        return minion.position;
      }
      // Minion died, target HP bar instead
    }
    
    // Target the HP bar using its actual screen position
    const hpBarRect = proj.targetTeam === 'enemy' ? enemyHPBarRect : playerHPBarRect;
    
    if (hpBarRect && canvasBounds && canvasBounds.width > 0 && canvasBounds.height > 0) {
      // Convert HP bar center from viewport coords to canvas-relative coords
      const canvasRelativeX = hpBarRect.centerX - canvasBounds.x;
      const canvasRelativeY = hpBarRect.centerY - canvasBounds.y;
      
      // Convert canvas-relative coords to 3D world position
      const worldPos = screenToWorld(
        canvasRelativeX,
        canvasRelativeY,
        camera,
        canvasBounds.width,
        canvasBounds.height
      );
      
      // Use the calculated world position, but keep Y at 0.5 for visibility
      return [worldPos.x, 0.5, worldPos.z];
    }
    
    // Fallback if HP bar position not yet tracked
    const targetZ = proj.targetTeam === 'enemy' ? ARENA.enemyThroneZ + 2 : ARENA.playerThroneZ - 2;
    return [0, 0.5, targetZ];
  }, [camera, canvasBounds, enemyHPBarRect, playerHPBarRect]);

  return (
    <group>
      {/* Lighting */}
      <ArenaLighting />
      
      {/* Environment (sky, fog, particles) */}
      <ArenaEnvironment />
      
      {/* Arena floor - combat zone */}
      <ArenaFloor />
      
      {/* Player card position trackers */}
      {playerCardSlots.map((entry) => {
        const slot = CARD_SLOTS[entry.slotIndex];
        return (
          <CardSlotTracker
            key={`player-card-${entry.slotIndex}`}
            slot={slot}
            team="player"
            zPosition={ARENA.playerSlotZ}
            card={entry.card}
            onFire={handleCardFire}
            onSpawnMinion={(card) => handleConstructSpawn(entry.slotIndex, card, 'player')}
          />
        );
      })}
      
      {/* Spawned constructs (toasters, etc.) */}
      {constructs.map((construct) => {
        // Check if this is an infernal toaster (has burn status effect)
        const isInfernal = !!construct.card.statusEffect || 
          construct.card.id === 'burning_toaster' || 
          construct.card.id === 'infernal_toaster';
        
        return (
          <SpawnedToaster
            key={construct.id}
            slot={construct.slot}
            team={construct.team}
            damage={construct.card.baseStats.attack}
            cooldown={construct.card.cooldown ?? 5}
            onFire={(position, damage) => handleCardFire(position, damage, construct.card)}
            isInfernal={isInfernal}
          />
        );
      })}
      
      {/* Projectiles with homing behavior */}
      {projectiles.map((proj) => (
        <ToastProjectile
          key={proj.id}
          id={proj.id}
          startPosition={proj.startPosition}
          endPosition={getTargetPosition(proj)}
          damage={proj.damage}
          delay={proj.delay}
          targetTeam={proj.targetTeam}
          statusEffect={proj.statusEffect}
          onComplete={(id) => handleProjectileComplete(id, getTargetPosition(proj))}
        />
      ))}
      
      {/* Arena walls (invisible colliders) */}
      <ArenaWalls />
      
      {/* Minion manager - renders all active minions */}
      <MinionManager />
      
      {/* Visual effects */}
      <ImpactEffects />
      <SpawnEffects />
      <DamageNumbers />
    </group>
  );
}

/**
 * Invisible walls to keep minions in bounds
 */
function ArenaWalls() {
  const wallThickness = 0.5;
  const wallHeight = 5;
  const halfWidth = ARENA.width / 2 + 2;
  const halfLength = ARENA.length / 2 + 2;
  
  return (
    <group>
      {/* Left wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <Box 
          args={[wallThickness, wallHeight, ARENA.length + 4]} 
          position={[-halfWidth, wallHeight / 2, 0]}
          visible={false}
        />
      </RigidBody>
      
      {/* Right wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <Box 
          args={[wallThickness, wallHeight, ARENA.length + 4]} 
          position={[halfWidth, wallHeight / 2, 0]}
          visible={false}
        />
      </RigidBody>
      
      {/* Back wall (player side) */}
      <RigidBody type="fixed" colliders="cuboid">
        <Box 
          args={[ARENA.width + 4, wallHeight, wallThickness]} 
          position={[0, wallHeight / 2, halfLength]}
          visible={false}
        />
      </RigidBody>
      
      {/* Front wall (enemy side) */}
      <RigidBody type="fixed" colliders="cuboid">
        <Box 
          args={[ARENA.width + 4, wallHeight, wallThickness]} 
          position={[0, wallHeight / 2, -halfLength]}
          visible={false}
        />
      </RigidBody>
    </group>
  );
}

export default Arena;
