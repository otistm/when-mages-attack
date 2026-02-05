/**
 * Gold Display - Shows player's gold
 */

import { useGameStore } from '@/stores/gameStore';

export function GoldDisplay() {
  const gold = useGameStore((state) => state.player.gold);
  
  return (
    <div className="flex items-center gap-2 bg-arcane-dark/80 px-4 py-2 rounded-lg border border-arcane-gold/30">
      {/* Gold icon (placeholder) */}
      <div className="w-6 h-6 rounded-full bg-arcane-gold flex items-center justify-center">
        <span className="text-arcane-dark font-bold text-sm">G</span>
      </div>
      
      {/* Amount */}
      <span className="text-arcane-gold font-display text-xl font-bold">
        {gold}
      </span>
    </div>
  );
}

export default GoldDisplay;
