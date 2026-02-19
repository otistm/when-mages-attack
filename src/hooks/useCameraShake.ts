/**
 * Camera Shake Hook
 *
 * Reads trauma from gameStore and applies random offset to the camera each frame.
 * Trauma decays over time. Higher trauma = more violent shake.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '@/stores/gameStore';

interface CameraShakeOptions {
  maxOffset?: number;
  decay?: number;
}

export function useCameraShake({
  maxOffset = 0.6,
  decay = 3,
}: CameraShakeOptions = {}) {
  const camera = useThree((s) => s.camera);
  const decayTrauma = useGameStore((s) => s.decayCameraTrauma);

  useFrame((_, delta) => {
    const trauma = useGameStore.getState().cameraTrauma;
    if (trauma <= 0.001) return;

    const shake = trauma * trauma;
    camera.position.x += (Math.random() - 0.5) * 2 * maxOffset * shake;
    camera.position.y += (Math.random() - 0.5) * 2 * maxOffset * shake * 0.5;

    decayTrauma(delta * decay);
  });
}

export default useCameraShake;
