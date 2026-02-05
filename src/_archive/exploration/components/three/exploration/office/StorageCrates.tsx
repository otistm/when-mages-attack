/**
 * StorageCrates - Crates hiding a crawlspace with the hidden key
 * Key puzzle: Find the key in the crawlspace behind the crates
 */

import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { InteractableObject } from '../InteractableObject';
import { usePuzzleStore } from '@/stores/puzzleStore';
import type { Interactable } from '@/types/interaction';
import { OFFICE_TOON_COLORS, useOfficeToonGradient } from './officeToon';

interface StorageCratesProps {
  position: [number, number, number];
  rotation?: [number, number, number];
}

export function StorageCrates({ position, rotation = [0, 0, 0] }: StorageCratesProps) {
  const toonGradient = useOfficeToonGradient();
  const crawlspaceDiscovered = usePuzzleStore(s => s.crawlspaceDiscovered);
  const discoverCrawlspace = usePuzzleStore(s => s.discoverCrawlspace);
  const keyFound = usePuzzleStore(s => s.keyFound);
  const findKey = usePuzzleStore(s => s.findKey);
  
  const cratesInteractable: Interactable = {
    id: 'storage_crates',
    type: 'examine',
    promptText: crawlspaceDiscovered ? 'Crates (moved)' : 'Move crates aside',
    interactionRange: 2.5,
    highlightRange: 5,
    oneTime: true,
    description: 'Old supply crates. There seems to be a gap behind them...',
  };
  
  const crawlspaceInteractable: Interactable = {
    id: 'crawlspace_key',
    type: 'collect',
    promptText: keyFound ? 'Empty crawlspace' : 'Reach into crawlspace',
    interactionRange: 2,
    highlightRange: 4,
    oneTime: true,
    description: 'A dark crawlspace behind the crates. Something glints in the darkness.',
  };
  
  return (
    <group position={position} rotation={rotation}>
      {/* Main crate stack - interactive to reveal crawlspace */}
      <InteractableObject 
        interactable={cratesInteractable}
        position={[0, 0.4, 0]}
        onInteract={() => discoverCrawlspace()}
      >
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[0.5, 0.4, 0.4]} position={[0, 0, 0]} />
          
          {/* Large crate */}
          <mesh 
            position={crawlspaceDiscovered ? [-0.3, 0, 0.2] : [0, 0, 0]} 
            rotation={crawlspaceDiscovered ? [0, 0.2, 0] : [0, 0, 0]}
            castShadow
          >
            <boxGeometry args={[0.8, 0.6, 0.6]} />
            <meshToonMaterial color="#6a5a4a" gradientMap={toonGradient} />
          </mesh>
          
          {/* Crate planks */}
          <mesh 
            position={crawlspaceDiscovered ? [-0.3, 0.31, 0.2] : [0, 0.31, 0]} 
            rotation={crawlspaceDiscovered ? [0, 0.2, 0] : [0, 0, 0]}
          >
            <boxGeometry args={[0.82, 0.02, 0.62]} />
            <meshToonMaterial color="#5a4a3a" gradientMap={toonGradient} />
          </mesh>
        </RigidBody>
      </InteractableObject>
      
      {/* Smaller crate on top */}
      <mesh 
        position={crawlspaceDiscovered ? [-0.4, 0.9, 0.3] : [-0.1, 0.85, 0.05]} 
        rotation={[0, crawlspaceDiscovered ? 0.4 : 0.15, 0]}
        castShadow
      >
        <boxGeometry args={[0.5, 0.4, 0.4]} />
        <meshToonMaterial color="#7a6a5a" gradientMap={toonGradient} />
      </mesh>
      
      {/* Side crate */}
      <mesh position={[0.6, 0.25, -0.1]} rotation={[0, -0.1, 0]} castShadow>
        <boxGeometry args={[0.45, 0.5, 0.45]} />
        <meshToonMaterial color="#5a5040" gradientMap={toonGradient} />
      </mesh>
      
      {/* Crawlspace - only visible/interactive after crates moved */}
      {crawlspaceDiscovered && (
        <InteractableObject 
          interactable={crawlspaceInteractable}
          position={[0.2, 0.2, -0.4]}
          onInteract={() => {
            if (!keyFound) {
              findKey();
            }
          }}
        >
          <group>
            {/* Dark hole in wall */}
            <mesh>
              <boxGeometry args={[0.6, 0.4, 0.3]} />
              <meshToonMaterial color="#1a1a1a" gradientMap={toonGradient} />
            </mesh>
            
            {/* Key glint if not collected */}
            {!keyFound && (
              <>
                <mesh position={[0.1, -0.05, 0]}>
                  <cylinderGeometry args={[0.015, 0.015, 0.08, 6]} />
                  <meshToonMaterial 
                    color={OFFICE_TOON_COLORS.metalGold} 
                    emissive={OFFICE_TOON_COLORS.metalGold}
                    emissiveIntensity={0.5}
                    gradientMap={toonGradient}
                  />
                </mesh>
                <pointLight 
                  position={[0.1, 0, 0]} 
                  color="#ffcc66" 
                  intensity={0.3} 
                  distance={0.5}
                />
              </>
            )}
          </group>
        </InteractableObject>
      )}
      
      {/* Scattered supplies */}
      <SupplyClutter />
    </group>
  );
}

/**
 * Scattered supplies around crates
 */
function SupplyClutter() {
  const toonGradient = useOfficeToonGradient();
  return (
    <group>
      {/* Rope coil */}
      <mesh position={[-0.5, 0.08, 0.5]} rotation={[-Math.PI / 2, 0, 0.3]}>
        <torusGeometry args={[0.1, 0.02, 8, 16]} />
        <meshToonMaterial color="#8a7a5a" gradientMap={toonGradient} />
      </mesh>
      
      {/* Canvas sack */}
      <mesh position={[0.8, 0.12, 0.3]} castShadow>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshToonMaterial color="#9a8a6a" gradientMap={toonGradient} />
      </mesh>
      
      {/* Broken bottle */}
      <mesh position={[-0.7, 0.06, -0.2]} rotation={[Math.PI / 2 - 0.2, 0, 0.5]}>
        <cylinderGeometry args={[0.025, 0.03, 0.12, 8]} />
        <meshToonMaterial 
          color="#668866" 
          transparent 
          opacity={0.5}
          gradientMap={toonGradient}
        />
      </mesh>
      
      {/* Old lantern */}
      <group position={[0.3, 0.65, 0.5]}>
        <mesh castShadow>
          <boxGeometry args={[0.08, 0.12, 0.08]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.metalDark} gradientMap={toonGradient} />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.04, 6]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.metalMid} gradientMap={toonGradient} />
        </mesh>
      </group>
    </group>
  );
}

export default StorageCrates;
