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
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import { Box } from '@react-three/drei';

import { ArenaLighting } from './ArenaLighting';
import { ArenaEnvironment } from './ArenaEnvironment';
import { ArenaFloor } from './ArenaFloor';
import { ArenaMage } from './ArenaMage';
import { CardSlotTracker } from './CardSlotTracker';
import { SpawnedToaster } from './SpawnedToaster';
import { SpawnedCactus } from './SpawnedCactus';
import { SpawnedBattery } from './SpawnedBattery';
import { SpawnedBrick } from './SpawnedBrick';
import { SpawnedEspresso } from './SpawnedEspresso';
import { SpawnedConstruct as GenericConstruct } from './SpawnedConstruct';
import { MinionManager } from '../minions/MinionManager';
import { ImpactEffects, SpawnEffects, ToastProjectile, ShivProjectile, SpineProjectile, DamageNumbers } from '../effects';
import { VfxManager } from '../effects/VfxManager';
import { StatusVfx } from '../effects/StatusVfx';
import { ArenaVortex, VORTEX_TRIGGER_TIME, VORTEX_WARNING_LEAD_TIME } from '../effects/ArenaVortex';
import { ShivRotationDebug } from '../debug/ShivRotationDebug';
import { useCameraShake } from '@/hooks/useCameraShake';
import { shallow } from 'zustand/shallow';
import { useCombatStore } from '@/stores/combatStore';
import { useGameStore } from '@/stores/gameStore';

import { useCardStore } from '@/stores/cardStore';
import { buildCollisionGrid } from '../minions/separation';
import { useBattleStatsStore } from '@/stores/battleStatsStore';
import { AudioCues } from '@/stores/audioStore';
import { useVfxStore } from '@/stores/vfxStore';
import { ARENA, CARD_SLOTS, CardDefinition, CardSlotConfig, StatusEffectConfig, getHPBarTargetPosition } from '@/types';
import { getCardDefinition } from '@/data/cards';

// ============================================================
// DEBUG FLAG: Set to true to show model rotation debug controls
// Use this to tweak rotation/scale/speed for any new models
// ============================================================
const SHOW_MODEL_DEBUG = false;

type ProjectileType = 'toast' | 'shiv' | 'spine';

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
  /** True if this projectile was initially aimed at a minion. Used to prevent
   *  spine projectiles from retargeting to the HP bar when their target dies. */
  initiallyTargetedMinion?: boolean;
  /** Last known position of the target — used when the target is removed from the store. */
  lastTargetPosition?: [number, number, number];
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

const TOASTER_FAMILY = new Set([
  'toaster', 'burning_toaster', 'infernal_toaster',
  'turbo_toaster', 'bunker_toaster', 'rancid_pop_tart',
  'meat_grinder', 'flying_drone',
]);

const CACTUS_FAMILY = new Set([
  'potted_cactus', 'spike_trap', 'dry_heat_cactus',
  'stone_garden', 'stink_blossom', 'sun_catcher',
]);

const BATTERY_FAMILY = new Set([
  'charged_battery', 'acid_cell',
]);

const BRICK_FAMILY = new Set([
  'brick', 'rune_brick', 'heavy_brick',
]);

const ESPRESSO_FAMILY = new Set([
  'espresso_shot', 'double_shot', 'caffeine_bomb',
]);

export function Arena() {
  // Apply camera shake effect
  useCameraShake();
  
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

  // VFX & camera shake
  const spawnEffect = useVfxStore((state) => state.spawnEffect);
  const addCameraTrauma = useGameStore((state) => state.addCameraTrauma);
  
  // Keepsake trial progress
  const advanceTrialProgress = useGameStore((state) => state.advanceTrialProgress);
  
  // Check for game over
  const gameOver = player.health <= 0 || enemy.health <= 0;
  
  const tickKeepsakeCooldown = useGameStore((state) => state.tickKeepsakeCooldown);
  const tickMinionStatuses = useCombatStore((state) => state.tickMinionStatuses);

  // Combat timer & vortex drain
  const combatTimeRef = useRef(0);
  const [combatTime, setCombatTime] = useState(0);
  const vortexDrainAccum = useRef(0);
  const vortexActive = !gameOver && combatTimeRef.current >= VORTEX_TRIGGER_TIME;

  // Tick status effects, keepsake cooldown, minion statuses, vortex, and rebuild collision grid
  useFrame((_, delta) => {
    if (!gameOver) {
      buildCollisionGrid();
      tickStatusEffects(delta);
      tickKeepsakeCooldown(delta);
      tickMinionStatuses(delta);

      // Advance combat clock
      combatTimeRef.current += delta;
      setCombatTime(combatTimeRef.current);

      // Camera rumble during warning phase
      const warningStart = VORTEX_TRIGGER_TIME - VORTEX_WARNING_LEAD_TIME;
      if (combatTimeRef.current >= warningStart && combatTimeRef.current < VORTEX_TRIGGER_TIME) {
        const progress = (combatTimeRef.current - warningStart) / VORTEX_WARNING_LEAD_TIME;
        addCameraTrauma(0.02 * progress * delta * 10);
      }

      // Eruption shake
      if (combatTimeRef.current >= VORTEX_TRIGGER_TIME && combatTimeRef.current - delta < VORTEX_TRIGGER_TIME) {
        addCameraTrauma(0.7);
      }

      // Vortex HP drain — 10 % of maxHP per second to both sides
      if (combatTimeRef.current >= VORTEX_TRIGGER_TIME) {
        vortexDrainAccum.current += delta;
        const tickInterval = 1;
        while (vortexDrainAccum.current >= tickInterval) {
          vortexDrainAccum.current -= tickInterval;
          const playerDrain = Math.ceil(player.maxHealth * 0.10);
          const enemyDrain = Math.ceil(enemy.maxHealth * 0.10);
          damagePlayer(playerDrain);
          damageEnemy(enemyDrain);
          addCameraTrauma(0.12);
        }
      }
    }
  });

  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const projectileMapRef = useRef<Map<string, Projectile>>(new Map());
  const [constructs, setConstructs] = useState<SpawnedConstruct[]>([]);
  
  // Clear constructs, projectiles, and reset timer when game is over
  useEffect(() => {
    if (gameOver) {
      setConstructs([]);
      setProjectiles([]);
      projectileMapRef.current.clear();
    } else {
      combatTimeRef.current = 0;
      vortexDrainAccum.current = 0;
      setCombatTime(0);
    }
  }, [gameOver]);

  // Get player and enemy cards from cardStore (populated by crafting scene)
  const playerCardSlots = useCardStore(
    (state) => state.cards
      .filter(c => c.team === 'player')
      .map(c => ({ slotIndex: c.slotIndex, card: c.card })),
    shallow
  );
  const enemyCardSlots = useCardStore(
    (state) => state.cards
      .filter(c => c.team === 'enemy')
      .map(c => ({ slotIndex: c.slotIndex, card: c.card })),
    shallow
  );

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
      recordTrigger(sourceCardId, card.name, firingTeam, statusEffect?.type);
      
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
    const isCactusCard = sourceCardId === 'potted_cactus' || sourceCardId === 'spike_trap' || sourceCardId === 'dry_heat_cactus';
    
    if (isCactusCard) {
      // Cactus fires one spine needle per call (fireNeedleBurst handles the 5-needle spread)
      const closestEnemy = getClosestEnemy(position, firingTeam);
      
      newProjectiles.push({
        id: `spine-${projectileIdCounter++}`,
        startPosition: [startX, startY + 0.2, startZ],
        targetMinionId: closestEnemy?.id,
        targetTeam: opposingTeam,
        damage,
        delay: 0,
        statusEffect,
        sourceCardId,
        projectileType: 'spine',
        initiallyTargetedMinion: !!closestEnemy,
      });
    } else if (isShivCard) {
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
      newProjectiles.forEach(p => projectileMapRef.current.set(p.id, p));
      setProjectiles((prev) => [...prev, ...newProjectiles]);
      spawnEffect('projectileLaunch', position, {
        color: isCactusCard ? '#44cc44' : isShivCard ? '#aaaacc' : '#ffcc44',
        intensity: 0.5,
      });
    }
  }, [getClosestEnemy, recordTrigger, spawnEffect]);
  
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
    
    // Spawn constructs near their respective HP bars
    const zPosition = team === 'player'
      ? ARENA.playerThroneZ - 2
      : ARENA.enemyThroneZ + 2;
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
  
  // Toaster: only one alive at a time per slot
  const TOASTER_IDS = useRef(new Set(['toaster', 'burning_toaster']));
  const CACTUS_IDS = useRef(new Set(['potted_cactus', 'dry_heat_cactus', 'spike_trap']));
  const toasterMinionIds = useRef<Map<string, string>>(new Map());

  // Handle MINION spawn from card
  const handleMinionSpawn = useCallback((
    slotIndex: number,
    card: CardDefinition,
    team: 'player' | 'enemy'
  ) => {
    if (card.id) {
      recordTrigger(card.id, card.name, team, card.statusEffect?.type);
    }

    const isToaster = TOASTER_IDS.current.has(card.id);
    const isCactus = CACTUS_IDS.current.has(card.id);

    // Toaster: only one at a time per slot
    if (isToaster) {
      const slotKey = `${team}-${slotIndex}`;
      const existingId = toasterMinionIds.current.get(slotKey);
      if (existingId) {
        const entity = useCombatStore.getState().getMinion(existingId);
        if (entity && entity.state !== 'dying' && entity.state !== 'dead') {
          return; // Toaster still alive, skip
        }
      }
      const minionId = spawnMinion(card, team, slotIndex);
      toasterMinionIds.current.set(slotKey, minionId);
      return;
    }

    // Cactus: spawn at random position across the whole arena, with minimum distance from others
    if (isCactus) {
      const halfW = ARENA.width / 2 - 2;
      const zMin = ARENA.enemyThroneZ + 3;
      const zMax = ARENA.playerThroneZ - 3;
      const minSpacing = 5.0;
      const maxAttempts = 20;

      const aliveMinions = useCombatStore.getState().getAliveMinions();

      let bestPos: [number, number, number] = [0, 0.5, 0];
      let bestMinDist = 0;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const cx = (Math.random() - 0.5) * halfW * 2;
        const cz = zMin + Math.random() * (zMax - zMin);

        let closest = Infinity;
        for (const m of aliveMinions) {
          const dx = cx - m.position[0];
          const dz = cz - m.position[2];
          const d = Math.sqrt(dx * dx + dz * dz);
          if (d < closest) closest = d;
        }

        if (closest >= minSpacing) {
          bestPos = [cx, 0.5, cz];
          bestMinDist = closest;
          break;
        }

        if (closest > bestMinDist) {
          bestMinDist = closest;
          bestPos = [cx, 0.5, cz];
        }
      }

      spawnMinion(card, team, slotIndex, bestPos);
      return;
    }

    // Default minion spawn
    spawnMinion(card, team, slotIndex);
  }, [spawnMinion, recordTrigger]);
  
  // Handle projectile hit (apply damage but don't remove yet)
  const handleProjectileHit = useCallback((id: string) => {
    const proj = projectileMapRef.current.get(id);
    if (!proj) return;
    
    const damage = proj.damage;
    const isPlayerProjectile = proj.targetTeam === 'enemy';
    
    if (proj.sourceCardId) {
      recordDamage(proj.sourceCardId, damage);
    }
    
    if (proj.projectileType === 'shiv') {
      AudioCues.onShivHit();
    }
    
    if (isPlayerProjectile && damage > 0) {
      advanceTrialProgress('deal_damage', damage);
      advanceTrialProgress('single_hit_damage', damage);
      advanceTrialProgress('minion_damage_dealt', damage);
    }
    
    if (proj.targetMinionId) {
      const targetBefore = useCombatStore.getState().getMinion(proj.targetMinionId);
      damageMinion(proj.targetMinionId, damage, proj.statusEffect?.type);
      
      if (isPlayerProjectile && targetBefore && targetBefore.currentHp > 0) {
        const targetAfter = useCombatStore.getState().getMinion(proj.targetMinionId);
        if (!targetAfter || targetAfter.currentHp <= 0) {
          advanceTrialProgress('defeat_minions', 1);
        }
      }
      
      if (isPlayerProjectile && proj.statusEffect) {
        advanceTrialProgress('apply_status_effects', 1);
      }
    } else if (proj.initiallyTargetedMinion) {
      // Projectile aimed at a now-dead minion — absorb damage
    } else {
      if (proj.targetTeam === 'enemy') {
        damageEnemy(damage);
        if (proj.statusEffect) {
          applyStatusEffect('enemy', proj.statusEffect, proj.sourceCardId);
          advanceTrialProgress('apply_status_effects', 1);
        }
      } else {
        damagePlayer(damage);
        advanceTrialProgress('survive_damage', damage);
        if (proj.statusEffect) {
          applyStatusEffect('player', proj.statusEffect, proj.sourceCardId);
        }
      }
    }
  }, [damageMinion, damagePlayer, damageEnemy, applyStatusEffect, recordDamage, advanceTrialProgress]);

  const handleProjectileRemove = useCallback((id: string) => {
    projectileMapRef.current.delete(id);
    setProjectiles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Handle projectile impact (for projectiles that hit and remove immediately like toast)
  const handleProjectileComplete = useCallback((
    id: string,
    impactPosition: [number, number, number]
  ) => {
    handleProjectileHit(id);
    handleProjectileRemove(id);
    spawnEffect('hit', impactPosition, { intensity: 0.8 });
    addCameraTrauma(0.08);
  }, [handleProjectileHit, handleProjectileRemove, spawnEffect, addCameraTrauma]);

  // Get current target position for a projectile — minions first, then HP bar
  const getTargetPosition = useCallback((proj: Projectile): [number, number, number] => {
    const store = useCombatStore.getState();
    
    // 1. If we have a specific minion target that's still alive, follow it
    if (proj.targetMinionId) {
      const minion = store.getMinion(proj.targetMinionId);
      if (minion && minion.state !== 'dying' && minion.state !== 'dead') {
        // Save last known position in case minion dies/is removed
        proj.lastTargetPosition = [...minion.position];
        return minion.position;
      }
      
      // Target died — for spine projectiles, keep flying to last known
      // position and let the damage be absorbed (no HP bar fallback)
      if (proj.initiallyTargetedMinion) {
        if (proj.lastTargetPosition) {
          return proj.lastTargetPosition;
        }
        // Minion removed before we captured position — fly to start and fizzle
        return proj.startPosition;
      }
      
      // For other projectile types, clear and retarget
      proj.targetMinionId = undefined;
    }
    
    // Spine projectiles that originally targeted a minion should never
    // retarget to the HP bar — they only hit what they were aimed at
    if (proj.initiallyTargetedMinion) {
      return proj.lastTargetPosition ?? proj.startPosition;
    }
    
    // 2. Dynamically find the closest enemy minion to home toward
    const firingTeam = proj.targetTeam === 'enemy' ? 'player' : 'enemy';
    const closestEnemy = store.getClosestEnemy(proj.startPosition, firingTeam);
    if (closestEnemy) {
      // Lock on to this minion for hit resolution
      proj.targetMinionId = closestEnemy.id;
      return closestEnemy.position;
    }
    
    // 3. No enemy minions — target the mage model directly
    return getHPBarTargetPosition(proj.targetTeam);
  }, []);

  return (
    <group>
      {/* Lighting */}
      <ArenaLighting />
      
      {/* Environment (sky, fog, particles) */}
      <ArenaEnvironment />
      
      {/* Arena floor - combat zone */}
      <ArenaFloor />

      {/* 3D mage figures (targetable HP bar replacements) */}
      <ArenaMage side="player" />
      <ArenaMage side="enemy" />

      {/* End-game vortex (erupts at 2 min) */}
      <ArenaVortex combatTime={combatTime} active={!gameOver} />

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
              if (card.type === 'CONSTRUCT') {
                handleConstructSpawn(entry.slotIndex, card, 'player');
              } else {
                handleMinionSpawn(entry.slotIndex, card, 'player');
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
              if (card.type === 'CONSTRUCT') {
                handleConstructSpawn(entry.slotIndex, card, 'enemy');
              } else {
                handleMinionSpawn(entry.slotIndex, card, 'enemy');
              }
            }}
          />
        );
      })}
      
      {/* Spawned constructs — routed to visual component by card family */}
      {constructs.map((construct) => {
        const cardId = construct.card.id;
        const sharedProps = {
          key: construct.id,
          slot: construct.slot,
          team: construct.team,
          damage: construct.card.baseStats.attack,
          cooldown: construct.card.cooldown ?? 5,
          onFire: (position: [number, number, number], damage: number) => handleCardFire(position, damage, construct.card, construct.team),
          combatId: construct.combatId,
          onDestroy: () => {
            setConstructs(prev => prev.filter(c => c.id !== construct.id));
          },
        };

        // Cactus family
        if (CACTUS_FAMILY.has(cardId) || construct.card.tags?.some(t => t === 'plant' && construct.card.tags?.includes('spiky'))) {
          return <SpawnedCactus {...sharedProps} />;
        }

        // Toaster family
        if (TOASTER_FAMILY.has(cardId)) {
          const isInfernal = !!construct.card.statusEffect ||
            cardId === 'burning_toaster' ||
            cardId === 'infernal_toaster';
          return <SpawnedToaster {...sharedProps} isInfernal={isInfernal} />;
        }

        // Battery family
        if (BATTERY_FAMILY.has(cardId) || construct.card.tags?.includes('electric')) {
          return <SpawnedBattery {...sharedProps} />;
        }

        // Brick family
        if (BRICK_FAMILY.has(cardId) || (construct.card.tags?.includes('stone') && construct.card.tags?.includes('heavy'))) {
          return <SpawnedBrick {...sharedProps} />;
        }

        // Espresso family
        if (ESPRESSO_FAMILY.has(cardId)) {
          return <SpawnedEspresso {...sharedProps} />;
        }

        // Everything else: generic construct with shape derived from card tags
        return (
          <GenericConstruct
            {...sharedProps}
            cardColor={construct.card.color || '#888888'}
            cardEmissive={construct.card.emissiveColor || '#444444'}
            cardTags={construct.card.tags || []}
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
              onHit={(id) => {
                handleProjectileHit(id);
                spawnEffect('hit', targetPos, { intensity: 0.6 });
                addCameraTrauma(0.06);
              }}
              onComplete={handleProjectileRemove}
            />
          );
        }
        
        if (proj.projectileType === 'spine') {
          return (
            <SpineProjectile
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
      <MinionManager onFire={handleCardFire} />
      
      {/* Visual effects */}
      <VfxManager />
      <ImpactEffects />
      <SpawnEffects />
      <StatusVfx />
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
