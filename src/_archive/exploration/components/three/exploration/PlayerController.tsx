/**
 * PlayerController - Physics-based third-person character controller
 * Follows skill_r3f_character_controller.md patterns
 */

import { useRef, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useInputStore } from '@/stores/inputStore';

interface MovementConfig {
  walkSpeed: number;
  sprintMultiplier: number;
  acceleration: number;
  deceleration: number;
  rotationSpeed: number;
}

const DEFAULT_MOVEMENT: MovementConfig = {
  walkSpeed: 6,
  sprintMultiplier: 1.6,
  acceleration: 25,
  deceleration: 20,
  rotationSpeed: 12,
};

interface PlayerControllerProps {
  position?: [number, number, number];
  config?: Partial<MovementConfig>;
  cameraYaw: React.RefObject<number>;
  cameraTarget?: React.RefObject<THREE.Object3D>;
}

export interface PlayerControllerHandle {
  getPosition: () => THREE.Vector3;
  getObject: () => THREE.Object3D | null;
}

export const PlayerController = forwardRef<PlayerControllerHandle, PlayerControllerProps>(
  ({ position = [0, 2, 0], config: configOverrides = {}, cameraYaw, cameraTarget }, ref) => {
    const config = { ...DEFAULT_MOVEMENT, ...configOverrides };
    
    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const meshRef = useRef<THREE.Group>(null);
    
    // Movement state
    const velocity = useRef(new THREE.Vector2(0, 0));
    const targetRotation = useRef(0);
    
    // Visual smoothing - interpolate mesh position to avoid physics jitter
    const smoothedPosition = useRef(new THREE.Vector3(...position));
    
    // Input
    const movement = useInputStore(s => s.movement);
    const sprint = useInputStore(s => s.sprint);
    
    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      getPosition: () => {
        if (rigidBodyRef.current) {
          const pos = rigidBodyRef.current.translation();
          return new THREE.Vector3(pos.x, pos.y, pos.z);
        }
        return new THREE.Vector3();
      },
      getObject: () => meshRef.current,
    }));
    
    useFrame((state, delta) => {
      if (!rigidBodyRef.current || !meshRef.current) return;
      
      const rb = rigidBodyRef.current;
      const currentVel = rb.linvel();
      
      // Calculate camera-relative movement direction
      const moveDir = new THREE.Vector3(
        movement.x,
        0,
        -movement.y  // Forward is -Z in Three.js
      );
      
      // Rotate movement by camera yaw
      if (cameraYaw.current !== undefined) {
        moveDir.applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          cameraYaw.current
        );
      }
      
      const inputMagnitude = Math.min(movement.length(), 1);
      const speed = sprint 
        ? config.walkSpeed * config.sprintMultiplier 
        : config.walkSpeed;
      
      // Target velocity
      const targetVelX = moveDir.x * speed * inputMagnitude;
      const targetVelZ = moveDir.z * speed * inputMagnitude;
      
      // Smooth acceleration/deceleration
      const accel = inputMagnitude > 0.1 ? config.acceleration : config.deceleration;
      
      velocity.current.x = THREE.MathUtils.lerp(
        velocity.current.x,
        targetVelX,
        accel * delta
      );
      velocity.current.y = THREE.MathUtils.lerp(
        velocity.current.y,
        targetVelZ,
        accel * delta
      );
      
      // Apply velocity - only allow downward Y velocity (gravity), clamp upward to prevent bouncing
      // This keeps the character grounded without jitter
      const clampedY = Math.min(currentVel.y, 0); // Never allow upward velocity from physics
      
      rb.setLinvel({
        x: velocity.current.x,
        y: clampedY,
        z: velocity.current.y,
      }, true);
      
      // Update mesh position with interpolation to avoid physics jitter
      // The physics body gives us the "true" position, but we lerp the visual
      const pos = rb.translation();
      const targetPos = new THREE.Vector3(pos.x, pos.y, pos.z);
      
      // High lerp factor for responsive feel, but still smooths out jitter
      const lerpFactor = 1 - Math.pow(0.001, delta); // ~0.95 at 60fps
      smoothedPosition.current.lerp(targetPos, lerpFactor);
      
      meshRef.current.position.copy(smoothedPosition.current);
      
      // Update camera target to follow player (at chest height for better framing)
      if (cameraTarget?.current) {
        cameraTarget.current.position.set(
          smoothedPosition.current.x, 
          smoothedPosition.current.y + 1.2, 
          smoothedPosition.current.z
        );
      }
      
      // Rotate character to face movement direction
      if (inputMagnitude > 0.1) {
        targetRotation.current = Math.atan2(moveDir.x, moveDir.z);
      }
      
      // Smooth rotation
      let rotDiff = targetRotation.current - meshRef.current.rotation.y;
      
      // Normalize angle difference to [-PI, PI]
      while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
      while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      
      meshRef.current.rotation.y += rotDiff * config.rotationSpeed * delta;
    });
    
    return (
      <>
        {/* Physics body */}
        <RigidBody
          ref={rigidBodyRef}
          type="dynamic"
          colliders={false}
          mass={1}
          linearDamping={4}
          angularDamping={1000}
          enabledRotations={[false, false, false]}
          position={position}
          userData={{ isPlayer: true }}
          ccd={true}
        >
          <CapsuleCollider 
            args={[0.5, 0.4]} 
            position={[0, 0.9, 0]}
            friction={1}
            restitution={0}
          />
        </RigidBody>
        
        {/* Visual mesh (separate from physics for smooth rendering) */}
        <group ref={meshRef} position={position}>
          <PlayerCharacter />
        </group>
      </>
    );
  }
);

PlayerController.displayName = 'PlayerController';

/**
 * Player Character Visual - Placeholder capsule for now
 */
function PlayerCharacter() {
  return (
    <group>
      {/* Body */}
      <mesh castShadow position={[0, 0.9, 0]}>
        <capsuleGeometry args={[0.35, 1, 8, 16]} />
        <meshStandardMaterial 
          color="#6b4c8a" 
          roughness={0.6}
          metalness={0.2}
        />
      </mesh>
      
      {/* Head */}
      <mesh castShadow position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial 
          color="#8a6b9a" 
          roughness={0.5}
        />
      </mesh>
      
      {/* Direction indicator (nose) */}
      <mesh position={[0, 1.7, -0.28]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.08, 0.15, 8]} />
        <meshStandardMaterial color="#d4af37" />
      </mesh>
      
      {/* Robe hem */}
      <mesh castShadow position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.35, 0.45, 0.3, 16]} />
        <meshStandardMaterial 
          color="#4a3a5a" 
          roughness={0.8}
        />
      </mesh>
    </group>
  );
}
