/**
 * CoatRack - Contains sigil stone in coat pocket
 * Sigil #3: Found in the coat pocket
 */

import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { InteractableObject } from '../InteractableObject';
import { usePuzzleStore } from '@/stores/puzzleStore';
import type { Interactable } from '@/types/interaction';
import { OFFICE_TOON_COLORS, useOfficeToonGradient } from './officeToon';

interface CoatRackProps {
  position: [number, number, number];
  rotation?: [number, number, number];
}

export function CoatRack({ position, rotation = [0, 0, 0] }: CoatRackProps) {
  const toonGradient = useOfficeToonGradient();
  const hasSigil = usePuzzleStore(s => s.hasSigil('coat'));
  const findSigil = usePuzzleStore(s => s.findSigil);
  
  const coatInteractable: Interactable = {
    id: 'coat_pocket',
    type: 'examine',
    promptText: hasSigil ? 'Old coat (searched)' : 'Search coat pockets',
    interactionRange: 2,
    highlightRange: 4,
    oneTime: true,
    description: 'A dusty old coat hangs limply. The pockets bulge slightly.',
  };
  
  return (
    <group position={position} rotation={rotation}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.15, 0.9, 0.15]} position={[0, 0.9, 0]} />
        
        {/* Base */}
        <mesh position={[0, 0.02, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.25, 0.04, 12]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.metalDark} gradientMap={toonGradient} />
        </mesh>
        
        {/* Pole */}
        <mesh position={[0, 0.95, 0]} castShadow>
          <cylinderGeometry args={[0.025, 0.03, 1.8, 8]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.metalMid} gradientMap={toonGradient} />
        </mesh>
        
        {/* Top cap */}
        <mesh position={[0, 1.87, 0]} castShadow>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.metalMid} gradientMap={toonGradient} />
        </mesh>
        
        {/* Hooks */}
        {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, i) => (
          <group key={i} position={[0, 1.7, 0]} rotation={[0, angle, 0]}>
            <mesh position={[0.08, 0, 0]} rotation={[0, 0, -Math.PI / 4]} castShadow>
              <cylinderGeometry args={[0.01, 0.01, 0.12, 6]} />
              <meshToonMaterial color={OFFICE_TOON_COLORS.metalMid} gradientMap={toonGradient} />
            </mesh>
            <mesh position={[0.12, -0.03, 0]} castShadow>
              <sphereGeometry args={[0.015, 6, 6]} />
              <meshToonMaterial color={OFFICE_TOON_COLORS.metalMid} gradientMap={toonGradient} />
            </mesh>
          </group>
        ))}
      </RigidBody>
      
      {/* Old coat hanging - Interactive */}
      <InteractableObject 
        interactable={coatInteractable}
        position={[0.08, 1.3, 0]}
        onInteract={() => {
          if (!hasSigil) {
            findSigil('coat');
          }
        }}
      >
        <group rotation={[0.05, 0.2, 0]}>
          {/* Coat body */}
          <mesh castShadow>
            <boxGeometry args={[0.35, 0.7, 0.15]} />
            <meshToonMaterial 
              color="#3a3a4a" 
              emissive={hasSigil ? "#000000" : "#111122"}
              emissiveIntensity={0.2}
              gradientMap={toonGradient}
            />
          </mesh>
          
          {/* Collar */}
          <mesh position={[0, 0.35, 0.03]} castShadow>
            <boxGeometry args={[0.2, 0.08, 0.08]} />
            <meshToonMaterial color="#2a2a3a" gradientMap={toonGradient} />
          </mesh>
          
          {/* Left sleeve */}
          <mesh position={[-0.22, 0.1, 0]} rotation={[0, 0, 0.3]} castShadow>
            <boxGeometry args={[0.12, 0.5, 0.1]} />
            <meshToonMaterial color="#3a3a4a" gradientMap={toonGradient} />
          </mesh>
          
          {/* Right sleeve */}
          <mesh position={[0.22, 0.05, 0]} rotation={[0, 0, -0.2]} castShadow>
            <boxGeometry args={[0.12, 0.55, 0.1]} />
            <meshToonMaterial color="#3a3a4a" gradientMap={toonGradient} />
          </mesh>
          
          {/* Pocket bulge (sigil hint) */}
          {!hasSigil && (
            <>
              <mesh position={[-0.1, -0.15, 0.08]} castShadow>
                <sphereGeometry args={[0.04, 8, 8]} />
                <meshToonMaterial color="#3a3a4a" gradientMap={toonGradient} />
              </mesh>
              <pointLight 
                position={[-0.1, -0.15, 0.1]} 
                color="#d4af37" 
                intensity={0.15} 
                distance={0.3}
              />
            </>
          )}
        </group>
      </InteractableObject>
      
      {/* Umbrella stand */}
      <group position={[0.3, 0, 0]}>
        <mesh position={[0, 0.25, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.12, 0.5, 10]} />
          <meshToonMaterial color="#5a4a3a" gradientMap={toonGradient} />
        </mesh>
        
        {/* Umbrella */}
        <mesh position={[0, 0.55, 0]} rotation={[0.1, 0, 0.05]} castShadow>
          <cylinderGeometry args={[0.015, 0.012, 0.8, 6]} />
          <meshToonMaterial color="#2a2a2a" gradientMap={toonGradient} />
        </mesh>
        <mesh position={[0, 0.95, 0]} castShadow>
          <sphereGeometry args={[0.03, 6, 6]} />
          <meshToonMaterial color="#4a3a2a" gradientMap={toonGradient} />
        </mesh>
      </group>
    </group>
  );
}

export default CoatRack;
