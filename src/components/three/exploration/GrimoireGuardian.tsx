/**
 * GrimoireGuardian (The Archivist) - Boss entity made of swirling papers
 * Appears when player successfully opens the grimoire case
 */

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface GrimoireGuardianProps {
  position: [number, number, number];
  isAwakening: boolean;
  isDefeated: boolean;
  onAwakeningComplete?: () => void;
}

export function GrimoireGuardian({ 
  position, 
  isAwakening,
  isDefeated,
  onAwakeningComplete,
}: GrimoireGuardianProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [awakeningProgress, setAwakeningProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  
  // Awakening animation
  useEffect(() => {
    if (isAwakening && !isVisible) {
      setIsVisible(true);
      setAwakeningProgress(0);
    }
  }, [isAwakening, isVisible]);
  
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    // Awakening animation
    if (isAwakening && awakeningProgress < 1) {
      setAwakeningProgress(prev => {
        const next = Math.min(prev + delta * 0.3, 1);
        if (next >= 1 && onAwakeningComplete) {
          onAwakeningComplete();
        }
        return next;
      });
    }
    
    // Defeat animation - dissolve
    if (isDefeated) {
      groupRef.current.scale.lerp(new THREE.Vector3(0, 0, 0), delta * 2);
      return;
    }
    
    // Scale based on awakening
    const targetScale = awakeningProgress;
    groupRef.current.scale.setScalar(targetScale);
    
    // Idle animation - floating and paper rustling
    if (awakeningProgress >= 1) {
      const time = state.clock.elapsedTime;
      
      // Gentle float
      groupRef.current.position.y = position[1] + Math.sin(time * 1.5) * 0.1;
      
      // Subtle rotation
      groupRef.current.rotation.y = Math.sin(time * 0.5) * 0.1;
    }
  });
  
  if (!isVisible) return null;
  
  return (
    <group ref={groupRef} position={position}>
      {/* Core body - swirling paper torso */}
      <PaperTorso />
      
      {/* Head - collage of text */}
      <PaperHead position={[0, 1.2, 0]} />
      
      {/* Arms - paper tendrils */}
      <PaperArm position={[-0.6, 0.5, 0]} side="left" />
      <PaperArm position={[0.6, 0.5, 0]} side="right" />
      
      {/* Floating paper particles */}
      <PaperParticles count={20} radius={1.5} />
      
      {/* Ambient glow */}
      <pointLight 
        position={[0, 0.5, 0]} 
        color="#8866aa" 
        intensity={1.5} 
        distance={4}
      />
      
      {/* Secondary glow in "head" */}
      <pointLight 
        position={[0, 1.2, 0.2]} 
        color="#aa88cc" 
        intensity={0.5} 
        distance={2}
      />
    </group>
  );
}

/**
 * Paper torso - main body made of layered paper
 */
function PaperTorso() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    // Subtle breathing/rustling animation
    const time = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      child.rotation.y = Math.sin(time * 2 + i * 0.5) * 0.05;
      child.rotation.z = Math.cos(time * 1.5 + i * 0.3) * 0.03;
    });
  });
  
  return (
    <group ref={groupRef}>
      {/* Layered paper sheets forming torso */}
      {Array.from({ length: 8 }).map((_, i) => {
        const y = i * 0.15 - 0.5;
        const scale = 1 - Math.abs(i - 4) * 0.1;
        const rotation = i * 0.3;
        
        return (
          <mesh 
            key={i} 
            position={[0, y, 0]} 
            rotation={[0, rotation, 0]}
            scale={[scale, 1, scale]}
          >
            <boxGeometry args={[0.8, 0.08, 0.6]} />
            <meshStandardMaterial 
              color="#d4c5a0"
              emissive="#665544"
              emissiveIntensity={0.2}
              roughness={0.9}
              transparent
              opacity={0.85}
            />
          </mesh>
        );
      })}
      
      {/* Ink veins effect */}
      {[0, 1, 2, 3].map((i) => (
        <mesh 
          key={`vein-${i}`}
          position={[
            Math.sin(i * Math.PI / 2) * 0.3,
            -0.2,
            Math.cos(i * Math.PI / 2) * 0.2
          ]}
          rotation={[0, i * Math.PI / 2, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.02, 0.015, 0.8, 6]} />
          <meshStandardMaterial 
            color="#3a2a4a"
            emissive="#6644aa"
            emissiveIntensity={0.4}
            roughness={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Paper head - shifting collage of text
 */
function PaperHead({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    // Subtle wobble
    const time = state.clock.elapsedTime;
    meshRef.current.rotation.z = Math.sin(time * 3) * 0.05;
    meshRef.current.rotation.x = Math.cos(time * 2) * 0.03;
  });
  
  return (
    <group position={position}>
      {/* Main head shape - faceted */}
      <mesh ref={meshRef}>
        <dodecahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial 
          color="#e8e0d0"
          emissive="#aa88cc"
          emissiveIntensity={0.15}
          roughness={0.8}
          flatShading
        />
      </mesh>
      
      {/* "Eyes" - text fragments */}
      <mesh position={[-0.1, 0.05, 0.3]}>
        <planeGeometry args={[0.08, 0.03]} />
        <meshBasicMaterial color="#1a1a3a" />
      </mesh>
      <mesh position={[0.1, 0.05, 0.3]}>
        <planeGeometry args={[0.08, 0.03]} />
        <meshBasicMaterial color="#1a1a3a" />
      </mesh>
    </group>
  );
}

/**
 * Paper arm - tendril of folded pages
 */
function PaperArm({ 
  position, 
  side 
}: { 
  position: [number, number, number]; 
  side: 'left' | 'right';
}) {
  const groupRef = useRef<THREE.Group>(null);
  const direction = side === 'left' ? -1 : 1;
  
  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.elapsedTime;
    // Waving motion
    groupRef.current.rotation.z = 
      direction * (0.3 + Math.sin(time * 2 + (side === 'left' ? 0 : Math.PI)) * 0.2);
    groupRef.current.rotation.x = Math.sin(time * 1.5) * 0.1;
  });
  
  return (
    <group ref={groupRef} position={position}>
      {/* Arm segments */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh 
          key={i} 
          position={[direction * i * 0.15, -i * 0.08, 0]}
          rotation={[0, 0, direction * i * 0.1]}
        >
          <boxGeometry args={[0.15, 0.06, 0.12]} />
          <meshStandardMaterial 
            color="#d4c5a0"
            emissive="#554433"
            emissiveIntensity={0.15}
            roughness={0.9}
            transparent
            opacity={0.9 - i * 0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Floating paper particles around the guardian
 */
function PaperParticles({ count, radius }: { count: number; radius: number }) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Generate particle data
  const particles = useRef(
    Array.from({ length: count }).map(() => ({
      angle: Math.random() * Math.PI * 2,
      height: (Math.random() - 0.5) * 2,
      distance: 0.5 + Math.random() * radius,
      speed: 0.3 + Math.random() * 0.5,
      size: 0.03 + Math.random() * 0.05,
      rotSpeed: (Math.random() - 0.5) * 2,
    }))
  ).current;
  
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    groupRef.current.children.forEach((child, i) => {
      const p = particles[i];
      const angle = p.angle + time * p.speed;
      
      child.position.x = Math.cos(angle) * p.distance;
      child.position.y = p.height + Math.sin(time * 1.5 + i) * 0.2;
      child.position.z = Math.sin(angle) * p.distance;
      child.rotation.y = time * p.rotSpeed;
      child.rotation.x = time * p.rotSpeed * 0.5;
    });
  });
  
  return (
    <group ref={groupRef}>
      {particles.map((p, i) => (
        <mesh key={i}>
          <planeGeometry args={[p.size, p.size * 1.4]} />
          <meshStandardMaterial 
            color="#e8e0d0"
            emissive="#aa9988"
            emissiveIntensity={0.2}
            roughness={0.95}
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

export default GrimoireGuardian;
