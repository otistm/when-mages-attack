/**
 * ToastProjectile - Animated toast with soft smoke trail
 * 
 * Based on Bobby Roe's Simple-Particle-Effects patterns:
 * - THREE.Points for performant particle rendering
 * - Procedural soft gradient texture for smoke puffs
 * - Proper alpha blending (not additive) for smoke
 * - Sprite-based billboarding
 * 
 * @see https://github.com/bobbyroe/Simple-Particle-Effects
 */

import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useDamageStore } from '@/stores/damageStore';
import { useGameStore } from '@/stores/gameStore';

import { StatusEffectConfig } from '@/types';

// Singleton texture to avoid recreating it for every projectile
let _smokeTexture: THREE.Texture | null = null;

function getSmokeTexture(): THREE.Texture {
  if (_smokeTexture) return _smokeTexture;
  
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  
  // Create radial gradient - soft edge smoke puff
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  
  _smokeTexture = new THREE.CanvasTexture(canvas);
  _smokeTexture.needsUpdate = true;
  return _smokeTexture;
}

// Smoke configuration
const SMOKE_CONFIG = {
  maxParticles: 50,
  spawnRate: 40,        // Particles per second
  lifeTime: 1.8,        // Seconds
  startSize: 0.15,
  endSize: 0.8,
  startOpacity: 0.7,
  endOpacity: 0,
  speed: 0.3,
  riseSpeed: 0.5,
  spread: 0.15,
  color: new THREE.Color(0.95, 0.9, 0.85), // Warm smoke
};

interface Particle {
  alive: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  maxAge: number;
  size: number;
}

interface ToastProjectileProps {
  id: string;
  startPosition: [number, number, number];
  endPosition: [number, number, number]; // Can be dynamic (updated each render)
  damage: number;
  onComplete: (id: string) => void;
  delay?: number;
  /** Optional: minion ID for homing behavior */
  targetMinionId?: string;
  /** Optional: target team for status effects */
  targetTeam?: 'player' | 'enemy';
  /** Optional: status effect to apply on hit */
  statusEffect?: StatusEffectConfig;
}

export function ToastProjectile({
  id,
  startPosition,
  endPosition,
  damage,
  onComplete,
  delay = 0,
  targetMinionId,
  targetTeam = 'enemy',
  statusEffect,
}: ToastProjectileProps) {
  const toastRef = useRef<THREE.Mesh>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);
  
  const [started, setStarted] = useState(false);
  const [toastHit, setToastHit] = useState(false);
  const [fullyComplete, setFullyComplete] = useState(false);
  
  const startTimeRef = useRef<number | null>(null);
  const spawnAccumulator = useRef(0);
  const hitTriggered = useRef(false);
  
  const addCameraTrauma = useGameStore((state) => state.addCameraTrauma);
  const addDamageEvent = useDamageStore((state) => state.addDamageEvent);

  const flightDuration = 0.7; // Faster projectiles for snappy feel

  // Dynamic smoke config based on status effect
  const smokeColor = useMemo(() => {
    if (statusEffect?.type === 'burn') return new THREE.Color(1.0, 0.4, 0.1); // Fiery smoke
    return SMOKE_CONFIG.color;
  }, [statusEffect]);
  
  // Get smoke texture (singleton)
  const smokeTexture = useMemo(() => getSmokeTexture(), []);
  
  // Initialize particle pool
  const particles = useMemo<Particle[]>(() => 
    Array.from({ length: SMOKE_CONFIG.maxParticles }, () => ({
      alive: false,
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      age: 0,
      maxAge: 0,
      size: 0,
    })),
    []
  );
  
  // Create geometry with attributes
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(SMOKE_CONFIG.maxParticles * 3);
    const sizes = new Float32Array(SMOKE_CONFIG.maxParticles);
    const opacities = new Float32Array(SMOKE_CONFIG.maxParticles);
    
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
    
    return geo;
  }, []);
  
  // Create shader material for soft smoke
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: smokeTexture },
        uColor: { value: smokeColor },
      },
      vertexShader: `
        attribute float size;
        attribute float opacity;
        varying float vOpacity;
        
        void main() {
          vOpacity = opacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform vec3 uColor;
        varying float vOpacity;
        
        void main() {
          vec4 texColor = texture2D(uTexture, gl_PointCoord);
          gl_FragColor = vec4(uColor, texColor.a * vOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
  }, [smokeTexture]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      // Do not dispose the singleton smoke texture here!
    };
  }, [geometry, material]);

  // Spawn a particle at position
  const spawnParticle = (pos: THREE.Vector3) => {
    const particle = particles.find(p => !p.alive);
    if (!particle) return;
    
    particle.alive = true;
    particle.position.copy(pos);
    particle.position.x += (Math.random() - 0.5) * SMOKE_CONFIG.spread;
    particle.position.y += (Math.random() - 0.5) * SMOKE_CONFIG.spread * 0.5;
    particle.position.z += (Math.random() - 0.5) * SMOKE_CONFIG.spread;
    
    // Velocity - mostly upward with slight spread
    particle.velocity.set(
      (Math.random() - 0.5) * SMOKE_CONFIG.speed,
      SMOKE_CONFIG.riseSpeed * (0.8 + Math.random() * 0.4),
      (Math.random() - 0.5) * SMOKE_CONFIG.speed + 0.2 // Slight trail behind
    );
    
    particle.age = 0;
    particle.maxAge = SMOKE_CONFIG.lifeTime * (0.7 + Math.random() * 0.6);
    particle.size = SMOKE_CONFIG.startSize * (0.8 + Math.random() * 0.4);
  };

  useFrame((state, delta) => {
    if (fullyComplete) return;

    const time = state.clock.elapsedTime;

    // Handle delay
    if (!started) {
      if (startTimeRef.current === null) {
        startTimeRef.current = time;
      }
      if (time - startTimeRef.current < delay) {
        return;
      }
      setStarted(true);
      startTimeRef.current = time;
    }

    // Calculate flight progress
    const elapsed = time - (startTimeRef.current ?? time);
    const t = Math.min(elapsed / flightDuration, 1);
    
    // Ease-out for satisfying deceleration at end
    const easeT = 1 - Math.pow(1 - t, 2);

    // Update toast position
    let currentPos = new THREE.Vector3();
    if (toastRef.current && !toastHit) {
      // Arc height for visibility in top-down view
      const arcHeight = 3.0;
      const arcT = Math.sin(t * Math.PI);
      
      // Ground position (for shadow)
      const groundX = THREE.MathUtils.lerp(startPosition[0], endPosition[0], easeT);
      const groundZ = THREE.MathUtils.lerp(startPosition[2], endPosition[2], easeT);
      const groundY = 0.05; // Just above floor
      
      // Toast position with arc
      const toastY = THREE.MathUtils.lerp(startPosition[1], endPosition[1], easeT) + arcT * arcHeight;
      
      currentPos.set(groundX, toastY, groundZ);
      
      toastRef.current.position.copy(currentPos);
      
      // Face the target direction while tumbling
      const dirAngle = Math.atan2(
        endPosition[0] - startPosition[0],
        endPosition[2] - startPosition[2]
      );
      toastRef.current.rotation.set(
        t * Math.PI * 1.5,   // tumble forward
        dirAngle,             // face target
        t * Math.PI * 0.7     // spin
      );
      
      // Scale based on height - closer to camera (higher Y) = larger
      // Base scale + height bonus for depth perception in top-down view
      const heightScale = 1 + (toastY / arcHeight) * 0.3;
      const wobble = Math.sin(t * Math.PI * 3) * 0.08;
      toastRef.current.scale.setScalar(heightScale + wobble);
      
      // Update drop shadow position and scale
      if (shadowRef.current) {
        shadowRef.current.position.set(groundX, groundY, groundZ);
        // Shadow gets smaller and more opaque as toast gets higher
        const shadowScale = 1.2 - arcT * 0.4;
        shadowRef.current.scale.setScalar(shadowScale);
        // Shadow opacity based on height
        const shadowMat = shadowRef.current.material as THREE.MeshBasicMaterial;
        shadowMat.opacity = 0.3 + arcT * 0.2;
      }

      // Spawn smoke particles
      spawnAccumulator.current += delta * SMOKE_CONFIG.spawnRate;
      while (spawnAccumulator.current >= 1) {
        spawnAccumulator.current -= 1;
        spawnParticle(currentPos);
      }
    }

    // Trigger hit
    if (t >= 1 && !hitTriggered.current) {
      hitTriggered.current = true;
      setToastHit(true);
      
      // Camera shake for impact feel (subtle)
      addCameraTrauma(0.08);
      
      // Damage number at impact point
      addDamageEvent(damage, targetTeam, [
        endPosition[0],
        endPosition[1] + 0.5,
        endPosition[2],
      ]);
      
      // Notify Arena to handle damage to grid square
      onComplete(id);
    }

    // Update particles
    let aliveCount = 0;
    const positions = geometry.attributes.position.array as Float32Array;
    const sizes = geometry.attributes.size.array as Float32Array;
    const opacities = geometry.attributes.opacity.array as Float32Array;
    
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      
      if (p.alive) {
        p.age += delta;
        
        if (p.age >= p.maxAge) {
          p.alive = false;
        } else {
          aliveCount++;
          
          // Life progress 0 -> 1
          const life = p.age / p.maxAge;
          
          // Update position - slow down over time
          const slowdown = 1 - life * 0.7;
          p.position.x += p.velocity.x * delta * slowdown;
          p.position.y += p.velocity.y * delta;
          p.position.z += p.velocity.z * delta * slowdown;
          
          // Size grows over life
          const sizeProgress = Math.sin(life * Math.PI * 0.8); // Grows then shrinks slightly
          const size = THREE.MathUtils.lerp(
            SMOKE_CONFIG.startSize, 
            SMOKE_CONFIG.endSize, 
            sizeProgress
          ) * (p.size / SMOKE_CONFIG.startSize);
          
          // Opacity fades - hold for a bit then fade out
          const fadeStart = 0.25;
          const opacity = life < fadeStart 
            ? SMOKE_CONFIG.startOpacity 
            : THREE.MathUtils.lerp(
                SMOKE_CONFIG.startOpacity,
                SMOKE_CONFIG.endOpacity,
                (life - fadeStart) / (1 - fadeStart)
              );
          
          // Update buffers
          positions[i * 3] = p.position.x;
          positions[i * 3 + 1] = p.position.y;
          positions[i * 3 + 2] = p.position.z;
          sizes[i] = size;
          opacities[i] = Math.max(0, opacity);
        }
      }
      
      if (!p.alive) {
        // Hide dead particles
        sizes[i] = 0;
        opacities[i] = 0;
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
    geometry.attributes.opacity.needsUpdate = true;

    // Check if fully complete (toast hit + all particles dead)
    if (toastHit && aliveCount === 0) {
      setFullyComplete(true);
    }
  });

  if (fullyComplete) return null;

  return (
    <group renderOrder={15}>
      {/* Smoke particles using Points */}
      <points ref={pointsRef} geometry={geometry} material={material} renderOrder={15} />

      {/* Drop shadow on ground - provides depth cue in top-down view */}
      {!toastHit && (
        <mesh
          ref={shadowRef}
          position={[startPosition[0], 0.05, startPosition[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[0.7, 16]} />
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Toast - cel-shaded with MeshToonMaterial */}
      {!toastHit && (
        <ToastMesh 
          toastRef={toastRef} 
          startPosition={startPosition} 
          isBurning={statusEffect?.type === 'burn'}
        />
      )}
    </group>
  );
}

/**
 * ToastMesh - Flat colors for cel-shaded look
 */
function ToastMesh({ 
  toastRef, 
  startPosition,
  isBurning
}: { 
  toastRef: React.RefObject<THREE.Mesh>; 
  startPosition: [number, number, number];
  isBurning?: boolean;
}) {
  return (
    <mesh ref={toastRef as React.RefObject<THREE.Mesh>} position={startPosition} castShadow>
      <boxGeometry args={[0.8, 1.0, 0.2]} />
      <meshBasicMaterial color={isBurning ? '#ff4500' : '#d4a056'} />
      {/* Crust edge */}
      <mesh position={[0, 0, 0.12]} castShadow>
        <boxGeometry args={[0.7, 0.9, 0.04]} />
        <meshBasicMaterial color={isBurning ? '#802000' : '#c9944d'} />
      </mesh>
    </mesh>
  );
}

export default ToastProjectile;
