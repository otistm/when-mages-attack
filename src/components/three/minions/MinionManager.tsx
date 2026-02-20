/**
 * Minion Manager - Renders and manages all active minions
 *
 * Subscribes to a stable ID list (shallow equality) so it only re-renders
 * when minions are added or removed — NOT when they move or change state.
 * Each child reads its own data from the store.
 */

import { memo } from 'react';
import { shallow } from 'zustand/shallow';
import { useCombatStore } from '@/stores/combatStore';
import { Minion } from './Minion';
import { SentientSlime } from './SentientSlime';
import { ToasterMinion } from './ToasterMinion';
import { CactusMinion } from './CactusMinion';
import { BatteryMinion } from './BatteryMinion';
import { MinionStatusVfx } from '../effects/MinionStatusVfx';
import type { CardDefinition } from '@/types';

const TOASTER_IDS = new Set(['toaster', 'burning_toaster']);
const CACTUS_IDS = new Set(['potted_cactus', 'dry_heat_cactus', 'spike_trap']);
const BATTERY_IDS = new Set(['old_battery']);

interface MinionManagerProps {
  onFire: (
    position: [number, number, number],
    damage: number,
    card?: CardDefinition,
    firingTeam?: 'player' | 'enemy'
  ) => void;
}

interface MinionEntry {
  id: string;
  cardDefinitionId: string;
}

export function MinionManager({ onFire }: MinionManagerProps) {
  const minionEntries = useCombatStore((state) => {
    const entries: MinionEntry[] = [];
    state.minions.forEach((m) => {
      if (!m.isConstruct) {
        entries.push({ id: m.id, cardDefinitionId: m.cardDefinitionId });
      }
    });
    return entries;
  }, shallow);

  return (
    <group>
      {minionEntries.map((entry) => (
        <MinionRouter
          key={entry.id}
          id={entry.id}
          cardDefinitionId={entry.cardDefinitionId}
          onFire={onFire}
        />
      ))}
    </group>
  );
}

interface MinionRouterProps {
  id: string;
  cardDefinitionId: string;
  onFire: MinionManagerProps['onFire'];
}

const MinionRouter = memo(function MinionRouter({ id, cardDefinitionId, onFire }: MinionRouterProps) {
  const data = useCombatStore((state) => state.minions.get(id));
  if (!data) return null;

  let minion: React.JSX.Element;

  if (cardDefinitionId === 'sentient_slime') {
    minion = <SentientSlime key={id} data={data} />;
  } else if (cardDefinitionId === 'sentient_slime_mini') {
    minion = <SentientSlime key={id} data={data} sizeScale={0.55} />;
  } else if (TOASTER_IDS.has(cardDefinitionId)) {
    minion = <ToasterMinion key={id} data={data} onFire={onFire} />;
  } else if (CACTUS_IDS.has(cardDefinitionId)) {
    minion = <CactusMinion key={id} data={data} onFire={onFire} />;
  } else if (BATTERY_IDS.has(cardDefinitionId)) {
    minion = <BatteryMinion key={id} data={data} />;
  } else {
    minion = <Minion key={id} data={data} />;
  }

  return (
    <>
      {minion}
      <MinionStatusVfx minionId={id} />
    </>
  );
});

export default MinionManager;
