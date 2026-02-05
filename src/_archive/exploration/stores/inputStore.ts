/**
 * Input Store - Unified input abstraction for keyboard + gamepad
 * Follows skill_r3f_character_controller.md patterns
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Vector2 } from 'three';

export type InputDevice = 'keyboard' | 'gamepad';

interface InputState {
  // Movement
  movement: Vector2;          // Left stick / WASD (normalized -1 to 1)
  camera: Vector2;            // Right stick / mouse delta
  
  // Actions (true = pressed this frame)
  interact: boolean;          // A button / E key
  interactHeld: boolean;      // A button / E key (held state)
  grimoire: boolean;          // Back/Select button / G key
  sprint: boolean;            // Left trigger / Shift
  pause: boolean;             // Start button / Escape
  
  // Meta
  inputDevice: InputDevice;
  lastInputTime: number;
  pointerLocked: boolean;
  
  // Setters
  setMovement: (x: number, y: number) => void;
  setCamera: (x: number, y: number) => void;
  setInteract: (pressed: boolean) => void;
  setInteractHeld: (held: boolean) => void;
  setGrimoire: (pressed: boolean) => void;
  setSprint: (held: boolean) => void;
  setPause: (pressed: boolean) => void;
  setInputDevice: (device: InputDevice) => void;
  setPointerLocked: (locked: boolean) => void;
  
  // Clear one-frame actions (call at end of frame)
  clearFrameActions: () => void;
}

export const useInputStore = create<InputState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    movement: new Vector2(0, 0),
    camera: new Vector2(0, 0),
    interact: false,
    interactHeld: false,
    grimoire: false,
    sprint: false,
    pause: false,
    inputDevice: 'keyboard',
    lastInputTime: 0,
    pointerLocked: false,
    
    // Movement (continuous)
    setMovement: (x, y) => {
      const state = get();
      state.movement.set(x, y);
      set({ movement: state.movement, lastInputTime: Date.now() });
    },
    
    // Camera (continuous)
    setCamera: (x, y) => {
      const state = get();
      state.camera.set(x, y);
      set({ camera: state.camera });
    },
    
    // Actions (one-frame triggers)
    setInteract: (pressed) => set({ interact: pressed }),
    setInteractHeld: (held) => set({ interactHeld: held }),
    setGrimoire: (pressed) => set({ grimoire: pressed }),
    setSprint: (held) => set({ sprint: held }),
    setPause: (pressed) => set({ pause: pressed }),
    
    // Meta
    setInputDevice: (device) => set({ inputDevice: device }),
    setPointerLocked: (locked) => set({ pointerLocked: locked }),
    
    // Clear one-frame actions at end of frame
    clearFrameActions: () => set({
      interact: false,
      grimoire: false,
      pause: false,
    }),
  }))
);
