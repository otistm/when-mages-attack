/**
 * Combat Store - Manages minions, projectiles, and combat resolution
 * 
 * Handles:
 * - Active minion tracking (Map by ID)
 * - Projectile management
 * - Target acquisition (minions first, then HP bar)
 * - Damage resolution
 * - Status effects on HP bars
 */

import { create } from 'zustand';
import { MinionData, MinionState, Team, CARD_SLOTS, ARENA } from '@/types';
import { CardDefinition, StatusEffectType } from '@/types';

// Status effect on HP bar
export interface HPStatusEffect {
  type: StatusEffectType;
  duration: number;      // Total duration in seconds
  remaining: number;     // Time remaining
  damagePerSecond?: number;
}

// Combat minion with additional tracking
export interface CombatMinion extends MinionData {
  speed: number;         // Movement speed
  attackRange: number;   // Distance to start attacking
  attackCooldown: number; // Time between attacks
}

// Target types for projectiles/minions
export type TargetType = 
  | { type: 'minion'; id: string; position: [number, number, number] }
  | { type: 'hpbar'; team: Team };

interface CombatStore {
  // Minions
  minions: Map<string, CombatMinion>;
  
  // HP bar status effects
  playerStatusEffects: HPStatusEffect[];
  enemyStatusEffects: HPStatusEffect[];
  
  // Actions
  spawnMinion: (card: CardDefinition, team: Team, slotIndex: number) => string;
  removeMinion: (id: string) => void;
  updateMinion: (id: string, updates: Partial<CombatMinion>) => void;
  damageMinion: (id: string, damage: number, statusEffect?: StatusEffectType) => void;
  
  // HP bar status effects
  applyStatusToHPBar: (team: Team, effect: HPStatusEffect) => void;
  tickStatusEffects: (delta: number) => void;
  
  // Queries
  getMinion: (id: string) => CombatMinion | undefined;
  getMinionsByTeam: (team: Team) => CombatMinion[];
  getAliveMinions: () => CombatMinion[];
  getClosestEnemy: (position: [number, number, number], team: Team) => CombatMinion | undefined;
  findTarget: (team: Team, position: [number, number, number]) => TargetType | undefined;
  hasEnemyMinions: (team: Team) => boolean;
  
  // Combat resolution
  reset: () => void;
}

let minionIdCounter = 0;

// Get spawn position based on team and slot
function getSpawnPosition(team: Team, slotIndex: number): [number, number, number] {
  const slot = CARD_SLOTS[slotIndex];
  const x = slot?.xPosition ?? 0;
  const y = 0.5; // Slightly above ground
  // Spawn near the HP bar edge
  const z = team === 'player' ? ARENA.combatZoneEnd - 1 : ARENA.combatZoneStart + 1;
  return [x, y, z];
}

export const useCombatStore = create<CombatStore>((set, get) => ({
  minions: new Map(),
  playerStatusEffects: [],
  enemyStatusEffects: [],
  
  spawnMinion: (card, team, slotIndex) => {
    const id = `minion-${minionIdCounter++}`;
    const position = getSpawnPosition(team, slotIndex);
    
    const minion: CombatMinion = {
      id,
      cardInstanceId: `${card.id}-${Date.now()}`,
      cardDefinitionId: card.id,
      name: card.name,
      team,
      state: 'spawning',
      stats: { ...card.baseStats },
      currentHp: card.baseStats.hp,
      position,
      rotation: team === 'player' ? 0 : Math.PI, // Face toward enemy
      tags: card.tags ?? [],
      abilities: card.abilities ?? [],
      color: card.emissiveColor ?? (team === 'player' ? '#4ade80' : '#f87171'),
      buffs: [],
      debuffs: [],
      lastAttackTime: 0,
      targetId: undefined,
      speed: card.baseStats.speed ?? 2,
      attackRange: 1.5,
      attackCooldown: 1 / (card.baseStats.attackSpeed ?? 1),
    };
    
    set((state) => {
      const newMinions = new Map(state.minions);
      newMinions.set(id, minion);
      return { minions: newMinions };
    });
    
    // Transition from spawning to seeking after brief delay
    setTimeout(() => {
      const current = get().getMinion(id);
      if (current && current.state === 'spawning') {
        get().updateMinion(id, { state: 'moving' });
      }
    }, 500);
    
    return id;
  },
  
  removeMinion: (id) => {
    set((state) => {
      const newMinions = new Map(state.minions);
      newMinions.delete(id);
      return { minions: newMinions };
    });
  },
  
  updateMinion: (id, updates) => {
    set((state) => {
      const minion = state.minions.get(id);
      if (!minion) return state;
      
      const newMinions = new Map(state.minions);
      newMinions.set(id, { ...minion, ...updates });
      return { minions: newMinions };
    });
  },
  
  damageMinion: (id, damage, statusEffect) => {
    set((state) => {
      const minion = state.minions.get(id);
      if (!minion || minion.state === 'dying' || minion.state === 'dead') {
        return state;
      }
      
      const newHp = Math.max(0, minion.currentHp - damage);
      const newState: MinionState = newHp <= 0 ? 'dying' : minion.state;
      
      const newMinions = new Map(state.minions);
      newMinions.set(id, {
        ...minion,
        currentHp: newHp,
        state: newState,
      });
      
      return { minions: newMinions };
    });
    
    // Handle death after animation
    const minion = get().getMinion(id);
    if (minion && minion.currentHp <= 0) {
      setTimeout(() => {
        get().removeMinion(id);
      }, 800);
    }
  },
  
  applyStatusToHPBar: (team, effect) => {
    set((state) => {
      const key = team === 'player' ? 'playerStatusEffects' : 'enemyStatusEffects';
      const existing = state[key];
      
      // Check if status already exists - refresh duration
      const existingIndex = existing.findIndex((e) => e.type === effect.type);
      if (existingIndex >= 0) {
        const updated = [...existing];
        updated[existingIndex] = { ...effect };
        return { [key]: updated };
      }
      
      return { [key]: [...existing, effect] };
    });
  },
  
  tickStatusEffects: (delta) => {
    set((state) => {
      const tickEffects = (effects: HPStatusEffect[]): HPStatusEffect[] => {
        return effects
          .map((e) => ({ ...e, remaining: e.remaining - delta }))
          .filter((e) => e.remaining > 0);
      };
      
      return {
        playerStatusEffects: tickEffects(state.playerStatusEffects),
        enemyStatusEffects: tickEffects(state.enemyStatusEffects),
      };
    });
  },
  
  getMinion: (id) => {
    return get().minions.get(id);
  },
  
  getMinionsByTeam: (team) => {
    const minions: CombatMinion[] = [];
    get().minions.forEach((m) => {
      if (m.team === team && m.state !== 'dying' && m.state !== 'dead') {
        minions.push(m);
      }
    });
    return minions;
  },
  
  getAliveMinions: () => {
    const minions: CombatMinion[] = [];
    get().minions.forEach((m) => {
      if (m.state !== 'dying' && m.state !== 'dead') {
        minions.push(m);
      }
    });
    return minions;
  },
  
  getClosestEnemy: (position, team) => {
    const enemyTeam = team === 'player' ? 'enemy' : 'player';
    const enemies = get().getMinionsByTeam(enemyTeam);
    
    if (enemies.length === 0) return undefined;
    
    let closest: CombatMinion | undefined;
    let closestDist = Infinity;
    
    enemies.forEach((enemy) => {
      const dx = enemy.position[0] - position[0];
      const dz = enemy.position[2] - position[2];
      const dist = Math.sqrt(dx * dx + dz * dz);
      
      if (dist < closestDist) {
        closestDist = dist;
        closest = enemy;
      }
    });
    
    return closest;
  },
  
  findTarget: (team, position) => {
    const enemyTeam = team === 'player' ? 'enemy' : 'player';
    
    // First, look for enemy minions
    const closestEnemy = get().getClosestEnemy(position, team);
    if (closestEnemy) {
      return {
        type: 'minion',
        id: closestEnemy.id,
        position: closestEnemy.position,
      };
    }
    
    // No minions, target HP bar
    return {
      type: 'hpbar',
      team: enemyTeam,
    };
  },
  
  hasEnemyMinions: (team) => {
    const enemyTeam = team === 'player' ? 'enemy' : 'player';
    return get().getMinionsByTeam(enemyTeam).length > 0;
  },
  
  reset: () => {
    set({
      minions: new Map(),
      playerStatusEffects: [],
      enemyStatusEffects: [],
    });
  },
}));

export default useCombatStore;
