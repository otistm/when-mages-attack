/**
 * Game HUD - Main heads-up display overlay
 */

import { HealthBar } from './HealthBar';
import { PhaseIndicator } from './PhaseIndicator';
import { GoldDisplay } from './GoldDisplay';
import { ActionButtons } from './ActionButtons';
import { useGameStore } from '@/stores/gameStore';

export function GameHUD() {
  const phase = useGameStore((state) => state.phase);
  
  if (phase === 'menu') {
    return null; // Don't show HUD on menu
  }
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start">
        {/* Player health (left) */}
        <div className="pointer-events-auto">
          <HealthBar side="player" />
        </div>
        
        {/* Phase indicator (center) */}
        <div className="pointer-events-auto">
          <PhaseIndicator />
        </div>
        
        {/* Enemy health (right) */}
        <div className="pointer-events-auto">
          <HealthBar side="enemy" />
        </div>
      </div>
      
      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-end">
        {/* Gold display (left) */}
        <div className="pointer-events-auto">
          <GoldDisplay />
        </div>
        
        {/* Action buttons (center/right) */}
        <div className="pointer-events-auto">
          <ActionButtons />
        </div>
      </div>
    </div>
  );
}

export default GameHUD;
