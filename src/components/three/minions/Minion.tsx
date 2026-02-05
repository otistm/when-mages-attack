/**
 * Minion Component - Individual combat unit with AI behavior
 * 
 * Behavior:
 * - Spawns at card position
 * - Finds closest enemy minion or HP bar
 * - Moves toward target, accelerating as it approaches
 * - Rotates to face target
 * - Attacks when in range
 */

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, CuboidCollider } from '@react-three/rapier';
import { useSpring, animated } from '@react-spring/three';
import { Sphere, Cylinder } from '@react-three/drei';
import * as THREE from 'three';

import { ARENA } from '@/types';
import { useCombatStore, CombatMinion } from '@/stores/combatStore';
import { useGameStore } from '@/stores/gameStore';
import { useDamageStore } from '@/stores/damageStore';

interface MinionProps {
  data: CombatMinion;
}

export function Minion({ data }: MinionProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const meshRef = useRef<THREE.Group>(null);
  const lastAttackTimeRef = useRef(0);
  
  const updateMinion = useCombatStore((state) => state.updateMinion);
  const damageMinion = useCombatStore((state) => state.damageMinion);
  const getClosestEnemy = useCombatStore((state) => state.getClosestEnemy);
  const hasEnemyMinions = useCombatStore((state) => state.hasEnemyMinions);
  
  const damageEnemy = useGameStore((state) => state.dealDamageToEnemy);
  const damagePlayer = useGameStore((state) => state.dealDamageToPlayer);
  const addCameraTrauma = useGameStore((state) => state.addCameraTrauma);
  
  const addDamageEvent = useDamageStore((state) => state.addDamageEvent);
  
  // Spawn animation
  const [spawnSpring, spawnApi] = useSpring(() => ({
    scale: 0,
    config: { tension: 300, friction: 10 },
  }));
  
  // Trigger spawn animation
  useEffect(() => {
    spawnApi.start({ scale: 1 });
  }, [spawnApi]);
  
  // Handle death animation
  useEffect(() => {
    if (data.state === 'dying') {
      spawnApi.start({ 
        scale: 0,
        config: { tension: 200, friction: 20 },
      });
    }
  }, [data.state, spawnApi]);
  
  // Temp vectors for calculations
  const tempVec = useMemo(() => new THREE.Vector3(), []);
  const targetVec = useMemo(() => new THREE.Vector3(), []);
  
  // Movement and combat logic
  useFrame((state, delta) => {
    if (!rigidBodyRef.current) return;
    if (data.state === 'dead' || data.state === 'dying' || data.state === 'spawning') return;
    
    const position = rigidBodyRef.current.translation();
    const currentPos: [number, number, number] = [position.x, position.y, position.z];
    
    // Update position in store
    updateMinion(data.id, { position: currentPos });
    
    // Find target - enemy minion first, then HP bar
    const enemyMinion = getClosestEnemy(currentPos, data.team);
    
    let targetPosition: [number, number, number];
    let isTargetingMinion = false;
    
    if (enemyMinion) {
      // Target enemy minion
      targetPosition = enemyMinion.position;
      isTargetingMinion = true;
    } else {
      // Target HP bar - move to opposite edge
      const targetZ = data.team === 'player' ? ARENA.combatZoneStart : ARENA.combatZoneEnd;
      targetPosition = [currentPos[0], 0.5, targetZ];
    }
    
    // Calculate distance to target (XZ plane)
    const dx = targetPosition[0] - currentPos[0];
    const dz = targetPosition[2] - currentPos[2];
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Calculate rotation to face target
    const targetRotation = Math.atan2(dx, dz);
    
    // Smoothly rotate toward target
    let currentRotation = data.rotation;
    const rotationDiff = targetRotation - currentRotation;
    
    // Normalize rotation difference
    let normalizedDiff = rotationDiff;
    while (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2;
    while (normalizedDiff < -Math.PI) normalizedDiff += Math.PI * 2;
    
    const rotationSpeed = 8;
    currentRotation += normalizedDiff * Math.min(1, rotationSpeed * delta);
    updateMinion(data.id, { rotation: currentRotation });
    
    // Apply rotation to mesh
    if (meshRef.current) {
      meshRef.current.rotation.y = currentRotation;
    }
    
    const attackRange = data.attackRange;
    const speed = data.speed;
    
    if (distance <= attackRange) {
      // In range - attack!
      const now = state.clock.elapsedTime;
      const timeSinceAttack = now - lastAttackTimeRef.current;
      
      if (timeSinceAttack >= data.attackCooldown) {
        lastAttackTimeRef.current = now;
        
        if (isTargetingMinion && enemyMinion) {
          // Attack enemy minion
          damageMinion(enemyMinion.id, data.stats.attack);
          
          // Visual feedback
          addDamageEvent(data.stats.attack, enemyMinion.team, enemyMinion.position);
          addCameraTrauma(0.03);
        } else {
          // Attack HP bar
          const targetTeam = data.team === 'player' ? 'enemy' : 'player';
          if (targetTeam === 'enemy') {
            damageEnemy(data.stats.attack);
          } else {
            damagePlayer(data.stats.attack);
          }
          
          // Visual feedback
          addDamageEvent(data.stats.attack, targetTeam, targetPosition);
          addCameraTrauma(0.05);
        }
        
        updateMinion(data.id, { state: 'attacking' });
      }
    } else {
      // Move toward target
      if (data.state !== 'moving') {
        updateMinion(data.id, { state: 'moving' });
      }
      
      // Acceleration as minion gets closer (excitement!)
      const proximityBonus = Math.max(0, 1 - distance / 10) * 0.5;
      const currentSpeed = speed * (1 + proximityBonus);
      
      // Normalize direction
      const dirX = dx / distance;
      const dirZ = dz / distance;
      
      // Apply velocity
      const velocity = rigidBodyRef.current.linvel();
      rigidBodyRef.current.setLinvel(
        { 
          x: dirX * currentSpeed, 
          y: velocity.y, 
          z: dirZ * currentSpeed 
        },
        true
      );
    }
  });
  
  const healthPercent = data.currentHp / data.stats.hp;
  const isPlayer = data.team === 'player';
  
  return (
    <RigidBody
      ref={rigidBodyRef}
      position={data.position}
      type="dynamic"
      colliders={false}
      mass={1}
      linearDamping={3}
      angularDamping={5}
      lockRotations
    >
      <CuboidCollider args={[0.4, 0.5, 0.4]} />
      
      <animated.group ref={meshRef} scale={spawnSpring.scale} renderOrder={10}>
        {/* Body */}
        <Cylinder args={[0.3, 0.4, 1, 8]} position={[0, 0.5, 0]} castShadow>
          <meshStandardMaterial
            color={data.color}
            roughness={0.6}
            metalness={0.3}
            emissive={data.color}
            emissiveIntensity={0.15}
          />
        </Cylinder>
        
        {/* Head */}
        <Sphere args={[0.25, 16, 16]} position={[0, 1.1, 0]} castShadow>
          <meshStandardMaterial
            color={data.color}
            roughness={0.6}
            metalness={0.3}
            emissive={data.color}
            emissiveIntensity={0.2}
          />
        </Sphere>
        
        {/* Eyes (indicating team and facing direction) */}
        <Sphere args={[0.08, 8, 8]} position={[0.1, 1.15, 0.2]}>
          <meshBasicMaterial color={isPlayer ? '#00ff88' : '#ff4444'} />
        </Sphere>
        <Sphere args={[0.08, 8, 8]} position={[-0.1, 1.15, 0.2]}>
          <meshBasicMaterial color={isPlayer ? '#00ff88' : '#ff4444'} />
        </Sphere>
        
        {/* Health bar (flat, visible from top-down) */}
        <group position={[0, 1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          {/* Background */}
          <mesh>
            <planeGeometry args={[0.8, 0.15]} />
            <meshBasicMaterial color="#000000" opacity={0.6} transparent />
          </mesh>
          {/* Health fill */}
          <mesh position={[(healthPercent - 1) * 0.4, 0, 0.01]}>
            <planeGeometry args={[0.78 * healthPercent, 0.12]} />
            <meshBasicMaterial color={isPlayer ? '#4ade80' : '#f87171'} />
          </mesh>
        </group>
      </animated.group>
    </RigidBody>
  );
}

export default Minion;
