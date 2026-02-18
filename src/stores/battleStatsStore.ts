/**
 * Battle Stats Store - Tracks per-card performance during combat
 * 
 * Records each card's triggers and damage dealt for the battle summary.
 */

import { create } from 'zustand';
import type { StatusEffectType } from '@/types';

export interface CardBattleStats {
  cardId: string;
  cardName: string;
  team: 'player' | 'enemy';
  timesTriggered: number;
  totalDamage: number;
  statusEffectDamage: number;
  statusEffectType?: StatusEffectType;
}

interface BattleStatsState {
  cardStats: Map<string, CardBattleStats>;
  
  /** Record a card firing (cooldown completed, projectile launched) */
  recordTrigger: (cardId: string, cardName: string, team: 'player' | 'enemy', statusEffectType?: StatusEffectType) => void;
  
  /** Record direct damage dealt by a card */
  recordDamage: (cardId: string, damage: number) => void;
  
  /** Record status effect (DOT) damage dealt by a card */
  recordStatusEffectDamage: (cardId: string, damage: number) => void;
  
  /** Get all stats as an array, sorted by total damage descending */
  getStatsByTeam: (team: 'player' | 'enemy') => CardBattleStats[];
  
  /** Get the MVP (highest damage card for a team) */
  getMVP: (team: 'player' | 'enemy') => CardBattleStats | null;
  
  /** Reset all stats for a new battle */
  reset: () => void;
}

export const useBattleStatsStore = create<BattleStatsState>((set, get) => ({
  cardStats: new Map(),
  
  recordTrigger: (cardId, cardName, team, statusEffectType?) => {
    set((state) => {
      const newStats = new Map(state.cardStats);
      const existing = newStats.get(cardId);
      
      if (existing) {
        newStats.set(cardId, {
          ...existing,
          timesTriggered: existing.timesTriggered + 1,
          statusEffectType: statusEffectType ?? existing.statusEffectType,
        });
      } else {
        newStats.set(cardId, {
          cardId,
          cardName,
          team,
          timesTriggered: 1,
          totalDamage: 0,
          statusEffectDamage: 0,
          statusEffectType,
        });
      }
      
      return { cardStats: newStats };
    });
  },
  
  recordDamage: (cardId, damage) => {
    set((state) => {
      const newStats = new Map(state.cardStats);
      const existing = newStats.get(cardId);
      
      if (existing) {
        newStats.set(cardId, {
          ...existing,
          totalDamage: existing.totalDamage + damage,
        });
      }
      
      return { cardStats: newStats };
    });
  },
  
  recordStatusEffectDamage: (cardId, damage) => {
    set((state) => {
      const newStats = new Map(state.cardStats);
      const existing = newStats.get(cardId);
      
      if (existing) {
        newStats.set(cardId, {
          ...existing,
          statusEffectDamage: existing.statusEffectDamage + damage,
        });
      }
      
      return { cardStats: newStats };
    });
  },
  
  getStatsByTeam: (team) => {
    const stats: CardBattleStats[] = [];
    get().cardStats.forEach((s) => {
      if (s.team === team) stats.push(s);
    });
    return stats.sort((a, b) => (b.totalDamage + b.statusEffectDamage) - (a.totalDamage + a.statusEffectDamage));
  },
  
  getMVP: (team) => {
    const teamStats = get().getStatsByTeam(team);
    return teamStats.length > 0 ? teamStats[0] : null;
  },
  
  reset: () => {
    set({ cardStats: new Map() });
  },
}));
