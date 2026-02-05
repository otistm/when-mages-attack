/**
 * ArenaFloor - Combat zone floor with background image, fog, and particles
 */

import { useMemo, useRef, useEffect } from 'react';
import { Box, useTexture } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Vignette shader material
const vignetteVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const vignetteFragmentShader = `
  varying vec2 vUv;
  uniform float uIntensity;
  uniform float uSoftness;
  
  void main() {
    // Calculate distance from center (0.5, 0.5)
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(vUv, center);
    
    // Create vignette effect - darker at edges
    float vignette = smoothstep(0.2, 0.8 * uSoftness, dist);
    
    // Output dark overlay with vignette alpha
    gl_FragColor = vec4(0.0, 0.0, 0.0, vignette * uIntensity);
  }
`;

// Particle configuration
const PARTICLE_COUNT = 60;
const PARTICLE_AREA = 20; // Spread area

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  type: 'dust' | 'ember';
}

function ArenaParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particlesRef = useRef<Particle[]>([]);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  // Initialize particles
  useEffect(() => {
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => createParticle());
  }, []);

  function createParticle(): Particle {
    const isEmber = Math.random() > 0.7;
    return {
      position: new THREE.Vector3(
        (Math.random() - 0.5) * PARTICLE_AREA,
        Math.random() * 3,
        (Math.random() - 0.5) * PARTICLE_AREA
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        isEmber ? 0.5 + Math.random() * 0.5 : 0.1 + Math.random() * 0.2,
        (Math.random() - 0.5) * 0.3
      ),
      life: Math.random(),
      maxLife: 3 + Math.random() * 4,
      size: isEmber ? 0.03 + Math.random() * 0.04 : 0.02 + Math.random() * 0.03,
      type: isEmber ? 'ember' : 'dust',
    };
  }

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    particlesRef.current.forEach((p, i) => {
      p.life += delta;

      // Update position with gentle movement
      p.position.add(p.velocity.clone().multiplyScalar(delta));
      
      // Add subtle wavering
      p.position.x += Math.sin(p.life * 2 + i) * delta * 0.1;
      p.position.z += Math.cos(p.life * 1.5 + i * 0.5) * delta * 0.1;

      // Reset particle when it dies or floats too high
      if (p.life >= p.maxLife || p.position.y > 5) {
        const newParticle = createParticle();
        newParticle.position.y = 0;
        p.position.copy(newParticle.position);
        p.velocity.copy(newParticle.velocity);
        p.life = 0;
        p.maxLife = newParticle.maxLife;
        p.size = newParticle.size;
        p.type = newParticle.type;
      }

      // Update instance matrix
      tempObject.position.copy(p.position);
      
      // Fade based on life
      const lifeRatio = p.life / p.maxLife;
      const opacity = lifeRatio < 0.1 
        ? lifeRatio / 0.1 
        : lifeRatio > 0.8 
          ? 1 - ((lifeRatio - 0.8) / 0.2)
          : 1;
      
      const scale = p.size * opacity;
      tempObject.scale.setScalar(scale);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);

      // Set color based on type
      if (p.type === 'ember') {
        tempColor.setHSL(0.05 + Math.random() * 0.05, 1, 0.5 + opacity * 0.3);
      } else {
        tempColor.setHSL(0, 0, 0.4 + opacity * 0.3);
      }
      meshRef.current!.setColorAt(i, tempColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]} renderOrder={5}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial transparent opacity={0.8} depthWrite={false} />
    </instancedMesh>
  );
}

// Ground fog layer
function GroundFog() {
  const fogRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const fogMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#1a1a2e') },
        uOpacity: { value: 0.4 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vY;
        void main() {
          vUv = uv;
          vY = position.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec2 vUv;
        varying float vY;
        
        // Simple noise function
        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        void main() {
          // Animated fog pattern
          vec2 uv = vUv * 3.0;
          float n1 = noise(uv + uTime * 0.1);
          float n2 = noise(uv * 2.0 - uTime * 0.15);
          float fogPattern = (n1 + n2) * 0.5;
          
          // Fade at edges
          float edgeFade = 1.0 - smoothstep(0.3, 0.5, distance(vUv, vec2(0.5)));
          
          // Height fade
          float heightFade = 1.0 - smoothstep(0.0, 1.0, vY);
          
          float alpha = fogPattern * edgeFade * uOpacity * heightFade;
          
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, []);

  useFrame((state) => {
    if (fogMaterial.uniforms) {
      fogMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh
      ref={fogRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.1, 0]}
      material={fogMaterial}
      renderOrder={4}
    >
      <planeGeometry args={[30, 30, 1, 1]} />
    </mesh>
  );
}

export function ArenaFloor() {
  const { viewport } = useThree();
  
  // Load the arena floor texture
  const texture = useTexture('/assets/images/arena_floor.png');
  
  // Configure texture to stretch/fill (no tiling)
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  
  // Floor dimensions to cover the visible area
  const width = viewport.width + 10;
  const length = viewport.height + 10;

  // Create vignette shader material
  const vignetteMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uIntensity: { value: 0.5 },
        uSoftness: { value: 1.2 },
      },
      vertexShader: vignetteVertexShader,
      fragmentShader: vignetteFragmentShader,
      transparent: true,
      depthWrite: false,
    });
  }, []);

  // Create a toon gradient ramp for cel-shaded floor shadows
  const toonGradient = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    
    // Hard-edged gradient: shadow -> lit (lighter values to show texture)
    ctx.fillStyle = '#303035'; // Shadow area
    ctx.fillRect(0, 0, 2, 1);
    ctx.fillStyle = '#808090'; // Lit area
    ctx.fillRect(2, 0, 2, 1);
    
    const gradientTexture = new THREE.CanvasTexture(canvas);
    gradientTexture.minFilter = THREE.NearestFilter;
    gradientTexture.magFilter = THREE.NearestFilter;
    
    return gradientTexture;
  }, []);

  return (
    <group>
      {/* Visible floor with arena texture - receives cel-shaded shadows */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[width, length]} />
        <meshToonMaterial 
          map={texture}
          gradientMap={toonGradient}
          color="#ffffff"
        />
      </mesh>
      
      {/* Ground fog effect */}
      <GroundFog />
      
      {/* Floating particles (dust and embers) */}
      <ArenaParticles />
      
      {/* Vignette overlay */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.04, 0]}
        material={vignetteMaterial}
        renderOrder={2}
      >
        <planeGeometry args={[width, length]} />
      </mesh>
      
      {/* Physics collider */}
      <RigidBody type="fixed" colliders="cuboid">
        <Box
          args={[width, 0.5, length]}
          position={[0, -0.25, 0]}
          visible={false}
        />
      </RigidBody>
    </group>
  );
}

export default ArenaFloor;
