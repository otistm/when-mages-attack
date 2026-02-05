/**
 * UI Store - Manages UI state like tooltips, hover states, and HP bar positions
 */

import { create } from 'zustand';
import { CardDefinition } from '@/types';

interface HoveredCard {
  card: CardDefinition;
  screenPosition: { x: number; y: number };
}

/** Screen position and dimensions of an HP bar element */
interface HPBarRect {
  x: number;      // Left edge in screen pixels
  y: number;      // Top edge in screen pixels  
  width: number;  // Width in pixels
  height: number; // Height in pixels
  centerX: number; // Center X in screen pixels
  centerY: number; // Center Y in screen pixels
}

interface UIState {
  hoveredCard: HoveredCard | null;
  setHoveredCard: (card: CardDefinition | null, screenX?: number, screenY?: number) => void;
  
  // HP bar position tracking
  playerHPBarRect: HPBarRect | null;
  enemyHPBarRect: HPBarRect | null;
  setHPBarRect: (side: 'player' | 'enemy', rect: HPBarRect) => void;
  
  // Canvas/viewport info for coordinate conversion
  canvasRect: { width: number; height: number } | null;
  canvasBounds: { x: number; y: number; width: number; height: number } | null;
  setCanvasRect: (width: number, height: number) => void;
  setCanvasBounds: (x: number, y: number, width: number, height: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  hoveredCard: null,
  
  setHoveredCard: (card, screenX = 0, screenY = 0) => {
    if (card) {
      set({ hoveredCard: { card, screenPosition: { x: screenX, y: screenY } } });
    } else {
      set({ hoveredCard: null });
    }
  },
  
  // HP bar positions
  playerHPBarRect: null,
  enemyHPBarRect: null,
  setHPBarRect: (side, rect) => {
    if (side === 'player') {
      set({ playerHPBarRect: rect });
    } else {
      set({ enemyHPBarRect: rect });
    }
  },
  
  // Canvas dimensions and position
  canvasRect: null,
  canvasBounds: null as { x: number; y: number; width: number; height: number } | null,
  setCanvasRect: (width, height) => {
    set({ canvasRect: { width, height } });
  },
  setCanvasBounds: (x: number, y: number, width: number, height: number) => {
    set({ canvasBounds: { x, y, width, height } });
  },
}));
