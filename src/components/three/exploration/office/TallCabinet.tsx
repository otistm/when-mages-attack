/**
 * TallCabinet - Curio cabinet with music box and specimen jars
 * Contains the music box puzzle element
 */

import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { InteractableObject } from '../InteractableObject';
import { usePuzzleStore } from '@/stores/puzzleStore';
import type { Interactable } from '@/types/interaction';
import { OFFICE_TOON_COLORS, useOfficeToonGradient } from './officeToon';

interface TallCabinetProps {
  position: [number, number, number];
  rotation?: [number, number, number];
}

export function TallCabinet({ position, rotation = [0, 0, 0] }: TallCabinetProps) {
  const toonGradient = useOfficeToonGradient();
  const musicBoxPlayed = usePuzzleStore(s => s.musicBoxPlayed);
  const playMusicBox = usePuzzleStore(s => s.playMusicBox);
  const specimenExamined = usePuzzleStore(s => s.specimenExamined);
  const examineSpecimen = usePuzzleStore(s => s.examineSpecimen);
  
  const musicBoxInteractable: Interactable = {
    id: 'music_box',
    type: 'activate',
    promptText: musicBoxPlayed ? 'Music box (playing)' : 'Wind music box',
    interactionRange: 2,
    highlightRange: 5,
    oneTime: false,
    cooldown: 3,
    description: 'An ornate music box. The melody seems... familiar somehow.',
  };
  
  const specimenInteractable: Interactable = {
    id: 'specimen_jar',
    type: 'examine',
    promptText: 'Examine specimen',
    interactionRange: 2,
    highlightRange: 4,
    oneTime: true,
    grantsPage: 'construct_preserved_specimen',
    description: 'A jar containing a preserved slime-like creature. It almost seems to be watching you.',
  };
  
  return (
    <group position={position} rotation={rotation}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.35, 1.1, 0.25]} position={[0, 1.1, 0]} />
        
        {/* Cabinet frame */}
        <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 2.2, 0.5]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.woodDark} gradientMap={toonGradient} />
        </mesh>
        
        {/* Glass door frame */}
        <mesh position={[0.26, 1.1, 0]} castShadow>
          <boxGeometry args={[0.08, 2, 0.4]} />
          <meshToonMaterial color="#3a2a1a" gradientMap={toonGradient} />
        </mesh>
        
      {/* Glass panels (semi-transparent) */}
        <mesh position={[0.26, 1.1, 0]}>
          <boxGeometry args={[0.02, 1.9, 0.35]} />
        <meshToonMaterial 
          color={OFFICE_TOON_COLORS.glass} 
          transparent 
          opacity={0.25}
          gradientMap={toonGradient}
        />
        </mesh>
      </RigidBody>
      
      {/* Shelves inside */}
      {[0.5, 1.0, 1.5, 2.0].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} castShadow>
          <boxGeometry args={[0.6, 0.03, 0.4]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.woodMid} gradientMap={toonGradient} />
        </mesh>
      ))}
      
      {/* Music Box - Interactive */}
      <InteractableObject 
        interactable={musicBoxInteractable}
        position={[0, 1.55, 0]}
        onInteract={() => playMusicBox()}
      >
        <group>
          {/* Box base */}
          <mesh castShadow>
            <boxGeometry args={[0.15, 0.08, 0.1]} />
            <meshToonMaterial 
              color="#8a6a4a" 
              emissive={musicBoxPlayed ? "#aa8844" : "#442211"}
              emissiveIntensity={musicBoxPlayed ? 0.4 : 0.1}
              gradientMap={toonGradient}
            />
          </mesh>
          {/* Decorative lid */}
          <mesh position={[0, 0.05, 0]} castShadow>
            <boxGeometry args={[0.14, 0.02, 0.09]} />
            <meshToonMaterial color={OFFICE_TOON_COLORS.metalGold} gradientMap={toonGradient} />
          </mesh>
          {/* Key/winder */}
          <mesh position={[0.08, 0, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
            <boxGeometry args={[0.02, 0.03, 0.02]} />
            <meshToonMaterial color={OFFICE_TOON_COLORS.metalGold} gradientMap={toonGradient} />
          </mesh>
          
          {/* Active glow when playing */}
          {musicBoxPlayed && (
            <pointLight 
              position={[0, 0.1, 0]} 
              color="#ffcc88" 
              intensity={0.5} 
              distance={1}
            />
          )}
        </group>
      </InteractableObject>
      
      {/* Specimen Jars */}
      <InteractableObject 
        interactable={specimenInteractable}
        position={[0, 1.05, 0]}
        onInteract={() => examineSpecimen()}
      >
        <group>
          {/* Jar */}
          <mesh castShadow>
            <cylinderGeometry args={[0.06, 0.05, 0.15, 12]} />
          <meshToonMaterial 
            color={OFFICE_TOON_COLORS.glass} 
            transparent 
            opacity={0.35}
            gradientMap={toonGradient}
          />
          </mesh>
          {/* Lid */}
          <mesh position={[0, 0.08, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.06, 0.02, 12]} />
            <meshToonMaterial color={OFFICE_TOON_COLORS.metalGold} gradientMap={toonGradient} />
          </mesh>
          {/* Creature inside */}
          <mesh position={[0, -0.02, 0]}>
            <sphereGeometry args={[0.035, 12, 12]} />
            <meshToonMaterial 
              color="#44aa66" 
              emissive="#226633"
              emissiveIntensity={0.3}
              transparent 
              opacity={0.8}
              gradientMap={toonGradient}
            />
          </mesh>
          
          {/* Glow */}
          <pointLight 
            position={[0, 0, 0]} 
            color="#88ffaa" 
            intensity={0.2} 
            distance={0.5}
          />
        </group>
      </InteractableObject>
      
      {/* Other specimen jars (non-interactive) */}
      <SpecimenJar position={[-0.15, 1.05, 0.1]} color="#aa6688" />
      <SpecimenJar position={[0.15, 0.55, -0.05]} color="#6688aa" />
      
      {/* Small curios */}
      <mesh position={[-0.1, 0.55, 0.1]} castShadow>
        <dodecahedronGeometry args={[0.04]} />
        <meshToonMaterial color="#8866aa" gradientMap={toonGradient} />
      </mesh>
      
      <mesh position={[0.1, 2.05, 0]} rotation={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.1, 0.12, 0.08]} />
        <meshToonMaterial color="#6a4a3a" gradientMap={toonGradient} />
      </mesh>
    </group>
  );
}

/**
 * Non-interactive specimen jar
 */
function SpecimenJar({ 
  position, 
  color 
}: { 
  position: [number, number, number]; 
  color: string;
}) {
  const toonGradient = useOfficeToonGradient();
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.04, 0.035, 0.1, 10]} />
        <meshToonMaterial 
          color={OFFICE_TOON_COLORS.glass} 
          transparent 
          opacity={0.3}
          gradientMap={toonGradient}
        />
      </mesh>
      <mesh position={[0, 0.055, 0]} castShadow>
        <cylinderGeometry args={[0.038, 0.042, 0.015, 10]} />
        <meshToonMaterial color={OFFICE_TOON_COLORS.metalGold} gradientMap={toonGradient} />
      </mesh>
      <mesh position={[0, -0.01, 0]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshToonMaterial 
          color={color} 
          transparent 
          opacity={0.7}
          gradientMap={toonGradient}
        />
      </mesh>
    </group>
  );
}

export default TallCabinet;
