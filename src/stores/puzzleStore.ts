/**
 * Puzzle Store - Manages trap and puzzle state for the Forgotten Office
 * 
 * Three disarm methods:
 * 1. Sigils: Find 3 sigil stones, place on desk pedestals
 * 2. Key: Find hidden key in crawlspace behind crates
 * 3. Music Box: Play music box near grimoire case
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type DisarmMethod = 'sigils' | 'key' | 'musicbox' | null;
export type SigilLocation = 'bookshelf' | 'cabinet' | 'coat';
export type PedestalPosition = 'left' | 'center' | 'right';

interface PuzzleState {
  // Sigil puzzle state
  sigilsFound: SigilLocation[];
  sigilsPlaced: Map<PedestalPosition, SigilLocation | null>;
  correctSigilOrder: Map<PedestalPosition, SigilLocation>; // The solution
  
  // Key puzzle state
  crawlspaceDiscovered: boolean;
  keyFound: boolean;
  
  // Music box puzzle state
  musicBoxPlayed: boolean;
  musicBoxNearCase: boolean;
  
  // Overall trap state
  trapDisarmed: boolean;
  disarmMethod: DisarmMethod;
  caseOpened: boolean;
  
  // Death tracking
  deathCount: number;
  
  // Lore discovery tracking
  journalRead: boolean;
  photographExamined: boolean;
  windowMessageRead: boolean;
  specimenExamined: boolean;
  
  // Actions - Sigils
  findSigil: (location: SigilLocation) => void;
  placeSigil: (sigil: SigilLocation, position: PedestalPosition) => boolean;
  removeSigil: (position: PedestalPosition) => SigilLocation | null;
  checkSigilSolution: () => boolean;
  
  // Actions - Key
  discoverCrawlspace: () => void;
  findKey: () => void;
  useKey: () => boolean;
  
  // Actions - Music Box
  playMusicBox: () => void;
  setMusicBoxNearCase: (near: boolean) => void;
  checkMusicBoxSolution: () => boolean;
  
  // Actions - Case
  attemptOpenCase: () => { success: boolean; disarmMethod: DisarmMethod };
  triggerDeath: () => void;
  
  // Actions - Lore
  readJournal: () => void;
  examinePhotograph: () => void;
  readWindowMessage: () => void;
  examineSpecimen: () => void;
  
  // Helpers
  hasSigil: (location: SigilLocation) => boolean;
  getSigilAt: (position: PedestalPosition) => SigilLocation | null;
  getHintText: () => string;
  
  // Reset
  reset: () => void;
}

// The correct sigil order (hinted in journal)
const CORRECT_SIGIL_ORDER = new Map<PedestalPosition, SigilLocation>([
  ['left', 'bookshelf'],
  ['center', 'coat'],
  ['right', 'cabinet'],
]);

const initialState = {
  sigilsFound: [] as SigilLocation[],
  sigilsPlaced: new Map<PedestalPosition, SigilLocation | null>([
    ['left', null],
    ['center', null],
    ['right', null],
  ]),
  correctSigilOrder: CORRECT_SIGIL_ORDER,
  crawlspaceDiscovered: false,
  keyFound: false,
  musicBoxPlayed: false,
  musicBoxNearCase: false,
  trapDisarmed: false,
  disarmMethod: null as DisarmMethod,
  caseOpened: false,
  deathCount: 0,
  journalRead: false,
  photographExamined: false,
  windowMessageRead: false,
  specimenExamined: false,
};

export const usePuzzleStore = create<PuzzleState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    
    // Sigil actions
    findSigil: (location) => set((state) => {
      if (state.sigilsFound.includes(location)) return state;
      return { sigilsFound: [...state.sigilsFound, location] };
    }),
    
    placeSigil: (sigil, position) => {
      const state = get();
      
      // Must have the sigil to place it
      if (!state.sigilsFound.includes(sigil)) return false;
      
      // Can't place if position is occupied
      if (state.sigilsPlaced.get(position) !== null) return false;
      
      // Can't place if sigil is already placed elsewhere
      for (const [, placed] of state.sigilsPlaced) {
        if (placed === sigil) return false;
      }
      
      const newPlaced = new Map(state.sigilsPlaced);
      newPlaced.set(position, sigil);
      
      set({ sigilsPlaced: newPlaced });
      
      // Check if solution is complete
      get().checkSigilSolution();
      
      return true;
    },
    
    removeSigil: (position) => {
      const state = get();
      const sigil = state.sigilsPlaced.get(position);
      
      if (!sigil) return null;
      
      const newPlaced = new Map(state.sigilsPlaced);
      newPlaced.set(position, null);
      
      set({ sigilsPlaced: newPlaced });
      
      return sigil;
    },
    
    checkSigilSolution: () => {
      const state = get();
      
      for (const [position, correctSigil] of state.correctSigilOrder) {
        if (state.sigilsPlaced.get(position) !== correctSigil) {
          return false;
        }
      }
      
      // All correct! Disarm the trap
      set({ trapDisarmed: true, disarmMethod: 'sigils' });
      return true;
    },
    
    // Key actions
    discoverCrawlspace: () => set({ crawlspaceDiscovered: true }),
    
    findKey: () => set({ keyFound: true }),
    
    useKey: () => {
      const state = get();
      if (!state.keyFound) return false;
      
      set({ trapDisarmed: true, disarmMethod: 'key' });
      return true;
    },
    
    // Music box actions
    playMusicBox: () => set({ musicBoxPlayed: true }),
    
    setMusicBoxNearCase: (near) => {
      set({ musicBoxNearCase: near });
      if (near && get().musicBoxPlayed) {
        get().checkMusicBoxSolution();
      }
    },
    
    checkMusicBoxSolution: () => {
      const state = get();
      
      if (state.musicBoxPlayed && state.musicBoxNearCase) {
        set({ trapDisarmed: true, disarmMethod: 'musicbox' });
        return true;
      }
      
      return false;
    },
    
    // Case actions
    attemptOpenCase: () => {
      const state = get();
      
      if (state.trapDisarmed) {
        set({ caseOpened: true });
        return { success: true, disarmMethod: state.disarmMethod };
      }
      
      // Trap is armed - trigger death
      return { success: false, disarmMethod: null };
    },
    
    triggerDeath: () => set((state) => ({ deathCount: state.deathCount + 1 })),
    
    // Lore actions
    readJournal: () => set({ journalRead: true }),
    examinePhotograph: () => set({ photographExamined: true }),
    readWindowMessage: () => set({ windowMessageRead: true }),
    examineSpecimen: () => set({ specimenExamined: true }),
    
    // Helpers
    hasSigil: (location) => get().sigilsFound.includes(location),
    
    getSigilAt: (position) => get().sigilsPlaced.get(position) ?? null,
    
    getHintText: () => {
      const state = get();
      
      if (state.deathCount === 0) return '';
      if (state.deathCount === 1) return 'Perhaps there\'s more to discover in this office...';
      if (state.deathCount === 2) return 'The journal might hold answers.';
      if (state.deathCount >= 3) return 'Try the music box, find the key, or arrange the sigils.';
      
      return '';
    },
    
    // Reset
    reset: () => set(initialState),
  }))
);
