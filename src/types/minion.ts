/**
 * Minion Types for When Things Attack
 * Runtime entity types for combat
 */

import { CardStats, Tag, CardAbility } from './card';
import { StatusEffectType } from './game';

/**
 * Team affiliation
 */
export type Team = 'player' | 'enemy';

/**
 * Minion behavior states
 */
export type MinionState = 
  | 'spawning'     // Playing spawn animation
  | 'idle'         // Waiting for combat to start
  | 'moving'       // Walking toward enemy
  | 'attacking'    // In attack animation
  | 'stunned'      // Cannot act
  | 'dying'        // Playing death animation
  | 'dead';        // Removed from play

/**
 * Runtime minion data
 * Active entity in the arena
 */
export interface MinionData {
  id: string;
  cardInstanceId: string;  // Link to source card
  cardDefinitionId: string;
  
  name: string;
  team: Team;
  state: MinionState;
  
  // Current stats (modified by buffs/debuffs)
  stats: CardStats;
  currentHp: number;
  
  // Combat state
  targetId?: string;       // Current attack target
  lastAttackTime: number;  // For attack cooldown
  
  // Position (synced with physics)
  position: [number, number, number];
  rotation: number;        // Y-axis rotation
  
  // Visual/Audio
  tags: Tag[];
  abilities: CardAbility[];
  color: string;
  
  // Status effects
  buffs: StatusEffect[];
  debuffs: StatusEffect[];
}

/**
 * Status effect applied to a minion.
 * `type` identifies the effect kind (shocked, burn, poison, etc.).
 * Same-type effects refresh duration rather than stacking.
 */
export interface StatusEffect {
  id: string;
  type: StatusEffectType;
  name: string;
  duration: number;           // Remaining duration in seconds
  tickInterval?: number;      // Seconds between DoT ticks
  damagePerTick?: number;     // Damage dealt each tick
  timeSinceLastTick?: number; // Runtime: time elapsed since last tick
  statModifiers?: Partial<CardStats>;
  sourceId: string;           // Who applied this effect
}

/**
 * Spawn request for creating a new minion
 */
export interface SpawnRequest {
  cardInstanceId: string;
  team: Team;
  slotIndex: number;       // 0-4 (left to right)
}

/**
 * Attack event data
 */
export interface AttackEvent {
  attackerId: string;
  targetId: string;
  damage: number;
  isCritical: boolean;
  position: [number, number, number];
}

/**
 * Death event data
 */
export interface DeathEvent {
  minionId: string;
  killerId?: string;
  position: [number, number, number];
}

/**
 * Card slot configuration
 * 5 slots per player where cards are placed before battle
 */
export interface CardSlotConfig {
  index: number;           // 0-4 (left to right)
  xPosition: number;       // X position in arena
}

/**
 * Number of card slots per player
 */
export const CARD_SLOT_COUNT = 5;

/**
 * Card slot positions (evenly distributed)
 */
export const CARD_SLOTS: CardSlotConfig[] = [
  { index: 0, xPosition: -6 },
  { index: 1, xPosition: -3 },
  { index: 2, xPosition: 0 },
  { index: 3, xPosition: 3 },
  { index: 4, xPosition: 6 },
];

/**
 * Arena dimensions
 */
export const ARENA = {
  length: 24,              // Z-axis length
  width: 16,               // X-axis width (wider for 5 slots)
  playerSlotZ: 8,          // Where player card slots are
  enemySlotZ: -8,          // Where enemy card slots are
  playerThroneZ: 12,       // Player's throne position
  enemyThroneZ: -12,       // Enemy's throne position
  combatZoneStart: -6,     // Where combat happens (z range)
  combatZoneEnd: 6,
} as const;

export const ARENA_BOUNDS = {
  minX: -(ARENA.width / 2 - 1),    // -7
  maxX:  (ARENA.width / 2 - 1),    //  7
  minZ:  ARENA.enemyThroneZ + 1,   // -11
  maxZ:  ARENA.playerThroneZ - 1,  //  11
} as const;
