/**
 * Debug component to find the correct rotation/scale/speed for 3D models
 * Shows a model on the arena with controls to adjust transform and animation speed
 * 
 * USAGE: Set showDebug to true in the Arena to enable this debug tool
 * 
 * Current saved values for models:
 * - Rusty Shiv: X=-84, Y=-44, Z=-115, Scale=6.5
 */

import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useControls, button } from 'leva';
import * as THREE from 'three';

// Preload models
useGLTF.preload('/assets/models/rusty-shiv_cel.glb');

export function ModelRotationDebug() {
  const modelRef = useRef<THREE.Group>(null);
  const [lastLogTime, setLastLogTime] = useState(0);
  
  // Load the shiv model (can be changed to other models later)
  const { scene } = useGLTF('/assets/models/rusty-shiv_cel.glb');
  
  // Clone the scene and enable shadow casting on all meshes
  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);
  
  // Controls with leva
  const controls = useControls('Model Debug Controls', {
    // Transform controls
    rotationX: { value: -84, min: -180, max: 180, step: 1, label: 'Rotation X (deg)' },
    rotationY: { value: -44, min: -180, max: 180, step: 1, label: 'Rotation Y (deg)' },
    rotationZ: { value: -115, min: -180, max: 180, step: 1, label: 'Rotation Z (deg)' },
    positionY: { value: 5, min: 0, max: 15, step: 0.1, label: 'Height' },
    scale: { value: 6.5, min: 1, max: 20, step: 0.5, label: 'Scale' },
    
    // Animation speed control
    animationSpeed: { value: 1.0, min: 0.1, max: 3.0, step: 0.1, label: 'Animation Speed' },
    
    // Visual helpers
    showAxes: { value: true, label: 'Show Axes Helper' },
    showDirectionArrow: { value: true, label: 'Show Direction Arrow' },
    
    // Utility buttons
    'Copy Values': button(() => {
      const values = `Rotation: X=${controls.rotationX}, Y=${controls.rotationY}, Z=${controls.rotationZ}, Scale=${controls.scale}, Speed=${controls.animationSpeed}`;
      console.log('=== MODEL DEBUG VALUES ===');
      console.log(values);
      console.log(`Radians: X=${THREE.MathUtils.degToRad(controls.rotationX).toFixed(4)}, Y=${THREE.MathUtils.degToRad(controls.rotationY).toFixed(4)}, Z=${THREE.MathUtils.degToRad(controls.rotationZ).toFixed(4)}`);
      console.log('==========================');
      alert(values);
    }),
  });
  
  const { rotationX, rotationY, rotationZ, positionY, scale, showAxes, showDirectionArrow } = controls;
  
  // Convert degrees to radians and apply
  useFrame((state) => {
    if (modelRef.current) {
      modelRef.current.rotation.x = THREE.MathUtils.degToRad(rotationX);
      modelRef.current.rotation.y = THREE.MathUtils.degToRad(rotationY);
      modelRef.current.rotation.z = THREE.MathUtils.degToRad(rotationZ);
    }
    
    // Log values periodically (every 2 seconds) to avoid spam
    const now = state.clock.elapsedTime;
    if (now - lastLogTime > 2) {
      setLastLogTime(now);
    }
  });
  
  return (
    <group position={[0, positionY, 0]}>
      {/* The model being debugged - with shadow casting enabled */}
      <group ref={modelRef} scale={scale}>
        <primitive object={clonedScene} />
      </group>
      
      {/* Axes helper to show orientation (R=X, G=Y, B=Z) */}
      {showAxes && (
        <axesHelper args={[4]} />
      )}
      
      {/* Arrow pointing toward enemy (negative Z) - this is the "stab" direction */}
      {showDirectionArrow && (
        <arrowHelper 
          args={[
            new THREE.Vector3(0, 0, -1), // Direction (toward enemy)
            new THREE.Vector3(0, 0, 0),  // Origin
            5,                            // Length
            0xff0000,                     // Color (red)
            1,                            // Head length
            0.5,                          // Head width
          ]} 
        />
      )}
      
      {/* Ground reference plane - receives shadows */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -positionY + 0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#555" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// Export the animation speed for use in ShivProjectile
export function useDebugAnimationSpeed(): number {
  // This hook can be used by ShivProjectile to get the debug speed
  // For now, return 1.0 as default when not debugging
  return 1.0;
}

// Keep the old name as an alias for backwards compatibility
export const ShivRotationDebug = ModelRotationDebug;
