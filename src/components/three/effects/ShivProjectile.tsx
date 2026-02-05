/**
 * ShivProjectile - Stabbing projectile that thrusts from player HP bar to enemy
 * 
 * Animation sequence (simulates real stabbing motion):
 * 1. EMERGE: Blade emerges from player HP bar area (0.15s)
 * 2. THRUST: Fast thrust toward enemy HP bar (0.12s) - the attack
 * 3. IMPACT: Brief pause at enemy HP bar, damage dealt (0.08s)
 * 4. RETRACT: Pull back to player HP bar (0.2s)
 * 
 * The shiv does NOT spawn as a minion - it's a direct attack projectile
 * that stabs out and retracts like a real shiv attack.
 */

import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useDamageStore } from '@/stores/damageStore';
import { useGameStore } from '@/stores/gameStore';
import { StatusEffectConfig } from '@/types';

// Preload the model
useGLTF.preload('/assets/models/rusty-shiv_cel.glb');

interface ShivProjectileProps {
  id: string;
  startPosition: [number, number, number]; // Player HP bar position (where shiv emerges)
  endPosition: [number, number, number];   // Enemy HP bar position (stab target)
  damage: number;
  onHit: (id: string) => void;            // Called on impact - apply damage here
  onComplete: (id: string) => void;       // Called after full animation - remove projectile here
  delay?: number;
  targetTeam?: 'player' | 'enemy';
  statusEffect?: StatusEffectConfig;
}

type AnimationPhase = 'waiting' | 'emerge' | 'thrust' | 'impact' | 'retract' | 'done';

// Timing configuration (in seconds) - Dramatic but readable
const TIMING = {
  emerge: 0.25,    // Blade emerges from player side
  thrust: 0.20,    // Fast thrust toward enemy - the stab
  impact: 0.15,    // Pause at impact - feel the hit
  retract: 0.35,   // Pull back to player side
};

export function ShivProjectile({
  id,
  startPosition,
  endPosition,
  damage,
  onHit,
  onComplete,
  delay = 0,
  targetTeam = 'enemy',
  statusEffect,
}: ShivProjectileProps) {
  const shivRef = useRef<THREE.Group>(null);
  const trailRef = useRef<THREE.Mesh>(null);
  
  const [phase, setPhase] = useState<AnimationPhase>('waiting');
  const phaseStartTime = useRef(0);
  const delayStartTime = useRef<number | null>(null);
  const hitTriggered = useRef(false);
  
  const addCameraTrauma = useGameStore((state) => state.addCameraTrauma);
  const addDamageEvent = useDamageStore((state) => state.addDamageEvent);
  
  // Load the shiv model
  const { scene } = useGLTF('/assets/models/rusty-shiv_cel.glb');
  
  // Clone the scene for this instance
  const shivModel = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = child.material.clone();
      }
    });
    return clone;
  }, [scene]);
  
  // Trail geometry for speed effect during thrust
  const trailGeometry = useMemo(() => new THREE.PlaneGeometry(0.2, 1.5), []);
  
  // Trail material
  const trailMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#8B4513',
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, []);
  
  // Cleanup
  useEffect(() => {
    return () => {
      trailGeometry.dispose();
      trailMaterial.dispose();
    };
  }, [trailGeometry, trailMaterial]);
  
  // Easing functions
  const easeOutBack = (t: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  
  const easeInQuart = (t: number): number => t * t * t * t;
  
  const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);
  
  const easeInOutQuart = (t: number): number => {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  };

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (!shivRef.current) return;
    
    // Handle delay
    if (phase === 'waiting') {
      if (delayStartTime.current === null) {
        delayStartTime.current = time;
      }
      if (time - delayStartTime.current < delay) {
        shivRef.current.visible = false;
        return;
      }
      shivRef.current.visible = true;
      setPhase('emerge');
      phaseStartTime.current = time;
      return;
    }
    
    const phaseElapsed = time - phaseStartTime.current;
    
    let currentPos = new THREE.Vector3();
    let currentRotation = new THREE.Euler();
    let scale = 1;
    let trailOpacity = 0;
    
    // Calculate direction from start to end for rotation
    const direction = new THREE.Vector3(
      endPosition[0] - startPosition[0],
      endPosition[1] - startPosition[1],
      endPosition[2] - startPosition[2]
    ).normalize();
    
    // Fixed rotation to point blade tip toward enemy
    // Based on debug testing with Leva controls
    const baseRotationX = THREE.MathUtils.degToRad(-84);
    const baseRotationY = THREE.MathUtils.degToRad(-44);
    const baseRotationZ = THREE.MathUtils.degToRad(-115);
    
    switch (phase) {
      case 'emerge': {
        const t = Math.min(phaseElapsed / TIMING.emerge, 1);
        const eased = easeOutBack(t);
        
        // Emerge from start position (player HP bar) - slight pull back then forward
        const emergeOffset = eased * 0.5; // Move slightly forward
        currentPos.set(
          startPosition[0] + direction.x * emergeOffset,
          startPosition[1] + direction.y * emergeOffset,
          startPosition[2] + direction.z * emergeOffset
        );
        
        // Blade TIP pointing toward enemy, slight wobble as it emerges
        const wobble = Math.sin(t * Math.PI * 6) * 0.05 * (1 - t);
        currentRotation.set(
          baseRotationX + wobble,
          baseRotationY,
          baseRotationZ + wobble
        );
        
        scale = 0.3 + eased * 0.7; // Scale up as it emerges
        
        if (t >= 1) {
          setPhase('thrust');
          phaseStartTime.current = time;
        }
        break;
      }
      
      case 'thrust': {
        const t = Math.min(phaseElapsed / TIMING.thrust, 1);
        const eased = easeInQuart(t); // Accelerating thrust
        
        // FAST movement from start to end
        currentPos.set(
          THREE.MathUtils.lerp(startPosition[0], endPosition[0], eased),
          THREE.MathUtils.lerp(startPosition[1], endPosition[1], eased),
          THREE.MathUtils.lerp(startPosition[2], endPosition[2], eased)
        );
        
        // Stable rotation during thrust - blade tip leading
        currentRotation.set(
          baseRotationX,
          baseRotationY,
          baseRotationZ
        );
        
        // Stretch effect for speed (squash and stretch)
        scale = 1 + eased * 0.4;
        
        // Motion trail
        trailOpacity = 0.6 + eased * 0.3;
        
        if (t >= 1) {
          setPhase('impact');
          phaseStartTime.current = time;
        }
        break;
      }
      
      case 'impact': {
        const t = Math.min(phaseElapsed / TIMING.impact, 1);
        
        // Stick at end position with slight overshoot
        const overshoot = Math.sin(t * Math.PI) * 0.2;
        currentPos.set(
          endPosition[0] + direction.x * overshoot,
          endPosition[1] + direction.y * overshoot,
          endPosition[2] + direction.z * overshoot
        );
        
        // Slight shake on impact
        const shake = (1 - t) * 0.15;
        currentRotation.set(
          baseRotationX + (Math.random() - 0.5) * shake,
          baseRotationY + (Math.random() - 0.5) * shake,
          baseRotationZ + (Math.random() - 0.5) * shake
        );
        
        scale = 1.4 - t * 0.2; // Slight scale down from stretched
        trailOpacity = 0.9 * (1 - t);
        
        // Trigger damage on first frame of impact
        if (!hitTriggered.current) {
          hitTriggered.current = true;
          
          // STRONG camera shake for impact
          addCameraTrauma(0.3);
          
          // Damage number
          addDamageEvent(damage, targetTeam, [
            endPosition[0],
            endPosition[1] + 0.5,
            endPosition[2],
          ]);
          
          // Apply damage NOW (but don't remove projectile yet)
          onHit(id);
        }
        
        if (t >= 1) {
          setPhase('retract');
          phaseStartTime.current = time;
        }
        break;
      }
      
      case 'retract': {
        const t = Math.min(phaseElapsed / TIMING.retract, 1);
        const eased = easeOutQuart(t); // Smooth deceleration back
        
        // Pull back from end to start
        currentPos.set(
          THREE.MathUtils.lerp(endPosition[0], startPosition[0], eased),
          THREE.MathUtils.lerp(endPosition[1], startPosition[1], eased),
          THREE.MathUtils.lerp(endPosition[2], startPosition[2], eased)
        );
        
        // Rotation stays stable during retract
        currentRotation.set(
          baseRotationX,
          baseRotationY,
          baseRotationZ
        );
        
        // Keep full scale during retract - no fading, shiv stays fully visible
        scale = 1.0;
        
        // NO FADE - shiv stays fully visible as it retracts back to player
        
        if (t >= 1) {
          // Animation complete - NOW we can remove the projectile
          onComplete(id);
          setPhase('done');
        }
        break;
      }
      
      case 'done':
        return;
    }
    
    // Apply transforms
    shivRef.current.position.copy(currentPos);
    shivRef.current.rotation.copy(currentRotation);
    shivRef.current.scale.setScalar(scale * 6.5); // Base scale from debug testing
    
    // Update trail
    if (trailRef.current) {
      // Position trail between current and previous position (approximated)
      const trailPos = currentPos.clone();
      trailPos.x -= direction.x * 0.5;
      trailPos.y -= direction.y * 0.5;
      trailPos.z -= direction.z * 0.5;
      trailRef.current.position.copy(trailPos);
      trailRef.current.lookAt(currentPos);
      trailMaterial.opacity = trailOpacity;
    }
  });
  
  if (phase === 'done') return null;
  
  return (
    <group>
      {/* The shiv model */}
      <group ref={shivRef} position={startPosition}>
        <primitive object={shivModel} />
      </group>
      
      {/* Speed trail during thrust */}
      <mesh
        ref={trailRef}
        geometry={trailGeometry}
        material={trailMaterial}
        visible={phase === 'thrust' || phase === 'impact'}
      />
      
      {/* Impact flash */}
      {phase === 'impact' && (
        <>
          <ImpactFlash position={endPosition} />
          <StabText position={endPosition} />
        </>
      )}
    </group>
  );
}

/**
 * Brief flash effect on impact
 */
function ImpactFlash({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const startTime = useRef<number | null>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    if (startTime.current === null) {
      startTime.current = state.clock.elapsedTime;
    }
    
    const elapsed = state.clock.elapsedTime - startTime.current;
    const t = Math.min(elapsed / 0.1, 1);
    
    // Quick expand and fade
    const scale = 0.5 + t * 2;
    const opacity = 1 - t;
    
    meshRef.current.scale.setScalar(scale);
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
  });
  
  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.3, 8, 8]} />
      <meshBasicMaterial
        color="#ff4444"
        transparent
        opacity={1}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Animated "STAB!" text on impact
 */
function StabText({ position }: { position: [number, number, number] }) {
  const textRef = useRef<THREE.Mesh>(null);
  const startTime = useRef<number | null>(null);
  const [visible, setVisible] = useState(true);
  
  useFrame((state) => {
    if (!textRef.current || !visible) return;
    
    if (startTime.current === null) {
      startTime.current = state.clock.elapsedTime;
    }
    
    const elapsed = state.clock.elapsedTime - startTime.current;
    const duration = 0.5;
    const t = Math.min(elapsed / duration, 1);
    
    // Pop in, shake, then fade out
    const popIn = t < 0.1 ? t / 0.1 : 1;
    const shake = t < 0.3 ? (Math.random() - 0.5) * 0.3 * (1 - t / 0.3) : 0;
    const fadeOut = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
    
    // Scale: pop in big, then settle
    const scale = popIn * (1.5 - t * 0.5);
    textRef.current.scale.setScalar(scale);
    
    // Position: rise up and shake
    textRef.current.position.set(
      position[0] + shake,
      position[1] + 2 + t * 2, // Rise up
      position[2] + shake * 0.5
    );
    
    // Rotation shake
    textRef.current.rotation.z = shake * 0.5;
    
    // Fade
    const material = (textRef.current as any).material;
    if (material) {
      material.opacity = fadeOut;
    }
    
    if (t >= 1) {
      setVisible(false);
    }
  });
  
  if (!visible) return null;
  
  return (
    <Text
      ref={textRef}
      position={[position[0], position[1] + 2, position[2]]}
      fontSize={1.5}
      color="#ff2222"
      anchorX="center"
      anchorY="middle"
      fontWeight="bold"
      outlineWidth={0.08}
      outlineColor="#000000"
      material-transparent={true}
      material-depthWrite={false}
    >
      STAB!
    </Text>
  );
}

export default ShivProjectile;
