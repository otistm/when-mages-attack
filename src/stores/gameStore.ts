/**
 * Game Store - Core game state management
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  GamePhase, 
  CombatPhase, 
  PlayerState, 
  RunState, 
  GameSettings,
  DEFAULT_SETTINGS,
  DEFAULT_PLAYER,
  MatchResult,
  StatusEffectInstance,
  StatusEffectConfig,
  StatusEffectType,
} from '@/types';
import { v4 as uuid } from 'uuid';
import { useBattleStatsStore } from '@/stores/battleStatsStore';

/**
 * Active status effects for each team
 * Stored separately for clean tick updates
 */
interface StatusEffectsState {
  player: StatusEffectInstance[];
  enemy: StatusEffectInstance[];
}

interface GameState {
  // Core state
  phase: GamePhase;
  combatPhase: CombatPhase;
  isLoading: boolean;
  
  // Player state
  player: PlayerState;
  enemy: PlayerState;
  
  // Status effects (DOT, debuffs, etc.)
  statusEffects: StatusEffectsState;
  
  // Run state
  run: RunState | null;
  
  // Settings
  settings: GameSettings;
  
  // Camera shake (for juice)
  cameraTrauma: number;
  
  // Actions
  setPhase: (phase: GamePhase) => void;
  setCombatPhase: (phase: CombatPhase) => void;
  
  // Run management
  startNewRun: () => void;
  endRun: (result: MatchResult) => void;
  advanceTurn: () => void;
  
  // Health management
  dealDamageToPlayer: (amount: number) => void;
  dealDamageToEnemy: (amount: number) => void;
  healPlayer: (amount: number) => void;
  
  // Status effect management
  applyStatusEffect: (target: 'player' | 'enemy', config: StatusEffectConfig, sourceCardId?: string) => void;
  removeStatusEffect: (target: 'player' | 'enemy', effectId: string) => void;
  tickStatusEffects: (delta: number) => void;
  clearStatusEffects: (target: 'player' | 'enemy', type?: StatusEffectType) => void;
  
  // Resources
  addGold: (amount: number) => void;
  spendGold: (amount: number) => boolean;
  
  // Camera effects
  addCameraTrauma: (amount: number) => void;
  decayCameraTrauma: (delta: number) => void;
  
  // Settings
  updateSettings: (settings: Partial<GameSettings>) => void;
  
  // Reset
  reset: () => void;
}

export const useGameStore = create<GameState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    phase: 'start',  // Start at title screen
    combatPhase: 'countdown',
    isLoading: false,
    
    player: { ...DEFAULT_PLAYER },
    enemy: { ...DEFAULT_PLAYER },
    
    statusEffects: { player: [], enemy: [] },
    
    run: null,
    settings: { ...DEFAULT_SETTINGS },
    cameraTrauma: 0,

    // Phase management
    setPhase: (phase) => set({ phase }),
    setCombatPhase: (combatPhase) => set({ combatPhase }),

    // Run management
    startNewRun: () => {
      const run: RunState = {
        runId: uuid(),
        turn: 1,
        roundsWon: 0,
        roundsLost: 0,
        totalDamageDealt: 0,
        totalDamageTaken: 0,
        cardsDiscovered: [],
        startedAt: Date.now(),
      };
      
      set({
        run,
        player: { ...DEFAULT_PLAYER },
        enemy: { ...DEFAULT_PLAYER },
        phase: 'crafting',
      });
    },

    endRun: (result) => {
      const { run } = get();
      if (!run) return;
      
      // Update run stats based on result
      if (result === 'victory') {
        set((state) => ({
          run: state.run ? { ...state.run, roundsWon: state.run.roundsWon + 1 } : null,
        }));
      } else if (result === 'defeat') {
        set((state) => ({
          run: state.run ? { ...state.run, roundsLost: state.run.roundsLost + 1 } : null,
        }));
      }
      
      set({ phase: 'result' });
    },

    advanceTurn: () => {
      set((state) => ({
        run: state.run 
          ? { ...state.run, turn: state.run.turn + 1 }
          : null,
        phase: 'crafting',
      }));
    },

    // Health management
    dealDamageToPlayer: (amount) => {
      set((state) => {
        const newHealth = Math.max(0, state.player.health - amount);
        const newRun = state.run 
          ? { ...state.run, totalDamageTaken: state.run.totalDamageTaken + amount }
          : null;
        
        return {
          player: { ...state.player, health: newHealth },
          run: newRun,
        };
      });
      
      // Check for defeat
      if (get().player.health <= 0) {
        get().endRun('defeat');
      }
    },

    dealDamageToEnemy: (amount) => {
      set((state) => {
        const newHealth = Math.max(0, state.enemy.health - amount);
        const newRun = state.run 
          ? { ...state.run, totalDamageDealt: state.run.totalDamageDealt + amount }
          : null;
        
        return {
          enemy: { ...state.enemy, health: newHealth },
          run: newRun,
        };
      });
      
      // Check for victory
      if (get().enemy.health <= 0) {
        get().endRun('victory');
      }
    },

    healPlayer: (amount) => {
      set((state) => ({
        player: {
          ...state.player,
          health: Math.min(state.player.maxHealth, state.player.health + amount),
        },
      }));
    },

    // Status effect management
    applyStatusEffect: (target, config, sourceCardId) => {
      const newEffect: StatusEffectInstance = {
        id: uuid(),
        type: config.type,
        damagePerTick: config.damagePerTick,
        tickInterval: config.tickInterval,
        duration: config.duration,
        elapsed: 0,
        timeSinceLastTick: 0,
        sourceCardId,
      };
      
      set((state) => {
        // Add the effect type to the player/enemy state for visual indicators
        const targetState = target === 'player' ? state.player : state.enemy;
        const hasType = targetState.statusEffects.includes(config.type);
        
        return {
          statusEffects: {
            ...state.statusEffects,
            [target]: [...state.statusEffects[target], newEffect],
          },
          [target]: hasType 
            ? targetState 
            : { ...targetState, statusEffects: [...targetState.statusEffects, config.type] },
        };
      });
    },
    
    removeStatusEffect: (target, effectId) => {
      set((state) => {
        const updated = state.statusEffects[target].filter(e => e.id !== effectId);
        const remaining = updated.map(e => e.type);
        const targetState = target === 'player' ? state.player : state.enemy;
        
        return {
          statusEffects: {
            ...state.statusEffects,
            [target]: updated,
          },
          [target]: {
            ...targetState,
            statusEffects: targetState.statusEffects.filter(t => remaining.includes(t)),
          },
        };
      });
    },
    
    tickStatusEffects: (delta) => {
      const { statusEffects, dealDamageToPlayer, dealDamageToEnemy, removeStatusEffect } = get();
      const { recordStatusEffectDamage } = useBattleStatsStore.getState();
      
      // Process player effects (enemy applied these TO the player)
      for (const effect of statusEffects.player) {
        effect.elapsed += delta;
        effect.timeSinceLastTick += delta;
        
        // Check for tick damage
        if (effect.timeSinceLastTick >= effect.tickInterval) {
          effect.timeSinceLastTick -= effect.tickInterval;
          dealDamageToPlayer(effect.damagePerTick);
        }
        
        // Check for expiration
        if (effect.elapsed >= effect.duration) {
          removeStatusEffect('player', effect.id);
        }
      }
      
      // Process enemy effects (player applied these TO the enemy)
      for (const effect of statusEffects.enemy) {
        effect.elapsed += delta;
        effect.timeSinceLastTick += delta;
        
        // Check for tick damage
        if (effect.timeSinceLastTick >= effect.tickInterval) {
          effect.timeSinceLastTick -= effect.tickInterval;
          dealDamageToEnemy(effect.damagePerTick);
          // Track status effect damage per source card
          if (effect.sourceCardId) {
            recordStatusEffectDamage(effect.sourceCardId, effect.damagePerTick);
          }
        }
        
        // Check for expiration
        if (effect.elapsed >= effect.duration) {
          removeStatusEffect('enemy', effect.id);
        }
      }
    },
    
    clearStatusEffects: (target, type) => {
      set((state) => {
        const filtered = type 
          ? state.statusEffects[target].filter(e => e.type !== type)
          : [];
        const targetState = target === 'player' ? state.player : state.enemy;
        
        return {
          statusEffects: {
            ...state.statusEffects,
            [target]: filtered,
          },
          [target]: {
            ...targetState,
            statusEffects: type 
              ? targetState.statusEffects.filter(t => t !== type)
              : [],
          },
        };
      });
    },

    // Resources
    addGold: (amount) => {
      set((state) => ({
        player: { ...state.player, gold: state.player.gold + amount },
      }));
    },

    spendGold: (amount) => {
      const { player } = get();
      if (player.gold < amount) return false;
      
      set((state) => ({
        player: { ...state.player, gold: state.player.gold - amount },
      }));
      return true;
    },

    // Camera effects
    addCameraTrauma: (amount) => {
      set((state) => ({
        cameraTrauma: Math.min(1, state.cameraTrauma + amount),
      }));
    },

    decayCameraTrauma: (delta) => {
      set((state) => ({
        cameraTrauma: Math.max(0, state.cameraTrauma - delta * 2),
      }));
    },

    // Settings
    updateSettings: (newSettings) => {
      set((state) => ({
        settings: { ...state.settings, ...newSettings },
      }));
    },

    // Reset
    reset: () => {
      set({
        phase: 'menu',
        combatPhase: 'countdown',
        player: { ...DEFAULT_PLAYER },
        enemy: { ...DEFAULT_PLAYER },
        statusEffects: { player: [], enemy: [] },
        run: null,
        cameraTrauma: 0,
      });
    },
  }))
);
