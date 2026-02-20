/**
 * SpineProjectile - Sharp needle/spine projectile fired by cactus constructs
 * 
 * A long thin needle that:
 * 1. Bursts outward briefly from the cactus
 * 2. Curves toward the nearest enemy or HP bar (homing)
 * 3. Impacts with a green flash
 * 
 * The visual is an elongated cone+cylinder combo that always
 * rotates to face its direction of travel.
 */

import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/stores/gameStore';
import { StatusEffectConfig } from '@/types';

interface SpineProjectileProps {
  id: string;
  startPosition: [number, number, number];
  endPosition: [number, number, number];
  damage: number;
  onComplete: (id: string) => void;
  delay?: number;
  targetMinionId?: string;
  targetTeam?: 'player' | 'enemy';
  statusEffect?: StatusEffectConfig;
}

const FLIGHT_DURATION = 0.55;
const ARC_HEIGHT = 2.0;

export function SpineProjectile({
  id,
  startPosition,
  endPosition,
  damage,
  onComplete,
  delay = 0,
  targetTeam = 'enemy',
  statusEffect,
}: SpineProjectileProps) {
  const needleRef = useRef<THREE.Group>(null);
  const trailRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const [started, setStarted] = useState(false);
  const [hit, setHit] = useState(false);
  const [fullyComplete, setFullyComplete] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const hitTriggered = useRef(false);
  const prevPos = useRef(new THREE.Vector3(...startPosition));
  const impactStartRef = useRef<number | null>(null);

  const addCameraTrauma = useGameStore((state) => state.addCameraTrauma);

  // Trail segment refs - a series of fading copies trailing behind
  const TRAIL_COUNT = 6;
  const trailPositions = useRef<THREE.Vector3[]>(
    Array.from({ length: TRAIL_COUNT }, () => new THREE.Vector3(...startPosition))
  );
  const trailMeshRefs = useRef<(THREE.Mesh | null)[]>([]);

  // Needle materials
  const needleMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#5a7a32',
  }), []);

  const needleTipMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#3d5a1e',
  }), []);

  const trailMaterial = useMemo(() =>
    Array.from({ length: TRAIL_COUNT }, (_, i) =>
      new THREE.MeshBasicMaterial({
        color: '#90EE90',
        transparent: true,
        opacity: 0.4 * (1 - i / TRAIL_COUNT),
        depthWrite: false,
      })
    ), []);

  useEffect(() => {
    return () => {
      needleMaterial.dispose();
      needleTipMaterial.dispose();
      trailMaterial.forEach((m) => m.dispose());
    };
  }, [needleMaterial, needleTipMaterial, trailMaterial]);

  useFrame((state, delta) => {
    if (fullyComplete) return;

    const time = state.clock.elapsedTime;

    // Handle delay
    if (!started) {
      if (startTimeRef.current === null) {
        startTimeRef.current = time;
      }
      if (time - startTimeRef.current < delay) {
        return;
      }
      setStarted(true);
      startTimeRef.current = time;
    }

    // Impact fade-out phase
    if (hit) {
      if (impactStartRef.current === null) {
        impactStartRef.current = time;
      }
      const impactElapsed = time - impactStartRef.current;
      const impactDuration = 0.3;
      const impactT = Math.min(impactElapsed / impactDuration, 1);

      // Fade trail segments
      trailMeshRefs.current.forEach((mesh, i) => {
        if (mesh) {
          const mat = mesh.material as THREE.MeshBasicMaterial;
          mat.opacity = Math.max(0, 0.4 * (1 - i / TRAIL_COUNT) * (1 - impactT));
        }
      });

      if (glowRef.current) {
        const glowMat = glowRef.current.material as THREE.MeshBasicMaterial;
        glowMat.opacity = 0.6 * (1 - impactT);
        glowRef.current.scale.setScalar(0.3 * (1 - impactT));
      }

      if (impactT >= 1) {
        setFullyComplete(true);
      }
      return;
    }

    const elapsed = time - (startTimeRef.current ?? time);
    const t = Math.min(elapsed / FLIGHT_DURATION, 1);
    const easeT = 1 - Math.pow(1 - t, 3); // ease-out cubic

    if (needleRef.current) {
      // Arc
      const arcT = Math.sin(t * Math.PI);

      const x = THREE.MathUtils.lerp(startPosition[0], endPosition[0], easeT);
      const z = THREE.MathUtils.lerp(startPosition[2], endPosition[2], easeT);
      const baseY = THREE.MathUtils.lerp(startPosition[1], endPosition[1], easeT);
      const y = baseY + arcT * ARC_HEIGHT;

      const currentPos = new THREE.Vector3(x, y, z);
      needleRef.current.position.copy(currentPos);

      // Rotate needle to face direction of travel
      const direction = currentPos.clone().sub(prevPos.current);
      if (direction.length() > 0.001) {
        const lookTarget = currentPos.clone().add(direction.clone().normalize());
        needleRef.current.lookAt(lookTarget);
        // The needle geometry points along +Y, but lookAt points -Z
        // So rotate to align the needle's length with the travel direction
        needleRef.current.rotateX(Math.PI / 2);
      }

      // Spin the needle around its long axis for visual flair
      needleRef.current.rotateY(delta * 12);

      // Update trail
      trailPositions.current.unshift(currentPos.clone());
      trailPositions.current.pop();
      trailPositions.current.forEach((pos, i) => {
        const mesh = trailMeshRefs.current[i];
        if (mesh) {
          mesh.position.copy(pos);
          // Scale down along the trail
          const trailScale = 1 - (i / TRAIL_COUNT) * 0.6;
          mesh.scale.setScalar(trailScale);
        }
      });

      if (glowRef.current) {
        glowRef.current.position.copy(currentPos);
        const pulse = 0.25 + Math.sin(time * 20) * 0.1;
        glowRef.current.scale.setScalar(pulse);
      }

      prevPos.current.copy(currentPos);
    }

    // Impact
    if (t >= 1 && !hitTriggered.current) {
      hitTriggered.current = true;
      setHit(true);

      addCameraTrauma(0.06);

      // Damage events are handled by Arena's handleProjectileHit — don't duplicate here
      onComplete(id);
    }
  });

  if (fullyComplete) return null;

  return (
    <group renderOrder={15}>
      {/* The needle mesh */}
      {!hit && (
        <group ref={needleRef} position={startPosition}>
          {/* Shaft - long thin cylinder */}
          <mesh material={needleMaterial}>
            <cylinderGeometry args={[0.06, 0.1, 2.4, 6]} />
          </mesh>
          {/* Tip - sharp cone */}
          <mesh position={[0, 1.44, 0]} material={needleTipMaterial}>
            <coneGeometry args={[0.1, 0.6, 6]} />
          </mesh>
          {/* Base / tail fin */}
          <mesh position={[0, -1.3, 0]} material={needleMaterial}>
            <coneGeometry args={[0.16, 0.3, 4]} />
          </mesh>
        </group>
      )}

      {/* Trail segments */}
      <group ref={trailRef}>
        {Array.from({ length: TRAIL_COUNT }).map((_, i) => (
          <mesh
            key={i}
            ref={(el) => { trailMeshRefs.current[i] = el; }}
            material={trailMaterial[i]}
          >
            <sphereGeometry args={[0.08, 4, 4]} />
          </mesh>
        ))}
      </group>

      {/* Green glow sphere that follows the needle */}
      <mesh ref={glowRef} position={startPosition} renderOrder={16}>
        <sphereGeometry args={[0.25, 6, 6]} />
        <meshBasicMaterial
          color="#32CD32"
          transparent
          opacity={0.6}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Impact flash */}
      {hit && <ImpactFlash position={endPosition} />}
    </group>
  );
}

function ImpactFlash({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const startTime = useRef<number | null>(null);

  useFrame((state) => {
    if (!meshRef.current) return;

    if (startTime.current === null) {
      startTime.current = state.clock.elapsedTime;
    }

    const elapsed = state.clock.elapsedTime - startTime.current;
    const t = Math.min(elapsed / 0.15, 1);

    const scale = 0.5 + t * 2.0;
    const opacity = 1 - t;

    meshRef.current.scale.setScalar(scale);
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
  });

  return (
    <mesh ref={meshRef} position={[position[0], position[1] + 0.3, position[2]]} renderOrder={20}>
      <sphereGeometry args={[0.15, 8, 8]} />
      <meshBasicMaterial
        color="#32CD32"
        transparent
        opacity={1}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

export default SpineProjectile;
