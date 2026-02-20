/**
 * Arena Environment - Dark stormy night sky with lightning
 * Enhanced with physically-inspired atmospheric rendering
 * Includes Environment for glass material reflections
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';

export function ArenaEnvironment() {
  return (
    <>
      {/* Dark night sky background */}
      <color attach="background" args={['#030308']} />
      
      {/* HDRI Environment for glass reflections */}
      <Environment 
        preset="night" 
        environmentIntensity={0.4}
        backgroundIntensity={0}
      />
      
      {/* Height-based atmospheric fog */}
      <AtmosphericFog />
      
      {/* Sky dome with multi-band gradient and horizon glow */}
      <EnhancedSkyDome />
      
      {/* Twinkling starfield */}
      <TwinklingStars />
      
      {/* Volumetric-style clouds */}
      <VolumetricClouds />
      
      {/* Floating magical particles */}
      <FloatingParticles />
    </>
  );
}

/**
 * Enhanced sky dome with multi-color gradient bands and Mie scattering simulation
 */
function EnhancedSkyDome() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        // Multi-band gradient colors
        uZenithColor: { value: new THREE.Color('#020208') },      // Top of sky - deep black
        uMidSkyColor: { value: new THREE.Color('#0a0a20') },      // Mid sky - dark blue
        uHorizonColor: { value: new THREE.Color('#1a1040') },     // Horizon - purple tint
        uHorizonGlowColor: { value: new THREE.Color('#2d1860') }, // Horizon glow - bright purple
        // Mie scattering (moon glow)
        uMoonDirection: { value: new THREE.Vector3(0.3, 0.4, -0.8).normalize() },
        uMoonGlowColor: { value: new THREE.Color('#1a1a3a') },
        uMoonGlowIntensity: { value: 0.3 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vNormal = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uZenithColor;
        uniform vec3 uMidSkyColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uHorizonGlowColor;
        uniform vec3 uMoonDirection;
        uniform vec3 uMoonGlowColor;
        uniform float uMoonGlowIntensity;
        
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        
        // Simplex noise for subtle variation
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }
        
        void main() {
          vec3 dir = normalize(vWorldPosition);
          float elevation = dir.y;
          
          // Multi-band gradient with smooth transitions
          float zenithFactor = smoothstep(0.3, 0.8, elevation);
          float midSkyFactor = smoothstep(0.0, 0.4, elevation) * (1.0 - smoothstep(0.3, 0.7, elevation));
          float horizonFactor = smoothstep(-0.1, 0.15, elevation) * (1.0 - smoothstep(0.1, 0.35, elevation));
          float horizonGlowFactor = smoothstep(-0.15, 0.05, elevation) * (1.0 - smoothstep(0.0, 0.2, elevation));
          
          // Combine gradient bands
          vec3 skyColor = uZenithColor * zenithFactor;
          skyColor += uMidSkyColor * midSkyFactor;
          skyColor += uHorizonColor * horizonFactor;
          skyColor += uHorizonGlowColor * horizonGlowFactor * 0.8;
          
          // Normalize to prevent over-bright
          skyColor = mix(uZenithColor, skyColor, 1.0);
          
          // Mie scattering - moon/ambient glow
          float moonAngle = max(0.0, dot(dir, uMoonDirection));
          float mieScatter = pow(moonAngle, 8.0) * 0.5 + pow(moonAngle, 32.0) * 0.5;
          skyColor += uMoonGlowColor * mieScatter * uMoonGlowIntensity;
          
          // Add subtle noise for texture
          float noiseVal = noise(dir.xz * 3.0 + uTime * 0.01) * 0.02;
          skyColor += vec3(noiseVal * 0.5, noiseVal * 0.3, noiseVal);
          
          // Atmospheric scattering near horizon
          float atmosphereScatter = exp(-abs(elevation) * 3.0) * 0.15;
          skyColor += vec3(0.1, 0.05, 0.15) * atmosphereScatter;
          
          gl_FragColor = vec4(skyColor, 1.0);
        }
      `,
      side: THREE.BackSide,
    });
  }, []);
  
  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  return (
    <mesh>
      <sphereGeometry args={[95, 64, 64]} />
      <primitive ref={materialRef} object={material} attach="material" />
    </mesh>
  );
}

/**
 * Twinkling stars with color variation and animated brightness
 */
function TwinklingStars() {
  const starsRef = useRef<THREE.Points>(null);
  
  const { positions, colors, sizes, twinkleSpeeds, twinkleOffsets } = useMemo(() => {
    const count = 3000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const twinkleSpeeds = new Float32Array(count);
    const twinkleOffsets = new Float32Array(count);
    
    // Star color palette (blue, white, warm white, yellow)
    const starColors = [
      new THREE.Color('#aaccff'), // Blue
      new THREE.Color('#ffffff'), // White
      new THREE.Color('#ffffee'), // Warm white
      new THREE.Color('#ffeeaa'), // Yellow
      new THREE.Color('#ddddff'), // Pale blue
    ];
    
    for (let i = 0; i < count; i++) {
      // Distribute on sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 85 + Math.random() * 10;
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      
      // Only show stars above horizon
      if (positions[i * 3 + 1] < 5) {
        positions[i * 3 + 1] = 5 + Math.random() * 80;
      }
      
      // Random color from palette
      const color = starColors[Math.floor(Math.random() * starColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      // Varied sizes - mostly small, few bright ones
      const sizeRoll = Math.random();
      if (sizeRoll > 0.98) {
        sizes[i] = 2.5 + Math.random() * 1.5; // Bright stars
      } else if (sizeRoll > 0.9) {
        sizes[i] = 1.5 + Math.random() * 1.0; // Medium stars
      } else {
        sizes[i] = 0.5 + Math.random() * 0.8; // Dim stars
      }
      
      // Twinkle parameters
      twinkleSpeeds[i] = 0.5 + Math.random() * 2.0;
      twinkleOffsets[i] = Math.random() * Math.PI * 2;
    }
    
    return { positions, colors, sizes, twinkleSpeeds, twinkleOffsets };
  }, []);
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float size;
        attribute float twinkleSpeed;
        attribute float twinkleOffset;
        attribute vec3 starColor;
        
        uniform float uTime;
        uniform float uPixelRatio;
        
        varying vec3 vColor;
        varying float vTwinkle;
        
        void main() {
          vColor = starColor;
          
          // Calculate twinkle
          float twinkle = sin(uTime * twinkleSpeed + twinkleOffset) * 0.3 + 0.7;
          vTwinkle = twinkle;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * twinkle * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vTwinkle;
        
        void main() {
          // Circular point with soft edge
          float dist = length(gl_PointCoord - 0.5);
          if (dist > 0.5) discard;
          
          // Soft glow falloff
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          alpha *= vTwinkle;
          
          // Core brightness
          float core = 1.0 - smoothstep(0.0, 0.15, dist);
          vec3 finalColor = vColor + vec3(core * 0.3);
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);
  
  useFrame(({ clock }) => {
    if (starsRef.current) {
      (starsRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = clock.elapsedTime;
    }
  });
  
  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-starColor" count={colors.length / 3} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={sizes.length} array={sizes} itemSize={1} />
        <bufferAttribute attach="attributes-twinkleSpeed" count={twinkleSpeeds.length} array={twinkleSpeeds} itemSize={1} />
        <bufferAttribute attach="attributes-twinkleOffset" count={twinkleOffsets.length} array={twinkleOffsets} itemSize={1} />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
  );
}

/**
 * Volumetric-style clouds with noise-based opacity and animated movement
 */
function VolumetricClouds() {
  const groupRef = useRef<THREE.Group>(null);
  const materialsRef = useRef<THREE.ShaderMaterial[]>([]);
  
  const cloudMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#1a1535') },
        uOpacity: { value: 0.6 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uOpacity;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        
        // Fractal Brownian Motion noise
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }
        
        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int i = 0; i < 5; i++) {
            value += amplitude * noise(p);
            p *= 2.0;
            amplitude *= 0.5;
          }
          return value;
        }
        
        void main() {
          // Animated UV for cloud movement
          vec2 uv = vUv + vec2(uTime * 0.01, uTime * 0.005);
          
          // Multi-octave noise for cloud density
          float cloudDensity = fbm(uv * 3.0);
          cloudDensity = smoothstep(0.3, 0.7, cloudDensity);
          
          // Edge fade
          float edgeFade = 1.0 - length(vUv - 0.5) * 2.0;
          edgeFade = smoothstep(0.0, 0.5, edgeFade);
          
          // Final opacity
          float alpha = cloudDensity * edgeFade * uOpacity;
          
          // Color variation based on density
          vec3 cloudColor = uColor * (0.8 + cloudDensity * 0.4);
          
          gl_FragColor = vec4(cloudColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, []);
  
  // Cloud layer definitions
  const cloudLayers = useMemo(() => [
    // Back clouds (behind enemy)
    { pos: [0, 22, -50] as [number, number, number], scale: [40, 12, 1] as [number, number, number], opacity: 0.5 },
    { pos: [-30, 18, -45] as [number, number, number], scale: [25, 10, 1] as [number, number, number], opacity: 0.4 },
    { pos: [35, 20, -42] as [number, number, number], scale: [30, 11, 1] as [number, number, number], opacity: 0.45 },
    // Side clouds
    { pos: [-50, 15, -15] as [number, number, number], scale: [20, 8, 1] as [number, number, number], opacity: 0.35, rotation: 0.3 },
    { pos: [50, 17, -10] as [number, number, number], scale: [22, 9, 1] as [number, number, number], opacity: 0.35, rotation: -0.3 },
    // Upper atmosphere
    { pos: [0, 35, -30] as [number, number, number], scale: [60, 15, 1] as [number, number, number], opacity: 0.25 },
    { pos: [-25, 40, -20] as [number, number, number], scale: [35, 10, 1] as [number, number, number], opacity: 0.2 },
    { pos: [25, 38, -25] as [number, number, number], scale: [35, 10, 1] as [number, number, number], opacity: 0.2 },
  ], []);
  
  const cloudMaterials = useMemo(() => {
    return cloudLayers.map((cloud) => {
      const mat = cloudMaterial.clone();
      mat.uniforms.uOpacity.value = cloud.opacity;
      return mat;
    });
  }, [cloudMaterial, cloudLayers]);
  
  materialsRef.current = cloudMaterials;

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.elapsedTime * 0.001;
    }
    cloudMaterials.forEach((mat) => {
      mat.uniforms.uTime.value = clock.elapsedTime;
    });
  });
  
  return (
    <group ref={groupRef}>
      {cloudLayers.map((cloud, i) => (
        <mesh 
          key={i} 
          position={cloud.pos}
          rotation={[0, cloud.rotation || 0, 0]}
        >
          <planeGeometry args={[cloud.scale[0], cloud.scale[1], 32, 32]} />
          <primitive object={cloudMaterials[i]} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Height-based atmospheric fog with color gradients
 */
function AtmosphericFog() {
  const fogRef = useRef<THREE.Fog>(null);
  
  // Custom fog with height-based density would require a custom shader
  // For now, we use standard fog with adjusted parameters
  return (
    <fog ref={fogRef} attach="fog" args={['#0a0818', 20, 70]} />
  );
}


/**
 * Floating magical particles with gentle upward drift
 */
function FloatingParticles() {
  const ref = useRef<THREE.Points>(null);
  
  const { positions, speeds, colors } = useMemo(() => {
    const count = 50;
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    
    const particleColors = [
      new THREE.Color('#8866cc'),
      new THREE.Color('#6644aa'),
      new THREE.Color('#aa88dd'),
    ];
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = Math.random() * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
      speeds[i] = 0.08 + Math.random() * 0.12;
      
      const color = particleColors[Math.floor(Math.random() * particleColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    
    return { positions, speeds, colors };
  }, []);
  
  useFrame((_, delta) => {
    if (!ref.current) return;
    
    const arr = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < arr.length / 3; i++) {
      arr[i * 3 + 1] += speeds[i] * delta;
      // Add slight horizontal drift
      arr[i * 3] += Math.sin(arr[i * 3 + 1] * 0.5) * 0.002;
      if (arr[i * 3 + 1] > 10) {
        arr[i * 3 + 1] = 0;
        arr[i * 3] = (Math.random() - 0.5) * 30;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 30;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });
  
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export default ArenaEnvironment;
