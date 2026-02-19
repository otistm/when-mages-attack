/**
 * VFX Store — Event queue for visual effects
 *
 * Any system can call spawnEffect() to queue a VFX event.
 * VfxManager reads the queue each frame and renders active effects.
 * Effects auto-cleanup after their duration expires.
 */

import { create } from 'zustand';

export type VfxType =
  | 'hit'
  | 'crit'
  | 'spawn'
  | 'death'
  | 'statusApply'
  | 'projectileLaunch'
  | 'shockwave';

export interface VfxEvent {
  id: string;
  type: VfxType;
  position: [number, number, number];
  color?: string;
  intensity?: number;
  duration: number;
  createdAt: number;
  team?: 'player' | 'enemy';
  statusType?: string;
}

export interface VfxConfig {
  color?: string;
  intensity?: number;
  duration?: number;
  team?: 'player' | 'enemy';
  statusType?: string;
}

const DEFAULT_DURATIONS: Record<VfxType, number> = {
  hit: 0.6,
  crit: 1.0,
  spawn: 1.2,
  death: 0.8,
  statusApply: 0.5,
  projectileLaunch: 0.3,
  shockwave: 0.8,
};

let vfxIdCounter = 0;

interface VfxStore {
  events: VfxEvent[];
  spawnEffect: (type: VfxType, position: [number, number, number], config?: VfxConfig) => void;
  removeEvent: (id: string) => void;
  tick: (now: number) => void;
  clear: () => void;
}

export const useVfxStore = create<VfxStore>((set, get) => ({
  events: [],

  spawnEffect: (type, position, config) => {
    const event: VfxEvent = {
      id: `vfx-${vfxIdCounter++}`,
      type,
      position: [...position],
      color: config?.color,
      intensity: config?.intensity ?? 1,
      duration: config?.duration ?? DEFAULT_DURATIONS[type],
      createdAt: performance.now() / 1000,
      team: config?.team,
      statusType: config?.statusType,
    };

    set((state) => ({
      events: [...state.events, event],
    }));
  },

  removeEvent: (id) => {
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
    }));
  },

  tick: (now) => {
    const { events } = get();
    const expired = events.filter((e) => now - e.createdAt > e.duration);
    if (expired.length > 0) {
      set((state) => ({
        events: state.events.filter((e) => now - e.createdAt <= e.duration),
      }));
    }
  },

  clear: () => set({ events: [] }),
}));
