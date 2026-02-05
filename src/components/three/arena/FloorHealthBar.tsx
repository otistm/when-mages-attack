/**
 * FloorHealthBar - Ground-level HP bar for player or enemy
 * Has a visible outline/container so it's visible even at zero health
 * Flashes on impact when taking damage
 * Shows animated burn/status effect visuals
 */

import { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/stores/gameStore';
import { CARD_SLOTS, ARENA, StatusEffectType } from '@/types';

interface FloorHealthBarProps {
  side: 'player' | 'enemy';
}

const STATUS_COLORS: Record<StatusEffectType, string> = {
  burn: '#ff6b3d',
  freeze: '#66ccff',
  poison: '#6bff66',
  blighted: '#7a3cff',
  shocked: '#ffd166',
};

const STATUS_PRIORITY: StatusEffectType[] = [
  'shocked',
  'burn',
  'freeze',
  'poison',
  'blighted',
];

// Status effect visual descriptions (per Narrative Designer)
const STATUS_VISUALS: Record<StatusEffectType, { 
  pulseSpeed: number; 
  glowIntensity: number;
  particleColor: string;
}> = {
  burn: { pulseSpeed: 8, glowIntensity: 0.6, particleColor: '#ff4400' },
  freeze: { pulseSpeed: 2, glowIntensity: 0.4, particleColor: '#88ddff' },
  poison: { pulseSpeed: 4, glowIntensity: 0.3, particleColor: '#44ff44' },
  blighted: { pulseSpeed: 3, glowIntensity: 0.5, particleColor: '#aa44ff' },
  shocked: { pulseSpeed: 15, glowIntensity: 0.7, particleColor: '#ffdd00' },
};

export function FloorHealthBar({ side }: FloorHealthBarProps) {
  const player = useGameStore((state) => state.player);
  const enemy = useGameStore((state) => state.enemy);
  const data = side === 'player' ? player : enemy;

  const [flashIntensity, setFlashIntensity] = useState(0);
  const [statusPulse, setStatusPulse] = useState(0);
  const prevHealthRef = useRef(data.health);
  const flashMeshRef = useRef<THREE.Mesh>(null);

  // Active status effect for visual
  const activeStatus = useMemo(() => {
    return STATUS_PRIORITY.find((status) => data.statusEffects.includes(status));
  }, [data.statusEffects]);

  // Detect health decrease and trigger flash
  useEffect(() => {
    if (data.health < prevHealthRef.current) {
      setFlashIntensity(1);
    }
    prevHealthRef.current = data.health;
  }, [data.health]);

  // Animate flash decay and status pulse
  useFrame((state, delta) => {
    if (flashIntensity > 0) {
      setFlashIntensity(Math.max(0, flashIntensity - delta * 4));
    }
    
    // Status effect pulse animation (e.g., burn flicker)
    if (activeStatus) {
      const visual = STATUS_VISUALS[activeStatus];
      // Irregular flicker for burn, smoother pulse for others
      const flicker = activeStatus === 'burn' 
        ? Math.sin(state.clock.elapsedTime * visual.pulseSpeed) * 0.5 + 
          Math.sin(state.clock.elapsedTime * visual.pulseSpeed * 1.7) * 0.3 +
          Math.random() * 0.2
        : Math.sin(state.clock.elapsedTime * visual.pulseSpeed) * 0.5 + 0.5;
      setStatusPulse(flicker * visual.glowIntensity);
    } else {
      setStatusPulse(0);
    }
  });

  const healthRatio = data.maxHealth > 0 ? data.health / data.maxHealth : 0;

  const barWidth = useMemo(() => {
    const minX = Math.min(...CARD_SLOTS.map((slot) => slot.xPosition));
    const maxX = Math.max(...CARD_SLOTS.map((slot) => slot.xPosition));
    const circleDiameter = 2.3;
    return maxX - minX + circleDiameter;
  }, []);

  const barHeight = 0.35;
  const borderThickness = 0.08;
  const fillWidth = Math.max(0.02, barWidth * THREE.MathUtils.clamp(healthRatio, 0, 1));

  const statusColor = useMemo(() => {
    const active = STATUS_PRIORITY.find((status) => data.statusEffects.includes(status));
    return active ? STATUS_COLORS[active] : side === 'player' ? '#32d27a' : '#ff5c5c';
  }, [data.statusEffects, side]);

  // Border color - same as fill but dimmer
  const borderColor = side === 'player' ? '#1a4a2a' : '#4a1a1a';
  
  // Flash color - white/bright version
  const flashColor = '#ffffff';

  // Position HP bars near their respective card rows
  // Enemy HP bar near top (negative Z), Player HP bar near bottom (positive Z)
  const zPosition = side === 'player' ? ARENA.playerSlotZ : ARENA.enemySlotZ;

  // Cel-shaded colors - flat, no gradients
  const outlineColor = '#111111';
  const outlineThickness = 0.06;
  
  return (
    <group position={[0, 0.02, zPosition]}>
      {/* Black outline - bottom layer */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
        <planeGeometry args={[barWidth + outlineThickness * 2, barHeight + outlineThickness * 2]} />
        <meshBasicMaterial color={outlineColor} />
      </mesh>

      {/* Outer border/container - flat color */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[barWidth + borderThickness * 2, barHeight + borderThickness * 2]} />
        <meshBasicMaterial color={borderColor} />
      </mesh>

      {/* Inner dark background - flat */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <planeGeometry args={[barWidth, barHeight]} />
        <meshBasicMaterial color="#0a0a10" />
      </mesh>

      {/* Health fill bar - flat solid color */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-(barWidth - fillWidth) / 2, 0.002, 0]}
      >
        <planeGeometry args={[fillWidth, barHeight - 0.04]} />
        <meshBasicMaterial color={statusColor} />
      </mesh>

      {/* Status effect overlay - flat color pulse */}
      {activeStatus && statusPulse > 0.3 && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[-(barWidth - fillWidth) / 2, 0.003, 0]}
        >
          <planeGeometry args={[fillWidth, barHeight - 0.04]} />
          <meshBasicMaterial 
            color="#ffffff"
            transparent
            opacity={statusPulse * 0.4}
          />
        </mesh>
      )}

      {/* Flash overlay - solid white on damage */}
      {flashIntensity > 0 && (
        <mesh
          ref={flashMeshRef}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.004, 0]}
        >
          <planeGeometry args={[barWidth + borderThickness * 2, barHeight + borderThickness * 2]} />
          <meshBasicMaterial 
            color={flashColor}
            transparent
            opacity={flashIntensity * 0.7}
          />
        </mesh>
      )}
    </group>
  );
}

export default FloorHealthBar;
