/**
 * ToonMaterials - Cel-shaded material utilities
 * 
 * Based on Three.js MeshToonMaterial and the Shader Artist skill.
 * Creates consistent toon shading across the game with:
 * - Hard light/shadow banding (2-3 bands)
 * - Gradient ramp textures
 * - Flat colors with defined shadow tones
 * 
 * @see https://threejs.org/docs/#MeshToonMaterial
 */

import * as THREE from 'three';

/**
 * Create a 2-band toon ramp texture (hard light/shadow)
 * This creates the classic cel-shaded look with a sharp transition
 * Uses canvas for proper texture generation
 */
export function createToonRamp2Band(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  
  // Shadow band
  ctx.fillStyle = '#333333';
  ctx.fillRect(0, 0, 1, 1);
  // Light band
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(1, 0, 1, 1);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  
  return texture;
}

/**
 * Create a 3-band toon ramp texture (shadow, mid, light)
 * Slightly softer look with a mid-tone
 */
export function createToonRamp3Band(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 3;
  canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  
  // Deep shadow
  ctx.fillStyle = '#222222';
  ctx.fillRect(0, 0, 1, 1);
  // Mid-tone
  ctx.fillStyle = '#888888';
  ctx.fillRect(1, 0, 1, 1);
  // Full light
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(2, 0, 1, 1);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  
  return texture;
}

/**
 * Create a 4-band toon ramp for more nuanced shading
 */
export function createToonRamp4Band(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, 1, 1);
  ctx.fillStyle = '#444444';
  ctx.fillRect(1, 0, 1, 1);
  ctx.fillStyle = '#aaaaaa';
  ctx.fillRect(2, 0, 1, 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(3, 0, 1, 1);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  
  return texture;
}

// Cached ramp textures (singleton pattern)
let toonRamp2: THREE.CanvasTexture | null = null;
let toonRamp3: THREE.CanvasTexture | null = null;
let toonRamp4: THREE.CanvasTexture | null = null;

/**
 * Get cached 2-band toon ramp
 */
export function getToonRamp2Band(): THREE.CanvasTexture {
  if (!toonRamp2) {
    toonRamp2 = createToonRamp2Band();
  }
  return toonRamp2;
}

/**
 * Get cached 3-band toon ramp
 */
export function getToonRamp3Band(): THREE.CanvasTexture {
  if (!toonRamp3) {
    toonRamp3 = createToonRamp3Band();
  }
  return toonRamp3;
}

/**
 * Get cached 4-band toon ramp
 */
export function getToonRamp4Band(): THREE.CanvasTexture {
  if (!toonRamp4) {
    toonRamp4 = createToonRamp4Band();
  }
  return toonRamp4;
}

/**
 * Create a MeshToonMaterial with preset cel-shaded settings
 */
export function createToonMaterial(options: {
  color: string | THREE.Color;
  bands?: 2 | 3 | 4;
  emissive?: string | THREE.Color;
  emissiveIntensity?: number;
}): THREE.MeshToonMaterial {
  const { color, bands = 3, emissive, emissiveIntensity = 0 } = options;
  
  const gradientMap = bands === 2 
    ? getToonRamp2Band() 
    : bands === 4 
      ? getToonRamp4Band()
      : getToonRamp3Band();
  
  return new THREE.MeshToonMaterial({
    color: typeof color === 'string' ? new THREE.Color(color) : color,
    gradientMap,
    emissive: emissive ? (typeof emissive === 'string' ? new THREE.Color(emissive) : emissive) : undefined,
    emissiveIntensity,
  });
}

/**
 * Apply toon material to all meshes in a GLTF scene
 * Preserves original colors where possible
 */
export function applyToonMaterialToScene(
  scene: THREE.Object3D, 
  options?: {
    bands?: 2 | 3 | 4;
    preserveColors?: boolean;
  }
): void {
  const { bands = 3, preserveColors = true } = options || {};
  const gradientMap = bands === 2 
    ? getToonRamp2Band() 
    : bands === 4 
      ? getToonRamp4Band()
      : getToonRamp3Band();
  
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const oldMaterial = child.material as THREE.MeshStandardMaterial;
      
      // Get color from original material if preserving
      let color = new THREE.Color('#888888');
      if (preserveColors && oldMaterial.color) {
        color = oldMaterial.color.clone();
      }
      
      // Create new toon material
      const toonMaterial = new THREE.MeshToonMaterial({
        color,
        gradientMap,
      });
      
      // Preserve emissive if present
      if (oldMaterial.emissive) {
        toonMaterial.emissive = oldMaterial.emissive.clone();
        toonMaterial.emissiveIntensity = oldMaterial.emissiveIntensity || 0;
      }
      
      child.material = toonMaterial;
    }
  });
}

export default {
  createToonRamp2Band,
  createToonRamp3Band,
  createToonRamp4Band,
  getToonRamp2Band,
  getToonRamp3Band,
  getToonRamp4Band,
  createToonMaterial,
  applyToonMaterialToScene,
};
