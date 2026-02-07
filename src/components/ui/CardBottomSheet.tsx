/**
 * CardBottomSheet - Mobile-friendly card detail panel
 * 
 * Replaces the side-panel CardLorePanel on handheld devices.
 * Slides up from the bottom of the screen when a card is tapped.
 * Can be dismissed by tapping the backdrop or dragging down.
 * 
 * Styled as a "Grimoire Entry" - same arcane aesthetic as CardLorePanel.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { CardDefinition } from '@/types';

interface CardBottomSheetProps {
  card: CardDefinition | null;
  onClose: () => void;
}

export function CardBottomSheet({ card, onClose }: CardBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef(0);
  const isDragging = useRef(false);

  // Animate in when card changes
  useEffect(() => {
    if (card) {
      // Small delay for entrance animation
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [card]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 250); // Wait for exit animation
  }, [onClose]);

  // Touch drag to dismiss
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragStartY.current = touch.clientY;
    isDragging.current = true;
    setDragY(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const touch = e.touches[0];
    const delta = touch.clientY - dragStartY.current;
    if (delta > 0) {
      setDragY(delta);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    if (dragY > 80) {
      handleClose();
    } else {
      setDragY(0);
    }
  }, [dragY, handleClose]);

  if (!card) return null;

  const isConstruct = card.type === 'CONSTRUCT';
  const classification = isConstruct ? 'Autonomous Construct' : 'Volatile Incantation';
  const accentColor = card.emissiveColor ?? '#ff6a00';
  const bgColor = '#1a1a2e';
  const headerBg = '#0a0a12';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[90] transition-opacity duration-250"
        style={{
          backgroundColor: isVisible ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0)',
          pointerEvents: isVisible ? 'auto' : 'none',
        }}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="fixed left-0 right-0 bottom-0 z-[91] transition-transform duration-250 ease-out"
        style={{
          transform: isVisible
            ? `translateY(${dragY}px)`
            : 'translateY(100%)',
          maxHeight: '70vh',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-2" style={{ backgroundColor: bgColor, borderRadius: '16px 16px 0 0' }}>
          <div className="w-10 h-1 rounded-full bg-white/30" />
        </div>

        <div
          className="overflow-y-auto"
          style={{
            backgroundColor: bgColor,
            maxHeight: 'calc(70vh - 20px)',
            border: `2px solid #222`,
            borderTop: 'none',
          }}
        >
          {/* Header */}
          <div style={{ backgroundColor: headerBg, borderBottom: '3px solid #111111', padding: 'var(--space-sm) var(--space-lg)' }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2" style={{ backgroundColor: accentColor }} />
              <span className="text-game-micro uppercase tracking-[0.2em] text-white/60 font-mono font-bold">
                Sigil Registry
              </span>
            </div>
            <h3 className="text-game-heading font-black text-white tracking-wide">
              {card.name}
            </h3>
            <p
              className="text-game-micro uppercase tracking-widest font-mono font-bold mt-1"
              style={{ color: accentColor }}
            >
              {classification}
            </p>
          </div>

          {/* Card Image */}
          {card.imagePath && (
            <div
              className="relative w-full"
              style={{ borderBottom: '3px solid #111111', backgroundColor: '#0a0a12' }}
            >
              <img
                src={card.imagePath}
                alt={card.name}
                className="w-full h-auto object-contain"
                style={{ maxHeight: 'clamp(100px, 15vh, 160px)', display: 'block' }}
              />
            </div>
          )}

          {/* Flavor Text */}
          <div style={{ backgroundColor: '#12121f', borderBottom: '2px solid #222', padding: 'var(--space-sm) var(--space-lg)' }}>
            <p className="text-game-body italic text-amber-200 leading-relaxed">
              "{card.flavorText}"
            </p>
          </div>

          {/* Description */}
          <div style={{ borderBottom: '2px solid #222', padding: 'var(--space-sm) var(--space-lg)' }}>
            <div className="text-game-micro uppercase tracking-[0.15em] text-white/50 mb-2 font-mono font-bold">
              ▸ Research Notes
            </div>
            <p className="text-game-body text-white/80 leading-relaxed">
              {card.description}
            </p>
          </div>

          {/* Tags */}
          <div style={{ borderBottom: '2px solid #222', padding: 'var(--space-sm) var(--space-lg)' }}>
            <div className="text-game-micro uppercase tracking-[0.15em] text-white/50 mb-2 font-mono font-bold">
              ▸ Arcane Properties
            </div>
            <div className="flex flex-wrap gap-2">
              {card.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-game-micro font-mono font-bold"
                  style={{
                    backgroundColor: accentColor,
                    color: '#111111',
                    border: '2px solid #111111',
                  }}
                >
                  {tag.toUpperCase()}
                </span>
              ))}
            </div>
          </div>

          {/* Abilities */}
          {card.abilities.length > 0 && (
            <div style={{ borderBottom: '2px solid #222', padding: 'var(--space-sm) var(--space-lg)' }}>
              <div className="text-game-micro uppercase tracking-[0.15em] text-white/50 mb-2 font-mono font-bold">
                ▸ Documented Behaviors
              </div>
              {card.abilities.map((ability) => (
                <div key={ability.id} className="mb-2 last:mb-0">
                  <div className="flex items-center gap-2">
                    <span style={{ color: accentColor }} className="font-bold">◆</span>
                    <span className="text-game-body font-bold text-amber-300">
                      {ability.name}
                    </span>
                  </div>
                  <p className="text-game-caption text-white/60 ml-5 mt-1 leading-relaxed">
                    {ability.description}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Combat Stats - horizontal scroll on narrow screens */}
          <div style={{ backgroundColor: '#0a0a12', padding: 'var(--space-sm) var(--space-lg)' }}>
            <div className="text-game-micro uppercase tracking-[0.15em] text-white/50 mb-2 font-mono font-bold">
              ▸ Combat Statistics
            </div>
            <div className="grid grid-cols-3 gap-2">
              <StatBox icon="⚔" label="DAMAGE" value={card.baseStats.attack} color="#ef4444" />
              <StatBox icon="⏱" label="COOLDOWN" value={`${card.cooldown ?? 0}s`} color="#60a5fa" />
              {isConstruct && (
                <StatBox icon="♥" label="HULL" value={card.baseStats.hp} color="#4ade80" />
              )}
              <StatBox icon="↗" label="RANGE" value={card.baseStats.range} color="#a78bfa" />
              <StatBox icon="⚡" label="SPEED" value={card.baseStats.speed} color="#fbbf24" />
              <StatBox icon="⟳" label="ATK SPD" value={card.baseStats.attackSpeed} color="#fb923c" />
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between text-game-micro"
            style={{ backgroundColor: headerBg, borderTop: '3px solid #111111', padding: 'var(--space-xs) var(--space-lg)' }}
          >
            <span className="uppercase tracking-widest text-white/60 font-mono font-bold">
              Tier {card.tier} · {card.rarity}
            </span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2" style={{ backgroundColor: '#4ade80' }} />
              <span className="uppercase tracking-widest text-green-400 font-mono font-bold">
                Active
              </span>
            </div>
          </div>

          {/* Bottom padding for safe area */}
          <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
        </div>
      </div>
    </>
  );
}

function StatBox({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div
      className="flex flex-col items-center p-2"
      style={{ backgroundColor: '#12121f', border: '2px solid #222' }}
    >
      <span className="text-game-body font-bold" style={{ color }}>{icon}</span>
      <span className="text-white font-black text-game-caption mt-1">{value}</span>
      <span className="text-white/60 text-game-micro tracking-wider font-bold">{label}</span>
    </div>
  );
}

export default CardBottomSheet;
