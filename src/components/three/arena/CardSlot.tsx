/**
 * CardSlot - Where cards are placed before battle
 * Each player has 5 slots, minions/projectiles spawn from placed cards
 */

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box } from '@react-three/drei';
import * as THREE from 'three';
import { Team, CardSlotConfig } from '@/types';

interface CardSlotProps {
  slot: CardSlotConfig;
  team: Team;
  zPosition: number;
  hasCard?: boolean;
  isHighlighted?: boolean;
  onSlotClick?: (slotIndex: number) => void;
}

export function CardSlot({ 
  slot, 
  team, 
  zPosition, 
  hasCard = false,
  isHighlighted = false,
  onSlotClick 
}: CardSlotProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  // Team colors
  const baseColor = team === 'player' ? '#1a3a2e' : '#3a1a1a';
  const borderColor = team === 'player' ? '#00ff88' : '#ff4444';
  const glowColor = team === 'player' ? '#00ff88' : '#ff4444';
  
  // Animate the slot
  useFrame(({ clock }) => {
    if (glowRef.current) {
      const pulse = Math.sin(clock.elapsedTime * 2 + slot.index) * 0.15 + 0.85;
      const targetOpacity = hasCard ? 0.6 : (hovered || isHighlighted ? 0.4 : 0.2);
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = targetOpacity * pulse;
    }
    
    // Subtle float animation when highlighted
    if (groupRef.current && isHighlighted) {
      groupRef.current.position.y = Math.sin(clock.elapsedTime * 3) * 0.05;
    }
  });
  
  const handleClick = () => {
    onSlotClick?.(slot.index);
  };
  
  return (
    <group 
      ref={groupRef}
      position={[slot.xPosition, 0, zPosition]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={handleClick}
    >
      {/* Base platform */}
      <Box
        args={[2.2, 0.15, 3]}
        position={[0, 0.075, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={baseColor}
          roughness={0.6}
          metalness={0.4}
        />
      </Box>
      
      {/* Glowing border */}
      <mesh 
        ref={glowRef}
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0.16, 0]}
      >
        <ringGeometry args={[0.9, 1.05, 4]} />
        <meshBasicMaterial
          color={borderColor}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Inner card area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.16, 0]}>
        <planeGeometry args={[1.8, 2.6]} />
        <meshBasicMaterial
          color={hasCard ? glowColor : '#0a0a0a'}
          transparent
          opacity={hasCard ? 0.3 : 0.5}
        />
      </mesh>
      
      {/* Corner runes */}
      {[[-0.8, -1.1], [0.8, -1.1], [-0.8, 1.1], [0.8, 1.1]].map(([x, z], i) => (
        <mesh
          key={i}
          position={[x, 0.17, z]}
          rotation={[-Math.PI / 2, 0, Math.PI / 4]}
        >
          <boxGeometry args={[0.15, 0.15, 0.02]} />
          <meshBasicMaterial 
            color={borderColor} 
            transparent 
            opacity={0.6} 
          />
        </mesh>
      ))}
      
      {/* Slot number indicator */}
      <mesh position={[0, 0.17, 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.15, 16]} />
        <meshBasicMaterial color={borderColor} transparent opacity={0.5} />
      </mesh>
      
      {/* Hover highlight effect */}
      {(hovered || isHighlighted) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.18, 0]}>
          <planeGeometry args={[2.4, 3.2]} />
          <meshBasicMaterial
            color={glowColor}
            transparent
            opacity={0.1}
          />
        </mesh>
      )}
      
      {/* Card placement indicator when empty */}
      {!hasCard && (
        <group position={[0, 0.2, 0]}>
          {/* Plus sign */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.4, 0.1]} />
            <meshBasicMaterial 
              color={borderColor} 
              transparent 
              opacity={0.3} 
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.1, 0.4]} />
            <meshBasicMaterial 
              color={borderColor} 
              transparent 
              opacity={0.3} 
            />
          </mesh>
        </group>
      )}
    </group>
  );
}

export default CardSlot;
