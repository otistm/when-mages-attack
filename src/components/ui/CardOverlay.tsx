/**
 * CardOverlay - 2D card rows rendered outside of 3D space
 * Layout: Enemy cards at top, Player cards at bottom
 * HP bars replaced by territory grid in 3D space
 */

import { useCallback, useState } from 'react';
import { useCardStore, CardState } from '@/stores/cardStore';
import { useUIStore } from '@/stores/uiStore';
import { CARD_SLOTS } from '@/types';

export function CardOverlay() {
  const cards = useCardStore((state) => state.cards);
  
  // Get cards by team
  const playerCards = cards.filter(c => c.team === 'player');
  const enemyCards = cards.filter(c => c.team === 'enemy');
  
  return (
    <>
      {/* Enemy section - TOP of screen */}
      <div className="fixed top-0 left-0 right-0 pointer-events-none z-50 px-4 pt-2">
        {/* Enemy card row */}
        <div className="flex justify-between gap-2 pointer-events-auto w-full">
          {CARD_SLOTS.map((slot) => {
            const cardState = enemyCards.find(c => c.slotIndex === slot.index);
            return (
              <CardSlot
                key={`enemy-${slot.index}`}
                slotIndex={slot.index}
                cardState={cardState}
                isEnemy
              />
            );
          })}
        </div>
      </div>

      {/* Player section - BOTTOM of screen */}
      <div className="fixed bottom-0 left-0 right-0 pointer-events-none z-50 px-4 pb-2">
        {/* Player card row */}
        <div className="flex justify-between gap-2 pointer-events-auto w-full">
          {CARD_SLOTS.map((slot) => {
            const cardState = playerCards.find(c => c.slotIndex === slot.index);
            return (
              <CardSlot
                key={`player-${slot.index}`}
                slotIndex={slot.index}
                cardState={cardState}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}

interface CardSlotProps {
  slotIndex: number;
  cardState?: CardState;
  isEnemy?: boolean;
}

function CardSlot({ slotIndex: _slotIndex, cardState, isEnemy = false }: CardSlotProps) {
  // Slot height - landscape orientation, width is flexible
  // Enemy slots are slightly smaller to bring them closer to HP bar
  const slotHeight = isEnemy ? 80 : 100;
  
  // Enemy slots have different styling
  const emptyBorderColor = isEnemy ? 'rgba(140, 80, 80, 0.4)' : 'rgba(100, 100, 140, 0.4)';
  const emptyBgColor = isEnemy ? 'rgba(46, 26, 26, 0.3)' : 'rgba(26, 26, 46, 0.3)';
  
  if (!cardState) {
    // Empty slot - subtle placeholder
    return (
      <div
        className="relative flex-1 flex items-center justify-center"
        style={{
          height: slotHeight,
          backgroundColor: emptyBgColor,
          border: `2px dashed ${emptyBorderColor}`,
          borderRadius: '8px',
        }}
      >
        {/* Empty slot indicator */}
        <div className="text-3xl text-white/10 font-bold">+</div>
      </div>
    );
  }
  
  return <Card2D cardState={cardState} height={slotHeight} isEnemy={isEnemy} />;
}

interface Card2DProps {
  cardState: CardState;
  height: number;
  isEnemy?: boolean;
}

function Card2D({ cardState, height, isEnemy: _isEnemy = false }: Card2DProps) {
  const { card, cooldownProgress, isReady } = cardState;
  const [hovered, setHovered] = useState(false);
  
  const setHoveredCard = useUIStore((state) => state.setHoveredCard);
  
  const handleMouseEnter = useCallback(() => {
    setHovered(true);
    // Position lore panel to the right of the card row
    setHoveredCard(card, window.innerWidth / 2 + 200, window.innerHeight - 200);
  }, [card, setHoveredCard]);
  
  const handleMouseLeave = useCallback(() => {
    setHovered(false);
    setHoveredCard(null);
  }, [setHoveredCard]);
  
  const fillPercent = cooldownProgress * 100;
  const isConstruct = card.type === 'CONSTRUCT';
  const accentColor = card.emissiveColor ?? '#ff6a00';
  const borderColor = hovered || isReady ? accentColor : '#3a3a5a';
  
  const getStatusText = () => {
    if (isReady) return 'FIRE!';
    const cooldown = card.cooldown ?? 5;
    return `${Math.ceil(cooldown * (1 - cooldownProgress))}s`;
  };
  
  return (
    <div
      className="relative flex-1 cursor-pointer"
      style={{
        height,
        transform: hovered ? 'scale(1.02) translateY(-4px)' : 'scale(1)',
        transition: 'transform 150ms ease-out',
        zIndex: hovered ? 10 : 1,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Card container - landscape with full bleed image */}
      <div
        className="relative w-full h-full overflow-hidden"
        style={{
          border: `3px solid ${borderColor}`,
          borderRadius: '8px',
        }}
      >
        {/* Full bleed background image */}
        <div className="absolute inset-0">
          <img
            src="/assets/images/toaster_cel.png"
            alt={card.name}
            className="w-full h-full object-cover"
            style={{
              objectPosition: 'center center',
            }}
          />
        </div>
        
        {/* Dark gradient overlay for text legibility */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.1) 100%)',
          }}
        />
        
        {/* Cooldown fill overlay - sweeps from left to right */}
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
            style={{ 
              backgroundColor: accentColor, 
              opacity: 0.15,
            }}
          />
        )}
        
        {/* Card name - bottom left */}
        <div className="absolute bottom-0 left-0 right-0 p-2 pointer-events-none">
          <h3
            className="text-sm font-bold text-white"
            style={{
              WebkitTextStroke: '1px #000',
              paintOrder: 'stroke fill',
            }}
          >
            {card.name}
          </h3>
        </div>
        
        {/* Stats overlay - bottom right */}
        <div 
          className="absolute bottom-1 right-1 flex items-center gap-2 text-xs font-bold pointer-events-none"
          style={{
            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
          }}
        >
          {/* Attack */}
          <div className="flex items-center gap-0.5">
            <span style={{ color: '#ff6b6b' }}>⚔</span>
            <span className="text-white">{card.baseStats.attack}</span>
          </div>
          
          {/* Cooldown */}
          <div className="flex items-center gap-0.5">
            <span style={{ color: isReady ? accentColor : '#6bb3ff' }}>⏱</span>
            <span style={{ color: isReady ? accentColor : '#fff' }}>
              {getStatusText()}
            </span>
          </div>
          
          {/* HP */}
          {isConstruct && (
            <div className="flex items-center gap-0.5">
              <span style={{ color: '#6bff6b' }}>♥</span>
              <span className="text-white">{card.baseStats.hp}</span>
            </div>
          )}
        </div>
        
        {/* Cooldown progress bar - very bottom */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-1"
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

export default CardOverlay;
