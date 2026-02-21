/**
 * LowPolyCactus — Procedural low-poly puffer cactus in a terracotta pot.
 *
 * Based on docs/cactus.md:
 * - Pot: CylinderGeometry terracotta with dirt cap
 * - Body: IcosahedronGeometry(1,1) with green flatShading
 * - Flower: Center icosahedron + 6 petal icosahedrons on top
 * - Spikes: ConeGeometry at each body vertex, pointing outward
 * - Swell animation when attacking (scale up, turn red, shake)
 * - Idle breathing
 * - Damage flash: emissive pulse
 */

import { useRef, useMemo, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createToonMaterial } from '@/shaders/ToonMaterials';

// Shared geometry
const potGeo = new THREE.CylinderGeometry(1.2, 1.0, 1.5, 8);
const dirtGeo = new THREE.CylinderGeometry(1.1, 1.0, 0.1, 8);
const bodyGeo = new THREE.IcosahedronGeometry(1.0, 1);

const spikeGeo = (() => {
  const g = new THREE.ConeGeometry(0.05, 0.4, 4);
  g.translate(0, 0.2, 0);
  g.rotateX(Math.PI / 2);
  return g;
})();

const flowerCenterGeo = new THREE.IcosahedronGeometry(0.15, 0);
const flowerPetalGeo = new THREE.IcosahedronGeometry(0.12, 0);

const BASE_SCALE = 1.5;

// Pre-compute spike directions from body geometry vertices
const spikeData: { position: THREE.Vector3; direction: THREE.Vector3 }[] = (() => {
  const posAttr = bodyGeo.attributes.position;
  const seen = new Map<string, boolean>();
  const result: { position: THREE.Vector3; direction: THREE.Vector3 }[] = [];

  // Flower position for exclusion
  const flowerPos = new THREE.Vector3(0.4, 0.85, 0.3);

  for (let i = 0; i < posAttr.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(posAttr, i);
    // Deduplicate close vertices
    const key = `${Math.round(v.x * 100)},${Math.round(v.y * 100)},${Math.round(v.z * 100)}`;
    if (seen.has(key)) continue;
    seen.set(key, true);

    if (v.distanceTo(flowerPos) < 0.45) continue;

    result.push({
      position: v.clone(),
      direction: v.clone().normalize(),
    });
  }
  return result;
})();

interface LowPolyCactusProps {
  team: 'player' | 'enemy';
  isDamaged?: boolean;
  state?: string;
  /** 0..1 swell progress for attack animation (static value, only updates on re-render) */
  swellAmount?: number;
  /** Ref alternative for swellAmount — read every frame without requiring re-renders */
  swellRef?: MutableRefObject<number>;
}

export function LowPolyCactus({
  team,
  isDamaged,
  state,
  swellAmount = 0,
  swellRef,
}: LowPolyCactusProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const damageFlash = useRef(0);
  const prevDamaged = useRef(false);

  const isPlayer = team === 'player';

  const materials = useMemo(() => ({
    pot: createToonMaterial({ color: '#e2725b', bands: 3 }),
    dirt: createToonMaterial({ color: '#3e2723', bands: 2 }),
    cactus: createToonMaterial({ color: '#66bb6a', bands: 3 }),
    spike: createToonMaterial({ color: '#fff9c4', bands: 3 }),
    flowerCenter: createToonMaterial({ color: '#ffeb3b', bands: 3 }),
    flowerPetal: createToonMaterial({
      color: isPlayer ? '#ff69b4' : '#ff4444',
      bands: 3,
    }),
  }), [isPlayer]);

  const colorGreen = useMemo(() => new THREE.Color(0x66bb6a), []);
  const colorRed = useMemo(() => new THREE.Color(0xff1111), []);

  useFrame((_, delta) => {
    const group = groupRef.current;
    const body = bodyRef.current;
    if (!group || !body) return;

    const t = _.clock.elapsedTime;

    // Damage flash
    if (isDamaged && !prevDamaged.current) {
      damageFlash.current = 1;
    }
    prevDamaged.current = !!isDamaged;

    if (damageFlash.current > 0) {
      damageFlash.current -= delta * 5;
      materials.cactus.emissiveIntensity = damageFlash.current * 2;
      materials.cactus.emissive.setHex(0xffffff);
    } else {
      materials.cactus.emissiveIntensity = 0;
      materials.cactus.emissive.setHex(0x000000);
    }

    // Swell / breathing animation
    const swell = swellRef ? swellRef.current : swellAmount;
    if (swell > 0) {
      const scale = 1 + swell * 0.5;
      body.scale.setScalar(scale);
      const shake = 0.05 * swell;
      body.position.x = (Math.random() - 0.5) * shake;
      body.position.z = (Math.random() - 0.5) * shake;
      materials.cactus.color.copy(colorGreen).lerp(colorRed, swell);
    } else {
      const breath = 1 + Math.sin(t * 2) * 0.02;
      body.scale.setScalar(breath);
      body.position.x = 0;
      body.position.z = 0;
      materials.cactus.color.copy(colorGreen);
    }

    group.scale.setScalar(BASE_SCALE);
  });

  const yRotation = isPlayer ? 0 : Math.PI;

  return (
    <group ref={groupRef} scale={BASE_SCALE} rotation={[0, yRotation, 0]}>
      {/* Pot */}
      <mesh geometry={potGeo} material={materials.pot} position={[0, 0.75, 0]} castShadow receiveShadow />

      {/* Dirt */}
      <mesh geometry={dirtGeo} material={materials.dirt} position={[0, 1.4, 0]} />

      {/* Cactus body */}
      <group position={[0, 1.5, 0]}>
        <mesh ref={bodyRef} geometry={bodyGeo} material={materials.cactus} castShadow>
          {/* Flower */}
          <group position={[0.4, 0.85, 0.3]} rotation={[0.4, 0, -0.4]}>
            <mesh geometry={flowerCenterGeo} material={materials.flowerCenter} />
            {Array.from({ length: 6 }).map((_, i) => (
              <group key={`petal-${i}`} rotation={[0, (i / 6) * Math.PI * 2, 0]}>
                <mesh
                  geometry={flowerPetalGeo}
                  material={materials.flowerPetal}
                  position={[0, 0, 0.22]}
                  scale={[1, 0.4, 2.2]}
                  rotation={[-0.15, 0, 0]}
                />
              </group>
            ))}
          </group>

          {/* Spikes */}
          {spikeData.map((spike, i) => {
            const q = new THREE.Quaternion();
            const up = new THREE.Vector3(0, 0, 1);
            q.setFromUnitVectors(up, spike.direction);
            return (
              <mesh
                key={`spike-${i}`}
                geometry={spikeGeo}
                material={materials.spike}
                position={spike.position}
                quaternion={q}
                scale={[0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4]}
              />
            );
          })}
        </mesh>
      </group>

      {/* Ground glow */}
      <pointLight
        position={[0, 0.3, 0]}
        color={isPlayer ? '#32CD32' : '#ff4444'}
        intensity={1.2}
        distance={4}
        decay={2}
      />
    </group>
  );
}

export default LowPolyCactus;
