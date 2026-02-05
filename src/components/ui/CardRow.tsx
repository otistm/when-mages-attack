/**
 * CardRow - Horizontal row of card slots
 * Used for both player and enemy card displays
 */

import { useCallback, useState } from 'react';
import { useCardStore, CardState } from '@/stores/cardStore';
import { useUIStore } from '@/stores/uiStore';
import { CARD_SLOTS } from '@/types';

interface CardRowProps {
  side: 'player' | 'enemy';
}

export function CardRow({ side }: CardRowProps) {
  const cards = useCardStore((state) => state.cards);
  const filteredCards = cards.filter(c => c.team === side);
  
  const isEnemy = side === 'enemy';
  const slotHeight = 110; // Same height for both player and enemy
  
  return (
    <div className="w-full px-4 py-3">
      <div className="flex gap-2 w-full">
        {CARD_SLOTS.map((slot) => {
          const cardState = filteredCards.find(c => c.slotIndex === slot.index);
          return (
            <CardSlot
              key={`${side}-${slot.index}`}
              slotIndex={slot.index}
              cardState={cardState}
              isEnemy={isEnemy}
              height={slotHeight}
            />
          );
        })}
      </div>
    </div>
  );
}

interface CardSlotProps {
  slotIndex: number;
  cardState?: CardState;
  isEnemy: boolean;
  height: number;
}

function CardSlot({ slotIndex: _slotIndex, cardState, isEnemy, height }: CardSlotProps) {
  const emptyBorderColor = isEnemy ? 'rgba(140, 80, 80, 0.4)' : 'rgba(100, 100, 140, 0.4)';
  const emptyBgColor = isEnemy ? 'rgba(46, 26, 26, 0.3)' : 'rgba(26, 26, 46, 0.3)';
  
  if (!cardState) {
    return (
      <div
        className="relative flex-1 flex items-center justify-center"
        style={{
          height,
          backgroundColor: emptyBgColor,
          border: `2px dashed ${emptyBorderColor}`,
          borderRadius: '6px',
        }}
      >
        <div className="text-2xl text-white/10 font-bold">+</div>
      </div>
    );
  }
  
  return <Card2D cardState={cardState} height={height} isEnemy={isEnemy} />;
}

interface Card2DProps {
  cardState: CardState;
  height: number;
  isEnemy: boolean;
}

function Card2D({ cardState, height, isEnemy }: Card2DProps) {
  const { card, cooldownProgress, isReady } = cardState;
  const [hovered, setHovered] = useState(false);
  
  const setHoveredCard = useUIStore((state) => state.setHoveredCard);
  
  const handleMouseEnter = useCallback(() => {
    setHovered(true);
    setHoveredCard(card, window.innerWidth / 2 + 200, window.innerHeight / 2);
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
  
  // Hover direction based on side
  const hoverTransform = isEnemy 
    ? 'scale(1.02) translateY(4px)' 
    : 'scale(1.02) translateY(-4px)';
  
  return (
    <div
      className="relative flex-1 cursor-pointer"
      style={{
        height,
        transform: hovered ? hoverTransform : 'scale(1)',
        transition: 'transform 150ms ease-out',
        zIndex: hovered ? 10 : 1,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="relative w-full h-full overflow-hidden"
        style={{
          border: `2px solid ${borderColor}`,
          borderRadius: '6px',
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
            background: isEnemy
              ? 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.1) 100%)'
              : 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.1) 100%)',
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
        <div 
          className={`absolute left-0 right-0 p-1.5 pointer-events-none ${isEnemy ? 'top-0' : 'bottom-0'}`}
        >
          <h3
            className="text-xs font-bold text-white truncate"
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
          className={`absolute right-1 flex items-center gap-1.5 text-xs font-bold pointer-events-none ${isEnemy ? 'top-1' : 'bottom-1'}`}
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
        >
          <div className="flex items-center gap-0.5">
            <span style={{ color: '#ff6b6b' }}>⚔</span>
            <span className="text-white text-xs">{card.baseStats.attack}</span>
          </div>
          
          <div className="flex items-center gap-0.5">
            <span style={{ color: isReady ? accentColor : '#6bb3ff' }}>⏱</span>
            <span className="text-xs" style={{ color: isReady ? accentColor : '#fff' }}>
              {getStatusText()}
            </span>
          </div>
          
          {isConstruct && (
            <div className="flex items-center gap-0.5">
              <span style={{ color: '#6bff6b' }}>♥</span>
              <span className="text-white text-xs">{card.baseStats.hp}</span>
            </div>
          )}
        </div>
        
        {/* Cooldown progress bar */}
        <div 
          className={`absolute left-0 right-0 h-1 ${isEnemy ? 'bottom-0' : 'top-0'}`}
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

export default CardRow;
