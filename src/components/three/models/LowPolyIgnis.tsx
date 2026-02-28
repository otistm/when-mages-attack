/**
 * LowPolyIgnis — Procedural low-poly pyromancer mage.
 *
 * Robed figure with pointed hood, arms raised in a casting pose.
 * Fire particles rise from the hands and shoulders.
 * Flickering point light for ambient fire glow.
 * Status effects shift the body emissive color.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { StatusEffectType } from '@/types';

/* ── Shared geometry (created once, reused across instances) ───────── */

// Torso — tapered cylinder (wider at bottom for robes)
const torsoGeo = (() => {
  const g = new THREE.CylinderGeometry(0.55, 0.9, 2.2, 6);
  g.translate(0, 1.1, 0);
  g.computeVertexNormals();
  return g;
})();

// Hood — cone on top of head
const hoodGeo = (() => {
  const g = new THREE.ConeGeometry(0.5, 0.9, 5);
  g.translate(0, 2.85, 0);
  g.computeVertexNormals();
  return g;
})();

// Head — small sphere beneath hood
const headGeo = (() => {
  const g = new THREE.IcosahedronGeometry(0.35, 1);
  g.translate(0, 2.35, 0.1);
  g.computeVertexNormals();
  return g;
})();

// Shoulders — two small spheres
const shoulderGeo = (() => {
  const g = new THREE.IcosahedronGeometry(0.25, 0);
  g.computeVertexNormals();
  return g;
})();

// Arms — tapered cylinders angled outward
const armGeo = (() => {
  const g = new THREE.CylinderGeometry(0.12, 0.18, 1.2, 5);
  g.translate(0, 0.6, 0);
  g.computeVertexNormals();
  return g;
})();

// Hands — small spheres at arm tips
const handGeo = (() => {
  const g = new THREE.IcosahedronGeometry(0.15, 0);
  g.computeVertexNormals();
  return g;
})();

// Robe skirt — wider cone for the bottom
const skirtGeo = (() => {
  const g = new THREE.CylinderGeometry(0.85, 1.2, 1.0, 6);
  g.translate(0, 0.5, 0);
  g.computeVertexNormals();
  return g;
})();

// Eye glow — two small planes
const eyeGeo = new THREE.CircleGeometry(0.06, 6);

const FIRE_PARTICLE_COUNT = 10;
const fireParticleGeo = new THREE.IcosahedronGeometry(0.07, 0);

const BASE_SCALE = 1.8;

/* ── Status effect → emissive color mapping ────────────────────────── */
const STATUS_EMISSIVE: Record<StatusEffectType, number> = {
  burn: 0xff6600,
  shocked: 0xffdd00,
  freeze: 0x66ddff,
  poison: 0x44ff44,
  blighted: 0xaa44ff,
};

interface LowPolyIgnisProps {
  team: 'player' | 'enemy';
  isDamaged?: boolean;
  activeStatus?: StatusEffectType | null;
}

export function LowPolyIgnis({ team, isDamaged, activeStatus }: LowPolyIgnisProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const fireRefs = useRef<(THREE.Mesh | null)[]>([]);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  const damageFlash = useRef(0);
  const prevDamaged = useRef(false);

  const defaultEmissive = 0xdc2626;

  const fireSeeds = useMemo(
    () =>
      Array.from({ length: FIRE_PARTICLE_COUNT }, () => ({
        angle: Math.random() * Math.PI * 2,
        radius: 0.2 + Math.random() * 0.4,
        speed: 1.5 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        yOffset: Math.random() * 0.3,
        hand: Math.random() > 0.5 ? 'left' : 'right',
      })),
    [],
  );

  // Robe body material
  const robeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xef4444,
        roughness: 0.85,
        metalness: 0.05,
        flatShading: true,
        emissive: new THREE.Color(defaultEmissive),
        emissiveIntensity: 0.3,
      }),
    [],
  );

  // Dark trim material (hood, skirt edges)
  const trimMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x7f1d1d,
        roughness: 0.9,
        metalness: 0.05,
        flatShading: true,
        emissive: new THREE.Color(0x991111),
        emissiveIntensity: 0.15,
      }),
    [],
  );

  // Skin material
  const skinMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xd4a574,
        roughness: 0.8,
        metalness: 0.0,
        flatShading: true,
      }),
    [],
  );

  // Eye glow material
  const eyeMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0xff8800 }),
    [],
  );

  // Fire particle materials
  const fireMats = useMemo(
    () =>
      Array.from({ length: FIRE_PARTICLE_COUNT }, () =>
        new THREE.MeshBasicMaterial({
          color: 0xff6600,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
        }),
      ),
    [],
  );

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;

    const t = state.clock.elapsedTime;
    const delta = state.clock.getDelta() || 0.016;

    // Damage flash
    if (isDamaged && !prevDamaged.current) {
      damageFlash.current = 1;
    }
    prevDamaged.current = !!isDamaged;

    if (damageFlash.current > 0) {
      damageFlash.current -= delta * 4;
      robeMat.emissiveIntensity = 0.3 + damageFlash.current * 3;
      robeMat.emissive.setHex(0xffffff);
      trimMat.emissiveIntensity = 0.15 + damageFlash.current * 2;
      trimMat.emissive.setHex(0xffffff);
    } else {
      const statusHex = activeStatus ? STATUS_EMISSIVE[activeStatus] : defaultEmissive;
      const pulse = activeStatus
        ? 0.3 + Math.sin(t * 4) * 0.15 + Math.sin(t * 7) * 0.1
        : 0.3 + Math.sin(t * 2) * 0.05;
      robeMat.emissiveIntensity = pulse;
      robeMat.emissive.setHex(statusHex);
      trimMat.emissiveIntensity = pulse * 0.5;
      trimMat.emissive.setHex(statusHex);
    }

    // Idle sway — subtle breathing
    const breathY = Math.sin(t * 1.5) * 0.03;
    group.position.y = breathY;

    // Arm sway (casting pose oscillation)
    if (leftArmRef.current) {
      leftArmRef.current.rotation.z = 0.6 + Math.sin(t * 1.2) * 0.08;
      leftArmRef.current.rotation.x = -0.3 + Math.sin(t * 1.8 + 1) * 0.05;
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.z = -0.6 - Math.sin(t * 1.2 + 0.5) * 0.08;
      rightArmRef.current.rotation.x = -0.3 + Math.sin(t * 1.8 + 2) * 0.05;
    }

    // Fire light flicker
    if (lightRef.current) {
      lightRef.current.intensity =
        2.0 + Math.sin(t * 10) * 0.4 + Math.sin(t * 23) * 0.2;
    }

    // Fire particles — rise from hands
    const leftHandWorld = new THREE.Vector3();
    const rightHandWorld = new THREE.Vector3();

    if (leftArmRef.current) {
      leftArmRef.current.localToWorld(leftHandWorld.set(0, 1.3, 0));
      group.worldToLocal(leftHandWorld);
    } else {
      leftHandWorld.set(-0.9, 2.2, 0.3);
    }
    if (rightArmRef.current) {
      rightArmRef.current.localToWorld(rightHandWorld.set(0, 1.3, 0));
      group.worldToLocal(rightHandWorld);
    } else {
      rightHandWorld.set(0.9, 2.2, 0.3);
    }

    for (let i = 0; i < FIRE_PARTICLE_COUNT; i++) {
      const mesh = fireRefs.current[i];
      if (!mesh) continue;

      const seed = fireSeeds[i];
      const life = ((t * seed.speed + seed.phase) % 2) / 2;
      const origin = seed.hand === 'left' ? leftHandWorld : rightHandWorld;

      const px = origin.x + Math.cos(seed.angle + t * 0.5) * seed.radius * 0.5;
      const py = origin.y + seed.yOffset + life * 1.5;
      const pz = origin.z + Math.sin(seed.angle + t * 0.5) * seed.radius * 0.5;

      mesh.position.set(px, py, pz);

      const sc = (1 - life) * 0.5 + 0.15;
      mesh.scale.setScalar(sc);

      fireMats[i].opacity = (1 - life) * 0.85;
      const r = 1;
      const g = 0.3 + life * 0.7;
      const b = life * 0.3;
      fireMats[i].color.setRGB(r, g, b);
    }

    group.scale.setScalar(BASE_SCALE);
  });

  const yRotation = team === 'player' ? 0 : Math.PI;

  return (
    <group ref={groupRef} scale={BASE_SCALE} rotation={[0, yRotation, 0]}>
      {/* Robe skirt (bottom) */}
      <mesh geometry={skirtGeo} material={trimMat} castShadow />

      {/* Torso */}
      <mesh geometry={torsoGeo} material={robeMat} castShadow />

      {/* Hood */}
      <mesh geometry={hoodGeo} material={trimMat} castShadow />

      {/* Head */}
      <mesh geometry={headGeo} material={skinMat} />

      {/* Eyes — glowing embers */}
      <mesh geometry={eyeGeo} position={[-0.12, 2.38, 0.42]} />
      <meshBasicMaterial attach="material" color={0xff8800} />
      <mesh geometry={eyeGeo} position={[0.12, 2.38, 0.42]} material={eyeMat} />
      <mesh geometry={eyeGeo} position={[-0.12, 2.38, 0.42]} material={eyeMat} />

      {/* Shoulders */}
      <mesh geometry={shoulderGeo} material={robeMat} position={[-0.7, 2.0, 0]} />
      <mesh geometry={shoulderGeo} material={robeMat} position={[0.7, 2.0, 0]} />

      {/* Left arm group */}
      <group ref={leftArmRef} position={[-0.7, 2.0, 0]} rotation={[0, 0, 0.6]}>
        <mesh geometry={armGeo} material={robeMat} castShadow />
        <mesh geometry={handGeo} material={skinMat} position={[0, 1.2, 0]} />
      </group>

      {/* Right arm group */}
      <group ref={rightArmRef} position={[0.7, 2.0, 0]} rotation={[0, 0, -0.6]}>
        <mesh geometry={armGeo} material={robeMat} castShadow />
        <mesh geometry={handGeo} material={skinMat} position={[0, 1.2, 0]} />
      </group>

      {/* Fire particles */}
      {fireMats.map((mat, i) => (
        <mesh
          key={i}
          ref={(el) => { fireRefs.current[i] = el; }}
          geometry={fireParticleGeo}
          material={mat}
        />
      ))}

      {/* Fire glow light */}
      <pointLight
        ref={lightRef}
        position={[0, 2.5, 0.5]}
        color="#ff4400"
        intensity={2.0}
        distance={8}
        decay={2}
      />
    </group>
  );
}

export default LowPolyIgnis;
