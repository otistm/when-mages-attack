/**
 * GrimoireCase - The main objective locked in a display case on the desk
 * Opening without disarming trap triggers death
 * Opening after disarming triggers the Keeper awakening
 */

import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { InteractableObject } from '../../InteractableObject';
import { usePuzzleStore } from '@/stores/puzzleStore';
import type { Interactable } from '@/types/interaction';
import { OFFICE_TOON_COLORS, useOfficeToonGradient } from '../officeToon';

interface GrimoireCaseProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  onTrapTriggered?: () => void;
  onKeeperAwakened?: () => void;
}

export function GrimoireCase({ 
  position, 
  rotation = [0, 0, 0],
  onTrapTriggered,
  onKeeperAwakened,
}: GrimoireCaseProps) {
  const toonGradient = useOfficeToonGradient();
  const trapDisarmed = usePuzzleStore(s => s.trapDisarmed);
  const caseOpened = usePuzzleStore(s => s.caseOpened);
  const attemptOpenCase = usePuzzleStore(s => s.attemptOpenCase);
  const triggerDeath = usePuzzleStore(s => s.triggerDeath);
  const keyFound = usePuzzleStore(s => s.keyFound);
  const useKey = usePuzzleStore(s => s.useKey);
  
  const grimoireRef = useRef<THREE.Group>(null);
  
  // Gentle float animation for the grimoire
  useFrame((state) => {
    if (grimoireRef.current && !caseOpened) {
      grimoireRef.current.position.y = 
        Math.sin(state.clock.elapsedTime * 1.5) * 0.02 + 0.08;
      grimoireRef.current.rotation.y = 
        Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });
  
  // Determine prompt text based on state
  const getPromptText = () => {
    if (caseOpened) return 'Case opened';
    if (trapDisarmed) return 'Open case (safe)';
    if (keyFound) return 'Use key to open';
    return 'Open grimoire case';
  };
  
  const caseInteractable: Interactable = {
    id: 'grimoire_case',
    type: 'activate',
    promptText: getPromptText(),
    interactionRange: 2,
    highlightRange: 6,
    oneTime: false,
    description: caseOpened 
      ? 'The case stands empty, its purpose fulfilled.'
      : 'An ornate display case. The grimoire inside glows with ancient power. A faint sigil pulses on the lock...',
  };
  
  const handleInteract = () => {
    if (caseOpened) return;
    
    // If key is found but trap not disarmed, try to use key
    if (keyFound && !trapDisarmed) {
      useKey();
    }
    
    const result = attemptOpenCase();
    
    if (result.success) {
      // Trap was disarmed - awaken the keeper
      console.log('[GrimoireCase] Case opened safely via:', result.disarmMethod);
      onKeeperAwakened?.();
    } else {
      // Trap triggered - death!
      console.log('[GrimoireCase] TRAP TRIGGERED!');
      triggerDeath();
      onTrapTriggered?.();
    }
  };
  
  return (
    <group position={position} rotation={rotation}>
      <InteractableObject 
        interactable={caseInteractable}
        onInteract={handleInteract}
        glowColor={trapDisarmed ? '#44ff88' : '#ff4444'}
      >
        {/* Display case base */}
        <mesh position={[0, 0.03, 0]} castShadow>
          <boxGeometry args={[0.35, 0.06, 0.25]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.woodMid} gradientMap={toonGradient} />
        </mesh>
        
        {/* Glass dome / case */}
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[0.3, 0.2, 0.22]} />
          <meshToonMaterial 
            color={OFFICE_TOON_COLORS.glass} 
            transparent 
            opacity={0.18}
            gradientMap={toonGradient}
          />
        </mesh>
        
        {/* Case frame */}
        {/* Vertical edges */}
        {[[-0.15, -0.11], [0.15, -0.11], [-0.15, 0.11], [0.15, 0.11]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.15, z]} castShadow>
            <boxGeometry args={[0.02, 0.2, 0.02]} />
            <meshToonMaterial color={OFFICE_TOON_COLORS.metalGold} gradientMap={toonGradient} />
          </mesh>
        ))}
        
        {/* Top frame */}
        <mesh position={[0, 0.26, 0]} castShadow>
          <boxGeometry args={[0.32, 0.02, 0.24]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.metalGold} gradientMap={toonGradient} />
        </mesh>
        
        {/* Lock sigil on front */}
        <mesh position={[0, 0.1, 0.115]}>
          <circleGeometry args={[0.03, 6]} />
          <meshToonMaterial 
            color={trapDisarmed ? "#44aa44" : "#aa4444"}
            emissive={trapDisarmed ? "#44ff44" : "#ff4444"}
            emissiveIntensity={trapDisarmed ? 0.3 : 0.5}
            gradientMap={toonGradient}
          />
        </mesh>
        
        {/* The Grimoire inside */}
        {!caseOpened && (
          <group ref={grimoireRef} position={[0, 0.08, 0]}>
            {/* Book cover */}
            <mesh castShadow>
              <boxGeometry args={[0.12, 0.04, 0.16]} />
              <meshToonMaterial 
                color="#3a2a4a" 
                gradientMap={toonGradient}
              />
            </mesh>
            
            {/* Gold clasp */}
            <mesh position={[0.06, 0, 0]}>
              <boxGeometry args={[0.01, 0.03, 0.08]} />
              <meshToonMaterial 
                color="#d4af37" 
                emissive="#d4af37"
                emissiveIntensity={0.3}
                gradientMap={toonGradient}
              />
            </mesh>
            
            {/* Spine text (decorative ridge) */}
            <mesh position={[-0.055, 0.01, 0]}>
              <boxGeometry args={[0.01, 0.02, 0.14]} />
              <meshToonMaterial 
                color="#d4af37" 
                gradientMap={toonGradient}
              />
            </mesh>
            
            {/* Pages */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.1, 0.03, 0.14]} />
              <meshToonMaterial color={OFFICE_TOON_COLORS.parchment} gradientMap={toonGradient} />
            </mesh>
            
            {/* Magical glow */}
            <pointLight 
              position={[0, 0.05, 0]} 
              color="#9966dd" 
              intensity={0.5} 
              distance={0.5}
            />
          </group>
        )}
        
        {/* Ambient case glow */}
        <pointLight 
          position={[0, 0.15, 0]} 
          color={trapDisarmed ? "#88ff88" : "#ff6666"} 
          intensity={0.3} 
          distance={0.8}
        />
      </InteractableObject>
    </group>
  );
}

export default GrimoireCase;
