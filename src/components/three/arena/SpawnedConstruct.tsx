/**
 * SpawnedConstruct - Generic 3D construct for non-toaster/non-cactus cards
 *
 * Uses procedural geometry based on card tags to create visually distinct
 * constructs (blades, batteries, bricks, bombs, etc.) rather than defaulting
 * everything to the toaster model.
 */

import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { CardSlotConfig, ARENA } from '@/types';
import { useCardStore } from '@/stores/cardStore';
import { useCombatStore } from '@/stores/combatStore';

const PARTICLE_COUNT = 16;
const PARTICLE_SPAWN_RADIUS = 0.6;
const PARTICLE_RISE_SPEED = 1.0;
const PARTICLE_MAX_HEIGHT = 2.0;

interface EnergyParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

function EnergyParticles({ active, colors }: { active: boolean; colors: string[] }) {
  const particlesRef = useRef<EnergyParticle[]>([]);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const colorsRef = useRef(colors);

  useEffect(() => { colorsRef.current = colors; }, [colors]);

  function createParticle(): EnergyParticle {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * PARTICLE_SPAWN_RADIUS;
    const c = colorsRef.current;
    return {
      position: new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.random() * 0.4,
        Math.sin(angle) * radius * 0.6
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.25,
        PARTICLE_RISE_SPEED + Math.random() * 0.4,
        (Math.random() - 0.5) * 0.15
      ),
      life: Math.random(),
      maxLife: 1.5 + Math.random() * 1,
      size: 0.06 + Math.random() * 0.1,
      color: c[Math.floor(Math.random() * c.length)],
    };
  }

  useEffect(() => {
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => createParticle());
  }, []);

  useFrame((_, delta) => {
    if (!active) return;
    particlesRef.current.forEach((p, i) => {
      p.life += delta;
      p.position.add(p.velocity.clone().multiplyScalar(delta));
      p.position.x += Math.sin(p.life * 3 + i) * delta * 0.15;
      if (p.life >= p.maxLife || p.position.y > PARTICLE_MAX_HEIGHT) {
        const np = createParticle();
        Object.assign(particlesRef.current[i], np);
        p.position.copy(np.position);
        p.velocity.copy(np.velocity);
      }
      const mesh = meshRefs.current[i];
      if (mesh) {
        mesh.position.copy(p.position);
        const ratio = p.life / p.maxLife;
        const opacity = ratio < 0.2 ? ratio / 0.2 : 1 - (ratio - 0.2) / 0.8;
        mesh.scale.setScalar(p.size * (1 + ratio * 0.5));
        (mesh.material as THREE.MeshBasicMaterial).opacity = opacity * 0.6;
      }
    });
  });

  if (!active) return null;

  return (
    <group position={[0, 0.4, 0]}>
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <mesh key={i} ref={(el) => { meshRefs.current[i] = el; }}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshBasicMaterial
            color={particlesRef.current[i]?.color || colors[0]}
            transparent
            opacity={0.5}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

type ConstructShape = 'blade' | 'brick' | 'orb' | 'crystal' | 'cylinder';

function getShapeFromTags(tags: string[]): ConstructShape {
  if (tags.some(t => ['weapon', 'sharp', 'melee'].includes(t))) return 'blade';
  if (tags.some(t => ['stone', 'heavy', 'blunt'].includes(t))) return 'brick';
  if (tags.some(t => ['glass', 'tech', 'electric'].includes(t))) return 'crystal';
  if (tags.some(t => ['bio', 'liquid', 'food', 'meat', 'poison'].includes(t))) return 'orb';
  return 'cylinder';
}

function getParticleColors(tags: string[], color: string): string[] {
  if (tags.includes('fire')) return ['#ff6a00', '#ff8c00', '#ffaa00', '#ff4500', color];
  if (tags.includes('electric')) return ['#00e5ff', '#40c4ff', '#80d8ff', '#e1f5fe', color];
  if (tags.includes('poison')) return ['#76ff03', '#9ccc65', '#c6ff00', '#aed581', color];
  if (tags.includes('acid')) return ['#aeea00', '#c6ff00', '#d4e157', '#e6ee9c', color];
  return [color, '#ffffff88', '#aaaaaa', color, '#dddddd'];
}

function ConstructBody({ shape, color, emissive }: { shape: ConstructShape; color: string; emissive: string }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.4;
  });

  switch (shape) {
    case 'blade':
      return (
        <group ref={groupRef} position={[0, 0.8, 0]} rotation={[0.3, 0, 0.15]}>
          {/* Blade */}
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[0.12, 1.4, 0.04]} />
            <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.4} metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Edge highlight */}
          <mesh position={[0.07, 0.5, 0]} castShadow>
            <boxGeometry args={[0.02, 1.3, 0.02]} />
            <meshStandardMaterial color="#ffffff" emissive={emissive} emissiveIntensity={0.8} metalness={1} roughness={0} />
          </mesh>
          {/* Guard */}
          <mesh position={[0, -0.15, 0]} castShadow>
            <boxGeometry args={[0.4, 0.08, 0.08]} />
            <meshStandardMaterial color="#555555" metalness={0.9} roughness={0.3} />
          </mesh>
          {/* Handle */}
          <mesh position={[0, -0.45, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.06, 0.5, 8]} />
            <meshStandardMaterial color="#3a2a1a" roughness={0.8} />
          </mesh>
        </group>
      );

    case 'brick':
      return (
        <group ref={groupRef} position={[0, 0.6, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.7, 0.45, 0.35]} />
            <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.3} roughness={0.9} />
          </mesh>
          {/* Crack line */}
          <mesh position={[0.1, 0.05, 0.18]} castShadow>
            <boxGeometry args={[0.3, 0.02, 0.01]} />
            <meshStandardMaterial color="#1a1a1a" roughness={1} />
          </mesh>
        </group>
      );

    case 'crystal':
      return (
        <group ref={groupRef} position={[0, 0.9, 0]}>
          <mesh castShadow rotation={[0, 0, 0.2]}>
            <octahedronGeometry args={[0.4, 0]} />
            <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.6} metalness={0.3} roughness={0.1} transparent opacity={0.85} />
          </mesh>
          <mesh castShadow rotation={[0.5, 0.8, 0]} position={[0.15, 0.25, 0]}>
            <octahedronGeometry args={[0.2, 0]} />
            <meshStandardMaterial color={emissive} emissive={emissive} emissiveIntensity={0.9} metalness={0.3} roughness={0.1} transparent opacity={0.7} />
          </mesh>
        </group>
      );

    case 'orb':
      return (
        <group ref={groupRef} position={[0, 0.8, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.35, 16, 16]} />
            <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.5} metalness={0.1} roughness={0.4} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.42, 12, 12]} />
            <meshStandardMaterial color={emissive} emissive={emissive} emissiveIntensity={0.3} transparent opacity={0.15} side={THREE.BackSide} />
          </mesh>
        </group>
      );

    case 'cylinder':
    default:
      return (
        <group ref={groupRef} position={[0, 0.7, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.25, 0.3, 0.8, 8]} />
            <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.4} metalness={0.5} roughness={0.5} />
          </mesh>
          {/* Top cap glow */}
          <mesh position={[0, 0.42, 0]}>
            <circleGeometry args={[0.24, 8]} />
            <meshBasicMaterial color={emissive} transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
        </group>
      );
  }
}

interface SpawnedConstructProps {
  slot: CardSlotConfig;
  team: 'player' | 'enemy';
  onFire: (position: [number, number, number], damage: number) => void;
  damage: number;
  cooldown: number;
  combatId: string;
  onDestroy?: () => void;
  cardColor?: string;
  cardEmissive?: string;
  cardTags?: string[];
}

export function SpawnedConstruct({
  slot,
  team,
  onFire,
  damage,
  cooldown,
  combatId,
  onDestroy,
  cardColor = '#888888',
  cardEmissive = '#444444',
  cardTags = [],
}: SpawnedConstructProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [isReady, setIsReady] = useState(false);
  const [spawned, setSpawned] = useState(false);
  const [isDying, setIsDying] = useState(false);
  const lastFireRef = useRef(0);
  const hasCalledDestroy = useRef(false);

  const combatData = useCombatStore((state) => state.minions.get(combatId));
  const maxHp = combatData?.stats?.hp ?? 1;
  const currentHp = combatData?.currentHp ?? 0;
  const healthPercent = maxHp > 0 ? currentHp / maxHp : 0;
  const combatState = combatData?.state;

  const updateCooldown = useCardStore((state) => state.updateCooldown);

  const shape = useMemo(() => getShapeFromTags(cardTags), [cardTags]);
  const particleColors = useMemo(() => getParticleColors(cardTags, cardColor), [cardTags, cardColor]);

  const shouldFireOnSpawn = useRef(true);

  const [springProps, springApi] = useSpring(() => ({
    scale: 0,
    positionY: -1,
    config: { tension: 300, friction: 20 },
  }));

  useEffect(() => {
    setSpawned(true);
    springApi.start({ scale: 1, positionY: 0 });
  }, [springApi]);

  useEffect(() => {
    if (isDying) return;
    if (!combatData || combatState === 'dying' || combatState === 'dead') {
      setIsDying(true);
      springApi.start({
        scale: 0,
        positionY: -1,
        config: { tension: 200, friction: 20 },
      });
      if (!hasCalledDestroy.current) {
        hasCalledDestroy.current = true;
        setTimeout(() => { onDestroy?.(); }, 600);
      }
    }
  }, [combatData, combatState, isDying, springApi, onDestroy]);

  const zPosition = team === 'player'
    ? ARENA.playerThroneZ - 2
    : ARENA.enemyThroneZ + 2;

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    if (!spawned || isDying) return;

    if (lastFireRef.current === 0) {
      lastFireRef.current = time;
      if (shouldFireOnSpawn.current) {
        shouldFireOnSpawn.current = false;
        setIsReady(true);
        onFire([slot.xPosition, 0.5, zPosition], damage);
        updateCooldown(slot.index, team, 0, false);
        setTimeout(() => setIsReady(false), 200);
      }
      return;
    }

    const elapsed = time - lastFireRef.current;
    const progress = Math.min(elapsed / cooldown, 1);
    updateCooldown(slot.index, team, progress, false);

    if (progress >= 1) {
      setIsReady(true);
      lastFireRef.current = time;
      onFire([slot.xPosition, 0.5, zPosition], damage);
      setTimeout(() => {
        setIsReady(false);
        updateCooldown(slot.index, team, 0, false);
      }, 200);
    }
  });

  const isPlayer = team === 'player';

  return (
    <animated.group
      ref={groupRef}
      position-x={slot.xPosition}
      position-y={springProps.positionY}
      position-z={zPosition}
      scale={springProps.scale}
      renderOrder={10}
    >
      <group scale={2.2}>
        <ConstructBody shape={shape} color={cardColor} emissive={cardEmissive} />
      </group>

      {/* Health bar */}
      <group position={[0, 2.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <planeGeometry args={[1.6, 0.22]} />
          <meshBasicMaterial color="#000000" opacity={0.6} transparent />
        </mesh>
        <mesh position={[(healthPercent - 1) * 0.8, 0, 0.01]}>
          <planeGeometry args={[1.56 * healthPercent, 0.18]} />
          <meshBasicMaterial color={isPlayer ? '#4ade80' : '#f87171'} />
        </mesh>
      </group>

      <EnergyParticles active={spawned && !isDying} colors={particleColors} />

      <pointLight
        position={[0, 0.8, 0]}
        color={cardEmissive}
        intensity={spawned && !isDying ? 2.5 : 0}
        distance={4}
        decay={2}
      />

      {isReady && !isDying && (
        <pointLight
          position={[0, 1.2, 0]}
          color={cardEmissive}
          intensity={10}
          distance={6}
          decay={2}
        />
      )}
    </animated.group>
  );
}

export default SpawnedConstruct;
