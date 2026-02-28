/**
 * LowPolyMagmaOoze — Molten slime on fire.
 *
 * Same blob shape as LowPolySlime but with:
 * - Molten orange/red body with pulsing lava emissive
 * - Bright ember eyes instead of black pupils
 * - Fire particles rising off the body (simple animated spheres)
 * - Flickering point light for environmental glow
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createToonMaterial } from '@/shaders/ToonMaterials';

const bodyGeo = (() => {
  const g = new THREE.IcosahedronGeometry(1, 1);
  g.translate(0, 1, 0);

  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const heightFactor = Math.max(0, 1.2 - y);
    const widen = 1 + heightFactor * 0.6;

    pos.setXYZ(i, x * widen, y, z * widen);
  }
  g.computeVertexNormals();
  return g;
})();

const eyeBaseGeo = new THREE.CircleGeometry(0.22, 8);
const highlightMainGeo = new THREE.CircleGeometry(0.07, 8);
const highlightSecGeo = new THREE.CircleGeometry(0.03, 8);

const FIRE_PARTICLE_COUNT = 8;
const fireParticleGeo = new THREE.IcosahedronGeometry(0.08, 0);

const BASE_SCALE = 1.5;

interface LowPolyMagmaOozeProps {
  team: 'player' | 'enemy';
  isDamaged?: boolean;
  state?: string;
}

export function LowPolyMagmaOoze({ team, isDamaged, state }: LowPolyMagmaOozeProps) {
  const bodyRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Group>(null);
  const rightEyeRef = useRef<THREE.Group>(null);
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const fireRefs = useRef<(THREE.Mesh | null)[]>([]);

  const blinkTimer = useRef(Math.random() * 3 + 2);
  const damageFlash = useRef(0);
  const prevDamaged = useRef(false);

  const fireSeeds = useMemo(
    () =>
      Array.from({ length: FIRE_PARTICLE_COUNT }, () => ({
        angle: Math.random() * Math.PI * 2,
        radius: 0.3 + Math.random() * 0.5,
        speed: 1.5 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        yOffset: Math.random() * 0.5,
      })),
    [],
  );

  const bodyMat = useMemo(
    () =>
      createToonMaterial({
        color: '#FF4500',
        bands: 3,
        emissive: '#FF6347',
        emissiveIntensity: 0.6,
      }),
    [],
  );

  const eyeEmberMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({ color: 0xffff00 }),
    [],
  );

  const eyeCoreMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    [],
  );

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

  useFrame((_, delta) => {
    const body = bodyRef.current;
    const leftEye = leftEyeRef.current;
    const rightEye = rightEyeRef.current;
    const group = groupRef.current;
    if (!body || !leftEye || !rightEye || !group) return;

    const t = _.clock.elapsedTime;

    // Damage flash
    if (isDamaged && !prevDamaged.current) {
      damageFlash.current = 1;
    }
    prevDamaged.current = !!isDamaged;

    if (damageFlash.current > 0) {
      damageFlash.current -= delta * 5;
      bodyMat.emissiveIntensity = 0.6 + damageFlash.current * 2;
      bodyMat.emissive.setHex(0xffffff);
    } else {
      const pulse = 0.6 + Math.sin(t * 4) * 0.15 + Math.sin(t * 7.3) * 0.1;
      bodyMat.emissiveIntensity = pulse;
      bodyMat.emissive.setHex(0xff6347);
    }

    // Flicker the point light like fire
    if (lightRef.current) {
      lightRef.current.intensity =
        1.5 + Math.sin(t * 10) * 0.3 + Math.sin(t * 23) * 0.15;
    }

    // Blink
    blinkTimer.current -= delta;
    if (blinkTimer.current <= 0) {
      leftEye.scale.y = 0.1;
      rightEye.scale.y = 0.1;
      if (blinkTimer.current <= -0.15) {
        leftEye.scale.y = 1;
        rightEye.scale.y = 1;
        blinkTimer.current = Math.random() * 3 + 2;
      }
    }

    // Idle breathing
    const breathY = 1 + Math.sin(t * 3) * 0.06;
    const breathXZ = 1 - Math.sin(t * 3) * 0.04;

    let attackScale = 1;
    if (state === 'attacking') {
      attackScale = 1 + Math.sin(t * 20) * 0.15;
    }

    body.scale.set(
      breathXZ * attackScale,
      breathY * attackScale,
      breathXZ * attackScale,
    );

    // Animate fire particles — rise and loop
    for (let i = 0; i < FIRE_PARTICLE_COUNT; i++) {
      const mesh = fireRefs.current[i];
      if (!mesh) continue;

      const seed = fireSeeds[i];
      const life = ((t * seed.speed + seed.phase) % 2) / 2; // 0→1 loop

      const px = Math.cos(seed.angle + t * 0.5) * seed.radius;
      const py = 0.5 + seed.yOffset + life * 2.0;
      const pz = Math.sin(seed.angle + t * 0.5) * seed.radius;

      mesh.position.set(px, py, pz);

      const sc = (1 - life) * 0.6 + 0.2;
      mesh.scale.setScalar(sc);

      fireMats[i].opacity = (1 - life) * 0.85;

      // Color shift: orange → yellow → transparent as it rises
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
      {/* Body */}
      <mesh ref={bodyRef} geometry={bodyGeo} material={bodyMat} castShadow />

      {/* Eyes — ember-colored */}
      <group position={[0, 1.15, 0.93]}>
        <group ref={leftEyeRef} position={[-0.35, 0, 0]}>
          <mesh geometry={eyeBaseGeo} material={eyeEmberMat} />
          <mesh geometry={highlightMainGeo} material={eyeCoreMat} position={[0.08, 0.08, 0.01]} />
          <mesh geometry={highlightSecGeo} material={eyeCoreMat} position={[-0.08, -0.08, 0.01]} />
        </group>
        <group ref={rightEyeRef} position={[0.35, 0, 0]}>
          <mesh geometry={eyeBaseGeo} material={eyeEmberMat} />
          <mesh geometry={highlightMainGeo} material={eyeCoreMat} position={[0.08, 0.08, 0.01]} />
          <mesh geometry={highlightSecGeo} material={eyeCoreMat} position={[-0.08, -0.08, 0.01]} />
        </group>
      </group>

      {/* Fire particles rising off body */}
      {fireMats.map((mat, i) => (
        <mesh
          key={i}
          ref={(el) => { fireRefs.current[i] = el; }}
          geometry={fireParticleGeo}
          material={mat}
        />
      ))}

      {/* Molten ground glow — flickering */}
      <pointLight
        ref={lightRef}
        position={[0, 0.3, 0]}
        color="#FF4500"
        intensity={1.5}
        distance={5}
        decay={2}
      />
    </group>
  );
}

export default LowPolyMagmaOoze;
