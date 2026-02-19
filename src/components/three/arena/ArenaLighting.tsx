/**
 * Arena Lighting — Dramatic low-angle key light, cool fill, warm accent,
 * and subtle colored point lights for atmosphere.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function ArenaLighting() {
  const mainLightRef = useRef<THREE.DirectionalLight>(null);
  const accentRef = useRef<THREE.PointLight>(null);
  const playerGlowRef = useRef<THREE.PointLight>(null);
  const enemyGlowRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (accentRef.current) {
      accentRef.current.intensity = 0.6 + Math.sin(t * 1.2) * 0.15;
    }
    if (playerGlowRef.current) {
      playerGlowRef.current.intensity = 0.4 + Math.sin(t * 0.8) * 0.1;
    }
    if (enemyGlowRef.current) {
      enemyGlowRef.current.intensity = 0.4 + Math.sin(t * 0.9 + 1.0) * 0.1;
    }
  });

  return (
    <>
      {/* Main key light — low angle for long dramatic shadows */}
      <directionalLight
        ref={mainLightRef}
        position={[10, 12, -6]}
        intensity={2.8}
        color="#fff4e8"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-far={80}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
        shadow-radius={0}
      />

      {/* Cool fill from opposite side */}
      <directionalLight
        position={[-8, 6, 8]}
        intensity={0.25}
        color="#8899cc"
      />

      {/* Warm back-rim from behind enemy side */}
      <directionalLight
        position={[0, 4, -16]}
        intensity={0.15}
        color="#cc8855"
      />

      {/* Very low ambient — keeps shadows deep */}
      <ambientLight intensity={0.05} color="#8888aa" />

      {/* Center arena accent light — subtle purple glow from below */}
      <pointLight
        ref={accentRef}
        position={[0, 0.5, 0]}
        color="#6644aa"
        intensity={0.6}
        distance={18}
        decay={2}
      />

      {/* Player side warm glow */}
      <pointLight
        ref={playerGlowRef}
        position={[0, 1, 10]}
        color="#44aa66"
        intensity={0.4}
        distance={14}
        decay={2}
      />

      {/* Enemy side red glow */}
      <pointLight
        ref={enemyGlowRef}
        position={[0, 1, -10]}
        color="#aa4444"
        intensity={0.4}
        distance={14}
        decay={2}
      />
    </>
  );
}

export default ArenaLighting;
