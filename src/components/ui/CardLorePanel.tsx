/**
 * CardLorePanel - 2D overlay panel showing card lore/details
 * 
 * Appears when hovering over a card in the arena.
 * Rendered as HTML overlay on top of the 3D scene for legibility.
 * 
 * Styled as a "Grimoire Entry" - arcane research document aesthetic.
 */

import { useUIStore } from '@/stores/uiStore';

export function CardLorePanel() {
  const hoveredCard = useUIStore((state) => state.hoveredCard);

  if (!hoveredCard) return null;

  const { card, screenPosition: _screenPosition } = hoveredCard;
  const isConstruct = card.type === 'CONSTRUCT';
  
  // Classification based on card type
  const classification = isConstruct 
    ? 'Autonomous Construct' 
    : 'Volatile Incantation';

  // Position the panel on the right side of the screen
  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    right: 20,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 1000,
  };

  // Cel-shaded panel - flat colors, black borders
  const accentColor = card.emissiveColor ?? '#ff6a00';
  const bgColor = '#1a1a2e';
  const headerBg = '#0a0a12';

  return (
    <div
      style={panelStyle}
      className="w-72 overflow-hidden pointer-events-none"
    >
      {/* Cel-shaded Panel - flat background with thick black border */}
      <div
        className="relative"
        style={{
          backgroundColor: bgColor,
          border: '4px solid #111111',
          borderRadius: '4px',
        }}
      >
        {/* Header - flat solid color */}
        <div
          className="px-4 py-3"
          style={{ backgroundColor: headerBg, borderBottom: '3px solid #111111' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-2 h-2"
              style={{ backgroundColor: accentColor }}
            />
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-mono font-bold">
              Sigil Registry
            </span>
          </div>
          <h3 className="text-xl font-black text-white tracking-wide">
            {card.name}
          </h3>
          <p
            className="text-[11px] uppercase tracking-widest font-mono font-bold mt-1"
            style={{ color: accentColor }}
          >
            {classification}
          </p>
        </div>

        {/* Flavor Text - flat background */}
        <div 
          className="px-4 py-3" 
          style={{ backgroundColor: '#12121f', borderBottom: '2px solid #222' }}
        >
          <p className="text-sm italic text-amber-200 leading-relaxed">
            "{card.flavorText}"
          </p>
        </div>

        {/* Technical Description */}
        <div className="px-4 py-3" style={{ borderBottom: '2px solid #222' }}>
          <div className="text-[9px] uppercase tracking-[0.15em] text-white/50 mb-2 font-mono font-bold">
            ▸ Research Notes
          </div>
          <p className="text-[13px] text-white/80 leading-relaxed">
            {card.description}
          </p>
        </div>

        {/* Tags - flat pills with solid borders */}
        <div className="px-4 py-3" style={{ borderBottom: '2px solid #222' }}>
          <div className="text-[9px] uppercase tracking-[0.15em] text-white/50 mb-3 font-mono font-bold">
            ▸ Arcane Properties
          </div>
          <div className="flex flex-wrap gap-2">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 text-[11px] font-mono font-bold"
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
          <div className="px-4 py-3" style={{ borderBottom: '2px solid #222' }}>
            <div className="text-[9px] uppercase tracking-[0.15em] text-white/50 mb-3 font-mono font-bold">
              ▸ Documented Behaviors
            </div>
            {card.abilities.map((ability) => (
              <div key={ability.id} className="mb-3 last:mb-0">
                <div className="flex items-center gap-2">
                  <span style={{ color: accentColor }} className="font-bold">◆</span>
                  <span className="text-[13px] font-bold text-amber-300">
                    {ability.name}
                  </span>
                </div>
                <p className="text-[12px] text-white/60 ml-5 mt-1 leading-relaxed">
                  {ability.description}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Combat Statistics - flat boxes */}
        <div className="px-4 py-3" style={{ backgroundColor: '#0a0a12' }}>
          <div className="text-[9px] uppercase tracking-[0.15em] text-white/50 mb-3 font-mono font-bold">
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

        {/* Footer - flat */}
        <div
          className="px-4 py-2 flex items-center justify-between text-[10px]"
          style={{ backgroundColor: headerBg, borderTop: '3px solid #111111' }}
        >
          <span className="uppercase tracking-widest text-white/60 font-mono font-bold">
            Tier {card.tier} · {card.rarity}
          </span>
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2"
              style={{ backgroundColor: '#4ade80' }}
            />
            <span className="uppercase tracking-widest text-green-400 font-mono font-bold">
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: string; 
  label: string; 
  value: string | number; 
  color: string;
}) {
  // Cel-shaded stat box - flat color with black border
  return (
    <div 
      className="flex flex-col items-center p-2"
      style={{ 
        backgroundColor: '#12121f', 
        border: '2px solid #222' 
      }}
    >
      <span className="text-base font-bold" style={{ color }}>{icon}</span>
      <span className="text-white font-black text-sm mt-1">{value}</span>
      <span className="text-white/60 text-[8px] tracking-wider font-bold">{label}</span>
    </div>
  );
}

export default CardLorePanel;
