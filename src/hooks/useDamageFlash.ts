import { useRef, useState, useEffect } from 'react';

/**
 * Tracks HP changes and returns a brief `isDamaged` flag for flash effects.
 * Reusable across minions and constructs.
 */
export function useDamageFlash(currentHp: number, duration = 300): boolean {
  const prevHpRef = useRef<number | null>(null);
  const [isDamaged, setIsDamaged] = useState(false);

  useEffect(() => {
    if (prevHpRef.current !== null && currentHp < prevHpRef.current) {
      setIsDamaged(true);
      const timer = setTimeout(() => setIsDamaged(false), duration);
      prevHpRef.current = currentHp;
      return () => clearTimeout(timer);
    }
    prevHpRef.current = currentHp;
  }, [currentHp, duration]);

  return isDamaged;
}
