/**
 * ArmchairNook - Cozy reading area with the personal journal
 * The journal contains hints about the sigil arrangement
 */

import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { InteractableObject } from '../InteractableObject';
import { usePuzzleStore } from '@/stores/puzzleStore';
import type { Interactable } from '@/types/interaction';
import { OFFICE_TOON_COLORS, useOfficeToonGradient } from './officeToon';

interface ArmchairNookProps {
  position: [number, number, number];
  rotation?: [number, number, number];
}

export function ArmchairNook({ position, rotation = [0, 0, 0] }: ArmchairNookProps) {
  const toonGradient = useOfficeToonGradient();
  const journalRead = usePuzzleStore(s => s.journalRead);
  const readJournal = usePuzzleStore(s => s.readJournal);
  
  const journalInteractable: Interactable = {
    id: 'personal_journal',
    type: 'examine',
    promptText: 'Read journal',
    interactionRange: 2,
    highlightRange: 5,
    oneTime: false, // Can re-read
    grantsPage: 'lore_last_entry',
    cameraFocus: true,
    description: 'A worn leather journal. The last entry is still open...',
  };
  
  return (
    <group position={position} rotation={rotation}>
      {/* Armchair */}
      <Armchair />
      
      {/* Side table with journal */}
      <group position={[0.8, 0, 0.3]}>
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[0.25, 0.3, 0.25]} position={[0, 0.3, 0]} />
          
          {/* Table top */}
          <mesh position={[0, 0.55, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.28, 0.04, 12]} />
            <meshToonMaterial color={OFFICE_TOON_COLORS.woodMid} gradientMap={toonGradient} />
          </mesh>
          
          {/* Table leg */}
          <mesh position={[0, 0.28, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.08, 0.5, 8]} />
            <meshToonMaterial color={OFFICE_TOON_COLORS.woodDark} gradientMap={toonGradient} />
          </mesh>
          
          {/* Table base */}
          <mesh position={[0, 0.02, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.22, 0.04, 12]} />
            <meshToonMaterial color={OFFICE_TOON_COLORS.woodDark} gradientMap={toonGradient} />
          </mesh>
        </RigidBody>
        
        {/* Journal on table - Interactive */}
        <InteractableObject 
          interactable={journalInteractable}
          position={[0, 0.6, 0]}
          onInteract={() => readJournal()}
        >
          <group rotation={[0.1, 0.3, 0]}>
            {/* Journal cover */}
            <mesh castShadow>
              <boxGeometry args={[0.18, 0.03, 0.25]} />
              <meshToonMaterial 
                color="#5a3a2a" 
                emissive={journalRead ? "#000000" : "#331100"}
                emissiveIntensity={0.2}
                gradientMap={toonGradient}
              />
            </mesh>
            {/* Open pages */}
            <mesh position={[0, 0.02, 0]}>
              <boxGeometry args={[0.16, 0.02, 0.23]} />
              <meshToonMaterial color={OFFICE_TOON_COLORS.parchment} gradientMap={toonGradient} />
            </mesh>
            {/* Bookmark ribbon */}
            <mesh position={[0.08, 0.02, -0.12]} rotation={[0, 0, 0.1]}>
              <boxGeometry args={[0.01, 0.005, 0.15]} />
              <meshToonMaterial color="#8a2a2a" gradientMap={toonGradient} />
            </mesh>
            
            {/* Subtle glow */}
            <pointLight 
              position={[0, 0.1, 0]} 
              color="#ffeecc" 
              intensity={0.2} 
              distance={0.5}
            />
          </group>
        </InteractableObject>
        
        {/* Tea cup (cold, abandoned) */}
        <mesh position={[-0.12, 0.6, 0.08]} castShadow>
          <cylinderGeometry args={[0.035, 0.03, 0.06, 10]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.parchment} gradientMap={toonGradient} />
        </mesh>
        {/* Tea inside */}
        <mesh position={[-0.12, 0.62, 0.08]}>
          <circleGeometry args={[0.03, 10]} />
          <meshToonMaterial color="#4a3a2a" gradientMap={toonGradient} />
        </mesh>
        {/* Cup handle */}
        <mesh position={[-0.16, 0.59, 0.08]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.02, 0.005, 8, 8, Math.PI]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.parchment} gradientMap={toonGradient} />
        </mesh>
      </group>
      
      {/* Floor lamp (not lit) */}
      <FloorLamp position={[-0.5, 0, 0.8]} />
      
      {/* Small rug */}
      <mesh position={[0.3, 0.005, 0.2]} rotation={[-Math.PI / 2, 0, 0.2]}>
        <circleGeometry args={[0.8, 16]} />
        <meshToonMaterial color="#6a4a5a" gradientMap={toonGradient} />
      </mesh>
    </group>
  );
}

/**
 * Armchair component
 */
function Armchair() {
  const toonGradient = useOfficeToonGradient();
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[0.4, 0.35, 0.4]} position={[0, 0.35, 0]} />
      
      {/* Seat */}
      <mesh position={[0, 0.35, 0.05]} castShadow>
        <boxGeometry args={[0.7, 0.15, 0.65]} />
        <meshToonMaterial color={OFFICE_TOON_COLORS.fabricMid} gradientMap={toonGradient} />
      </mesh>
      
      {/* Back */}
      <mesh position={[0, 0.65, -0.28]} castShadow>
        <boxGeometry args={[0.7, 0.75, 0.15]} />
        <meshToonMaterial color={OFFICE_TOON_COLORS.fabricMid} gradientMap={toonGradient} />
      </mesh>
      
      {/* Left arm */}
      <mesh position={[-0.35, 0.5, 0.05]} castShadow>
        <boxGeometry args={[0.12, 0.35, 0.6]} />
        <meshToonMaterial color={OFFICE_TOON_COLORS.fabricDark} gradientMap={toonGradient} />
      </mesh>
      
      {/* Right arm */}
      <mesh position={[0.35, 0.5, 0.05]} castShadow>
        <boxGeometry args={[0.12, 0.35, 0.6]} />
        <meshToonMaterial color={OFFICE_TOON_COLORS.fabricDark} gradientMap={toonGradient} />
      </mesh>
      
      {/* Cushion */}
      <mesh position={[0, 0.48, 0.05]} castShadow>
        <boxGeometry args={[0.55, 0.1, 0.5]} />
        <meshToonMaterial color={OFFICE_TOON_COLORS.fabricLight} gradientMap={toonGradient} />
      </mesh>
      
      {/* Back cushion */}
      <mesh position={[0, 0.65, -0.18]} castShadow>
        <boxGeometry args={[0.5, 0.45, 0.1]} />
        <meshToonMaterial color={OFFICE_TOON_COLORS.fabricLight} gradientMap={toonGradient} />
      </mesh>
      
      {/* Wooden legs */}
      {[[-0.28, -0.3], [0.28, -0.3], [-0.28, 0.25], [0.28, 0.25]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.12, z]} castShadow>
          <cylinderGeometry args={[0.03, 0.035, 0.24, 6]} />
          <meshToonMaterial color="#3a2a1a" gradientMap={toonGradient} />
        </mesh>
      ))}
    </RigidBody>
  );
}

/**
 * Floor lamp
 */
function FloorLamp({ position }: { position: [number, number, number] }) {
  const toonGradient = useOfficeToonGradient();
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.15, 0.04, 12]} />
        <meshToonMaterial color={OFFICE_TOON_COLORS.metalDark} gradientMap={toonGradient} />
      </mesh>
      
      {/* Pole */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.025, 1.4, 8]} />
        <meshToonMaterial color={OFFICE_TOON_COLORS.metalMid} gradientMap={toonGradient} />
      </mesh>
      
      {/* Shade */}
      <mesh position={[0, 1.45, 0]} castShadow>
        <coneGeometry args={[0.18, 0.2, 12, 1, true]} />
        <meshToonMaterial 
          color="#8a7a5a" 
          side={2}
          gradientMap={toonGradient}
        />
      </mesh>
    </group>
  );
}

export default ArmchairNook;
