/**
 * Phase Indicator - Shows current game phase
 */

import { useGameStore } from '@/stores/gameStore';
import { GamePhase } from '@/types';

const PHASE_LABELS: Record<GamePhase, string> = {
  start: 'Title',
  menu: 'Menu',
  allegiance: 'Allegiance',
  draft: 'Draft Phase',
  shop: 'Shop Phase',
  crafting: 'Crafting',
  deploy: 'Deploy Phase',
  combat: 'Combat!',
  result: 'Result',
  grimoire: 'Grimoire',
  paused: 'Paused',
};

const PHASE_COLORS: Record<GamePhase, string> = {
  start: 'text-arcane-gold',
  menu: 'text-white',
  allegiance: 'text-indigo-400',
  draft: 'text-blue-400',
  shop: 'text-arcane-gold',
  crafting: 'text-amber-400',
  deploy: 'text-purple-400',
  combat: 'text-red-400',
  result: 'text-green-400',
  grimoire: 'text-purple-400',
  paused: 'text-gray-400',
};

export function PhaseIndicator() {
  const phase = useGameStore((state) => state.phase);
  const run = useGameStore((state) => state.run);
  
  return (
    <div className="text-center">
      {/* Phase name */}
      <div
        className={`text-game-subheading font-display font-bold ${PHASE_COLORS[phase]} 
                    drop-shadow-[0_0_10px_currentColor] transition-colors duration-300`}
      >
        {PHASE_LABELS[phase]}
      </div>
      
      {/* Turn counter */}
      {run && phase !== 'menu' && (
        <div className="text-game-caption text-white/60 font-body mt-1">
          Turn {run.turn}
        </div>
      )}
    </div>
  );
}

export default PhaseIndicator;
