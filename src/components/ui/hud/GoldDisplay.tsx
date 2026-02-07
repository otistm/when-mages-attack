/**
 * Gold Display - Shows player's gold
 */

import { useGameStore } from '@/stores/gameStore';

export function GoldDisplay() {
  const gold = useGameStore((state) => state.player.gold);
  
  return (
    <div className="flex items-center bg-arcane-dark/80 rounded-lg border border-arcane-gold/30" style={{ gap: 'var(--space-xs)', padding: 'var(--space-xs) var(--space-sm)' }}>
      {/* Gold icon (placeholder) */}
      <div className="rounded-full bg-arcane-gold flex items-center justify-center" style={{ width: 'clamp(18px, 2vw, 24px)', height: 'clamp(18px, 2vw, 24px)' }}>
        <span className="text-arcane-dark font-bold text-game-caption">G</span>
      </div>
      
      {/* Amount */}
      <span className="text-arcane-gold font-display text-game-subheading font-bold">
        {gold}
      </span>
    </div>
  );
}

export default GoldDisplay;
