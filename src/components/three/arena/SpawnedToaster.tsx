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
  isInfernal?: boolean; // true for Infernal Toaster, false for Inert Toaster
}

export function SpawnedToaster({ 
  slot, 
  team, 
  onFire, 
  damage, 
  cooldown,
  isInfernal = false,
}: SpawnedToasterProps) {
  // Choose particle colors based on toaster type
  const particleColors = isInfernal ? INFERNAL_PARTICLE_COLORS : INERT_PARTICLE_COLORS;
  const glowColor = isInfernal ? '#ff6a00' : '#9ca3af';
  const groupRef = useRef<THREE.Group>(null);
  const [isReady, setIsReady] = useState(false);
  const [spawned, setSpawned] = useState(false);
  const lastFireRef = useRef(0);
  
  // Sync cooldown with card UI
  const updateCooldown = useCardStore((state) => state.updateCooldown);
  
  // Try to load the toaster model (cel-shaded version)
  const gltf = useGLTF('/assets/models/toaster_cel.glb');
  
  // Clone the scene, enable shadows (model is already cel-shaded)
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
  
  // Track if we should fire immediately after spawn
  const shouldFireOnSpawn = useRef(true);
  
  // Spawn animation - toaster rises from below floor to floor level
  const { scale, positionY } = useSpring({
    scale: spawned ? 1 : 0,
    positionY: spawned ? 0 : -1, // 0 = on the floor
    config: { tension: 300, friction: 20 }, // Faster spawn animation
  });
  
  // Trigger spawn animation immediately on mount
  useEffect(() => {
    setSpawned(true);
  }, []);
  
  // Position based on team - spawn closer to center of arena
  const zPosition = team === 'player' 
    ? ARENA.playerSlotZ - 4  // Closer to center
    : ARENA.enemySlotZ + 4;   // Closer to center
  
  // Fire cooldown logic
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    
    if (!spawned) return;
    
    // Initialize lastFireRef on first frame after spawn
    if (lastFireRef.current === 0) {
      lastFireRef.current = time;
      
      // Fire immediately on first spawn
      if (shouldFireOnSpawn.current) {
        shouldFireOnSpawn.current = false;
        setIsReady(true);
        
        const firePosition: [number, number, number] = [
          slot.xPosition,
          0.5,
          zPosition,
        ];
        onFire(firePosition, damage);
        
        // Brief flash then reset cooldown display
        updateCooldown(slot.index, team, 0, false);
        setTimeout(() => setIsReady(false), 200);
      }
      return;
    }
    
    const elapsed = time - lastFireRef.current;
    const progress = Math.min(elapsed / cooldown, 1);
    const isCooldownReady = progress >= 1;
    
    // Update card UI with cooldown progress (only show ready briefly when firing)
    updateCooldown(slot.index, team, progress, false);
    
    // Fire when cooldown completes
    if (isCooldownReady) {
      setIsReady(true);
      lastFireRef.current = time;
      
      // Fire projectiles from toaster position
      const firePosition: [number, number, number] = [
        slot.xPosition,
        0.5,
        zPosition,
      ];
      onFire(firePosition, damage);
      
      // Flash effect - reset cooldown after brief flash
      setTimeout(() => {
        setIsReady(false);
        updateCooldown(slot.index, team, 0, false);
      }, 200);
    }
  });
  
  return (
    <animated.group
      ref={groupRef}
      position-x={slot.xPosition}
      position-y={positionY}
      position-z={zPosition}
      scale={scale}
      renderOrder={10}
    >
      {/* Toaster model or fallback - tilted forward for better visibility */}
      {toasterModel ? (
        <primitive 
          object={toasterModel} 
          scale={2.5}
          rotation={[
            -0.5, // Tilt forward more (toward enemy for player)
            team === 'player' ? 0 : Math.PI, 
            0
          ]}
        />
      ) : (
        // Fallback: Simple 3D toaster shape with flat colors
        <group 
          scale={3.0} 
          rotation={[-0.5, 0, 0]} // Tilt forward more
        >
          {/* Main body */}
          <mesh position={[0, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.8, 0.5, 0.5]} />
            <meshBasicMaterial color="#c0c0c0" />
          </mesh>
          {/* Slots */}
          <mesh position={[-0.15, 0.28, 0]} castShadow>
            <boxGeometry args={[0.15, 0.1, 0.35]} />
            <meshBasicMaterial color="#1a1a1a" />
          </mesh>
          <mesh position={[0.15, 0.28, 0]} castShadow>
            <boxGeometry args={[0.15, 0.1, 0.35]} />
            <meshBasicMaterial color="#1a1a1a" />
          </mesh>
          {/* Lever */}
          <mesh position={[0.45, 0.1, 0]} castShadow>
            <boxGeometry args={[0.1, 0.15, 0.08]} />
            <meshBasicMaterial color="#333333" />
          </mesh>
        </group>
      )}
      
      {/* Heat particles emanating from toaster */}
      <HeatParticles active={spawned} colors={particleColors} />
      
      {/* Ambient heat glow */}
      <pointLight
        position={[0, 0.8, 0]}
        color={glowColor}
        intensity={spawned ? 3 : 0}
        distance={4}
        decay={2}
      />
      
      {/* Glow effect when firing */}
      {isReady && (
        <>
          <pointLight
            position={[0, 1.2, 0]}
            color={glowColor}
            intensity={12}
            distance={8}
            decay={2}
          />
          {/* Toast popping out - flat colors, scaled for larger toaster */}
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
