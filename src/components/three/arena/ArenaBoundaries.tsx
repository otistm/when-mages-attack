/**
 * ArenaBoundaries — Glowing pillars at corners and subtle energy barrier edges.
 * Adds visual weight and defines the play space.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const HALF_W = 10;
const HALF_D = 14;

const PILLAR_POSITIONS: [number, number, number][] = [
  [-HALF_W, 0, -HALF_D],
  [HALF_W, 0, -HALF_D],
  [-HALF_W, 0, HALF_D],
  [HALF_W, 0, HALF_D],
];

const pillarGeo = new THREE.CylinderGeometry(0.25, 0.35, 4, 6);
const pillarCapGeo = new THREE.ConeGeometry(0.35, 0.6, 6);
const orbGeo = new THREE.IcosahedronGeometry(0.22, 1);

const pillarMat = new THREE.MeshStandardMaterial({
  color: '#1a1a2e',
  roughness: 0.7,
  metalness: 0.3,
  flatShading: true,
});

const barrierVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying float vWorldY;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldY = wp.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const barrierFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;

  varying vec2 vUv;
  varying float vWorldY;

  float hash(float n) { return fract(sin(n) * 43758.5453); }

  void main() {
    float heightFade = 1.0 - smoothstep(0.0, 3.5, vWorldY);
    heightFade *= heightFade;

    float scanLine = sin(vUv.x * 80.0 + uTime * 2.0) * 0.5 + 0.5;
    scanLine = smoothstep(0.7, 1.0, scanLine) * 0.3;

    float flicker = 0.7 + 0.3 * sin(uTime * 3.0 + vUv.x * 10.0);
    float pulse = 0.8 + 0.2 * sin(uTime * 1.2);

    float alpha = heightFade * (0.08 + scanLine) * flicker * pulse;
    vec3 col = uColor * (1.0 + scanLine);

    gl_FragColor = vec4(col, alpha);
  }
`;

interface BarrierEdge {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
}

const BARRIER_EDGES: BarrierEdge[] = [
  { position: [0, 1.75, -HALF_D], rotation: [0, 0, 0], width: HALF_W * 2 },
  { position: [0, 1.75, HALF_D], rotation: [0, 0, 0], width: HALF_W * 2 },
  { position: [-HALF_W, 1.75, 0], rotation: [0, Math.PI / 2, 0], width: HALF_D * 2 },
  { position: [HALF_W, 1.75, 0], rotation: [0, Math.PI / 2, 0], width: HALF_D * 2 },
];

function Pillar({ position }: { position: [number, number, number] }) {
  const orbRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (orbRef.current) {
      orbRef.current.rotation.y = t * 0.5;
      orbRef.current.rotation.x = Math.sin(t * 0.7) * 0.2;
      const s = 0.9 + Math.sin(t * 2.0) * 0.1;
      orbRef.current.scale.setScalar(s);
    }
    if (glowRef.current) {
      glowRef.current.intensity = 1.2 + Math.sin(t * 2.0) * 0.4;
    }
  });

  return (
    <group position={position}>
      <mesh geometry={pillarGeo} material={pillarMat} position={[0, 2, 0]} castShadow />
      <mesh geometry={pillarCapGeo} material={pillarMat} position={[0, 4.3, 0]} castShadow />
      <mesh ref={orbRef} geometry={orbGeo} position={[0, 4.5, 0]}>
        <meshBasicMaterial color="#8855dd" transparent opacity={0.9} />
      </mesh>
      <pointLight
        ref={glowRef}
        position={[0, 4.5, 0]}
        color="#7744cc"
        intensity={1.2}
        distance={8}
        decay={2}
      />
    </group>
  );
}

function BarrierWall({ edge }: { edge: BarrierEdge }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#6633aa') },
    }),
    [],
  );

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh position={edge.position} rotation={edge.rotation}>
      <planeGeometry args={[edge.width, 3.5]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={barrierVertexShader}
        fragmentShader={barrierFragmentShader}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

export function ArenaBoundaries() {
  return (
    <group>
      {PILLAR_POSITIONS.map((pos, i) => (
        <Pillar key={`pillar-${i}`} position={pos} />
      ))}
      {BARRIER_EDGES.map((edge, i) => (
        <BarrierWall key={`barrier-${i}`} edge={edge} />
      ))}
    </group>
  );
}

export default ArenaBoundaries;
