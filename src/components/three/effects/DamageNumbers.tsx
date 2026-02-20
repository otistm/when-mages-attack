/**
 * DamageNumbers - Floating damage numbers using 3D sprites
 *
 * Uses a canvas texture rendered once per number and a billboarded sprite.
 * Animation is driven imperatively via refs (no React state in useFrame).
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
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

const DURATION = 1.0;
const RISE_DISTANCE = 2.0;

function DamageNumber({ event }: { event: DamageEvent }) {
  const spriteRef = useRef<THREE.Sprite>(null);
  const startTimeRef = useRef<number | null>(null);

  const color = event.side === 'player' ? '#ff4444' : '#ffaa00';

  const material = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 128, 64);

    ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.strokeText(`-${event.amount}`, 64, 32);

    ctx.fillStyle = color;
    ctx.fillText(`-${event.amount}`, 64, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    return new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
  }, [event.amount, color]);

  useEffect(() => {
    return () => {
      material.map?.dispose();
      material.dispose();
    };
  }, [material]);

  useFrame(({ clock }) => {
    if (!spriteRef.current) return;

    if (startTimeRef.current === null) {
      startTimeRef.current = clock.elapsedTime;
    }

    const elapsed = clock.elapsedTime - startTimeRef.current;
    const t = Math.min(elapsed / DURATION, 1);

    const easeOut = 1 - Math.pow(1 - t, 2);
    spriteRef.current.position.y = event.position[1] + easeOut * RISE_DISTANCE;

    const opacity = t > 0.5 ? 1 - ((t - 0.5) / 0.5) : 1;
    material.opacity = Math.max(0, opacity);

    if (opacity <= 0) {
      spriteRef.current.visible = false;
    }
  });

  return (
    <sprite
      ref={spriteRef}
      position={[event.position[0], event.position[1], event.position[2]]}
      material={material}
      scale={[2.5, 1.25, 1]}
    />
  );
}

export default DamageNumbers;
