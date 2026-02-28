/**
 * UI Store - Manages UI state like tooltips, hover states, and HP bar positions
 */

import { create } from 'zustand';
import { CardDefinition } from '@/types';
import { AudioCues } from '@/stores/audioStore';

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
  
  // Tap-to-place interaction (handheld/touch)
  selectedCardForPlacement: string | null;
  setSelectedCardForPlacement: (cardId: string | null) => void;
  
  // HP bar position tracking (used by HTML HP bar components for display)
  playerHPBarRect: HPBarRect | null;
  enemyHPBarRect: HPBarRect | null;
  setHPBarRect: (side: 'player' | 'enemy', rect: HPBarRect) => void;
}

export const useUIStore = create<UIState>((set) => ({
  hoveredCard: null,
  
  // Tap-to-place
  selectedCardForPlacement: null,
  setSelectedCardForPlacement: (cardId) => {
    set({ selectedCardForPlacement: cardId });
  },
  
  setHoveredCard: (card, screenX = 0, screenY = 0) => {
    if (card) {
      AudioCues.onViewPage();
      set({ hoveredCard: { card, screenPosition: { x: screenX, y: screenY } } });
    } else {
      set({ hoveredCard: null });
    }
  },
  
  // HP bar positions (used by HTML HP bar components for display)
  playerHPBarRect: null,
  enemyHPBarRect: null,
  setHPBarRect: (side, rect) => {
    if (side === 'player') {
      set({ playerHPBarRect: rect });
    } else {
      set({ enemyHPBarRect: rect });
    }
  },
}));
