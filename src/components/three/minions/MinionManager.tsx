/**
 * Minion Manager - Renders and manages all active minions
 * Uses combatStore to track minion state.
 * Routes to specialised 3D components based on cardDefinitionId.
 */

import { useCombatStore } from '@/stores/combatStore';
import { Minion } from './Minion';
import { SentientSlime } from './SentientSlime';

export function MinionManager() {
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
        // Default fallback for other minion types
        return <Minion key={minion.id} data={minion} />;
      })}
    </group>
  );
}

export default MinionManager;
