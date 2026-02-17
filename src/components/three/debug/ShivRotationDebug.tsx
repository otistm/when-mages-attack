/**
 * Debug component for the shiv projectile rotation.
 *
 * Shows the shiv model at several thrust directions so you can tune
 * baseRotation X / Y / Z and see the result for every angle.
 *
 * USAGE: Set SHOW_MODEL_DEBUG = true in Arena.tsx
 *
 * Saved values: X=-84, Y=-44, Z=-115, Scale=6.5
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useControls, button } from 'leva';
import * as THREE from 'three';

useGLTF.preload('/assets/models/rusty-shiv_cel.glb');

/** One ghost shiv aimed in a fixed direction. */
function DirectionGhost({
  origin,
  target,
  baseX,
  baseY,
  baseZ,
  scale,
  shivModel,
  label,
}: {
  origin: [number, number, number];
  target: [number, number, number];
  baseX: number;
  baseY: number;
  baseZ: number;
  scale: number;
  shivModel: THREE.Object3D;
  label: string;
}) {
  const ref = useRef<THREE.Group>(null);

  // Clone model for this instance
  const clone = useMemo(() => {
    const c = shivModel.clone();
    c.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = child.material.clone();
      }
    });
    return c;
  }, [shivModel]);

  // Compute adjusted Y from direction
  const dirAngle = Math.atan2(
    target[0] - origin[0],
    -(target[2] - origin[2]),
  );
  const adjustedY = baseY + dirAngle;

  // Direction vector for the arrow helper
  const direction = useMemo(() => {
    return new THREE.Vector3(
      target[0] - origin[0],
      target[1] - origin[1],
      target[2] - origin[2],
    ).normalize();
  }, [origin, target]);

  useFrame(() => {
    if (!ref.current) return;
    ref.current.rotation.set(baseX, adjustedY, baseZ);
  });

  // Place the ghost at the midpoint between origin and target
  const midX = (origin[0] + target[0]) / 2;
  const midZ = (origin[2] + target[2]) / 2;
  const midY = 2;

  return (
    <group position={[midX, midY, midZ]}>
      {/* The shiv model */}
      <group ref={ref} scale={scale}>
        <primitive object={clone} />
      </group>

      {/* Arrow showing thrust direction */}
      <arrowHelper
        args={[direction, new THREE.Vector3(0, 0, 0), 3, 0xff4444, 0.6, 0.3]}
      />

      {/* Origin dot */}
      <mesh position={[origin[0] - midX, origin[1] - midY + 0.1, origin[2] - midZ]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color="#00ff00" />
      </mesh>

      {/* Target dot */}
      <mesh position={[target[0] - midX, target[1] - midY + 0.1, target[2] - midZ]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
    </group>
  );
}

export function ShivRotationDebug() {
  const { scene } = useGLTF('/assets/models/rusty-shiv_cel.glb');

  const controls = useControls('Shiv Projectile Debug', {
    rotationX: { value: -84, min: -180, max: 180, step: 1, label: 'Base Rot X (deg)' },
    rotationY: { value: -44, min: -180, max: 180, step: 1, label: 'Base Rot Y (deg)' },
    rotationZ: { value: -115, min: -180, max: 180, step: 1, label: 'Base Rot Z (deg)' },
    scale: { value: 6.5, min: 1, max: 20, step: 0.5, label: 'Scale' },
    'Copy Values': button(() => {
      const msg = `Base Rotation: X=${controls.rotationX}°, Y=${controls.rotationY}°, Z=${controls.rotationZ}°, Scale=${controls.scale}`;
      console.log('=== SHIV DEBUG ===');
      console.log(msg);
      console.log(
        `Radians: X=${THREE.MathUtils.degToRad(controls.rotationX).toFixed(4)}, Y=${THREE.MathUtils.degToRad(controls.rotationY).toFixed(4)}, Z=${THREE.MathUtils.degToRad(controls.rotationZ).toFixed(4)}`,
      );
      alert(msg);
    }),
  });

  const baseX = THREE.MathUtils.degToRad(controls.rotationX);
  const baseY = THREE.MathUtils.degToRad(controls.rotationY);
  const baseZ = THREE.MathUtils.degToRad(controls.rotationZ);

  // Test directions: forward (-Z), left, right, diagonal, and backward (+Z)
  const directions: { origin: [number, number, number]; target: [number, number, number]; label: string }[] = [
    { origin: [0, 0.5, 4], target: [0, 0.5, -4], label: 'Forward (-Z)' },
    { origin: [-5, 0.5, 0], target: [5, 0.5, 0], label: 'Right (+X)' },
    { origin: [5, 0.5, 0], target: [-5, 0.5, 0], label: 'Left (-X)' },
    { origin: [-4, 0.5, 4], target: [4, 0.5, -4], label: 'Diagonal NE' },
    { origin: [4, 0.5, 4], target: [-4, 0.5, -4], label: 'Diagonal NW' },
    { origin: [0, 0.5, -4], target: [0, 0.5, 4], label: 'Backward (+Z)' },
  ];

  return (
    <group position={[0, 0, 0]}>
      {directions.map((d) => (
        <DirectionGhost
          key={d.label}
          origin={d.origin}
          target={d.target}
          baseX={baseX}
          baseY={baseY}
          baseZ={baseZ}
          scale={controls.scale}
          shivModel={scene}
          label={d.label}
        />
      ))}
    </group>
  );
}

// Keep old export for backwards compat
export const ModelRotationDebug = ShivRotationDebug;
