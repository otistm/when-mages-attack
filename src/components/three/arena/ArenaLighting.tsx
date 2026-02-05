/**
 * Arena Lighting - Cel-shaded lighting with dramatic hard-edged shadows
 * 
 * NPR (Non-Photorealistic Rendering) approach:
 * - Low-angle main light for long, dramatic shadows
 * - Hard shadow edges (no blur) for stylized look
 * - Banded lighting with clear light/shadow separation
 */

export function ArenaLighting() {
  return (
    <>
      {/* Main light - low angle for long dramatic cel-shaded shadows */}
      <directionalLight
        position={[8, 12, 10]}
        intensity={1.5}
        color="#fff8f0"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-far={80}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        shadow-radius={0}
      />
      
      {/* Secondary key light from opposite side - no shadows, for rim lighting */}
      <directionalLight
        position={[-6, 8, -6]}
        intensity={0.4}
        color="#c8d4ff"
      />
      
      {/* Warm rim light from player side */}
      <directionalLight
        position={[0, 6, 15]}
        intensity={0.35}
        color="#ffcc88"
      />
      
      {/* Cool rim light from enemy side */}
      <directionalLight
        position={[0, 6, -15]}
        intensity={0.35}
        color="#88ccff"
      />
      
      {/* Low ambient for deep shadow areas - keeps NPR contrast */}
      <ambientLight intensity={0.25} color="#a0a0b0" />
    </>
  );
}

export default ArenaLighting;
