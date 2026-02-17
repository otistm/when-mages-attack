/**
 * Preferences Store — Accessibility & Display Sync
 * 
 * Bridges GameSettings accessibility fields to the DOM.
 * Applies CSS classes, data attributes, and custom properties
 * so that the semantic color system and motion preferences
 * take effect globally without per-component logic.
 * 
 * Settings are stored in gameStore.settings and persisted to localStorage.
 * This module provides initialization (OS preference detection) and
 * a Zustand subscription that keeps the DOM in sync.
 */

import { useGameStore } from './gameStore';

const STORAGE_KEY = 'wta-accessibility-prefs';

interface StoredPrefs {
  reducedMotion?: boolean;
  highContrast?: boolean;
  textScale?: number;
}

/**
 * Read persisted accessibility preferences from localStorage.
 */
function loadStoredPrefs(): StoredPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore parse errors */ }
  return {};
}

/**
 * Persist current accessibility preferences to localStorage.
 */
function savePrefs(prefs: StoredPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch { /* storage unavailable */ }
}

/**
 * Apply all accessibility-related settings to the DOM.
 * Called on every relevant settings change.
 */
function syncToDOM(settings: {
  reducedMotion: boolean;
  highContrast: boolean;
  textScale: number;
}): void {
  const root = document.documentElement;

  // Reduced motion
  if (settings.reducedMotion) {
    root.setAttribute('data-reduced-motion', 'true');
  } else {
    root.removeAttribute('data-reduced-motion');
  }

  // High contrast
  if (settings.highContrast) {
    root.classList.add('high-contrast');
  } else {
    root.classList.remove('high-contrast');
  }

  // Text scale
  root.style.setProperty('--text-scale', String(settings.textScale));
}

/**
 * Initialize accessibility preferences.
 * 
 * Call once before the first React render (e.g. in main.tsx).
 * 
 * Priority:
 * 1. Stored localStorage values (user explicitly set)
 * 2. OS-level preferences (prefers-reduced-motion)
 * 3. Defaults from GameSettings
 */
export function initAccessibilityPrefs(): void {
  const stored = loadStoredPrefs();

  const osReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const prefs: Partial<StoredPrefs> = {};

  if (stored.reducedMotion !== undefined) {
    prefs.reducedMotion = stored.reducedMotion;
  } else if (osReducedMotion) {
    prefs.reducedMotion = true;
  }

  if (stored.highContrast !== undefined) {
    prefs.highContrast = stored.highContrast;
  }

  if (stored.textScale !== undefined) {
    prefs.textScale = stored.textScale;
  }

  // Push detected prefs into the game store
  if (Object.keys(prefs).length > 0) {
    useGameStore.getState().updateSettings(prefs);
  }

  // Initial DOM sync
  const settings = useGameStore.getState().settings;
  syncToDOM({
    reducedMotion: settings.reducedMotion,
    highContrast: settings.highContrast,
    textScale: settings.textScale,
  });
}

/**
 * Subscribe to gameStore settings changes and keep the DOM in sync.
 * Call once at app startup (after initAccessibilityPrefs).
 * Returns an unsubscribe function.
 */
export function subscribeAccessibilitySync(): () => void {
  return useGameStore.subscribe(
    (state) => ({
      reducedMotion: state.settings.reducedMotion,
      highContrast: state.settings.highContrast,
      textScale: state.settings.textScale,
    }),
    (current, previous) => {
      if (
        current.reducedMotion !== previous.reducedMotion ||
        current.highContrast !== previous.highContrast ||
        current.textScale !== previous.textScale
      ) {
        syncToDOM(current);

        // Persist to localStorage
        savePrefs({
          reducedMotion: current.reducedMotion,
          highContrast: current.highContrast,
          textScale: current.textScale,
        });
      }
    },
    { equalityFn: (a, b) =>
        a.reducedMotion === b.reducedMotion &&
        a.highContrast === b.highContrast &&
        a.textScale === b.textScale,
    },
  );
}
