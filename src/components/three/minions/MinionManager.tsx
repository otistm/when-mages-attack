/**
 * Minion Manager - Renders and manages all active minions
 * Uses combatStore to track minion state
 */

import { useCombatStore } from '@/stores/combatStore';
import { Minion } from './Minion';

export function MinionManager() {
  const minions = useCombatStore((state) => state.minions);
  
  // Convert Map to array for rendering
  const minionArray = Array.from(minions.values());
  
  return (
    <group>
      {minionArray.map((minion) => (
        <Minion key={minion.id} data={minion} />
      ))}
    </group>
  );
}

export default MinionManager;
