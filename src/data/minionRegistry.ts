/**
 * Minion Behavior Registry
 *
 * Maps cardDefinitionId → rendering config so MinionManager can
 * route to the correct component without hard-coded switch statements.
 *
 * To add a new minion type:
 * 1. Create the visual component (e.g. LowPolyMyMinion.tsx)
 * 2. Optionally create a specialized minion component (e.g. MyMinion.tsx)
 * 3. Register it here with registerMinionType()
 * 4. That's it — MinionManager picks it up automatically.
 */

import { ComponentType } from 'react';
import type { CombatMinion } from '@/stores/combatStore';
import type { CardDefinition } from '@/types';

export type MinionOnFire = (
  position: [number, number, number],
  damage: number,
  card?: CardDefinition,
  firingTeam?: 'player' | 'enemy'
) => void;

export type MinionComponentProps = {
  data: CombatMinion;
  sizeScale?: number;
  onFire?: MinionOnFire;
};

export interface MinionTypeConfig {
  /** Unique id — usually matches the cardDefinitionId */
  id: string;
  /** Display name for debugging */
  name: string;
  /** The React component that renders this minion */
  component: ComponentType<MinionComponentProps>;
  /** Movement style (for future data-driven AI) */
  movementStyle: 'walk' | 'hop' | 'roll' | 'stationary' | 'float';
  /** Attack style */
  attackStyle: 'melee' | 'ranged' | 'ram' | 'chain' | 'aoe' | 'none';
  /** Whether onFire prop is needed (ranged attackers in MinionManager) */
  needsOnFire: boolean;
  /** Optional size scale override */
  sizeScale?: number;
}

const registry = new Map<string, MinionTypeConfig>();

export function registerMinionType(config: MinionTypeConfig): void {
  registry.set(config.id, config);
}

export function registerMinionTypes(ids: string[], config: Omit<MinionTypeConfig, 'id'>): void {
  for (const id of ids) {
    registry.set(id, { ...config, id });
  }
}

export function getMinionTypeConfig(cardDefinitionId: string): MinionTypeConfig | undefined {
  return registry.get(cardDefinitionId);
}

export function getAllMinionTypes(): MinionTypeConfig[] {
  return Array.from(registry.values());
}

export { registry as minionTypeRegistry };
