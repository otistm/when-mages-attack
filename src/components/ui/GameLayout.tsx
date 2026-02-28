/**
 * GameLayout - Main layout orchestrator for the game
 * 
 * Vertical flex layout:
 * 1. Enemy card row (top)
 * 2. Enemy HP bar
 * 3. Arena canvas (flex-grow center)
 * 4. Mage portrait (overlaps bottom of arena, above player HP bar)
 * 5. Player HP bar
 * 6. Player card row (bottom)
 */

import { ReactNode } from 'react';
import { CardRow } from './CardRow';
import { FullWidthHealthBar } from './FullWidthHealthBar';
import { KeepsakeButton } from './hud/KeepsakeButton';
import { MageArenaPortrait } from './MageArenaPortrait';

interface GameLayoutProps {
  children: ReactNode; // The 3D Canvas and overlays
}

export function GameLayout({ children }: GameLayoutProps) {
  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#0a0a1a' }}>
      {/* Arena Canvas - Full viewport */}
      <div className="absolute inset-0 w-full h-full" style={{ background: '#1a1a2e' }}>
        {children}
        <MageArenaPortrait />
      </div>

      {/* UI overlay — flex column on top of the arena */}
      <div className="absolute inset-0 flex flex-col pointer-events-none">
        {/* Enemy Card Row - Top */}
        <div className="shrink-0 w-full bg-gradient-to-b from-red-950/40 to-transparent pointer-events-auto">
          <CardRow side="enemy" />
        </div>

        {/* Enemy HP Bar */}
        <div className="shrink-0 w-full pointer-events-auto">
          <FullWidthHealthBar side="enemy" />
        </div>

        {/* Spacer — pushes bottom UI down */}
        <div className="flex-1 min-h-0" />

        {/* Player HP Bar */}
        <div className="shrink-0 w-full pointer-events-auto">
          <FullWidthHealthBar side="player" />
        </div>

        {/* Keepsake ability button */}
        <div className="shrink-0 w-full flex justify-center py-1 pointer-events-auto" style={{ background: 'rgba(10,10,26,0.5)' }}>
          <KeepsakeButton />
        </div>

        {/* Player Card Row - Bottom */}
        <div className="shrink-0 w-full bg-gradient-to-t from-blue-950/40 to-transparent pointer-events-auto">
          <CardRow side="player" />
        </div>
      </div>
    </div>
  );
}

export default GameLayout;
