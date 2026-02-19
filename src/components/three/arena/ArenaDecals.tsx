/**
 * ArenaDecals — Arcane rune circles on the floor at key positions:
 * construct spawn slots, center divider line, and a large center sigil.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CARD_SLOTS, ARENA } from '@/types';

const runeCircleVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const runeCircleFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uRotSpeed;

  varying vec2 vUv;

  #define PI 3.14159265

  float ring(vec2 uv, float r, float w) {
    float d = length(uv);
    return smoothstep(r + w, r + w * 0.5, d) * smoothstep(r - w, r - w * 0.5, d);
  }

  float segment(vec2 uv, float r, int count, float width) {
    float a = atan(uv.y, uv.x) + PI;
    float seg = mod(a, 2.0 * PI / float(count));
    float halfW = width * 0.5;
    float d = length(uv);
    float mask = smoothstep(r - 0.02, r, d) * smoothstep(r + 0.02, r, d);
    return step(seg, halfW) * mask;
  }

  float runes(vec2 uv, float time, float speed) {
    float a = atan(uv.y, uv.x) + time * speed;
    float d = length(uv);
    float v = sin(a * 6.0) * sin(d * 20.0 - time * 2.0);
    return smoothstep(0.85, 1.0, v) * smoothstep(0.35, 0.45, d) * smoothstep(0.5, 0.4, d);
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    float d = length(uv);

    // Outer ring
    float outer = ring(uv, 0.9, 0.03);
    // Inner ring
    float inner = ring(uv, 0.5, 0.02);
    // Dot ring
    float dotRing = ring(uv, 0.7, 0.015);
    // Radial segments
    float segs = segment(uv, 0.7, 12, 0.08);
    // Animated rune markings
    float runeMarks = runes(uv, uTime, uRotSpeed);

    float alpha = (outer + inner * 0.8 + dotRing * 0.5 + segs * 0.3 + runeMarks * 0.6);
    alpha *= uIntensity;

    // Pulse
    alpha *= 0.6 + 0.4 * sin(uTime * 1.5 + d * 3.0);

    // Fade at edges
    alpha *= smoothstep(1.0, 0.8, d);

    gl_FragColor = vec4(uColor, alpha);
  }
`;

const dividerVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const dividerFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;

  varying vec2 vUv;

  float hash(float n) { return fract(sin(n) * 43758.5453); }

  void main() {
    float centerLine = 1.0 - smoothstep(0.0, 0.08, abs(vUv.y - 0.5));

    // Dashes along the line
    float dash = sin(vUv.x * 40.0 + uTime * 1.5) * 0.5 + 0.5;
    dash = smoothstep(0.4, 0.6, dash);

    float glow = exp(-pow(abs(vUv.y - 0.5) * 8.0, 2.0)) * 0.3;

    float alpha = (centerLine * 0.5 * dash + glow) * 0.4;
    alpha *= smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);

    float pulse = 0.7 + 0.3 * sin(uTime * 1.0);
    alpha *= pulse;

    gl_FragColor = vec4(uColor, alpha);
  }
`;

function RuneCircle({
  position,
  size,
  color,
  intensity,
  rotSpeed,
}: {
  position: [number, number, number];
  size: number;
  color: string;
  intensity: number;
  rotSpeed: number;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
      uRotSpeed: { value: rotSpeed },
    }),
    [color, intensity, rotSpeed],
  );

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position}>
      <planeGeometry args={[size, size]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={runeCircleVertexShader}
        fragmentShader={runeCircleFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function DividerLine() {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#5533aa') },
    }),
    [],
  );

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      <planeGeometry args={[22, 1.5]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={dividerVertexShader}
        fragmentShader={dividerFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function ArenaDecals() {
  return (
    <group>
      {/* Center sigil */}
      <RuneCircle
        position={[0, 0.02, 0]}
        size={6}
        color="#6644bb"
        intensity={0.5}
        rotSpeed={0.3}
      />

      {/* Player construct slot circles */}
      {CARD_SLOTS.map((slot) => (
        <RuneCircle
          key={`player-${slot.index}`}
          position={[slot.xPosition, 0.015, ARENA.playerSlotZ]}
          size={3}
          color="#338866"
          intensity={0.25}
          rotSpeed={0.5}
        />
      ))}

      {/* Enemy construct slot circles */}
      {CARD_SLOTS.map((slot) => (
        <RuneCircle
          key={`enemy-${slot.index}`}
          position={[slot.xPosition, 0.015, ARENA.enemySlotZ]}
          size={3}
          color="#883333"
          intensity={0.25}
          rotSpeed={-0.5}
        />
      ))}

      {/* Center divider line */}
      <DividerLine />
    </group>
  );
}

export default ArenaDecals;
