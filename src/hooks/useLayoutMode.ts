/**
 * useLayoutMode - Determines whether to use desktop or handheld layout
 * 
 * Auto-detects based on pointer type + screen size.
 * Users can force a mode via the UIScaleControl toggle.
 * Persists preference to localStorage.
 */

import { useState, useCallback, useEffect } from 'react';

export type LayoutMode = 'desktop' | 'handheld';

const STORAGE_KEY = 'layout-mode';

/**
 * Auto-detect layout mode:
 * - pointer: coarse + small screen height -> handheld
 * - otherwise -> desktop
 */
function detectLayoutMode(): LayoutMode {
  if (typeof window === 'undefined') return 'desktop';
  
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const isSmallScreen = window.matchMedia('(max-height: 900px)').matches;
  
  return (isCoarsePointer && isSmallScreen) ? 'handheld' : 'desktop';
}

function getInitialMode(): LayoutMode {
  if (typeof window === 'undefined') return 'desktop';
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'desktop' || stored === 'handheld') {
    return stored;
  }
  
  return detectLayoutMode();
}

// Module-level state so all hook instances share the same value
let currentMode: LayoutMode = getInitialMode();
const listeners = new Set<(mode: LayoutMode) => void>();

function notifyListeners() {
  listeners.forEach(fn => fn(currentMode));
}

/**
 * Get the current layout mode (can be called outside React)
 */
export function getLayoutMode(): LayoutMode {
  return currentMode;
}

/**
 * Hook for reading and toggling the layout mode
 */
export function useLayoutMode() {
  const [mode, setModeState] = useState<LayoutMode>(currentMode);

  useEffect(() => {
    const handler = (m: LayoutMode) => setModeState(m);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  const setMode = useCallback((newMode: LayoutMode) => {
    currentMode = newMode;
    localStorage.setItem(STORAGE_KEY, newMode);
    notifyListeners();
  }, []);

  const toggleMode = useCallback(() => {
    const next = currentMode === 'desktop' ? 'handheld' : 'desktop';
    currentMode = next;
    localStorage.setItem(STORAGE_KEY, next);
    notifyListeners();
  }, []);

  const resetMode = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    currentMode = detectLayoutMode();
    notifyListeners();
  }, []);

  return {
    mode,
    setMode,
    toggleMode,
    resetMode,
    isHandheld: mode === 'handheld',
    isDesktop: mode === 'desktop',
    autoDetected: detectLayoutMode(),
  };
}
