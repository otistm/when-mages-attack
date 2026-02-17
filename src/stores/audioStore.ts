/**
 * Audio Store - Sound management and playback
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Howl, Howler } from 'howler';

// Sound effect types
type SFXType = 
  | 'hit_light'
  | 'hit_heavy'
  | 'spawn'
  | 'death'
  | 'craft_start'
  | 'craft_complete'
  | 'discovery'
  | 'ui_click'
  | 'ui_hover'
  | 'card_place'
  | 'card_pickup'
  | 'toaster_ding'
  | 'shiv_stab'
  | 'shiv_fly'
  | 'you_win'
  | 'page_select'
  | 'view_page'
  // Exploration sounds
  | 'footstep'
  | 'door_creak'
  | 'paper_rustle'
  | 'drawer_open'
  | 'drawer_close'
  | 'sigil_place'
  | 'sigil_chime'
  | 'music_box'
  | 'key_pickup'
  | 'case_open'
  | 'trap_trigger'
  | 'fire_ignite'
  | 'fire_ambient'
  | 'keeper_awaken'
  | 'keeper_attack'
  | 'keeper_defeated'
  | 'page_acquire'
  | 'ambient_drip'
  | 'ambient_creak';

// Ambient sound types for exploration
type AmbientType =
  | 'office_atmosphere'
  | 'combat_tension'
  | 'victory_calm';

interface AudioState {
  // Volume settings
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  isMuted: boolean;
  
  // Loaded sounds
  sounds: Map<SFXType, Howl>;
  musicTrack: Howl | null;
  ambientLoops: Map<string, Howl>;
  
  // Volume controls
  setMasterVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  toggleMute: () => void;
  
  // Playback
  playSFX: (type: SFXType, options?: PlayOptions) => void;
  playMusic: (trackUrl: string, loop?: boolean) => void;
  stopMusic: () => void;
  
  // Ambient loops (for status effects, environment, etc.)
  playAmbientLoop: (id: string, url: string, fadeInMs?: number, volume?: number) => void;
  stopAmbientLoop: (id: string, fadeOutMs?: number) => void;
  stopAllAmbientLoops: (fadeOutMs?: number) => void;
  
  // Loading
  loadSFX: (type: SFXType, url: string) => void;
  
  // Utility
  playRandomPitch: (type: SFXType, minPitch?: number, maxPitch?: number) => void;
}

interface PlayOptions {
  volume?: number;
  pitch?: number;
  pan?: number; // -1 to 1 for stereo
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set, get) => ({
      masterVolume: 1,
      musicVolume: 0.7,
      sfxVolume: 1,
      isMuted: false,
      sounds: new Map(),
      musicTrack: null,
      ambientLoops: new Map(),

      // Volume controls
      setMasterVolume: (volume) => {
        Howler.volume(volume);
        set({ masterVolume: volume });
      },

      setMusicVolume: (volume) => {
        set({ musicVolume: volume });
        const { musicTrack, isMuted, masterVolume } = get();
        if (musicTrack && !isMuted) {
          musicTrack.volume(volume * masterVolume);
        }
      },

      setSfxVolume: (volume) => {
        set({ sfxVolume: volume });
      },

      toggleMute: () => {
        const isMuted = !get().isMuted;
        Howler.mute(isMuted);
        set({ isMuted });
      },

      // Load a sound effect
      loadSFX: (type, url) => {
        const sound = new Howl({
          src: [url],
          preload: true,
          volume: get().sfxVolume * get().masterVolume,
        });
        
        set((state) => {
          const newSounds = new Map(state.sounds);
          newSounds.set(type, sound);
          return { sounds: newSounds };
        });
      },

      // Play a sound effect
      playSFX: (type, options = {}) => {
        const { sounds, sfxVolume, masterVolume, isMuted } = get();
        const sound = sounds.get(type);
        
        if (!sound || isMuted) return;
        
        const volume = (options.volume ?? 1) * sfxVolume * masterVolume;
        const pitch = options.pitch ?? 1;
        
        const id = sound.play();
        sound.volume(volume, id);
        sound.rate(pitch, id);
        
        if (options.pan !== undefined) {
          sound.stereo(options.pan, id);
        }
      },

      // Play with random pitch (for variety)
      playRandomPitch: (type, minPitch = 0.9, maxPitch = 1.1) => {
        const pitch = minPitch + Math.random() * (maxPitch - minPitch);
        get().playSFX(type, { pitch });
      },

      // Play music
      playMusic: (trackUrl, loop = true) => {
        const { musicTrack, musicVolume, masterVolume, isMuted } = get();
        
        // Stop current track
        if (musicTrack) {
          musicTrack.fade(musicVolume * masterVolume, 0, 1000);
          setTimeout(() => musicTrack.stop(), 1000);
        }
        
        // Start new track
        const newTrack = new Howl({
          src: [trackUrl],
          loop,
          volume: 0,
        });
        
        if (!isMuted) {
          newTrack.play();
          newTrack.fade(0, musicVolume * masterVolume, 1000);
        }
        
        set({ musicTrack: newTrack });
      },

      // Stop music
      stopMusic: () => {
        const { musicTrack, musicVolume, masterVolume } = get();
        if (musicTrack) {
          musicTrack.fade(musicVolume * masterVolume, 0, 1000);
          setTimeout(() => {
            musicTrack.stop();
            set({ musicTrack: null });
          }, 1000);
        }
      },

      // Play a looping ambient sound (e.g. status effects, environment)
      playAmbientLoop: (id, url, fadeInMs = 800, volume = 0.5) => {
        const { ambientLoops, sfxVolume, masterVolume, isMuted } = get();

        // Already playing this loop
        if (ambientLoops.has(id)) return;

        const howl = new Howl({
          src: [url],
          loop: true,
          volume: 0,
        });

        if (!isMuted) {
          howl.play();
          howl.fade(0, volume * sfxVolume * masterVolume, fadeInMs);
        }

        set((state) => {
          const next = new Map(state.ambientLoops);
          next.set(id, howl);
          return { ambientLoops: next };
        });
      },

      // Stop a specific ambient loop with fade-out
      stopAmbientLoop: (id, fadeOutMs = 1000) => {
        const { ambientLoops, sfxVolume, masterVolume } = get();
        const howl = ambientLoops.get(id);
        if (!howl) return;

        const currentVol = howl.volume();
        howl.fade(currentVol, 0, fadeOutMs);
        setTimeout(() => {
          howl.stop();
          howl.unload();
          set((state) => {
            const next = new Map(state.ambientLoops);
            next.delete(id);
            return { ambientLoops: next };
          });
        }, fadeOutMs);
      },

      // Stop all ambient loops
      stopAllAmbientLoops: (fadeOutMs = 1000) => {
        const { ambientLoops } = get();
        ambientLoops.forEach((howl, id) => {
          const currentVol = howl.volume();
          howl.fade(currentVol, 0, fadeOutMs);
          setTimeout(() => {
            howl.stop();
            howl.unload();
          }, fadeOutMs);
        });
        set({ ambientLoops: new Map() });
      },
    }),
    {
      name: 'wta-audio-settings',
      partialize: (state) => ({
        masterVolume: state.masterVolume,
        musicVolume: state.musicVolume,
        sfxVolume: state.sfxVolume,
        isMuted: state.isMuted,
      }),
    }
  )
);

/**
 * Initialize default sounds (call on app start)
 */
export function initializeAudio() {
  const store = useAudioStore.getState();
  
  // Set global volume
  Howler.volume(store.masterVolume);
  
  // Load available sound effects
  store.loadSFX('toaster_ding', '/assets/sounds/toaster_ding.mp3');
  store.loadSFX('shiv_stab', '/assets/sounds/shiv_stab.mp3');
  store.loadSFX('shiv_fly', '/assets/sounds/shiv_fly.mp3');
  store.loadSFX('you_win', '/assets/sounds/you_win.mp3');
  store.loadSFX('page_select', '/assets/sounds/page_select.mp3');
  store.loadSFX('view_page', '/assets/sounds/view_page.mp3');
  
  // Exploration sounds (vertical slice)
  // store.loadSFX('footstep', '/audio/sfx/footstep.mp3');
  // store.loadSFX('paper_rustle', '/audio/sfx/paper_rustle.mp3');
  // store.loadSFX('drawer_open', '/audio/sfx/drawer_open.mp3');
  // store.loadSFX('sigil_chime', '/audio/sfx/sigil_chime.mp3');
  // store.loadSFX('music_box', '/audio/sfx/music_box.mp3');
  // store.loadSFX('trap_trigger', '/audio/sfx/trap_trigger.mp3');
  // store.loadSFX('fire_ignite', '/audio/sfx/fire_ignite.mp3');
  // store.loadSFX('keeper_awaken', '/audio/sfx/keeper_awaken.mp3');
  // store.loadSFX('page_acquire', '/audio/sfx/page_acquire.mp3');
}

/**
 * Audio cues for the vertical slice
 * These functions can be called from components to trigger sounds
 */
export const AudioCues = {
  // Exploration
  onFootstep: () => {
    useAudioStore.getState().playRandomPitch('footstep', 0.9, 1.1);
  },
  
  onInteract: (type: 'drawer' | 'sigil' | 'musicbox' | 'key' | 'case') => {
    const store = useAudioStore.getState();
    switch (type) {
      case 'drawer':
        store.playSFX('drawer_open');
        break;
      case 'sigil':
        store.playSFX('sigil_chime');
        break;
      case 'musicbox':
        store.playSFX('music_box');
        break;
      case 'key':
        store.playSFX('key_pickup');
        break;
      case 'case':
        store.playSFX('case_open');
        break;
    }
  },
  
  // Death sequence
  onTrapTriggered: () => {
    const store = useAudioStore.getState();
    store.playSFX('trap_trigger');
    setTimeout(() => store.playSFX('fire_ignite'), 300);
  },
  
  // Keeper battle
  onKeeperAwaken: () => {
    useAudioStore.getState().playSFX('keeper_awaken');
  },
  
  onKeeperDefeated: () => {
    useAudioStore.getState().playSFX('keeper_defeated');
  },
  
  // Victory
  onPageAcquire: () => {
    useAudioStore.getState().playSFX('page_acquire');
  },
  
  // Discovery
  onDiscovery: () => {
    useAudioStore.getState().playSFX('discovery');
  },
  
  // Toaster fire
  onToasterFire: () => {
    useAudioStore.getState().playRandomPitch('toaster_ding', 0.95, 1.05);
  },
  
  // Shiv fly (on trigger)
  onShivTrigger: () => {
    useAudioStore.getState().playRandomPitch('shiv_fly', 0.9, 1.1);
  },
  
  // Shiv stab (on HP bar collision)
  onShivHit: () => {
    useAudioStore.getState().playRandomPitch('shiv_stab', 0.9, 1.1);
  },
  
  // Win sound
  onWin: () => {
    useAudioStore.getState().playSFX('you_win');
  },
  
  // Page placed into deck slot
  onPageSelect: () => {
    useAudioStore.getState().playRandomPitch('page_select', 0.95, 1.05);
  },
  
  // Full page view displayed
  onViewPage: () => {
    useAudioStore.getState().playSFX('view_page');
  },
  
  // Background music (loops across phases)
  onCraftingStart: () => {
    const store = useAudioStore.getState();
    if (!store.musicTrack) {
      store.playMusic('/assets/sounds/page_crafting.mp3', true);
    }
  },
  
  // Arena voices (layers on top of music during combat)
  onBattleStart: () => {
    useAudioStore.getState().playAmbientLoop('arena_voices', '/assets/sounds/arena_voices.mp3', 1000, 0.6);
  },
  
  onBattleEnd: () => {
    useAudioStore.getState().stopAmbientLoop('arena_voices', 1000);
  },
  
  // Poison status effect ambient
  onPoisonStart: () => {
    useAudioStore.getState().playAmbientLoop('poison_bubbling', '/assets/sounds/caldron_bubbling.mp3', 800, 0.5);
  },
  
  onPoisonEnd: () => {
    useAudioStore.getState().stopAmbientLoop('poison_bubbling', 1500);
  },
  
  // Burn status effect ambient
  onBurnStart: () => {
    useAudioStore.getState().playAmbientLoop('burning', '/assets/sounds/burning.mp3', 800, 0.5);
  },
  
  onBurnEnd: () => {
    useAudioStore.getState().stopAmbientLoop('burning', 1500);
  },
};
