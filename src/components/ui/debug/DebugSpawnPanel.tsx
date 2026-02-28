import { useState, useCallback, useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useCardStore } from '@/stores/cardStore';
import { CARD_DEFINITIONS } from '@/data/cards';
import { CardDefinition } from '@/types';

const MAX_SLOTS = 5;

type CardType = CardDefinition['type'];

const TYPE_ORDER: CardType[] = ['MINION', 'CONSTRUCT', 'SPELL', 'ESSENCE', 'MODIFIER', 'CONSUMABLE'];

const TYPE_COLORS: Record<string, string> = {
  MINION: '#4ade80',
  CONSTRUCT: '#60a5fa',
  SPELL: '#c084fc',
  ESSENCE: '#fb923c',
  MODIFIER: '#facc15',
  CONSUMABLE: '#f87171',
};

interface SlotAssignment {
  cardId: string;
  team: 'player' | 'enemy';
  slotIndex: number;
}

export function DebugSpawnPanel() {
  const isDebugArena = useGameStore((s) => s.isDebugArena);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<CardType | 'ALL'>('ALL');
  const [assignments, setAssignments] = useState<SlotAssignment[]>([]);
  const addCard = useCardStore((s) => s.addCard);
  const removeCard = useCardStore((s) => s.removeCard);

  const allCards = useMemo(() => {
    return Object.values(CARD_DEFINITIONS).sort((a, b) => {
      const ti = TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type);
      if (ti !== 0) return ti;
      return a.name.localeCompare(b.name);
    });
  }, []);

  const filteredCards = useMemo(() => {
    return allCards.filter((c) => {
      if (typeFilter !== 'ALL' && c.type !== typeFilter) return false;
      if (filter && !c.name.toLowerCase().includes(filter.toLowerCase()) && !c.id.toLowerCase().includes(filter.toLowerCase())) return false;
      return true;
    });
  }, [allCards, filter, typeFilter]);

  const getNextSlot = useCallback((team: 'player' | 'enemy') => {
    const used = new Set(
      assignments.filter((a) => a.team === team).map((a) => a.slotIndex)
    );
    for (let i = 0; i < MAX_SLOTS; i++) {
      if (!used.has(i)) return i;
    }
    return -1;
  }, [assignments]);

  const isActive = useCallback((cardId: string, team: 'player' | 'enemy') => {
    return assignments.some((a) => a.cardId === cardId && a.team === team);
  }, [assignments]);

  const toggleCard = useCallback((card: CardDefinition, team: 'player' | 'enemy') => {
    const existing = assignments.find((a) => a.cardId === card.id && a.team === team);
    if (existing) {
      removeCard(existing.slotIndex, team);
      setAssignments((prev) => prev.filter((a) => !(a.cardId === card.id && a.team === team)));
    } else {
      const slot = getNextSlot(team);
      if (slot === -1) return;
      addCard(slot, card, team);
      setAssignments((prev) => [...prev, { cardId: card.id, team, slotIndex: slot }]);
    }
  }, [assignments, addCard, removeCard, getNextSlot]);

  const clearAll = useCallback(() => {
    const store = useCardStore.getState();
    store.clearAll();
    setAssignments([]);
  }, []);

  if (!isDebugArena) return null;

  const playerCount = assignments.filter((a) => a.team === 'player').length;
  const enemyCount = assignments.filter((a) => a.team === 'enemy').length;

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed top-3 right-3 z-[9999] px-3 py-1.5 rounded-md text-xs font-mono cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95 select-none"
        style={{
          background: open ? 'rgba(212,175,55,0.25)' : 'rgba(20,20,40,0.85)',
          border: `1px solid ${open ? 'rgba(212,175,55,0.6)' : 'rgba(255,255,255,0.15)'}`,
          color: open ? '#e8c555' : 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {open ? 'Close' : 'Spawn'} Panel
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed top-12 right-3 z-[9998] flex flex-col rounded-lg overflow-hidden select-none"
          style={{
            width: '340px',
            maxHeight: 'calc(100vh - 80px)',
            background: 'rgba(10,10,26,0.95)',
            border: '1px solid rgba(212,175,55,0.2)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="text-xs font-mono" style={{ color: '#d4af37', letterSpacing: '0.1em' }}>
              DEBUG SPAWN PANEL
            </span>
            <div className="flex gap-2 text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <span style={{ color: '#60a5fa' }}>P:{playerCount}/{MAX_SLOTS}</span>
              <span style={{ color: '#f87171' }}>E:{enemyCount}/{MAX_SLOTS}</span>
            </div>
          </div>

          {/* Search + filter */}
          <div className="px-3 py-2 flex gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <input
              type="text"
              placeholder="Search pages..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="flex-1 px-2 py-1 rounded text-xs font-mono outline-none"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.8)',
              }}
            />
            <button
              onClick={clearAll}
              className="px-2 py-1 rounded text-[10px] font-mono cursor-pointer transition-colors"
              style={{
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171',
              }}
            >
              Clear
            </button>
          </div>

          {/* Type filter tabs */}
          <div className="px-3 py-1.5 flex gap-1 flex-wrap" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <TypeTab label="All" active={typeFilter === 'ALL'} onClick={() => setTypeFilter('ALL')} color="rgba(255,255,255,0.5)" />
            {TYPE_ORDER.map((t) => (
              <TypeTab
                key={t}
                label={t.charAt(0) + t.slice(1).toLowerCase()}
                active={typeFilter === t}
                onClick={() => setTypeFilter(t)}
                color={TYPE_COLORS[t] || '#888'}
              />
            ))}
          </div>

          {/* Card list */}
          <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
            {filteredCards.map((card) => (
              <CardRow
                key={card.id}
                card={card}
                playerActive={isActive(card.id, 'player')}
                enemyActive={isActive(card.id, 'enemy')}
                playerFull={playerCount >= MAX_SLOTS}
                enemyFull={enemyCount >= MAX_SLOTS}
                onToggle={toggleCard}
              />
            ))}
            {filteredCards.length === 0 && (
              <div className="px-3 py-6 text-center text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                No pages match filter
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function TypeTab({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-all"
      style={{
        background: active ? `${color}20` : 'transparent',
        border: `1px solid ${active ? `${color}60` : 'rgba(255,255,255,0.08)'}`,
        color: active ? color : 'rgba(255,255,255,0.35)',
      }}
    >
      {label}
    </button>
  );
}

function CardRow({
  card,
  playerActive,
  enemyActive,
  playerFull,
  enemyFull,
  onToggle,
}: {
  card: CardDefinition;
  playerActive: boolean;
  enemyActive: boolean;
  playerFull: boolean;
  enemyFull: boolean;
  onToggle: (card: CardDefinition, team: 'player' | 'enemy') => void;
}) {
  const typeColor = TYPE_COLORS[card.type] || '#888';

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 transition-colors"
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        background: playerActive || enemyActive ? 'rgba(255,255,255,0.03)' : 'transparent',
      }}
    >
      {/* Type badge */}
      <span
        className="shrink-0 w-[3px] rounded-full self-stretch"
        style={{ background: typeColor }}
      />

      {/* Card info */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-mono truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
          {card.name}
        </div>
        <div className="text-[9px] font-mono flex gap-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
          <span style={{ color: typeColor }}>{card.type}</span>
          <span>{card.rarity}</span>
          {card.baseStats.attack > 0 && <span>ATK:{card.baseStats.attack}</span>}
          {card.baseStats.hp > 0 && <span>HP:{card.baseStats.hp}</span>}
        </div>
      </div>

      {/* Toggle buttons */}
      <TeamToggle
        label="P"
        active={playerActive}
        disabled={!playerActive && playerFull}
        color="#60a5fa"
        onClick={() => onToggle(card, 'player')}
      />
      <TeamToggle
        label="E"
        active={enemyActive}
        disabled={!enemyActive && enemyFull}
        color="#f87171"
        onClick={() => onToggle(card, 'enemy')}
      />
    </div>
  );
}

function TeamToggle({ label, active, disabled, color, onClick }: {
  label: string;
  active: boolean;
  disabled: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="shrink-0 w-7 h-6 rounded text-[10px] font-mono font-bold cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      style={{
        background: active ? `${color}30` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? `${color}80` : 'rgba(255,255,255,0.1)'}`,
        color: active ? color : 'rgba(255,255,255,0.3)',
      }}
    >
      {label}
    </button>
  );
}
