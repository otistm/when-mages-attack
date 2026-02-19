/**
 * Spawn Effect - Visual feedback for summoning
 */

import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useArenaStore } from '@/stores/arenaStore';

export function SpawnEffects() {
  const minions = useArenaStore((state) => state.minions);
  const [effects, setEffects] = useState<SpawnData[]>([]);
  
  // Track new spawns
  useEffect(() => {
    minions.forEach((minion, id) => {
      if (minion.state === 'spawning') {
        // Check if we already have an effect for this minion
        if (!effects.find((e) => e.minionId === id)) {
          setEffects((prev) => [
            ...prev,
            {
              id: `spawn-${id}`,
              minionId: id,
              position: minion.position,
              color: minion.team === 'player' ? '#00ff88' : '#ff4444',
              createdAt: Date.now(),
            },
          ]);
        }
      }
    });
  }, [minions, effects]);
  
  // Clean up old effects
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setEffects((prev) => prev.filter((e) => now - e.createdAt < 1000));
    }, 100);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <group>
      {effects.map((effect) => (
        <SpawnBurst key={effect.id} {...effect} />
      ))}
    </group>
  );
}

interface SpawnData {
  id: string;
  minionId: string;
  position: [number, number, number];
  color: string;
  createdAt: number;
}

function SpawnBurst({ position, color, createdAt }: SpawnData) {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  
  // Create particle positions
  const particlePositions = useRef(
    new Float32Array(
      Array.from({ length: 30 }, () => [
        (Math.random() - 0.5) * 0.5,
        Math.random() * 0.5,
        (Math.random() - 0.5) * 0.5,
      ]).flat()
    )
  );
  
  const particleVelocities = useRef(
    Array.from({ length: 30 }, () => ({
      x: (Math.random() - 0.5) * 2,
      y: Math.random() * 3 + 1,
      z: (Math.random() - 0.5) * 2,
    }))
  );
  
  useFrame((_, delta) => {
    const elapsed = (Date.now() - createdAt) / 1000;
    
    if (groupRef.current) {
      // Rotate rune circle
      groupRef.current.rotation.y = elapsed * 3;
    }
    
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particleVelocities.current.length; i++) {
        const vel = particleVelocities.current[i];
        positions[i * 3] += vel.x * delta;
        positions[i * 3 + 1] += vel.y * delta;
        positions[i * 3 + 2] += vel.z * delta;
        
        // Apply gravity
        vel.y -= 9.8 * delta;
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
      
      // Fade out
      const opacity = Math.max(0, 1 - elapsed);
      (particlesRef.current.material as THREE.PointsMaterial).opacity = opacity;
    }
  });
  
  const elapsed = (Date.now() - createdAt) / 1000;
  const pillarOpacity = Math.max(0, 1 - elapsed * 1.5);
  const pillarScale = 0.3 + elapsed * 0.5;

  return (
    <group position={position}>
      {/* Rune circle */}
      <group ref={groupRef}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[1.2, 1.5, 6]} />
          <meshBasicMaterial 
            color={color} 
            transparent 
            opacity={0.5 * pillarOpacity}
            side={THREE.DoubleSide}
          />
        </mesh>
        
        {/* Inner circle */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.4, 0.6, 6]} />
          <meshBasicMaterial 
            color={color} 
            transparent 
            opacity={0.8 * pillarOpacity}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* Light pillar */}
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[pillarScale * 0.3, pillarScale, 4, 8, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={pillarOpacity * 0.35}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      
      {/* Rising particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particlePositions.current.length / 3}
            array={particlePositions.current}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color={color}
          size={0.15}
          transparent
          opacity={pillarOpacity}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

export default SpawnEffects;
