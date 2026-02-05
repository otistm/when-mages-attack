import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * CameraRig
 * Ensures the camera is always oriented toward the arena center.
 * This prevents "nothing renders" situations when only position is set.
 */
export function CameraRig({
  target = new THREE.Vector3(0, 0, 0),
}: {
  target?: THREE.Vector3;
}) {
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  }, [camera, target]);

  useFrame(() => {
    camera.lookAt(target);
  });

  return null;
}

export default CameraRig;

