/**
 * ImpactFlash — Bright emissive sphere that expands and fades quickly
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ImpactFlashProps {
  position: [number, number, number];
  color?: string;
  size?: number;
  progress: number;
}

export function ImpactFlash({
  position,
  color = '#ffffff',
  size = 1,
  progress,
}: ImpactFlashProps) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!ref.current) return;
    const flashProgress = Math.min(progress * 4, 1);
    const scale = size * (0.2 + flashProgress * 0.8);
    ref.current.scale.setScalar(scale);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.max(0, 1 - flashProgress);
  });

  return (
    <mesh ref={ref} position={position}>
      <icosahedronGeometry args={[0.5, 1]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={1}
        depthWrite={false}
      />
    </mesh>
  );
}
