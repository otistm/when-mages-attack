/**
 * ArenaVortex — end-game particle eruption at the 2-minute mark.
 *
 * Phases:
 *   warning  (5 s before): ground glow + rumble + faint sparks rising
 *   erupting (t = 0):      flash + camera shake
 *   active:                arena floor erupts with rising particle bursts
 *                          that slowly intensify over time
 *
 * Visual:
 *   • Hundreds of particles burst upward from random points across the arena
 *   • Pulsing ground glow disc
 *   • Purple / magenta / white palette (arcane energy)
 *   • Intensity grows the longer it's active
 */

import { useRef, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ARENA } from '@/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const VORTEX_TRIGGER = 120;
const WARNING_LEAD = 5;

const COLOR_CORE = new THREE.Color('#e879f9');
const COLOR_DARK = new THREE.Color('#4c1d95');

const PARTICLE_COUNT = 400;
const ARENA_HALF_W = ARENA.width / 2 - 1;
const ARENA_MIN_Z = ARENA.enemyThroneZ + 2;
const ARENA_MAX_Z = ARENA.playerThroneZ - 2;

// ─── Geometry singletons ─────────────────────────────────────────────────────

const discGeo = new THREE.CircleGeometry(6, 32);
discGeo.rotateX(-Math.PI / 2);

// ─── Procedural skull geometry ───────────────────────────────────────────────

function createSkullGeometry(): THREE.Group {
  const group = new THREE.Group();

  const skullMat = new THREE.MeshBasicMaterial({
    color: 0xddccbb,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const darkMat = new THREE.MeshBasicMaterial({
    color: 0x1a0a2e,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // Cranium — squashed sphere
  const cranium = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.75),
    skullMat,
  );
  cranium.scale.set(1, 0.95, 0.85);
  cranium.position.y = 0.3;
  group.add(cranium);

  // Lower face / jaw area — tapered box
  const jaw = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.9, 1.2, 1, 1, 1),
    skullMat,
  );
  jaw.position.set(0, -0.85, 0.15);
  jaw.scale.set(1, 1, 0.9);
  group.add(jaw);

  // Cheekbones — small boxes on each side
  const cheekGeo = new THREE.BoxGeometry(0.5, 0.35, 0.6);
  const cheekL = new THREE.Mesh(cheekGeo, skullMat);
  cheekL.position.set(-0.95, -0.35, 0.45);
  group.add(cheekL);
  const cheekR = new THREE.Mesh(cheekGeo, skullMat);
  cheekR.position.set(0.95, -0.35, 0.45);
  group.add(cheekR);

  // Left eye socket
  const eyeGeo = new THREE.CircleGeometry(0.38, 6);
  const eyeL = new THREE.Mesh(eyeGeo, darkMat);
  eyeL.position.set(-0.52, 0.05, 0.95);
  group.add(eyeL);

  // Right eye socket
  const eyeR = new THREE.Mesh(eyeGeo, darkMat);
  eyeR.position.set(0.52, 0.05, 0.95);
  group.add(eyeR);

  // Nose cavity — inverted triangle
  const noseShape = new THREE.Shape();
  noseShape.moveTo(0, 0);
  noseShape.lineTo(-0.18, -0.35);
  noseShape.lineTo(0.18, -0.35);
  noseShape.closePath();
  const noseGeo = new THREE.ShapeGeometry(noseShape);
  const nose = new THREE.Mesh(noseGeo, darkMat);
  nose.position.set(0, -0.3, 0.96);
  group.add(nose);

  // Teeth row — small boxes
  const toothGeo = new THREE.BoxGeometry(0.18, 0.22, 0.12);
  for (let i = 0; i < 6; i++) {
    const tooth = new THREE.Mesh(toothGeo, skullMat);
    tooth.position.set(-0.5 + i * 0.2, -0.95, 0.65);
    group.add(tooth);
  }

  // Attach materials for animation access
  group.userData.skullMat = skullMat;
  group.userData.darkMat = darkMat;

  return group;
}


// ─── Types ───────────────────────────────────────────────────────────────────

interface ArenaVortexProps {
  combatTime: number;
  active: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ArenaVortex({ combatTime, active }: ArenaVortexProps) {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const discRef = useRef<THREE.Mesh>(null);
  const skullRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.PointLight>(null);
  const flashRef = useRef<THREE.PointLight>(null);

  const skullGroup = useMemo(() => createSkullGeometry(), []);
  const skullMat = skullGroup.userData.skullMat as THREE.MeshBasicMaterial;
  const skullDarkMat = skullGroup.userData.darkMat as THREE.MeshBasicMaterial;

  const setSkullRef = useCallback((el: THREE.Group | null) => {
    if (el && !skullRef.current) {
      skullRef.current = el;
      el.add(skullGroup);
    }
  }, [skullGroup]);

  const warningStart = VORTEX_TRIGGER - WARNING_LEAD;
  const isWarning = combatTime >= warningStart && combatTime < VORTEX_TRIGGER;
  const isActive = combatTime >= VORTEX_TRIGGER && active;

  // Disc material
  const discMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: COLOR_DARK,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  // Per-particle seed data (stable across frames)
  const seeds = useMemo(() => {
    const s = new Float32Array(PARTICLE_COUNT * 4);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      s[i * 4] = (Math.random() - 0.5) * 2 * ARENA_HALF_W;       // spawn X
      s[i * 4 + 1] = ARENA_MIN_Z + Math.random() * (ARENA_MAX_Z - ARENA_MIN_Z); // spawn Z
      s[i * 4 + 2] = Math.random();                                // phase offset
      s[i * 4 + 3] = 0.6 + Math.random() * 0.8;                   // speed multiplier
    }
    return s;
  }, []);

  // Particle geometry + material
  const particleGeo = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  const particleMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: COLOR_CORE,
        size: 0.15,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  // ── Per-frame ──────────────────────────────────────────────────────────────

  useFrame(() => {
    if (!groupRef.current) return;

    const showAnything = isWarning || isActive;
    if (!showAnything) {
      groupRef.current.visible = false;
      return;
    }
    groupRef.current.visible = true;

    const t = isActive ? combatTime - VORTEX_TRIGGER : 0;
    // Intensity ramps from 0 → 1 over the first 4 s, then keeps growing slowly
    const rampUp = isActive ? Math.min(t / 4, 1) : 0;
    const intensity = isActive ? rampUp + Math.min(t * 0.02, 1) : 0; // grows over time
    const warningProgress = isWarning
      ? (combatTime - warningStart) / WARNING_LEAD
      : 1;

    // ── Ground disc ──────────────────────────────────────────────────────
    if (discRef.current) {
      if (isWarning) {
        const pulse = 0.12 + Math.sin(combatTime * 6) * 0.08;
        discMat.opacity = pulse * warningProgress;
        discRef.current.scale.setScalar(1 + warningProgress * 0.3);
      } else if (isActive) {
        discMat.opacity = 0.2 + Math.sin(combatTime * 3) * 0.06;
        discRef.current.scale.setScalar(1.3 + rampUp * 0.4);
      }
    }

    // ── Skull ─────────────────────────────────────────────────────────────
    if (skullRef.current) {
      const skullAlpha = isActive
        ? 0.6 + Math.sin(combatTime * 3) * 0.15
        : isWarning
          ? warningProgress * 0.3 * (0.5 + Math.sin(combatTime * 5) * 0.5)
          : 0;
      skullMat.opacity = skullAlpha;
      skullDarkMat.opacity = skullAlpha * 1.2;

      const skullScale = isActive
        ? 2.2 + rampUp * 0.3 + Math.sin(combatTime * 2.5) * 0.1
        : 1.5 + warningProgress * 0.7;
      skullRef.current.scale.setScalar(skullScale);
      skullRef.current.rotation.y = Math.sin(combatTime * 0.4) * 0.15;
    }

    // ── Particles ────────────────────────────────────────────────────────
    if (particlesRef.current) {
      const pos = particleGeo.attributes.position as THREE.BufferAttribute;

      // During warning: only a fraction of particles are visible (faint sparks)
      // During active: all particles, growing brighter
      const visibleFrac = isActive ? 1 : warningProgress * 0.15;
      const visibleCount = Math.floor(PARTICLE_COUNT * visibleFrac);

      // Cycle length for each particle (how long before it resets)
      const cycleLen = 3.5;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        if (i >= visibleCount) {
          pos.setXYZ(i, 0, -10, 0); // hide below ground
          continue;
        }

        const sx = seeds[i * 4];
        const sz = seeds[i * 4 + 1];
        const phase = seeds[i * 4 + 2];
        const speed = seeds[i * 4 + 3];

        // Each particle cycles: rises from ground, fades, resets
        const localT = ((combatTime * speed + phase * cycleLen) % cycleLen) / cycleLen;
        const y = localT * (6 + intensity * 6);

        // Slight horizontal drift
        const drift = Math.sin(combatTime * 2 + phase * 20) * 0.4;

        pos.setXYZ(i, sx + drift, y, sz + drift * 0.5);
      }

      pos.needsUpdate = true;

      if (isActive) {
        particleMat.opacity = 0.4 + intensity * 0.35;
        particleMat.size = 0.12 + intensity * 0.12;
      } else {
        particleMat.opacity = 0.25 * warningProgress;
        particleMat.size = 0.1;
      }
    }

    // ── Core light ───────────────────────────────────────────────────────
    if (coreRef.current) {
      if (isActive) {
        coreRef.current.intensity = (3 + Math.sin(combatTime * 4) * 1.5) * rampUp;
      } else if (isWarning) {
        coreRef.current.intensity = warningProgress * (0.4 + Math.sin(combatTime * 8) * 0.4);
      } else {
        coreRef.current.intensity = 0;
      }
    }

    // ── Eruption flash ───────────────────────────────────────────────────
    if (flashRef.current) {
      if (isActive && t < 0.6) {
        flashRef.current.intensity = 25 * (1 - t / 0.6);
      } else {
        flashRef.current.intensity = 0;
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.05, 0]} visible={false}>
      {/* Ground glow */}
      <mesh ref={discRef} geometry={discGeo} material={discMat} />

      {/* Skull emblem */}
      <group ref={setSkullRef} position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} />

      {/* Erupting particles */}
      <points ref={particlesRef} geometry={particleGeo} material={particleMat} />

      {/* Core glow */}
      <pointLight ref={coreRef} color="#a855f7" intensity={0} distance={22} decay={2} position={[0, 1, 0]} />

      {/* Eruption flash */}
      <pointLight ref={flashRef} color="#ffffff" intensity={0} distance={25} decay={2} position={[0, 2, 0]} />
    </group>
  );
}

export const VORTEX_TRIGGER_TIME = VORTEX_TRIGGER;
export const VORTEX_WARNING_LEAD_TIME = WARNING_LEAD;
