/**
 * Object Pool for particle-like entities.
 * Eliminates GC pressure by reusing objects instead of allocating new ones.
 *
 * Usage:
 *   const pool = new ObjectPool(() => new ParticleData(), 100);
 *   const p = pool.acquire();
 *   // ... use p ...
 *   pool.release(p);
 */

export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset?: (item: T) => void;

  constructor(factory: () => T, initialSize: number, reset?: (item: T) => void) {
    this.factory = factory;
    this.reset = reset;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
    }
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }

  release(item: T): void {
    this.reset?.(item);
    this.pool.push(item);
  }

  get available(): number {
    return this.pool.length;
  }

  prewarm(count: number): void {
    for (let i = 0; i < count; i++) {
      this.pool.push(this.factory());
    }
  }
}

/**
 * Pooled particle data for use with THREE.js InstancedMesh or Points.
 */
export interface PooledParticle {
  active: boolean;
  life: number;
  maxLife: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  scale: number;
  color: number;
  opacity: number;
}

export function createParticle(): PooledParticle {
  return {
    active: false,
    life: 0,
    maxLife: 1,
    x: 0, y: 0, z: 0,
    vx: 0, vy: 0, vz: 0,
    scale: 1,
    color: 0xffffff,
    opacity: 1,
  };
}

export function resetParticle(p: PooledParticle): void {
  p.active = false;
  p.life = 0;
  p.maxLife = 1;
  p.x = 0; p.y = 0; p.z = 0;
  p.vx = 0; p.vy = 0; p.vz = 0;
  p.scale = 1;
  p.color = 0xffffff;
  p.opacity = 1;
}

/**
 * Pre-built pool for general-purpose particles.
 * Shared across all VFX systems to reduce total allocations.
 */
export const globalParticlePool = new ObjectPool(createParticle, 256, resetParticle);
