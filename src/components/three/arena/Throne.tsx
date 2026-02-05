/**
 * Throne - Player and enemy base positions
 * Simple geometric throne without floating orbs
 */

import { Box } from '@react-three/drei';
import { Team } from '@/types';

interface ThroneProps {
  position: [number, number, number];
  team: Team;
}

export function Throne({ position, team }: ThroneProps) {
  const primaryColor = team === 'player' ? '#d4af37' : '#8b0000';
  const accentColor = team === 'player' ? '#4a2c6a' : '#2a0a1a';
  
  return (
    <group position={position}>
      {/* Base platform - octagonal */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.5, 3, 0.5, 8]} />
        <meshStandardMaterial
          color={accentColor}
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>
      
      {/* Second step */}
      <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.8, 2.2, 0.3, 8]} />
        <meshStandardMaterial
          color={accentColor}
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>
      
      {/* Throne seat */}
      <Box args={[1.5, 1.5, 1]} position={[0, 1.55, 0]} castShadow receiveShadow>
        <meshStandardMaterial
          color={primaryColor}
          roughness={0.3}
          metalness={0.7}
        />
      </Box>
      
      {/* Throne back */}
      <Box args={[1.8, 2.5, 0.3]} position={[0, 2.5, -0.35]} castShadow receiveShadow>
        <meshStandardMaterial
          color={primaryColor}
          roughness={0.3}
          metalness={0.7}
        />
      </Box>
    </group>
  );
}

export default Throne;
