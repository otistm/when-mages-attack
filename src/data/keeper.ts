/**
 * The Archivist - Keeper Boss Data
 * The former owner's final creation, made from their own notes and memories
 */

import type { CardDefinition } from '@/types/card';

// The Archivist boss card definition
export const ARCHIVIST_CARD: CardDefinition = {
  id: 'the_archivist',
  name: 'The Archivist',
  description: 'A construct born from ink and memory. It has waited alone for years, protecting what remains of its creator.',
  flavorText: '"You... are not them. But perhaps... you will do."',
  type: 'CONSTRUCT',
  rarity: 'legendary',
  tier: 2,
  tags: ['paper', 'ink', 'guardian', 'boss', 'magical'],
  baseStats: {
    hp: 15,
    maxHp: 15,
    attack: 3,
    speed: 1.2,
    mass: 0.5,
    range: 2,
    attackSpeed: 0.8,
  },
  abilities: [
    {
      id: 'ink_slash',
      name: 'Ink Slash',
      description: 'Papers form into a slashing blade.',
      trigger: 'onAttack',
      powerCost: 0,
    },
    {
      id: 'paper_storm',
      name: 'Paper Storm',
      description: 'Pages swirl outward, damaging all nearby enemies.',
      trigger: 'onCooldown',
      cooldown: 6,
      powerCost: 3,
    },
  ],
  cooldown: 6,
  color: '#d4c5a0',
  emissiveColor: '#8866aa',
  iconPath: '/assets/cards/archivist.png',
};

// Player's starter cards for the tutorial battle
export const TUTORIAL_STARTER_CARDS: CardDefinition[] = [
  {
    id: 'preserved_specimen',
    name: 'Preserved Specimen',
    description: 'A slime creature kept alive in a jar. It wiggles with unexpected vigor.',
    flavorText: '"Still fresh after all these years. Curious." — The Unknown Scholar',
    type: 'CONSTRUCT',
    rarity: 'common',
    tier: 1,
    tags: ['slime', 'specimen', 'tank'],
    baseStats: {
      hp: 6,
      maxHp: 6,
      attack: 2,
      speed: 0.8,
      mass: 0.4,
      range: 1,
      attackSpeed: 0.7,
    },
    abilities: [
      {
        id: 'gooey_resilience',
        name: 'Gooey Resilience',
        description: 'Takes reduced damage from physical attacks.',
        trigger: 'passive',
        powerCost: 0,
      },
    ],
    color: '#44aa66',
    emissiveColor: '#226633',
  },
  {
    id: 'desk_lamp_flame',
    name: 'Desk Lamp Flame',
    description: 'A flame that once lit countless late-night study sessions. Now it burns with purpose.',
    flavorText: '"Let there be light — and heat, and pain for my enemies."',
    type: 'CONSTRUCT',
    rarity: 'common',
    tier: 1,
    tags: ['fire', 'light', 'glass_cannon'],
    baseStats: {
      hp: 4,
      maxHp: 4,
      attack: 4,
      speed: 1.4,
      mass: 0.2,
      range: 2,
      attackSpeed: 1.2,
    },
    abilities: [
      {
        id: 'burning_touch',
        name: 'Burning Touch',
        description: 'Attacks apply a small burn effect.',
        trigger: 'onHit',
        powerCost: 1,
      },
    ],
    statusEffect: {
      type: 'burn',
      damagePerTick: 1,
      tickInterval: 1.5,
      duration: 3,
      flavorText: 'The flame spreads.',
    },
    color: '#ffaa44',
    emissiveColor: '#ff6622',
  },
];

// Dialogue lines for the Archivist
export const ARCHIVIST_DIALOGUE = {
  awakening: [
    "You've proven clever. Now prove worthy.",
    "So... another seeker. After all this time.",
    "The wards have fallen. Very well.",
  ],
  victory: [
    "You... will continue their work. Take it. Remember... us.",
    "At last... my vigil ends. The Grimoire is yours.",
    "They would have approved. Take what is now yours.",
  ],
  defeat: [
    "Not yet... Try again, young mage.",
    "You lack conviction. Return when you are ready.",
    "The Grimoire will wait. It has waited long already.",
  ],
};

// Get a random dialogue line
export function getArchivistDialogue(phase: keyof typeof ARCHIVIST_DIALOGUE): string {
  const lines = ARCHIVIST_DIALOGUE[phase];
  return lines[Math.floor(Math.random() * lines.length)];
}
