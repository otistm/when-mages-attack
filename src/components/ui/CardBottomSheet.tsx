/**
 * CardBottomSheet - Mobile-friendly card detail panel
 * 
 * Replaces the side-panel CardLorePanel on handheld devices.
 * Slides up from the bottom of the screen when a card is tapped.
 * Can be dismissed by tapping the backdrop or dragging down.
 * 
 * Layout priority: Combat Stats > Status Effects > Abilities > Lore
 * Styled as a "Sigil Registry" dossier - arcane research document aesthetic.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { CardDefinition } from '@/types';

import { STATUS_EFFECT_META } from '@/data/constants';

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

  useEffect(() => {
    if (card) {
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [card]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 250);
  }, [onClose]);

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
  const statusEffect = card.statusEffect;
  const effectMeta = statusEffect ? STATUS_EFFECT_META[statusEffect.type] : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[90] transition-opacity duration-250"
        style={{
          background: isVisible 
            ? 'radial-gradient(ellipse at center bottom, rgba(74,44,106,0.15), rgba(0,0,0,0.7))'
            : 'rgba(0,0,0,0)',
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
          maxHeight: '85vh',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div 
          className="flex justify-center py-2 relative"
          style={{ 
            background: 'linear-gradient(180deg, rgba(10,10,26,0.98), rgba(10,10,26,0.98))',
            borderRadius: '16px 16px 0 0',
            borderTop: '2px solid rgba(212,175,55,0.3)',
            borderLeft: '2px solid rgba(212,175,55,0.2)',
            borderRight: '2px solid rgba(212,175,55,0.2)',
          }}
        >
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'rgba(212,175,55,0.3)' }} />
        </div>

        <div
          className="overflow-y-auto relative"
          style={{
            background: 'linear-gradient(180deg, rgba(10,10,26,0.98) 0%, rgba(5,5,16,0.98) 100%)',
            maxHeight: 'calc(85vh - 20px)',
            borderLeft: '2px solid rgba(212,175,55,0.2)',
            borderRight: '2px solid rgba(212,175,55,0.2)',
            borderBottom: '2px solid rgba(212,175,55,0.2)',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.3)',
          }}
        >
          {/* Header — Specimen Designation */}
          <div
            style={{ 
              background: 'linear-gradient(180deg, rgba(5,5,16,0.6), transparent)',
              padding: 'var(--space-sm) var(--space-lg)',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: 'rgba(212,175,55,0.4)', fontSize: '10px' }}>✦</span>
              <span 
                className="text-game-micro uppercase tracking-[0.2em] font-display font-bold"
                style={{ color: 'rgba(212,175,55,0.5)' }}
              >
                Sigil Registry
              </span>
            </div>
            <div className="h-px mb-2" style={{ background: 'linear-gradient(to right, rgba(212,175,55,0.2), transparent)' }} />
            <h3 
              className="text-game-heading font-black font-display tracking-wide"
              style={{ color: 'rgba(212,175,55,0.9)' }}
            >
              {card.name}
            </h3>
            <div className="flex items-center justify-between mt-1">
              <p
                className="text-game-micro uppercase tracking-widest font-display font-bold"
                style={{ color: accentColor }}
              >
                {classification}
              </p>
              <span 
                className="text-game-micro uppercase tracking-widest font-display font-bold"
                style={{ color: 'rgba(212,175,55,0.35)' }}
              >
                T{card.tier} · {card.rarity}
              </span>
            </div>
          </div>

          {/* Separator */}
          <div className="mx-4 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.15), transparent)' }} />

          {/* Card Image */}
          {card.imagePath && (
            <div
              className="relative w-full"
              style={{ background: 'rgba(5,5,16,0.5)' }}
            >
              <img
                src={card.imagePath}
                alt={card.name}
                className="w-full object-cover"
                style={{ aspectRatio: '1 / 1', display: 'block' }}
              />
              {/* Image vignette */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{ 
                  background: `
                    linear-gradient(to top, rgba(5,5,16,0.6) 0%, transparent 30%),
                    linear-gradient(to bottom, rgba(5,5,16,0.4) 0%, transparent 20%),
                    radial-gradient(ellipse at center, transparent 50%, rgba(5,5,16,0.3) 100%)
                  `,
                }}
              />
            </div>
          )}

          {/* Separator */}
          <div className="mx-4 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.15), transparent)' }} />

          {/* Combat Statistics */}
          <div style={{ padding: 'var(--space-sm) var(--space-lg)' }}>
            <div 
              className="text-game-micro uppercase tracking-[0.15em] mb-2 font-display font-bold"
              style={{ color: 'rgba(212,175,55,0.4)' }}
            >
              ◆ Combat Statistics
            </div>
            <div className="grid grid-cols-3 gap-2">
              <StatBox icon="⚔" label="DMG" value={card.baseStats.attack} color="#ef4444" />
              <StatBox icon="⏱" label="CD" value={`${card.cooldown ?? 0}s`} color="#60a5fa" />
              {isConstruct && (
                <StatBox icon="♥" label="HP" value={card.baseStats.hp} color="#4ade80" />
              )}
              <StatBox icon="⚡" label="SPD" value={card.baseStats.speed} color="#fbbf24" />
            </div>
          </div>

          {/* Status Effect */}
          {statusEffect && effectMeta && (
            <>
              <div className="mx-4 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.1), transparent)' }} />
              <div style={{ padding: 'var(--space-sm) var(--space-lg)' }}>
                <div 
                  className="text-game-micro uppercase tracking-[0.15em] mb-2 font-display font-bold"
                  style={{ color: 'rgba(212,175,55,0.4)' }}
                >
                  ◆ Applied Effect
                </div>
                <div
                  className="flex items-center gap-3 rounded-md"
                  style={{
                    padding: 'var(--space-xs) var(--space-sm)',
                    backgroundColor: `${effectMeta.color}0a`,
                    border: `1px solid ${effectMeta.color}30`,
                  }}
                >
                  <span style={{ fontSize: 'clamp(18px, 2vw, 24px)' }}>{effectMeta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-game-caption font-black" style={{ color: effectMeta.color }}>
                        {effectMeta.label}
                      </span>
                    </div>
                    <div className="flex gap-3 mt-0.5">
                      <span className="text-game-micro text-white/60 font-mono">
                        {statusEffect.damagePerTick} dmg / {statusEffect.tickInterval}s
                      </span>
                      <span className="text-game-micro text-white/40 font-mono">
                        {statusEffect.duration}s duration
                      </span>
                    </div>
                    {statusEffect.flavorText && (
                      <p className="text-game-micro italic mt-1 leading-snug" style={{ color: 'rgba(212,175,55,0.4)' }}>
                        "{statusEffect.flavorText}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Abilities */}
          {card.abilities.length > 0 && (
            <>
              <div className="mx-4 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.1), transparent)' }} />
              <div style={{ padding: 'var(--space-sm) var(--space-lg)' }}>
                <div 
                  className="text-game-micro uppercase tracking-[0.15em] mb-2 font-display font-bold"
                  style={{ color: 'rgba(212,175,55,0.4)' }}
                >
                  ◆ Abilities
                </div>
                {card.abilities.map((ability) => (
                  <div key={ability.id} className="mb-2 last:mb-0">
                    <div className="flex items-center gap-2">
                      <span style={{ color: 'rgba(212,175,55,0.5)' }}>✦</span>
                      <span className="text-game-caption font-bold" style={{ color: 'rgba(212,175,55,0.8)' }}>
                        {ability.name}
                      </span>
                      {ability.trigger && (
                        <span className="text-game-micro text-white/25 font-mono uppercase">
                          {ability.trigger}
                        </span>
                      )}
                    </div>
                    <p className="text-game-micro text-white/50 ml-5 mt-0.5 leading-relaxed">
                      {ability.description}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Properties / Tags */}
          <div className="mx-4 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.1), transparent)' }} />
          <div style={{ padding: 'var(--space-sm) var(--space-lg)' }}>
            <div 
              className="text-game-micro uppercase tracking-[0.15em] mb-2 font-display font-bold"
              style={{ color: 'rgba(212,175,55,0.4)' }}
            >
              ◆ Properties
            </div>
            <div className="flex flex-wrap gap-1.5">
              {card.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-game-micro font-display font-bold uppercase tracking-wider rounded-sm"
                  style={{
                    backgroundColor: 'rgba(212,175,55,0.08)',
                    color: 'rgba(212,175,55,0.7)',
                    border: '1px solid rgba(212,175,55,0.2)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Field Notes / Lore */}
          <div className="mx-4 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.08), transparent)' }} />
          <div 
            style={{ 
              background: 'linear-gradient(180deg, transparent, rgba(5,5,16,0.5))',
              padding: 'var(--space-sm) var(--space-lg)',
            }}
          >
            <div 
              className="text-game-micro uppercase tracking-[0.15em] mb-1.5 font-display font-bold"
              style={{ color: 'rgba(212,175,55,0.3)' }}
            >
              ◆ Field Notes
            </div>
            {card.flavorText && (
              <p className="text-game-micro italic leading-relaxed mb-2" style={{ color: 'rgba(212,175,55,0.45)' }}>
                "{card.flavorText}"
              </p>
            )}
            <p className="text-game-micro text-white/40 leading-relaxed">
              {card.description}
            </p>
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
      className="flex flex-col items-center p-1.5 rounded-md"
      style={{ 
        background: 'radial-gradient(ellipse at center, rgba(74,44,106,0.08) 0%, rgba(5,5,16,0.5) 100%)',
        border: '1px solid rgba(212,175,55,0.1)',
      }}
    >
      <span className="text-game-caption font-bold" style={{ color }}>{icon}</span>
      <span className="text-white font-black text-game-caption">{value}</span>
      <span className="text-game-micro tracking-wider font-display font-bold" style={{ color: 'rgba(212,175,55,0.35)' }}>{label}</span>
    </div>
  );
}

export default CardBottomSheet;
