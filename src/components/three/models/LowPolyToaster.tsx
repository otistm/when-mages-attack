import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ---------- shared geometry (created once, reused across instances) ----------
const bodyGeo = new THREE.BoxGeometry(2, 1.4, 1.2);
const baseGeo = new THREE.BoxGeometry(2.2, 0.18, 1.35);
const footGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.1, 6);
const slotGeo = new THREE.BoxGeometry(1.2, 0.12, 0.25);
const leverRailGeo = new THREE.BoxGeometry(0.1, 0.8, 0.1);
const leverStemGeo = new THREE.BoxGeometry(0.2, 0.05, 0.05);
const leverKnobGeo = new THREE.BoxGeometry(0.15, 0.15, 0.3);
const accentGeo = new THREE.BoxGeometry(2.04, 0.12, 1.24);
const dialGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.06, 8);
const toastGeo = new THREE.BoxGeometry(0.8, 0.8, 0.08);
const crustTopGeo = new THREE.BoxGeometry(0.8, 0.1, 0.08);
const crustBottomGeo = new THREE.BoxGeometry(0.8, 0.05, 0.08);
const crustSideGeo = new THREE.BoxGeometry(0.05, 0.9, 0.08);
const flameGeo = (() => {
  const g = new THREE.ConeGeometry(0.3, 0.8, 3);
  g.translate(0, 0.4, 0);
  return g;
})();

const BASE_SCALE = 1.5;

// Lever Y range: 0.3 (up/idle) to -0.3 (fully pushed down)
const LEVER_UP = 0.3;
const LEVER_DOWN = -0.3;

// Toast resting position – crusts hidden inside the body, but close enough to pop visibly
const TOAST_SLOT_Y = 0.95;

// ---------- foot positions ----------
const FOOT_POSITIONS: [number, number, number][] = [
  [-0.9, 0, -0.5],
  [0.9, 0, -0.5],
  [-0.9, 0, 0.5],
  [0.9, 0, 0.5],
];

// ---------- flame pool ----------
const MAX_FLAMES = 32;

interface FlameParticle {
  active: boolean;
  life: number;
  speed: number;
  x: number;
  z: number;
}

interface LowPolyToasterProps {
  team: 'player' | 'enemy';
  isInfernal?: boolean;
  isReady?: boolean;
  cooldownProgress?: number;
  isDamaged?: boolean;
}

export function LowPolyToaster({
  team,
  isInfernal = false,
  isReady = false,
  cooldownProgress = 0,
  isDamaged = false,
}: LowPolyToasterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leverHandleRef = useRef<THREE.Group>(null);
  const toast1Ref = useRef<THREE.Group>(null);
  const toast2Ref = useRef<THREE.Group>(null);
  const flameMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const damageFlashRef = useRef(0);

  const flamePool = useRef<FlameParticle[]>(
    Array.from({ length: MAX_FLAMES }, () => ({
      active: false,
      life: 0,
      speed: 0,
      x: 0,
      z: 0,
    }))
  );

  const isPlayer = team === 'player';
  const teamColor = isPlayer ? '#4ade80' : '#f87171';
  const teamHex = isPlayer ? 0x4ade80 : 0xf87171;

  const materials = useMemo(() => {
    const flameBaseColor = isInfernal ? 0xffaa00 : 0x9ca3af;
    return {
      metal: new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        roughness: 0.3,
        metalness: 0.7,
        flatShading: true,
      }),
      darkMetal: new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.7,
        metalness: 0.4,
        flatShading: true,
      }),
      plastic: new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.2,
        metalness: 0.0,
        flatShading: true,
      }),
      slotInterior: new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.9,
        metalness: 0.1,
        flatShading: true,
      }),
      accent: new THREE.MeshStandardMaterial({
        color: teamHex,
        roughness: 0.5,
        metalness: 0.3,
        emissive: teamHex,
        emissiveIntensity: 0.3,
        flatShading: true,
      }),
      dial: new THREE.MeshStandardMaterial({
        color: 0xff5722,
        roughness: 0.4,
        metalness: 0.2,
        emissive: 0xff5722,
        emissiveIntensity: 0.15,
        flatShading: true,
      }),
      toastRaw: new THREE.MeshStandardMaterial({
        color: 0xdeb887,
        roughness: 1.0,
        metalness: 0.0,
        flatShading: true,
      }),
      crustRaw: new THREE.MeshStandardMaterial({
        color: 0x8b4513,
        roughness: 1.0,
        metalness: 0.0,
        flatShading: true,
      }),
      toastBurnt: new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.9,
        metalness: 0.0,
        flatShading: true,
      }),
      crustBurnt: new THREE.MeshStandardMaterial({
        color: 0x000000,
        roughness: 0.9,
        metalness: 0.0,
        flatShading: true,
      }),
      flame: new THREE.MeshBasicMaterial({
        color: flameBaseColor,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    };
  }, [teamHex, isInfernal]);

  const fireAnimRef = useRef(0);
  const prevIsReady = useRef(false);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const group = groupRef.current;
    if (!group) return;

    // --- Detect fire event (rising edge of isReady) ---
    if (isReady && !prevIsReady.current) {
      fireAnimRef.current = 1.0;
    }
    prevIsReady.current = isReady;

    // --- Idle breathing ---
    const breath = Math.sin(t * 2.5) * 0.015;
    const bx = BASE_SCALE * (1 + breath);
    const by = BASE_SCALE * (1 - breath * 0.5);
    const bz = BASE_SCALE * (1 + breath);
    group.scale.set(bx, by, bz);

    // --- Lever animation (matches doc: pushes down during cooldown, snaps up on fire) ---
    const lever = leverHandleRef.current;
    if (lever) {
      let leverTarget: number;
      if (fireAnimRef.current > 0) {
        leverTarget = LEVER_UP;
      } else if (cooldownProgress > 0) {
        leverTarget = LEVER_UP - cooldownProgress * (LEVER_UP - LEVER_DOWN);
      } else {
        leverTarget = LEVER_UP;
      }

      if (fireAnimRef.current > 0.8) {
        lever.position.y = LEVER_UP;
      } else {
        lever.position.y += (leverTarget - lever.position.y) * Math.min(1, 8 * delta);
      }
    }

    // --- Toast animation (matches doc: sinks with lever, pops on fire) ---
    const toastSinkAmount = cooldownProgress > 0 && fireAnimRef.current <= 0
      ? cooldownProgress * 0.3
      : 0;

    if (fireAnimRef.current > 0) {
      fireAnimRef.current -= delta * 1.8;
      if (fireAnimRef.current < 0) fireAnimRef.current = 0;

      const pop = Math.sin(fireAnimRef.current * Math.PI) * 2.0;
      if (toast1Ref.current) toast1Ref.current.position.y = TOAST_SLOT_Y + pop;
      if (toast2Ref.current) toast2Ref.current.position.y = TOAST_SLOT_Y + pop;
    } else {
      if (toast1Ref.current) toast1Ref.current.position.y = TOAST_SLOT_Y - toastSinkAmount;
      if (toast2Ref.current) toast2Ref.current.position.y = TOAST_SLOT_Y - toastSinkAmount;
    }

    // --- Toast material: burn during cooking, raw otherwise ---
    const isCooking = cooldownProgress > 0.3 && fireAnimRef.current <= 0;
    [toast1Ref, toast2Ref].forEach(ref => {
      const toastGroup = ref.current;
      if (!toastGroup) return;
      toastGroup.children.forEach(child => {
        const mesh = child as THREE.Mesh;
        if (mesh.name === 'crumb') {
          mesh.material = isCooking ? materials.toastBurnt : materials.toastRaw;
        } else if (mesh.name === 'crust') {
          mesh.material = isCooking ? materials.crustBurnt : materials.crustRaw;
        }
      });
    });

    // --- Charging shake (matches doc: violent shake during cooking) ---
    if (cooldownProgress > 0.3 && fireAnimRef.current <= 0) {
      const intensity = Math.min((cooldownProgress - 0.3) / 0.7, 1);
      const shake = intensity * 0.15;
      group.position.x = (Math.random() - 0.5) * shake;
      group.position.z = (Math.random() - 0.5) * shake * 0.5;
    } else if (fireAnimRef.current <= 0) {
      group.position.x = 0;
      group.position.z = 0;
    }

    // --- Fire recoil ---
    if (fireAnimRef.current > 0) {
      const recoil = Math.sin(fireAnimRef.current * Math.PI) * 0.1;
      group.position.y = -recoil;
      group.position.x = 0;
      group.position.z = 0;
    } else if (cooldownProgress <= 0.3) {
      group.position.y = 0;
    }

    // --- Damage flash ---
    if (isDamaged && damageFlashRef.current <= 0) {
      damageFlashRef.current = 0.3;
    }
    if (damageFlashRef.current > 0) {
      damageFlashRef.current -= delta;
      const flash = Math.sin((damageFlashRef.current / 0.3) * Math.PI);
      const white = new THREE.Color(1, 1, 1);
      const base = new THREE.Color(0xcccccc);
      materials.metal.color.copy(base).lerp(white, flash * 0.8);
      materials.metal.emissiveIntensity = flash * 0.5;
      materials.metal.emissive.copy(white);
    } else {
      materials.metal.color.setHex(0xcccccc);
      materials.metal.emissiveIntensity = 0;
      materials.metal.emissive.setHex(0x000000);
    }

    // --- Flame particles (matches doc: fire during cooking + on launch) ---
    const pool = flamePool.current;
    const shouldSpawnFlames = fireAnimRef.current > 0 || cooldownProgress > 0.3;
    const spawnRate = fireAnimRef.current > 0 ? 1.0 : Math.min((cooldownProgress - 0.3) / 0.7, 1);

    if (shouldSpawnFlames && Math.random() < spawnRate) {
      const inactive = pool.find(p => !p.active);
      if (inactive) {
        inactive.active = true;
        inactive.life = 0.8;
        inactive.speed = 2 + Math.random() * 3;
        inactive.x = (Math.random() - 0.5) * 1.4;
        inactive.z = (Math.random() > 0.5 ? 0.25 : -0.25) + (Math.random() - 0.5) * 0.2;
      }
    }

    for (let i = 0; i < MAX_FLAMES; i++) {
      const p = pool[i];
      const mesh = flameMeshRefs.current[i];
      if (!mesh) continue;

      if (!p.active) {
        mesh.visible = false;
        continue;
      }

      p.life -= delta * 2.0;
      if (p.life <= 0) {
        p.active = false;
        mesh.visible = false;
        continue;
      }

      mesh.visible = true;
      mesh.position.set(p.x, 1.4 + (0.8 - p.life) * p.speed, p.z);
      mesh.rotation.y += delta * 4;
      mesh.scale.setScalar(Math.sin(p.life * Math.PI) * 1.5);
      (mesh.material as THREE.MeshBasicMaterial).opacity = p.life * 0.9;
    }
  });

  const yRotation = team === 'player' ? 0 : Math.PI;

  return (
    <group
      ref={groupRef}
      scale={BASE_SCALE}
      rotation={[0, yRotation, 0]}
    >
      {/* Body */}
      <mesh
        geometry={bodyGeo}
        material={materials.metal}
        position={[0, 0.7, 0]}
        castShadow
        receiveShadow
      />

      {/* Base plate */}
      <mesh
        geometry={baseGeo}
        material={materials.darkMetal}
        position={[0, 0.1, 0]}
        castShadow
      />

      {/* Feet */}
      {FOOT_POSITIONS.map((pos, i) => (
        <mesh
          key={`foot-${i}`}
          geometry={footGeo}
          material={materials.plastic}
          position={pos}
        />
      ))}

      {/* Bread slots (dark recesses on top) */}
      <mesh
        geometry={slotGeo}
        material={materials.slotInterior}
        position={[0, 1.42, -0.25]}
      />
      <mesh
        geometry={slotGeo}
        material={materials.slotInterior}
        position={[0, 1.42, 0.25]}
      />

      {/* Toast in slot 1 */}
      <group ref={toast1Ref} position={[0, TOAST_SLOT_Y, -0.25]}>
        <mesh geometry={toastGeo} material={materials.toastRaw} name="crumb" castShadow />
        <mesh geometry={crustTopGeo} material={materials.crustRaw} name="crust" position={[0, 0.45, 0]} />
        <mesh geometry={crustBottomGeo} material={materials.crustRaw} name="crust" position={[0, -0.425, 0]} />
        <mesh geometry={crustSideGeo} material={materials.crustRaw} name="crust" position={[-0.425, 0, 0]} />
        <mesh geometry={crustSideGeo} material={materials.crustRaw} name="crust" position={[0.425, 0, 0]} />
      </group>

      {/* Toast in slot 2 */}
      <group ref={toast2Ref} position={[0, TOAST_SLOT_Y, 0.25]}>
        <mesh geometry={toastGeo} material={materials.toastRaw} name="crumb" castShadow />
        <mesh geometry={crustTopGeo} material={materials.crustRaw} name="crust" position={[0, 0.45, 0]} />
        <mesh geometry={crustBottomGeo} material={materials.crustRaw} name="crust" position={[0, -0.425, 0]} />
        <mesh geometry={crustSideGeo} material={materials.crustRaw} name="crust" position={[-0.425, 0, 0]} />
        <mesh geometry={crustSideGeo} material={materials.crustRaw} name="crust" position={[0.425, 0, 0]} />
      </group>

      {/* Lever assembly (matches doc: rail + handle on side) */}
      <group position={[1.05, 0.8, 0]}>
        <mesh
          geometry={leverRailGeo}
          material={materials.darkMetal}
          position={[-0.04, 0, 0]}
        />
        <group ref={leverHandleRef} position={[0, LEVER_UP, 0]}>
          <mesh geometry={leverStemGeo} material={materials.metal} />
          <mesh
            geometry={leverKnobGeo}
            material={materials.plastic}
            position={[0.15, 0, 0]}
          />
        </group>
      </group>

      {/* Team accent stripe */}
      <mesh
        geometry={accentGeo}
        material={materials.accent}
        position={[0, 0.28, 0]}
      />

      {/* Dial on the front */}
      <mesh
        geometry={dialGeo}
        material={materials.dial}
        position={[-0.7, 0.5, 0.63]}
        rotation={[Math.PI / 2, 0, 0]}
      />

      {/* Flame particles */}
      {Array.from({ length: MAX_FLAMES }).map((_, i) => (
        <mesh
          key={`flame-${i}`}
          ref={el => { flameMeshRefs.current[i] = el; }}
          geometry={flameGeo}
          material={materials.flame}
          visible={false}
        />
      ))}

      {/* Ambient glow underneath */}
      <pointLight
        position={[0, 0.3, 0]}
        color={teamColor}
        intensity={1.5}
        distance={3}
        decay={2}
      />
    </group>
  );
}

export default LowPolyToaster;
