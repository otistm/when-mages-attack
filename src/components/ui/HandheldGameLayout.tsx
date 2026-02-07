/**
 * HandheldGameLayout - Combat layout optimized for PC gaming handhelds
 * 
 * Key differences from desktop GameLayout:
 * - Arena fills the entire screen (no card rows eating vertical space)
 * - Enemy cards are hidden (autobattler - player doesn't interact with them)
 * - HP bars become compact overlays on the arena edges
 * - Player cards are in a horizontal scrollable tray at the bottom
 * - Card details shown as bottom sheet instead of side panel
 */

import { ReactNode, useCallback, useRef, useEffect, useState } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useUIStore } from '@/stores/uiStore';
import { HandheldCardTray } from './HandheldCardTray';
import { CardBottomSheet } from './CardBottomSheet';
import { CardDefinition, StatusEffectType } from '@/types';

interface HandheldGameLayoutProps {
  children: ReactNode; // The 3D Canvas and overlays
}

const STATUS_CONFIG: Record<StatusEffectType, {
  color: string;
  icon: string;
}> = {
  burn: { color: '#ff6b35', icon: '🔥' },
  freeze: { color: '#67e8f9', icon: '❄️' },
  shocked: { color: '#fbbf24', icon: '⚡' },
  poison: { color: '#a3e635', icon: '☠️' },
  blighted: { color: '#9333ea', icon: '💀' },
};

export function HandheldGameLayout({ children }: HandheldGameLayoutProps) {
  const [selectedCard, setSelectedCard] = useState<CardDefinition | null>(null);

  const handleCardTap = useCallback((card: CardDefinition) => {
    setSelectedCard(prev => (prev?.id === card.id ? null : card));
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedCard(null);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: '#0a0a1a' }}>
      {/* Arena fills all space above the card tray */}
      <div className="flex-1 relative min-h-0 w-full overflow-hidden" style={{ background: '#1a1a2e' }}>
        {children}

        {/* Enemy HP bar overlay - compact, top of arena */}
        <CompactHPBar side="enemy" position="top" />

        {/* Player HP bar overlay - compact, above card tray */}
        <CompactHPBar side="player" position="bottom" />
      </div>

      {/* Player Card Tray - horizontal scroll strip at bottom */}
      <div className="shrink-0 w-full bg-gradient-to-t from-blue-950/60 to-transparent">
        <HandheldCardTray side="player" onCardTap={handleCardTap} />
      </div>

      {/* Card Bottom Sheet - replaces CardLorePanel on handheld */}
      <CardBottomSheet card={selectedCard} onClose={handleCloseSheet} />
    </div>
  );
}

/**
 * CompactHPBar - Minimal HP bar overlay for handheld layout
 * 
 * Sits on the arena edge as an absolute-positioned overlay.
 * Much smaller than FullWidthHealthBar - just the bar and health numbers.
 */
function CompactHPBar({ side, position }: { side: 'player' | 'enemy'; position: 'top' | 'bottom' }) {
  const barRef = useRef<HTMLDivElement>(null);
  const setHPBarRect = useUIStore((state) => state.setHPBarRect);

  const player = useGameStore((state) => state.player);
  const enemy = useGameStore((state) => state.enemy);
  const gameStatusEffects = useGameStore((state) => state.statusEffects);
  const stateData = side === 'player' ? player : enemy;
  const statusEffects = side === 'player' ? gameStatusEffects.player : gameStatusEffects.enemy;

  const isBurning = statusEffects.some(e => e.type === 'burn');

  // Track HP bar position for projectile targeting
  const updatePosition = useCallback(() => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    setHPBarRect(side, {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
    });
  }, [side, setHPBarRect]);

  useEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    const interval = setInterval(updatePosition, 500);
    return () => {
      window.removeEventListener('resize', updatePosition);
      clearInterval(interval);
    };
  }, [updatePosition]);

  const percentage = (stateData.health / stateData.maxHealth) * 100;
  const isPlayer = side === 'player';

  const barColor = isBurning
    ? 'linear-gradient(to right, #ea580c, #eab308)'
    : isPlayer
      ? 'linear-gradient(to right, #16a34a, #4ade80)'
      : 'linear-gradient(to right, #dc2626, #f87171)';

  const glowColor = isBurning
    ? 'rgba(255, 100, 0, 0.4)'
    : isPlayer
      ? 'rgba(74, 222, 128, 0.3)'
      : 'rgba(248, 113, 113, 0.3)';

  // Gather unique status effects
  const uniqueStatuses = Object.values(
    statusEffects.reduce((acc, e) => {
      if (!acc[e.type]) acc[e.type] = e;
      return acc;
    }, {} as Record<string, (typeof statusEffects)[0]>)
  );

  return (
    <div
      className="absolute left-0 right-0 z-30 pointer-events-none"
      style={{
        [position]: 0,
        padding: 'var(--space-xs) var(--space-md)',
      }}
    >
      <div className="flex items-center gap-2">
        {/* Status effect icons */}
        {uniqueStatuses.length > 0 && (
          <div className="flex gap-1">
            {uniqueStatuses.map((e) => {
              const cfg = STATUS_CONFIG[e.type];
              return cfg ? (
                <span key={e.type} className="text-game-caption" style={{ filter: `drop-shadow(0 0 4px ${cfg.color})` }}>
                  {cfg.icon}
                </span>
              ) : null;
            })}
          </div>
        )}

        {/* Bar */}
        <div
          ref={barRef}
          className="flex-1 rounded-full overflow-hidden"
          style={{
            height: '12px',
            backgroundColor: 'rgba(0,0,0,0.5)',
            boxShadow: `0 0 8px ${glowColor}`,
            border: isBurning
              ? '1px solid rgba(255,100,0,0.6)'
              : isPlayer
                ? '1px solid rgba(74,222,128,0.3)'
                : '1px solid rgba(248,113,113,0.3)',
          }}
        >
          <div
            className="h-full transition-all duration-300 ease-out rounded-full"
            style={{
              width: `${Math.max(0, percentage)}%`,
              background: barColor,
            }}
          />
        </div>

        {/* Health text */}
        <span
          className="text-game-micro font-mono font-bold"
          style={{
            color: isBurning ? '#ffaa00' : isPlayer ? '#4ade80' : '#f87171',
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            minWidth: '48px',
            textAlign: 'right',
          }}
        >
          {Math.ceil(stateData.health)}/{stateData.maxHealth}
        </span>
      </div>
    </div>
  );
}

export default HandheldGameLayout;
