/**
 * Minion Manager - Renders and manages all active minions
 *
 * Subscribes to a stable ID list (shallow equality) so it only re-renders
 * when minions are added or removed — NOT when they move or change state.
 * Each child reads its own data from the store.
 *
 * Uses the minionRegistry for routing instead of hardcoded switch statements.
 */

import { memo } from 'react';
import { shallow } from 'zustand/shallow';
import { useCombatStore } from '@/stores/combatStore';
import { getMinionTypeConfig } from '@/data/minionRegistry';
import { MinionStatusVfx } from '../effects/MinionStatusVfx';
import type { CardDefinition } from '@/types';

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

  const config = getMinionTypeConfig(cardDefinitionId) ?? getMinionTypeConfig('__fallback__');
  if (!config) return null;

  const Component = config.component;

  return (
    <>
      <Component
        data={data}
        sizeScale={config.sizeScale}
        onFire={config.needsOnFire ? onFire : undefined}
      />
      <MinionStatusVfx minionId={id} />
    </>
  );
});

export default MinionManager;
