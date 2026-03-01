import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createToonMaterial } from '@/shaders/ToonMaterials';

// ---------- shared geometry (created once, reused across instances) ----------
const rimGeo = new THREE.TorusGeometry(1.5, 0.2, 6, 16);
const lensGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.1, 16);
const connectorGeo = new THREE.BoxGeometry(0.4, 0.2, 0.6);
const handleGeo = new THREE.CylinderGeometry(0.2, 0.25, 2.5, 6);
const handleCapGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.15, 6);

const incomingBeamGeo = (() => {
  const g = new THREE.CylinderGeometry(1.4, 1.4, 20, 16, 1, true);
  g.translate(0, 10, 0);
  return g;
})();

const laserConeGeo = (() => {
  const g = new THREE.CylinderGeometry(1.3, 0.02, 5, 16, 1, true);
  g.translate(0, -2.5, 0);
  return g;
})();

const hitGlowGeo = new THREE.SphereGeometry(0.6, 8, 8);
const sparkGeo = new THREE.TetrahedronGeometry(0.05);
const burnGeo = new THREE.PlaneGeometry(1.5, 1.5);

const BASE_SCALE = 1.5;
const FLOAT_HEIGHT = 2.8;
const MAX_SPARKS = 24;

interface SparkParticle {
  active: boolean;
  life: number;
  vx: number;
  vy: number;
  vz: number;
  x: number;
  y: number;
  z: number;
}

interface LowPolyMagnifyingGlassProps {
  team: 'player' | 'enemy';
  isReady?: boolean;
  cooldownProgress?: number;
  isDamaged?: boolean;
}

export function LowPolyMagnifyingGlass({
  team,
  isReady = false,
  cooldownProgress = 0,
  isDamaged = false,
}: LowPolyMagnifyingGlassProps) {
  const groupRef = useRef<THREE.Group>(null);
  const magRef = useRef<THREE.Group>(null);
  const beamPassiveRef = useRef<THREE.Mesh>(null);
  const beamActiveRef = useRef<THREE.Mesh>(null);
  const laserGlowRef = useRef<THREE.Mesh>(null);
  const laserCoreRef = useRef<THREE.Mesh>(null);
  const hitGlowRef = useRef<THREE.Mesh>(null);
  const hitCoreRef = useRef<THREE.Mesh>(null);
  const burnRef = useRef<THREE.Mesh>(null);
  const lensRef = useRef<THREE.Mesh>(null);
  const sparkMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const damageFlashRef = useRef(0);
  const fireAnimRef = useRef(0);
  const prevIsReady = useRef(false);

  const sparkPool = useRef<SparkParticle[]>(
    Array.from({ length: MAX_SPARKS }, () => ({
      active: false,
      life: 0,
      vx: 0, vy: 0, vz: 0,
      x: 0, y: 0, z: 0,
    }))
  );

  const isPlayer = team === 'player';
  const teamColor = isPlayer ? '#4ade80' : '#f87171';

  const materials = useMemo(() => ({
    brass: createToonMaterial({ color: '#c59b27', bands: 3 }),
    brassDark: createToonMaterial({ color: '#8a6a1c', bands: 3 }),
    glass: new THREE.MeshToonMaterial({
      color: new THREE.Color('#d0f0ff'),
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    }),
    accent: createToonMaterial({
      color: teamColor,
      bands: 3,
      emissive: teamColor,
      emissiveIntensity: 0.3,
    }),
    beamPassive: new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    beamActive: new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    laserGlow: new THREE.MeshBasicMaterial({
      color: 0xff5500,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    laserCore: new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    burn: new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
    spark: new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    }),
  }), [teamColor]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const group = groupRef.current;
    const mag = magRef.current;
    if (!group || !mag) return;

    // --- Detect fire event (rising edge of isReady) ---
    if (isReady && !prevIsReady.current) {
      fireAnimRef.current = 1.0;
    }
    prevIsReady.current = isReady;

    // --- Floating bob + sway ---
    mag.position.y = FLOAT_HEIGHT + Math.sin(t * 1.5) * 0.15;
    mag.rotation.x = Math.sin(t * 0.8) * 0.06;
    mag.rotation.z = Math.cos(t * 1.1) * 0.06;

    // --- Idle breathing scale ---
    const breath = Math.sin(t * 2.5) * 0.01;
    group.scale.set(
      BASE_SCALE * (1 + breath),
      BASE_SCALE * (1 - breath * 0.5),
      BASE_SCALE * (1 + breath),
    );

    // --- Passive beam (always faintly visible) ---
    if (beamPassiveRef.current) {
      beamPassiveRef.current.material = materials.beamPassive;
      materials.beamPassive.opacity = 0.04 + Math.sin(t * 3) * 0.02;
    }

    // --- Charging phase ---
    const isCharging = cooldownProgress > 0.3 && fireAnimRef.current <= 0;
    if (isCharging) {
      const intensity = Math.min((cooldownProgress - 0.3) / 0.7, 1);
      materials.beamActive.opacity = intensity * 0.35;

      // Lens glow
      if (lensRef.current) {
        (lensRef.current.material as THREE.MeshToonMaterial).emissive =
          new THREE.Color(0xffd700);
        (lensRef.current.material as THREE.MeshToonMaterial).emissiveIntensity =
          intensity * 0.6;
      }

      // Subtle vibration
      const shake = intensity * 0.08;
      mag.position.x = (Math.random() - 0.5) * shake;
      mag.position.z = (Math.random() - 0.5) * shake * 0.5;
    } else if (fireAnimRef.current <= 0) {
      materials.beamActive.opacity = 0;
      mag.position.x = 0;
      mag.position.z = 0;

      if (lensRef.current) {
        (lensRef.current.material as THREE.MeshToonMaterial).emissiveIntensity = 0;
      }
    }

    // --- Firing animation ---
    if (fireAnimRef.current > 0) {
      fireAnimRef.current -= delta * 1.5;
      if (fireAnimRef.current < 0) fireAnimRef.current = 0;

      const flicker = 0.8 + Math.random() * 0.2;
      materials.beamActive.opacity = 0.5 * flicker;
      materials.laserGlow.opacity = 0.9 * flicker;
      materials.laserCore.opacity = 1.0 * flicker;

      if (hitGlowRef.current) {
        hitGlowRef.current.scale.setScalar(1 + Math.random() * 0.5);
      }
      if (hitCoreRef.current) {
        hitCoreRef.current.scale.setScalar(1 + Math.random() * 0.2);
      }

      // Burn mark fades in
      if (burnRef.current) {
        materials.burn.opacity = Math.min(materials.burn.opacity + delta * 3, 0.7);
      }

      // Lens glow during fire
      if (lensRef.current) {
        (lensRef.current.material as THREE.MeshToonMaterial).emissive =
          new THREE.Color(0xffd700);
        (lensRef.current.material as THREE.MeshToonMaterial).emissiveIntensity =
          flicker * 0.8;
      }

      // Recoil
      mag.position.x = (Math.random() - 0.5) * 0.05;
      mag.position.z = (Math.random() - 0.5) * 0.05;

      // Spawn sparks at ground hit point
      if (Math.random() > 0.3) {
        const inactive = sparkPool.current.find(p => !p.active);
        if (inactive) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 0.1 + Math.random() * 0.2;
          inactive.active = true;
          inactive.life = 1.0;
          inactive.x = 0;
          inactive.y = 0;
          inactive.z = 0;
          inactive.vx = Math.cos(angle) * speed;
          inactive.vy = 0.2 + Math.random() * 0.3;
          inactive.vz = Math.sin(angle) * speed;
        }
      }
    } else {
      materials.laserGlow.opacity = 0;
      materials.laserCore.opacity = 0;

      if (hitGlowRef.current) hitGlowRef.current.scale.setScalar(0.01);
      if (hitCoreRef.current) hitCoreRef.current.scale.setScalar(0.01);

      // Burn fades out
      if (burnRef.current && materials.burn.opacity > 0) {
        materials.burn.opacity = Math.max(materials.burn.opacity - delta * 0.3, 0);
      }
    }

    // --- Damage flash ---
    if (isDamaged && damageFlashRef.current <= 0) {
      damageFlashRef.current = 0.3;
    }
    if (damageFlashRef.current > 0) {
      damageFlashRef.current -= delta;
      const flash = Math.sin((damageFlashRef.current / 0.3) * Math.PI);
      const white = new THREE.Color(1, 1, 1);
      const base = new THREE.Color(0xc59b27);
      materials.brass.color.copy(base).lerp(white, flash * 0.8);
      materials.brass.emissiveIntensity = flash * 0.5;
      materials.brass.emissive.copy(white);
    } else {
      materials.brass.color.setHex(0xc59b27);
      materials.brass.emissiveIntensity = 0;
      materials.brass.emissive.setHex(0x000000);
    }

    // --- Spark particles ---
    const pool = sparkPool.current;
    for (let i = 0; i < MAX_SPARKS; i++) {
      const p = pool[i];
      const mesh = sparkMeshRefs.current[i];
      if (!mesh) continue;

      if (!p.active) {
        mesh.visible = false;
        continue;
      }

      p.life -= delta;
      if (p.life <= 0) {
        p.active = false;
        mesh.visible = false;
        continue;
      }

      p.vy -= 9.8 * delta * 0.5;
      p.x += p.vx * delta * 60;
      p.y += p.vy * delta * 60;
      p.z += p.vz * delta * 60;

      if (p.y < 0) {
        p.y = 0;
        p.vy *= -0.5;
      }

      mesh.visible = true;
      mesh.position.set(p.x, p.y, p.z);
      mesh.rotation.y += delta * 6;
      mesh.scale.setScalar(p.life);
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
      {/* Floating magnifying glass assembly */}
      <group ref={magRef} position={[0, FLOAT_HEIGHT, 0]}>
        {/* Lens rim (torus) — laid flat */}
        <mesh
          geometry={rimGeo}
          material={materials.brass}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        />

        {/* Glass lens (disc) */}
        <mesh
          ref={lensRef}
          geometry={lensGeo}
          material={materials.glass}
          castShadow
        />

        {/* Handle connector */}
        <mesh
          geometry={connectorGeo}
          material={materials.brassDark}
          position={[0, 0, 1.7]}
          castShadow
        />

        {/* Handle */}
        <mesh
          geometry={handleGeo}
          material={materials.brass}
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, 0, 3.1]}
          castShadow
        />

        {/* Handle end cap */}
        <mesh
          geometry={handleCapGeo}
          material={materials.brassDark}
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, 0, 4.4]}
        />

        {/* Team accent ring on rim */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.55, 0.06, 4, 16]} />
          <primitive object={materials.accent} attach="material" />
        </mesh>

        {/* Incoming beam (passive light column from above) */}
        <mesh ref={beamPassiveRef} material={materials.beamPassive}>
          <primitive object={incomingBeamGeo} attach="geometry" />
        </mesh>

        {/* Active beam (brightens during charging/firing) */}
        <mesh ref={beamActiveRef} material={materials.beamActive}>
          <primitive object={incomingBeamGeo} attach="geometry" />
        </mesh>

        {/* Laser glow cone (visible during fire) */}
        <mesh ref={laserGlowRef} material={materials.laserGlow}>
          <primitive object={laserConeGeo} attach="geometry" />
        </mesh>

        {/* Laser core (narrower, brighter) */}
        <mesh ref={laserCoreRef} material={materials.laserCore} scale={[0.6, 1, 0.6]}>
          <primitive object={laserConeGeo} attach="geometry" />
        </mesh>
      </group>

      {/* Ground effects (positioned at y=0) */}
      {/* Hit glow */}
      <mesh ref={hitGlowRef} geometry={hitGlowGeo} material={materials.laserGlow} position={[0, 0.1, 0]} scale={0.01} />
      <mesh ref={hitCoreRef} geometry={hitGlowGeo} material={materials.laserCore} position={[0, 0.1, 0]} scale={0.01} />

      {/* Burn mark on ground */}
      <mesh
        ref={burnRef}
        geometry={burnGeo}
        material={materials.burn}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
      />

      {/* Spark particles (positioned at ground level) */}
      {Array.from({ length: MAX_SPARKS }).map((_, i) => (
        <mesh
          key={`spark-${i}`}
          ref={el => { sparkMeshRefs.current[i] = el; }}
          geometry={sparkGeo}
          material={materials.spark}
          visible={false}
        />
      ))}

      {/* Ambient glow underneath */}
      <pointLight
        position={[0, 0.5, 0]}
        color={teamColor}
        intensity={1.5}
        distance={4}
        decay={2}
      />

      {/* Lens light (visible during charging/firing) */}
      <pointLight
        position={[0, FLOAT_HEIGHT, 0]}
        color="#ffd700"
        intensity={0.5}
        distance={5}
        decay={2}
      />
    </group>
  );
}

export default LowPolyMagnifyingGlass;
