/**
 * LowPolyEspresso — Procedural low-poly espresso cup with saucer and steam.
 *
 * Based on docs/expresso.md:
 * - Saucer: CylinderGeometry ceramic white
 * - Cup: Open-ended cylinder + bottom + interior + rim
 * - Handle: Low-poly TorusGeometry
 * - Liquid: RingGeometry with vertex-animated ripples
 * - Crema: Thin torus ring on liquid surface
 * - Steam: Tetrahedron particles rising and fading
 * - Caffeine tremor: High-frequency vibration on liquid surface
 * - Subtle cup vibration
 */

import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SEGMENTS = 12;
const BASE_SCALE = 1.8;
const MAX_STEAM = 12;

interface SteamParticle {
  active: boolean;
  life: number;
  velocity: THREE.Vector3;
  rotSpeed: THREE.Vector3;
}

interface LowPolyEspressoProps {
  team: 'player' | 'enemy';
  isDamaged?: boolean;
  state?: string;
}

export function LowPolyEspresso({
  team,
  isDamaged,
}: LowPolyEspressoProps) {
  const groupRef = useRef<THREE.Group>(null);
  const espressoRef = useRef<THREE.Group>(null);
  const liquidRef = useRef<THREE.Mesh>(null);
  const cremaRef = useRef<THREE.Mesh>(null);
  const steamRefs = useRef<(THREE.Mesh | null)[]>([]);
  const damageFlash = useRef(0);
  const prevDamaged = useRef(false);

  const isPlayer = team === 'player';

  const steamPool = useRef<SteamParticle[]>(
    Array.from({ length: MAX_STEAM }, () => ({
      active: false,
      life: 0,
      velocity: new THREE.Vector3(),
      rotSpeed: new THREE.Vector3(),
    }))
  );

  const geos = useMemo(() => ({
    saucer: new THREE.CylinderGeometry(1.2, 0.8, 0.15, SEGMENTS),
    cupOuter: new THREE.CylinderGeometry(0.7, 0.5, 1.2, SEGMENTS, 1, true),
    cupBottom: new THREE.CircleGeometry(0.5, SEGMENTS),
    cupInner: new THREE.CylinderGeometry(0.6, 0.45, 1.2, SEGMENTS, 1, true),
    cupRim: new THREE.RingGeometry(0.6, 0.7, SEGMENTS),
    handle: new THREE.TorusGeometry(0.35, 0.1, 4, 8),
    liquid: new THREE.RingGeometry(0, 0.57, SEGMENTS, 5),
    crema: new THREE.TorusGeometry(0.53, 0.04, 3, SEGMENTS),
    steam: new THREE.TetrahedronGeometry(0.15, 0),
  }), []);

  const materials = useMemo(() => ({
    ceramic: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.05,
      flatShading: true,
    }),
    coffee: new THREE.MeshStandardMaterial({
      color: 0x000000,
      roughness: 0.05,
      metalness: 0.2,
      flatShading: true,
    }),
    crema: new THREE.MeshStandardMaterial({
      color: 0x000000,
      roughness: 0.8,
      flatShading: true,
    }),
    inside: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      flatShading: true,
      side: THREE.BackSide,
    }),
    steam: new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    }),
  }), []);

  // Store original liquid positions for ripple animation
  const liquidBasePositions = useRef<Float32Array | null>(null);

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    const espresso = espressoRef.current;
    const liquid = liquidRef.current;
    const crema = cremaRef.current;
    if (!group || !espresso) return;

    const t = clock.elapsedTime;

    // Damage flash
    if (isDamaged && !prevDamaged.current) {
      damageFlash.current = 1;
    }
    prevDamaged.current = !!isDamaged;

    if (damageFlash.current > 0) {
      damageFlash.current -= delta * 5;
      materials.ceramic.emissiveIntensity = damageFlash.current * 1.5;
      materials.ceramic.emissive.setHex(0xffffff);
    } else {
      materials.ceramic.emissiveIntensity = 0;
      materials.ceramic.emissive.setHex(0x000000);
    }

    // Liquid ripple animation
    if (liquid) {
      const geo = liquid.geometry as THREE.RingGeometry;
      const positions = geo.attributes.position;

      if (!liquidBasePositions.current) {
        liquidBasePositions.current = new Float32Array(positions.array);
      }

      const base = liquidBasePositions.current;
      const vibrateSpeed = 60;

      for (let i = 0; i < positions.count; i++) {
        const bx = base[i * 3];
        const by = base[i * 3 + 1];
        const dist = Math.sqrt(bx * bx + by * by);

        const ripple = Math.sin(dist * 25 - t * 15) * 0.015;
        const tremor = Math.sin(t * vibrateSpeed + dist * 50) * 0.005;

        positions.setZ(i, ripple + tremor);
      }
      positions.needsUpdate = true;
      geo.computeVertexNormals();

      const vibrateIntensity = 0.003;
      liquid.position.y = 1.15 + Math.sin(t * vibrateSpeed) * vibrateIntensity;

      const scaleJitter = 1.0 + Math.cos(t * vibrateSpeed * 1.2) * 0.005;
      liquid.scale.setScalar(scaleJitter);
    }

    if (crema) {
      const vibrateSpeed = 60;
      const vibrateIntensity = 0.003;
      crema.position.y = 1.151 + Math.sin(t * vibrateSpeed) * vibrateIntensity;
    }

    // Subtle cup vibration
    espresso.position.x = Math.sin(t * 80) * 0.001;
    espresso.position.z = Math.cos(t * 75) * 0.001;

    // Steam particles
    const pool = steamPool.current;

    // Spawn new steam
    if (Math.random() < 0.1) {
      const inactive = pool.find(p => !p.active);
      if (inactive) {
        inactive.active = true;
        inactive.life = 1.0;
        inactive.velocity.set(
          (Math.random() - 0.5) * 0.2,
          0.5 + Math.random() * 0.5,
          (Math.random() - 0.5) * 0.2,
        );
        inactive.rotSpeed.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);

        // Find a mesh to use
        const idx = pool.indexOf(inactive);
        const mesh = steamRefs.current[idx];
        if (mesh) {
          mesh.position.set(
            (Math.random() - 0.5) * 0.6,
            1.2,
            (Math.random() - 0.5) * 0.6,
          );
          mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
          mesh.scale.setScalar(1);
        }
      }
    }

    // Update steam
    for (let i = 0; i < MAX_STEAM; i++) {
      const p = pool[i];
      const mesh = steamRefs.current[i];
      if (!mesh) continue;

      if (!p.active) {
        mesh.visible = false;
        continue;
      }

      p.life -= delta * 0.5;
      if (p.life <= 0) {
        p.active = false;
        mesh.visible = false;
        continue;
      }

      mesh.visible = true;
      mesh.position.x += p.velocity.x * delta;
      mesh.position.y += p.velocity.y * delta;
      mesh.position.z += p.velocity.z * delta;

      mesh.rotation.x += p.rotSpeed.x * delta;
      mesh.rotation.y += p.rotSpeed.y * delta;
      mesh.rotation.z += p.rotSpeed.z * delta;

      const scale = 1.0 + (1.0 - p.life) * 2.0;
      mesh.scale.setScalar(scale);
      (mesh.material as THREE.MeshBasicMaterial).opacity = p.life * 0.3;
    }

    group.scale.setScalar(BASE_SCALE);
  });

  const yRotation = isPlayer ? 0 : Math.PI;

  return (
    <group ref={groupRef} scale={BASE_SCALE} rotation={[0, yRotation, 0]}>
      <group ref={espressoRef}>
        {/* Saucer */}
        <mesh geometry={geos.saucer} material={materials.ceramic} position={[0, 0.075, 0]} castShadow receiveShadow />

        {/* Cup outer wall */}
        <mesh geometry={geos.cupOuter} material={materials.ceramic} position={[0, 0.75, 0]} castShadow receiveShadow />

        {/* Cup bottom */}
        <mesh geometry={geos.cupBottom} material={materials.ceramic} position={[0, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]} />

        {/* Cup interior */}
        <mesh geometry={geos.cupInner} material={materials.inside} position={[0, 0.75, 0]} />

        {/* Cup rim */}
        <mesh geometry={geos.cupRim} material={materials.ceramic} position={[0, 1.35, 0]} rotation={[-Math.PI / 2, 0, 0]} />

        {/* Handle */}
        <mesh geometry={geos.handle} material={materials.ceramic} position={[0.7, 0.8, 0]} castShadow />

        {/* Espresso liquid */}
        <mesh ref={liquidRef} geometry={geos.liquid} material={materials.coffee} position={[0, 1.15, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow />

        {/* Crema ring */}
        <mesh ref={cremaRef} geometry={geos.crema} material={materials.crema} position={[0, 1.151, 0]} rotation={[Math.PI / 2, 0, 0]} />

        {/* Steam particles */}
        {Array.from({ length: MAX_STEAM }).map((_, i) => (
          <mesh
            key={`steam-${i}`}
            ref={el => { steamRefs.current[i] = el; }}
            geometry={geos.steam}
            material={materials.steam.clone()}
            visible={false}
          />
        ))}
      </group>

      {/* Warm spotlight glow */}
      <pointLight
        position={[0, 1.5, 0]}
        color={isPlayer ? '#fff0e6' : '#ff6666'}
        intensity={1.5}
        distance={4}
        decay={2}
      />
    </group>
  );
}

export default LowPolyEspresso;
