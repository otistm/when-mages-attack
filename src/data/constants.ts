import { StatusEffectType } from '@/types';

// ─── TEAM COLORS ──────────────────────────────────────────────────────────────

export const TEAM_COLORS = {
  player: '#4ade80',
  enemy: '#f87171',
} as const;

export function getTeamColor(team: 'player' | 'enemy'): string {
  return TEAM_COLORS[team];
}

// ─── STATUS EFFECT UI METADATA ────────────────────────────────────────────────

export interface StatusEffectMeta {
  icon: string;
  color: string;
  colorVar: string;
  label: string;
}

export const STATUS_EFFECT_META: Record<StatusEffectType, StatusEffectMeta> = {
  burn:     { icon: '\u{1F525}', color: '#ef4444', colorVar: 'var(--status-burn)',   label: 'Burn' },
  freeze:   { icon: '\u{2744}\u{FE0F}',  color: '#60a5fa', colorVar: 'var(--status-freeze)', label: 'Freeze' },
  poison:   { icon: '\u{2620}\u{FE0F}',  color: '#7cfc00', colorVar: 'var(--status-poison)', label: 'Poison' },
  blighted: { icon: '\u{1F9A0}', color: '#a855f7', colorVar: 'var(--status-blight)', label: 'Blight' },
  shocked:  { icon: '\u{26A1}',  color: '#fbbf24', colorVar: 'var(--status-shock)',  label: 'Shock' },
};

export const STATUS_COLORS_3D: Record<StatusEffectType, number> = {
  burn:     0xff6622,
  freeze:   0x44bbff,
  poison:   0x44ff44,
  blighted: 0xa855f7,
  shocked:  0xffd166,
};

export const STATUS_COLORS_HEX: Record<StatusEffectType, string> = {
  burn:     '#ff6b3d',
  freeze:   '#66ccff',
  poison:   '#6bff66',
  blighted: '#a855f7',
  shocked:  '#ffd166',
};

export const STATUS_PRIORITY: StatusEffectType[] = [
  'shocked',
  'burn',
  'freeze',
  'poison',
  'blighted',
];

// ─── ASSET PATHS ──────────────────────────────────────────────────────────────

export const ASSETS = {
  images: {
    fallback: '/assets/images/tabletop_1.png',
    magesStart: '/assets/images/mages_start.png',
  },
  videos: {
    magesStart: '/assets/videos/mages_start.mp4',
    crafting: '/assets/videos/crafting.mp4',
  },
  sounds: {
    toasterDing: '/assets/sounds/toaster_ding.mp3',
    shivStab: '/assets/sounds/shiv_stab.mp3',
    shivFly: '/assets/sounds/shiv_fly.mp3',
    youWin: '/assets/sounds/you_win.mp3',
    pageSelect: '/assets/sounds/page_select.mp3',
    viewPage: '/assets/sounds/view_page.mp3',
    magesStart: '/assets/sounds/mages_start.mp3',
    pageCrafting: '/assets/sounds/page_crafting.mp3',
    arenaVoices: '/assets/sounds/arena_voices.mp3',
    caldronBubbling: '/assets/sounds/caldron_bubbling.mp3',
    burning: '/assets/sounds/burning.mp3',
    mageIncantation: '/assets/sounds/mage_incantation.mp3',
  },
  models: {
    rustyShiv: '/assets/models/rusty-shiv_cel.glb',
    frozenQuill: '/assets/models/frozen_quill.glb',
    pottedCactus: '/assets/models/potted_cactus.glb',
    sentientSlime: '/assets/models/sentient_slime.glb',
    toaster: '/assets/models/toaster_cel.glb',
  },
  mages: (name: string) => `/assets/images/mages/${name}.png`,
  cardIcon: (name: string) => `/assets/cards/${name}.png`,
  cardImage: (name: string) => `/assets/images/${name}`,
} as const;
