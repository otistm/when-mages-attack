/**
 * StatusVfx — Ambient particles near affected team's HP bar area
 * based on active status effects (burn, freeze, poison)
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/stores/gameStore';
import { ARENA } from '@/types';
import { STATUS_COLORS_3D } from '@/data/constants';

const MAX_PARTICLES = 16;

interface StatusParticle {
  active: boolean;
  life: number;
  maxLife: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

const STATUS_COLORS = STATUS_COLORS_3D;

const particleGeo = new THREE.IcosahedronGeometry(0.12, 0);

export function StatusVfx() {
  const playerEffects = useGameStore((s) => s.player.statusEffects);
  const enemyEffects = useGameStore((s) => s.enemy.statusEffects);

  return (
    <group>
      {playerEffects.map((effect) => (
        <StatusCloud
          key={`player-${effect}`}
          effect={effect}
          zCenter={ARENA.playerThroneZ - 1}
        />
      ))}
      {enemyEffects.map((effect) => (
        <StatusCloud
          key={`enemy-${effect}`}
          effect={effect}
          zCenter={ARENA.enemyThroneZ + 1}
        />
      ))}
    </group>
  );
}

function StatusCloud({ effect, zCenter }: { effect: string; zCenter: number }) {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const pool = useRef<StatusParticle[]>(
    Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      life: 0,
      maxLife: 0,
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0, vz: 0,
    })),
  );

  const color = STATUS_COLORS[effect as keyof typeof STATUS_COLORS] ?? 0xffffff;

  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      }),
    [color],
  );

  useFrame((_, delta) => {
    const p = pool.current;

    if (Math.random() < 0.3) {
      const inactive = p.find((pp) => !pp.active);
      if (inactive) {
        inactive.active = true;
        inactive.life = 0;
        inactive.maxLife = 0.8 + Math.random() * 0.6;
        inactive.x = (Math.random() - 0.5) * 10;
        inactive.y = 0.3 + Math.random() * 0.5;
        inactive.z = zCenter + (Math.random() - 0.5) * 2;
        inactive.vx = (Math.random() - 0.5) * 0.5;
        inactive.vy = 1.5 + Math.random();
        inactive.vz = (Math.random() - 0.5) * 0.3;
      }
    }

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const pp = p[i];
      const mesh = meshRefs.current[i];
      if (!mesh) continue;

      if (!pp.active) {
        mesh.visible = false;
        continue;
      }

      pp.life += delta;
      if (pp.life >= pp.maxLife) {
        pp.active = false;
        mesh.visible = false;
        continue;
      }

      const t = pp.life / pp.maxLife;
      mesh.visible = true;
      mesh.position.set(
        pp.x + pp.vx * pp.life,
        pp.y + pp.vy * pp.life,
        pp.z + pp.vz * pp.life,
      );
      const s = Math.sin(t * Math.PI) * 0.8;
      mesh.scale.setScalar(s);
      mat.opacity = Math.sin(t * Math.PI) * 0.6;
    }
  });

  return (
    <group>
      {Array.from({ length: MAX_PARTICLES }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => { meshRefs.current[i] = el; }}
          geometry={particleGeo}
          material={mat}
          visible={false}
        />
      ))}
    </group>
  );
}

export default StatusVfx;
