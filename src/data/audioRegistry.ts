/**
 * Audio Registry — maps card/minion IDs to sound effects.
 *
 * Per-card SFX: When a card triggers (fires, attacks, spawns), the system
 * looks up the appropriate sound here instead of hardcoding it.
 *
 * UI sounds: Phase transitions, button clicks, hover, etc.
 */

import { ASSETS } from './constants';

export interface CardAudioConfig {
  /** Sound on card cooldown completing / firing */
  onFire?: string;
  /** Sound on projectile hitting a target */
  onHit?: string;
  /** Sound on minion spawning */
  onSpawn?: string;
  /** Sound on minion death */
  onDeath?: string;
  /** Pitch variance [min, max] for variety */
  pitchRange?: [number, number];
}

const cardAudioMap = new Map<string, CardAudioConfig>();

export function registerCardAudio(cardId: string, config: CardAudioConfig): void {
  cardAudioMap.set(cardId, config);
}

export function getCardAudio(cardId: string): CardAudioConfig | undefined {
  return cardAudioMap.get(cardId);
}

// ─── BUILT-IN CARD AUDIO ──────────────────────────────────────────────────────

registerCardAudio('toaster', {
  onFire: ASSETS.sounds.toasterDing,
  pitchRange: [0.95, 1.05],
});

registerCardAudio('burning_toaster', {
  onFire: ASSETS.sounds.toasterDing,
  pitchRange: [0.8, 1.0],
});

registerCardAudio('rusty_shiv', {
  onFire: ASSETS.sounds.shivFly,
  onHit: ASSETS.sounds.shivStab,
  pitchRange: [0.9, 1.1],
});

registerCardAudio('frozen_quill', {
  onFire: ASSETS.sounds.shivFly,
  onHit: ASSETS.sounds.shivStab,
  pitchRange: [1.0, 1.2],
});

// ─── UI SOUND CUES ────────────────────────────────────────────────────────────

export const UI_SOUNDS = {
  buttonClick: { type: 'ui_click' as const },
  buttonHover: { type: 'ui_hover' as const },
  cardPickup: { type: 'card_pickup' as const },
  cardPlace: { type: 'card_place' as const },
  phaseTransition: { type: 'craft_complete' as const },
  discovery: { type: 'discovery' as const },
} as const;

// ─── AMBIENT MUSIC TRACKS ─────────────────────────────────────────────────────

export const MUSIC_TRACKS = {
  crafting: ASSETS.sounds.pageCrafting,
  combat: ASSETS.sounds.arenaVoices,
  victory: ASSETS.sounds.youWin,
} as const;
