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

const STATUS_EFFECT_META: Record<string, { icon: string; color: string; label: string }> = {
  burn:     { icon: '🔥', color: '#ef4444', label: 'Burn' },
  freeze:   { icon: '❄️', color: '#60a5fa', label: 'Freeze' },
  poison:   { icon: '☠️', color: '#7cfc00', label: 'Poison' },
  blighted: { icon: '🦠', color: '#a855f7', label: 'Blight' },
  shocked:  { icon: '⚡', color: '#fbbf24', label: 'Shock' },
};

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
  const bgColor = '#1a1a2e';
  const headerBg = '#0a0a12';
  const statusEffect = card.statusEffect;
  const effectMeta = statusEffect ? STATUS_EFFECT_META[statusEffect.type] : null;

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
          maxHeight: '85vh',
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
            maxHeight: 'calc(85vh - 20px)',
            border: '2px solid #222',
            borderTop: 'none',
          }}
        >
          {/* Header - Name & Classification */}
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
            <div className="flex items-center justify-between mt-1">
              <p
                className="text-game-micro uppercase tracking-widest font-mono font-bold"
                style={{ color: accentColor }}
              >
                {classification}
              </p>
              <span className="text-game-micro uppercase tracking-widest text-white/40 font-mono font-bold">
                T{card.tier} · {card.rarity}
              </span>
            </div>
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
                className="w-full object-cover"
                style={{ aspectRatio: '1 / 1', display: 'block' }}
              />
            </div>
          )}

          {/* Combat Statistics - PRIMARY FOCUS */}
          <div style={{ backgroundColor: '#0a0a12', borderBottom: '3px solid #111111', padding: 'var(--space-sm) var(--space-lg)' }}>
            <div className="text-game-micro uppercase tracking-[0.15em] text-white/50 mb-2 font-mono font-bold">
              ▸ Combat Statistics
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

          {/* Status Effect - prominent if present */}
          {statusEffect && effectMeta && (
            <div style={{ borderBottom: '3px solid #111111', padding: 'var(--space-sm) var(--space-lg)' }}>
              <div className="text-game-micro uppercase tracking-[0.15em] text-white/50 mb-2 font-mono font-bold">
                ▸ Applied Effect
              </div>
              <div
                className="flex items-center gap-3 rounded"
                style={{
                  padding: 'var(--space-xs) var(--space-sm)',
                  backgroundColor: `${effectMeta.color}12`,
                  border: `2px solid ${effectMeta.color}40`,
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
                    <span className="text-game-micro text-white/70 font-mono">
                      {statusEffect.damagePerTick} dmg / {statusEffect.tickInterval}s
                    </span>
                    <span className="text-game-micro text-white/50 font-mono">
                      {statusEffect.duration}s duration
                    </span>
                  </div>
                  {statusEffect.flavorText && (
                    <p className="text-game-micro italic text-white/40 mt-1 leading-snug">
                      "{statusEffect.flavorText}"
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Abilities */}
          {card.abilities.length > 0 && (
            <div style={{ borderBottom: '2px solid #222', padding: 'var(--space-sm) var(--space-lg)' }}>
              <div className="text-game-micro uppercase tracking-[0.15em] text-white/50 mb-2 font-mono font-bold">
                ▸ Abilities
              </div>
              {card.abilities.map((ability) => (
                <div key={ability.id} className="mb-2 last:mb-0">
                  <div className="flex items-center gap-2">
                    <span style={{ color: accentColor }} className="font-bold">◆</span>
                    <span className="text-game-caption font-bold text-amber-300">
                      {ability.name}
                    </span>
                    {ability.trigger && (
                      <span className="text-game-micro text-white/30 font-mono uppercase">
                        {ability.trigger}
                      </span>
                    )}
                  </div>
                  <p className="text-game-micro text-white/60 ml-5 mt-0.5 leading-relaxed">
                    {ability.description}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Tags */}
          <div style={{ borderBottom: '2px solid #222', padding: 'var(--space-sm) var(--space-lg)' }}>
            <div className="text-game-micro uppercase tracking-[0.15em] text-white/50 mb-2 font-mono font-bold">
              ▸ Properties
            </div>
            <div className="flex flex-wrap gap-1.5">
              {card.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-game-micro font-mono font-bold"
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

          {/* Lore Section - reduced visual weight */}
          <div style={{ backgroundColor: '#12121f', padding: 'var(--space-sm) var(--space-lg)' }}>
            <div className="text-game-micro uppercase tracking-[0.15em] text-white/30 mb-1.5 font-mono font-bold">
              ▸ Field Notes
            </div>
            {card.flavorText && (
              <p className="text-game-micro italic text-amber-200/60 leading-relaxed mb-2">
                "{card.flavorText}"
              </p>
            )}
            <p className="text-game-micro text-white/50 leading-relaxed">
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
      className="flex flex-col items-center p-1.5"
      style={{ backgroundColor: '#12121f', border: '2px solid #222' }}
    >
      <span className="text-game-caption font-bold" style={{ color }}>{icon}</span>
      <span className="text-white font-black text-game-caption">{value}</span>
      <span className="text-white/50 text-game-micro tracking-wider font-bold">{label}</span>
    </div>
  );
}

export default CardBottomSheet;
