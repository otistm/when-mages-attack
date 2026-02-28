/**
 * Impact Effect - Visual feedback for hits
 */

import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCombatStore } from '@/stores/combatStore';

export function ImpactEffects() {
  const lastAttackEvent = useCombatStore((state) => state.lastAttackEvent);
  const [effects, setEffects] = useState<ImpactData[]>([]);
  
  // Listen for attack events
  useEffect(() => {
    if (lastAttackEvent) {
      const newEffect: ImpactData = {
        id: `${Date.now()}-${Math.random()}`,
        position: lastAttackEvent.position,
        color: lastAttackEvent.isCritical ? '#ffff00' : '#ff8800',
        scale: lastAttackEvent.isCritical ? 1.5 : 1,
        createdAt: Date.now(),
      };
      
      setEffects((prev) => [...prev, newEffect]);
      
      // Clean up after animation
      setTimeout(() => {
        setEffects((prev) => prev.filter((e) => e.id !== newEffect.id));
      }, 500);
    }
  }, [lastAttackEvent]);
  
  return (
    <group>
      {effects.map((effect) => (
        <ImpactBurst key={effect.id} {...effect} />
      ))}
    </group>
  );
}

interface ImpactData {
  id: string;
  position: [number, number, number];
  color: string;
  scale: number;
  createdAt: number;
}

function ImpactBurst({ position, color, scale, createdAt }: ImpactData) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringsRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    const elapsed = (Date.now() - createdAt) / 1000;
    const progress = Math.min(elapsed / 0.3, 1);
    
    if (meshRef.current) {
      // Expand and fade
      meshRef.current.scale.setScalar(scale * (1 + progress * 2));
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity = 1 - progress;
    }
    
    if (ringsRef.current) {
      ringsRef.current.children.forEach((ring, i) => {
        const ringProgress = Math.min((elapsed - i * 0.05) / 0.25, 1);
        if (ringProgress > 0) {
          ring.scale.setScalar(scale * (1 + ringProgress * 3));
          ((ring as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 - ringProgress);
        }
      });
    }
  });
  
  return (
    <group position={position}>
      {/* Central flash */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={1} />
      </mesh>
      
      {/* Expanding rings */}
      <group ref={ringsRef}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.2, 0.25, 16]} />
            <meshBasicMaterial 
              color={color} 
              transparent 
              opacity={0} 
              side={THREE.DoubleSide} 
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default ImpactEffects;
