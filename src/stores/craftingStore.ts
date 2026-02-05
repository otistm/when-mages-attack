/**
 * Crafting Store - Card inventory and synthesis system
 * Per Narrative Designer: "Synthesis" is the arcane term for combining essences
 */

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { 
  CardInstance, 
  CraftingRecipe,
  CardStats,
  DEFAULT_STATS,
} from '@/types';
import { findRecipeOutput, getCardDefinition } from '@/data/cards';
import { v4 as uuid } from 'uuid';

// Create initial starter cards - all Tier 1 pages for experimentation
function createStarterInventory(): CardInstance[] {
  const starterPageIds = [
    // Existing base pages
    'toaster',
    'burning_essence',
    // New Tier 1 pages
    'rusty_shiv',
    'potted_cactus',
    'old_battery',
    'sentient_slime',
    'espresso_shot',
    'brick',
    'crow_feather',
    'rotten_egg',
    'magnifying_glass',
    'strange_meat',
  ];
  
  return starterPageIds.map((definitionId) => ({
    instanceId: uuid(),
    definitionId,
    statModifiers: {},
    bonusTags: [],
    bonusAbilities: [],
    level: 1,
    experience: 0,
  }));
}

interface CraftingState {
  // Inventory
  inventory: CardInstance[];
  
  // Discovered recipes (persisted)
  discoveredRecipes: CraftingRecipe[];
  
  // Selected cards for crafting
  selectedCards: [string | null, string | null];
  
  // Last crafted card (for highlighting/auto-selection)
  lastCraftedCardId: string | null;
  
  // Actions
  addCard: (card: CardInstance) => void;
  removeCard: (instanceId: string) => void;
  
  // Selection
  selectCard: (slot: 0 | 1, instanceId: string | null) => void;
  clearSelection: () => void;
  
  // Crafting
  craftSelectedCards: () => CardInstance | null;
  canCraft: () => boolean;
  clearLastCrafted: () => void;
  
  // Discovery
  discoverRecipe: (inputA: string, inputB: string, output: string) => void;
  isRecipeDiscovered: (inputA: string, inputB: string) => boolean;
  
  // Queries
  getCardById: (instanceId: string) => CardInstance | undefined;
  getInventoryByDefinition: (definitionId: string) => CardInstance[];
  
  // Reset
  reset: () => void;
}

export const useCraftingStore = create<CraftingState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        inventory: createStarterInventory(),
        discoveredRecipes: [],
        selectedCards: [null, null],
        lastCraftedCardId: null,

        // Inventory management
        addCard: (card) => {
          set((state) => ({
            inventory: [...state.inventory, card],
          }));
        },

        removeCard: (instanceId) => {
          set((state) => ({
            inventory: state.inventory.filter((c) => c.instanceId !== instanceId),
            // Clear selection if removed card was selected
            selectedCards: state.selectedCards.map((id) =>
              id === instanceId ? null : id
            ) as [string | null, string | null],
          }));
        },

        // Selection
        selectCard: (slot, instanceId) => {
          set((state) => {
            const newSelection = [...state.selectedCards] as [string | null, string | null];
            
            // If selecting same card in other slot, swap
            if (instanceId && state.selectedCards.includes(instanceId)) {
              const otherSlot = slot === 0 ? 1 : 0;
              if (state.selectedCards[otherSlot] === instanceId) {
                newSelection[otherSlot] = null;
              }
            }
            
            newSelection[slot] = instanceId;
            return { selectedCards: newSelection };
          });
        },

        clearSelection: () => {
          set({ selectedCards: [null, null] });
        },

        // Crafting
        canCraft: () => {
          const { selectedCards, inventory } = get();
          if (!selectedCards[0] || !selectedCards[1]) return false;
          if (selectedCards[0] === selectedCards[1]) return false;
          
          const cardA = inventory.find((c) => c.instanceId === selectedCards[0]);
          const cardB = inventory.find((c) => c.instanceId === selectedCards[1]);
          
          return !!cardA && !!cardB;
        },

        craftSelectedCards: () => {
          const { selectedCards, inventory, removeCard, addCard, discoverRecipe, isRecipeDiscovered } = get();
          
          if (!get().canCraft()) return null;
          
          const cardA = inventory.find((c) => c.instanceId === selectedCards[0]!);
          const cardB = inventory.find((c) => c.instanceId === selectedCards[1]!);
          
          if (!cardA || !cardB) return null;
          
          // Create synthesized card using recipe system
          const synthesizedCard = synthesizeCards(cardA, cardB);
          
          // Check for new discovery
          const wasDiscovered = isRecipeDiscovered(cardA.definitionId, cardB.definitionId);
          if (!wasDiscovered) {
            discoverRecipe(cardA.definitionId, cardB.definitionId, synthesizedCard.definitionId);
          }
          
          // Remove source cards
          removeCard(cardA.instanceId);
          removeCard(cardB.instanceId);
          
          // Add new card
          addCard(synthesizedCard);
          
          // Clear selection and set last crafted
          set({ 
            selectedCards: [null, null],
            lastCraftedCardId: synthesizedCard.instanceId,
          });
          
          return synthesizedCard;
        },
        
        clearLastCrafted: () => {
          set({ lastCraftedCardId: null });
        },

        // Discovery
        discoverRecipe: (inputA, inputB, output) => {
          const key = createRecipeKey(inputA, inputB);
          
          set((state) => {
            // Check if already discovered
            if (state.discoveredRecipes.some((r) => 
              createRecipeKey(r.inputA, r.inputB) === key
            )) {
              return state;
            }
            
            return {
              discoveredRecipes: [
                ...state.discoveredRecipes,
                { inputA, inputB, output, discovered: true },
              ],
            };
          });
        },

        isRecipeDiscovered: (inputA, inputB) => {
          const key = createRecipeKey(inputA, inputB);
          return get().discoveredRecipes.some((r) =>
            createRecipeKey(r.inputA, r.inputB) === key
          );
        },

        // Queries
        getCardById: (instanceId) => {
          return get().inventory.find((c) => c.instanceId === instanceId);
        },

        getInventoryByDefinition: (definitionId) => {
          return get().inventory.filter((c) => c.definitionId === definitionId);
        },

        // Reset
        reset: () => {
          set({
            inventory: createStarterInventory(),
            selectedCards: [null, null],
            lastCraftedCardId: null,
          });
        },
      }),
      {
        name: 'wta-crafting-storage',
        partialize: (state) => ({
          discoveredRecipes: state.discoveredRecipes,
        }),
      }
    )
  )
);

/**
 * Create a consistent key for recipe lookup (alphabetically sorted)
 */
function createRecipeKey(a: string, b: string): string {
  return [a, b].sort().join('+');
}

/**
 * Synthesize two cards into a new card
 * Uses recipe system for known combinations, falls back to stat merging
 */
function synthesizeCards(cardA: CardInstance, cardB: CardInstance): CardInstance {
  // Check for known recipe
  const recipeOutput = findRecipeOutput(cardA.definitionId, cardB.definitionId);
  
  if (recipeOutput) {
    // Known recipe - create card with the recipe output definition
    const outputDef = getCardDefinition(recipeOutput);
    
    return {
      instanceId: uuid(),
      definitionId: recipeOutput,
      craftedFrom: [cardA.definitionId, cardB.definitionId],
      discoveredAt: Date.now(),
      statModifiers: {},
      bonusTags: [],
      bonusAbilities: [],
      statusEffect: outputDef?.statusEffect,
      level: 1,
      experience: 0,
    };
  }
  
  // Unknown recipe - merge stats with synergy bonus
  const synergyMultiplier = 1.1;
  
  const mergedStats: CardStats = {
    hp: Math.floor((getEffectiveStat(cardA, 'hp') + getEffectiveStat(cardB, 'hp')) * 0.5 * synergyMultiplier),
    maxHp: Math.floor((getEffectiveStat(cardA, 'maxHp') + getEffectiveStat(cardB, 'maxHp')) * 0.5 * synergyMultiplier),
    attack: Math.floor((getEffectiveStat(cardA, 'attack') + getEffectiveStat(cardB, 'attack')) * 0.5 * synergyMultiplier),
    speed: (getEffectiveStat(cardA, 'speed') + getEffectiveStat(cardB, 'speed')) * 0.5,
    mass: (getEffectiveStat(cardA, 'mass') + getEffectiveStat(cardB, 'mass')) * 0.5,
    range: Math.max(getEffectiveStat(cardA, 'range'), getEffectiveStat(cardB, 'range')),
    attackSpeed: (getEffectiveStat(cardA, 'attackSpeed') + getEffectiveStat(cardB, 'attackSpeed')) * 0.5,
  };
  
  const mergedTags = [...new Set([...cardA.bonusTags, ...cardB.bonusTags])];
  
  return {
    instanceId: uuid(),
    definitionId: `crafted_${cardA.definitionId}_${cardB.definitionId}`,
    craftedFrom: [cardA.definitionId, cardB.definitionId],
    discoveredAt: Date.now(),
    statModifiers: mergedStats,
    bonusTags: mergedTags,
    bonusAbilities: [...cardA.bonusAbilities, ...cardB.bonusAbilities].slice(0, 3),
    level: 1,
    experience: 0,
  };
}

/**
 * Get effective stat value including modifiers
 */
function getEffectiveStat(card: CardInstance, stat: keyof CardStats): number {
  const base = DEFAULT_STATS[stat];
  const modifier = card.statModifiers[stat] ?? 0;
  return base + modifier;
}
