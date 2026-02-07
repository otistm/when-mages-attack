/**
 * GameLayout - Main layout orchestrator for the game
 * 
 * Vertical flex layout:
 * 1. Enemy card row (top)
 * 2. Enemy HP bar
 * 3. Arena canvas (flex-grow center)
 * 4. Player HP bar
 * 5. Player card row (bottom)
 */

import { ReactNode } from 'react';
import { CardRow } from './CardRow';
import { FullWidthHealthBar } from './FullWidthHealthBar';

interface GameLayoutProps {
  children: ReactNode; // The 3D Canvas and overlays
}

export function GameLayout({ children }: GameLayoutProps) {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: '#0a0a1a' }}>
      {/* Enemy Card Row - Top */}
      <div className="shrink-0 w-full bg-gradient-to-b from-red-950/40 to-transparent">
        <CardRow side="enemy" />
      </div>
      
      {/* Enemy HP Bar */}
      <div className="shrink-0 w-full">
        <FullWidthHealthBar side="enemy" />
      </div>
      
      {/* Arena Canvas - Center (flex-grow, fills all available space) */}
      <div className="flex-1 relative min-h-0 w-full overflow-hidden" style={{ background: '#1a1a2e' }}>
        {children}
      </div>
      
      {/* Player HP Bar */}
      <div className="shrink-0 w-full">
        <FullWidthHealthBar side="player" />
      </div>
      
      {/* Player Card Row - Bottom */}
      <div className="shrink-0 w-full bg-gradient-to-t from-blue-950/40 to-transparent">
        <CardRow side="player" />
      </div>
    </div>
  );
}

export default GameLayout;
