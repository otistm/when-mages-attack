/**
 * InputManager - Unified keyboard + gamepad input handling
 * Follows skill_r3f_character_controller.md patterns
 */

import { useEffect, useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useInputStore } from '@/stores/inputStore';

// Key bindings configuration
const KEY_BINDINGS = {
  forward: ['KeyW', 'ArrowUp'],
  backward: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  interact: ['KeyE'],
  grimoire: ['KeyG', 'Tab'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  pause: ['Escape'],
};

// Gamepad configuration
const GAMEPAD_CONFIG = {
  deadZone: 0.15,
  cameraSensitivity: 3.0,
};

export function InputManager() {
  return (
    <>
      <KeyboardInput />
      <GamepadInput />
      <PointerLockManager />
    </>
  );
}

/**
 * Keyboard Input Handler
 */
function KeyboardInput() {
  const { 
    setMovement, 
    setInteract, 
    setInteractHeld,
    setGrimoire, 
    setSprint, 
    setPause,
    setInputDevice,
  } = useInputStore();
  
  const keysPressed = useRef(new Set<string>());
  
  const updateMovement = useCallback(() => {
    const keys = keysPressed.current;
    let x = 0, y = 0;
    
    if (KEY_BINDINGS.forward.some(k => keys.has(k))) y += 1;
    if (KEY_BINDINGS.backward.some(k => keys.has(k))) y -= 1;
    if (KEY_BINDINGS.left.some(k => keys.has(k))) x -= 1;
    if (KEY_BINDINGS.right.some(k => keys.has(k))) x += 1;
    
    // Normalize diagonal movement
    const len = Math.sqrt(x * x + y * y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    
    setMovement(x, y);
  }, [setMovement]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      
      const code = e.code;
      keysPressed.current.add(code);
      setInputDevice('keyboard');
      
      // One-frame action triggers
      if (KEY_BINDINGS.interact.includes(code)) {
        setInteract(true);
        setInteractHeld(true);
      }
      if (KEY_BINDINGS.grimoire.includes(code)) {
        setGrimoire(true);
        e.preventDefault(); // Prevent Tab from changing focus
      }
      if (KEY_BINDINGS.sprint.includes(code)) {
        setSprint(true);
      }
      if (KEY_BINDINGS.pause.includes(code)) {
        setPause(true);
      }
      
      updateMovement();
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      keysPressed.current.delete(code);
      
      if (KEY_BINDINGS.interact.includes(code)) {
        setInteract(false);
        setInteractHeld(false);
      }
      if (KEY_BINDINGS.sprint.includes(code)) {
        setSprint(false);
      }
      
      updateMovement();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setInteract, setInteractHeld, setGrimoire, setSprint, setPause, setInputDevice, updateMovement]);
  
  return null;
}

/**
 * Gamepad Input Handler
 */
function GamepadInput() {
  const {
    setMovement,
    setCamera,
    setInteract,
    setInteractHeld,
    setGrimoire,
    setSprint,
    setPause,
    setInputDevice,
  } = useInputStore();
  
  const prevButtons = useRef<boolean[]>([]);
  
  useFrame(() => {
    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[0];
    
    if (!gamepad) return;
    
    const { deadZone, cameraSensitivity } = GAMEPAD_CONFIG;
    
    // Left stick - Movement
    let lx = gamepad.axes[0];
    let ly = -gamepad.axes[1]; // Invert Y (up = positive)
    
    // Apply dead zone with rescaling
    const leftMag = Math.sqrt(lx * lx + ly * ly);
    if (leftMag < deadZone) {
      lx = ly = 0;
    } else {
      const scale = (leftMag - deadZone) / (1 - deadZone);
      lx = (lx / leftMag) * scale;
      ly = (ly / leftMag) * scale;
    }
    
    // Right stick - Camera
    let rx = gamepad.axes[2] * cameraSensitivity;
    let ry = -gamepad.axes[3] * cameraSensitivity;
    
    const rightMag = Math.sqrt(gamepad.axes[2] ** 2 + gamepad.axes[3] ** 2);
    if (rightMag < deadZone) {
      rx = ry = 0;
    }
    
    // Detect if gamepad is being used
    const anyInput = leftMag > deadZone || rightMag > deadZone || gamepad.buttons.some(b => b.pressed);
    if (anyInput) {
      setInputDevice('gamepad');
    }
    
    setMovement(lx, ly);
    setCamera(rx, ry);
    
    // Button mappings (Xbox layout)
    // A = 0, B = 1, X = 2, Y = 3, LB = 4, RB = 5, LT = 6, RT = 7
    // Back = 8, Start = 9
    const buttons = gamepad.buttons.map(b => b.pressed);
    
    const justPressed = (index: number) => buttons[index] && !prevButtons.current[index];
    const justReleased = (index: number) => !buttons[index] && prevButtons.current[index];
    
    // A button - Interact
    if (justPressed(0)) {
      setInteract(true);
      setInteractHeld(true);
    }
    if (justReleased(0)) {
      setInteract(false);
      setInteractHeld(false);
    }
    
    // Back button - Grimoire
    if (justPressed(8)) {
      setGrimoire(true);
    }
    
    // Start button - Pause
    if (justPressed(9)) {
      setPause(true);
    }
    
    // Left trigger - Sprint (analog treated as bool)
    setSprint(gamepad.buttons[6]?.value > 0.5);
    
    prevButtons.current = buttons;
  });
  
  return null;
}

/**
 * Pointer Lock Manager - Handles mouse capture for camera control
 */
function PointerLockManager() {
  const { setCamera, setPointerLocked, inputDevice, pointerLocked } = useInputStore();
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!document.pointerLockElement) return;
      if (inputDevice !== 'keyboard') return;
      
      // Mouse delta for camera rotation
      const sensitivity = 0.002;
      setCamera(e.movementX * sensitivity, e.movementY * sensitivity);
    };
    
    const handlePointerLockChange = () => {
      setPointerLocked(!!document.pointerLockElement);
    };
    
    const handleClick = () => {
      if (!document.pointerLockElement && inputDevice === 'keyboard') {
        document.body.requestPointerLock();
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('click', handleClick);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('click', handleClick);
    };
  }, [setCamera, setPointerLocked, inputDevice]);
  
  // Clear camera delta each frame for mouse (it's instantaneous, not held)
  useFrame(() => {
    if (inputDevice === 'keyboard' && pointerLocked) {
      // Camera delta is reset after being consumed
      // This happens in ThirdPersonCamera
    }
  });
  
  return null;
}
