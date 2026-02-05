/**
 * Camera Shake Hook - Disabled
 * 
 * Screen shake has been disabled. Hook structure kept for compatibility.
 */

interface CameraShakeOptions {
  maxOffset?: number;
  decay?: number;
}

export function useCameraShake(_options: CameraShakeOptions = {}) {
  // Camera shake disabled - no-op hook
}

export default useCameraShake;
