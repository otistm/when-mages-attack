/**
 * DamageNumbers - Floating damage numbers
 * 
 * Simple, clean animation:
 * - Appear at impact point
 * - Float upward smoothly
 * - Fade out
 */

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useDamageStore, DamageEvent } from '@/stores/damageStore';

export function DamageNumbers() {
  const events = useDamageStore((state) => state.events);
  
  return (
    <group>
      {events.map((event) => (
        <DamageNumber key={event.id} event={event} />
      ))}
    </group>
  );
}

interface DamageNumberProps {
  event: DamageEvent;
}

function DamageNumber({ event }: DamageNumberProps) {
  const [offsetY, setOffsetY] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const startTimeRef = useRef<number | null>(null);
  
  const duration = 1.0; // seconds
  const riseDistance = 2.0;
  
  useFrame(({ clock }) => {
    if (startTimeRef.current === null) {
      startTimeRef.current = clock.elapsedTime;
    }
    
    const elapsed = clock.elapsedTime - startTimeRef.current;
    const t = Math.min(elapsed / duration, 1);
    
    // Smooth ease-out for upward movement
    const easeOut = 1 - Math.pow(1 - t, 2);
    setOffsetY(easeOut * riseDistance);
    
    // Fade out in the second half
    if (t > 0.5) {
      setOpacity(1 - ((t - 0.5) / 0.5));
    }
  });
  
  if (opacity <= 0) return null;
  
  // Color based on side
  const color = event.side === 'player' ? '#ff4444' : '#ffaa00';
  
  // Cel-shaded text - flat color with black outline (stroke effect)
  return (
    <group position={[event.position[0], event.position[1] + offsetY, event.position[2]]}>
      <Html
        center
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <span
          style={{
            fontSize: '28px',
            fontWeight: 900,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color,
            opacity,
            WebkitTextStroke: '4px #111111',
            paintOrder: 'stroke fill',
            whiteSpace: 'nowrap',
          }}
        >
          -{event.amount}
        </span>
      </Html>
    </group>
  );
}

export default DamageNumbers;
