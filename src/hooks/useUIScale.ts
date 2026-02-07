/**
 * useUIScale - Hook for managing the UI scale factor
 * 
 * Reads/writes --ui-scale CSS custom property for responsive scaling.
 * Auto-detects handheld-like environments (touch + small screen) and
 * applies a higher default scale. Users can override via a slider.
 * Persists preference to localStorage.
 */

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'ui-scale';
const DEFAULT_SCALE = 1;
const HANDHELD_SCALE = 1.35;
const MIN_SCALE = 0.75;
const MAX_SCALE = 2.0;
const STEP = 0.05;

/**
 * Detect if the device is likely a PC gaming handheld:
 * - Touch-capable (pointer: coarse)
 * - Small screen height (typical for handhelds in landscape)
 */
function detectHandheld(): boolean {
  if (typeof window === 'undefined') return false;
  
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const isSmallScreen = window.matchMedia('(max-height: 900px)').matches;
  
  return isCoarsePointer && isSmallScreen;
}

/**
 * Get the initial scale value:
 * 1. Check localStorage for user preference
 * 2. Fall back to auto-detection (handheld = 1.35, desktop = 1.0)
 */
function getInitialScale(): number {
  if (typeof window === 'undefined') return DEFAULT_SCALE;
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) {
    const parsed = parseFloat(stored);
    if (!isNaN(parsed) && parsed >= MIN_SCALE && parsed <= MAX_SCALE) {
      return parsed;
    }
  }
  
  return detectHandheld() ? HANDHELD_SCALE : DEFAULT_SCALE;
}

/**
 * Apply the scale value to the document root element
 */
function applyScale(scale: number): void {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--ui-scale', scale.toString());
}

/**
 * Initialize the UI scale on app startup.
 * Call this once in your root component (outside of React render cycle is fine).
 */
export function initUIScale(): number {
  const scale = getInitialScale();
  applyScale(scale);
  return scale;
}

/**
 * Hook for reading and writing the UI scale.
 * Returns the current scale and a setter function.
 */
export function useUIScale() {
  const [scale, setScaleState] = useState<number>(getInitialScale);

  // Apply scale to DOM and persist
  const setScale = useCallback((newScale: number) => {
    const clamped = Math.round(Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale)) * 100) / 100;
    setScaleState(clamped);
    applyScale(clamped);
    localStorage.setItem(STORAGE_KEY, clamped.toString());
  }, []);

  // Reset to auto-detected default (clears localStorage)
  const resetScale = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    const detected = detectHandheld() ? HANDHELD_SCALE : DEFAULT_SCALE;
    setScaleState(detected);
    applyScale(detected);
  }, []);

  // Sync on mount (in case another tab changed it)
  useEffect(() => {
    applyScale(scale);
  }, [scale]);

  return {
    scale,
    setScale,
    resetScale,
    isHandheld: detectHandheld(),
    MIN_SCALE,
    MAX_SCALE,
    STEP,
  };
}
