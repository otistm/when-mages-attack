/**
 * LowPolyBattery — Procedural low-poly AA battery with electrical effects.
 *
 * Based on docs/battery.md:
 * - Body: Low-poly cylinders along X axis (casing, copper label, terminals)
 * - Lightning arcs: Line meshes with jagged paths from surface to ground
 * - Glow: PointLight with flicker
 * - Idle: Gentle roll rotation on X axis
 * - Damage flash: emissive pulse
 */

import { useRef, useMemo, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SEGMENTS = 8;
const BATTERY_RADIUS = 0.6;
const BATTERY_LENGTH = 3;
const BOLT_COUNT = 6;
const BOLT_SEGMENTS = 6;

const BASE_SCALE = 1.2;

interface LowPolyBatteryProps {
  team: 'player' | 'enemy';
  isDamaged?: boolean;
  state?: string;
  /** Mutable ref holding the roll angle. When provided, overrides idle oscillation. */
  rollAngleRef?: RefObject<number>;
  /** When true, the model skips its own Y-rotation (parent handles facing). */
  skipYRotation?: boolean;
}

export function LowPolyBattery({
  team,
  isDamaged,
  rollAngleRef,
  skipYRotation = false,
}: LowPolyBatteryProps) {
  const groupRef = useRef<THREE.Group>(null);
  const batteryRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const damageFlash = useRef(0);
  const prevDamaged = useRef(false);

  const isPlayer = team === 'player';
  const electricColor = isPlayer ? 0x00ffff : 0xff4444;

  const geos = useMemo(() => {
    const makeOrientedCylinder = (radius: number, length: number) => {
      const g = new THREE.CylinderGeometry(radius, radius, length, SEGMENTS);
      g.rotateZ(-Math.PI / 2);
      return g;
    };

    return {
      body: makeOrientedCylinder(BATTERY_RADIUS, BATTERY_LENGTH),
      label: makeOrientedCylinder(BATTERY_RADIUS + 0.01, 1.5),
      terminalPos: makeOrientedCylinder(BATTERY_RADIUS, 0.2),
      nipple: makeOrientedCylinder(0.2, 0.2),
      terminalNeg: makeOrientedCylinder(BATTERY_RADIUS, 0.2),
    };
  }, []);

  const materials = useMemo(() => ({
    metal: new THREE.MeshStandardMaterial({
      color: 0xaaaaaa, roughness: 0.3, metalness: 0.9, flatShading: true,
    }),
    body: new THREE.MeshStandardMaterial({
      color: 0x111111, roughness: 0.7, metalness: 0.2, flatShading: true,
    }),
    label: new THREE.MeshStandardMaterial({
      color: 0xffaa00, roughness: 0.5, metalness: 0.4, flatShading: true,
    }),
  }), []);

  // Lightning bolt line objects
  const bolts = useMemo(() => {
    const lightningMat = new THREE.LineBasicMaterial({
      color: electricColor,
      transparent: true,
      opacity: 0.9,
    });

    return Array.from({ length: BOLT_COUNT }, () => {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(BOLT_SEGMENTS * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const line = new THREE.Line(geo, lightningMat.clone());
      line.frustumCulled = false;
      line.visible = false;
      return line;
    });
  }, [electricColor]);

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    const battery = batteryRef.current;
    if (!group || !battery) return;

    const t = clock.elapsedTime;

    // Damage flash
    if (isDamaged && !prevDamaged.current) {
      damageFlash.current = 1;
    }
    prevDamaged.current = !!isDamaged;

    if (damageFlash.current > 0) {
      damageFlash.current -= delta * 5;
      materials.body.emissiveIntensity = damageFlash.current * 2;
      materials.body.emissive.setHex(0xffffff);
    } else {
      materials.body.emissiveIntensity = 0;
      materials.body.emissive.setHex(0x000000);
    }

    if (rollAngleRef && rollAngleRef.current !== null) {
      battery.rotation.x = rollAngleRef.current;
    } else {
      battery.rotation.x = Math.sin(t * 1.5) * 0.15;
    }

    // Glow flicker
    if (glowRef.current) {
      glowRef.current.intensity = 3 + Math.random() * 4;
    }

    // Update lightning arcs
    bolts.forEach((bolt) => {
      if (Math.random() > 0.4) {
        bolt.visible = false;
        return;
      }
      bolt.visible = true;

      const positions = bolt.geometry.attributes.position.array as Float32Array;
      const startX = (Math.random() - 0.5) * BATTERY_LENGTH;
      const angle = Math.random() * Math.PI * 2;
      const startY = Math.sin(angle) * BATTERY_RADIUS;
      const startZ = Math.cos(angle) * BATTERY_RADIUS;

      const endX = startX + (Math.random() - 0.5) * 2;
      const endY = -BATTERY_RADIUS * 1.5;
      const endZ = startZ + (Math.random() - 0.5) * 2;

      for (let j = 0; j < BOLT_SEGMENTS; j++) {
        const frac = j / (BOLT_SEGMENTS - 1);
        let x = startX + (endX - startX) * frac;
        let y = startY + (endY - startY) * frac;
        let z = startZ + (endZ - startZ) * frac;

        if (j > 0 && j < BOLT_SEGMENTS - 1) {
          x += (Math.random() - 0.5) * 0.5;
          y += (Math.random() - 0.5) * 0.5;
          z += (Math.random() - 0.5) * 0.5;
        }

        positions[j * 3] = x;
        positions[j * 3 + 1] = y;
        positions[j * 3 + 2] = z;
      }
      bolt.geometry.attributes.position.needsUpdate = true;
    });

    group.scale.setScalar(BASE_SCALE);
  });

  const yRotation = skipYRotation ? 0 : (isPlayer ? 0 : Math.PI);

  return (
    <group ref={groupRef} scale={BASE_SCALE} rotation={[0, yRotation, 0]}>
      <group ref={batteryRef} position={[0, BATTERY_RADIUS, 0]}>
        {/* Main Casing */}
        <mesh geometry={geos.body} material={materials.body} castShadow />

        {/* Copper Label */}
        <mesh geometry={geos.label} material={materials.label} position={[-0.5, 0, 0]} />

        {/* Positive Terminal (Right) */}
        <mesh geometry={geos.terminalPos} material={materials.metal} position={[1.5, 0, 0]} />
        <mesh geometry={geos.nipple} material={materials.metal} position={[1.65, 0, 0]} />

        {/* Negative Terminal (Left) */}
        <mesh geometry={geos.terminalNeg} material={materials.metal} position={[-1.5, 0, 0]} />

        {/* Lightning arcs */}
        {bolts.map((bolt, i) => (
          <primitive key={`bolt-${i}`} object={bolt} />
        ))}

        {/* Electric glow */}
        <pointLight
          ref={glowRef}
          color={electricColor}
          intensity={5}
          distance={15}
        />
      </group>

      {/* Ground glow */}
      <pointLight
        position={[0, 0.2, 0]}
        color={electricColor}
        intensity={1}
        distance={4}
        decay={2}
      />
    </group>
  );
}

export default LowPolyBattery;
