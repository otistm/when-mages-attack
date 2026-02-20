/**
 * MinionStatusVfx — Per-minion visual feedback for active status effects.
 * Fixed-size particle pool, ref-driven animation, no React state in useFrame.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCombatStore } from '@/stores/combatStore';
import { minionPositions } from '@/utils/minionPositionRegistry';
import { StatusEffectType } from '@/types';
import { shallow } from 'zustand/shallow';

const PARTICLES_PER_EFFECT = 4;
const TOTAL_PARTICLES = 20;

interface Particle {
  active: boolean;
  effect: StatusEffectType | null;
  life: number;
  maxLife: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

const EFFECT_COLORS: Record<StatusEffectType, number> = {
  shocked:  0x44ddff,
  burn:     0xff6622,
  poison:   0x44ff44,
  freeze:   0x88ccff,
  blighted: 0x9944cc,
};

const EFFECT_EMISSIVE: Record<StatusEffectType, number> = {
  shocked:  0x22aaff,
  burn:     0xff4400,
  poison:   0x22cc22,
  freeze:   0x4488ff,
  blighted: 0x6622aa,
};

const sharedGeo = new THREE.IcosahedronGeometry(0.08, 0);

function spawnParticle(p: Particle, effect: StatusEffectType, offsetY: number) {
  p.active = true;
  p.effect = effect;
  p.life = 0;
  p.maxLife = 0.4 + Math.random() * 0.5;

  const angle = Math.random() * Math.PI * 2;
  const radius = 0.3 + Math.random() * 0.4;
  p.x = Math.cos(angle) * radius;
  p.z = Math.sin(angle) * radius;
  p.y = offsetY + Math.random() * 0.3;

  switch (effect) {
    case 'shocked':
      p.vx = (Math.random() - 0.5) * 3;
      p.vy = (Math.random() - 0.5) * 2;
      p.vz = (Math.random() - 0.5) * 3;
      p.maxLife = 0.15 + Math.random() * 0.15;
      break;
    case 'burn':
      p.vx = (Math.random() - 0.5) * 0.3;
      p.vy = 1.5 + Math.random() * 1.0;
      p.vz = (Math.random() - 0.5) * 0.3;
      break;
    case 'poison':
      p.vx = (Math.random() - 0.5) * 0.2;
      p.vy = -0.8 - Math.random() * 0.5;
      p.vz = (Math.random() - 0.5) * 0.2;
      break;
    case 'freeze':
      p.vx = (Math.random() - 0.5) * 0.15;
      p.vy = 0.2 + Math.random() * 0.3;
      p.vz = (Math.random() - 0.5) * 0.15;
      p.maxLife = 0.6 + Math.random() * 0.4;
      break;
    case 'blighted':
      p.vx = (Math.random() - 0.5) * 0.6;
      p.vy = 0.5 + Math.random() * 0.5;
      p.vz = (Math.random() - 0.5) * 0.6;
      break;
  }
}

export function MinionStatusVfx({ minionId }: { minionId: string }) {
  const activeTypes = useCombatStore((s) => {
    const minion = s.minions.get(minionId);
    if (!minion || minion.debuffs.length === 0) return null;
    return minion.debuffs.map((d) => d.type);
  }, shallow);

  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const pool = useRef<Particle[]>(
    Array.from({ length: TOTAL_PARTICLES }, () => ({
      active: false,
      effect: null,
      life: 0,
      maxLife: 0,
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0, vz: 0,
    })),
  );

  const materials = useMemo(() => {
    const mats: Record<string, THREE.MeshBasicMaterial> = {};
    for (const key of Object.keys(EFFECT_COLORS) as StatusEffectType[]) {
      mats[key] = new THREE.MeshBasicMaterial({
        color: EFFECT_COLORS[key],
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
    }
    return mats;
  }, []);

  const spawnTimers = useRef<Record<string, number>>({});

  useFrame((_, delta) => {
    const pos = minionPositions.get(minionId);
    if (!pos || !activeTypes) {
      for (let i = 0; i < TOTAL_PARTICLES; i++) {
        const mesh = meshRefs.current[i];
        if (mesh) mesh.visible = false;
        pool.current[i].active = false;
      }
      return;
    }

    const timers = spawnTimers.current;

    for (const effect of activeTypes) {
      timers[effect] = (timers[effect] ?? 0) + delta;
      const interval = effect === 'shocked' ? 0.05 : 0.15;

      if (timers[effect] >= interval) {
        timers[effect] = 0;
        const inactive = pool.current.find((p) => !p.active);
        if (inactive) {
          spawnParticle(inactive, effect, 0.5);
        }
      }
    }

    for (let i = 0; i < TOTAL_PARTICLES; i++) {
      const p = pool.current[i];
      const mesh = meshRefs.current[i];
      if (!mesh) continue;

      if (!p.active || !p.effect) {
        mesh.visible = false;
        continue;
      }

      p.life += delta;
      if (p.life >= p.maxLife) {
        p.active = false;
        mesh.visible = false;
        continue;
      }

      const t = p.life / p.maxLife;
      mesh.visible = true;

      mesh.position.set(
        pos.x + p.x + p.vx * p.life,
        pos.y + p.y + p.vy * p.life,
        pos.z + p.z + p.vz * p.life,
      );

      const scale = p.effect === 'shocked'
        ? (Math.random() > 0.5 ? 1.2 : 0.4)
        : Math.sin(t * Math.PI) * 0.8;
      mesh.scale.setScalar(scale);

      const mat = materials[p.effect];
      if (mat) {
        mesh.material = mat;
        mat.opacity = Math.sin(t * Math.PI) * 0.7;
      }
    }
  });

  return (
    <group>
      {Array.from({ length: TOTAL_PARTICLES }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => { meshRefs.current[i] = el; }}
          geometry={sharedGeo}
          visible={false}
        />
      ))}
    </group>
  );
}

export default MinionStatusVfx;
