/**
 * Card Types for When Things Attack
 * Defines all card-related data structures
 */

// Card classification
export type CardType = 'CONSTRUCT' | 'SPELL' | 'ESSENCE' | 'MINION' | 'MODIFIER' | 'CONSUMABLE';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

// Element tags for synthesis system
export type ElementTag = 
  | 'fire' 
  | 'water' 
  | 'earth' 
  | 'air' 
  | 'light' 
  | 'dark'
  | 'arcane'
  | 'electric'
  | 'acid'
  | 'poison';

// Material tags for synthesis system
export type MaterialTag = 
  | 'metal' 
  | 'stone' 
  | 'glass' 
  | 'bio' 
  | 'liquid' 
  | 'plant';

// Property tags for synthesis system
export type PropertyTag =
  | 'sharp' 
  | 'blunt' 
  | 'spiky' 
  | 'heavy' 
  | 'fragile';

// Behavior tags for synthesis system
export type BehaviorTag =
  | 'stationary' 
  | 'minion' 
  | 'consumable' 
  | 'catalyst'
  | 'essence';

// Category tags for synthesis system
export type CategoryTag =
  | 'weapon' 
  | 'tech' 
  | 'food' 
  | 'meat';

// Attribute tags for synthesis system
export type AttributeTag = 
  | 'fast' 
  | 'slow' 
  | 'swift'
  | 'armored'
  | 'ethereal'
  | 'mechanical';

// Combat style tags
export type CombatTag = 
  | 'melee' 
  | 'ranged' 
  | 'support'
  | 'tank'
  | 'assassin';

// All possible tags
export type Tag = ElementTag | MaterialTag | PropertyTag | BehaviorTag | CategoryTag | AttributeTag | CombatTag;

/**
 * Base stats for any card
 */
export interface CardStats {
  hp: number;
  maxHp: number;
  attack: number;
  speed: number;      // Movement speed in units/second
  mass: number;       // Physics mass, affects knockback
  range: number;      // Attack range in units
  attackSpeed: number; // Attacks per second
}

/**
 * Default stats for creating new cards
 */
export const DEFAULT_STATS: CardStats = {
  hp: 10,
  maxHp: 10,
  attack: 2,
  speed: 2,
  mass: 1,
  range: 1,
  attackSpeed: 1,
};

/**
 * Ability trigger types
 */
export type AbilityTrigger = 
  | 'onSpawn'      // When minion is summoned
  | 'onHit'        // When minion deals damage
  | 'onDamaged'    // When minion takes damage
  | 'onDeath'      // When minion dies
  | 'onTick'       // Every combat tick
  | 'onCast';      // When spell is cast

/**
 * Ability effect context passed to ability functions
 */
export interface AbilityContext {
  source: string;          // ID of entity triggering the ability
  target?: string;         // ID of target entity (if applicable)
  damage?: number;         // Damage dealt/received (if applicable)
  position: [number, number, number];
}

// Re-export StatusEffectConfig for card definitions
export type { StatusEffectConfig } from './game';

/**
 * Card ability definition
 */
export interface CardAbility {
  id: string;
  name: string;
  description: string;
  trigger: AbilityTrigger;
  powerCost: number;       // For balance calculations
  cooldown?: number;       // Cooldown in seconds (for onTick abilities)
  // Effect is implemented via ID lookup in ability registry
}

/**
 * Static card definition (template)
 * Loaded from data files, never modified at runtime
 */
export interface CardDefinition {
  id: string;
  name: string;
  description: string;
  flavorText?: string;
  type: CardType;
  rarity: Rarity;
  tier: number;            // 1-5, affects power budget
  tags: Tag[];
  baseStats: CardStats;
  abilities: CardAbility[];
  cooldown?: number;       // Cooldown in seconds (if applicable)
  
  // Status effect applied on attack (e.g., burn, freeze)
  statusEffect?: import('./game').StatusEffectConfig;
  
  // Visual references
  meshPath?: string;       // Path to 3D model
  iconPath?: string;       // Path to card icon
  imagePath?: string;      // Path to card image for UI
  color: string;           // Primary color (hex)
  emissiveColor?: string;  // Glow color (hex)
  
  // Art direction
  _art_prompts?: string;   // Art direction for image generation (Weavy)
}

/**
 * Card instance in player's inventory
 * A specific copy of a card that can be modified
 */
export interface CardInstance {
  instanceId: string;
  definitionId: string;
  
  // Crafting lineage
  craftedFrom?: [string, string]; // Parent card definition IDs
  discoveredAt?: number;          // Timestamp of first discovery
  
  // Instance-specific modifications
  statModifiers: Partial<CardStats>;
  bonusTags: Tag[];
  bonusAbilities: CardAbility[];
  statusEffect?: import('./game').StatusEffectConfig;
  
  // Upgrade state
  level: number;
  experience: number;
}

/**
 * Recipe for crafting two cards together
 */
export interface CraftingRecipe {
  inputA: string;          // Card definition ID
  inputB: string;          // Card definition ID
  output: string;          // Resulting card definition ID
  discovered: boolean;     // Has player discovered this?
}

/**
 * Power budget calculation constants
 */
export const POWER_COSTS = {
  hp: 1,
  attack: 2,
  speed: 1.5,
  mass: 0.5,
  range: 1,
  attackSpeed: 3,
} as const;

/**
 * Tier power budgets
 */
export const TIER_BUDGETS: Record<number, number> = {
  1: 15,
  2: 25,
  3: 40,
  4: 60,
  5: 100,
};

/**
 * Calculate the power budget of a card's stats
 */
export function calculatePowerBudget(stats: CardStats, abilities: CardAbility[]): number {
  let total = 0;
  
  total += stats.hp * POWER_COSTS.hp;
  total += stats.attack * POWER_COSTS.attack;
  total += stats.speed * POWER_COSTS.speed;
  total += stats.mass * POWER_COSTS.mass;
  total += stats.range * POWER_COSTS.range;
  total += stats.attackSpeed * POWER_COSTS.attackSpeed;
  
  // Add ability costs
  total += abilities.reduce((sum, a) => sum + a.powerCost, 0);
  
  return total;
}
