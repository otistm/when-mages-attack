/**
 * ParticleBurst — Low-poly debris particles flying outward with gravity
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleBurstProps {
  position: [number, number, number];
  color?: string;
  count?: number;
  speed?: number;
  progress: number;
}

const debrisGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);

interface Particle {
  vx: number;
  vy: number;
  vz: number;
  rotSpeed: number;
}

export function ParticleBurst({
  position,
  color = '#cccccc',
  count = 10,
  speed = 6,
  progress,
}: ParticleBurstProps) {
  const groupRef = useRef<THREE.Group>(null);

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const elevation = Math.random() * 0.6 + 0.3;
      const spd = speed * (0.5 + Math.random() * 0.5);
      return {
        vx: Math.cos(angle) * spd * (1 - elevation),
        vy: spd * elevation,
        vz: Math.sin(angle) * spd * (1 - elevation),
        rotSpeed: (Math.random() - 0.5) * 12,
      };
    });
  }, [count, speed]);

  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        flatShading: true,
        transparent: true,
        depthWrite: false,
      }),
    [color],
  );

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const t = progress;
    const gravity = -15;

    group.children.forEach((child, i) => {
      const p = particles[i];
      if (!p) return;
      const mesh = child as THREE.Mesh;
      mesh.position.set(
        p.vx * t,
        p.vy * t + 0.5 * gravity * t * t,
        p.vz * t,
      );
      mesh.rotation.x += p.rotSpeed * 0.016;
      mesh.rotation.z += p.rotSpeed * 0.5 * 0.016;
      mat.opacity = Math.max(0, 1 - t * 1.5);
    });
  });

  return (
    <group ref={groupRef} position={position}>
      {particles.map((_, i) => (
        <mesh key={i} geometry={debrisGeo} material={mat} castShadow />
      ))}
    </group>
  );
}
