/**
 * Asset Preloader — loads critical images, audio, and models before they're needed.
 * Call preloadPhaseAssets() during phase transitions to warm the cache.
 */

import { ASSETS } from '@/data/constants';

type PreloadStatus = 'idle' | 'loading' | 'done' | 'error';

interface PreloadEntry {
  url: string;
  status: PreloadStatus;
}

const registry = new Map<string, PreloadEntry>();

function preloadImage(url: string): Promise<void> {
  if (registry.get(url)?.status === 'done') return Promise.resolve();

  registry.set(url, { url, status: 'loading' });

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      registry.set(url, { url, status: 'done' });
      resolve();
    };
    img.onerror = () => {
      registry.set(url, { url, status: 'error' });
      resolve();
    };
    img.src = url;
  });
}

function preloadAudio(url: string): Promise<void> {
  if (registry.get(url)?.status === 'done') return Promise.resolve();

  registry.set(url, { url, status: 'loading' });

  return new Promise((resolve) => {
    const audio = new Audio();
    audio.oncanplaythrough = () => {
      registry.set(url, { url, status: 'done' });
      resolve();
    };
    audio.onerror = () => {
      registry.set(url, { url, status: 'error' });
      resolve();
    };
    audio.preload = 'auto';
    audio.src = url;
  });
}

/**
 * Preload assets for a given game phase.
 * Non-blocking — fires off loads and returns a promise.
 */
export async function preloadPhaseAssets(phase: string): Promise<void> {
  const tasks: Promise<void>[] = [];

  switch (phase) {
    case 'start':
      tasks.push(preloadImage(ASSETS.images.magesStart));
      tasks.push(preloadAudio(ASSETS.sounds.magesStart));
      break;

    case 'allegiance':
      tasks.push(preloadImage(ASSETS.mages('ren')));
      tasks.push(preloadImage(ASSETS.mages('ignis_the_reckless_pyromancer')));
      tasks.push(preloadImage(ASSETS.mages('morrigan_the_blight_weaver')));
      tasks.push(preloadImage(ASSETS.mages('volta_storm_conductor')));
      tasks.push(preloadImage(ASSETS.mages('orin_the_iron_sage')));
      tasks.push(preloadImage(ASSETS.mages('sable_the_void_whisperer')));
      tasks.push(preloadImage(ASSETS.mages('lumi_the_gilded_alchemist')));
      break;

    case 'crafting':
      tasks.push(preloadAudio(ASSETS.sounds.pageSelect));
      tasks.push(preloadAudio(ASSETS.sounds.viewPage));
      break;

    case 'combat':
      tasks.push(preloadAudio(ASSETS.sounds.toasterDing));
      tasks.push(preloadAudio(ASSETS.sounds.shivStab));
      tasks.push(preloadAudio(ASSETS.sounds.shivFly));
      tasks.push(preloadAudio(ASSETS.sounds.arenaVoices));
      tasks.push(preloadAudio(ASSETS.sounds.youWin));
      break;
  }

  await Promise.allSettled(tasks);
}

/**
 * Preload a batch of image URLs (e.g. card images).
 */
export async function preloadImages(urls: string[]): Promise<void> {
  await Promise.allSettled(urls.map(preloadImage));
}

export function getPreloadStatus(url: string): PreloadStatus {
  return registry.get(url)?.status ?? 'idle';
}
