/**
 * ForgottenOffice - Main environment for the vertical slice
 * 
 * A cluttered, abandoned mage's office with:
 * - Main desk with grimoire case (objective)
 * - Bookshelf with hidden compartment (sigil #1)
 * - Filing cabinet (sigil #2)
 * - Tall cabinet with music box and specimens
 * - Armchair nook with journal
 * - Storage crates hiding crawlspace (key)
 * - Coat rack (sigil #3)
 * - Window alcove with photograph
 */

import { Suspense } from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Desk } from './Desk';
import { Bookshelf } from './Bookshelf';
import { FilingCabinet } from './FilingCabinet';
import { TallCabinet } from './TallCabinet';
import { StorageCrates } from './StorageCrates';
import { ArmchairNook } from './ArmchairNook';
import { CoatRack } from './CoatRack';
import { WindowAlcove } from './WindowAlcove';
import { OFFICE_TOON_COLORS, useOfficeToonGradient } from './officeToon';

interface ForgottenOfficeProps {
  onTrapTriggered?: () => void;
  onKeeperAwakened?: () => void;
}

// Office dimensions - rectangular room
const OFFICE = {
  width: 12,      // X axis
  depth: 14,      // Z axis
  height: 4,
  wallThickness: 0.3,
  floorY: 0,
};

export function ForgottenOffice({ 
  onTrapTriggered, 
  onKeeperAwakened 
}: ForgottenOfficeProps = {}) {
  return (
    <group>
      {/* Lighting */}
      <OfficeLighting />
      
      {/* Room structure */}
      <OfficeFloor />
      <OfficeWalls />
      <OfficeCeiling />
      
      {/* Furniture and interactables */}
      <Suspense fallback={null}>
        {/* Main desk with grimoire case - center back of room */}
        <Desk 
          position={[0, 0, -5]} 
          onTrapTriggered={onTrapTriggered}
          onKeeperAwakened={onKeeperAwakened}
        />
        
        {/* Bookshelf - left wall */}
        <Bookshelf position={[-5, 0, -3]} rotation={[0, Math.PI / 2, 0]} />
        
        {/* Tall Cabinet with music box - right back corner */}
        <TallCabinet position={[5, 0, -4]} rotation={[0, -Math.PI / 2, 0]} />
        
        {/* Filing Cabinet - right wall */}
        <FilingCabinet position={[5, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
        
        {/* Armchair nook with journal - left front corner */}
        <ArmchairNook position={[-4, 0, 3]} rotation={[0, Math.PI / 4, 0]} />
        
        {/* Storage Crates hiding crawlspace - right front corner */}
        <StorageCrates position={[4.5, 0, 4]} />
        
        {/* Coat rack with sigil in pocket - near door */}
        <CoatRack position={[-2, 0, 5.5]} />
        
        {/* Window alcove with photograph - back wall center */}
        <WindowAlcove position={[0, 1.5, -6.3]} />
      </Suspense>
      
      {/* Entry door position marker */}
      <EntryDoor position={[0, 0, 6.5]} />
      
      {/* Scattered clutter for atmosphere */}
      <OfficeClutter />
      
      {/* Dust particle effect placeholder */}
      <DustParticles />
    </group>
  );
}

/**
 * Office Lighting - Atmospheric, dusty, abandoned feel
 */
function OfficeLighting() {
  return (
    <>
      {/* Low ambient to preserve dark mood while keeping readability */}
      <ambientLight intensity={0.28} color="#6a6a8e" />

      {/* Main directional key for hard-edged cel shadows */}
      <directionalLight
        position={[6, 6, -2]}
        intensity={1.05}
        color="#f7ead6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={30}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={0}
      />
      
      {/* Main window light - dusty shaft */}
      <spotLight
        position={[0, 3.5, -6]}
        target-position={[0, 0, 0]}
        angle={0.5}
        penumbra={0.2}
        intensity={2.2}
        color="#c9b896"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.001}
        shadow-radius={0}
      />
      
      {/* Desk lamp (off but with slight glow) */}
      <pointLight
        position={[-1.5, 1.2, -5]}
        intensity={0.35}
        color="#ffcc88"
        distance={4}
      />
      
      {/* Fill light from door */}
      <pointLight
        position={[0, 2, 6]}
        intensity={0.85}
        color="#9090b8"
        distance={10}
      />
      
      {/* Cool fill to lift shadows without flattening */}
      <directionalLight
        position={[-4, 4, 6]}
        intensity={0.35}
        color="#8fa6c9"
      />
      
      {/* Subtle accent on tall cabinet (specimens glow) */}
      <pointLight
        position={[5, 1.5, -4]}
        intensity={0.2}
        color="#88ffaa"
        distance={3}
      />
    </>
  );
}

/**
 * Office Floor - Wooden planks with dust
 */
function OfficeFloor() {
  const toonGradient = useOfficeToonGradient();
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider 
        args={[OFFICE.width / 2, 0.1, OFFICE.depth / 2]} 
        position={[0, -0.1, 0]} 
      />
      
      {/* Main floor */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]} 
        receiveShadow
      >
        <planeGeometry args={[OFFICE.width, OFFICE.depth]} />
        <meshToonMaterial 
          color={OFFICE_TOON_COLORS.floor}
          gradientMap={toonGradient}
        />
      </mesh>
      
      {/* Floor planks pattern */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh 
          key={i}
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[(i - 3.5) * 1.5, 0.002, 0]}
        >
          <planeGeometry args={[0.03, OFFICE.depth]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.woodDark} gradientMap={toonGradient} />
        </mesh>
      ))}
      
      {/* Worn rug under desk */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0.005, -4]}
      >
        <planeGeometry args={[4, 3]} />
        <meshToonMaterial 
          color={OFFICE_TOON_COLORS.fabricDark} 
          gradientMap={toonGradient}
        />
      </mesh>
    </RigidBody>
  );
}

/**
 * Office Walls
 */
function OfficeWalls() {
  const toonGradient = useOfficeToonGradient();
  const halfWidth = OFFICE.width / 2;
  const halfDepth = OFFICE.depth / 2;
  const wallHeight = OFFICE.height;
  
  return (
    <RigidBody type="fixed" colliders={false}>
      {/* Back wall (with window cutout handled by WindowAlcove) */}
      <CuboidCollider 
        args={[halfWidth, wallHeight / 2, OFFICE.wallThickness / 2]}
        position={[0, wallHeight / 2, -halfDepth]}
      />
      <mesh position={[0, wallHeight / 2, -halfDepth]} receiveShadow>
        <boxGeometry args={[OFFICE.width, wallHeight, OFFICE.wallThickness]} />
        <meshToonMaterial color={OFFICE_TOON_COLORS.wall} gradientMap={toonGradient} />
      </mesh>
      
      {/* Left wall */}
      <CuboidCollider 
        args={[OFFICE.wallThickness / 2, wallHeight / 2, halfDepth]}
        position={[-halfWidth, wallHeight / 2, 0]}
      />
      <mesh position={[-halfWidth, wallHeight / 2, 0]} receiveShadow>
        <boxGeometry args={[OFFICE.wallThickness, wallHeight, OFFICE.depth]} />
        <meshToonMaterial color={OFFICE_TOON_COLORS.wall} gradientMap={toonGradient} />
      </mesh>
      
      {/* Right wall */}
      <CuboidCollider 
        args={[OFFICE.wallThickness / 2, wallHeight / 2, halfDepth]}
        position={[halfWidth, wallHeight / 2, 0]}
      />
      <mesh position={[halfWidth, wallHeight / 2, 0]} receiveShadow>
        <boxGeometry args={[OFFICE.wallThickness, wallHeight, OFFICE.depth]} />
        <meshToonMaterial color={OFFICE_TOON_COLORS.wall} gradientMap={toonGradient} />
      </mesh>
      
      {/* Front wall with door gap */}
      <CuboidCollider 
        args={[2.5, wallHeight / 2, OFFICE.wallThickness / 2]}
        position={[-3.5, wallHeight / 2, halfDepth]}
      />
      <mesh position={[-3.5, wallHeight / 2, halfDepth]} receiveShadow>
        <boxGeometry args={[5, wallHeight, OFFICE.wallThickness]} />
        <meshToonMaterial color={OFFICE_TOON_COLORS.wall} gradientMap={toonGradient} />
      </mesh>
      
      <CuboidCollider 
        args={[2.5, wallHeight / 2, OFFICE.wallThickness / 2]}
        position={[3.5, wallHeight / 2, halfDepth]}
      />
      <mesh position={[3.5, wallHeight / 2, halfDepth]} receiveShadow>
        <boxGeometry args={[5, wallHeight, OFFICE.wallThickness]} />
        <meshToonMaterial color={OFFICE_TOON_COLORS.wall} gradientMap={toonGradient} />
      </mesh>
      
      {/* Above door */}
      <mesh position={[0, wallHeight - 0.5, halfDepth]} receiveShadow>
        <boxGeometry args={[2, 1, OFFICE.wallThickness]} />
        <meshToonMaterial color={OFFICE_TOON_COLORS.wall} gradientMap={toonGradient} />
      </mesh>
    </RigidBody>
  );
}

/**
 * Office Ceiling
 */
function OfficeCeiling() {
  const toonGradient = useOfficeToonGradient();
  return (
    <mesh position={[0, OFFICE.height, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[OFFICE.width, OFFICE.depth]} />
      <meshToonMaterial color={OFFICE_TOON_COLORS.metalDark} gradientMap={toonGradient} />
    </mesh>
  );
}

/**
 * Entry Door - Player spawn area
 */
function EntryDoor({ position }: { position: [number, number, number] }) {
  const toonGradient = useOfficeToonGradient();
  return (
    <group position={position}>
      {/* Door frame */}
      <mesh position={[-0.9, 1.5, 0]} castShadow>
        <boxGeometry args={[0.15, 3, 0.3]} />
        <meshToonMaterial color="#3a2a1a" gradientMap={toonGradient} />
      </mesh>
      <mesh position={[0.9, 1.5, 0]} castShadow>
        <boxGeometry args={[0.15, 3, 0.3]} />
        <meshToonMaterial color="#3a2a1a" gradientMap={toonGradient} />
      </mesh>
      <mesh position={[0, 3.1, 0]} castShadow>
        <boxGeometry args={[1.95, 0.2, 0.3]} />
        <meshToonMaterial color="#3a2a1a" gradientMap={toonGradient} />
      </mesh>
      
      {/* Door (slightly ajar) */}
      <group position={[-0.8, 0, 0]} rotation={[0, 0.3, 0]}>
        <mesh position={[0.4, 1.4, 0]} castShadow>
          <boxGeometry args={[0.8, 2.8, 0.08]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.woodMid} gradientMap={toonGradient} />
        </mesh>
        {/* Door handle */}
        <mesh position={[0.7, 1.3, 0.06]} castShadow>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.metalGold} gradientMap={toonGradient} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Office Clutter - Small props for atmosphere
 */
function OfficeClutter() {
  const toonGradient = useOfficeToonGradient();
  return (
    <group>
      {/* Fallen books near bookshelf */}
      <mesh position={[-4, 0.1, -1.5]} rotation={[0.1, 0.3, Math.PI / 2]} castShadow>
        <boxGeometry args={[0.2, 0.15, 0.25]} />
        <meshToonMaterial color={OFFICE_TOON_COLORS.woodLight} gradientMap={toonGradient} />
      </mesh>
      <mesh position={[-3.8, 0.15, -1.3]} rotation={[-0.05, 0.8, Math.PI / 2 - 0.1]} castShadow>
        <boxGeometry args={[0.18, 0.12, 0.22]} />
        <meshToonMaterial color="#4a5a6a" gradientMap={toonGradient} />
      </mesh>
      
      {/* Scattered papers near desk */}
      {[0, 1, 2].map((i) => (
        <mesh 
          key={i}
          position={[
            -0.5 + Math.random() * 1,
            0.01,
            -3 + Math.random() * 0.5
          ]} 
          rotation={[-Math.PI / 2, 0, Math.random() * Math.PI]}
        >
          <planeGeometry args={[0.2, 0.25]} />
          <meshToonMaterial 
            color={OFFICE_TOON_COLORS.paper} 
            side={2}
            gradientMap={toonGradient}
          />
        </mesh>
      ))}
      
      {/* Broken quill on floor */}
      <mesh position={[1, 0.02, -4]} rotation={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.01, 0.005, 0.2, 6]} />
        <meshToonMaterial color="#2a2a2a" gradientMap={toonGradient} />
      </mesh>
      
      {/* Overturned inkwell */}
      <mesh position={[0.8, 0.05, -4.2]} rotation={[Math.PI / 2 - 0.3, 0, 0.5]} castShadow>
        <cylinderGeometry args={[0.04, 0.03, 0.08, 8]} />
        <meshToonMaterial color={OFFICE_TOON_COLORS.ink} gradientMap={toonGradient} />
      </mesh>
      
      {/* Ink stain */}
      <mesh position={[0.9, 0.003, -4.3]} rotation={[-Math.PI / 2, 0, 0.8]}>
        <circleGeometry args={[0.15, 12]} />
        <meshToonMaterial color="#1a1a3a" gradientMap={toonGradient} />
      </mesh>
      
      {/* Cobwebs in corners (simple mesh) */}
      <mesh position={[-5.8, 3.8, -6.8]} rotation={[0, Math.PI / 4, 0]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial 
          color="#888888" 
          transparent 
          opacity={0.15}
          side={2}
        />
      </mesh>
    </group>
  );
}

/**
 * Dust Particles - Floating dust motes in light shafts
 */
function DustParticles() {
  // Placeholder - would use a particle system or instanced mesh
  // For now, just some floating specks
  const particles = Array.from({ length: 30 }).map((_, i) => ({
    x: (Math.random() - 0.5) * 4,
    y: Math.random() * 3 + 0.5,
    z: (Math.random() - 0.5) * 4 - 3,
    scale: 0.01 + Math.random() * 0.015,
  }));
  
  return (
    <group>
      {particles.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <sphereGeometry args={[p.scale, 4, 4]} />
          <meshBasicMaterial 
            color="#ffffee" 
            transparent 
            opacity={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}

export default ForgottenOffice;
