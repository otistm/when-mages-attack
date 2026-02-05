/**
 * Desk - Main desk with grimoire case and sigil pedestals
 * The grimoire case is the main objective
 */

import * as THREE from 'three';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { GrimoireCase } from './props';
import { OFFICE_TOON_COLORS, useOfficeToonGradient } from './officeToon';

interface DeskProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  onTrapTriggered?: () => void;
  onKeeperAwakened?: () => void;
}

export function Desk({ 
  position, 
  rotation = [0, 0, 0],
  onTrapTriggered,
  onKeeperAwakened,
}: DeskProps) {
  const toonGradient = useOfficeToonGradient();
  return (
    <group position={position} rotation={rotation}>
      <RigidBody type="fixed" colliders={false}>
        {/* Desk collision */}
        <CuboidCollider args={[1.2, 0.4, 0.5]} position={[0, 0.75, 0]} />
        
        {/* Desk top */}
        <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.4, 0.08, 1]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.woodMid} gradientMap={toonGradient} />
        </mesh>
        
        {/* Desk front panel */}
        <mesh position={[0, 0.4, 0.45]} castShadow>
          <boxGeometry args={[2.3, 0.7, 0.05]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.woodDark} gradientMap={toonGradient} />
        </mesh>
        
        {/* Left drawer stack */}
        <mesh position={[-0.8, 0.4, 0]} castShadow>
          <boxGeometry args={[0.6, 0.7, 0.9]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.woodDark} gradientMap={toonGradient} />
        </mesh>
        {/* Drawer handles */}
        <mesh position={[-0.8, 0.55, 0.46]} castShadow>
          <boxGeometry args={[0.15, 0.03, 0.03]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.metalGold} gradientMap={toonGradient} />
        </mesh>
        <mesh position={[-0.8, 0.3, 0.46]} castShadow>
          <boxGeometry args={[0.15, 0.03, 0.03]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.metalGold} gradientMap={toonGradient} />
        </mesh>
        
        {/* Right drawer stack */}
        <mesh position={[0.8, 0.4, 0]} castShadow>
          <boxGeometry args={[0.6, 0.7, 0.9]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.woodDark} gradientMap={toonGradient} />
        </mesh>
        <mesh position={[0.8, 0.55, 0.46]} castShadow>
          <boxGeometry args={[0.15, 0.03, 0.03]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.metalGold} gradientMap={toonGradient} />
        </mesh>
        <mesh position={[0.8, 0.3, 0.46]} castShadow>
          <boxGeometry args={[0.15, 0.03, 0.03]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.metalGold} gradientMap={toonGradient} />
        </mesh>
        
        {/* Desk legs (visible parts) */}
        <mesh position={[-1.1, 0.05, -0.4]} castShadow>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshToonMaterial color="#3a2a1a" gradientMap={toonGradient} />
        </mesh>
        <mesh position={[1.1, 0.05, -0.4]} castShadow>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshToonMaterial color="#3a2a1a" gradientMap={toonGradient} />
        </mesh>
      </RigidBody>
      
      {/* Desk items */}
      <DeskItems />
      
      {/* Sigil pedestals on desk - will be interactive */}
      <SigilPedestals />
      
      {/* Grimoire Case - THE MAIN OBJECTIVE */}
      <GrimoireCase 
        position={[0, 0.79, -0.25]}
        onTrapTriggered={onTrapTriggered}
        onKeeperAwakened={onKeeperAwakened}
      />
      
      {/* Desk chair */}
      <DeskChair position={[0, 0, 1]} />
    </group>
  );
}

/**
 * Items on the desk surface
 */
function DeskItems() {
  const toonGradient = useOfficeToonGradient();
  return (
    <group position={[0, 0.79, 0]}>
      {/* Stack of papers */}
      <mesh position={[-0.6, 0.03, -0.2]} castShadow>
        <boxGeometry args={[0.25, 0.06, 0.3]} />
        <meshToonMaterial color={OFFICE_TOON_COLORS.paper} gradientMap={toonGradient} />
      </mesh>
      
      {/* Inkwell */}
      <mesh position={[0.4, 0.04, -0.3]} castShadow>
        <cylinderGeometry args={[0.04, 0.035, 0.08, 8]} />
        <meshToonMaterial color={OFFICE_TOON_COLORS.ink} gradientMap={toonGradient} />
      </mesh>
      
      {/* Quill in inkwell */}
      <mesh position={[0.42, 0.12, -0.3]} rotation={[0.2, 0, 0.1]} castShadow>
        <cylinderGeometry args={[0.008, 0.003, 0.2, 6]} />
        <meshToonMaterial color="#2a2a2a" gradientMap={toonGradient} />
      </mesh>
      
      {/* Desk lamp (off) */}
      <group position={[-0.9, 0, 0.2]}>
        <mesh position={[0, 0.02, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.1, 0.04, 8]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.metalGold} gradientMap={toonGradient} />
        </mesh>
        <mesh position={[0, 0.15, 0]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.25, 8]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.metalGold} gradientMap={toonGradient} />
        </mesh>
        <mesh position={[0, 0.32, 0]} rotation={[0.1, 0, 0]} castShadow>
          <coneGeometry args={[0.1, 0.12, 8, 1, true]} />
          <meshToonMaterial 
            color="#8a7a5a" 
            side={THREE.DoubleSide}
            gradientMap={toonGradient}
          />
        </mesh>
      </group>
      
      {/* Small book */}
      <mesh position={[0.7, 0.04, 0.1]} rotation={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.15, 0.08, 0.2]} />
        <meshToonMaterial color="#6a3a2a" gradientMap={toonGradient} />
      </mesh>
      
      {/* Magnifying glass */}
      <mesh position={[0.5, 0.02, 0.25]} rotation={[Math.PI / 2, 0, 0.5]}>
        <torusGeometry args={[0.04, 0.008, 8, 16]} />
        <meshToonMaterial color={OFFICE_TOON_COLORS.metalGold} gradientMap={toonGradient} />
      </mesh>
      <mesh position={[0.55, 0.02, 0.3]} rotation={[Math.PI / 2, 0, 0.5]}>
        <cylinderGeometry args={[0.012, 0.008, 0.1, 6]} />
        <meshToonMaterial color="#4a3020" gradientMap={toonGradient} />
      </mesh>
    </group>
  );
}

/**
 * Sigil pedestals - where player places collected sigils
 */
function SigilPedestals() {
  const toonGradient = useOfficeToonGradient();
  const positions: [number, number, number][] = [
    [-0.3, 0.82, -0.35], // left
    [0, 0.82, -0.35],     // center
    [0.3, 0.82, -0.35],   // right
  ];
  
  return (
    <group>
      {positions.map((pos, i) => (
        <group key={i} position={pos}>
          {/* Small stone pedestal */}
          <mesh castShadow>
            <cylinderGeometry args={[0.06, 0.07, 0.04, 8]} />
            <meshToonMaterial 
              color={OFFICE_TOON_COLORS.stone} 
              gradientMap={toonGradient}
            />
          </mesh>
          {/* Carved sigil slot */}
          <mesh position={[0, 0.021, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.01, 6]} />
            <meshToonMaterial 
              color="#3a3a4a" 
              gradientMap={toonGradient}
            />
          </mesh>
          {/* Faint glow indicating slot */}
          <pointLight 
            position={[0, 0.05, 0]} 
            color="#6655aa" 
            intensity={0.1} 
            distance={0.3}
          />
        </group>
      ))}
    </group>
  );
}

/**
 * Desk Chair
 */
function DeskChair({ position }: { position: [number, number, number] }) {
  const toonGradient = useOfficeToonGradient();
  return (
    <group position={position} rotation={[0, Math.PI + 0.2, 0]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.25, 0.4, 0.25]} position={[0, 0.4, 0]} />
        
        {/* Seat */}
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[0.5, 0.08, 0.5]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.woodDark} gradientMap={toonGradient} />
        </mesh>
        
        {/* Back */}
        <mesh position={[0, 0.75, -0.22]} castShadow>
          <boxGeometry args={[0.5, 0.6, 0.06]} />
          <meshToonMaterial color={OFFICE_TOON_COLORS.woodDark} gradientMap={toonGradient} />
        </mesh>
        
        {/* Legs */}
        {[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.22, z]} castShadow>
            <boxGeometry args={[0.05, 0.44, 0.05]} />
            <meshToonMaterial color="#3a2a1a" gradientMap={toonGradient} />
          </mesh>
        ))}
      </RigidBody>
    </group>
  );
}

export default Desk;
