/**
 * ARCHIVED: Grid Store - Manages the territory grid for both player and enemy sides
 * 
 * This implementation is archived for potential future use.
 * Originally used for territory-control gameplay where each side has 200 squares
 * (20x10 grid) with individual HP and status effects.
 * 
 * Total: 400 squares across both sides
 */

import { create } from 'zustand';
import { StatusEffectType } from '@/types';

export interface GridSquare {
  id: string;
  side: 'player' | 'enemy';
  row: number; // 0-9 (0 = closest to center/enemy)
  col: number; // 0-9
  hp: number;
  maxHp: number;
  isActive: boolean;
  statusEffects: StatusEffectType[];
  // 3D position (calculated from row/col)
  position: { x: number; z: number };
}

interface GridStore {
  playerSquares: GridSquare[];
  enemySquares: GridSquare[];
  
  // Actions
  initializeGrid: () => void;
  damageSquare: (squareId: string, damage: number) => void;
  healSquare: (squareId: string, amount: number) => void;
  applyStatusToSquare: (squareId: string, status: StatusEffectType) => void;
  removeStatusFromSquare: (squareId: string, status: StatusEffectType) => void;
  tickStatusEffects: (delta: number) => void;
  
  // Queries
  getSquare: (squareId: string) => GridSquare | undefined;
  getRandomActiveSquare: (side: 'player' | 'enemy') => GridSquare | undefined;
  getAdjacentSquares: (squareId: string) => GridSquare[];
  getSquareAtPosition: (side: 'player' | 'enemy', row: number, col: number) => GridSquare | undefined;
  
  // Game state
  isGameOver: () => { gameOver: boolean; winner: 'player' | 'enemy' | null };
  getActiveSquareCount: (side: 'player' | 'enemy') => number;
}

// Grid configuration - 20 columns x 10 rows per side = 200 squares per side
const GRID_COLS = 20;
const GRID_ROWS = 10;
const ARENA_WIDTH = 20; // Total arena width
const ARENA_HALF_LENGTH = 8; // Half the arena length (one side)
const SQUARE_GAP = 0.05; // Small gap between squares

// Calculate HP based on row (front rows = less HP, back rows = more HP)
function getMaxHpForRow(row: number): number {
  if (row < 2) return 5;   // Front rows (closest to enemy): 5 HP
  if (row < 5) return 10;  // Middle rows: 10 HP
  if (row < 8) return 15;  // Back-middle rows: 15 HP
  return 20;               // Back rows (near cards): 20 HP
}

// Calculate 3D position for a square
function calculatePosition(
  side: 'player' | 'enemy',
  row: number,
  col: number
): { x: number; z: number } {
  const squareWidth = (ARENA_WIDTH - (GRID_COLS + 1) * SQUARE_GAP) / GRID_COLS;
  const squareDepth = (ARENA_HALF_LENGTH - (GRID_ROWS + 1) * SQUARE_GAP) / GRID_ROWS;
  
  // X position: centered, columns go left to right
  const x = -ARENA_WIDTH / 2 + SQUARE_GAP + squareWidth / 2 + col * (squareWidth + SQUARE_GAP);
  
  // Z position: depends on side and row
  // Player side: positive Z (row 0 closest to center at ~0, row 9 furthest at positive Z)
  // Enemy side: negative Z (row 0 closest to center at ~0, row 9 furthest at negative Z)
  const rowOffset = SQUARE_GAP + squareDepth / 2 + row * (squareDepth + SQUARE_GAP);
  const z = side === 'player' ? rowOffset : -rowOffset;
  
  return { x, z };
}

// Create initial squares for one side
function createSquaresForSide(side: 'player' | 'enemy'): GridSquare[] {
  const squares: GridSquare[] = [];
  
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const maxHp = getMaxHpForRow(row);
      const position = calculatePosition(side, row, col);
      
      squares.push({
        id: `${side}-${row}-${col}`,
        side,
        row,
        col,
        hp: maxHp,
        maxHp,
        isActive: true,
        statusEffects: [],
        position,
      });
    }
  }
  
  return squares;
}

export const useGridStore = create<GridStore>((set, get) => ({
  playerSquares: [],
  enemySquares: [],
  
  initializeGrid: () => {
    set({
      playerSquares: createSquaresForSide('player'),
      enemySquares: createSquaresForSide('enemy'),
    });
  },
  
  damageSquare: (squareId, damage) => {
    set((state) => {
      const updateSquares = (squares: GridSquare[]) =>
        squares.map((sq) => {
          if (sq.id !== squareId) return sq;
          const newHp = Math.max(0, sq.hp - damage);
          return {
            ...sq,
            hp: newHp,
            isActive: newHp > 0,
          };
        });
      
      return {
        playerSquares: updateSquares(state.playerSquares),
        enemySquares: updateSquares(state.enemySquares),
      };
    });
  },
  
  healSquare: (squareId, amount) => {
    set((state) => {
      const updateSquares = (squares: GridSquare[]) =>
        squares.map((sq) => {
          if (sq.id !== squareId) return sq;
          const newHp = Math.min(sq.maxHp, sq.hp + amount);
          return {
            ...sq,
            hp: newHp,
            isActive: newHp > 0,
          };
        });
      
      return {
        playerSquares: updateSquares(state.playerSquares),
        enemySquares: updateSquares(state.enemySquares),
      };
    });
  },
  
  applyStatusToSquare: (squareId, status) => {
    set((state) => {
      const updateSquares = (squares: GridSquare[]) =>
        squares.map((sq) => {
          if (sq.id !== squareId || !sq.isActive) return sq;
          if (sq.statusEffects.includes(status)) return sq;
          return {
            ...sq,
            statusEffects: [...sq.statusEffects, status],
          };
        });
      
      return {
        playerSquares: updateSquares(state.playerSquares),
        enemySquares: updateSquares(state.enemySquares),
      };
    });
  },
  
  removeStatusFromSquare: (squareId, status) => {
    set((state) => {
      const updateSquares = (squares: GridSquare[]) =>
        squares.map((sq) => {
          if (sq.id !== squareId) return sq;
          return {
            ...sq,
            statusEffects: sq.statusEffects.filter((s) => s !== status),
          };
        });
      
      return {
        playerSquares: updateSquares(state.playerSquares),
        enemySquares: updateSquares(state.enemySquares),
      };
    });
  },
  
  tickStatusEffects: (delta) => {
    const state = get();
    const burnDamagePerSecond = 1;
    const burnSpreadChance = 0.1; // 10% chance per tick to spread
    
    const allSquares = [...state.playerSquares, ...state.enemySquares];
    const squaresToDamage: { id: string; damage: number }[] = [];
    const squaresToSpread: { id: string; status: StatusEffectType }[] = [];
    
    // Process burn damage and spreading
    allSquares.forEach((sq) => {
      if (!sq.isActive) return;
      
      if (sq.statusEffects.includes('burn')) {
        // Apply burn damage
        squaresToDamage.push({
          id: sq.id,
          damage: burnDamagePerSecond * delta,
        });
        
        // Chance to spread to adjacent squares
        if (Math.random() < burnSpreadChance * delta) {
          const adjacent = get().getAdjacentSquares(sq.id);
          const targetSquare = adjacent.find(
            (adj) => adj.isActive && !adj.statusEffects.includes('burn')
          );
          if (targetSquare) {
            squaresToSpread.push({ id: targetSquare.id, status: 'burn' });
          }
        }
      }
      
      // Add other status effects here (freeze, poison, etc.)
    });
    
    // Apply damage
    squaresToDamage.forEach(({ id, damage }) => {
      get().damageSquare(id, damage);
    });
    
    // Apply spread
    squaresToSpread.forEach(({ id, status }) => {
      get().applyStatusToSquare(id, status);
    });
  },
  
  getSquare: (squareId) => {
    const state = get();
    return (
      state.playerSquares.find((sq) => sq.id === squareId) ||
      state.enemySquares.find((sq) => sq.id === squareId)
    );
  },
  
  getRandomActiveSquare: (side) => {
    const squares = side === 'player' ? get().playerSquares : get().enemySquares;
    const activeSquares = squares.filter((sq) => sq.isActive);
    if (activeSquares.length === 0) return undefined;
    return activeSquares[Math.floor(Math.random() * activeSquares.length)];
  },
  
  getAdjacentSquares: (squareId) => {
    const square = get().getSquare(squareId);
    if (!square) return [];
    
    const squares = square.side === 'player' ? get().playerSquares : get().enemySquares;
    const adjacent: GridSquare[] = [];
    
    // Up, down, left, right (not diagonal)
    const directions = [
      { row: -1, col: 0 },
      { row: 1, col: 0 },
      { row: 0, col: -1 },
      { row: 0, col: 1 },
    ];
    
    directions.forEach(({ row: dr, col: dc }) => {
      const targetRow = square.row + dr;
      const targetCol = square.col + dc;
      
      if (targetRow >= 0 && targetRow < GRID_ROWS && targetCol >= 0 && targetCol < GRID_COLS) {
        const adjSquare = squares.find(
          (sq) => sq.row === targetRow && sq.col === targetCol
        );
        if (adjSquare) adjacent.push(adjSquare);
      }
    });
    
    return adjacent;
  },
  
  getSquareAtPosition: (side, row, col) => {
    const squares = side === 'player' ? get().playerSquares : get().enemySquares;
    return squares.find((sq) => sq.row === row && sq.col === col);
  },
  
  isGameOver: () => {
    const state = get();
    // If grid not initialized, game is not over
    if (state.playerSquares.length === 0 || state.enemySquares.length === 0) {
      return { gameOver: false, winner: null };
    }
    
    const playerActive = state.getActiveSquareCount('player');
    const enemyActive = state.getActiveSquareCount('enemy');
    
    if (playerActive === 0) {
      return { gameOver: true, winner: 'enemy' };
    }
    if (enemyActive === 0) {
      return { gameOver: true, winner: 'player' };
    }
    return { gameOver: false, winner: null };
  },
  
  getActiveSquareCount: (side) => {
    const squares = side === 'player' ? get().playerSquares : get().enemySquares;
    return squares.filter((sq) => sq.isActive).length;
  },
}));

export default useGridStore;
