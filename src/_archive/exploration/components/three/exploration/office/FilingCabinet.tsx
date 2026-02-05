/**
 * FilingCabinet - Contains sigil stone in one of the drawers
 * Sigil #2: Found in the middle drawer
 */

import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { InteractableObject } from '../InteractableObject';
import { usePuzzleStore } from '@/stores/puzzleStore';
import type { Interactable } from '@/types/interaction';
import { OFFICE_TOON_COLORS, useOfficeToonGradient } from './officeToon';

interface FilingCabinetProps {
  position: [number, number, number];
  rotation?: [number, number, number];
}

export function FilingCabinet({ position, rotation = [0, 0, 0] }: FilingCabinetProps) {
  const toonGradient = useOfficeToonGradient();
  const hasSigil = usePuzzleStore(s => s.hasSigil('cabinet'));
  const findSigil = usePuzzleStore(s => s.findSigil);
  
  const drawerInteractable: Interactable = {
    id: 'filing_cabinet_drawer',
    type: 'examine',
    promptText: hasSigil ? 'Empty drawer' : 'Search drawer',
    interactionRange: 2,
    highlightRange: 4,
    oneTime: true,
    description: 'A rusty filing cabinet. The middle drawer is slightly ajar.',
  };
  
  return (
    <group position={position} rotation={rotation}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.25, 0.7, 0.3]} position={[0, 0.7, 0]} />
        
        {/* Main cabinet body */}
        <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 1.4, 0.6]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.wall} gradientMap={toonGradient} />
        </mesh>
      </RigidBody>
      
      {/* Drawers */}
      <FilingDrawer position={[0, 1.2, 0.25]} isOpen={false} />
      
      {/* Middle drawer - interactive, slightly open */}
      <InteractableObject 
        interactable={drawerInteractable}
        position={[0, 0.7, 0.35]}
        onInteract={() => {
          if (!hasSigil) {
            findSigil('cabinet');
          }
        }}
      >
        <group>
          {/* Drawer front */}
          <mesh castShadow>
            <boxGeometry args={[0.45, 0.35, 0.08]} />
            <meshToonMaterial 
              color="#6a6a6a" 
              emissive={hasSigil ? "#000000" : "#221100"}
              emissiveIntensity={0.3}
              gradientMap={toonGradient}
            />
          </mesh>
          {/* Handle */}
          <mesh position={[0, 0, 0.05]} castShadow>
            <boxGeometry args={[0.1, 0.03, 0.03]} />
            <meshToonMaterial color="#888888" gradientMap={toonGradient} />
          </mesh>
          
          {/* Glow hint if sigil present */}
          {!hasSigil && (
            <pointLight 
              position={[0, 0, -0.1]} 
              color="#d4af37" 
              intensity={0.2} 
              distance={0.4}
            />
          )}
        </group>
      </InteractableObject>
      
      <FilingDrawer position={[0, 0.25, 0.25]} isOpen={false} />
      
      {/* Label holder */}
      <mesh position={[0, 1.2, 0.26]} castShadow>
        <boxGeometry args={[0.12, 0.06, 0.01]} />
        <meshToonMaterial color="#888888" gradientMap={toonGradient} />
      </mesh>
      
      {/* Dust on top */}
      <mesh position={[0, 1.41, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.48, 0.58]} />
        <meshToonMaterial 
          color={OFFICE_TOON_COLORS.dust} 
          transparent
          opacity={0.3}
          gradientMap={toonGradient}
        />
      </mesh>
    </group>
  );
}

/**
 * Filing drawer (non-interactive)
 */
function FilingDrawer({ 
  position, 
  isOpen 
}: { 
  position: [number, number, number]; 
  isOpen: boolean;
}) {
  const toonGradient = useOfficeToonGradient();
  return (
    <group position={position}>
      {/* Drawer front */}
      <mesh position={[0, 0, isOpen ? 0.15 : 0]} castShadow>
        <boxGeometry args={[0.45, 0.35, 0.08]} />
        <meshToonMaterial color="#6a6a6a" gradientMap={toonGradient} />
      </mesh>
      {/* Handle */}
      <mesh position={[0, 0, isOpen ? 0.2 : 0.05]} castShadow>
        <boxGeometry args={[0.1, 0.03, 0.03]} />
        <meshToonMaterial color="#888888" gradientMap={toonGradient} />
      </mesh>
    </group>
  );
}

export default FilingCabinet;
