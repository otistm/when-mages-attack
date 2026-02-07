/**
 * HandheldCardTray - Horizontal scrollable card strip for handheld combat
 * 
 * Replaces the standard CardRow on handheld devices.
 * Cards are displayed in a horizontally-scrollable strip at the bottom
 * of the screen with larger tap targets.
 * 
 * Tapping a card shows its details in a CardBottomSheet.
 */

import { useCallback, useState } from 'react';
import { useCardStore, CardState } from '@/stores/cardStore';
import { useUIStore } from '@/stores/uiStore';
import { CARD_SLOTS } from '@/types';
import { CardDefinition } from '@/types';

interface HandheldCardTrayProps {
  side: 'player' | 'enemy';
  onCardTap?: (card: CardDefinition) => void;
}

export function HandheldCardTray({ side, onCardTap }: HandheldCardTrayProps) {
  const cards = useCardStore((state) => state.cards);
  const filteredCards = cards.filter(c => c.team === side);

  return (
    <div
      className="w-full overflow-x-auto overflow-y-hidden shrink-0"
      style={{
        height: '25vh',
        WebkitOverflowScrolling: 'touch',
        scrollSnapType: 'x mandatory',
      }}
    >
      <div
        className="flex h-full items-stretch"
        style={{
          gap: 'var(--space-sm)',
          padding: 'var(--space-sm) var(--space-md)',
          minWidth: 'min-content',
        }}
      >
        {CARD_SLOTS.map((slot) => {
          const cardState = filteredCards.find(c => c.slotIndex === slot.index);
          return (
            <HandheldCardSlot
              key={`${side}-${slot.index}`}
              cardState={cardState}
              isEnemy={side === 'enemy'}
              onTap={onCardTap}
            />
          );
        })}
      </div>
    </div>
  );
}

interface HandheldCardSlotProps {
  cardState?: CardState;
  isEnemy: boolean;
  onTap?: (card: CardDefinition) => void;
}

function HandheldCardSlot({ cardState, isEnemy, onTap }: HandheldCardSlotProps) {
  const emptyBorderColor = isEnemy ? 'rgba(140, 80, 80, 0.4)' : 'rgba(100, 100, 140, 0.4)';
  const emptyBgColor = isEnemy ? 'rgba(46, 26, 26, 0.3)' : 'rgba(26, 26, 46, 0.3)';

  if (!cardState) {
    return (
      <div
        className="flex items-center justify-center shrink-0"
        style={{
          width: 'clamp(80px, 18vw, 140px)',
          height: '100%',
          backgroundColor: emptyBgColor,
          border: `2px dashed ${emptyBorderColor}`,
          borderRadius: '8px',
          scrollSnapAlign: 'center',
        }}
      >
        <div className="text-game-heading text-white/10 font-bold">+</div>
      </div>
    );
  }

  return <HandheldCard2D cardState={cardState} isEnemy={isEnemy} onTap={onTap} />;
}

interface HandheldCard2DProps {
  cardState: CardState;
  isEnemy: boolean;
  onTap?: (card: CardDefinition) => void;
}

function HandheldCard2D({ cardState, isEnemy, onTap }: HandheldCard2DProps) {
  const { card, cooldownProgress, isReady } = cardState;
  const [pressed, setPressed] = useState(false);

  const setHoveredCard = useUIStore((state) => state.setHoveredCard);

  const handleTap = useCallback(() => {
    if (onTap) {
      onTap(card);
    } else {
      // Fallback: set hovered card for bottom sheet
      setHoveredCard(card, window.innerWidth / 2, window.innerHeight / 2);
    }
  }, [card, onTap, setHoveredCard]);

  const fillPercent = cooldownProgress * 100;
  const isConstruct = card.type === 'CONSTRUCT';
  const accentColor = card.emissiveColor ?? '#ff6a00';
  const borderColor = isReady ? accentColor : '#3a3a5a';

  const getStatusText = () => {
    if (isReady) return 'FIRE!';
    const cooldown = card.cooldown ?? 5;
    return `${Math.ceil(cooldown * (1 - cooldownProgress))}s`;
  };

  return (
    <div
      className="relative shrink-0 cursor-pointer"
      style={{
        width: 'clamp(80px, 18vw, 140px)',
        height: '100%',
        transform: pressed ? 'scale(0.95)' : 'scale(1)',
        transition: 'transform 100ms ease-out',
        scrollSnapAlign: 'center',
      }}
      onClick={handleTap}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
    >
      <div
        className="relative w-full h-full overflow-hidden"
        style={{
          border: `2px solid ${borderColor}`,
          borderRadius: '8px',
        }}
      >
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src={card.imagePath || '/assets/images/toaster_inert.png'}
            alt={card.name}
            className="w-full h-full object-cover"
            style={{ objectPosition: 'center center' }}
          />
        </div>

        {/* Dark gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.1) 100%)',
          }}
        />

        {/* Cooldown fill overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to right, ${accentColor} ${fillPercent}%, transparent ${fillPercent}%)`,
            opacity: isReady ? 0.4 : 0.25,
            transition: fillPercent < 5 ? 'none' : 'all 100ms linear',
          }}
        />

        {/* Ready flash */}
        {isReady && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundColor: accentColor, opacity: 0.15 }}
          />
        )}

        {/* Card name */}
        <div className="absolute left-0 right-0 bottom-0 p-2 pointer-events-none">
          <h3
            className="text-game-caption font-bold text-white truncate"
            style={{
              WebkitTextStroke: '0.5px #000',
              paintOrder: 'stroke fill',
            }}
          >
            {card.name}
          </h3>
        </div>

        {/* Stats overlay */}
        <div
          className="absolute right-1.5 top-1.5 flex flex-col items-end gap-1 text-game-caption font-bold pointer-events-none"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
        >
          <div className="flex items-center gap-1 bg-black/40 rounded px-1 py-0.5">
            <span style={{ color: '#ff6b6b' }}>⚔</span>
            <span className="text-white">{card.baseStats.attack}</span>
          </div>

          <div className="flex items-center gap-1 bg-black/40 rounded px-1 py-0.5">
            <span style={{ color: isReady ? accentColor : '#6bb3ff' }}>⏱</span>
            <span style={{ color: isReady ? accentColor : '#fff' }}>
              {getStatusText()}
            </span>
          </div>

          {isConstruct && (
            <div className="flex items-center gap-1 bg-black/40 rounded px-1 py-0.5">
              <span style={{ color: '#6bff6b' }}>♥</span>
              <span className="text-white">{card.baseStats.hp}</span>
            </div>
          )}
        </div>

        {/* Cooldown progress bar */}
        <div
          className="absolute left-0 right-0 top-0 h-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div
            className="h-full"
            style={{
              width: `${fillPercent}%`,
              backgroundColor: accentColor,
              transition: fillPercent < 5 ? 'none' : 'width 100ms linear',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default HandheldCardTray;
