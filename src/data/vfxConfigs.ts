/**
 * Declarative VFX Configuration Registry
 *
 * Define visual effect behaviors via data instead of hand-coding each one.
 * VFX systems read these configs to spawn, animate, and clean up particles.
 *
 * To add a new VFX:
 * 1. Define a VfxPresetConfig below
 * 2. Register it with registerVfxPreset()
 * 3. Trigger it via vfxStore.spawnEffect('your_preset_id', position)
 */

import type { VfxType } from '@/stores/vfxStore';

export interface ParticleEmitterConfig {
  /** Number of particles to spawn */
  count: number;
  /** Particle lifetime range [min, max] in seconds */
  lifetime: [number, number];
  /** Initial speed range [min, max] */
  speed: [number, number];
  /** Spread angle in radians (0 = focused, PI = hemisphere) */
  spread: number;
  /** Direction: 'up' | 'outward' | 'down' */
  direction: 'up' | 'outward' | 'down';
  /** Gravity multiplier (0 = no gravity, 1 = normal, -1 = float up) */
  gravity: number;
  /** Start/end scale */
  scaleRange: [number, number];
  /** Start/end opacity */
  opacityRange: [number, number];
  /** Color (hex number) */
  color: number;
  /** Whether color inherits from the event's team color */
  useTeamColor?: boolean;
}

export interface VfxPresetConfig {
  id: string;
  type: VfxType;
  /** Duration before auto-cleanup (seconds) */
  duration: number;
  /** Particle emitters to spawn */
  emitters: ParticleEmitterConfig[];
  /** Optional flash light */
  flash?: {
    color: number;
    intensity: number;
    distance: number;
    duration: number;
  };
  /** Camera shake intensity (0 = none) */
  cameraShake?: number;
}

const presetRegistry = new Map<string, VfxPresetConfig>();

export function registerVfxPreset(config: VfxPresetConfig): void {
  presetRegistry.set(config.id, config);
}

export function getVfxPreset(id: string): VfxPresetConfig | undefined {
  return presetRegistry.get(id);
}

// ─── BUILT-IN PRESETS ─────────────────────────────────────────────────────────

registerVfxPreset({
  id: 'hit',
  type: 'hit',
  duration: 0.6,
  emitters: [{
    count: 8,
    lifetime: [0.2, 0.4],
    speed: [2, 5],
    spread: Math.PI,
    direction: 'outward',
    gravity: 0,
    scaleRange: [0.1, 0.02],
    opacityRange: [1, 0],
    color: 0xff8800,
  }],
  flash: { color: 0xff8800, intensity: 10, distance: 5, duration: 0.15 },
});

registerVfxPreset({
  id: 'crit',
  type: 'crit',
  duration: 1.0,
  emitters: [{
    count: 16,
    lifetime: [0.3, 0.6],
    speed: [3, 8],
    spread: Math.PI,
    direction: 'outward',
    gravity: -2,
    scaleRange: [0.15, 0.03],
    opacityRange: [1, 0],
    color: 0xffff00,
  }],
  flash: { color: 0xffff00, intensity: 20, distance: 8, duration: 0.2 },
  cameraShake: 0.15,
});

registerVfxPreset({
  id: 'death',
  type: 'death',
  duration: 0.8,
  emitters: [{
    count: 20,
    lifetime: [0.4, 0.8],
    speed: [1, 4],
    spread: Math.PI * 0.5,
    direction: 'up',
    gravity: 3,
    scaleRange: [0.12, 0.04],
    opacityRange: [0.8, 0],
    color: 0xff4444,
    useTeamColor: true,
  }],
});

registerVfxPreset({
  id: 'spawn',
  type: 'spawn',
  duration: 1.2,
  emitters: [{
    count: 12,
    lifetime: [0.5, 1.0],
    speed: [2, 4],
    spread: 0.3,
    direction: 'up',
    gravity: -1,
    scaleRange: [0.08, 0.15],
    opacityRange: [0.6, 0],
    color: 0x00ff88,
    useTeamColor: true,
  }],
});

registerVfxPreset({
  id: 'shockwave',
  type: 'shockwave',
  duration: 0.8,
  emitters: [{
    count: 24,
    lifetime: [0.3, 0.6],
    speed: [5, 10],
    spread: Math.PI * 2,
    direction: 'outward',
    gravity: 0,
    scaleRange: [0.05, 0.01],
    opacityRange: [0.7, 0],
    color: 0x44bbff,
  }],
  cameraShake: 0.2,
});
