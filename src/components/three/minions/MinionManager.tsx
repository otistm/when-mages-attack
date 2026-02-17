/**
 * Minion Manager - Renders and manages all active minions
 * Uses combatStore to track minion state.
 * Routes to specialised 3D components based on cardDefinitionId.
 */

import { useCombatStore } from '@/stores/combatStore';
import { Minion } from './Minion';
import { SentientSlime } from './SentientSlime';
import { ToasterMinion } from './ToasterMinion';
import { CactusMinion } from './CactusMinion';
import type { CardDefinition } from '@/types';

const TOASTER_IDS = new Set(['toaster', 'burning_toaster']);
const CACTUS_IDS = new Set(['potted_cactus', 'dry_heat_cactus', 'spike_trap']);

interface MinionManagerProps {
  onFire: (
    position: [number, number, number],
    damage: number,
    card?: CardDefinition,
    firingTeam?: 'player' | 'enemy'
  ) => void;
}

export function MinionManager({ onFire }: MinionManagerProps) {
  const minions = useCombatStore((state) => state.minions);
  
  // Convert Map to array, skip constructs (they have their own visual components)
  const minionArray = Array.from(minions.values()).filter(m => !m.isConstruct);
  
  return (
    <group>
      {minionArray.map((minion) => {
        // Route to specialised minion components
        if (minion.cardDefinitionId === 'sentient_slime') {
          return <SentientSlime key={minion.id} data={minion} />;
        }
        if (minion.cardDefinitionId === 'sentient_slime_mini') {
          return <SentientSlime key={minion.id} data={minion} sizeScale={0.55} />;
        }

        // Toaster: walks to center, fires toast
        if (TOASTER_IDS.has(minion.cardDefinitionId)) {
          return <ToasterMinion key={minion.id} data={minion} onFire={onFire} />;
        }

        // Cactus: stationary, fires needles radially
        if (CACTUS_IDS.has(minion.cardDefinitionId)) {
          return <CactusMinion key={minion.id} data={minion} onFire={onFire} />;
        }

        // Default fallback for other minion types
        return <Minion key={minion.id} data={minion} />;
      })}
    </group>
  );
}

export default MinionManager;
