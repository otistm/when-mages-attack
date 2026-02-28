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
import { MinionData, MinionState, Team, CARD_SLOTS, ARENA, StatusEffect, SpawnRequest, AttackEvent, DeathEvent } from '@/types';
import { CardDefinition, StatusEffectType, StatusEffectConfig } from '@/types';
import { SynergyDefinition, ActiveSynergy, SynergyBonusType } from '@/types';
import { Tag } from '@/types/card';
import { useVfxStore } from '@/stores/vfxStore';
import { minionPositions } from '@/utils/minionPositionRegistry';

// ─── SYNERGY DEFINITIONS ────────────────────────────────────────────────────

const SYNERGY_DEFINITIONS: SynergyDefinition[] = [
  // Element synergies
  {
    id: 'inferno',
    name: 'Inferno',
    description: 'Burn damage +50%, burn duration +1s',
    requiredTags: ['fire'],
    requiredCount: 2,
    bonusType: 'burn_damage_mult',
    bonusValue: 1.5,
  },
  {
    id: 'inferno_duration',
    name: 'Inferno',
    description: 'Burn duration +1s',
    requiredTags: ['fire'],
    requiredCount: 2,
    bonusType: 'burn_duration_add',
    bonusValue: 1.0,
  },
  {
    id: 'miasma',
    name: 'Miasma',
    description: 'Poison spreads to 1 adjacent enemy on tick',
    requiredTags: ['poison'],
    requiredCount: 2,
    bonusType: 'poison_spread',
    bonusValue: 1,
  },
  {
    id: 'overload',
    name: 'Overload',
    description: 'Shocked enemies take +25% damage from all sources',
    requiredTags: ['electric'],
    requiredCount: 2,
    bonusType: 'shocked_vuln_mult',
    bonusValue: 1.25,
  },

  // Role synergies
  {
    id: 'ambush',
    name: 'Ambush',
    description: 'Assassin units deal +30% damage while a tank is alive',
    requiredTags: ['tank', 'assassin'],
    requiredCount: 1,
    bonusType: 'damage_mult',
    bonusValue: 1.3,
    affectedTags: ['assassin'],
  },
  {
    id: 'frontline_melee',
    name: 'Frontline',
    description: 'Melee units gain +20% HP',
    requiredTags: ['melee', 'ranged'],
    requiredCount: 1,
    bonusType: 'hp_mult',
    bonusValue: 1.2,
    affectedTags: ['melee'],
  },
  {
    id: 'frontline_ranged',
    name: 'Frontline',
    description: 'Ranged units gain +10% attack',
    requiredTags: ['melee', 'ranged'],
    requiredCount: 1,
    bonusType: 'attack_mult',
    bonusValue: 1.1,
    affectedTags: ['ranged'],
  },

  // Material synergies
  {
    id: 'living_army',
    name: 'Living Army',
    description: 'All bio units regenerate 1 HP every 5s',
    requiredTags: ['bio'],
    requiredCount: 3,
    bonusType: 'regen_per_5s',
    bonusValue: 1,
    affectedTags: ['bio'],
  },
  {
    id: 'overclocked',
    name: 'Overclocked',
    description: 'Mechanical units attack 15% faster',
    requiredTags: ['mechanical'],
    requiredCount: 2,
    bonusType: 'attack_speed_mult',
    bonusValue: 1.15,
    affectedTags: ['mechanical'],
  },
  {
    id: 'fortified_line',
    name: 'Fortified Line',
    description: 'Stone units take 15% less damage',
    requiredTags: ['stone'],
    requiredCount: 2,
    bonusType: 'damage_reduction',
    bonusValue: 0.85,
    affectedTags: ['stone'],
  },
];

/**
 * Calculate active synergies from a set of card tags.
 * Tags are collected from all cards in the player's active grimoire.
 */
export function calculateSynergies(allTags: Tag[]): ActiveSynergy[] {
  const tagCounts = new Map<string, number>();
  for (const tag of allTags) {
    tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }

  const active: ActiveSynergy[] = [];

  for (const def of SYNERGY_DEFINITIONS) {
    // For synergies needing multiple different tags (e.g. tank + assassin),
    // check that ALL required tags are present at least requiredCount times.
    // For synergies needing the same tag multiple times, check count.
    const allDistinct = new Set(def.requiredTags).size === def.requiredTags.length;

    if (allDistinct && def.requiredTags.length > 1) {
      // Multi-tag synergy: need at least 1 of each
      const allPresent = def.requiredTags.every(t => (tagCounts.get(t) ?? 0) >= 1);
      if (allPresent) {
        const minCount = Math.min(...def.requiredTags.map(t => tagCounts.get(t) ?? 0));
        active.push({ definition: def, matchedCount: minCount });
      }
    } else {
      // Single-tag synergy: need requiredCount of the tag
      const tag = def.requiredTags[0];
      const count = tagCounts.get(tag) ?? 0;
      if (count >= def.requiredCount) {
        active.push({ definition: def, matchedCount: count });
      }
    }
  }

  return active;
}

/**
 * Check if a synergy bonus applies to a minion based on its tags.
 */
export function getSynergyBonuses(
  minionTags: Tag[],
  activeSynergies: ActiveSynergy[],
  bonusType: SynergyBonusType
): number {
  let result = bonusType.endsWith('_mult') || bonusType === 'damage_reduction' ? 1 : 0;

  for (const syn of activeSynergies) {
    if (syn.definition.bonusType !== bonusType) continue;

    // Check if minion has affected tags (if specified)
    if (syn.definition.affectedTags) {
      const hasTag = syn.definition.affectedTags.some(t => minionTags.includes(t as Tag));
      if (!hasTag) continue;
    }

    if (bonusType.endsWith('_mult') || bonusType === 'damage_reduction') {
      result *= syn.definition.bonusValue;
    } else {
      result += syn.definition.bonusValue;
    }
  }

  return result;
}

const DEFAULT_STATUS_CONFIGS: Record<StatusEffectType, Omit<StatusEffectConfig, 'type'>> = {
  shocked: { damagePerTick: 0, tickInterval: 0.5, duration: 1.0 },
  burn:    { damagePerTick: 1, tickInterval: 1.0, duration: 3.0 },
  poison:  { damagePerTick: 1, tickInterval: 0.5, duration: 2.0 },
  freeze:  { damagePerTick: 0, tickInterval: 1.0, duration: 2.0 },
  blighted:{ damagePerTick: 2, tickInterval: 1.0, duration: 3.0 },
};

let statusIdCounter = 0;

// Status effect on HP bar
export interface HPStatusEffect {
  type: StatusEffectType;
  duration: number;      // Total duration in seconds
  remaining: number;     // Time remaining
  damagePerSecond?: number;
}

// Combat minion with additional tracking
export interface CombatMinion extends MinionData {
  speed: number;           // Movement speed
  attackRange: number;     // Distance to start attacking
  attackCooldown: number;  // Time between attacks
  collisionRadius: number; // Per-unit collision radius derived from mass
  isConstruct?: boolean;   // True for stationary constructs (toasters, etc.) — rendered by their own component, not MinionManager
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

  // Synergies
  activeSynergies: ActiveSynergy[];

  // Combat events (for VFX/audio triggers)
  lastAttackEvent: AttackEvent | null;
  lastDeathEvent: DeathEvent | null;

  // Combat lifecycle
  isCombatActive: boolean;
  combatTime: number;

  // Spawn queue
  spawnQueue: SpawnRequest[];
  
  // Actions
  spawnMinion: (card: CardDefinition, team: Team, slotIndex: number, positionOverride?: [number, number, number]) => string;
  registerConstruct: (card: CardDefinition, team: Team, position: [number, number, number]) => string;
  removeMinion: (id: string) => void;
  updateMinion: (id: string, updates: Partial<CombatMinion>) => void;
  damageMinion: (id: string, damage: number, statusEffect?: StatusEffectType) => void;
  
  // Per-minion status effects
  applyMinionStatus: (id: string, type: StatusEffectType, config?: Partial<StatusEffectConfig>, sourceId?: string) => void;
  tickMinionStatuses: (delta: number) => void;
  
  // HP bar status effects
  applyStatusToHPBar: (team: Team, effect: HPStatusEffect) => void;
  tickStatusEffects: (delta: number) => void;

  // Synergy actions
  computeSynergies: (playerCards: CardDefinition[]) => void;
  getActiveSynergies: () => ActiveSynergy[];

  // Combat lifecycle actions
  startCombat: () => void;
  endCombat: () => void;
  updateCombatTime: (delta: number) => void;

  // Spawn queue actions
  queueSpawn: (request: SpawnRequest) => void;
  processSpawnQueue: () => void;
  
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

export const useCombatStore = create<CombatStore>((set, get) => ({
  minions: new Map(),
  playerStatusEffects: [],
  enemyStatusEffects: [],
  activeSynergies: [],
  lastAttackEvent: null,
  lastDeathEvent: null,
  isCombatActive: false,
  combatTime: 0,
  spawnQueue: [],
  
  spawnMinion: (card, team, slotIndex, positionOverride?) => {
    const id = `minion-${minionIdCounter++}`;
    
    let position: [number, number, number];
    if (positionOverride) {
      position = positionOverride;
    } else {
      // Default spawn position — near their respective HP bars
      const slot = CARD_SLOTS[slotIndex];
      const baseX = slot?.xPosition ?? 0;
      const spawnX = baseX + (Math.random() - 0.5) * 4;
      const spawnY = 0.5;
      const baseZ = team === 'player' ? ARENA.playerThroneZ - 2 : ARENA.enemyThroneZ + 2;
      const spawnZ = baseZ + (Math.random() - 0.5) * 2;
      position = [spawnX, spawnY, spawnZ];
    }
    
    const mass = card.baseStats.mass ?? 1;
    const collisionRadius = 0.8 + Math.sqrt(mass) * 0.45;
    const speed = card.baseStats.speed ?? 2;
    const baseAttackRange = speed > 0 ? Math.max(1.5, collisionRadius + 0.5) : 0;

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
      rotation: team === 'player' ? Math.PI : 0,
      tags: card.tags ?? [],
      abilities: card.abilities ?? [],
      color: card.emissiveColor ?? (team === 'player' ? '#4ade80' : '#f87171'),
      buffs: [],
      debuffs: [],
      lastAttackTime: 0,
      targetId: undefined,
      speed,
      attackRange: baseAttackRange,
      attackCooldown: 1 / (card.baseStats.attackSpeed ?? 1),
      collisionRadius,
    };
    
    minionPositions.set(id, position[0], position[1], position[2], minion.rotation, collisionRadius, mass, team);
    
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
  
  registerConstruct: (card, team, position) => {
    const id = `construct-${minionIdCounter++}`;
    
    const constructMass = card.baseStats.mass ?? 1;
    const constructRadius = 0.8 + Math.sqrt(constructMass) * 0.45;

    const minion: CombatMinion = {
      id,
      cardInstanceId: `${card.id}-${Date.now()}`,
      cardDefinitionId: card.id,
      name: card.name,
      team,
      state: 'idle',
      stats: { ...card.baseStats },
      currentHp: card.baseStats.hp,
      position,
      rotation: team === 'player' ? Math.PI : 0,
      tags: card.tags ?? [],
      abilities: card.abilities ?? [],
      color: card.emissiveColor ?? (team === 'player' ? '#4ade80' : '#f87171'),
      buffs: [],
      debuffs: [],
      lastAttackTime: 0,
      targetId: undefined,
      speed: 0,
      attackRange: 0,
      attackCooldown: card.cooldown ?? 5,
      collisionRadius: constructRadius,
      isConstruct: true,
    };
    
    minionPositions.set(id, position[0], position[1], position[2], minion.rotation, constructRadius, constructMass, team);
    
    set((state) => {
      const newMinions = new Map(state.minions);
      newMinions.set(id, minion);
      return { minions: newMinions };
    });
    
    return id;
  },
  
  removeMinion: (id) => {
    minionPositions.remove(id);
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
    const minionBefore = get().getMinion(id);

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

    if (minionBefore) {
      const attackEvent: AttackEvent = {
        attackerId: '',
        targetId: id,
        damage,
        isCritical: false,
        position: minionBefore.position,
      };
      set({ lastAttackEvent: attackEvent });
    }

    if (statusEffect) {
      get().applyMinionStatus(id, statusEffect);
    }
    
    const minion = get().getMinion(id);
    if (minion && minion.currentHp <= 0) {
      const deathEvent: DeathEvent = {
        minionId: id,
        killerId: '',
        position: minion.position,
      };
      set({ lastDeathEvent: deathEvent });

      useVfxStore.getState().spawnEffect('death', minion.position, {
        color: minion.team === 'player' ? '#4ade80' : '#f87171',
      });
      setTimeout(() => {
        get().removeMinion(id);
      }, 800);
    }
  },
  
  applyMinionStatus: (id, type, config, sourceId) => {
    const defaults = DEFAULT_STATUS_CONFIGS[type];
    const duration = config?.duration ?? defaults.duration;
    const damagePerTick = config?.damagePerTick ?? defaults.damagePerTick;
    const tickInterval = config?.tickInterval ?? defaults.tickInterval;

    set((state) => {
      const minion = state.minions.get(id);
      if (!minion || minion.state === 'dying' || minion.state === 'dead') return state;

      const existingIdx = minion.debuffs.findIndex((d) => d.type === type);
      let newDebuffs: StatusEffect[];

      if (existingIdx >= 0) {
        newDebuffs = [...minion.debuffs];
        newDebuffs[existingIdx] = {
          ...newDebuffs[existingIdx],
          duration,
          damagePerTick,
          tickInterval,
          timeSinceLastTick: 0,
        };
      } else {
        const effect: StatusEffect = {
          id: `status-${statusIdCounter++}`,
          type,
          name: type,
          duration,
          damagePerTick,
          tickInterval,
          timeSinceLastTick: 0,
          sourceId: sourceId ?? '',
        };
        newDebuffs = [...minion.debuffs, effect];
      }

      const newMinions = new Map(state.minions);
      newMinions.set(id, { ...minion, debuffs: newDebuffs });
      return { minions: newMinions };
    });
  },

  tickMinionStatuses: (delta) => {
    set((state) => {
      let changed = false;
      const newMinions = new Map(state.minions);

      state.minions.forEach((minion, id) => {
        if (minion.debuffs.length === 0) return;
        if (minion.state === 'dying' || minion.state === 'dead') return;

        let hp = minion.currentHp;
        const survivingDebuffs: StatusEffect[] = [];

        for (const debuff of minion.debuffs) {
          const remaining = debuff.duration - delta;
          if (remaining <= 0) {
            changed = true;
            continue;
          }

          let timeSinceLastTick = (debuff.timeSinceLastTick ?? 0) + delta;
          const interval = debuff.tickInterval ?? 1;

          if (debuff.damagePerTick && debuff.damagePerTick > 0 && timeSinceLastTick >= interval) {
            hp = Math.max(0, hp - debuff.damagePerTick);
            timeSinceLastTick -= interval;
            changed = true;
          }

          survivingDebuffs.push({
            ...debuff,
            duration: remaining,
            timeSinceLastTick,
          });
          if (remaining !== debuff.duration) changed = true;
        }

        if (minion.debuffs.length !== survivingDebuffs.length || hp !== minion.currentHp || changed) {
          const newState: MinionState = hp <= 0 ? 'dying' : minion.state;
          newMinions.set(id, {
            ...minion,
            debuffs: survivingDebuffs,
            currentHp: hp,
            state: newState,
          });
          changed = true;

          if (hp <= 0 && minion.currentHp > 0) {
            const pos = minionPositions.get(id);
            const position: [number, number, number] = pos
              ? [pos.x, pos.y, pos.z]
              : minion.position;
            useVfxStore.getState().spawnEffect('death', position, {
              color: minion.team === 'player' ? '#4ade80' : '#f87171',
            });
            setTimeout(() => {
              useCombatStore.getState().removeMinion(id);
            }, 800);
          }
        }
      });

      return changed ? { minions: newMinions } : state;
    });
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
    const minion = get().minions.get(id);
    if (!minion) return undefined;
    const livePos = minionPositions.get(id);
    if (livePos) {
      return { ...minion, position: [livePos.x, livePos.y, livePos.z] as [number, number, number] };
    }
    return minion;
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
      const livePos = minionPositions.get(enemy.id);
      const ex = livePos ? livePos.x : enemy.position[0];
      const ez = livePos ? livePos.z : enemy.position[2];
      const dx = ex - position[0];
      const dz = ez - position[2];
      const dist = Math.sqrt(dx * dx + dz * dz);
      
      if (dist < closestDist) {
        closestDist = dist;
        closest = enemy;
      }
    });
    
    if (closest) {
      const livePos = minionPositions.get(closest.id);
      if (livePos) {
        closest = {
          ...closest,
          position: [livePos.x, livePos.y, livePos.z],
        };
      }
    }
    
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

  startCombat: () => {
    set({ isCombatActive: true, combatTime: 0 });
    const { minions } = get();
    minions.forEach((minion, id) => {
      if (minion.state === 'spawning' || minion.state === 'idle') {
        get().updateMinion(id, { state: 'moving' });
      }
    });
  },

  endCombat: () => {
    set({ isCombatActive: false });
  },

  updateCombatTime: (delta) => {
    set((state) => ({ combatTime: state.combatTime + delta }));
  },

  queueSpawn: (request) => {
    set((state) => ({
      spawnQueue: [...state.spawnQueue, request],
    }));
  },

  processSpawnQueue: () => {
    const { spawnQueue } = get();
    if (spawnQueue.length === 0) return;
    set((state) => ({
      spawnQueue: state.spawnQueue.slice(1),
    }));
  },

  computeSynergies: (playerCards) => {
    const allTags: Tag[] = [];
    for (const card of playerCards) {
      if (card.tags) {
        allTags.push(...card.tags);
      }
    }
    const synergies = calculateSynergies(allTags);
    set({ activeSynergies: synergies });
  },

  getActiveSynergies: () => {
    return get().activeSynergies;
  },
  
  reset: () => {
    minionPositions.clear();
    set({
      minions: new Map(),
      playerStatusEffects: [],
      enemyStatusEffects: [],
      activeSynergies: [],
      lastAttackEvent: null,
      lastDeathEvent: null,
      isCombatActive: false,
      combatTime: 0,
      spawnQueue: [],
    });
  },
}));

export default useCombatStore;
