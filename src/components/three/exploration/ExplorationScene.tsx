/**
 * ExplorationScene - Main 3D exploration mode scene
 * Assembles player, camera, and environment
 */

import { Suspense, useRef, useCallback } from 'react';
import { Physics } from '@react-three/rapier';
import { Stats } from '@react-three/drei';
import * as THREE from 'three';

import { InputManager } from './InputManager';
import { PlayerController, PlayerControllerHandle } from './PlayerController';
import { ThirdPersonCamera } from './ThirdPersonCamera';
import { ForgottenOffice } from './office';
import { InteractionSystem } from './InteractionSystem';

interface ExplorationSceneProps {
  onTrapTriggered?: () => void;
  onKeeperAwakened?: () => void;
}

export function ExplorationScene({ 
  onTrapTriggered, 
  onKeeperAwakened 
}: ExplorationSceneProps = {}) {
  const isDev = import.meta.env.DEV;
  
  return (
    <>
      {isDev && <Stats />}
      
      {/* Input handling (keyboard + gamepad) */}
      <InputManager />
      
      {/* Physics world */}
      <Physics gravity={[0, -20, 0]} debug={false}>
        <Suspense fallback={null}>
          {/* Environment - The Forgotten Office */}
          <ForgottenOffice 
            onTrapTriggered={onTrapTriggered}
            onKeeperAwakened={onKeeperAwakened}
          />
          
          {/* Player + Camera System */}
          <PlayerCameraSystem />
        </Suspense>
      </Physics>
      
      {/* Sky / background - darker for office atmosphere */}
      <color attach="background" args={['#0a0a12']} />
      <fog attach="fog" args={['#0a0a12', 10, 25]} />
    </>
  );
}

/**
 * PlayerCameraSystem - Manages player and camera together
 * Uses a separate target object that syncs with player position
 */
function PlayerCameraSystem() {
  const playerRef = useRef<PlayerControllerHandle>(null);
  
  // Create a stable target object for camera to follow
  // This is a simple Object3D that we'll position at the player's location
  const cameraTargetRef = useRef<THREE.Object3D>(null!);
  if (!cameraTargetRef.current) {
    cameraTargetRef.current = new THREE.Object3D();
    cameraTargetRef.current.position.set(0, 1, 5); // Start near office door
  }
  
  const cameraYawRef = useRef(Math.PI); // Face into the office (towards -Z)
  
  const handleYawChange = useCallback((yaw: number) => {
    cameraYawRef.current = yaw;
  }, []);
  
  return (
    <>
      {/* Player - spawns near office doorway */}
      <PlayerController
        ref={playerRef}
        position={[0, 1, 5]}
        cameraYaw={cameraYawRef}
        cameraTarget={cameraTargetRef}
      />
      
      {/* Camera follows the target object */}
      <ThirdPersonCamera
        target={cameraTargetRef}
        onYawChange={handleYawChange}
        config={{
          distance: 6,
          minDistance: 2,
          height: 2,
          shoulderOffset: 0.6,
          smoothing: 0.06,
        }}
      />
      
      {/* Interaction raycast system */}
      <InteractionSystem playerRef={playerRef} maxDistance={10} />
    </>
  );
}
