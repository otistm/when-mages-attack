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
      depthTest: false,
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
    
    // Base rotation (tuned for thrusting along -Z)
    const baseRotationX = THREE.MathUtils.degToRad(-84);
    const baseRotationY = THREE.MathUtils.degToRad(-44);
    const baseRotationZ = THREE.MathUtils.degToRad(-115);
    
    // Full quaternion correction: rotate the base orientation from -Z to actual direction
    const refDir = new THREE.Vector3(0, 0, -1);
    const flatDir = new THREE.Vector3(
      endPosition[0] - startPosition[0],
      0,
      endPosition[2] - startPosition[2]
    ).normalize();
    const correctionQuat = new THREE.Quaternion().setFromUnitVectors(refDir, flatDir);
    
    // Helper: apply base Euler + optional wobble/shake, then rotate by direction correction
    const applyRotation = (extraX = 0, extraY = 0, extraZ = 0) => {
      const baseQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(baseRotationX + extraX, baseRotationY + extraY, baseRotationZ + extraZ)
      );
      const finalQuat = correctionQuat.clone().multiply(baseQuat);
      currentRotation.setFromQuaternion(finalQuat);
    };
    
    switch (phase) {
      case 'emerge': {
        const t = Math.min(phaseElapsed / TIMING.emerge, 1);
        const eased = easeOutBack(t);
        
        const emergeOffset = eased * 0.5;
        currentPos.set(
          startPosition[0] + direction.x * emergeOffset,
          startPosition[1] + direction.y * emergeOffset,
          startPosition[2] + direction.z * emergeOffset
        );
        
        const wobble = Math.sin(t * Math.PI * 6) * 0.05 * (1 - t);
        applyRotation(wobble, 0, wobble);
        
        scale = 0.3 + eased * 0.7;
        
        if (t >= 1) {
          setPhase('thrust');
          phaseStartTime.current = time;
        }
        break;
      }
      
      case 'thrust': {
        const t = Math.min(phaseElapsed / TIMING.thrust, 1);
        const eased = easeInQuart(t);
        
        currentPos.set(
          THREE.MathUtils.lerp(startPosition[0], endPosition[0], eased),
          THREE.MathUtils.lerp(startPosition[1], endPosition[1], eased),
          THREE.MathUtils.lerp(startPosition[2], endPosition[2], eased)
        );
        
        applyRotation();
        
        scale = 1 + eased * 0.4;
        trailOpacity = 0.6 + eased * 0.3;
        
        if (t >= 1) {
          setPhase('impact');
          phaseStartTime.current = time;
        }
        break;
      }
      
      case 'impact': {
        const t = Math.min(phaseElapsed / TIMING.impact, 1);
        
        const overshoot = Math.sin(t * Math.PI) * 0.2;
        currentPos.set(
          endPosition[0] + direction.x * overshoot,
          endPosition[1] + direction.y * overshoot,
          endPosition[2] + direction.z * overshoot
        );
        
        const shake = (1 - t) * 0.15;
        applyRotation(
          (Math.random() - 0.5) * shake,
          (Math.random() - 0.5) * shake,
          (Math.random() - 0.5) * shake
        );
        
        scale = 1.4 - t * 0.2;
        trailOpacity = 0.9 * (1 - t);
        
        if (!hitTriggered.current) {
          hitTriggered.current = true;
          addCameraTrauma(0.3);
          addDamageEvent(damage, targetTeam, [
            endPosition[0],
            endPosition[1] + 0.5,
            endPosition[2],
          ]);
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
        const eased = easeOutQuart(t);
        
        currentPos.set(
          THREE.MathUtils.lerp(endPosition[0], startPosition[0], eased),
          THREE.MathUtils.lerp(endPosition[1], startPosition[1], eased),
          THREE.MathUtils.lerp(endPosition[2], startPosition[2], eased)
        );
        
        applyRotation();
        
        scale = 1.0;
        
        if (t >= 1) {
          onComplete(id);
          setPhase('done');
        }
        break;
      }
      
      case 'done':
        return;
    }
    
    // Apply transforms — offset backward so the blade TIP is at currentPos
    // The model's origin is near its center; the tip extends forward along
    // the thrust direction.  Shifting the model back by tipOffset places the
    // tip exactly where currentPos is, so the tip hits the target first.
    const tipOffset = 3.5; // world-units from model origin to blade tip
    shivRef.current.position.set(
      currentPos.x - direction.x * tipOffset,
      currentPos.y - direction.y * tipOffset,
      currentPos.z - direction.z * tipOffset,
    );
    shivRef.current.rotation.copy(currentRotation);
    shivRef.current.scale.setScalar(scale * 6.5); // Base scale from debug testing
    
    // Update trail
    if (trailRef.current) {
      const trailPos = currentPos.clone();
      trailPos.x -= direction.x * 1.0;
      trailPos.y -= direction.y * 1.0;
      trailPos.z -= direction.z * 1.0;
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
    <mesh ref={meshRef} position={[position[0], position[1] + 0.5, position[2]]} renderOrder={20}>
      <sphereGeometry args={[0.2, 8, 8]} />
      <meshBasicMaterial
        color="#ff4444"
        transparent
        opacity={1}
        depthWrite={false}
        depthTest={false}
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
