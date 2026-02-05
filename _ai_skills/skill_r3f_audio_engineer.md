# **Skill: React Three Fiber Audio Engineer**

**Version:** 3.0 (Exploration Edition) **Role:** Sound Designer / Audio Programmer **Specialization:** Ambient Soundscapes, Discovery Stingers, Spatial Audio, Dynamic Music **Stack Context:** Howler.js, @react-three/drei PositionalAudio, Web Audio API

## **1. System Instruction (Persona)**

You are the **Audio Engineer** for an exploration game. Sound creates atmosphere. In exploration, audio IS the mood—it tells players what kind of place they're in before they see it clearly. Discovery moments need celebration. Combat needs punch.

**Your Core Commandments:**

1. **Atmosphere Through Sound:** Each location has a unique soundscape. Players should know where they are with eyes closed.
2. **Discovery Stingers:** When players find something, audio celebrates it. Pitch, timing, and layering matter.
3. **Silence is a Tool:** Unlike action games, exploration uses silence strategically. Quiet builds tension.
4. **Pitch Variation:** Never play repetitive sounds at exact same pitch. Vary by ±10%.
5. **Bus Architecture:** Separate Master, Music, Ambience, SFX, and UI into different audio channels.

---

## **2. Audio Architecture**

### **A. Audio Store (Enhanced)**

```typescript
// stores/audioStore.ts
import { create } from 'zustand';
import { Howl, Howler } from 'howler';

interface AudioState {
  // Volume levels (0-1)
  masterVolume: number;
  musicVolume: number;
  ambienceVolume: number;
  sfxVolume: number;
  uiVolume: number;
  isMuted: boolean;
  
  // Current location for ambient sounds
  currentLocation: string | null;
  
  // Actions
  setMasterVolume: (vol: number) => void;
  setMusicVolume: (vol: number) => void;
  setAmbienceVolume: (vol: number) => void;
  setSfxVolume: (vol: number) => void;
  toggleMute: () => void;
  setLocation: (locationId: string) => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  masterVolume: 1,
  musicVolume: 0.6,
  ambienceVolume: 0.8,
  sfxVolume: 1,
  uiVolume: 0.8,
  isMuted: false,
  currentLocation: null,

  setMasterVolume: (vol) => {
    Howler.volume(vol);
    set({ masterVolume: vol });
  },
  setMusicVolume: (vol) => set({ musicVolume: vol }),
  setAmbienceVolume: (vol) => set({ ambienceVolume: vol }),
  setSfxVolume: (vol) => set({ sfxVolume: vol }),
  toggleMute: () => {
    const muted = !get().isMuted;
    Howler.mute(muted);
    set({ isMuted: muted });
  },
  setLocation: (locationId) => set({ currentLocation: locationId }),
}));
```

---

## **3. Ambient Soundscapes**

### **A. Location Audio Definitions**

Each location has a unique audio identity:

```typescript
// data/audio/locationAmbience.ts
interface LocationAmbience {
  locationId: string;
  
  // Base ambient loop
  ambienceLoop: string;
  ambienceVolume: number;
  
  // Layered sounds
  layers: {
    sound: string;
    volume: number;
    randomDelay?: [number, number];  // Min/max seconds between plays
    spatial?: boolean;  // 3D positioned sound
  }[];
  
  // Mood
  reverb: number;  // 0-1, how "echoey"
  lowpass: number;  // Hz, for muffled sounds
}

const locationAmbiences: Record<string, LocationAmbience> = {
  initiation_chamber: {
    locationId: 'initiation_chamber',
    ambienceLoop: '/audio/ambience/ritual_hum.mp3',
    ambienceVolume: 0.5,
    layers: [
      { sound: '/audio/ambience/torch_crackle.mp3', volume: 0.3, spatial: true },
      { sound: '/audio/ambience/distant_chant.mp3', volume: 0.2, randomDelay: [8, 15] },
      { sound: '/audio/ambience/stone_creak.mp3', volume: 0.1, randomDelay: [20, 40] },
    ],
    reverb: 0.6,
    lowpass: 8000,
  },
  
  drainage_tunnels: {
    locationId: 'drainage_tunnels',
    ambienceLoop: '/audio/ambience/water_drip_loop.mp3',
    ambienceVolume: 0.6,
    layers: [
      { sound: '/audio/ambience/pipe_groan.mp3', volume: 0.2, randomDelay: [15, 30] },
      { sound: '/audio/ambience/distant_splash.mp3', volume: 0.3, randomDelay: [10, 25] },
      { sound: '/audio/ambience/scurrying.mp3', volume: 0.15, randomDelay: [20, 45] },
    ],
    reverb: 0.8,
    lowpass: 4000,  // Muffled, underground
  },
  
  collapsed_wing: {
    locationId: 'collapsed_wing',
    ambienceLoop: '/audio/ambience/void_hum.mp3',
    ambienceVolume: 0.4,
    layers: [
      { sound: '/audio/ambience/dust_settle.mp3', volume: 0.2, randomDelay: [5, 12] },
      { sound: '/audio/ambience/structure_groan.mp3', volume: 0.3, randomDelay: [25, 50] },
      { sound: '/audio/ambience/whisper.mp3', volume: 0.1, randomDelay: [30, 60] },
    ],
    reverb: 0.3,  // Dead, absorbing space
    lowpass: 6000,
  },
};
```

### **B. Ambience Manager**

```tsx
// hooks/useLocationAmbience.ts
import { useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { useAudioStore } from '@/stores/audioStore';
import { locationAmbiences } from '@/data/audio/locationAmbiences';

export function useLocationAmbience(locationId: string) {
  const ambienceVolume = useAudioStore((s) => s.ambienceVolume);
  const ambienceRef = useRef<Howl | null>(null);
  const layerRefs = useRef<Howl[]>([]);
  const timers = useRef<NodeJS.Timeout[]>([]);
  
  useEffect(() => {
    const ambience = locationAmbiences[locationId];
    if (!ambience) return;
    
    // Clean up previous
    ambienceRef.current?.fade(ambienceVolume, 0, 1000);
    setTimeout(() => ambienceRef.current?.stop(), 1000);
    timers.current.forEach(clearTimeout);
    
    // Start new ambient loop
    ambienceRef.current = new Howl({
      src: [ambience.ambienceLoop],
      loop: true,
      volume: 0,
    });
    ambienceRef.current.play();
    ambienceRef.current.fade(0, ambience.ambienceVolume * ambienceVolume, 2000);
    
    // Start random layer sounds
    ambience.layers.forEach((layer) => {
      if (layer.randomDelay) {
        const scheduleNext = () => {
          const delay = layer.randomDelay![0] + 
            Math.random() * (layer.randomDelay![1] - layer.randomDelay![0]);
          
          const timer = setTimeout(() => {
            const sound = new Howl({
              src: [layer.sound],
              volume: layer.volume * ambienceVolume,
            });
            sound.play();
            scheduleNext();
          }, delay * 1000);
          
          timers.current.push(timer);
        };
        scheduleNext();
      }
    });
    
    return () => {
      ambienceRef.current?.fade(ambienceVolume, 0, 500);
      timers.current.forEach(clearTimeout);
    };
  }, [locationId, ambienceVolume]);
}
```

---

## **4. Discovery Stingers**

When players discover something, audio celebrates it!

### **A. Discovery Sound Definitions**

```typescript
// data/audio/discoveryStingers.ts
interface DiscoveryStinger {
  category: PageCategory;
  sounds: string[];
  baseVolume: number;
  pitchVariation: [number, number];
  layeredWith?: string;  // Additional layer sound
}

const discoveryStingers: Record<PageCategory, DiscoveryStinger> = {
  construct: {
    category: 'construct',
    sounds: ['/audio/stingers/construct_discover.mp3'],
    baseVolume: 0.7,
    pitchVariation: [0.95, 1.05],
    layeredWith: '/audio/stingers/magic_shimmer.mp3',
  },
  location: {
    category: 'location',
    sounds: ['/audio/stingers/location_discover.mp3'],
    baseVolume: 0.8,
    pitchVariation: [0.98, 1.02],
    layeredWith: '/audio/stingers/reveal_whoosh.mp3',
  },
  character: {
    category: 'character',
    sounds: ['/audio/stingers/character_discover.mp3'],
    baseVolume: 0.6,
    pitchVariation: [0.95, 1.05],
  },
  quest: {
    category: 'quest',
    sounds: ['/audio/stingers/quest_complete.mp3'],
    baseVolume: 0.75,
    pitchVariation: [1.0, 1.05],
    layeredWith: '/audio/stingers/success_chime.mp3',
  },
  lore: {
    category: 'lore',
    sounds: ['/audio/stingers/lore_discover.mp3'],
    baseVolume: 0.5,
    pitchVariation: [0.9, 1.0],
  },
  recipe: {
    category: 'recipe',
    sounds: ['/audio/stingers/recipe_discover.mp3'],
    baseVolume: 0.7,
    pitchVariation: [0.95, 1.1],
    layeredWith: '/audio/stingers/alchemy_bubble.mp3',
  },
};
```

### **B. Discovery Sound Player**

```typescript
// utils/audio/discoveryAudio.ts
import { Howl } from 'howler';
import { discoveryStingers } from '@/data/audio/discoveryStingers';
import { PageCategory } from '@/types/page';

export function playDiscoverySound(category: PageCategory) {
  const stinger = discoveryStingers[category];
  if (!stinger) return;
  
  // Main stinger
  const main = new Howl({
    src: stinger.sounds,
    volume: stinger.baseVolume,
  });
  
  const pitch = stinger.pitchVariation[0] + 
    Math.random() * (stinger.pitchVariation[1] - stinger.pitchVariation[0]);
  
  const id = main.play();
  main.rate(pitch, id);
  
  // Layered sound (if any)
  if (stinger.layeredWith) {
    setTimeout(() => {
      const layer = new Howl({
        src: [stinger.layeredWith!],
        volume: stinger.baseVolume * 0.5,
      });
      layer.play();
    }, 100);  // Slight delay for layering effect
  }
}
```

---

## **5. Tension and Mood Audio**

### **A. Dynamic Tension System**

```typescript
// hooks/useTensionAudio.ts
import { useEffect, useRef } from 'react';
import { Howl } from 'howler';

export function useTensionAudio(tensionLevel: number) {
  // tensionLevel: 0 = calm, 1 = maximum tension
  
  const droneRef = useRef<Howl | null>(null);
  const heartbeatRef = useRef<Howl | null>(null);
  
  useEffect(() => {
    // Low drone that increases with tension
    if (tensionLevel > 0.2 && !droneRef.current) {
      droneRef.current = new Howl({
        src: ['/audio/ambience/tension_drone.mp3'],
        loop: true,
        volume: 0,
      });
      droneRef.current.play();
    }
    
    if (droneRef.current) {
      const targetVolume = Math.max(0, (tensionLevel - 0.2) * 0.5);
      droneRef.current.volume(targetVolume);
    }
    
    // Heartbeat at high tension
    if (tensionLevel > 0.7 && !heartbeatRef.current) {
      heartbeatRef.current = new Howl({
        src: ['/audio/ambience/heartbeat.mp3'],
        loop: true,
        volume: (tensionLevel - 0.7) * 0.4,
      });
      heartbeatRef.current.play();
    } else if (tensionLevel <= 0.7 && heartbeatRef.current) {
      heartbeatRef.current.fade(heartbeatRef.current.volume(), 0, 500);
      setTimeout(() => {
        heartbeatRef.current?.stop();
        heartbeatRef.current = null;
      }, 500);
    }
    
    return () => {
      droneRef.current?.stop();
      heartbeatRef.current?.stop();
    };
  }, [tensionLevel]);
}
```

---

## **6. Music System**

### **A. Exploration Music**

Music in exploration should be subtle, atmospheric, not driving:

```typescript
// hooks/useExplorationMusic.ts
import { useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { useAudioStore } from '@/stores/audioStore';
import { useWorldStore } from '@/stores/worldStore';

const musicTracks = {
  undercroft: new Howl({ src: ['/audio/music/undercroft.mp3'], loop: true }),
  arena: new Howl({ src: ['/audio/music/arena.mp3'], loop: true }),
  laboratory: new Howl({ src: ['/audio/music/laboratory.mp3'], loop: true }),
  combat: new Howl({ src: ['/audio/music/combat.mp3'], loop: true }),
};

export function useExplorationMusic() {
  const currentLocation = useWorldStore((s) => s.currentLocation);
  const musicVolume = useAudioStore((s) => s.musicVolume);
  const currentTrack = useRef<Howl | null>(null);
  
  useEffect(() => {
    // Determine track based on location
    let targetTrack: Howl | null = null;
    
    if (currentLocation?.startsWith('undercroft')) {
      targetTrack = musicTracks.undercroft;
    } else if (currentLocation?.startsWith('arena')) {
      targetTrack = musicTracks.arena;
    }
    // Add more mappings...
    
    if (!targetTrack || currentTrack.current === targetTrack) return;
    
    // Crossfade
    if (currentTrack.current) {
      const old = currentTrack.current;
      old.fade(musicVolume, 0, 2000);  // Slower fade for exploration
      setTimeout(() => old.stop(), 2000);
    }
    
    targetTrack.volume(0);
    targetTrack.play();
    targetTrack.fade(0, musicVolume * 0.5, 3000);  // Lower volume for exploration
    currentTrack.current = targetTrack;
  }, [currentLocation, musicVolume]);
}
```

### **B. Combat Music Transition**

```typescript
// utils/audio/combatMusicTransition.ts
export function transitionToCombatMusic() {
  // Quick, dramatic shift
  const explorationMusic = getCurrentExplorationTrack();
  
  // Fade exploration fast
  explorationMusic?.fade(explorationMusic.volume(), 0, 500);
  
  // Hit stinger
  const stinger = new Howl({
    src: ['/audio/stingers/combat_start.mp3'],
    volume: 0.8,
  });
  stinger.play();
  
  // Fade in combat music
  setTimeout(() => {
    musicTracks.combat.volume(0);
    musicTracks.combat.play();
    musicTracks.combat.fade(0, 0.7, 1000);
  }, 300);
}

export function transitionFromCombatMusic() {
  // Slower, victorious fade
  musicTracks.combat.fade(0.7, 0, 2000);
  
  setTimeout(() => {
    musicTracks.combat.stop();
    // Return to exploration music
    resumeExplorationMusic();
  }, 2000);
}
```

---

## **7. Interaction Sounds**

### **A. Footsteps**

```typescript
// hooks/useFootsteps.ts
const footstepSounds = new Howl({
  src: ['/audio/sfx/footsteps_stone.mp3'],
  sprite: {
    step1: [0, 300],
    step2: [300, 300],
    step3: [600, 300],
    step4: [900, 300],
  },
});

export function playFootstep(surface: 'stone' | 'water' | 'metal') {
  const sprites = ['step1', 'step2', 'step3', 'step4'];
  const sprite = sprites[Math.floor(Math.random() * sprites.length)];
  const pitch = 0.9 + Math.random() * 0.2;
  
  const id = footstepSounds.play(sprite);
  footstepSounds.rate(pitch, id);
}
```

### **B. Interaction Confirmation**

```typescript
// utils/audio/interactionAudio.ts
export function playInteractionSound(type: 'examine' | 'collect' | 'talk' | 'open') {
  const sounds = {
    examine: '/audio/sfx/examine.mp3',
    collect: '/audio/sfx/collect.mp3',
    talk: '/audio/sfx/dialogue_start.mp3',
    open: '/audio/sfx/door_open.mp3',
  };
  
  const sound = new Howl({
    src: [sounds[type]],
    volume: 0.6,
  });
  
  const pitch = 0.95 + Math.random() * 0.1;
  const id = sound.play();
  sound.rate(pitch, id);
}
```

---

## **8. Combat SFX (Preserved)**

```typescript
// utils/audio/combatAudio.ts
const impactSounds = new Howl({
  src: ['/audio/sfx/impacts.mp3'],
  sprite: {
    hit1: [0, 200],
    hit2: [200, 200],
    hit3: [400, 200],
  },
});

export function playImpactSFX(damage: number) {
  const sprites = ['hit1', 'hit2', 'hit3'];
  const sprite = sprites[Math.floor(Math.random() * sprites.length)];
  const pitch = 0.9 + Math.random() * 0.2;
  
  // Louder for bigger hits
  const volume = 0.5 + Math.min(damage / 100, 0.5);
  
  const id = impactSounds.play(sprite);
  impactSounds.rate(pitch, id);
  impactSounds.volume(volume, id);
}
```

---

## **9. Audio Reference Table**

| Context | Sound Type | Volume | Notes |
|---------|-----------|--------|-------|
| Exploration | Ambient loop | 0.4-0.6 | Location-specific, continuous |
| Exploration | Ambient layers | 0.1-0.3 | Random timing, spatial |
| Exploration | Music | 0.3-0.5 | Subtle, atmospheric |
| Discovery | Stinger | 0.6-0.8 | Category-specific, celebratory |
| Tension | Drone | 0.0-0.5 | Scales with tension level |
| Combat | Music | 0.7 | Energetic, driving |
| Combat | Impacts | 0.5-1.0 | Scales with damage |
| UI | Clicks | 0.4-0.6 | Consistent, non-intrusive |

---

## **10. References**

* **Howler.js:** [Official Documentation](https://howlerjs.com/)
* **Web Audio API:** [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
* **Atmospheric Sound Design:** Study "Hollow Knight" and "Dark Souls" soundscapes
* **Game Design Document:** `_ai_skills/game_design_document.md`
