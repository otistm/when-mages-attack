/**
 * Combat Resolution — calculates final damage after crit, dodge, armor.
 *
 * Pure functions, no side effects. Called by minion combat loops
 * to determine hit outcomes.
 */

import type { CardStats } from '@/types/card';

export interface AttackResult {
  /** Final damage after all modifiers */
  damage: number;
  /** Whether the attack was a crit */
  isCritical: boolean;
  /** Whether the target dodged */
  isDodged: boolean;
  /** Raw damage before armor */
  rawDamage: number;
  /** Damage absorbed by armor */
  armorReduction: number;
}

const CRIT_MULTIPLIER = 2.0;
const MIN_DAMAGE = 1;

/**
 * Resolve an attack from `attacker` against `defender`.
 *
 * Roll order:
 * 1. Dodge check (defender.dodgeChance)
 * 2. Crit check (attacker.critChance)
 * 3. Armor reduction (defender.armor)
 */
export function resolveAttack(
  attackerStats: CardStats,
  defenderStats: CardStats,
  baseDamageOverride?: number
): AttackResult {
  const baseDamage = baseDamageOverride ?? attackerStats.attack;

  // 1. Dodge
  const dodgeChance = defenderStats.dodgeChance ?? 0;
  if (dodgeChance > 0 && Math.random() < dodgeChance) {
    return {
      damage: 0,
      isCritical: false,
      isDodged: true,
      rawDamage: baseDamage,
      armorReduction: 0,
    };
  }

  // 2. Crit
  const critChance = attackerStats.critChance ?? 0;
  const isCritical = critChance > 0 && Math.random() < critChance;
  const rawDamage = isCritical ? baseDamage * CRIT_MULTIPLIER : baseDamage;

  // 3. Armor
  const armor = defenderStats.armor ?? 0;
  const armorReduction = Math.min(armor, rawDamage - MIN_DAMAGE);
  const finalDamage = Math.max(MIN_DAMAGE, rawDamage - armorReduction);

  return {
    damage: finalDamage,
    isCritical,
    isDodged: false,
    rawDamage,
    armorReduction,
  };
}

/**
 * Calculate effective DPS accounting for crit and attack speed.
 * Useful for UI tooltips.
 */
export function calculateEffectiveDPS(stats: CardStats): number {
  const critChance = stats.critChance ?? 0;
  const avgDamagePerHit = stats.attack * (1 + critChance * (CRIT_MULTIPLIER - 1));
  return avgDamagePerHit * stats.attackSpeed;
}
