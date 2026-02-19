/**
 * Mage Types for When Things Attack
 * Defines mage allegiance and keepsake ability systems
 */

import { StatusEffectConfig } from './game';

export type KeepsakeAbilityType = 'damage' | 'cc' | 'buff' | 'debuff' | 'heal' | 'drain';

export type KeepsakeTarget =
  | 'all_enemies'
  | 'all_allies'
  | 'all_enemy_minions'
  | 'all_ally_minions';

export interface KeepsakeEffectConfig {
  target: KeepsakeTarget;
  damage?: number;
  healAmount?: number;
  statusEffect?: StatusEffectConfig;
  buffDuration?: number;
  buffMultiplier?: number;
  freezeDuration?: number;
}

export type TrialObjectiveType =
  | 'defeat_minions'
  | 'deal_damage'
  | 'apply_status_effects'
  | 'single_hit_damage'
  | 'win_battle'
  | 'survive_damage'
  | 'minion_damage_dealt';

export interface KeepsakeTrial {
  name: string;
  description: string;
  flavorText: string;
  objectiveType: TrialObjectiveType;
  targetCount: number;
}

export interface KeepsakeDefinition {
  id: string;
  name: string;
  description: string;
  flavorText: string;
  iconEmoji: string;
  cooldownSeconds: number;
  abilityType: KeepsakeAbilityType;
  effectConfig: KeepsakeEffectConfig;
  trial: KeepsakeTrial;
  modelPath?: string;
  imagePath?: string;
}

export interface MageDefinition {
  id: string;
  name: string;
  title: string;
  affinity: string;
  personality: string[];
  lore: string;
  backstory: string;
  greeting: string;
  victoryQuote: string;
  defeatQuote: string;
  imagePath: string;
  color: string;
  emissiveColor: string;
  keepsake: KeepsakeDefinition;
  _art_prompts?: string;
}
