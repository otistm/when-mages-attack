/**
 * Settings Store - User preferences (persisted to localStorage)
 */

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { GameSettings, DEFAULT_SETTINGS } from '@/types';

interface SettingsState {
  settings: GameSettings;
  updateSettings: (patch: Partial<GameSettings>) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    subscribeWithSelector((set) => ({
      settings: { ...DEFAULT_SETTINGS },

      updateSettings: (patch) => {
        set((state) => ({
          settings: { ...state.settings, ...patch },
        }));
      },

      resetSettings: () => {
        set({ settings: { ...DEFAULT_SETTINGS } });
      },
    })),
    {
      name: 'wta-settings',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
