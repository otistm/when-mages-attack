/**
 * CardLorePanel - 2D overlay panel showing card details
 * 
 * Appears when hovering over a card in the arena or grimoire.
 * Rendered as HTML overlay on top of the 3D scene for legibility.
 * 
 * Layout priority: Combat Stats > Status Effects > Abilities > Lore
 * Styled as a "Sigil Registry" dossier - arcane research document aesthetic.
 * 
 * Uses semantic design system tokens (--surface-*, --text-*, --border-*)
 * from DESIGN_SYSTEM.md. All colors adapt to high-contrast mode automatically.
 */

import { useUIStore } from '@/stores/uiStore';

const STATUS_EFFECT_META: Record<string, { icon: string; colorVar: string; label: string }> = {
  burn:     { icon: '🔥', colorVar: 'var(--status-burn)',   label: 'Burn' },
  freeze:   { icon: '❄️', colorVar: 'var(--status-freeze)', label: 'Freeze' },
  poison:   { icon: '☠️', colorVar: 'var(--status-poison)', label: 'Poison' },
  blighted: { icon: '🦠', colorVar: 'var(--status-blight)', label: 'Blight' },
  shocked:  { icon: '⚡', colorVar: 'var(--status-shock)',  label: 'Shock' },
};

export function CardLorePanel() {
  const hoveredCard = useUIStore((state) => state.hoveredCard);

  if (!hoveredCard) return null;

  const { card, screenPosition: _screenPosition } = hoveredCard;
  const isConstruct = card.type === 'CONSTRUCT';
  
  const classification = isConstruct 
    ? 'Autonomous Construct' 
    : 'Volatile Incantation';

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    right: 'var(--space-md)',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 1000,
    maxHeight: '92vh',
    overflowY: 'auto',
  };

  const accentColor = card.emissiveColor ?? '#ff6a00';
  const statusEffect = card.statusEffect;
  const effectMeta = statusEffect ? STATUS_EFFECT_META[statusEffect.type] : null;

  return (
    <div
      style={{ ...panelStyle, width: 'var(--panel-width)' }}
      className="overflow-hidden pointer-events-none"
    >
      <div
        className="relative"
        style={{
          background: `linear-gradient(180deg, var(--surface-primary) 0%, var(--surface-secondary) 100%)`,
          border: '2px solid var(--border-primary)',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 0 30px rgba(0,0,0,0.3)',
        }}
      >
        {/* Inner ward border */}
        <div 
          className="absolute inset-[4px] rounded-md pointer-events-none z-30"
          style={{ border: '1px solid var(--border-subtle)' }}
          aria-hidden="true"
        />

        {/* Corner ornaments (decorative) */}
        {(['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'] as const).map((pos, i) => (
          <div
            key={i}
            className={`absolute ${pos} pointer-events-none select-none z-30`}
            style={{
              color: 'var(--text-gold-muted)',
              fontSize: 'clamp(11px, 1.2vw, 15px)',
              padding: '1px 4px',
              transform: i === 1 ? 'scaleX(-1)' : i === 2 ? 'scaleY(-1)' : i === 3 ? 'scale(-1)' : undefined,
            }}
            aria-hidden="true"
          >
            ❧
          </div>
        ))}

        {/* Header — Specimen Designation */}
        <div
          style={{ 
            background: `linear-gradient(180deg, var(--surface-secondary), transparent)`,
            padding: 'var(--space-sm) var(--space-md)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span style={{ color: 'var(--text-gold-muted)', fontSize: 'clamp(8px, 0.9vw, 11px)' }} aria-hidden="true">✦</span>
            <span 
              className="text-game-micro uppercase tracking-[0.2em] font-display font-bold"
              style={{ color: 'var(--text-gold-muted)' }}
            >
              Sigil Registry
            </span>
          </div>
          <div className="h-px mb-2" style={{ background: 'linear-gradient(to right, var(--border-secondary), transparent)' }} aria-hidden="true" />
          <h3 
            className="text-game-subheading font-black font-display tracking-wide"
            style={{ color: 'var(--text-gold)' }}
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
              style={{ color: 'var(--text-gold-muted)' }}
            >
              T{card.tier} · {card.rarity}
            </span>
          </div>
        </div>

        {/* Separator */}
        <Separator />

        {/* Card Image */}
        {card.imagePath && (
          <div 
            className="relative w-full"
            style={{ background: 'var(--surface-secondary)' }}
          >
            <img
              src={card.imagePath}
              alt={card.name}
              className="w-full object-cover"
              style={{ 
                aspectRatio: '1 / 1',
                display: 'block',
              }}
            />
            {/* Image vignette */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{ 
                background: `
                  linear-gradient(to top, var(--surface-secondary) 0%, transparent 30%),
                  linear-gradient(to bottom, var(--surface-secondary) 0%, transparent 20%),
                  radial-gradient(ellipse at center, transparent 50%, var(--surface-secondary) 100%)
                `,
              }}
              aria-hidden="true"
            />
          </div>
        )}

        {/* Separator */}
        <Separator />

        {/* Combat Statistics */}
        <div style={{ padding: 'var(--space-sm) var(--space-md)' }}>
          <SectionHeader>Combat Statistics</SectionHeader>
          <div className="grid grid-cols-3 gap-2">
            <StatBox icon="⚔" label="DMG" value={card.baseStats.attack} colorVar="var(--status-damage)" />
            <StatBox icon="⏱" label="CD" value={`${card.cooldown ?? 0}s`} colorVar="var(--status-cooldown)" />
            {isConstruct && (
              <StatBox icon="♥" label="HP" value={card.baseStats.hp} colorVar="var(--status-heal)" />
            )}
            <StatBox icon="⚡" label="SPD" value={card.baseStats.speed} colorVar="var(--status-speed)" />
          </div>
        </div>

        {/* Status Effect */}
        {statusEffect && effectMeta && (
          <>
            <Separator />
            <div style={{ padding: 'var(--space-sm) var(--space-md)' }}>
              <SectionHeader>Applied Effect</SectionHeader>
              <div
                className="flex items-center gap-3 rounded-md"
                style={{
                  padding: 'var(--space-xs) var(--space-sm)',
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ fontSize: 'clamp(18px, 2vw, 24px)' }} aria-hidden="true">{effectMeta.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-game-caption font-black" style={{ color: effectMeta.colorVar }}>
                      {effectMeta.label}
                    </span>
                  </div>
                  <div className="flex gap-3 mt-0.5">
                    <span className="text-game-micro font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {statusEffect.damagePerTick} dmg / {statusEffect.tickInterval}s
                    </span>
                    <span className="text-game-micro font-mono" style={{ color: 'var(--text-muted)' }}>
                      {statusEffect.duration}s duration
                    </span>
                  </div>
                  {statusEffect.flavorText && (
                    <p className="text-game-micro italic mt-1 leading-snug" style={{ color: 'var(--text-gold-muted)' }}>
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
            <Separator />
            <div style={{ padding: 'var(--space-sm) var(--space-md)' }}>
              <SectionHeader>Abilities</SectionHeader>
              {card.abilities.map((ability) => (
                <div key={ability.id} className="mb-2 last:mb-0">
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--text-gold-muted)' }} aria-hidden="true">✦</span>
                    <span className="text-game-caption font-bold" style={{ color: 'var(--text-gold-secondary)' }}>
                      {ability.name}
                    </span>
                    {ability.trigger && (
                      <span className="text-game-micro font-mono uppercase" style={{ color: 'var(--text-muted)' }}>
                        {ability.trigger}
                      </span>
                    )}
                  </div>
                  <p className="text-game-micro ml-5 mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {ability.description}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Properties / Tags */}
        <Separator />
        <div style={{ padding: 'var(--space-sm) var(--space-md)' }}>
          <SectionHeader>Properties</SectionHeader>
          <div className="flex flex-wrap gap-1.5">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-game-micro font-display font-bold uppercase tracking-wider rounded-sm"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  color: 'var(--text-gold-secondary)',
                  border: '1px solid var(--border-secondary)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Field Notes / Lore */}
        <Separator variant="faint" />
        <div 
          style={{ 
            background: `linear-gradient(180deg, transparent, var(--surface-secondary))`,
            padding: 'var(--space-sm) var(--space-md)',
          }}
        >
          <SectionHeader variant="faint">Field Notes</SectionHeader>
          {card.flavorText && (
            <p className="text-game-micro italic leading-relaxed mb-2" style={{ color: 'var(--text-gold-muted)' }}>
              "{card.flavorText}"
            </p>
          )}
          <p className="text-game-micro leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {card.description}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Reusable separator line — arcane gradient divider.
 */
function Separator({ variant = 'normal' }: { variant?: 'normal' | 'faint' }) {
  const bgVar = variant === 'faint' ? 'var(--border-subtle)' : 'var(--border-secondary)';
  return (
    <div
      className="mx-3 h-px"
      style={{ background: `linear-gradient(to right, transparent, ${bgVar}, transparent)` }}
      aria-hidden="true"
    />
  );
}

/**
 * Reusable section header — "◆ SECTION TITLE" in gold display type.
 */
function SectionHeader({ children, variant = 'normal' }: { children: React.ReactNode; variant?: 'normal' | 'faint' }) {
  const colorVar = variant === 'faint' ? 'var(--text-gold-muted)' : 'var(--text-gold-muted)';
  return (
    <div
      className="text-game-micro uppercase tracking-[0.15em] mb-2 font-display font-bold"
      style={{ color: colorVar }}
    >
      <span aria-hidden="true">◆ </span>{children}
    </div>
  );
}

/**
 * Stat display box with icon, value, and label.
 * Uses semantic status color tokens.
 */
function StatBox({ 
  icon, 
  label, 
  value, 
  colorVar, 
}: { 
  icon: string; 
  label: string; 
  value: string | number; 
  colorVar: string;
}) {
  return (
    <div 
      className="flex flex-col items-center p-1.5 rounded-md"
      style={{ 
        background: `radial-gradient(ellipse at center, var(--surface-elevated) 0%, var(--surface-secondary) 100%)`,
        border: '1px solid var(--border-subtle)',
      }}
    >
      <span className="text-game-caption font-bold" style={{ color: colorVar }} aria-hidden="true">{icon}</span>
      <span className="text-game-caption font-black" style={{ color: 'var(--text-primary)' }}>{value}</span>
      <span className="text-game-micro tracking-wider font-display font-bold" style={{ color: 'var(--text-gold-muted)' }}>{label}</span>
    </div>
  );
}

export default CardLorePanel;
