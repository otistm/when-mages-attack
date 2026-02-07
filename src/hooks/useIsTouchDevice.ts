/**
 * useIsTouchDevice - Detects if the primary pointer is coarse (touch)
 * 
 * Returns true on touch-capable devices (phones, tablets, PC handhelds).
 * Uses matchMedia for reliable detection.
 */

import { useState, useEffect } from 'react';

export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(pointer: coarse)').matches;
  });

  useEffect(() => {
    const mql = window.matchMedia('(pointer: coarse)');
    const handler = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isTouch;
}
