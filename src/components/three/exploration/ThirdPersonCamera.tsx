/**
 * ThirdPersonCamera - Orbiting camera with collision detection
 * Follows skill_r3f_character_controller.md patterns
 */

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useInputStore } from '@/stores/inputStore';

interface CameraConfig {
  distance: number;           // Base distance from player
  minDistance: number;        // When camera collides
  height: number;             // Height offset above player
  shoulderOffset: number;     // Left/right offset (0 = centered)
  smoothing: number;          // Camera lag (0-1, lower = more responsive)
  pitchMin: number;           // Look down limit (radians)
  pitchMax: number;           // Look up limit (radians)
}

const DEFAULT_CONFIG: CameraConfig = {
  distance: 6,
  minDistance: 2,
  height: 2,
  shoulderOffset: 0.8,
  smoothing: 0.08,
  pitchMin: -Math.PI / 3,      // -60 degrees (look up)
  pitchMax: Math.PI / 4,       // +45 degrees (look down)
};

interface ThirdPersonCameraProps {
  target: React.RefObject<THREE.Object3D>;
  config?: Partial<CameraConfig>;
  onYawChange?: (yaw: number) => void;
}

export function ThirdPersonCamera({ 
  target,
  config: configOverrides = {},
  onYawChange,
}: ThirdPersonCameraProps) {
  const { camera, scene } = useThree();
  const config = { ...DEFAULT_CONFIG, ...configOverrides };
  
  // Camera orbit angles
  const yaw = useRef(Math.PI);  // Start facing forward (into chamber)
  const pitch = useRef(0.2);    // Slight downward angle
  
  // Smoothed positions
  const smoothedPosition = useRef(new THREE.Vector3(0, 5, 10));
  const smoothedLookAt = useRef(new THREE.Vector3());
  const currentDistance = useRef(config.distance);
  
  // Input
  const cameraInput = useInputStore(s => s.camera);
  const setCamera = useInputStore(s => s.setCamera);
  const inputDevice = useInputStore(s => s.inputDevice);
  const pointerLocked = useInputStore(s => s.pointerLocked);
  
  // Initialize camera position
  useEffect(() => {
    if (target.current) {
      smoothedLookAt.current.copy(target.current.position);
      smoothedLookAt.current.y += config.height * 0.5;
    }
  }, [target, config.height]);
  
  useFrame((state, delta) => {
    if (!target.current) return;
    
    // Apply camera input based on device
    if (inputDevice === 'keyboard' && pointerLocked) {
      // Mouse - input is delta (one-time movement), apply and reset
      if (cameraInput.x !== 0 || cameraInput.y !== 0) {
        yaw.current -= cameraInput.x;
        pitch.current += cameraInput.y;
        // Reset after consuming (mouse delta is instantaneous, not held)
        setCamera(0, 0);
      }
    } else if (inputDevice === 'gamepad') {
      // Gamepad - continuous rotation per frame (don't reset, it's held)
      yaw.current -= cameraInput.x * delta;
      pitch.current -= cameraInput.y * delta;
    }
    
    // Clamp pitch
    pitch.current = THREE.MathUtils.clamp(
      pitch.current,
      config.pitchMin,
      config.pitchMax
    );
    
    // Notify parent of yaw changes (for player rotation)
    onYawChange?.(yaw.current);
    
    // Calculate target position (where player is)
    const targetPos = target.current.position.clone();
    targetPos.y += config.height;
    
    // Calculate camera offset using spherical coordinates
    const horizontalDist = config.distance * Math.cos(pitch.current);
    const verticalDist = config.distance * Math.sin(pitch.current);
    
    const idealOffset = new THREE.Vector3(
      Math.sin(yaw.current) * horizontalDist,
      verticalDist,
      Math.cos(yaw.current) * horizontalDist
    );
    
    // Add shoulder offset (rotated by yaw)
    idealOffset.x += Math.cos(yaw.current) * config.shoulderOffset;
    idealOffset.z -= Math.sin(yaw.current) * config.shoulderOffset;
    
    const idealPosition = targetPos.clone().add(idealOffset);
    
    // Camera collision detection
    const rayDirection = idealOffset.clone().normalize();
    const raycaster = new THREE.Raycaster(
      targetPos,
      rayDirection,
      0.5,
      config.distance + 0.5
    );
    
    // Filter to only check collision-enabled meshes
    const collisionObjects = scene.children.filter(
      child => child.userData?.cameraCollision !== false
    );
    
    const intersects = raycaster.intersectObjects(collisionObjects, true);
    
    let targetDistance = config.distance;
    if (intersects.length > 0) {
      // Pull camera in front of obstacle
      targetDistance = Math.max(
        intersects[0].distance - 0.3,
        config.minDistance
      );
    }
    
    // Smoothly adjust distance
    currentDistance.current = THREE.MathUtils.lerp(
      currentDistance.current,
      targetDistance,
      5 * delta
    );
    
    // Recalculate position with adjusted distance
    const adjustedHorizontalDist = currentDistance.current * Math.cos(pitch.current);
    const adjustedVerticalDist = currentDistance.current * Math.sin(pitch.current);
    
    const adjustedOffset = new THREE.Vector3(
      Math.sin(yaw.current) * adjustedHorizontalDist,
      adjustedVerticalDist,
      Math.cos(yaw.current) * adjustedHorizontalDist
    );
    
    adjustedOffset.x += Math.cos(yaw.current) * config.shoulderOffset;
    adjustedOffset.z -= Math.sin(yaw.current) * config.shoulderOffset;
    
    const adjustedPosition = targetPos.clone().add(adjustedOffset);
    
    // Smooth camera movement
    const smoothFactor = 1 - Math.pow(config.smoothing, delta * 60);
    smoothedPosition.current.lerp(adjustedPosition, smoothFactor);
    camera.position.copy(smoothedPosition.current);
    
    // Smooth look-at (slightly ahead of player position)
    const lookAtTarget = targetPos.clone();
    lookAtTarget.y -= config.height * 0.3; // Look slightly below center
    smoothedLookAt.current.lerp(lookAtTarget, smoothFactor);
    camera.lookAt(smoothedLookAt.current);
  });
  
  return null;
}

// Export yaw ref hook for player rotation
export function useCameraYaw() {
  const yawRef = useRef(0);
  const setYaw = (yaw: number) => { yawRef.current = yaw; };
  return { yawRef, setYaw };
}
