/**
 * SpawnedToaster - Cel-shaded 3D toaster that fires projectiles
 * 
 * Uses MeshToonMaterial for consistent cel-shaded look.
 * Spawned from a card after initial cooldown.
 * Fires toast projectiles every 5 seconds.
 * 
 * @see https://threejs.org/docs/#MeshToonMaterial
 */

import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { CardSlotConfig, ARENA } from '@/types';
import { useCardStore } from '@/stores/cardStore';
import { useCombatStore } from '@/stores/combatStore';

// Heat particle configuration
const PARTICLE_COUNT = 24;
const PARTICLE_SPAWN_RADIUS = 0.8;
const PARTICLE_RISE_SPEED = 1.5;
const PARTICLE_MAX_HEIGHT = 2.5;

// Infernal toaster: fiery oranges and yellows
const INFERNAL_PARTICLE_COLORS = ['#ff6a00', '#ff8c00', '#ffaa00', '#ff4500', '#ff5722'];
// Inert toaster: grey/silver tones
const INERT_PARTICLE_COLORS = ['#9ca3af', '#6b7280', '#d1d5db', '#a3a3a3', '#737373'];

interface HeatParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

function HeatParticles({ active, colors }: { active: boolean; colors: string[] }) {
  const particlesRef = useRef<HeatParticle[]>([]);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const colorsRef = useRef(colors);
  
  // Update colors ref when colors change
  useEffect(() => {
    colorsRef.current = colors;
  }, [colors]);
  
  // Initialize particles
  useEffect(() => {
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => createParticle());
  }, []);
  
  function createParticle(): HeatParticle {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * PARTICLE_SPAWN_RADIUS;
    const particleColors = colorsRef.current;
    return {
      position: new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.random() * 0.5,
        Math.sin(angle) * radius * 0.6
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        PARTICLE_RISE_SPEED + Math.random() * 0.5,
        (Math.random() - 0.5) * 0.2
      ),
      life: Math.random(), // Start at random life for staggered effect
      maxLife: 1.5 + Math.random() * 1,
      size: 0.08 + Math.random() * 0.12,
      color: particleColors[Math.floor(Math.random() * particleColors.length)],
    };
  }
  
  useFrame((_, delta) => {
    if (!active) return;
    
    particlesRef.current.forEach((particle, i) => {
      particle.life += delta;
      
      // Update position
      particle.position.add(particle.velocity.clone().multiplyScalar(delta));
      
      // Add some wavering motion
      particle.position.x += Math.sin(particle.life * 3 + i) * delta * 0.2;
      
      // Reset particle when it dies
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
      
      // Update mesh
      const mesh = meshRefs.current[i];
      if (mesh) {
        mesh.position.copy(particle.position);
        
        // Fade based on life
        const lifeRatio = particle.life / particle.maxLife;
        const opacity = lifeRatio < 0.2 
          ? lifeRatio / 0.2 // Fade in
          : 1 - ((lifeRatio - 0.2) / 0.8); // Fade out
        
        const scale = particle.size * (1 + lifeRatio * 0.5);
        mesh.scale.setScalar(scale);
        
        // Update material opacity
        const material = mesh.material as THREE.MeshBasicMaterial;
        material.opacity = opacity * 0.7;
      }
    });
  });
  
  if (!active) return null;
  
  return (
    <group position={[0, 0.5, 0]}>
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => { meshRefs.current[i] = el; }}
        >
          <sphereGeometry args={[1, 6, 6]} />
          <meshBasicMaterial
            color={particlesRef.current[i]?.color || '#ff6a00'}
            transparent
            opacity={0.6}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

interface SpawnedToasterProps {
  slot: CardSlotConfig;
  team: 'player' | 'enemy';
  onFire: (position: [number, number, number], damage: number) => void;
  damage: number;
  cooldown: number;
  isInfernal?: boolean;
  combatId: string;       // ID in the combat store for HP tracking
  onDestroy?: () => void;  // Called when construct is destroyed
}

export function SpawnedToaster({ 
  slot, 
  team, 
  onFire, 
  damage, 
  cooldown,
  isInfernal = false,
  combatId,
  onDestroy,
}: SpawnedToasterProps) {
  const particleColors = isInfernal ? INFERNAL_PARTICLE_COLORS : INERT_PARTICLE_COLORS;
  const glowColor = isInfernal ? '#ff6a00' : '#9ca3af';
  const groupRef = useRef<THREE.Group>(null);
  const [isReady, setIsReady] = useState(false);
  const [spawned, setSpawned] = useState(false);
  const [isDying, setIsDying] = useState(false);
  const lastFireRef = useRef(0);
  const hasCalledDestroy = useRef(false);
  
  // Read combat state for this construct
  const combatData = useCombatStore((state) => state.minions.get(combatId));
  const maxHp = combatData?.stats?.hp ?? 1;
  const currentHp = combatData?.currentHp ?? 0;
  const healthPercent = maxHp > 0 ? currentHp / maxHp : 0;
  const combatState = combatData?.state;
  
  const updateCooldown = useCardStore((state) => state.updateCooldown);
  
  const gltf = useGLTF('/assets/models/toaster_cel.glb');
  
  const toasterModel = useMemo(() => {
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
  
  // Handle death — when combat store says dying/dead or entity is removed
  useEffect(() => {
    if (isDying) return;
    
    if (!combatData || combatState === 'dying' || combatState === 'dead') {
      setIsDying(true);
      springApi.start({
        scale: 0,
        positionY: -1,
        config: { tension: 200, friction: 20 },
      });
      
      // Call onDestroy after death animation
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
  
  // Fire cooldown logic — stop firing when dying
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    
    if (!spawned || isDying) return;
    
    if (lastFireRef.current === 0) {
      lastFireRef.current = time;
      
      if (shouldFireOnSpawn.current) {
        shouldFireOnSpawn.current = false;
        setIsReady(true);
        
        const firePosition: [number, number, number] = [
          slot.xPosition,
          0.5,
          zPosition,
        ];
        onFire(firePosition, damage);
        
        updateCooldown(slot.index, team, 0, false);
        setTimeout(() => setIsReady(false), 200);
      }
      return;
    }
    
    const elapsed = time - lastFireRef.current;
    const progress = Math.min(elapsed / cooldown, 1);
    const isCooldownReady = progress >= 1;
    
    updateCooldown(slot.index, team, progress, false);
    
    if (isCooldownReady) {
      setIsReady(true);
      lastFireRef.current = time;
      
      const firePosition: [number, number, number] = [
        slot.xPosition,
        0.5,
        zPosition,
      ];
      onFire(firePosition, damage);
      
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
      {/* Toaster model or fallback */}
      {toasterModel ? (
        <primitive 
          object={toasterModel} 
          scale={2.5}
          rotation={[
            -0.5,
            team === 'player' ? 0 : Math.PI, 
            0
          ]}
        />
      ) : (
        <group 
          scale={3.0} 
          rotation={[-0.5, 0, 0]}
        >
          <mesh position={[0, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.8, 0.5, 0.5]} />
            <meshBasicMaterial color="#c0c0c0" />
          </mesh>
          <mesh position={[-0.15, 0.28, 0]} castShadow>
            <boxGeometry args={[0.15, 0.1, 0.35]} />
            <meshBasicMaterial color="#1a1a1a" />
          </mesh>
          <mesh position={[0.15, 0.28, 0]} castShadow>
            <boxGeometry args={[0.15, 0.1, 0.35]} />
            <meshBasicMaterial color="#1a1a1a" />
          </mesh>
          <mesh position={[0.45, 0.1, 0]} castShadow>
            <boxGeometry args={[0.1, 0.15, 0.08]} />
            <meshBasicMaterial color="#333333" />
          </mesh>
        </group>
      )}
      
      {/* Health bar — visible above the toaster */}
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
      
      <HeatParticles active={spawned && !isDying} colors={particleColors} />
      
      <pointLight
        position={[0, 0.8, 0]}
        color={glowColor}
        intensity={spawned && !isDying ? 3 : 0}
        distance={4}
        decay={2}
      />
      
      {isReady && !isDying && (
        <>
          <pointLight
            position={[0, 1.2, 0]}
            color={glowColor}
            intensity={12}
            distance={8}
            decay={2}
          />
          <mesh position={[-0.4, 1.6, 0]} castShadow>
            <boxGeometry args={[0.35, 0.6, 0.08]} />
            <meshBasicMaterial color="#d4a056" />
          </mesh>
          <mesh position={[0.4, 1.4, 0]} castShadow>
            <boxGeometry args={[0.35, 0.5, 0.08]} />
            <meshBasicMaterial color="#c9944d" />
          </mesh>
        </>
      )}
      
    </animated.group>
  );
}

// Preload the model
useGLTF.preload('/assets/models/toaster_cel.glb');

export default SpawnedToaster;
