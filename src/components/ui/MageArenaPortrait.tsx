/**
 * MageArenaPortrait - Displays the selected mage's arena portrait
 * positioned at the bottom of the arena viewport, directly above the
 * player's HP bar. Creates the effect of the mage watching the battle
 * from the player's perspective, looking down from above.
 */

import { useGameStore } from '@/stores/gameStore';

export function MageArenaPortrait() {
  const mage = useGameStore((s) => s.selectedMage);

  // Portrait hidden for now
  if (!mage?.arenaImagePath) return null;
  return null;
}

export default MageArenaPortrait;
