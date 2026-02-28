/**
 * ArenaMage - Rotating glistening jewel that represents each team's HP.
 *
 * Faceted octahedron with MeshPhysicalMaterial (clearcoat + metalness)
 * for specular sparkle as it rotates under scene lights.
 * Shatters into triangular shards when HP reaches zero.
 */

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/stores/gameStore';
import { ARENA, StatusEffectType } from '@/types';
import { STATUS_PRIORITY } from '@/data/constants';

// ---------------------------------------------------------------------------
// Geometry — elongated octahedron (classic gem / diamond silhouette)
// ---------------------------------------------------------------------------
function createJewelGeometry(): THREE.BufferGeometry {
  const geo = new THREE.OctahedronGeometry(0.85, 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, pos.getY(i) * 1.4);
  }
  geo.computeVertexNormals();
  return geo;
}

const jewelGeo = createJewelGeometry();

// ---------------------------------------------------------------------------
// Status-effect emissive colour look-up
// ---------------------------------------------------------------------------
const STATUS_EMISSIVE: Record<StatusEffectType, string> = {
  burn: '#ff6600',
  shocked: '#ffdd00',
  freeze: '#66ddff',
  poison: '#44ff44',
  blighted: '#aa44ff',
};

// ---------------------------------------------------------------------------
// Shard helpers (used when the jewel explodes)
// ---------------------------------------------------------------------------
interface ShardData {
  geometry: THREE.BufferGeometry;
  center: THREE.Vector3;
  velocity: THREE.Vector3;
  angVelX: number;
  angVelY: number;
  angVelZ: number;
}

function generateShards(src: THREE.BufferGeometry): ShardData[] {
  const nonIndexed = src.index ? src.toNonIndexed() : src;
  const pos = nonIndexed.attributes.position as THREE.BufferAttribute;
  const faceCount = pos.count / 3;
  const shards: ShardData[] = [];

  for (let f = 0; f < faceCount; f++) {
    const base = f * 3;
    const v0 = new THREE.Vector3(pos.getX(base), pos.getY(base), pos.getZ(base));
    const v1 = new THREE.Vector3(pos.getX(base + 1), pos.getY(base + 1), pos.getZ(base + 1));
    const v2 = new THREE.Vector3(pos.getX(base + 2), pos.getY(base + 2), pos.getZ(base + 2));

    const center = new THREE.Vector3().add(v0).add(v1).add(v2).divideScalar(3);

    const verts = new Float32Array([
      v0.x - center.x, v0.y - center.y, v0.z - center.z,
      v1.x - center.x, v1.y - center.y, v1.z - center.z,
      v2.x - center.x, v2.y - center.y, v2.z - center.z,
    ]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    g.computeVertexNormals();

    const dir = center.clone().normalize();
    const speed = 3 + Math.random() * 5;
    const velocity = new THREE.Vector3(
      dir.x * speed + (Math.random() - 0.5) * 2,
      Math.abs(dir.y) * 3 + Math.random() * 5 + 2,
      dir.z * speed + (Math.random() - 0.5) * 2,
    );

    shards.push({
      geometry: g,
      center,
      velocity,
      angVelX: (Math.random() - 0.5) * 14,
      angVelY: (Math.random() - 0.5) * 14,
      angVelZ: (Math.random() - 0.5) * 14,
    });
  }
  return shards;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface ArenaMageProps {
  side: 'player' | 'enemy';
}

export function ArenaMage({ side }: ArenaMageProps) {
  const player = useGameStore((s) => s.player);
  const enemy = useGameStore((s) => s.enemy);
  const addCameraTrauma = useGameStore((s) => s.addCameraTrauma);
  const data = side === 'player' ? player : enemy;

  const [shattered, setShattered] = useState(false);
  const [shards, setShards] = useState<ShardData[] | null>(null);
  const prevHealthRef = useRef(data.health);

  const isPlayer = side === 'player';
  const baseColor = isPlayer ? '#4ade80' : '#f87171';
  const zPosition = isPlayer ? ARENA.playerThroneZ : ARENA.enemyThroneZ;

  // Transition from alive → dead
  useEffect(() => {
    if (data.health <= 0 && prevHealthRef.current > 0 && !shattered) {
      setShattered(true);
      setShards(generateShards(jewelGeo));
      addCameraTrauma(0.5);
    }
    prevHealthRef.current = data.health;
  }, [data.health, shattered, addCameraTrauma]);

  // Reset on arena restart (health restored)
  useEffect(() => {
    if (data.health > 0 && shattered) {
      setShattered(false);
      setShards(null);
    }
  }, [data.health, shattered]);

  if (shattered && shards) {
    return (
      <group position={[0, 1.5, zPosition]}>
        <JewelShatter shards={shards} color={baseColor} />
      </group>
    );
  }

  return (
    <group position={[0, 1.5, zPosition]}>
      <Jewel side={side} data={data} baseColor={baseColor} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Intact jewel — rotating, glistening, reactive
// ---------------------------------------------------------------------------
interface JewelProps {
  side: 'player' | 'enemy';
  data: { health: number; maxHealth: number; statusEffects: StatusEffectType[] };
  baseColor: string;
}

function Jewel({ side, data, baseColor }: JewelProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const damageFlash = useRef(0);
  const prevHealthRef = useRef(data.health);

  const activeStatus = useMemo<StatusEffectType | null>(
    () => STATUS_PRIORITY.find((s) => data.statusEffects.includes(s)) ?? null,
    [data.statusEffects],
  );

  const isPlayer = side === 'player';
  const baseEmissive = isPlayer ? '#1a5e28' : '#5e1a1a';

  const mat = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(baseColor),
      metalness: 0.35,
      roughness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      reflectivity: 1.0,
      emissive: new THREE.Color(baseEmissive),
      emissiveIntensity: 0.3,
    });
  }, [baseColor, baseEmissive]);

  useEffect(() => {
    if (data.health < prevHealthRef.current) {
      damageFlash.current = 1;
    }
    prevHealthRef.current = data.health;
  }, [data.health]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;

    // Slow rotation
    meshRef.current.rotation.y += delta * 0.6;

    // Gentle float
    meshRef.current.position.y = Math.sin(t * 1.5) * 0.12;

    // Damage flash
    if (damageFlash.current > 0) {
      damageFlash.current = Math.max(0, damageFlash.current - delta * 3.5);
      mat.emissiveIntensity = 0.3 + damageFlash.current * 3;
      mat.emissive.set('#ffffff');
    } else {
      const statusHex = activeStatus ? STATUS_EMISSIVE[activeStatus] : baseEmissive;
      const pulse = activeStatus
        ? 0.3 + Math.sin(t * 4) * 0.15
        : 0.3 + Math.sin(t * 2) * 0.08;
      mat.emissiveIntensity = pulse;
      mat.emissive.set(statusHex);
    }
  });

  return (
    <>
      <mesh ref={meshRef} geometry={jewelGeo} material={mat} castShadow />
      <pointLight
        position={[0, -0.3, 0]}
        color={baseColor}
        intensity={1.2}
        distance={8}
        decay={2}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Shatter animation — triangular shards fly outward then fade
// ---------------------------------------------------------------------------
const SHATTER_DURATION = 2.2;
const GRAVITY = -14;

function JewelShatter({ shards, color }: { shards: ShardData[]; color: string }) {
  const elapsed = useRef(0);
  const flashRef = useRef<THREE.PointLight>(null);
  const shardRefs = useRef<(THREE.Mesh | null)[]>([]);

  const setShardRef = useCallback(
    (index: number) => (el: THREE.Mesh | null) => {
      shardRefs.current[index] = el;
    },
    [],
  );

  const mat = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      metalness: 0.5,
      roughness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 3,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
    });
  }, [color]);

  useFrame((_, delta) => {
    elapsed.current += delta;
    const t = elapsed.current;
    if (t > SHATTER_DURATION) return;

    // Flash
    if (flashRef.current) {
      flashRef.current.intensity = Math.max(0, 20 * (1 - t * 3));
    }

    // Emissive fade
    mat.emissiveIntensity = Math.max(0, 3 * (1 - t / SHATTER_DURATION));

    // Opacity fade (last 40 %)
    if (t > SHATTER_DURATION * 0.6) {
      mat.opacity = Math.max(0, 1 - (t - SHATTER_DURATION * 0.6) / (SHATTER_DURATION * 0.4));
    }

    // Animate shards
    for (let i = 0; i < shards.length; i++) {
      const mesh = shardRefs.current[i];
      if (!mesh) continue;
      const s = shards[i];

      mesh.position.set(
        s.center.x + s.velocity.x * t,
        s.center.y + s.velocity.y * t + 0.5 * GRAVITY * t * t,
        s.center.z + s.velocity.z * t,
      );

      mesh.rotation.x += s.angVelX * delta;
      mesh.rotation.y += s.angVelY * delta;
      mesh.rotation.z += s.angVelZ * delta;
    }
  });

  return (
    <group>
      <pointLight ref={flashRef} color="#ffffff" intensity={20} distance={18} decay={2} />
      {shards.map((s, i) => (
        <mesh
          key={i}
          ref={setShardRef(i)}
          geometry={s.geometry}
          material={mat}
          position={[s.center.x, s.center.y, s.center.z]}
        />
      ))}
    </group>
  );
}

export default ArenaMage;
