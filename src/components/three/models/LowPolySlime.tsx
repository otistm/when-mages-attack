/**
 * LowPolySlime — Procedural low-poly slime built from IcosahedronGeometry.
 *
 * Based on docs/slime.md:
 * - Body: IcosahedronGeometry(1,1) with widened base, green flatShading material
 * - Eyes: Flat circle pupils + white highlights on the front face
 * - Idle breathing: Y scale oscillates, XZ inverse
 * - Blink: eyes squash shut briefly every few seconds
 * - Damage flash: emissive pulse on hit
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createToonMaterial } from '@/shaders/ToonMaterials';

// Shared geometry — created once, reused across all slime instances
const bodyGeo = (() => {
  const g = new THREE.IcosahedronGeometry(1, 1);
  g.translate(0, 1, 0);

  // Widen the base for a blob-like shape (per doc)
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    const y = pos.getY(i);
    let z = pos.getZ(i);

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

const BASE_SCALE = 1.5;

interface LowPolySlimeProps {
  team: 'player' | 'enemy';
  isDamaged?: boolean;
  state?: string;
}

export function LowPolySlime({ team, isDamaged, state }: LowPolySlimeProps) {
  const bodyRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Group>(null);
  const rightEyeRef = useRef<THREE.Group>(null);
  const groupRef = useRef<THREE.Group>(null);

  const blinkTimer = useRef(Math.random() * 3 + 2);
  const damageFlash = useRef(0);
  const prevDamaged = useRef(false);

  const teamEmissive = team === 'player' ? '#2e7d32' : '#7d2e2e';

  const bodyMat = useMemo(
    () =>
      createToonMaterial({
        color: team === 'player' ? '#76ff03' : '#ff4444',
        bands: 3,
        emissive: teamEmissive,
        emissiveIntensity: 0.2,
      }),
    [team, teamEmissive],
  );

  const eyePupilMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0x000000 }),
    [],
  );

  const eyeWhiteMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0xffffff }),
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
      bodyMat.emissiveIntensity = 0.2 + damageFlash.current * 2;
      bodyMat.emissive.setHex(0xffffff);
    } else {
      bodyMat.emissiveIntensity = 0.2;
      bodyMat.emissive.setHex(team === 'player' ? 0x2e7d32 : 0x7d2e2e);
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

    // Attack punch — quick scale spike
    let attackScale = 1;
    if (state === 'attacking') {
      attackScale = 1 + Math.sin(t * 20) * 0.15;
    }

    body.scale.set(
      breathXZ * attackScale,
      breathY * attackScale,
      breathXZ * attackScale,
    );

    group.scale.setScalar(BASE_SCALE);
  });

  const yRotation = team === 'player' ? 0 : Math.PI;

  return (
    <group ref={groupRef} scale={BASE_SCALE} rotation={[0, yRotation, 0]}>
      {/* Body */}
      <mesh ref={bodyRef} geometry={bodyGeo} material={bodyMat} castShadow />

      {/* Eyes container — positioned on the front face */}
      <group position={[0, 1.15, 0.93]}>
        {/* Left eye */}
        <group ref={leftEyeRef} position={[-0.35, 0, 0]}>
          <mesh geometry={eyeBaseGeo} material={eyePupilMat} />
          <mesh geometry={highlightMainGeo} material={eyeWhiteMat} position={[0.08, 0.08, 0.01]} />
          <mesh geometry={highlightSecGeo} material={eyeWhiteMat} position={[-0.08, -0.08, 0.01]} />
        </group>
        {/* Right eye */}
        <group ref={rightEyeRef} position={[0.35, 0, 0]}>
          <mesh geometry={eyeBaseGeo} material={eyePupilMat} />
          <mesh geometry={highlightMainGeo} material={eyeWhiteMat} position={[0.08, 0.08, 0.01]} />
          <mesh geometry={highlightSecGeo} material={eyeWhiteMat} position={[-0.08, -0.08, 0.01]} />
        </group>
      </group>

      {/* Subtle ground glow */}
      <pointLight
        position={[0, 0.3, 0]}
        color={team === 'player' ? '#76ff03' : '#ff4444'}
        intensity={0.8}
        distance={3}
        decay={2}
      />
    </group>
  );
}

export default LowPolySlime;
