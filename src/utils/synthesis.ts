/**
 * Card Synthesis Utilities
 * Tag-based crafting algorithm with power budget validation
 */

import { 
  CardInstance, 
  CardStats, 
  Tag, 
  ElementTag,
  CardAbility,
  POWER_COSTS,
  TIER_BUDGETS,
  DEFAULT_STATS,
} from '@/types';
import { getCardDefinition } from '@/data/cards';
import { v4 as uuid } from 'uuid';

/**
 * Elemental synergy combinations
 * When two elements combine, they can create a new element
 */
const ELEMENTAL_SYNERGIES: Record<string, ElementTag> = {
  'fire+water': 'arcane',     // Steam -> Arcane magic
  'fire+earth': 'fire',       // Magma -> Enhanced fire
  'fire+air': 'fire',         // Inferno -> Enhanced fire
  'water+earth': 'earth',     // Mud -> Enhanced earth
  'water+air': 'water',       // Mist -> Enhanced water
  'earth+air': 'earth',       // Dust -> Enhanced earth
  'light+dark': 'arcane',     // Void -> Arcane magic
  'fire+light': 'light',      // Radiance -> Enhanced light
  'water+dark': 'dark',       // Abyss -> Enhanced dark
};

/**
 * Tag conflict pairs (reduce synergy bonus)
 */
const TAG_CONFLICTS: [Tag, Tag][] = [
  ['fast', 'slow'],
  ['heavy', 'swift'],
  ['fire', 'water'],
  ['light', 'dark'],
];

/**
 * Calculate synergy multiplier based on tag combinations
 */
export function calculateSynergyMultiplier(tagsA: Tag[], tagsB: Tag[]): number {
  let multiplier = 1.0;
  
  // Check for elemental synergies
  for (const tagA of tagsA) {
    for (const tagB of tagsB) {
      const key = [tagA, tagB].sort().join('+');
      if (ELEMENTAL_SYNERGIES[key]) {
        multiplier += 0.15; // 15% bonus per synergy
      }
    }
  }
  
  // Check for conflicts (penalty)
  for (const [conflictA, conflictB] of TAG_CONFLICTS) {
    const hasConflictA = tagsA.includes(conflictA) && tagsB.includes(conflictB);
    const hasConflictB = tagsA.includes(conflictB) && tagsB.includes(conflictA);
    
    if (hasConflictA || hasConflictB) {
      multiplier -= 0.1; // 10% penalty per conflict
    }
  }
  
  // Same element bonus
  for (const tag of tagsA) {
    if (tagsB.includes(tag)) {
      multiplier += 0.1; // 10% bonus for matching tags
    }
  }
  
  return Math.max(0.8, Math.min(1.5, multiplier));
}

/**
 * Merge tags from two cards, adding synergy tags
 */
export function mergeTags(tagsA: Tag[], tagsB: Tag[]): Tag[] {
  const result = new Set<Tag>([...tagsA, ...tagsB]);
  
  // Add synthesized elements
  for (const tagA of tagsA) {
    for (const tagB of tagsB) {
      const key = [tagA, tagB].sort().join('+');
      const synergy = ELEMENTAL_SYNERGIES[key];
      if (synergy) {
        result.add(synergy);
      }
    }
  }
  
  return Array.from(result);
}

/**
 * Merge stats from two cards
 */
export function mergeStats(
  statsA: Partial<CardStats>,
  statsB: Partial<CardStats>,
  multiplier: number
): CardStats {
  const getA = (key: keyof CardStats) => statsA[key] ?? DEFAULT_STATS[key];
  const getB = (key: keyof CardStats) => statsB[key] ?? DEFAULT_STATS[key];
  
  return {
    hp: Math.floor((getA('hp') + getB('hp')) * 0.5 * multiplier),
    maxHp: Math.floor((getA('maxHp') + getB('maxHp')) * 0.5 * multiplier),
    attack: Math.floor((getA('attack') + getB('attack')) * 0.5 * multiplier),
    speed: Math.round((getA('speed') + getB('speed')) * 0.5 * multiplier * 10) / 10,
    mass: Math.round((getA('mass') + getB('mass')) * 0.5 * 10) / 10,
    range: Math.max(getA('range'), getB('range')),
    attackSpeed: Math.round((getA('attackSpeed') + getB('attackSpeed')) * 0.5 * 10) / 10,
  };
}

/**
 * Scale stats to fit within a tier's power budget
 */
export function scaleToFitBudget(
  stats: CardStats,
  abilities: CardAbility[],
  tier: number
): CardStats {
  const budget = TIER_BUDGETS[tier] ?? TIER_BUDGETS[1];
  const abilityCost = abilities.reduce((sum, a) => sum + (a.powerCost ?? 0), 0);
  const availableBudget = budget - abilityCost;
  const currentCost = calculateStatCost(stats);
  
  if (currentCost <= availableBudget) {
    return stats;
  }
  
  const scale = availableBudget / currentCost;
  
  return {
    hp: Math.max(1, Math.floor(stats.hp * scale)),
    maxHp: Math.max(1, Math.floor(stats.maxHp * scale)),
    attack: Math.max(1, Math.floor(stats.attack * scale)),
    speed: Math.max(0.5, Math.round(stats.speed * scale * 10) / 10),
    mass: stats.mass, // Don't scale mass
    range: stats.range, // Don't scale range
    attackSpeed: Math.max(0.5, Math.round(stats.attackSpeed * scale * 10) / 10),
  };
}

/**
 * Calculate the power cost of stats only (no abilities)
 */
function calculateStatCost(stats: CardStats): number {
  return (
    stats.hp * POWER_COSTS.hp +
    stats.attack * POWER_COSTS.attack +
    stats.speed * POWER_COSTS.speed +
    stats.mass * POWER_COSTS.mass +
    stats.range * POWER_COSTS.range +
    stats.attackSpeed * POWER_COSTS.attackSpeed
  );
}

/**
 * Merge abilities from two cards (cap at 3)
 */
export function mergeAbilities(
  abilitiesA: CardAbility[],
  abilitiesB: CardAbility[]
): CardAbility[] {
  const combined = [...abilitiesA, ...abilitiesB];
  
  // Remove duplicates by ID
  const unique = combined.filter(
    (ability, index, self) => self.findIndex((a) => a.id === ability.id) === index
  );
  
  // Sort by power cost (keep the best ones)
  unique.sort((a, b) => (b.powerCost ?? 0) - (a.powerCost ?? 0));
  
  // Cap at 3 abilities
  return unique.slice(0, 3);
}

/**
 * Generate a name for the crafted card
 */
export function generateCraftedName(
  nameA: string,
  nameB: string,
  tags: Tag[]
): string {
  // Prefixes based on primary element
  const prefixes: Partial<Record<Tag, string>> = {
    fire: 'Inferno',
    water: 'Aqua',
    earth: 'Stone',
    air: 'Wind',
    light: 'Radiant',
    dark: 'Shadow',
    arcane: 'Arcane',
  };
  
  // Find the first element tag
  const elementTag = tags.find((t) => t in prefixes);
  const prefix = elementTag ? prefixes[elementTag] : '';
  
  // Get the "base" from a combination of both names
  const baseA = nameA.split(' ').pop() || nameA;
  const baseB = nameB.split(' ').pop() || nameB;
  
  // Pick the shorter one as the base
  const base = baseA.length <= baseB.length ? baseA : baseB;
  
  return prefix ? `${prefix} ${base}` : `Hybrid ${base}`;
}

/**
 * Synthesize two card instances into a new card
 */
export function synthesizeCards(
  cardA: CardInstance,
  cardB: CardInstance
): CardInstance {
  // Calculate synergy
  const synergyMultiplier = calculateSynergyMultiplier(
    cardA.bonusTags,
    cardB.bonusTags
  );
  
  // Merge tags
  const mergedTags = mergeTags(cardA.bonusTags, cardB.bonusTags);
  
  // Merge stats
  const mergedStats = mergeStats(
    cardA.statModifiers,
    cardB.statModifiers,
    synergyMultiplier
  );
  
  // Merge abilities
  const mergedAbilities = mergeAbilities(
    cardA.bonusAbilities,
    cardB.bonusAbilities
  );
  
  // Determine tier (max of inputs + 1)
  const tier = Math.min(5, cardA.level + 1);
  
  // Scale to fit budget
  const scaledStats = scaleToFitBudget(mergedStats, mergedAbilities, tier);
  
  // Resolve status effect
  // Look at both instance and definition for status effects
  const defA = getCardDefinition(cardA.definitionId);
  const defB = getCardDefinition(cardB.definitionId);
  
  const statusEffectA = cardA.statusEffect || defA?.statusEffect;
  const statusEffectB = cardB.statusEffect || defB?.statusEffect;
  
  // Simple logic: If one has it, take it. If both, prioritize 'burn' for now or take A.
  // In a full system we might merge damage/duration.
  const resultStatusEffect = statusEffectA || statusEffectB;

  // Create new card
  return {
    instanceId: uuid(),
    definitionId: `crafted_${Date.now()}`,
    craftedFrom: [cardA.definitionId, cardB.definitionId],
    discoveredAt: Date.now(),
    statModifiers: scaledStats,
    bonusTags: mergedTags,
    bonusAbilities: mergedAbilities,
    statusEffect: resultStatusEffect,
    level: tier,
    experience: 0,
  };
}

/**
 * Preview what a craft would produce (without consuming cards)
 */
export function previewSynthesis(
  cardA: CardInstance,
  cardB: CardInstance
): {
  resultTags: Tag[];
  synergyBonus: number;
  estimatedPower: number;
} {
  const synergyMultiplier = calculateSynergyMultiplier(
    cardA.bonusTags,
    cardB.bonusTags
  );
  
  const mergedTags = mergeTags(cardA.bonusTags, cardB.bonusTags);
  const mergedStats = mergeStats(
    cardA.statModifiers,
    cardB.statModifiers,
    synergyMultiplier
  );
  
  return {
    resultTags: mergedTags,
    synergyBonus: Math.round((synergyMultiplier - 1) * 100),
    estimatedPower: calculateStatCost(mergedStats),
  };
}
