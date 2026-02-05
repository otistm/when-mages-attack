/**
 * InitiationChamber - Greybox level geometry for vertical slice
 * Follows skill_r3f_level_designer.md patterns
 */

import { useRef } from 'react';
import * as THREE from 'three';
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier';
import { InteractableObject } from './InteractableObject';
import type { Interactable } from '@/types/interaction';

// Chamber dimensions
const CHAMBER = {
  radius: 12,
  height: 8,
  wallThickness: 0.5,
  floorY: 0,
};

export function InitiationChamber() {
  return (
    <group>
      {/* Ambient and directional lighting */}
      <ChamberLighting />
      
      {/* Floor */}
      <ChamberFloor />
      
      {/* Walls (octagonal chamber) */}
      <ChamberWalls />
      
      {/* Central summoning circle (weenie) */}
      <SummoningCircle position={[0, 0.01, 0]} />
      
      {/* Pillars for visual interest and camera collision reference */}
      <Pillars />
      
      {/* Entry archway */}
      <EntryArchway position={[0, 0, CHAMBER.radius - 1]} />
      
      {/* Wall alcoves with interactable spots */}
      <WallAlcove position={[-8, 0, -6]} rotation={[0, Math.PI / 4, 0]} />
      <WallAlcove position={[8, 0, -6]} rotation={[0, -Math.PI / 4, 0]} />
      
      {/* Interactable Objects - positioned in front of starting camera view (positive Z) */}
      <LorePage 
        position={[-2, 1, 6]} 
        pageId="chamber_welcome"
        title="Welcome to the Chamber"
      />
      <LorePage 
        position={[2, 1.2, 8]} 
        pageId="society_rules"
        title="The Rules"
      />
      {/* Wall Inscription near entrance */}
      <WallInscription 
        position={[0, 2.5, 11]} 
        rotation={[0, Math.PI, 0]}
      />
      {/* Orbs near entrance pillars */}
      <MysteryOrb position={[-1.5, 1.5, 9]} />
      <MysteryOrb position={[1.5, 1.5, 9]} />
      
      {/* Placeholder for Vesper NPC position */}
      <NPCMarker position={[0, 0, -8]} label="Vesper" />
    </group>
  );
}

/**
 * Chamber Lighting
 */
function ChamberLighting() {
  return (
    <>
      {/* Ambient base */}
      <ambientLight intensity={0.4} color="#4a4a6e" />
      
      {/* Main overhead light from summoning circle */}
      <spotLight
        position={[0, CHAMBER.height - 1, 0]}
        angle={0.8}
        penumbra={0.5}
        intensity={2.5}
        color="#9977dd"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.001}
      />
      
      {/* Warm rim light from entrance */}
      <pointLight
        position={[0, 3, CHAMBER.radius]}
        intensity={1.5}
        color="#ffcc88"
        distance={20}
      />
      
      {/* Accent lights at alcoves */}
      <pointLight position={[-8, 2, -6]} intensity={0.8} color="#88bbff" distance={8} />
      <pointLight position={[8, 2, -6]} intensity={0.8} color="#88bbff" distance={8} />
      
      {/* Fill light for player visibility */}
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.5}
        color="#ffffff"
      />
    </>
  );
}

/**
 * Chamber Floor
 */
function ChamberFloor() {
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[CHAMBER.radius, 0.1, CHAMBER.radius]} position={[0, -0.1, 0]} />
      
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]} 
        receiveShadow
      >
        <circleGeometry args={[CHAMBER.radius, 32]} />
        <meshStandardMaterial 
          color="#3a3a4a" 
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      
      {/* Floor pattern rings */}
      {[4, 8, 11].map((radius) => (
        <mesh 
          key={radius}
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, 0.005, 0]}
        >
          <ringGeometry args={[radius - 0.1, radius, 64]} />
          <meshStandardMaterial 
            color="#2a2a3a" 
            roughness={0.95}
          />
        </mesh>
      ))}
    </RigidBody>
  );
}

/**
 * Chamber Walls - Octagonal
 */
function ChamberWalls() {
  const wallCount = 8;
  const angleStep = (Math.PI * 2) / wallCount;
  const wallWidth = CHAMBER.radius * 2 * Math.tan(Math.PI / wallCount);
  
  return (
    <RigidBody type="fixed" colliders={false}>
      {Array.from({ length: wallCount }).map((_, i) => {
        const angle = angleStep * i + angleStep / 2;
        const x = Math.sin(angle) * CHAMBER.radius;
        const z = Math.cos(angle) * CHAMBER.radius;
        
        return (
          <group key={i}>
            <CuboidCollider 
              args={[wallWidth / 2, CHAMBER.height / 2, CHAMBER.wallThickness / 2]}
              position={[x, CHAMBER.height / 2, z]}
              rotation={[0, -angle, 0]}
            />
            
            <mesh
              position={[x, CHAMBER.height / 2, z]}
              rotation={[0, -angle, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[wallWidth, CHAMBER.height, CHAMBER.wallThickness]} />
              <meshStandardMaterial 
                color="#4a4a5a" 
                roughness={0.85}
                metalness={0.05}
              />
            </mesh>
          </group>
        );
      })}
      
      {/* Ceiling */}
      <mesh position={[0, CHAMBER.height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[CHAMBER.radius, 32]} />
        <meshStandardMaterial color="#2a2a3a" roughness={0.95} />
      </mesh>
    </RigidBody>
  );
}

/**
 * Central Summoning Circle - Main weenie
 */
function SummoningCircle({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  
  return (
    <group ref={groupRef} position={position}>
      {/* Outer ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.8, 3, 64]} />
        <meshStandardMaterial 
          color="#8866cc"
          emissive="#8866cc"
          emissiveIntensity={0.3}
          roughness={0.5}
        />
      </mesh>
      
      {/* Inner ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.8, 2, 64]} />
        <meshStandardMaterial 
          color="#aa88dd"
          emissive="#aa88dd"
          emissiveIntensity={0.4}
          roughness={0.5}
        />
      </mesh>
      
      {/* Center glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial 
          color="#cc99ff"
          transparent
          opacity={0.6}
        />
      </mesh>
      
      {/* Rune markers */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2;
        const radius = 2.4;
        return (
          <mesh 
            key={i}
            position={[Math.sin(angle) * radius, 0.01, Math.cos(angle) * radius]}
            rotation={[-Math.PI / 2, 0, angle]}
          >
            <planeGeometry args={[0.4, 0.4]} />
            <meshStandardMaterial 
              color="#d4af37"
              emissive="#d4af37"
              emissiveIntensity={0.5}
              roughness={0.3}
            />
          </mesh>
        );
      })}
      
      {/* Ambient glow light */}
      <pointLight 
        position={[0, 0.5, 0]} 
        color="#9977dd" 
        intensity={0.8} 
        distance={6}
      />
    </group>
  );
}

/**
 * Decorative Pillars
 */
function Pillars() {
  const pillarPositions: [number, number, number][] = [
    [-6, 0, -6],
    [6, 0, -6],
    [-8, 0, 2],
    [8, 0, 2],
  ];
  
  return (
    <RigidBody type="fixed" colliders={false}>
      {pillarPositions.map((pos, i) => (
        <group key={i} position={pos}>
          <CylinderCollider args={[CHAMBER.height / 2, 0.5]} position={[0, CHAMBER.height / 2, 0]} />
          
          {/* Pillar base */}
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.6, 0.7, 0.6, 16]} />
            <meshStandardMaterial color="#5a5a6a" roughness={0.8} />
          </mesh>
          
          {/* Pillar shaft */}
          <mesh position={[0, CHAMBER.height / 2, 0]} castShadow>
            <cylinderGeometry args={[0.4, 0.5, CHAMBER.height - 1, 16]} />
            <meshStandardMaterial color="#4a4a5a" roughness={0.85} />
          </mesh>
          
          {/* Pillar capital */}
          <mesh position={[0, CHAMBER.height - 0.4, 0]} castShadow>
            <cylinderGeometry args={[0.7, 0.4, 0.8, 16]} />
            <meshStandardMaterial color="#5a5a6a" roughness={0.8} />
          </mesh>
          
          {/* Torch on pillar */}
          <pointLight 
            position={[0.6, CHAMBER.height - 1.5, 0]} 
            color="#ff9944" 
            intensity={0.5} 
            distance={5}
          />
        </group>
      ))}
    </RigidBody>
  );
}

/**
 * Entry Archway
 */
function EntryArchway({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Left column */}
      <mesh position={[-1.5, 2, 0]} castShadow>
        <boxGeometry args={[0.8, 4, 0.8]} />
        <meshStandardMaterial color="#5a5a6a" roughness={0.8} />
      </mesh>
      
      {/* Right column */}
      <mesh position={[1.5, 2, 0]} castShadow>
        <boxGeometry args={[0.8, 4, 0.8]} />
        <meshStandardMaterial color="#5a5a6a" roughness={0.8} />
      </mesh>
      
      {/* Arch top */}
      <mesh position={[0, 4.3, 0]} castShadow>
        <boxGeometry args={[3.8, 0.6, 0.8]} />
        <meshStandardMaterial color="#5a5a6a" roughness={0.8} />
      </mesh>
      
      {/* Light from outside */}
      <pointLight position={[0, 3, 2]} color="#ffcc88" intensity={1} distance={8} />
    </group>
  );
}

/**
 * Wall Alcove - Secondary POI
 */
function WallAlcove({ 
  position, 
  rotation = [0, 0, 0] 
}: { 
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Alcove back */}
      <mesh position={[0, 1.5, -0.5]} receiveShadow>
        <boxGeometry args={[2.5, 3, 0.3]} />
        <meshStandardMaterial color="#3a3a4a" roughness={0.9} />
      </mesh>
      
      {/* Pedestal */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.5, 0.8, 16]} />
        <meshStandardMaterial color="#5a5a6a" roughness={0.7} />
      </mesh>
      
      {/* Placeholder for interactable object */}
      <mesh position={[0, 1, 0]} castShadow>
        <boxGeometry args={[0.4, 0.5, 0.3]} />
        <meshStandardMaterial 
          color="#8a7a5a"
          emissive="#d4af37"
          emissiveIntensity={0.1}
        />
      </mesh>
      
      {/* Accent light */}
      <pointLight position={[0, 2.5, 0.5]} color="#6688aa" intensity={0.3} distance={4} />
    </group>
  );
}

/**
 * NPC Marker - Debug placeholder for NPC positions
 */
function NPCMarker({ 
  position, 
  label 
}: { 
  position: [number, number, number];
  label: string;
}) {
  const isDev = import.meta.env.DEV;
  
  if (!isDev) return null;
  
  return (
    <group position={position}>
      {/* Marker cylinder */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 2, 8]} />
        <meshBasicMaterial color="#ff6600" wireframe />
      </mesh>
      
      {/* Label would go here with Html from drei */}
    </group>
  );
}

/**
 * Lore Page - Collectible page pickup
 */
function LorePage({ 
  position, 
  pageId,
  title,
}: { 
  position: [number, number, number];
  pageId: string;
  title: string;
}) {
  const interactable: Interactable = {
    id: `page_${pageId}`,
    type: 'collect',
    promptText: `Pick up: ${title}`,
    interactionRange: 3,
    highlightRange: 12,
    grantsPage: pageId,
    oneTime: true,
    soundEffect: 'page_collect',
    description: `A weathered page titled "${title}".`,
  };
  
  return (
    <InteractableObject interactable={interactable} position={position}>
      {/* Page mesh - larger for easier raycast hit */}
      <mesh rotation={[-0.15, Math.random() * 0.5, 0.1]} castShadow>
        <boxGeometry args={[0.6, 0.8, 0.05]} />
        <meshStandardMaterial 
          color="#d4c5a0"
          emissive="#d4af37"
          emissiveIntensity={0.3}
          roughness={0.8}
        />
      </mesh>
      
      {/* Subtle glow underneath */}
      <pointLight 
        position={[0, -0.1, 0]} 
        color="#d4af37" 
        intensity={0.5} 
        distance={2}
      />
    </InteractableObject>
  );
}

/**
 * Wall Inscription - Examine for lore
 */
function WallInscription({ 
  position, 
  rotation = [0, 0, 0],
}: { 
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const interactable: Interactable = {
    id: 'inscription_chamber_rules',
    type: 'examine',
    promptText: 'Read inscription',
    interactionRange: 4,
    highlightRange: 15,
    grantsPage: 'lore_chamber_rules',
    oneTime: false,
    cameraFocus: true,
    description: 'Ancient runes carved into the stone wall. They seem to pulse with faint magical energy.',
  };
  
  return (
    <InteractableObject interactable={interactable} position={position} rotation={rotation}>
      {/* Stone tablet */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[3, 2, 0.15]} />
        <meshStandardMaterial 
          color="#4a4a5a"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      
      {/* Carved text area */}
      <mesh position={[0, 0, 0.08]}>
        <boxGeometry args={[2.6, 1.6, 0.02]} />
        <meshStandardMaterial 
          color="#3a3a4a"
          emissive="#6655aa"
          emissiveIntensity={0.15}
          roughness={0.95}
        />
      </mesh>
      
      {/* Glow effect */}
      <pointLight 
        position={[0, 0, 0.5]} 
        color="#8866cc" 
        intensity={0.4} 
        distance={3}
      />
    </InteractableObject>
  );
}

/**
 * Mystery Orb - Activatable object
 */
function MysteryOrb({ 
  position,
}: { 
  position: [number, number, number];
}) {
  const interactable: Interactable = {
    id: `orb_${position.join('_')}`,
    type: 'activate',
    promptText: 'Touch the orb',
    interactionRange: 3,
    highlightRange: 12,
    oneTime: false,
    cooldown: 2,
    description: 'A floating orb of condensed arcane energy.',
  };
  
  return (
    <InteractableObject interactable={interactable} position={position}>
      {/* Floating orb - larger for easier raycast hit */}
      <mesh castShadow>
        <sphereGeometry args={[0.5, 24, 24]} />
        <meshStandardMaterial 
          color="#88aaff"
          emissive="#4488ff"
          emissiveIntensity={0.4}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
      
      {/* Outer glow sphere */}
      <mesh>
        <sphereGeometry args={[0.65, 16, 16]} />
        <meshBasicMaterial 
          color="#88aaff"
          transparent
          opacity={0.15}
        />
      </mesh>
      
      {/* Light */}
      <pointLight 
        position={[0, 0, 0]} 
        color="#88aaff" 
        intensity={0.5} 
        distance={2}
      />
    </InteractableObject>
  );
}


