/**
 * Card Store - Manages card states for 2D overlay rendering
 */

import { create } from 'zustand';
import { CardDefinition } from '@/types';

export interface CardState {
  slotIndex: number;
  card: CardDefinition;
  team: 'player' | 'enemy';
  cooldownProgress: number; // 0-1
  isReady: boolean;
  hasSpawned: boolean;
  isExhausted: boolean;
  screenPosition: { x: number; y: number };
}

interface CardStore {
  cards: CardState[];
  
  // Actions
  addCard: (slotIndex: number, card: CardDefinition, team: 'player' | 'enemy') => void;
  removeCard: (slotIndex: number, team: 'player' | 'enemy') => void;
  updateCooldown: (slotIndex: number, team: 'player' | 'enemy', progress: number, isReady: boolean) => void;
  setSpawned: (slotIndex: number, team: 'player' | 'enemy', spawned: boolean) => void;
  exhaustCard: (slotIndex: number, team: 'player' | 'enemy') => void;
  updateScreenPosition: (slotIndex: number, team: 'player' | 'enemy', x: number, y: number) => void;
  getCard: (slotIndex: number, team: 'player' | 'enemy') => CardState | undefined;
  clearAll: () => void;
}

export const useCardStore = create<CardStore>((set, get) => ({
  cards: [],
  
  addCard: (slotIndex, card, team) => {
    set((state) => {
      // Check if card already exists
      const exists = state.cards.some(c => c.slotIndex === slotIndex && c.team === team);
      if (exists) return state;
      
      return {
        cards: [...state.cards, {
          slotIndex,
          card,
          team,
          cooldownProgress: 0,
          isReady: false,
          hasSpawned: false,
          isExhausted: false,
          screenPosition: { x: 0, y: 0 },
        }]
      };
    });
  },
  
  removeCard: (slotIndex, team) => {
    set((state) => ({
      cards: state.cards.filter(c => !(c.slotIndex === slotIndex && c.team === team))
    }));
  },
  
  updateCooldown: (slotIndex, team, progress, isReady) => {
    set((state) => ({
      cards: state.cards.map(c => 
        c.slotIndex === slotIndex && c.team === team
          ? { ...c, cooldownProgress: progress, isReady, isExhausted: false }
          : c
      )
    }));
  },
  
  setSpawned: (slotIndex, team, spawned) => {
    set((state) => ({
      cards: state.cards.map(c => 
        c.slotIndex === slotIndex && c.team === team
          ? { ...c, hasSpawned: spawned }
          : c
      )
    }));
  },
  
  exhaustCard: (slotIndex, team) => {
    set((state) => ({
      cards: state.cards.map(c => 
        c.slotIndex === slotIndex && c.team === team
          ? { ...c, isExhausted: true, cooldownProgress: 0, isReady: false }
          : c
      )
    }));
  },
  
  updateScreenPosition: (slotIndex, team, x, y) => {
    set((state) => ({
      cards: state.cards.map(c => 
        c.slotIndex === slotIndex && c.team === team
          ? { ...c, screenPosition: { x, y } }
          : c
      )
    }));
  },
  
  getCard: (slotIndex, team) => {
    return get().cards.find(c => c.slotIndex === slotIndex && c.team === team);
  },
  
  clearAll: () => {
    set({ cards: [] });
  },
}));

export default useCardStore;
