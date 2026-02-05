/**
 * Arena Store - Combat state and minion management
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  MinionData, 
  MinionState, 
  Team, 
  SpawnRequest,
  AttackEvent,
  DeathEvent,
  ARENA,
  CARD_SLOTS,
} from '@/types';
import { v4 as uuid } from 'uuid';

interface ArenaState {
  // Active minions
  minions: Map<string, MinionData>;
  
  // Spawn queue
  spawnQueue: SpawnRequest[];
  
  // Combat events (for effects/audio)
  lastAttackEvent: AttackEvent | null;
  lastDeathEvent: DeathEvent | null;
  
  // Combat state
  isCombatActive: boolean;
  combatTime: number; // Seconds since combat started
  
  // Actions
  spawnMinion: (request: SpawnRequest, cardData: Partial<MinionData>) => string;
  removeMinion: (minionId: string) => void;
  updateMinion: (minionId: string, updates: Partial<MinionData>) => void;
  
  // State changes
  setMinionState: (minionId: string, state: MinionState) => void;
  setMinionTarget: (minionId: string, targetId: string | undefined) => void;
  
  // Combat
  dealDamage: (attackerId: string, targetId: string, damage: number) => void;
  startCombat: () => void;
  endCombat: () => void;
  updateCombatTime: (delta: number) => void;
  
  // Queries
  getMinionById: (id: string) => MinionData | undefined;
  getMinionsByTeam: (team: Team) => MinionData[];
  getAliveMinions: () => MinionData[];
  getClosestEnemy: (minionId: string) => MinionData | undefined;
  
  // Spawn queue
  queueSpawn: (request: SpawnRequest) => void;
  processSpawnQueue: () => void;
  
  // Reset
  clearArena: () => void;
}

export const useArenaStore = create<ArenaState>()(
  subscribeWithSelector((set, get) => ({
    minions: new Map(),
    spawnQueue: [],
    lastAttackEvent: null,
    lastDeathEvent: null,
    isCombatActive: false,
    combatTime: 0,

    // Spawn a minion from a card slot
    spawnMinion: (request, cardData) => {
      const id = uuid();
      const slot = CARD_SLOTS[request.slotIndex] || CARD_SLOTS[2]; // Default to center slot
      
      const spawnZ = request.team === 'player' 
        ? ARENA.playerSlotZ 
        : ARENA.enemySlotZ;
      
      const minion: MinionData = {
        id,
        cardInstanceId: request.cardInstanceId,
        cardDefinitionId: cardData.cardDefinitionId || 'unknown',
        name: cardData.name || 'Minion',
        team: request.team,
        state: 'spawning',
        stats: cardData.stats || {
          hp: 10,
          maxHp: 10,
          attack: 2,
          speed: 2,
          mass: 1,
          range: 1,
          attackSpeed: 1,
        },
        currentHp: cardData.stats?.hp || 10,
        position: [slot.xPosition, 0.5, spawnZ],
        rotation: request.team === 'player' ? 0 : Math.PI,
        tags: cardData.tags || [],
        abilities: cardData.abilities || [],
        color: cardData.color || '#ff6b6b',
        buffs: [],
        debuffs: [],
        lastAttackTime: 0,
      };
      
      set((state) => {
        const newMinions = new Map(state.minions);
        newMinions.set(id, minion);
        return { minions: newMinions };
      });
      
      return id;
    },

    // Remove minion
    removeMinion: (minionId) => {
      set((state) => {
        const newMinions = new Map(state.minions);
        newMinions.delete(minionId);
        return { minions: newMinions };
      });
    },

    // Update minion data
    updateMinion: (minionId, updates) => {
      set((state) => {
        const minion = state.minions.get(minionId);
        if (!minion) return state;
        
        const newMinions = new Map(state.minions);
        newMinions.set(minionId, { ...minion, ...updates });
        return { minions: newMinions };
      });
    },

    // State management
    setMinionState: (minionId, minionState) => {
      get().updateMinion(minionId, { state: minionState });
    },

    setMinionTarget: (minionId, targetId) => {
      get().updateMinion(minionId, { targetId });
    },

    // Combat
    dealDamage: (attackerId, targetId, damage) => {
      const target = get().minions.get(targetId);
      const attacker = get().minions.get(attackerId);
      
      if (!target || !attacker) return;
      
      const newHp = Math.max(0, target.currentHp - damage);
      
      // Create attack event
      const attackEvent: AttackEvent = {
        attackerId,
        targetId,
        damage,
        isCritical: false, // TODO: Implement crit system
        position: target.position,
      };
      
      set({ lastAttackEvent: attackEvent });
      
      // Update target HP
      get().updateMinion(targetId, { currentHp: newHp });
      
      // Check for death
      if (newHp <= 0) {
        const deathEvent: DeathEvent = {
          minionId: targetId,
          killerId: attackerId,
          position: target.position,
        };
        
        set({ lastDeathEvent: deathEvent });
        get().setMinionState(targetId, 'dying');
      }
    },

    startCombat: () => {
      set({ isCombatActive: true, combatTime: 0 });
      
      // Set all spawning minions to moving
      const { minions } = get();
      minions.forEach((minion, id) => {
        if (minion.state === 'spawning' || minion.state === 'idle') {
          get().setMinionState(id, 'moving');
        }
      });
    },

    endCombat: () => {
      set({ isCombatActive: false });
    },

    updateCombatTime: (delta) => {
      set((state) => ({ combatTime: state.combatTime + delta }));
    },

    // Queries
    getMinionById: (id) => get().minions.get(id),

    getMinionsByTeam: (team) => {
      const minions: MinionData[] = [];
      get().minions.forEach((minion) => {
        if (minion.team === team) {
          minions.push(minion);
        }
      });
      return minions;
    },

    getAliveMinions: () => {
      const minions: MinionData[] = [];
      get().minions.forEach((minion) => {
        if (minion.state !== 'dead' && minion.state !== 'dying') {
          minions.push(minion);
        }
      });
      return minions;
    },

    getClosestEnemy: (minionId) => {
      const minion = get().minions.get(minionId);
      if (!minion) return undefined;
      
      const enemyTeam = minion.team === 'player' ? 'enemy' : 'player';
      const enemies = get().getMinionsByTeam(enemyTeam).filter(
        (e) => e.state !== 'dead' && e.state !== 'dying'
      );
      
      if (enemies.length === 0) return undefined;
      
      // Find closest by Z position
      return enemies.reduce((closest, enemy) => {
        const distToCurrent = Math.abs(minion.position[2] - enemy.position[2]);
        const distToClosest = Math.abs(minion.position[2] - closest.position[2]);
        return distToCurrent < distToClosest ? enemy : closest;
      });
    },

    // Spawn queue
    queueSpawn: (request) => {
      set((state) => ({
        spawnQueue: [...state.spawnQueue, request],
      }));
    },

    processSpawnQueue: () => {
      // Process spawns one at a time for animations
      const { spawnQueue } = get();
      if (spawnQueue.length === 0) return;
      
      // Process first in queue
      set((state) => ({
        spawnQueue: state.spawnQueue.slice(1),
      }));
    },

    // Reset
    clearArena: () => {
      set({
        minions: new Map(),
        spawnQueue: [],
        lastAttackEvent: null,
        lastDeathEvent: null,
        isCombatActive: false,
        combatTime: 0,
      });
    },
  }))
);
