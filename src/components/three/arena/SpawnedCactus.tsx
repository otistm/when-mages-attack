/**
 * SpawnedCactus - 3D potted cactus construct that fires spine projectiles
 * 
 * Uses the potted_cactus.glb model.
 * Spawned from the Potted Cactus card after initial cooldown.
 * Fires spine projectiles on cooldown.
 */

import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { CardSlotConfig, ARENA } from '@/types';
import { useCardStore } from '@/stores/cardStore';
import { useCombatStore } from '@/stores/combatStore';

// Spore/pollen particle configuration
const PARTICLE_COUNT = 16;
const PARTICLE_SPAWN_RADIUS = 0.6;
const PARTICLE_RISE_SPEED = 0.6;
const PARTICLE_MAX_HEIGHT = 2.0;

const SPORE_COLORS = ['#228B22', '#32CD32', '#90EE90', '#6B8E23', '#9ACD32'];

interface SporeParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

function SporeParticles({ active }: { active: boolean }) {
  const particlesRef = useRef<SporeParticle[]>([]);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  function createParticle(): SporeParticle {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * PARTICLE_SPAWN_RADIUS;
    return {
      position: new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.random() * 0.3,
        Math.sin(angle) * radius * 0.6
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.15,
        PARTICLE_RISE_SPEED + Math.random() * 0.3,
        (Math.random() - 0.5) * 0.1
      ),
      life: Math.random(),
      maxLife: 2.0 + Math.random() * 1.5,
      size: 0.05 + Math.random() * 0.08,
      color: SPORE_COLORS[Math.floor(Math.random() * SPORE_COLORS.length)],
    };
  }

  useEffect(() => {
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => createParticle());
  }, []);

  useFrame((_, delta) => {
    if (!active) return;

    particlesRef.current.forEach((particle, i) => {
      particle.life += delta;
      particle.position.add(particle.velocity.clone().multiplyScalar(delta));
      particle.position.x += Math.sin(particle.life * 2 + i) * delta * 0.15;

      if (particle.life >= particle.maxLife || particle.position.y > PARTICLE_MAX_HEIGHT) {
        const newParticle = createParticle();
        particlesRef.current[i] = newParticle;
        particle.position.copy(newParticle.position);
        particle.velocity.copy(newParticle.velocity);
        particle.life = 0;
        particle.maxLife = newParticle.maxLife;
        particle.size = newParticle.size;
        particle.color = newParticle.color;
      }

      const mesh = meshRefs.current[i];
      if (mesh) {
        mesh.position.copy(particle.position);
        const lifeRatio = particle.life / particle.maxLife;
        const opacity = lifeRatio < 0.2
          ? lifeRatio / 0.2
          : 1 - ((lifeRatio - 0.2) / 0.8);
        const scale = particle.size * (1 + lifeRatio * 0.5);
        mesh.scale.setScalar(scale);
        const material = mesh.material as THREE.MeshBasicMaterial;
        material.opacity = opacity * 0.5;
      }
    });
  });

  if (!active) return null;

  return (
    <group position={[0, 1.2, 0]}>
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => { meshRefs.current[i] = el; }}
        >
          <sphereGeometry args={[1, 6, 6]} />
          <meshBasicMaterial
            color={particlesRef.current[i]?.color || '#228B22'}
            transparent
            opacity={0.4}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// Number of needles fired in a radial burst
const NEEDLE_COUNT = 5;

interface SpawnedCactusProps {
  slot: CardSlotConfig;
  team: 'player' | 'enemy';
  onFire: (position: [number, number, number], damage: number) => void;
  damage: number;
  cooldown: number;
  combatId: string;
  onDestroy?: () => void;
}

export function SpawnedCactus({
  slot,
  team,
  onFire,
  damage,
  cooldown,
  combatId,
  onDestroy,
}: SpawnedCactusProps) {
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

  const gltf = useGLTF('/assets/models/potted_cactus.glb');

  const cactusModel = useMemo(() => {
    if (gltf?.scene) {
      const clone = gltf.scene.clone();
      clone.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });
      return clone;
    }
    return null;
  }, [gltf]);

  const shouldFireOnSpawn = useRef(true);

  // Spawn animation
  const [springProps, springApi] = useSpring(() => ({
    scale: 0,
    positionY: -1,
    config: { tension: 300, friction: 20 },
  }));

  useEffect(() => {
    setSpawned(true);
    springApi.start({ scale: 1, positionY: 0 });
  }, [springApi]);

  // Handle death
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
        setTimeout(() => {
          onDestroy?.();
        }, 600);
      }
    }
  }, [combatData, combatState, isDying, springApi, onDestroy]);

  const zPosition = team === 'player'
    ? ARENA.playerThroneZ - 2
    : ARENA.enemyThroneZ + 2;

  // Fire a radial burst of needles from offset positions
  const fireNeedleBurst = useCallback(() => {
    const spreadRadius = 0.6;
    for (let i = 0; i < NEEDLE_COUNT; i++) {
      const angle = (i / NEEDLE_COUNT) * Math.PI * 2;
      const offsetX = Math.cos(angle) * spreadRadius;
      const offsetZ = Math.sin(angle) * spreadRadius;
      const firePosition: [number, number, number] = [
        slot.xPosition + offsetX,
        0.8,
        zPosition + offsetZ,
      ];
      // Stagger each needle slightly for a satisfying burst feel
      setTimeout(() => {
        onFire(firePosition, damage);
      }, i * 40);
    }
  }, [slot.xPosition, zPosition, onFire, damage]);

  // Fire cooldown logic
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;

    if (!spawned || isDying) return;

    if (lastFireRef.current === 0) {
      lastFireRef.current = time;

      if (shouldFireOnSpawn.current) {
        shouldFireOnSpawn.current = false;
        setIsReady(true);

        fireNeedleBurst();

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

      fireNeedleBurst();

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
      {/* Cactus model or fallback */}
      {cactusModel ? (
        <primitive
          object={cactusModel}
          scale={4.0}
          rotation={[-0.3, team === 'player' ? 0 : Math.PI, 0]}
        />
      ) : (
        <group scale={3.0}>
          {/* Fallback: simple pot + sphere cactus */}
          <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.25, 0.3, 0.3, 8]} />
            <meshBasicMaterial color="#8B4513" />
          </mesh>
          <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
            <sphereGeometry args={[0.25, 8, 8]} />
            <meshBasicMaterial color="#228B22" />
          </mesh>
        </group>
      )}

      {/* Health bar */}
      <group position={[0, 3.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <planeGeometry args={[1.6, 0.22]} />
          <meshBasicMaterial color="#000000" opacity={0.6} transparent />
        </mesh>
        <mesh position={[(healthPercent - 1) * 0.8, 0, 0.01]}>
          <planeGeometry args={[1.56 * healthPercent, 0.18]} />
          <meshBasicMaterial color={isPlayer ? '#4ade80' : '#f87171'} />
        </mesh>
      </group>

      <SporeParticles active={spawned && !isDying} />

      {/* Ambient glow */}
      <pointLight
        position={[0, 1.2, 0]}
        color="#32CD32"
        intensity={spawned && !isDying ? 2 : 0}
        distance={4}
        decay={2}
      />

      {/* Needle burst flash */}
      {isReady && !isDying && (
        <pointLight
          position={[0, 1.8, 0]}
          color="#90EE90"
          intensity={10}
          distance={8}
          decay={2}
        />
      )}
    </animated.group>
  );
}

useGLTF.preload('/assets/models/potted_cactus.glb');

export default SpawnedCactus;
