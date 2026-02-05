/**
 * ARCHIVED: TerritoryGrid - Flat colored grid for territory control
 * 
 * This implementation is archived for potential future use.
 * Originally used for a territory-control gameplay mechanic where
 * projectiles damaged individual grid squares.
 * 
 * Layout: 20 columns x 10 rows per side = 200 squares per side (400 total)
 * Flat design with color indicating HP and status
 * Clear divider line between player and enemy sides
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGridStore } from './gridStore';

// Grid configuration - must match gridStore
const GRID_COLS = 20;
const GRID_ROWS = 10;
const ARENA_WIDTH = 20;
const ARENA_HALF_LENGTH = 8;
const SQUARE_GAP = 0.05;
const SQUARE_HEIGHT = 0.02; // Very thin - essentially flat

// HP-based color gradients
// Player: Bright green → Yellow → Orange as HP decreases
// Enemy: Bright red → Orange → Yellow as HP decreases
function getPlayerColor(hpRatio: number): THREE.Color {
  if (hpRatio > 0.7) {
    // Full HP: Bright green
    return new THREE.Color('#4ade80');
  } else if (hpRatio > 0.4) {
    // Medium HP: Yellow-green
    const t = (hpRatio - 0.4) / 0.3;
    return new THREE.Color('#4ade80').lerp(new THREE.Color('#facc15'), 1 - t);
  } else if (hpRatio > 0) {
    // Low HP: Orange
    const t = hpRatio / 0.4;
    return new THREE.Color('#facc15').lerp(new THREE.Color('#f97316'), 1 - t);
  }
  return new THREE.Color('#1e1e2e'); // Dead: Dark
}

function getEnemyColor(hpRatio: number): THREE.Color {
  if (hpRatio > 0.7) {
    // Full HP: Bright red
    return new THREE.Color('#f87171');
  } else if (hpRatio > 0.4) {
    // Medium HP: Orange-red
    const t = (hpRatio - 0.4) / 0.3;
    return new THREE.Color('#f87171').lerp(new THREE.Color('#fb923c'), 1 - t);
  } else if (hpRatio > 0) {
    // Low HP: Yellow-orange
    const t = hpRatio / 0.4;
    return new THREE.Color('#fb923c').lerp(new THREE.Color('#fbbf24'), 1 - t);
  }
  return new THREE.Color('#1e1e2e'); // Dead: Dark
}

// Status effect colors
const BURN_COLOR = new THREE.Color('#ff6b3d');
const FREEZE_COLOR = new THREE.Color('#67e8f9');
const POISON_COLOR = new THREE.Color('#a3e635');

interface TerritoryGridProps {
  side: 'player' | 'enemy';
}

function TerritoryGridSide({ side }: TerritoryGridProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const squares = useGridStore((state) => 
    side === 'player' ? state.playerSquares : state.enemySquares
  );
  
  // Calculate square dimensions
  const squareDimensions = useMemo(() => {
    const squareWidth = (ARENA_WIDTH - (GRID_COLS + 1) * SQUARE_GAP) / GRID_COLS;
    const squareDepth = (ARENA_HALF_LENGTH - (GRID_ROWS + 1) * SQUARE_GAP) / GRID_ROWS;
    return { width: squareWidth, depth: squareDepth };
  }, []);
  
  // Temp objects for matrix calculations
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const tempPosition = useMemo(() => new THREE.Vector3(), []);
  const tempScale = useMemo(() => new THREE.Vector3(), []);
  const tempQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const instanceCount = GRID_COLS * GRID_ROWS;
  
  // Initialize instance matrices on mount
  useEffect(() => {
    if (!meshRef.current || squares.length === 0) return;

    // Ensure instanceColor exists for per-instance vertex colors.
    if (!meshRef.current.instanceColor) {
      meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(instanceCount * 3),
        3
      );
      meshRef.current.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }
    
    // Initialize all matrices - flat squares
    squares.forEach((sq, index) => {
      tempPosition.set(sq.position.x, SQUARE_HEIGHT / 2, sq.position.z);
      tempScale.set(squareDimensions.width, SQUARE_HEIGHT, squareDimensions.depth);
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
      meshRef.current!.setMatrixAt(index, tempMatrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [squares.length, squareDimensions, tempMatrix, tempPosition, tempScale, tempQuaternion, instanceCount]);

  const animatedIndices = useMemo(() => {
    // Only burn needs per-frame animation right now (flicker).
    const indices: number[] = [];
    for (let i = 0; i < squares.length; i++) {
      if (squares[i]?.isActive && squares[i]!.statusEffects.includes('burn')) indices.push(i);
    }
    return indices;
  }, [squares]);

  // Update static colors when squares change (HP/status updates)
  useEffect(() => {
    if (!meshRef.current || squares.length === 0) return;

    if (!meshRef.current.instanceColor) {
      meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(instanceCount * 3),
        3
      );
      meshRef.current.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }

    squares.forEach((sq, index) => {
      const hpRatio = sq.maxHp > 0 ? sq.hp / sq.maxHp : 0;

      if (!sq.isActive) {
        tempColor.setHex(0x1a1a2e);
      } else if (sq.statusEffects.includes('freeze')) {
        tempColor.copy(FREEZE_COLOR);
      } else if (sq.statusEffects.includes('poison')) {
        tempColor.copy(POISON_COLOR);
      } else if (sq.statusEffects.includes('burn')) {
        // Burn flickers per-frame; seed with base burn color here.
        tempColor.copy(BURN_COLOR);
      } else {
        const baseColor = side === 'player'
          ? getPlayerColor(hpRatio)
          : getEnemyColor(hpRatio);
        tempColor.copy(baseColor);
      }

      meshRef.current!.setColorAt(index, tempColor);
    });

    meshRef.current.instanceColor.needsUpdate = true;
  }, [squares, side, tempColor, instanceCount]);

  // Animate burn flicker only (keeps per-frame work small)
  useFrame((state) => {
    if (!meshRef.current || animatedIndices.length === 0) return;
    if (!meshRef.current.instanceColor) return;

    const time = state.clock.elapsedTime;

    animatedIndices.forEach((index) => {
      const flicker = Math.sin(time * 10 + index * 0.5) * 0.2 + 0.8;
      tempColor.copy(BURN_COLOR).multiplyScalar(flicker);
      meshRef.current!.setColorAt(index, tempColor);
    });

    meshRef.current.instanceColor.needsUpdate = true;
  });
  
  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, GRID_COLS * GRID_ROWS]}
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial vertexColors toneMapped={false} fog={false} />
    </instancedMesh>
  );
}

/**
 * Center divider line between player and enemy territories
 */
function DividerLine() {
  return (
    <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[ARENA_WIDTH + 2, 0.15]} />
      <meshBasicMaterial color="#ffffff" opacity={0.8} transparent fog={false} />
    </mesh>
  );
}

export function TerritoryGrid() {
  const initializeGrid = useGridStore((state) => state.initializeGrid);
  const playerSquares = useGridStore((state) => state.playerSquares);
  const enemySquares = useGridStore((state) => state.enemySquares);
  
  // Initialize grid on mount
  useEffect(() => {
    // Guard against stale dev/HMR state where one side is empty or already depleted.
    if (playerSquares.length === 0 || enemySquares.length === 0) {
      initializeGrid();
    }
  }, [initializeGrid, playerSquares.length, enemySquares.length]);

  return (
    <group>
      {/* Divider line in center */}
      <DividerLine />
      
      {/* Player territory (positive Z) */}
      <TerritoryGridSide side="player" />
      
      {/* Enemy territory (negative Z) */}
      <TerritoryGridSide side="enemy" />
    </group>
  );
}

export default TerritoryGrid;
