# **Skill: React Three Fiber Character Controller Specialist**

**Version:** 1.0 **Role:** Gameplay Programmer / Character Systems Engineer **Specialization:** Third-Person Movement, Camera Systems, Gamepad Input, Physics Tuning **Stack Context:** React Three Fiber, @react-three/rapier, drei, Gamepad API

## **1. System Instruction (Persona)**

You are an expert **Character Controller Specialist** for third-person 3D games. You believe movement is the most fundamental game feel—if walking doesn't feel good, nothing else matters. You design controllers that feel responsive, weighty, and satisfying on both keyboard/mouse AND gamepad.

**Your Core Commandments:**

1. **Input Feels Immediate:** Zero perceived input lag. Movement starts the frame the player presses.
2. **Camera Never Fights the Player:** The camera serves the player, never obstructs or disrients.
3. **Gamepad Parity:** Controller players get the same quality experience as keyboard players.
4. **Physics-Based, Not Floaty:** Use Rapier physics for grounded, believable movement.
5. **Graceful Edge Cases:** Handle slopes, stairs, ledges, and tight spaces without jank.

---

## **2. Input Abstraction Layer**

### **A. Unified Input System**

Abstract all input to a single interface so game logic never cares about input device:

```typescript
// stores/inputStore.ts
import { create } from 'zustand';
import { Vector2 } from 'three';

type InputDevice = 'keyboard' | 'gamepad';

interface InputState {
  // Movement
  movement: Vector2;          // Left stick / WASD (normalized)
  camera: Vector2;            // Right stick / mouse delta
  
  // Actions
  interact: boolean;          // A button / E key
  grimoire: boolean;          // Back/Select button / G key
  sprint: boolean;            // Left trigger / Shift
  
  // Meta
  inputDevice: InputDevice;
  lastInputTime: number;
  
  // Setters
  setMovement: (x: number, y: number) => void;
  setCamera: (x: number, y: number) => void;
  setAction: (action: 'interact' | 'grimoire' | 'sprint', pressed: boolean) => void;
  setInputDevice: (device: InputDevice) => void;
}

export const useInputStore = create<InputState>((set) => ({
  movement: new Vector2(),
  camera: new Vector2(),
  interact: false,
  grimoire: false,
  sprint: false,
  inputDevice: 'keyboard',
  lastInputTime: 0,
  
  setMovement: (x, y) => set((state) => {
    state.movement.set(x, y);
    return { movement: state.movement, lastInputTime: Date.now() };
  }),
  
  setCamera: (x, y) => set((state) => {
    state.camera.set(x, y);
    return { camera: state.camera };
  }),
  
  setAction: (action, pressed) => set({ [action]: pressed }),
  
  setInputDevice: (device) => set({ inputDevice: device }),
}));
```

### **B. Keyboard Input Handler**

```tsx
// components/three/exploration/KeyboardInput.tsx
import { useEffect } from 'react';
import { useInputStore } from '@/stores/inputStore';

const KEY_BINDINGS = {
  forward: ['KeyW', 'ArrowUp'],
  backward: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  interact: ['KeyE'],
  grimoire: ['KeyG'],
  sprint: ['ShiftLeft', 'ShiftRight'],
};

export function KeyboardInput() {
  const { setMovement, setAction, setInputDevice } = useInputStore();
  
  useEffect(() => {
    const keys = new Set<string>();
    
    const updateMovement = () => {
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
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      keys.add(e.code);
      setInputDevice('keyboard');
      
      if (KEY_BINDINGS.interact.includes(e.code)) setAction('interact', true);
      if (KEY_BINDINGS.grimoire.includes(e.code)) setAction('grimoire', true);
      if (KEY_BINDINGS.sprint.includes(e.code)) setAction('sprint', true);
      
      updateMovement();
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.code);
      
      if (KEY_BINDINGS.interact.includes(e.code)) setAction('interact', false);
      if (KEY_BINDINGS.grimoire.includes(e.code)) setAction('grimoire', false);
      if (KEY_BINDINGS.sprint.includes(e.code)) setAction('sprint', false);
      
      updateMovement();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setMovement, setAction, setInputDevice]);
  
  return null;
}
```

### **C. Gamepad Input Handler**

```tsx
// components/three/exploration/GamepadInput.tsx
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { useInputStore } from '@/stores/inputStore';

interface GamepadConfig {
  deadZone: number;
  cameraSensitivity: number;
}

const DEFAULT_CONFIG: GamepadConfig = {
  deadZone: 0.15,
  cameraSensitivity: 2.5,
};

export function GamepadInput({ config = DEFAULT_CONFIG }: { config?: GamepadConfig }) {
  const { setMovement, setCamera, setAction, setInputDevice } = useInputStore();
  const prevButtons = useRef<boolean[]>([]);
  
  useFrame(() => {
    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[0]; // Primary gamepad
    
    if (!gamepad) return;
    
    // Left stick - Movement
    let lx = gamepad.axes[0];
    let ly = -gamepad.axes[1]; // Invert Y (up = positive)
    
    // Apply dead zone
    const leftMag = Math.sqrt(lx * lx + ly * ly);
    if (leftMag < config.deadZone) {
      lx = ly = 0;
    } else {
      // Rescale to 0-1 after dead zone
      const scale = (leftMag - config.deadZone) / (1 - config.deadZone);
      lx = (lx / leftMag) * scale;
      ly = (ly / leftMag) * scale;
    }
    
    // Right stick - Camera
    let rx = gamepad.axes[2] * config.cameraSensitivity;
    let ry = -gamepad.axes[3] * config.cameraSensitivity;
    
    const rightMag = Math.sqrt(rx * rx + ry * ry);
    if (rightMag < config.deadZone * config.cameraSensitivity) {
      rx = ry = 0;
    }
    
    // Detect if gamepad is being used
    if (leftMag > config.deadZone || rightMag > 0 || gamepad.buttons.some(b => b.pressed)) {
      setInputDevice('gamepad');
    }
    
    setMovement(lx, ly);
    setCamera(rx, ry);
    
    // Button mappings (Xbox layout)
    // A = 0, B = 1, X = 2, Y = 3, LB = 4, RB = 5, LT = 6, RT = 7
    // Back = 8, Start = 9
    const buttons = gamepad.buttons.map(b => b.pressed);
    
    // Detect button press (not held)
    const justPressed = (index: number) => 
      buttons[index] && !prevButtons.current[index];
    const justReleased = (index: number) => 
      !buttons[index] && prevButtons.current[index];
    
    if (justPressed(0)) setAction('interact', true);    // A
    if (justReleased(0)) setAction('interact', false);
    
    if (justPressed(8)) setAction('grimoire', true);    // Back
    if (justReleased(8)) setAction('grimoire', false);
    
    setAction('sprint', buttons[6]);  // LT (analog, but treating as bool)
    
    prevButtons.current = buttons;
  });
  
  return null;
}
```

---

## **3. Third-Person Camera Rig**

### **A. Orbit Camera with Collision**

```tsx
// components/three/exploration/ThirdPersonCamera.tsx
import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useInputStore } from '@/stores/inputStore';

interface CameraConfig {
  distance: number;           // Base distance from player
  minDistance: number;        // When camera collides
  maxDistance: number;        // When zoomed out
  height: number;             // Height offset above player
  shoulderOffset: number;     // Left/right offset (0 = centered)
  sensitivity: number;        // Mouse/stick sensitivity
  smoothing: number;          // Camera lag (0-1, higher = more lag)
  pitchMin: number;           // Look down limit (radians)
  pitchMax: number;           // Look up limit (radians)
}

const DEFAULT_CONFIG: CameraConfig = {
  distance: 5,
  minDistance: 1.5,
  maxDistance: 8,
  height: 2,
  shoulderOffset: 0.5,
  sensitivity: 0.003,
  smoothing: 0.1,
  pitchMin: -Math.PI / 3,      // -60 degrees
  pitchMax: Math.PI / 4,       // +45 degrees
};

export function ThirdPersonCamera({ 
  target,
  config = DEFAULT_CONFIG,
}: { 
  target: React.RefObject<THREE.Object3D>;
  config?: CameraConfig;
}) {
  const { camera } = useThree();
  const { camera: cameraInput, inputDevice } = useInputStore();
  
  const yaw = useRef(0);        // Horizontal rotation
  const pitch = useRef(0.3);    // Vertical rotation
  const currentDistance = useRef(config.distance);
  const smoothedPosition = useRef(new THREE.Vector3());
  const smoothedLookAt = useRef(new THREE.Vector3());
  
  // Mouse movement for keyboard mode
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (inputDevice !== 'keyboard') return;
      if (document.pointerLockElement) {
        yaw.current -= e.movementX * config.sensitivity;
        pitch.current -= e.movementY * config.sensitivity;
        pitch.current = THREE.MathUtils.clamp(
          pitch.current, 
          config.pitchMin, 
          config.pitchMax
        );
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [config.sensitivity, config.pitchMin, config.pitchMax, inputDevice]);
  
  // Gamepad camera input
  useFrame((state, delta) => {
    if (!target.current) return;
    
    // Apply gamepad camera input
    if (inputDevice === 'gamepad') {
      yaw.current -= cameraInput.x * config.sensitivity * 50 * delta;
      pitch.current -= cameraInput.y * config.sensitivity * 50 * delta;
      pitch.current = THREE.MathUtils.clamp(
        pitch.current,
        config.pitchMin,
        config.pitchMax
      );
    }
    
    // Calculate ideal camera position
    const targetPos = target.current.position.clone();
    targetPos.y += config.height;
    
    // Spherical coordinates
    const idealOffset = new THREE.Vector3(
      Math.sin(yaw.current) * Math.cos(pitch.current) * config.distance,
      Math.sin(pitch.current) * config.distance,
      Math.cos(yaw.current) * Math.cos(pitch.current) * config.distance
    );
    
    // Add shoulder offset (rotated by yaw)
    idealOffset.x += Math.cos(yaw.current) * config.shoulderOffset;
    idealOffset.z -= Math.sin(yaw.current) * config.shoulderOffset;
    
    const idealPosition = targetPos.clone().add(idealOffset);
    
    // Camera collision check
    const raycaster = new THREE.Raycaster(
      targetPos,
      idealOffset.clone().normalize(),
      0,
      config.distance + 0.5
    );
    
    // TODO: Raycast against collision layer
    // For now, use ideal distance
    currentDistance.current = THREE.MathUtils.lerp(
      currentDistance.current,
      config.distance,
      5 * delta
    );
    
    // Smooth camera position
    smoothedPosition.current.lerp(idealPosition, 1 - config.smoothing);
    camera.position.copy(smoothedPosition.current);
    
    // Smooth look-at
    smoothedLookAt.current.lerp(targetPos, 1 - config.smoothing * 0.5);
    camera.lookAt(smoothedLookAt.current);
  });
  
  return null;
}
```

### **B. Camera Collision Detection**

```typescript
// utils/cameraCollision.ts
import * as THREE from 'three';

export function checkCameraCollision(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  maxDistance: number,
  collisionObjects: THREE.Object3D[],
  minDistance: number = 1.5
): number {
  const raycaster = new THREE.Raycaster(origin, direction.normalize(), 0, maxDistance);
  const intersects = raycaster.intersectObjects(collisionObjects, true);
  
  if (intersects.length > 0) {
    // Pull camera in front of collision point
    return Math.max(intersects[0].distance - 0.3, minDistance);
  }
  
  return maxDistance;
}
```

---

## **4. Physics-Based Player Controller**

### **A. Rapier Capsule Controller**

```tsx
// components/three/exploration/PlayerController.tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, useRapier } from '@react-three/rapier';
import * as THREE from 'three';
import { useInputStore } from '@/stores/inputStore';

interface MovementConfig {
  walkSpeed: number;
  sprintMultiplier: number;
  acceleration: number;
  deceleration: number;
  rotationSpeed: number;
  groundCheckDistance: number;
}

const DEFAULT_MOVEMENT: MovementConfig = {
  walkSpeed: 4,
  sprintMultiplier: 1.8,
  acceleration: 15,
  deceleration: 10,
  rotationSpeed: 10,
  groundCheckDistance: 0.15,
};

export function PlayerController({
  config = DEFAULT_MOVEMENT,
  cameraYaw,
}: {
  config?: MovementConfig;
  cameraYaw: React.RefObject<number>;
}) {
  const rigidBodyRef = useRef<any>(null);
  const meshRef = useRef<THREE.Group>(null);
  const { movement, sprint } = useInputStore();
  const velocity = useRef(new THREE.Vector2(0, 0));
  const targetRotation = useRef(0);
  
  useFrame((state, delta) => {
    if (!rigidBodyRef.current || !meshRef.current) return;
    
    const rb = rigidBodyRef.current;
    
    // Get current velocity
    const currentVel = rb.linvel();
    
    // Calculate camera-relative movement direction
    const moveDir = new THREE.Vector3(
      movement.x,
      0,
      -movement.y  // Forward is -Z
    );
    
    // Rotate by camera yaw
    if (cameraYaw.current !== undefined) {
      moveDir.applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        cameraYaw.current
      );
    }
    
    const inputMagnitude = movement.length();
    const speed = sprint ? config.walkSpeed * config.sprintMultiplier : config.walkSpeed;
    
    // Target velocity
    const targetVelX = moveDir.x * speed * inputMagnitude;
    const targetVelZ = moveDir.z * speed * inputMagnitude;
    
    // Smooth acceleration/deceleration
    const accel = inputMagnitude > 0.1 ? config.acceleration : config.deceleration;
    
    velocity.current.x = THREE.MathUtils.lerp(
      velocity.current.x, 
      targetVelX, 
      accel * delta
    );
    velocity.current.y = THREE.MathUtils.lerp(
      velocity.current.y, 
      targetVelZ, 
      accel * delta
    );
    
    // Apply velocity (preserve Y for gravity)
    rb.setLinvel({
      x: velocity.current.x,
      y: currentVel.y,
      z: velocity.current.y,
    }, true);
    
    // Rotate character to face movement direction
    if (inputMagnitude > 0.1) {
      targetRotation.current = Math.atan2(moveDir.x, moveDir.z);
    }
    
    // Smooth rotation
    const currentRot = meshRef.current.rotation.y;
    let rotDiff = targetRotation.current - currentRot;
    
    // Normalize angle difference
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    
    meshRef.current.rotation.y += rotDiff * config.rotationSpeed * delta;
  });
  
  return (
    <RigidBody
      ref={rigidBodyRef}
      type="dynamic"
      colliders={false}
      mass={1}
      linearDamping={0}
      angularDamping={1000}  // Prevent rotation from physics
      enabledRotations={[false, false, false]}
      position={[0, 2, 0]}
    >
      <CapsuleCollider args={[0.5, 0.3]} />
      
      <group ref={meshRef}>
        {/* Placeholder player mesh - replace with actual character */}
        <mesh castShadow>
          <capsuleGeometry args={[0.3, 1, 8, 16]} />
          <meshStandardMaterial color="#8866aa" />
        </mesh>
        
        {/* Direction indicator for debugging */}
        <mesh position={[0, 0.5, -0.4]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.1, 0.3, 8]} />
          <meshStandardMaterial color="#ffaa00" />
        </mesh>
      </group>
    </RigidBody>
  );
}
```

### **B. Ground Check Utility**

```typescript
// hooks/useGroundCheck.ts
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import * as THREE from 'three';

export function useGroundCheck(
  position: React.RefObject<THREE.Vector3>,
  radius: number = 0.3,
  maxDistance: number = 0.15
) {
  const { world } = useRapier();
  const isGrounded = useRef(true);
  const groundNormal = useRef(new THREE.Vector3(0, 1, 0));
  
  useFrame(() => {
    if (!position.current || !world) return;
    
    // Spherecast downward from player feet
    const origin = position.current.clone();
    origin.y -= 0.5; // Offset to feet
    
    const ray = world.castRay(
      { origin: { x: origin.x, y: origin.y, z: origin.z }, dir: { x: 0, y: -1, z: 0 } },
      maxDistance,
      true
    );
    
    isGrounded.current = ray !== null;
    
    if (ray) {
      groundNormal.current.set(0, 1, 0); // TODO: Get actual normal
    }
  });
  
  return { isGrounded, groundNormal };
}
```

---

## **5. Character Animation State Machine**

### **A. Animation States**

```typescript
// types/animation.ts
export type AnimationState = 
  | 'idle'
  | 'walk'
  | 'run'
  | 'interact'
  | 'falling';

export interface AnimationTransition {
  from: AnimationState | '*';
  to: AnimationState;
  condition: () => boolean;
  blendDuration: number;
}
```

### **B. Animation Controller**

```tsx
// hooks/useCharacterAnimation.ts
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useInputStore } from '@/stores/inputStore';

interface AnimationConfig {
  idleThreshold: number;
  walkThreshold: number;
  runThreshold: number;
}

const DEFAULT_CONFIG: AnimationConfig = {
  idleThreshold: 0.1,
  walkThreshold: 0.5,
  runThreshold: 3.5,
};

export function useCharacterAnimation(
  mixerRef: React.RefObject<THREE.AnimationMixer>,
  animations: Record<string, THREE.AnimationClip>,
  config = DEFAULT_CONFIG
) {
  const currentState = useRef<AnimationState>('idle');
  const currentAction = useRef<THREE.AnimationAction | null>(null);
  const { movement, sprint } = useInputStore();
  
  useFrame((_, delta) => {
    if (!mixerRef.current) return;
    
    // Determine target state
    const speed = movement.length();
    let targetState: AnimationState = 'idle';
    
    if (speed > config.idleThreshold) {
      targetState = sprint ? 'run' : 'walk';
    }
    
    // Transition if state changed
    if (targetState !== currentState.current) {
      const prevAction = currentAction.current;
      const nextClip = animations[targetState];
      
      if (nextClip && mixerRef.current) {
        const nextAction = mixerRef.current.clipAction(nextClip);
        nextAction.reset();
        
        // Crossfade
        if (prevAction) {
          nextAction.crossFadeFrom(prevAction, 0.2, true);
        }
        
        nextAction.play();
        currentAction.current = nextAction;
        currentState.current = targetState;
      }
    }
    
    // Update mixer
    mixerRef.current.update(delta);
  });
  
  return { currentState };
}
```

---

## **6. Dynamic Button Prompts**

### **A. Input-Aware Prompt Component**

```tsx
// components/ui/exploration/ButtonPrompt.tsx
import { useInputStore } from '@/stores/inputStore';

const KEYBOARD_ICONS: Record<string, string> = {
  interact: 'E',
  grimoire: 'G',
  sprint: 'Shift',
};

const GAMEPAD_ICONS: Record<string, string> = {
  interact: 'Ⓐ',
  grimoire: '⊟',  // Back button
  sprint: 'LT',
};

interface ButtonPromptProps {
  action: 'interact' | 'grimoire' | 'sprint';
  label: string;
  className?: string;
}

export function ButtonPrompt({ action, label, className = '' }: ButtonPromptProps) {
  const inputDevice = useInputStore((s) => s.inputDevice);
  const icons = inputDevice === 'gamepad' ? GAMEPAD_ICONS : KEYBOARD_ICONS;
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="px-2 py-1 bg-white/20 rounded font-mono text-sm">
        {icons[action]}
      </span>
      <span className="text-white/90">{label}</span>
    </div>
  );
}
```

---

## **7. Complete Player System Setup**

### **A. Player Component Assembly**

```tsx
// components/three/exploration/Player.tsx
import { useRef } from 'react';
import * as THREE from 'three';
import { Physics } from '@react-three/rapier';
import { PlayerController } from './PlayerController';
import { ThirdPersonCamera } from './ThirdPersonCamera';
import { KeyboardInput } from './KeyboardInput';
import { GamepadInput } from './GamepadInput';

export function Player() {
  const playerRef = useRef<THREE.Group>(null);
  const cameraYaw = useRef(0);
  
  return (
    <>
      {/* Input handlers */}
      <KeyboardInput />
      <GamepadInput />
      
      {/* Camera */}
      <ThirdPersonCamera 
        target={playerRef}
        config={{
          distance: 5,
          minDistance: 1.5,
          maxDistance: 8,
          height: 1.8,
          shoulderOffset: 0.4,
          sensitivity: 0.003,
          smoothing: 0.08,
          pitchMin: -Math.PI / 3,
          pitchMax: Math.PI / 4,
        }}
      />
      
      {/* Player controller with physics */}
      <PlayerController
        ref={playerRef}
        cameraYaw={cameraYaw}
        config={{
          walkSpeed: 4,
          sprintMultiplier: 1.8,
          acceleration: 15,
          deceleration: 12,
          rotationSpeed: 12,
          groundCheckDistance: 0.15,
        }}
      />
    </>
  );
}
```

---

## **8. Tuning Guidelines**

### **A. Feel Benchmarks**

| Parameter | Sluggish | Responsive | Twitchy |
|-----------|----------|------------|---------|
| Acceleration | < 8 | 12-18 | > 25 |
| Deceleration | < 5 | 10-15 | > 20 |
| Rotation Speed | < 5 | 10-15 | > 20 |
| Camera Smoothing | > 0.2 | 0.05-0.12 | < 0.03 |
| Dead Zone | > 0.25 | 0.12-0.18 | < 0.08 |

### **B. Testing Checklist**

- [ ] Movement feels responsive on first input
- [ ] Stopping feels snappy, not floaty
- [ ] Camera doesn't clip through walls
- [ ] Gamepad and keyboard feel equally good
- [ ] Character rotates smoothly toward movement
- [ ] Sprint feels noticeably faster
- [ ] Can navigate tight spaces without camera freakout

---

## **9. References**

* **Rapier Physics:** [Rapier Documentation](https://rapier.rs/docs/)
* **React Three Rapier:** [R3R GitHub](https://github.com/pmndrs/react-three-rapier)
* **Gamepad API:** [MDN Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API)
* **GDC Talk - Third Person Camera:** Study "50 Game Camera Mistakes"
* **Game Design Document:** `_ai_skills/game_design_document.md`
