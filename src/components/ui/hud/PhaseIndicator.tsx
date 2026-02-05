/**
 * Phase Indicator - Shows current game phase
 */

import { useGameStore } from '@/stores/gameStore';
import { GamePhase } from '@/types';

const PHASE_LABELS: Record<GamePhase, string> = {
  menu: 'Menu',
  draft: 'Draft Phase',
  shop: 'Shop Phase',
  crafting: 'Crafting',
  deploy: 'Deploy Phase',
  combat: 'Combat!',
  result: 'Result',
  paused: 'Paused',
};

const PHASE_COLORS: Record<GamePhase, string> = {
  menu: 'text-white',
  draft: 'text-blue-400',
  shop: 'text-arcane-gold',
  crafting: 'text-amber-400',
  deploy: 'text-purple-400',
  combat: 'text-red-400',
  result: 'text-green-400',
  paused: 'text-gray-400',
};

export function PhaseIndicator() {
  const phase = useGameStore((state) => state.phase);
  const run = useGameStore((state) => state.run);
  
  return (
    <div className="text-center">
      {/* Phase name */}
      <div
        className={`text-2xl font-display font-bold ${PHASE_COLORS[phase]} 
                    drop-shadow-[0_0_10px_currentColor] transition-colors duration-300`}
      >
        {PHASE_LABELS[phase]}
      </div>
      
      {/* Turn counter */}
      {run && phase !== 'menu' && (
        <div className="text-sm text-white/60 font-body mt-1">
          Turn {run.turn}
        </div>
      )}
    </div>
  );
}

export default PhaseIndicator;
