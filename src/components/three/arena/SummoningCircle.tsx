/**
 * SummoningCircle - Simple card placement slot indicator
 * 
 * Shows a "+" cross where cards can be placed.
 * Minimal design - just the cross indicator.
 */

import { useRef, useState } from 'react';
import { useSpring, animated, config } from '@react-spring/three';
import * as THREE from 'three';
import { Team, CardSlotConfig } from '@/types';

interface SummoningCircleProps {
  slot: CardSlotConfig;
  team: Team;
  zPosition: number;
  hasCard?: boolean;
  isHighlighted?: boolean;
  onSlotClick?: (slotIndex: number) => void;
}

export function SummoningCircle({ 
  slot, 
  team, 
  zPosition, 
  hasCard = false,
  onSlotClick 
}: SummoningCircleProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  // Team-based colors
  const colors = {
    player: {
      cross: '#2a4a3a',
      crossHover: '#00ff88',
    },
    enemy: {
      cross: '#4a2a2a',
      crossHover: '#ff4444',
    }
  };
  
  const teamColors = colors[team];
  
  // Spring for hover effect - only scale for cel-shaded look
  const { scale } = useSpring({
    scale: hovered ? 1.15 : 1,
    config: config.gentle,
  });
  
  const handleClick = () => {
    onSlotClick?.(slot.index);
  };

  // Don't render if a card is placed here
  if (hasCard) return null;
  
  // Cel-shaded cross with black outline
  const crossWidth = 0.8;
  const crossThickness = 0.15;
  const outlineSize = 0.04;
  
  return (
    <animated.group
      ref={groupRef}
      position={[slot.xPosition, 0.05, zPosition]}
      scale={scale}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={handleClick}
    >
      {/* Black outline - horizontal */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
        <planeGeometry args={[crossWidth + outlineSize * 2, crossThickness + outlineSize * 2]} />
        <meshBasicMaterial color="#111111" side={THREE.DoubleSide} />
      </mesh>
      
      {/* Black outline - vertical */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
        <planeGeometry args={[crossThickness + outlineSize * 2, crossWidth + outlineSize * 2]} />
        <meshBasicMaterial color="#111111" side={THREE.DoubleSide} />
      </mesh>
      
      {/* Horizontal bar of the cross - flat color */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[crossWidth, crossThickness]} />
        <meshBasicMaterial
          color={hovered ? teamColors.crossHover : teamColors.cross}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Vertical bar of the cross - flat color */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[crossThickness, crossWidth]} />
        <meshBasicMaterial
          color={hovered ? teamColors.crossHover : teamColors.cross}
          side={THREE.DoubleSide}
        />
      </mesh>
    </animated.group>
  );
}

export default SummoningCircle;
