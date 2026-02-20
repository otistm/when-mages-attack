/**
 * LowPolyBrick — Procedural low-poly magical brick with rune sigil.
 *
 * Based on docs/rune_brick.md:
 * - Body: Subdivided BoxGeometry with vertex perturbation for chipped edges
 * - Sigil: Thin box meshes forming a rune pattern on the front face
 * - Magic glow: PointLight pulsing on the sigil
 * - Idle: Menacing hover/bob with slow rotation
 * - Attack: Launches upward, spins chaotically, slams down with dust cloud
 * - Damage flash: emissive pulse on hit
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Shared geometry — created once
const brickGeo = (() => {
  const g = new THREE.BoxGeometry(2.4, 0.9, 1.2, 5, 3, 3);
  const pos = g.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    const isEdgeX = Math.abs(x) > 1.1;
    const isEdgeY = Math.abs(y) > 0.4;
    const isEdgeZ = Math.abs(z) > 0.5;

    if ((isEdgeX && isEdgeY) || (isEdgeY && isEdgeZ) || (isEdgeX && isEdgeZ)) {
      x -= Math.sign(x) * (Math.random() * 0.1);
      y -= Math.sign(y) * (Math.random() * 0.1);
      z -= Math.sign(z) * (Math.random() * 0.1);
    }

    x += (Math.random() - 0.5) * 0.05;
    y += (Math.random() - 0.5) * 0.05;
    z += (Math.random() - 0.5) * 0.05;

    pos.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
})();

// Rune line geometry pieces (thin boxes)
const runeGeos = {
  pillar: new THREE.BoxGeometry(0.08, 0.6, 0.05),
  branchL: new THREE.BoxGeometry(0.06, 0.4, 0.05),
  branchR: new THREE.BoxGeometry(0.06, 0.4, 0.05),
  chevronL: new THREE.BoxGeometry(0.06, 0.3, 0.05),
  chevronR: new THREE.BoxGeometry(0.06, 0.3, 0.05),
  dot: new THREE.BoxGeometry(0.08, 0.08, 0.05),
};

const dustGeo = new THREE.TetrahedronGeometry(0.3, 0);

const BASE_SCALE = 1.5;
const MAX_DUST = 20;

interface DustParticle {
  active: boolean;
  life: number;
  speed: THREE.Vector3;
  rotSpeed: THREE.Vector3;
}

interface LowPolyBrickProps {
  team: 'player' | 'enemy';
  isDamaged?: boolean;
  state?: string;
  isReady?: boolean;
}

export function LowPolyBrick({
  team,
  isDamaged,
  state,
  isReady,
}: LowPolyBrickProps) {
  const groupRef = useRef<THREE.Group>(null);
  const brickRef = useRef<THREE.Group>(null);
  const magicLightRef = useRef<THREE.PointLight>(null);
  const dustMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const damageFlash = useRef(0);
  const prevDamaged = useRef(false);
  const fireAnim = useRef(0);
  const prevIsReady = useRef(false);

  const isPlayer = team === 'player';
  const magicColor = isPlayer ? 0xff3366 : 0xff4444;

  const dustPool = useRef<DustParticle[]>(
    Array.from({ length: MAX_DUST }, () => ({
      active: false,
      life: 0,
      speed: new THREE.Vector3(),
      rotSpeed: new THREE.Vector3(),
    }))
  );

  const materials = useMemo(() => ({
    brick: new THREE.MeshStandardMaterial({
      color: 0xa53b2a,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true,
    }),
    sigil: new THREE.MeshBasicMaterial({ color: magicColor }),
    dust: new THREE.MeshStandardMaterial({
      color: 0x5a4a40,
      roughness: 1.0,
      transparent: true,
      opacity: 0.8,
      flatShading: true,
    }),
  }), [magicColor]);

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    const brick = brickRef.current;
    const light = magicLightRef.current;
    if (!group || !brick) return;

    const t = clock.elapsedTime;

    // Detect fire event
    if (isReady && !prevIsReady.current) {
      fireAnim.current = 1.0;
      // Spawn dust
      const pool = dustPool.current;
      for (let i = 0; i < MAX_DUST; i++) {
        const p = pool[i];
        p.active = true;
        p.life = 1.0;
        const angle = Math.random() * Math.PI * 2;
        const spd = 2 + Math.random() * 4;
        p.speed.set(Math.cos(angle) * spd, 0.5 + Math.random() * 2.0, Math.sin(angle) * spd);
        p.rotSpeed.set(Math.random() * 5, Math.random() * 5, Math.random() * 5);
      }
    }
    prevIsReady.current = !!isReady;

    // Damage flash
    if (isDamaged && !prevDamaged.current) {
      damageFlash.current = 1;
    }
    prevDamaged.current = !!isDamaged;

    if (damageFlash.current > 0) {
      damageFlash.current -= delta * 5;
      materials.brick.emissiveIntensity = damageFlash.current * 1.5;
      materials.brick.emissive.setHex(0xffffff);
    } else {
      materials.brick.emissiveIntensity = 0;
      materials.brick.emissive.setHex(0x000000);
    }

    // Fire animation (launch up + slam)
    if (fireAnim.current > 0) {
      fireAnim.current -= delta * 1.5;
      if (fireAnim.current < 0) fireAnim.current = 0;

      const phase = fireAnim.current;
      // Arc upward then slam
      const height = Math.sin(phase * Math.PI) * 3.0;
      brick.position.y = 0.45 + height;

      // Chaotic spin
      brick.rotation.x += (Math.random() - 0.5) * 15 * delta;
      brick.rotation.y += (Math.random() - 0.5) * 15 * delta;
      brick.rotation.z += (Math.random() - 0.5) * 15 * delta;

      if (light) light.intensity = 5;
    } else {
      // Idle: menacing hover/bob
      brick.position.y = 0.45 + Math.sin(t * 2) * 0.1;
      brick.rotation.y = Math.sin(t * 0.5) * 0.2;
      brick.rotation.x = Math.sin(t * 0.7) * 0.1;
      brick.rotation.z = 0;

      if (light) light.intensity = 2 + Math.sin(t * 5) * 1;
    }

    // Dust particles
    const pool = dustPool.current;
    for (let i = 0; i < MAX_DUST; i++) {
      const p = pool[i];
      const mesh = dustMeshRefs.current[i];
      if (!mesh) continue;

      if (!p.active) {
        mesh.visible = false;
        continue;
      }

      p.life -= delta * 0.8;
      if (p.life <= 0) {
        p.active = false;
        mesh.visible = false;
        continue;
      }

      mesh.visible = true;
      mesh.position.x += p.speed.x * delta;
      mesh.position.y += p.speed.y * delta;
      mesh.position.z += p.speed.z * delta;

      p.speed.x *= 0.95;
      p.speed.z *= 0.95;
      p.speed.y -= 2 * delta;

      mesh.rotation.x += p.rotSpeed.x * delta;
      mesh.rotation.y += p.rotSpeed.y * delta;

      const scale = 0.5 + p.life;
      mesh.scale.setScalar(scale);
      (mesh.material as THREE.MeshStandardMaterial).opacity = p.life * 0.8;
    }

    group.scale.setScalar(BASE_SCALE);
  });

  const yRotation = isPlayer ? 0 : Math.PI;

  return (
    <group ref={groupRef} scale={BASE_SCALE} rotation={[0, yRotation, 0]}>
      <group ref={brickRef} position={[0, 0.45, 0]}>
        {/* Brick body */}
        <mesh geometry={brickGeo} material={materials.brick} castShadow receiveShadow />

        {/* Rune sigil on front face (+Z) */}
        <group position={[0, 0, 0.6]}>
          {/* Central pillar */}
          <mesh geometry={runeGeos.pillar} material={materials.sigil} />
          {/* Left branch */}
          <mesh geometry={runeGeos.branchL} material={materials.sigil} position={[-0.15, 0.1, 0]} rotation={[0, 0, -Math.PI / 4]} />
          {/* Right branch */}
          <mesh geometry={runeGeos.branchR} material={materials.sigil} position={[0.15, 0.1, 0]} rotation={[0, 0, Math.PI / 4]} />
          {/* Bottom chevron left */}
          <mesh geometry={runeGeos.chevronL} material={materials.sigil} position={[-0.1, -0.2, 0]} rotation={[0, 0, Math.PI / 3]} />
          {/* Bottom chevron right */}
          <mesh geometry={runeGeos.chevronR} material={materials.sigil} position={[0.1, -0.2, 0]} rotation={[0, 0, -Math.PI / 3]} />
          {/* Floating dot above */}
          <mesh geometry={runeGeos.dot} material={materials.sigil} position={[0, 0.45, 0]} />
        </group>

        {/* Magic glow */}
        <pointLight
          ref={magicLightRef}
          color={magicColor}
          intensity={2}
          distance={8}
          position={[0, 0, 0.7]}
        />
      </group>

      {/* Dust particles */}
      {Array.from({ length: MAX_DUST }).map((_, i) => (
        <mesh
          key={`dust-${i}`}
          ref={el => { dustMeshRefs.current[i] = el; }}
          geometry={dustGeo}
          material={materials.dust.clone()}
          visible={false}
          position={[0, 0.1, 0]}
        />
      ))}

      {/* Ground glow */}
      <pointLight
        position={[0, 0.2, 0]}
        color={magicColor}
        intensity={0.8}
        distance={3}
        decay={2}
      />
    </group>
  );
}

export default LowPolyBrick;
