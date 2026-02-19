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
import { MageDefinition, TrialObjectiveType } from '@/types/mage';
import { getMageDefinition } from '@/data/mages';
import { v4 as uuid } from 'uuid';
import { useBattleStatsStore } from '@/stores/battleStatsStore';
import { useCombatStore } from '@/stores/combatStore';

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
  
  // Mage allegiance
  selectedMage: MageDefinition | null;
  keepsakeCooldownRemaining: number;
  keepsakeReady: boolean;
  keepsakeUnlocked: boolean;
  keepsakeTrialProgress: number;
  
  // Run state
  run: RunState | null;
  
  // Settings
  settings: GameSettings;
  
  // Camera shake (for juice)
  cameraTrauma: number;
  
  // Debug
  isDebugArena: boolean;
  
  // Actions
  setPhase: (phase: GamePhase) => void;
  setCombatPhase: (phase: CombatPhase) => void;
  
  // Run management
  startNewRun: () => void;
  startDebugArena: () => void;
  resetForCombat: () => void;
  endRun: (result: MatchResult) => void;
  advanceTurn: () => void;
  
  // Mage allegiance
  selectMage: (mageId: string) => void;
  activateKeepsake: () => void;
  tickKeepsakeCooldown: (delta: number) => void;
  advanceTrialProgress: (type: TrialObjectiveType, amount: number) => void;
  
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
    
    selectedMage: null,
    keepsakeCooldownRemaining: 0,
    keepsakeReady: false,
    keepsakeUnlocked: false,
    keepsakeTrialProgress: 0,
    
    run: null,
    settings: { ...DEFAULT_SETTINGS },
    cameraTrauma: 0,
    isDebugArena: false,

    // Phase management
    setPhase: (phase) => set({ phase }),
    setCombatPhase: (combatPhase) => set({ combatPhase }),

    // Run management
    startDebugArena: () => {
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
        isDebugArena: true,
        phase: 'combat',
        combatPhase: 'battling',
      });
    },

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
        selectedMage: null,
        keepsakeCooldownRemaining: 0,
        keepsakeReady: false,
        keepsakeUnlocked: false,
        keepsakeTrialProgress: 0,
        isDebugArena: false,
        phase: 'allegiance',
      });
    },

    resetForCombat: () => {
      const { keepsakeUnlocked } = get();
      set({
        player: { ...DEFAULT_PLAYER },
        enemy: { ...DEFAULT_PLAYER },
        statusEffects: { player: [], enemy: [] },
        keepsakeCooldownRemaining: 0,
        keepsakeReady: keepsakeUnlocked,
        combatPhase: 'countdown',
      });
    },

    endRun: (result) => {
      const { run } = get();
      if (!run) return;
      
      if (result === 'victory') {
        set((state) => ({
          run: state.run ? { ...state.run, roundsWon: state.run.roundsWon + 1 } : null,
        }));
        get().advanceTrialProgress('win_battle', 1);
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

    // Mage allegiance
    selectMage: (mageId) => {
      const mage = getMageDefinition(mageId);
      if (!mage) return;
      set({
        selectedMage: mage,
        keepsakeCooldownRemaining: 0,
        keepsakeReady: false,
        keepsakeUnlocked: false,
        keepsakeTrialProgress: 0,
        phase: 'crafting',
      });
    },

    activateKeepsake: () => {
      const { selectedMage, keepsakeReady, keepsakeUnlocked } = get();
      if (!selectedMage || !keepsakeReady || !keepsakeUnlocked) return;

      const { keepsake } = selectedMage;
      const { effectConfig } = keepsake;
      const combatStore = useCombatStore.getState();
      const battleStats = useBattleStatsStore.getState();

      const keepsakeCardId = `keepsake_${selectedMage.id}`;
      const statusEffectType = effectConfig.statusEffect?.type;
      battleStats.recordTrigger(keepsakeCardId, keepsake.name, 'player', statusEffectType);

      let totalDirectDamage = 0;

      if (keepsake.abilityType === 'cc' && effectConfig.freezeDuration) {
        const enemies = combatStore.getMinionsByTeam('enemy');
        enemies.forEach((m: { id: string }) => {
          combatStore.updateMinion(m.id, { state: 'idle' as const });
        });
        setTimeout(() => {
          const store = useCombatStore.getState();
          enemies.forEach((m: { id: string }) => {
            const current = store.getMinion(m.id);
            if (current && current.state === 'idle') {
              store.updateMinion(m.id, { state: 'moving' as const });
            }
          });
        }, (effectConfig.freezeDuration ?? 2) * 1000);
      }

      if (keepsake.abilityType === 'damage' || keepsake.abilityType === 'debuff') {
        const enemies = combatStore.getMinionsByTeam('enemy');
        if (effectConfig.damage) {
          enemies.forEach((m: { id: string }) => {
            combatStore.damageMinion(m.id, effectConfig.damage!);
            totalDirectDamage += effectConfig.damage!;
          });
        }
        if (effectConfig.statusEffect) {
          enemies.forEach((m: { id: string }) => {
            combatStore.damageMinion(m.id, 0, effectConfig.statusEffect!.type);
          });
          get().applyStatusEffect('enemy', effectConfig.statusEffect, keepsakeCardId);
        }
      }

      if (keepsake.abilityType === 'drain') {
        const enemies = combatStore.getMinionsByTeam('enemy');
        if (effectConfig.damage) {
          enemies.forEach((m: { id: string }) => {
            combatStore.damageMinion(m.id, effectConfig.damage!);
            totalDirectDamage += effectConfig.damage!;
          });
        }
        if (effectConfig.healAmount) {
          get().healPlayer(effectConfig.healAmount);
        }
      }

      if (keepsake.abilityType === 'buff') {
        const allies = combatStore.getMinionsByTeam('player');
        const multiplier = effectConfig.buffMultiplier ?? 2.0;
        const duration = effectConfig.buffDuration ?? 4;
        const isShield = multiplier < 1;

        allies.forEach((m: { id: string; stats: { attack: number } }) => {
          if (isShield) {
            // Damage reduction: halve incoming damage by doubling HP temporarily
          } else {
            const originalAttack = m.stats.attack;
            combatStore.updateMinion(m.id, {
              stats: { ...combatStore.getMinion(m.id)!.stats, attack: Math.round(originalAttack * multiplier) },
            });
            setTimeout(() => {
              const store = useCombatStore.getState();
              const current = store.getMinion(m.id);
              if (current) {
                store.updateMinion(m.id, {
                  stats: { ...current.stats, attack: originalAttack },
                });
              }
            }, duration * 1000);
          }
        });
      }

      if (totalDirectDamage > 0) {
        battleStats.recordDamage(keepsakeCardId, totalDirectDamage);
      }

      // Start cooldown
      set({
        keepsakeCooldownRemaining: keepsake.cooldownSeconds,
        keepsakeReady: false,
      });

      // Camera shake for feedback
      get().addCameraTrauma(0.3);
    },

    tickKeepsakeCooldown: (delta) => {
      const { keepsakeCooldownRemaining, keepsakeReady } = get();
      if (keepsakeReady || keepsakeCooldownRemaining <= 0) return;
      
      const newRemaining = Math.max(0, keepsakeCooldownRemaining - delta);
      set({
        keepsakeCooldownRemaining: newRemaining,
        keepsakeReady: newRemaining <= 0,
      });
    },

    advanceTrialProgress: (type, amount) => {
      const { selectedMage, keepsakeUnlocked } = get();
      if (!selectedMage || keepsakeUnlocked) return;

      const { trial } = selectedMage.keepsake;
      if (trial.objectiveType !== type) return;

      const newProgress = Math.min(get().keepsakeTrialProgress + amount, trial.targetCount);
      const justUnlocked = newProgress >= trial.targetCount;

      set({
        keepsakeTrialProgress: newProgress,
        ...(justUnlocked ? { keepsakeUnlocked: true, keepsakeReady: true } : {}),
      });

      if (justUnlocked) {
        get().addCameraTrauma(0.25);
      }
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
        selectedMage: null,
        keepsakeCooldownRemaining: 0,
        keepsakeReady: false,
        keepsakeUnlocked: false,
        keepsakeTrialProgress: 0,
        run: null,
        cameraTrauma: 0,
        isDebugArena: false,
      });
    },
  }))
);
