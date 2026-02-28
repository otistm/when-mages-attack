/**
 * Registers all known minion types in the registry.
 * Import this file once at app startup (e.g. from App.tsx).
 */

import { registerMinionType, registerMinionTypes } from './minionRegistry';

// Lazy imports to keep the registry module lightweight
import { Minion } from '@/components/three/minions/Minion';
import { SentientSlime } from '@/components/three/minions/SentientSlime';
import { ToasterMinion } from '@/components/three/minions/ToasterMinion';
import { CactusMinion } from '@/components/three/minions/CactusMinion';
import { BatteryMinion } from '@/components/three/minions/BatteryMinion';
import { MagmaOoze } from '@/components/three/minions/MagmaOoze';

registerMinionType({
  id: 'sentient_slime',
  name: 'Sentient Slime',
  component: SentientSlime,
  movementStyle: 'hop',
  attackStyle: 'ram',
  needsOnFire: false,
});

registerMinionType({
  id: 'sentient_slime_mini',
  name: 'Mini Slime',
  component: SentientSlime,
  movementStyle: 'hop',
  attackStyle: 'ram',
  needsOnFire: false,
  sizeScale: 0.55,
});

registerMinionTypes(['toaster', 'burning_toaster'], {
  name: 'Toaster Minion',
  component: ToasterMinion,
  movementStyle: 'walk',
  attackStyle: 'ranged',
  needsOnFire: true,
});

registerMinionTypes(['potted_cactus', 'dry_heat_cactus', 'spike_trap'], {
  name: 'Cactus Minion',
  component: CactusMinion,
  movementStyle: 'walk',
  attackStyle: 'ranged',
  needsOnFire: true,
});

registerMinionType({
  id: 'magma_ooze',
  name: 'Magma Ooze',
  component: MagmaOoze,
  movementStyle: 'hop',
  attackStyle: 'ram',
  needsOnFire: false,
});

registerMinionType({
  id: 'old_battery',
  name: 'Battery Minion',
  component: BatteryMinion,
  movementStyle: 'roll',
  attackStyle: 'chain',
  needsOnFire: false,
});

// Generic fallback for any unregistered minion type
registerMinionType({
  id: '__fallback__',
  name: 'Generic Minion',
  component: Minion,
  movementStyle: 'walk',
  attackStyle: 'melee',
  needsOnFire: false,
});
