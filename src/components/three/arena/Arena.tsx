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
import { ImpactEffects, SpawnEffects, ToastProjectile, ShivProjectile, DamageNumbers } from '../effects';
import { ShivRotationDebug } from '../debug/ShivRotationDebug';
import { useCameraShake } from '@/hooks/useCameraShake';
import { useCombatStore } from '@/stores/combatStore';
import { useGameStore } from '@/stores/gameStore';
import { useUIStore } from '@/stores/uiStore';
import { useCardStore } from '@/stores/cardStore';
import { useBattleStatsStore } from '@/stores/battleStatsStore';
import { AudioCues } from '@/stores/audioStore';
import { ARENA, CARD_SLOTS, CardDefinition, CardSlotConfig, StatusEffectConfig } from '@/types';
import { getCardDefinition } from '@/data/cards';

// ============================================================
// DEBUG FLAG: Set to true to show model rotation debug controls
// Use this to tweak rotation/scale/speed for any new models
// ============================================================
const SHOW_MODEL_DEBUG = false;

type ProjectileType = 'toast' | 'shiv';

interface Projectile {
  id: string;
  startPosition: [number, number, number];
  targetMinionId?: string;      // Target a specific minion
  targetTeam: 'player' | 'enemy'; // Which team's HP bar to target if no minions
  damage: number;
  delay: number;
  statusEffect?: StatusEffectConfig;
  sourceCardId?: string;
  projectileType: ProjectileType;
}

interface SpawnedConstruct {
  id: string;
  combatId: string; // ID in combat store for HP tracking and targeting
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
  
  // Compute HP bar 3D world Z positions and store them for minions to read
  useEffect(() => {
    if (!canvasBounds || canvasBounds.width === 0 || canvasBounds.height === 0) return;
    
    const computeWorldZ = (hpBarRect: typeof enemyHPBarRect) => {
      if (!hpBarRect) return null;
      const canvasRelativeX = hpBarRect.centerX - canvasBounds.x;
      const canvasRelativeY = hpBarRect.centerY - canvasBounds.y;
      const worldPos = screenToWorld(canvasRelativeX, canvasRelativeY, camera, canvasBounds.width, canvasBounds.height);
      return worldPos.z;
    };
    
    const enemyZ = computeWorldZ(enemyHPBarRect);
    if (enemyZ !== null) {
      useUIStore.getState().setHPBarWorldZ('enemy', enemyZ);
    }
    const playerZ = computeWorldZ(playerHPBarRect);
    if (playerZ !== null) {
      useUIStore.getState().setHPBarWorldZ('player', playerZ);
    }
  }, [enemyHPBarRect, playerHPBarRect, canvasBounds, camera]);

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
  
  // Battle stats tracking
  const recordTrigger = useBattleStatsStore((state) => state.recordTrigger);
  const recordDamage = useBattleStatsStore((state) => state.recordDamage);
  
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
  
  // Clear constructs and projectiles when game is over
  useEffect(() => {
    if (gameOver) {
      setConstructs([]);
      setProjectiles([]);
    }
  }, [gameOver]);

  // Get player and enemy cards from cardStore (populated by crafting scene)
  const playerCards = useCardStore((state) => state.cards.filter(c => c.team === 'player'));
  const playerCardSlots = playerCards.map(c => ({ slotIndex: c.slotIndex, card: c.card }));
  const enemyCards = useCardStore((state) => state.cards.filter(c => c.team === 'enemy'));
  const enemyCardSlots = enemyCards.map(c => ({ slotIndex: c.slotIndex, card: c.card }));

  // Handle card firing - spawns projectiles targeting the opposing team
  const handleCardFire = useCallback((
    position: [number, number, number], 
    damage: number,
    card?: CardDefinition,
    firingTeam: 'player' | 'enemy' = 'player'
  ) => {
    const [startX, startY, startZ] = position;
    const statusEffect = card?.statusEffect;
    const sourceCardId = card?.id;
    const opposingTeam = firingTeam === 'player' ? 'enemy' : 'player';
    
    // Track card trigger
    if (sourceCardId && card) {
      recordTrigger(sourceCardId, card.name, firingTeam);
      
      // Play toaster ding for toaster pages
      if (sourceCardId === 'toaster' || sourceCardId === 'burning_toaster') {
        AudioCues.onToasterFire();
      }
      
      // Play shiv fly for shiv pages
      if (sourceCardId?.includes('shiv') || sourceCardId?.includes('blade')) {
        AudioCues.onShivTrigger();
      }
    }
    
    const newProjectiles: Projectile[] = [];
    
    // Determine projectile type based on card
    const isShivCard = sourceCardId?.includes('shiv') || sourceCardId?.includes('blade');
    
    if (isShivCard) {
      const shivStartZ = firingTeam === 'player'
        ? ARENA.playerThroneZ - 1
        : ARENA.enemyThroneZ + 1;
      
      newProjectiles.push({
        id: `shiv-${projectileIdCounter++}`,
        startPosition: [startX, 2, shivStartZ],
        targetTeam: opposingTeam,
        damage,
        delay: 0,
        statusEffect,
        sourceCardId,
        projectileType: 'shiv',
      });
    } else {
      // Default: Spawn two toasts
      for (let i = 0; i < 2; i++) {
        const closestEnemy = getClosestEnemy(position, firingTeam);
        
        newProjectiles.push({
          id: `toast-${projectileIdCounter++}`,
          startPosition: [
            startX + (i === 0 ? -0.2 : 0.2), 
            startY + 0.2, 
            startZ
          ],
          targetMinionId: closestEnemy?.id,
          targetTeam: opposingTeam,
          damage: i === 0 ? Math.ceil(damage / 2) : Math.floor(damage / 2),
          delay: i * 0.08,
          statusEffect,
          sourceCardId,
          projectileType: 'toast',
        });
      }
    }

    if (newProjectiles.length > 0) {
      setProjectiles((prev) => [...prev, ...newProjectiles]);
    }
  }, [getClosestEnemy, recordTrigger]);
  
  // Handle CONSTRUCT spawn from card — respawns after destruction
  const registerConstruct = useCombatStore((state) => state.registerConstruct);
  const constructCombatIds = useRef<Map<string, string>>(new Map());
  
  const handleConstructSpawn = useCallback((
    slotIndex: number,
    card: CardDefinition,
    team: 'player' | 'enemy'
  ) => {
    const slotKey = `${team}-${slotIndex}`;
    
    // Check if a living construct already exists for this slot
    const existingCombatId = constructCombatIds.current.get(slotKey);
    if (existingCombatId) {
      const entity = useCombatStore.getState().getMinion(existingCombatId);
      if (entity && entity.state !== 'dying' && entity.state !== 'dead') {
        return; // Still alive, skip
      }
    }
    
    const slot = CARD_SLOTS[slotIndex];
    
    // Calculate position (same as SpawnedToaster)
    const zPosition = team === 'player'
      ? ARENA.playerSlotZ - 4
      : ARENA.enemySlotZ + 4;
    const position: [number, number, number] = [slot.xPosition, 0.5, zPosition];
    
    // Register in combat store so minions can target this construct
    const combatId = registerConstruct(card, team, position);
    constructCombatIds.current.set(slotKey, combatId);
    
    setConstructs(prev => [...prev, {
      id: `construct-${constructIdCounter++}`,
      combatId,
      card,
      slot,
      team,
    }]);
  }, [registerConstruct]);
  
  // Handle MINION spawn from card (spawns a new minion each cooldown)
  const handleMinionSpawn = useCallback((
    slotIndex: number,
    card: CardDefinition,
    team: 'player' | 'enemy'
  ) => {
    if (card.id) {
      recordTrigger(card.id, card.name, team);
    }
    spawnMinion(card, team, slotIndex);
  }, [spawnMinion, recordTrigger]);
  
  // Handle projectile hit (apply damage but don't remove yet)
  const handleProjectileHit = useCallback((id: string) => {
    const proj = projectiles.find(p => p.id === id);
    if (!proj) return;
    
    const damage = proj.damage;
    
    // Track damage per card
    if (proj.sourceCardId) {
      recordDamage(proj.sourceCardId, damage);
    }
    
    // Play shiv stab on impact (minion or HP bar)
    if (proj.projectileType === 'shiv') {
      AudioCues.onShivHit();
    }
    
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
  }, [projectiles, damageMinion, damagePlayer, damageEnemy, applyStatusEffect, recordDamage]);

  // Remove projectile from list (call after animation completes)
  const handleProjectileRemove = useCallback((id: string) => {
    setProjectiles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Handle projectile impact (for projectiles that hit and remove immediately like toast)
  const handleProjectileComplete = useCallback((
    id: string,
    impactPosition: [number, number, number]
  ) => {
    handleProjectileHit(id);
    handleProjectileRemove(id);
  }, [handleProjectileHit, handleProjectileRemove]);

  // Get current target position for a projectile — minions first, then HP bar
  const getTargetPosition = useCallback((proj: Projectile): [number, number, number] => {
    const store = useCombatStore.getState();
    
    // 1. If we have a specific minion target that's still alive, follow it
    if (proj.targetMinionId) {
      const minion = store.getMinion(proj.targetMinionId);
      if (minion && minion.state !== 'dying' && minion.state !== 'dead') {
        return minion.position;
      }
      // Original target died — clear it so we can retarget
      proj.targetMinionId = undefined;
    }
    
    // 2. Dynamically find the closest enemy minion to home toward
    const firingTeam = proj.targetTeam === 'enemy' ? 'player' : 'enemy';
    const closestEnemy = store.getClosestEnemy(proj.startPosition, firingTeam);
    if (closestEnemy) {
      // Lock on to this minion for hit resolution
      proj.targetMinionId = closestEnemy.id;
      return closestEnemy.position;
    }
    
    // 3. No enemy minions — fall back to HP bar
    const hpBarRect = proj.targetTeam === 'enemy' ? enemyHPBarRect : playerHPBarRect;
    
    if (hpBarRect && canvasBounds && canvasBounds.width > 0 && canvasBounds.height > 0) {
      const canvasRelativeX = hpBarRect.centerX - canvasBounds.x;
      const canvasRelativeY = hpBarRect.centerY - canvasBounds.y;
      
      const worldPos = screenToWorld(
        canvasRelativeX,
        canvasRelativeY,
        camera,
        canvasBounds.width,
        canvasBounds.height
      );
      
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
            onFire={(pos, dmg, card) => handleCardFire(pos, dmg, card, 'player')}
            onSpawnMinion={(card) => {
              if (card.type === 'MINION') {
                handleMinionSpawn(entry.slotIndex, card, 'player');
              } else {
                handleConstructSpawn(entry.slotIndex, card, 'player');
              }
            }}
          />
        );
      })}
      
      {/* Enemy card position trackers */}
      {enemyCardSlots.map((entry) => {
        const slot = CARD_SLOTS[entry.slotIndex];
        return (
          <CardSlotTracker
            key={`enemy-card-${entry.slotIndex}`}
            slot={slot}
            team="enemy"
            zPosition={ARENA.enemySlotZ}
            card={entry.card}
            onFire={(pos, dmg, card) => handleCardFire(pos, dmg, card, 'enemy')}
            onSpawnMinion={(card) => {
              if (card.type === 'MINION') {
                handleMinionSpawn(entry.slotIndex, card, 'enemy');
              } else {
                handleConstructSpawn(entry.slotIndex, card, 'enemy');
              }
            }}
          />
        );
      })}
      
      {/* Spawned constructs (toasters, etc.) */}
      {constructs.map((construct) => {
        const cardId = construct.card.id;
        
        // Default: Toaster-type constructs
        const isInfernal = !!construct.card.statusEffect || 
          cardId === 'burning_toaster' || 
          cardId === 'infernal_toaster';
        
        return (
          <SpawnedToaster
            key={construct.id}
            slot={construct.slot}
            team={construct.team}
            damage={construct.card.baseStats.attack}
            cooldown={construct.card.cooldown ?? 5}
            onFire={(position, damage) => handleCardFire(position, damage, construct.card, construct.team)}
            isInfernal={isInfernal}
            combatId={construct.combatId}
            onDestroy={() => {
              setConstructs(prev => prev.filter(c => c.id !== construct.id));
            }}
          />
        );
      })}
      
      {/* Projectiles with homing behavior */}
      {projectiles.map((proj) => {
        const targetPos = getTargetPosition(proj);
        
        if (proj.projectileType === 'shiv') {
          return (
            <ShivProjectile
              key={proj.id}
              id={proj.id}
              startPosition={proj.startPosition}
              endPosition={targetPos}
              damage={proj.damage}
              delay={proj.delay}
              targetTeam={proj.targetTeam}
              statusEffect={proj.statusEffect}
              onHit={handleProjectileHit}
              onComplete={handleProjectileRemove}
            />
          );
        }
        
        return (
          <ToastProjectile
            key={proj.id}
            id={proj.id}
            startPosition={proj.startPosition}
            endPosition={targetPos}
            damage={proj.damage}
            delay={proj.delay}
            targetTeam={proj.targetTeam}
            statusEffect={proj.statusEffect}
            onComplete={(id) => handleProjectileComplete(id, targetPos)}
          />
        );
      })}
      
      {/* Arena walls (invisible colliders) */}
      <ArenaWalls />
      
      {/* Minion manager - renders all active minions */}
      <MinionManager />
      
      {/* Visual effects */}
      <ImpactEffects />
      <SpawnEffects />
      <DamageNumbers />
      
      {/* Debug: Model rotation controls (dev mode only, set SHOW_MODEL_DEBUG to true to enable) */}
      {import.meta.env.DEV && SHOW_MODEL_DEBUG && <ShivRotationDebug />}
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
