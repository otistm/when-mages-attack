/**
 * Arena Lighting - Cel-shaded lighting with dramatic hard-edged shadows
 * 
 * NPR (Non-Photorealistic Rendering) approach:
 * - Low-angle main light for long, dramatic shadows
 * - Hard shadow edges (no blur) for stylized look
 * - Banded lighting with clear light/shadow separation
 * 
 * Debug controls available when SHOW_LIGHTING_DEBUG is true
 */

import { useRef } from 'react';
import { useControls } from 'leva';
import * as THREE from 'three';
import { useHelper } from '@react-three/drei';

// ============================================================
// DEBUG FLAG: Set to true to show lighting debug controls
// ============================================================
const SHOW_LIGHTING_DEBUG = false;

export function ArenaLighting() {
  const mainLightRef = useRef<THREE.DirectionalLight>(null);
  
  // Show light helper in debug mode
  useHelper(
    SHOW_LIGHTING_DEBUG && mainLightRef as React.MutableRefObject<THREE.DirectionalLight>, 
    THREE.DirectionalLightHelper, 
    2, 
    '#ffff00'
  );
  
  // Debug controls for lighting
  // Saved values: X=6, Y=40, Z=-2, Intensity=2.5, Ambient=0.10, Bias=0, Rim=0.30
  const lightControls = SHOW_LIGHTING_DEBUG ? useControls('Cel-Shaded Lighting', {
    // Main light position
    lightX: { value: 6, min: -30, max: 30, step: 1, label: 'Light X' },
    lightY: { value: 40, min: 1, max: 50, step: 1, label: 'Light Y' },
    lightZ: { value: -2, min: -30, max: 30, step: 1, label: 'Light Z' },
    
    // Main light settings
    mainIntensity: { value: 2.5, min: 0, max: 5, step: 0.1, label: 'Main Intensity' },
    
    // Ambient light (controls shadow darkness)
    ambientIntensity: { value: 0.10, min: 0, max: 1, step: 0.05, label: 'Ambient (Shadow Brightness)' },
    
    // Shadow settings
    shadowBias: { value: 0, min: -0.01, max: 0.01, step: 0.0001, label: 'Shadow Bias' },
    
    // Rim lights
    rimIntensity: { value: 0.30, min: 0, max: 1, step: 0.05, label: 'Rim Light Intensity' },
  }) : {
    lightX: 6,
    lightY: 40,
    lightZ: -2,
    mainIntensity: 2.5,
    ambientIntensity: 0.10,
    shadowBias: 0,
    rimIntensity: 0.30,
  };
  
  const { lightX, lightY, lightZ, mainIntensity, ambientIntensity, shadowBias, rimIntensity } = lightControls;
  
  return (
    <>
      {/* Main light - harsh cel-shaded shadows */}
      <directionalLight
        ref={mainLightRef}
        position={[lightX, lightY, lightZ]}
        intensity={mainIntensity}
        color="#fff8f0"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-far={100}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={shadowBias}
        shadow-normalBias={0.02}
        shadow-radius={0} // Hard edges for cel-shaded look
      />
      
      {/* Secondary key light from opposite side - no shadows, for rim lighting */}
      <directionalLight
        position={[-6, 8, -6]}
        intensity={rimIntensity}
        color="#c8d4ff"
      />
      
      {/* Warm rim light from player side */}
      <directionalLight
        position={[0, 6, 15]}
        intensity={rimIntensity}
        color="#ffcc88"
      />
      
      {/* Cool rim light from enemy side */}
      <directionalLight
        position={[0, 6, -15]}
        intensity={rimIntensity}
        color="#88ccff"
      />
      
      {/* Low ambient for deep shadow areas - lower = darker shadows */}
      <ambientLight intensity={ambientIntensity} color="#a0a0b0" />
    </>
  );
}

export default ArenaLighting;
