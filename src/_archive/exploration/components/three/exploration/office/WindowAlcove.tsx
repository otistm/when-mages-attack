/**
 * WindowAlcove - Window with photograph and scratched message
 * Contains lore: photograph of the unknown mage, warning on glass
 */

import { InteractableObject } from '../InteractableObject';
import { usePuzzleStore } from '@/stores/puzzleStore';
import type { Interactable } from '@/types/interaction';
import { OFFICE_TOON_COLORS, useOfficeToonGradient } from './officeToon';

interface WindowAlcoveProps {
  position: [number, number, number];
  rotation?: [number, number, number];
}

export function WindowAlcove({ position, rotation = [0, 0, 0] }: WindowAlcoveProps) {
  const toonGradient = useOfficeToonGradient();
  const photographExamined = usePuzzleStore(s => s.photographExamined);
  const examinePhotograph = usePuzzleStore(s => s.examinePhotograph);
  const windowMessageRead = usePuzzleStore(s => s.windowMessageRead);
  const readWindowMessage = usePuzzleStore(s => s.readWindowMessage);
  
  const photographInteractable: Interactable = {
    id: 'photograph',
    type: 'examine',
    promptText: 'Examine photograph',
    interactionRange: 2.5,
    highlightRange: 5,
    oneTime: true,
    grantsPage: 'character_unknown_scholar',
    cameraFocus: true,
    description: 'A faded photograph in a tarnished frame. The figure is obscured but dignified.',
  };
  
  const windowMessageInteractable: Interactable = {
    id: 'window_message',
    type: 'examine',
    promptText: 'Read scratched message',
    interactionRange: 2.5,
    highlightRange: 5,
    oneTime: true,
    grantsPage: 'lore_warning_scratched',
    cameraFocus: true,
    description: 'Someone scratched words into the glass with desperate urgency.',
  };
  
  return (
    <group position={position} rotation={rotation}>
      {/* Window frame */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.5, 2, 0.1]} />
        <meshToonMaterial color={OFFICE_TOON_COLORS.woodDark} gradientMap={toonGradient} />
      </mesh>
      
      {/* Window glass (grimy, with scratches) */}
      <InteractableObject 
        interactable={windowMessageInteractable}
        position={[0, 0, 0.06]}
        onInteract={() => readWindowMessage()}
      >
        <mesh>
          <boxGeometry args={[1.3, 1.8, 0.02]} />
          <meshToonMaterial 
            color={OFFICE_TOON_COLORS.glass} 
            transparent 
            opacity={0.25}
            emissive={windowMessageRead ? "#000000" : "#223344"}
            emissiveIntensity={0.1}
            gradientMap={toonGradient}
          />
        </mesh>
        
        {/* Scratched text hint (diagonal scratches) */}
        {!windowMessageRead && (
          <>
            {[0, 1, 2].map((i) => (
              <mesh 
                key={i}
                position={[-0.2 + i * 0.2, 0.3, 0.015]}
                rotation={[0, 0, 0.3]}
              >
                <boxGeometry args={[0.02, 0.3, 0.005]} />
                <meshToonMaterial 
                  color="#aabbcc" 
                  transparent 
                  opacity={0.4}
                  gradientMap={toonGradient}
                />
              </mesh>
            ))}
          </>
        )}
      </InteractableObject>
      
      {/* Window sill */}
      <mesh position={[0, -1.05, 0.15]} castShadow>
        <boxGeometry args={[1.6, 0.08, 0.35]} />
        <meshToonMaterial color={OFFICE_TOON_COLORS.woodMid} gradientMap={toonGradient} />
      </mesh>
      
      {/* Photograph on sill - Interactive */}
      <InteractableObject 
        interactable={photographInteractable}
        position={[-0.4, -0.95, 0.2]}
        onInteract={() => examinePhotograph()}
      >
        <group rotation={[0.15, 0.2, 0]}>
          {/* Frame */}
          <mesh castShadow>
            <boxGeometry args={[0.18, 0.22, 0.02]} />
            <meshToonMaterial 
              color="#6a5a4a" 
              emissive={photographExamined ? "#000000" : "#221100"}
              emissiveIntensity={0.15}
              gradientMap={toonGradient}
            />
          </mesh>
          {/* Photo inside */}
          <mesh position={[0, 0, 0.011]}>
            <boxGeometry args={[0.14, 0.18, 0.005]} />
            <meshToonMaterial color="#9a8a7a" gradientMap={toonGradient} />
          </mesh>
          {/* Figure silhouette */}
          <mesh position={[0, 0.02, 0.014]}>
            <boxGeometry args={[0.06, 0.12, 0.002]} />
            <meshToonMaterial color={OFFICE_TOON_COLORS.metalMid} gradientMap={toonGradient} />
          </mesh>
          
          {/* Subtle glow */}
          {!photographExamined && (
            <pointLight 
              position={[0, 0, 0.1]} 
              color="#ffeecc" 
              intensity={0.15} 
              distance={0.4}
            />
          )}
        </group>
      </InteractableObject>
      
      {/* Dead plant on sill */}
      <group position={[0.35, -0.9, 0.2]}>
        {/* Pot */}
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.05, 0.1, 8]} />
          <meshToonMaterial color="#8a5a3a" gradientMap={toonGradient} />
        </mesh>
        {/* Dead stems */}
        <mesh position={[0, 0.08, 0]} rotation={[0.1, 0, 0.15]}>
          <cylinderGeometry args={[0.005, 0.003, 0.1, 4]} />
          <meshToonMaterial color="#5a4a3a" gradientMap={toonGradient} />
        </mesh>
        <mesh position={[-0.02, 0.07, 0.01]} rotation={[-0.2, 0, -0.1]}>
          <cylinderGeometry args={[0.004, 0.002, 0.08, 4]} />
          <meshToonMaterial color="#4a3a2a" gradientMap={toonGradient} />
        </mesh>
      </group>
      
      {/* Dust on sill */}
      <mesh position={[0, -1, 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.5, 0.3]} />
        <meshToonMaterial 
          color={OFFICE_TOON_COLORS.dust} 
          transparent 
          opacity={0.2}
          gradientMap={toonGradient}
        />
      </mesh>
      
      {/* Light coming through window */}
      <spotLight
        position={[0, 0.5, 0.5]}
        target-position={[0, -1, 2]}
        angle={0.45}
        penumbra={0.2}
        intensity={1.2}
        color="#c9b896"
        castShadow={false}
      />
    </group>
  );
}

export default WindowAlcove;
