/**
 * ShockwaveRing — Expanding ring that fades out
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ShockwaveRingProps {
  position: [number, number, number];
  color?: string;
  maxRadius?: number;
  duration?: number;
  progress: number;
}

const ringGeo = new THREE.RingGeometry(0.9, 1.0, 32);

export function ShockwaveRing({
  position,
  color = '#ffffff',
  maxRadius = 3,
  progress,
}: ShockwaveRingProps) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!ref.current) return;
    const s = progress * maxRadius;
    ref.current.scale.set(s, s, s);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 1 - progress;
  });

  return (
    <mesh
      ref={ref}
      position={[position[0], 0.05, position[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <primitive object={ringGeo} attach="geometry" />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={1}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
