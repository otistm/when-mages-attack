/**
 * Wave/Round Progression System
 *
 * Defines how enemy difficulty scales across rounds within a run.
 * Each wave configures the enemy card pool, stat multipliers, and
 * optional boss encounters.
 */

export interface WaveConfig {
  /** 1-based wave number */
  wave: number;
  /** Display name (e.g. "Wave 1", "Boss: The Archivist") */
  name: string;
  /** Multiplier applied to all enemy stats */
  statMultiplier: number;
  /** Number of enemy card slots active (1-5) */
  enemySlots: number;
  /** Allowed enemy card pool (definition IDs). Empty = all cards. */
  enemyPool: string[];
  /** Whether this wave has a boss */
  isBoss: boolean;
  /** Boss card definition ID (if isBoss) */
  bossId?: string;
  /** Gold reward for completing this wave */
  goldReward: number;
  /** Experience reward */
  expReward: number;
}

export const WAVE_CONFIGS: WaveConfig[] = [
  {
    wave: 1,
    name: 'Wave 1',
    statMultiplier: 1.0,
    enemySlots: 3,
    enemyPool: [],
    isBoss: false,
    goldReward: 5,
    expReward: 10,
  },
  {
    wave: 2,
    name: 'Wave 2',
    statMultiplier: 1.15,
    enemySlots: 4,
    enemyPool: [],
    isBoss: false,
    goldReward: 7,
    expReward: 15,
  },
  {
    wave: 3,
    name: 'Wave 3',
    statMultiplier: 1.3,
    enemySlots: 5,
    enemyPool: [],
    isBoss: false,
    goldReward: 10,
    expReward: 20,
  },
  {
    wave: 4,
    name: 'Wave 4',
    statMultiplier: 1.5,
    enemySlots: 5,
    enemyPool: [],
    isBoss: false,
    goldReward: 12,
    expReward: 25,
  },
  {
    wave: 5,
    name: 'The Archivist',
    statMultiplier: 2.0,
    enemySlots: 5,
    enemyPool: [],
    isBoss: true,
    bossId: 'archivist',
    goldReward: 25,
    expReward: 50,
  },
];

export function getWaveConfig(wave: number): WaveConfig {
  if (wave <= 0) return WAVE_CONFIGS[0];
  if (wave > WAVE_CONFIGS.length) {
    // Infinite scaling for waves beyond the defined set
    const lastWave = WAVE_CONFIGS[WAVE_CONFIGS.length - 1];
    const extraWaves = wave - WAVE_CONFIGS.length;
    return {
      ...lastWave,
      wave,
      name: `Wave ${wave}`,
      statMultiplier: lastWave.statMultiplier + extraWaves * 0.25,
      isBoss: wave % 5 === 0,
      goldReward: lastWave.goldReward + extraWaves * 3,
      expReward: lastWave.expReward + extraWaves * 10,
    };
  }
  return WAVE_CONFIGS[wave - 1];
}

export function getTotalWaves(): number {
  return WAVE_CONFIGS.length;
}
