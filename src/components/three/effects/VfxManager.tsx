/**
 * VfxManager — Reads the vfxStore each frame and renders active effects.
 * Handles tick-based cleanup of expired events.
 */

import { useFrame } from '@react-three/fiber';
import { useVfxStore, VfxEvent } from '@/stores/vfxStore';
import { ShockwaveRing } from './ShockwaveRing';
import { ParticleBurst } from './ParticleBurst';
import { ImpactFlash } from './ImpactFlash';

export function VfxManager() {
  const events = useVfxStore((s) => s.events);
  const tick = useVfxStore((s) => s.tick);

  useFrame(() => {
    tick(performance.now() / 1000);
  });

  return (
    <group>
      {events.map((e) => {
        const progress = getProgress(e);
        return <VfxRenderer key={e.id} event={e} progress={progress} />;
      })}
    </group>
  );
}

function getProgress(e: VfxEvent): number {
  const now = performance.now() / 1000;
  return Math.min((now - e.createdAt) / e.duration, 1);
}

function VfxRenderer({ event, progress }: { event: VfxEvent; progress: number }) {
  const { type, position, color, intensity = 1 } = event;

  switch (type) {
    case 'hit':
      return (
        <>
          <ShockwaveRing
            position={position}
            color={color ?? '#ffffff'}
            maxRadius={2.5 * intensity}
            progress={progress}
          />
          <ParticleBurst
            position={position}
            color={color ?? '#cccccc'}
            count={8}
            speed={5 * intensity}
            progress={progress}
          />
          <ImpactFlash
            position={position}
            color={color ?? '#ffffff'}
            progress={progress}
          />
        </>
      );

    case 'crit':
      return (
        <>
          <ShockwaveRing
            position={position}
            color={color ?? '#ffaa00'}
            maxRadius={4 * intensity}
            progress={progress}
          />
          <ShockwaveRing
            position={position}
            color={color ?? '#ff4400'}
            maxRadius={3 * intensity}
            progress={Math.min(progress * 1.3, 1)}
          />
          <ParticleBurst
            position={position}
            color={color ?? '#ffcc44'}
            count={14}
            speed={8 * intensity}
            progress={progress}
          />
          <ImpactFlash
            position={position}
            color={color ?? '#ffffff'}
            progress={progress}
            size={1.5}
          />
        </>
      );

    case 'spawn':
      return (
        <ShockwaveRing
          position={position}
          color={color ?? '#4ade80'}
          maxRadius={3}
          progress={progress}
        />
      );

    case 'death':
      return (
        <>
          <ParticleBurst
            position={position}
            color={color ?? '#888888'}
            count={8}
            speed={4}
            progress={progress}
          />
          <ImpactFlash
            position={position}
            color="#ffffff"
            progress={progress}
            size={0.8}
          />
        </>
      );

    case 'projectileLaunch':
      return (
        <ImpactFlash
          position={position}
          color={color ?? '#ffcc00'}
          progress={progress}
          size={0.6}
        />
      );

    case 'shockwave':
      return (
        <ShockwaveRing
          position={position}
          color={color ?? '#8888ff'}
          maxRadius={5 * intensity}
          progress={progress}
        />
      );

    case 'statusApply':
      return (
        <ShockwaveRing
          position={position}
          color={color ?? '#ff8800'}
          maxRadius={2}
          progress={progress}
        />
      );

    default:
      return null;
  }
}

export default VfxManager;
