import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/stores/gameStore';

export function CameraRig({
  target = new THREE.Vector3(0, 0, 0),
}: {
  target?: THREE.Vector3;
}) {
  const camera = useThree((s) => s.camera);
  const isDebug = useGameStore((s) => s.isDebugArena);

  useEffect(() => {
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  }, [camera, target]);

  useFrame(() => {
    if (isDebug) {
      camera.position.set(0, 38, 22);
      (camera as THREE.PerspectiveCamera).fov = 45;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(target);
  });

  return null;
}

export default CameraRig;
