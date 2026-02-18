import { useState, useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { CARD_DEFINITIONS, SYNTHESIS_RECIPES } from '@/data/cards';
import { CardDefinition } from '@/types';

const STATUS_EFFECT_META: Record<string, { icon: string; colorVar: string; label: string }> = {
  burn:     { icon: '🔥', colorVar: 'var(--status-burn)',   label: 'Burn' },
  freeze:   { icon: '❄️', colorVar: 'var(--status-freeze)', label: 'Freeze' },
  poison:   { icon: '☠️', colorVar: 'var(--status-poison)', label: 'Poison' },
  blighted: { icon: '🦠', colorVar: 'var(--status-blight)', label: 'Blight' },
  shocked:  { icon: '⚡', colorVar: 'var(--status-shock)',  label: 'Shock' },
};

const TYPE_LABELS: Record<string, string> = {
  CONSTRUCT: 'Autonomous Construct',
  MINION: 'Animated Entity',
  ESSENCE: 'Catalytic Essence',
  MODIFIER: 'Arcane Modifier',
  SPELL: 'Volatile Incantation',
  CONSUMABLE: 'Consumable Agent',
};

type TierFilter = 'all' | 1 | 2;

export function GrimoireScreen() {
  const setPhase = useGameStore((state) => state.setPhase);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');

  const allCards = useMemo(() => {
    return Object.values(CARD_DEFINITIONS).sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return a.name.localeCompare(b.name);
    });
  }, []);

  const filteredCards = useMemo(() => {
    if (tierFilter === 'all') return allCards;
    return allCards.filter((c) => c.tier === tierFilter);
  }, [allCards, tierFilter]);

  const selectedCard = selectedId ? CARD_DEFINITIONS[selectedId] : null;

  const recipeFor = useMemo(() => {
    if (!selectedCard || selectedCard.tier < 2) return null;
    for (const recipe of Object.values(SYNTHESIS_RECIPES)) {
      if (recipe.output === selectedCard.id) {
        const a = CARD_DEFINITIONS[recipe.inputs[0]];
        const b = CARD_DEFINITIONS[recipe.inputs[1]];
        return { a, b };
      }
    }
    return null;
  }, [selectedCard]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: '#050510' }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between shrink-0 px-6 py-3"
        style={{
          background: 'linear-gradient(to bottom, rgba(10,10,26,0.98), rgba(5,5,16,0.95))',
          borderBottom: '1px solid var(--border-secondary)',
        }}
      >
        <button
          onClick={() => setPhase('start')}
          className="flex items-center gap-2 px-4 py-2 rounded-md font-display tracking-wider transition-all duration-200 cursor-pointer hover:brightness-125"
          style={{
            fontSize: 'clamp(0.75rem, 1.2vw, 0.9rem)',
            color: 'var(--text-gold-secondary)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'rgba(74,44,106,0.1)',
          }}
        >
          <span aria-hidden="true">←</span> Back
        </button>

        <h1
          className="font-display tracking-[0.15em] uppercase"
          style={{
            fontSize: 'clamp(1.2rem, 2.5vw, 1.8rem)',
            color: 'var(--text-gold)',
            textShadow: '0 0 20px rgba(212,175,55,0.3)',
          }}
        >
          ✦ The Grimoire ✦
        </h1>

        <div className="flex gap-2">
          {(['all', 1, 2] as TierFilter[]).map((t) => (
            <button
              key={String(t)}
              onClick={() => setTierFilter(t)}
              className="px-3 py-1.5 rounded font-display tracking-wider transition-all duration-200 cursor-pointer"
              style={{
                fontSize: 'clamp(0.65rem, 1vw, 0.8rem)',
                color: tierFilter === t ? '#e8c555' : 'var(--text-muted)',
                backgroundColor: tierFilter === t ? 'rgba(212,175,55,0.12)' : 'transparent',
                border: `1px solid ${tierFilter === t ? 'rgba(212,175,55,0.4)' : 'var(--border-subtle)'}`,
              }}
            >
              {t === 'all' ? 'All' : `Tier ${t}`}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel — Page grid */}
        <div
          className="shrink-0 overflow-y-auto"
          style={{
            width: '30%',
            background: 'linear-gradient(to right, rgba(10,10,26,0.98), rgba(10,10,26,0.92))',
            borderRight: '1px solid var(--border-subtle)',
          }}
        >
          <div className="p-3">
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {filteredCards.map((card) => (
                <PageCard
                  key={card.id}
                  card={card}
                  isSelected={selectedId === card.id}
                  onClick={() => setSelectedId(card.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right panel — Full detail view */}
        <div className="flex-1 overflow-y-auto">
          {selectedCard ? (
            <DetailView card={selectedCard} recipe={recipeFor} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full opacity-30">
              <span className="font-display" style={{ fontSize: 'clamp(4rem, 8vw, 7rem)', color: 'var(--text-gold-muted)' }}>✦</span>
              <p className="font-display tracking-[0.3em] uppercase mt-4" style={{ fontSize: 'clamp(0.8rem, 1.3vw, 1rem)', color: 'var(--text-gold-muted)' }}>
                Select a page to inspect
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Page Card — matches the GrimoirePage style from crafting
   ═══════════════════════════════════════════════════════ */

function PageCard({ card, isSelected, onClick }: { card: CardDefinition; isSelected: boolean; onClick: () => void }) {
  const accentColor = card.emissiveColor ?? '#ff6a00';
  const imagePath = card.imagePath || '/assets/images/tabletop_1.png';
  const statusEffect = card.statusEffect;

  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden rounded-lg cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:z-10 text-left"
      style={{
        aspectRatio: '3 / 2',
        border: `2px solid ${isSelected ? accentColor : 'rgba(212,175,55,0.3)'}`,
        boxShadow: isSelected
          ? `0 0 20px ${accentColor}55, 0 4px 16px rgba(0,0,0,0.6)`
          : '0 4px 12px rgba(0,0,0,0.5)',
        background: '#050510',
      }}
    >
      {/* Inner ward border */}
      <div
        className="absolute inset-[3px] rounded-sm pointer-events-none z-20"
        style={{ border: `1px solid ${isSelected ? `${accentColor}33` : 'rgba(212,175,55,0.1)'}` }}
      />

      {/* Corner ornaments */}
      {(['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'] as const).map((pos, i) => (
        <div
          key={i}
          className={`absolute ${pos} pointer-events-none select-none z-20`}
          style={{
            color: isSelected ? `${accentColor}99` : 'rgba(212,175,55,0.2)',
            fontSize: 'clamp(8px, 0.9vw, 12px)',
            padding: '1px 3px',
            transform: i === 1 ? 'scaleX(-1)' : i === 2 ? 'scaleY(-1)' : i === 3 ? 'scale(-1)' : undefined,
          }}
        >
          ❧
        </div>
      ))}

      {/* Background image */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={imagePath}
          alt={card.name}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = '/assets/images/tabletop_1.png'; }}
        />
      </div>

      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            linear-gradient(to top, rgba(5,5,16,0.9) 0%, rgba(5,5,16,0.35) 35%, transparent 65%),
            radial-gradient(ellipse at center, transparent 30%, rgba(5,5,16,0.35) 100%)
          `,
        }}
      />

      {/* Selected glow */}
      {isSelected && (
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{ background: `radial-gradient(circle, ${accentColor}18 0%, transparent 60%)` }}
        />
      )}

      {/* Name plate */}
      <div className="absolute left-0 right-0 bottom-0 z-10">
        <div className="mx-2 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.2), transparent)' }} />
        <div className="px-2 py-1.5">
          <h3
            className="font-display font-bold truncate"
            style={{
              fontSize: 'clamp(0.6rem, 0.9vw, 0.8rem)',
              color: isSelected ? '#e8c555' : 'rgba(212,175,55,0.85)',
              textShadow: '0 1px 3px rgba(0,0,0,0.9)',
            }}
          >
            {card.name}
          </h3>
        </div>
      </div>

      {/* Stats overlay */}
      <div
        className="absolute right-1.5 bottom-1.5 flex items-center gap-1.5 z-10"
        style={{ fontSize: 'clamp(0.55rem, 0.8vw, 0.7rem)', fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
      >
        {(card.baseStats.attack > 0 || card.baseStats.hp > 0) ? (
          <>
            <div className="flex items-center gap-0.5">
              <span style={{ color: '#ff6b6b' }}>⚔</span>
              <span className="text-white">{card.baseStats.attack}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <span style={{ color: '#6bff6b' }}>♥</span>
              <span className="text-white">{card.baseStats.hp}</span>
            </div>
          </>
        ) : statusEffect ? (
          <div className="flex items-center gap-0.5 bg-orange-600/80 px-1.5 py-0.5 rounded" style={{ fontSize: 'clamp(0.5rem, 0.7vw, 0.6rem)' }}>
            <span>{STATUS_EFFECT_META[statusEffect.type]?.icon ?? '🔥'}</span>
            <span className="text-white">{statusEffect.damagePerTick}/s</span>
          </div>
        ) : null}
      </div>

      {/* Status effect indicator */}
      {statusEffect && (card.baseStats.attack > 0 || card.baseStats.hp > 0) && (
        <div
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full shadow-lg flex items-center justify-center z-10"
          style={{
            background: 'rgba(212,175,55,0.85)',
            border: '1px solid rgba(212,175,55,0.4)',
            fontSize: '0.6rem',
          }}
        >
          {STATUS_EFFECT_META[statusEffect.type]?.icon ?? '🔥'}
        </div>
      )}

      {/* Rarity sigil */}
      {card.rarity === 'rare' && (
        <div
          className="absolute top-1 left-1.5 pointer-events-none z-10"
          style={{
            color: 'rgba(212,175,55,0.75)',
            fontSize: 'clamp(9px, 1vw, 13px)',
            filter: 'drop-shadow(0 0 4px rgba(212,175,55,0.4))',
          }}
        >
          ✦
        </div>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════
   Detail View — Full-bleed editorial layout
   ═══════════════════════════════════════════════════════ */

function DetailView({ card, recipe }: { card: CardDefinition; recipe: { a: CardDefinition; b: CardDefinition } | null }) {
  const accentColor = card.emissiveColor ?? '#ff6a00';
  const statusEffect = card.statusEffect;
  const effectMeta = statusEffect ? STATUS_EFFECT_META[statusEffect.type] : null;
  const classification = TYPE_LABELS[card.type] ?? card.type;
  const [imgError, setImgError] = useState(false);

  const hasImage = card.imagePath && !imgError;

  return (
    <div className="min-h-full" style={{ background: 'var(--surface-secondary)' }}>

      {/* ── Hero Section ── */}
      <div className="relative" style={{ minHeight: hasImage ? 'clamp(280px, 40vh, 500px)' : '180px' }}>
        {/* Background image */}
        {hasImage && (
          <>
            <img
              src={card.imagePath!}
              alt={card.name}
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
            {/* Overlays */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(5,5,16,1) 0%, rgba(5,5,16,0.7) 35%, rgba(5,5,16,0.2) 60%, rgba(5,5,16,0.3) 100%)' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(5,5,16,0.6) 0%, transparent 40%, transparent 60%, rgba(5,5,16,0.6) 100%)' }} />
          </>
        )}
        {!hasImage && (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accentColor}15 0%, transparent 50%, ${accentColor}08 100%)` }} />
        )}

        {/* Hero content overlay */}
        <div className="relative z-10 flex flex-col justify-end h-full p-8 pb-6" style={{ minHeight: hasImage ? 'clamp(280px, 40vh, 500px)' : '180px' }}>
          {/* Registry label */}
          <div className="flex items-center gap-2 mb-2">
            <span style={{ color: 'var(--text-gold-muted)', fontSize: '10px' }}>✦</span>
            <span className="uppercase tracking-[0.25em] font-display font-bold" style={{ color: 'var(--text-gold-muted)', fontSize: '10px' }}>
              Grimoire Entry — {card.id.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>

          {/* Title */}
          <h2
            className="font-display font-black tracking-wide leading-none"
            style={{
              fontSize: 'clamp(2rem, 4.5vw, 3.5rem)',
              color: 'var(--text-gold)',
              textShadow: '0 2px 20px rgba(0,0,0,0.8), 0 0 40px rgba(212,175,55,0.2)',
            }}
          >
            {card.name}
          </h2>

          {/* Classification line */}
          <div className="flex items-center gap-4 mt-2">
            <span className="uppercase tracking-[0.2em] font-display font-bold" style={{ fontSize: 'clamp(0.65rem, 1vw, 0.85rem)', color: accentColor }}>
              {classification}
            </span>
            <div className="h-px flex-1" style={{ background: `linear-gradient(to right, ${accentColor}60, transparent)`, maxWidth: '200px' }} />
            <span className="uppercase tracking-[0.2em] font-display font-bold" style={{ fontSize: 'clamp(0.6rem, 0.9vw, 0.75rem)', color: 'var(--text-gold-muted)' }}>
              Tier {card.tier} · {card.rarity}
            </span>
          </div>

          {/* Description — prominent, right under title */}
          <p className="mt-4 leading-relaxed" style={{ fontSize: 'clamp(0.85rem, 1.3vw, 1.05rem)', color: 'var(--text-secondary)', maxWidth: '680px' }}>
            {card.description}
          </p>
        </div>
      </div>

      {/* ── Content Grid ── */}
      <div className="p-8 pt-6" style={{ background: 'linear-gradient(to bottom, rgba(5,5,16,1), var(--surface-secondary))' }}>
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))' }}>

          {/* Column 1: Stats + Effect + Recipe */}
          <div className="space-y-5">

            {/* Combat Statistics */}
            {(card.baseStats.hp > 0 || card.baseStats.attack > 0) && (
              <SectionPanel title="Combat Statistics">
                <div className="grid grid-cols-2 gap-2">
                  <StatTile icon="⚔" label="Damage" value={card.baseStats.attack} color="var(--status-damage)" />
                  <StatTile icon="♥" label="Hit Points" value={card.baseStats.hp} color="var(--status-heal)" />
                  <StatTile icon="⚡" label="Speed" value={card.baseStats.speed} color="var(--status-speed)" />
                  <StatTile icon="⏱" label="Cooldown" value={`${card.cooldown ?? 0}s`} color="var(--status-cooldown)" />
                  <StatTile icon="◎" label="Range" value={card.baseStats.range} color="var(--text-gold-secondary)" />
                  <StatTile icon="⚖" label="Mass" value={card.baseStats.mass} color="var(--text-muted)" />
                </div>
              </SectionPanel>
            )}

            {/* Applied Effect */}
            {statusEffect && effectMeta && (
              <SectionPanel title="Applied Effect">
                <div className="flex items-start gap-4">
                  <div
                    className="shrink-0 flex items-center justify-center rounded-lg"
                    style={{
                      width: '52px', height: '52px',
                      backgroundColor: `${effectMeta.colorVar}15`,
                      border: `1px solid ${effectMeta.colorVar}30`,
                    }}
                  >
                    <span style={{ fontSize: '26px' }}>{effectMeta.icon}</span>
                  </div>
                  <div className="flex-1">
                    <span className="font-bold font-display tracking-wide" style={{ color: effectMeta.colorVar, fontSize: 'clamp(1rem, 1.4vw, 1.2rem)' }}>
                      {effectMeta.label}
                    </span>
                    <div className="flex gap-4 mt-1">
                      <span className="font-mono" style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        {statusEffect.damagePerTick} dmg / {statusEffect.tickInterval}s
                      </span>
                      <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                        {statusEffect.duration}s total
                      </span>
                    </div>
                    {statusEffect.flavorText && (
                      <p className="italic mt-2 leading-snug" style={{ color: 'var(--text-gold-muted)', fontSize: '0.95rem' }}>
                        "{statusEffect.flavorText}"
                      </p>
                    )}
                  </div>
                </div>
              </SectionPanel>
            )}

            {/* Recipe */}
            {recipe && (
              <SectionPanel title="Synthesis Recipe">
                <div className="flex items-center gap-3">
                  <RecipeCard card={recipe.a} />
                  <div className="shrink-0 flex flex-col items-center gap-1">
                    <span className="font-display font-bold" style={{ color: 'var(--text-gold)', fontSize: '1.5rem' }}>+</span>
                  </div>
                  <RecipeCard card={recipe.b} />
                </div>
              </SectionPanel>
            )}
          </div>

          {/* Column 2: Abilities + Properties + Lore */}
          <div className="space-y-5">

            {/* Abilities */}
            {card.abilities.length > 0 && (
              <SectionPanel title="Abilities">
                <div className="space-y-3">
                  {card.abilities.map((ability) => (
                    <div key={ability.id} className="rounded-lg p-3" style={{ backgroundColor: 'rgba(74,44,106,0.08)', border: '1px solid var(--border-subtle)' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{ color: accentColor, fontSize: '0.95rem' }}>✦</span>
                        <span className="font-display font-bold tracking-wide" style={{ color: 'var(--text-gold-secondary)', fontSize: 'clamp(1rem, 1.4vw, 1.2rem)' }}>
                          {ability.name}
                        </span>
                        {ability.trigger && (
                          <span
                            className="font-mono uppercase px-1.5 py-0.5 rounded"
                            style={{ color: 'var(--text-muted)', fontSize: '0.8rem', backgroundColor: 'rgba(255,255,255,0.05)' }}
                          >
                            {ability.trigger}
                          </span>
                        )}
                        {ability.cooldown != null && ability.cooldown > 0 && (
                          <span className="font-mono ml-auto" style={{ color: 'var(--status-cooldown)', fontSize: '0.85rem' }}>
                            {ability.cooldown}s CD
                          </span>
                        )}
                      </div>
                      <p className="leading-relaxed" style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.9rem, 1.3vw, 1.05rem)' }}>
                        {ability.description}
                      </p>
                    </div>
                  ))}
                </div>
              </SectionPanel>
            )}

            {/* Properties */}
            <SectionPanel title="Properties">
              <div className="flex flex-wrap gap-2">
                {card.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1.5 font-display font-bold uppercase tracking-[0.15em] rounded"
                    style={{
                      fontSize: '0.85rem',
                      backgroundColor: 'var(--surface-elevated)',
                      color: 'var(--text-gold-secondary)',
                      border: '1px solid var(--border-secondary)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </SectionPanel>

            {/* Field Notes */}
            {card.flavorText && (
              <SectionPanel title="Field Notes">
                <div
                  className="rounded-lg p-4"
                  style={{
                    background: 'linear-gradient(135deg, rgba(74,44,106,0.06) 0%, rgba(212,175,55,0.04) 100%)',
                    borderLeft: `3px solid ${accentColor}40`,
                  }}
                >
                  <p className="italic leading-relaxed" style={{ color: 'var(--text-gold-muted)', fontSize: 'clamp(0.95rem, 1.4vw, 1.15rem)' }}>
                    {card.flavorText}
                  </p>
                </div>
              </SectionPanel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Shared sub-components
   ═══════════════════════════════════════════════════════ */

function SectionPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="font-display font-bold uppercase tracking-[0.2em]" style={{ fontSize: '0.85rem', color: 'var(--text-gold-muted)' }}>
          ◆ {title}
        </span>
        <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, var(--border-secondary), transparent)' }} />
      </div>
      {children}
    </div>
  );
}

function StatTile({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-2.5"
      style={{
        backgroundColor: 'rgba(74,44,106,0.06)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <span style={{ color, fontSize: '1.4rem' }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-black" style={{ color: 'var(--text-primary)', fontSize: 'clamp(1.1rem, 1.6vw, 1.4rem)' }}>{value}</div>
        <div className="font-display uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{label}</div>
      </div>
    </div>
  );
}

function RecipeCard({ card }: { card: CardDefinition }) {
  const [imgErr, setImgErr] = useState(false);
  const accentColor = card.emissiveColor ?? '#ff6a00';

  return (
    <div
      className="flex-1 rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-elevated)' }}
    >
      {/* Mini thumbnail */}
      <div className="relative w-full" style={{ height: '80px', backgroundColor: `${accentColor}10` }}>
        {card.imagePath && !imgErr ? (
          <img src={card.imagePath} alt="" className="w-full h-full object-cover" onError={() => setImgErr(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span style={{ color: accentColor, fontSize: '1.5rem', opacity: 0.3 }}>✦</span>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--surface-elevated) 0%, transparent 60%)' }} />
      </div>
      <div className="px-3 py-2">
        <div className="font-display font-bold tracking-wide truncate" style={{ color: 'var(--text-gold-secondary)', fontSize: '0.8rem' }}>
          {card.name}
        </div>
        <div className="font-display uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)', fontSize: '0.55rem' }}>
          Tier {card.tier} · {card.type}
        </div>
      </div>
    </div>
  );
}
