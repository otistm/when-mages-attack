/**
 * Damage Store - Tracks damage events for floating damage numbers
 */

import { create } from 'zustand';

export interface DamageEvent {
  id: string;
  amount: number;
  position: [number, number, number];
  side: 'player' | 'enemy';
  timestamp: number;
}

interface DamageState {
  events: DamageEvent[];
  addDamageEvent: (amount: number, side: 'player' | 'enemy', position: [number, number, number]) => void;
  removeEvent: (id: string) => void;
  clearEvents: () => void;
}

let eventIdCounter = 0;

export const useDamageStore = create<DamageState>((set) => ({
  events: [],
  
  addDamageEvent: (amount, side, position) => {
    const event: DamageEvent = {
      id: `dmg-${eventIdCounter++}`,
      amount,
      position,
      side,
      timestamp: Date.now(),
    };
    
    set((state) => ({
      events: [...state.events, event],
    }));
    
    // Auto-remove after animation completes
    setTimeout(() => {
      set((state) => ({
        events: state.events.filter((e) => e.id !== event.id),
      }));
    }, 1500);
  },
  
  removeEvent: (id) => {
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
    }));
  },
  
  clearEvents: () => {
    set({ events: [] });
  },
}));
