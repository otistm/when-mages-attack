/**
 * Bookshelf - Contains hidden compartment with sigil stone
 * Sigil #1: Found in secret compartment behind books
 */

import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { InteractableObject } from '../InteractableObject';
import { usePuzzleStore } from '@/stores/puzzleStore';
import type { Interactable } from '@/types/interaction';
import { OFFICE_TOON_COLORS, useOfficeToonGradient } from './officeToon';

interface BookshelfProps {
  position: [number, number, number];
  rotation?: [number, number, number];
}

export function Bookshelf({ position, rotation = [0, 0, 0] }: BookshelfProps) {
  const toonGradient = useOfficeToonGradient();
  const hasSigil = usePuzzleStore(s => s.hasSigil('bookshelf'));
  const findSigil = usePuzzleStore(s => s.findSigil);
  
  const hiddenCompartmentInteractable: Interactable = {
    id: 'bookshelf_compartment',
    type: 'examine',
    promptText: hasSigil ? 'Empty compartment' : 'Search behind books',
    interactionRange: 2,
    highlightRange: 4,
    oneTime: true,
    description: 'A suspicious gap between the books...',
  };
  
  return (
    <group position={position} rotation={rotation}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.25, 1.1, 0.8]} position={[0, 1.1, 0]} />
        
        {/* Main frame */}
        <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 2.2, 1.6]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.woodDark} gradientMap={toonGradient} />
        </mesh>
        
        {/* Shelves */}
        {[0.4, 0.9, 1.4, 1.9].map((y, i) => (
          <mesh key={i} position={[0.05, y, 0]} castShadow>
            <boxGeometry args={[0.38, 0.04, 1.5]} />
            <meshToonMaterial color={OFFICE_TOON_COLORS.woodMid} gradientMap={toonGradient} />
          </mesh>
        ))}
      </RigidBody>
      
      {/* Books on shelves */}
      <BookRows />
      
      {/* Hidden compartment - interactive */}
      <InteractableObject 
        interactable={hiddenCompartmentInteractable}
        position={[0.1, 1.15, -0.2]}
        onInteract={() => {
          if (!hasSigil) {
            findSigil('bookshelf');
          }
        }}
      >
        {/* The "suspicious books" that hide the compartment */}
        <group>
          {/* Slightly askew book */}
            <mesh position={[0, 0, 0]} rotation={[0, 0.1, 0.05]} castShadow>
            <boxGeometry args={[0.12, 0.2, 0.15]} />
              <meshToonMaterial 
                color="#8a4a3a" 
                emissive={hasSigil ? "#000000" : "#442211"}
                emissiveIntensity={0.2}
                gradientMap={toonGradient}
              />
          </mesh>
          
          {/* Gap behind (sigil glow if not collected) */}
          {!hasSigil && (
            <pointLight 
              position={[-0.1, 0, 0]} 
              color="#d4af37" 
              intensity={0.3} 
              distance={0.5}
            />
          )}
        </group>
      </InteractableObject>
      
      {/* Decorative elements */}
      <BookshelfDecor />
    </group>
  );
}

/**
 * Rows of books
 */
function BookRows() {
  const toonGradient = useOfficeToonGradient();
  const bookColors = [
    '#6a4a3a', '#4a5a6a', '#5a3a4a', '#3a5a4a', 
    '#6a5a4a', '#4a3a5a', '#5a4a3a', '#3a4a5a'
  ];
  
  // Generate books for each shelf
  const shelves = [
    { y: 0.44, books: 8 },
    { y: 0.94, books: 7 },
    { y: 1.44, books: 6 },
    { y: 1.94, books: 5 },
  ];
  
  return (
    <group>
      {shelves.map((shelf, si) => (
        <group key={si}>
          {Array.from({ length: shelf.books }).map((_, bi) => {
            const height = 0.15 + Math.random() * 0.1;
            const width = 0.06 + Math.random() * 0.04;
            const zOffset = -0.6 + bi * 0.18 + Math.random() * 0.02;
            // Skip the compartment area on shelf 2
            if (si === 2 && bi >= 2 && bi <= 3) return null;
            
            return (
              <mesh 
                key={bi}
                position={[0.1, shelf.y + height / 2 + 0.02, zOffset]}
                rotation={[0, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.05]}
                castShadow
              >
                <boxGeometry args={[width, height, 0.12]} />
                <meshToonMaterial 
                  color={bookColors[bi % bookColors.length]} 
                  gradientMap={toonGradient}
                />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}

/**
 * Decorative items on bookshelf
 */
function BookshelfDecor() {
  const toonGradient = useOfficeToonGradient();
  return (
    <group>
      {/* Small globe on top shelf */}
      <mesh position={[0.1, 2.1, 0.5]} castShadow>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshToonMaterial color="#5a7a8a" gradientMap={toonGradient} />
      </mesh>
      <mesh position={[0.1, 2.0, 0.5]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 0.04, 8]} />
        <meshToonMaterial color={OFFICE_TOON_COLORS.metalGold} gradientMap={toonGradient} />
      </mesh>
      
      {/* Candle holder */}
      <mesh position={[0.1, 2.02, -0.5]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 0.04, 8]} />
        <meshToonMaterial color={OFFICE_TOON_COLORS.metalGold} gradientMap={toonGradient} />
      </mesh>
      <mesh position={[0.1, 2.08, -0.5]} castShadow>
        <cylinderGeometry args={[0.015, 0.02, 0.08, 8]} />
        <meshToonMaterial color={OFFICE_TOON_COLORS.parchment} gradientMap={toonGradient} />
      </mesh>
      
      {/* Fallen book on floor */}
      <mesh position={[0.3, 0.08, 0.2]} rotation={[0, 0.5, Math.PI / 2 - 0.1]} castShadow>
        <boxGeometry args={[0.15, 0.08, 0.2]} />
        <meshToonMaterial color="#5a4a3a" gradientMap={toonGradient} />
      </mesh>
    </group>
  );
}

export default Bookshelf;
