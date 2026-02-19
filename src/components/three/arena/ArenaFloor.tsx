/**
 * ArenaFloor - Combat zone floor with background image
 */

import { Box, useTexture } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export function ArenaFloor() {
  const { viewport } = useThree();
  
  const texture = useTexture('/assets/images/arena_floor.png');
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  
  const minWidth = viewport.width + 10;
  const minLength = viewport.height + 10;

  const imgW = texture.image?.width || 1;
  const imgH = texture.image?.height || 1;
  const aspect = imgW / imgH;

  const planeLength = Math.max(minLength, minWidth / aspect);
  const planeWidth = planeLength * aspect;

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
      >
        <planeGeometry args={[planeWidth, planeLength]} />
        <meshBasicMaterial map={texture} />
      </mesh>
      
      {/* Physics collider */}
      <RigidBody type="fixed" colliders="cuboid">
        <Box
          args={[planeWidth, 0.5, planeLength]}
          position={[0, -0.25, 0]}
          visible={false}
        />
      </RigidBody>
    </group>
  );
}

export default ArenaFloor;
