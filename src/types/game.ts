/**
 * Game State Types for When Things Attack
 * Core game flow and phase management
 */

/**
 * Game phases in the core loop
 */
export type GamePhase = 
  | 'menu'         // Main menu
  | 'draft'        // Selecting starting cards
  | 'shop'         // Buying and crafting
  | 'crafting'     // Crafting scene
  | 'deploy'       // Placing cards on summoning circles
  | 'combat'       // Battle phase (automated)
  | 'result'       // Victory/defeat screen
  | 'paused';      // Game paused

/**
 * Combat sub-phases
 */
export type CombatPhase =
  | 'countdown'    // 3-2-1 countdown
  | 'active'       // Combat in progress
  | 'cleanup'      // Clearing dead minions
  | 'complete';    // Combat finished

/**
 * Match result
 */
export type MatchResult = 'victory' | 'defeat' | 'draw';

/**
 * Player health and resources
 */
export interface PlayerState {
  health: number;
  maxHealth: number;
  gold: number;
  experience: number;
  level: number;
  statusEffects: StatusEffectType[];
}

/**
 * Player status effects that can tint the HP bar
 */
export type StatusEffectType =
  | 'burn'
  | 'freeze'
  | 'poison'
  | 'blighted'
  | 'shocked';

/**
 * Active status effect instance with duration and damage
 * Based on Systems Designer's "Power Budget" methodology
 */
export interface StatusEffectInstance {
  id: string;
  type: StatusEffectType;
  /** Damage dealt per tick */
  damagePerTick: number;
  /** Seconds between ticks */
  tickInterval: number;
  /** Total duration in seconds */
  duration: number;
  /** Time elapsed since effect started */
  elapsed: number;
  /** Time since last tick */
  timeSinceLastTick: number;
  /** Source card ID for tracking */
  sourceCardId?: string;
}

/**
 * Status effect configuration - for card definitions
 * Per Narrative Designer: effects have flavor beyond mechanics
 */
export interface StatusEffectConfig {
  type: StatusEffectType;
  damagePerTick: number;
  tickInterval: number;
  duration: number;
  /** Grimoire-style description */
  flavorText?: string;
}

/**
 * Current run state
 */
export interface RunState {
  runId: string;
  turn: number;
  roundsWon: number;
  roundsLost: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  cardsDiscovered: string[];
  startedAt: number;
}

/**
 * Game settings
 */
export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  isMuted: boolean;
  showFps: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  textScale: number;
  colorblindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 1,
  musicVolume: 0.7,
  sfxVolume: 1,
  isMuted: false,
  showFps: false,
  reducedMotion: false,
  highContrast: false,
  textScale: 1,
  colorblindMode: 'none',
};

/**
 * Default player state for new run
 */
export const DEFAULT_PLAYER: PlayerState = {
  health: 100,
  maxHealth: 100,
  gold: 10,
  experience: 0,
  level: 1,
  statusEffects: [],
};

/**
 * Camera shake event
 */
export interface ShakeEvent {
  intensity: number;       // 0 to 1
  duration: number;        // Seconds
  decay?: number;          // Decay rate
}

/**
 * Particle spawn event
 */
export interface ParticleEvent {
  type: 'impact' | 'spawn' | 'death' | 'craft' | 'heal';
  position: [number, number, number];
  color?: string;
  count?: number;
  scale?: number;
}
