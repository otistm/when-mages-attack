import { useRef, useEffect, useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';

/**
 * Tracks the DOM rect of an HP bar element and reports it to the UI store
 * so projectile targeting can hit the HP bar in screen space.
 *
 * Shared between desktop FullWidthHealthBar and handheld CompactHPBar.
 */
export function useHPBarTracking(side: 'player' | 'enemy') {
  const barRef = useRef<HTMLDivElement>(null);
  const setHPBarRect = useUIStore((state) => state.setHPBarRect);

  const updatePosition = useCallback(() => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    setHPBarRect(side, {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
    });
  }, [side, setHPBarRect]);

  useEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    const interval = setInterval(updatePosition, 500);
    return () => {
      window.removeEventListener('resize', updatePosition);
      clearInterval(interval);
    };
  }, [updatePosition]);

  return barRef;
}
