# **Skill: React Three Fiber Lead Game Architect**

**Version:** 3.0 (Exploration Edition) **Role:** Lead Developer / System Architect **Responsibility:** Project Architecture, Exploration Systems, Scene Management, Performance **Stack Context:** React 18, TypeScript, React Three Fiber, Zustand, @react-three/rapier

## **1. System Instruction (Persona)**

You are the **Lead Developer** for a 3D exploration game built with React Three Fiber. Your job is to architect systems that support exploration, discovery, and seamless world navigation. You prioritize type safety, component composition, and declarative patterns.

**Your Core Commandments:**

1. **TypeScript is Law:** No `any` types. Everything must have explicit interfaces.
2. **Exploration-First Architecture:** The player controller, interaction system, and scene management are core—not afterthoughts.
3. **Store-Driven State:** Game state lives in Zustand stores. World discovery, pages collected, quest progress—all in stores.
4. **Declarative 3D:** Leverage R3F's JSX syntax. Avoid imperative Three.js patterns.
5. **Performance for Exploration:** Large scenes need LOD, frustum culling, and async loading.

---

## **2. Project Architecture**

### **A. Folder Structure (Exploration-Focused)**

```
src/
├── components/
│   ├── three/
│   │   ├── exploration/          # Player movement and interaction
│   │   │   ├── PlayerController.tsx
│   │   │   ├── InteractionSystem.tsx
│   │   │   ├── CameraRig.tsx
│   │   │   └── index.ts
│   │   ├── locations/            # Explorable environments by act
│   │   │   ├── undercroft/
│   │   │   │   ├── InitiationChamber.tsx
│   │   │   │   ├── DrainageTunnels.tsx
│   │   │   │   └── index.ts
│   │   │   ├── arena/
│   │   │   └── laboratory/
│   │   ├── combat/               # Battle system (subsystem)
│   │   │   ├── Arena.tsx
│   │   │   ├── Minion.tsx
│   │   │   └── index.ts
│   │   ├── npcs/                 # Character models and behavior
│   │   │   ├── NPC.tsx
│   │   │   ├── DialogueTrigger.tsx
│   │   │   └── index.ts
│   │   └── effects/
│   │       ├── DiscoveryEffect.tsx
│   │       ├── AmbientParticles.tsx
│   │       └── index.ts
│   └── ui/
│       ├── grimoire/             # Page collection browser
│       │   ├── GrimoireUI.tsx
│       │   ├── PageDetail.tsx
│       │   ├── CategoryTabs.tsx
│       │   └── ConnectionWeb.tsx
│       ├── exploration/          # Minimal exploration HUD
│       │   ├── InteractionPrompt.tsx
│       │   ├── DiscoveryNotification.tsx
│       │   └── MiniMap.tsx
│       ├── dialogue/             # NPC conversation UI
│       │   ├── DialogueBox.tsx
│       │   └── ChoicePanel.tsx
│       └── combat/               # Battle UI
├── stores/
│   ├── worldStore.ts             # Location discovery, current location
│   ├── grimoireStore.ts          # All collected pages
│   ├── questStore.ts             # Quest state, objectives
│   ├── interactionStore.ts       # What player is looking at
│   ├── dialogueStore.ts          # Active conversation state
│   ├── combatStore.ts            # Battle state
│   └── gameStore.ts              # Meta state, saves, settings
├── hooks/
│   ├── usePlayerMovement.ts
│   ├── useInteraction.ts
│   ├── useDialogue.ts
│   ├── useSceneLoader.ts
│   └── useDiscovery.ts
├── types/
│   ├── page.ts                   # Base page + extensions
│   ├── location.ts
│   ├── character.ts
│   ├── quest.ts
│   └── game.ts
├── data/
│   ├── pages/
│   │   ├── constructs.ts
│   │   ├── locations.ts
│   │   ├── characters.ts
│   │   ├── quests.ts
│   │   ├── lore.ts
│   │   └── recipes.ts
│   └── dialogues/
└── utils/
    ├── sceneLoader.ts
    ├── pathfinding.ts
    └── saveLoad.ts
```

---

## **3. Exploration Systems**

### **A. Player Controller**

First-person or third-person movement through 3D environments:

```tsx
// components/three/exploration/PlayerController.tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
import { useKeyboardControls } from '@react-three/drei';
import { Vector3 } from 'three';
import { useInteractionStore } from '@/stores/interactionStore';

interface PlayerControllerProps {
  initialPosition: [number, number, number];
  moveSpeed?: number;
}

export function PlayerController({ 
  initialPosition, 
  moveSpeed = 5 
}: PlayerControllerProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const [, getKeys] = useKeyboardControls();
  const setPlayerPosition = useInteractionStore(s => s.setPlayerPosition);
  
  useFrame((state, delta) => {
    if (!rigidBodyRef.current) return;
    
    const { forward, backward, left, right } = getKeys();
    
    // Calculate movement direction
    const direction = new Vector3();
    const cameraDirection = new Vector3();
    state.camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();
    
    if (forward) direction.add(cameraDirection);
    if (backward) direction.sub(cameraDirection);
    if (left) direction.add(cameraDirection.clone().cross(new Vector3(0, 1, 0)));
    if (right) direction.sub(cameraDirection.clone().cross(new Vector3(0, 1, 0)));
    
    direction.normalize().multiplyScalar(moveSpeed);
    
    // Apply velocity
    rigidBodyRef.current.setLinvel({ 
      x: direction.x, 
      y: rigidBodyRef.current.linvel().y, 
      z: direction.z 
    }, true);
    
    // Update position in store for interaction system
    const pos = rigidBodyRef.current.translation();
    setPlayerPosition([pos.x, pos.y, pos.z]);
  });
  
  return (
    <RigidBody 
      ref={rigidBodyRef}
      position={initialPosition}
      colliders="capsule"
      mass={1}
      lockRotations
    >
      {/* Player collider - no visual mesh for first person */}
      <mesh visible={false}>
        <capsuleGeometry args={[0.5, 1, 8, 16]} />
      </mesh>
    </RigidBody>
  );
}
```

### **B. Interaction System**

Raycasting to detect interactable objects:

```tsx
// components/three/exploration/InteractionSystem.tsx
import { useRef, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Raycaster, Vector2 } from 'three';
import { useInteractionStore } from '@/stores/interactionStore';

export function InteractionSystem() {
  const { camera, scene } = useThree();
  const raycaster = useRef(new Raycaster());
  const setHoveredObject = useInteractionStore(s => s.setHoveredObject);
  const setCanInteract = useInteractionStore(s => s.setCanInteract);
  
  useFrame(() => {
    // Cast ray from camera center
    raycaster.current.setFromCamera(new Vector2(0, 0), camera);
    
    // Find intersections with interactable objects
    const interactables = scene.children.filter(
      obj => obj.userData.interactable
    );
    const intersects = raycaster.current.intersectObjects(interactables, true);
    
    if (intersects.length > 0) {
      const closest = intersects[0].object;
      const interactableData = findInteractableParent(closest);
      
      setHoveredObject(interactableData);
      setCanInteract(intersects[0].distance < 3); // Within interaction range
    } else {
      setHoveredObject(null);
      setCanInteract(false);
    }
  });
  
  return null;
}

function findInteractableParent(object: THREE.Object3D): InteractableData | null {
  let current = object;
  while (current) {
    if (current.userData.interactable) {
      return current.userData as InteractableData;
    }
    current = current.parent!;
  }
  return null;
}
```

### **C. Interactable Objects**

Mark objects as interactable in the scene:

```tsx
// Example: An examinable object in the world
function ExaminableItem({ 
  position, 
  pageId, 
  onExamine 
}: ExaminableItemProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  // Store interaction data in userData
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.userData = {
        interactable: true,
        type: 'examine',
        pageId,
        prompt: 'Examine',
      };
    }
  }, [pageId]);
  
  return (
    <mesh
      ref={meshRef}
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial 
        color={hovered ? '#ffaa00' : '#888888'}
        emissive={hovered ? '#ffaa00' : '#000000'}
        emissiveIntensity={hovered ? 0.3 : 0}
      />
    </mesh>
  );
}
```

---

## **4. Scene Management**

### **A. Location Loading**

Async loading of location scenes:

```tsx
// hooks/useSceneLoader.ts
import { useEffect, useState } from 'react';
import { useWorldStore } from '@/stores/worldStore';

export function useSceneLoader(locationId: string) {
  const [scene, setScene] = useState<React.ComponentType | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    setLoading(true);
    
    // Dynamic import based on location
    const loadScene = async () => {
      try {
        const module = await import(`@/components/three/locations/${locationId}`);
        setScene(() => module.default);
      } catch (error) {
        console.error(`Failed to load location: ${locationId}`, error);
      } finally {
        setLoading(false);
      }
    };
    
    loadScene();
  }, [locationId]);
  
  return { scene, loading };
}
```

### **B. World Store**

Track exploration state:

```typescript
// stores/worldStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorldState {
  currentLocation: string;
  discoveredLocations: Set<string>;
  locationProgress: Map<string, number>; // 0-100% explored
  
  // Actions
  setCurrentLocation: (locationId: string) => void;
  discoverLocation: (locationId: string) => void;
  updateProgress: (locationId: string, progress: number) => void;
  isLocationDiscovered: (locationId: string) => boolean;
}

export const useWorldStore = create<WorldState>()(
  persist(
    (set, get) => ({
      currentLocation: 'initiation_chamber',
      discoveredLocations: new Set(['initiation_chamber']),
      locationProgress: new Map(),
      
      setCurrentLocation: (locationId) => {
        set({ currentLocation: locationId });
        
        // Discover on first visit
        if (!get().discoveredLocations.has(locationId)) {
          get().discoverLocation(locationId);
        }
      },
      
      discoverLocation: (locationId) => {
        set((state) => ({
          discoveredLocations: new Set(state.discoveredLocations).add(locationId),
        }));
        
        // Grant location page
        useGrimoireStore.getState().discoverPage(locationId);
        
        emitter.emit('locationDiscovered', { locationId });
      },
      
      updateProgress: (locationId, progress) => {
        set((state) => ({
          locationProgress: new Map(state.locationProgress).set(locationId, progress),
        }));
      },
      
      isLocationDiscovered: (locationId) => {
        return get().discoveredLocations.has(locationId);
      },
    }),
    {
      name: 'world-storage',
      partialize: (state) => ({
        discoveredLocations: Array.from(state.discoveredLocations),
        locationProgress: Array.from(state.locationProgress.entries()),
      }),
    }
  )
);
```

---

## **5. Performance Patterns**

### **A. Frustum Culling & LOD**

For large explorable spaces:

```tsx
import { Detailed, useGLTF } from '@react-three/drei';

function EnvironmentProp({ position }: { position: [number, number, number] }) {
  const highDetail = useGLTF('/models/prop_high.glb');
  const lowDetail = useGLTF('/models/prop_low.glb');
  
  return (
    <Detailed distances={[0, 10, 25]}>
      {/* Close: high detail */}
      <primitive object={highDetail.scene.clone()} />
      {/* Medium: low detail */}
      <primitive object={lowDetail.scene.clone()} />
      {/* Far: simple box */}
      <mesh>
        <boxGeometry args={[1, 2, 1]} />
        <meshBasicMaterial color="#444444" />
      </mesh>
    </Detailed>
  );
}
```

### **B. Instancing for Repeated Objects**

```tsx
import { Instances, Instance } from '@react-three/drei';

function ScatteredProps({ positions }: { positions: [number, number, number][] }) {
  return (
    <Instances limit={500}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#666666" />
      {positions.map((pos, i) => (
        <Instance key={i} position={pos} />
      ))}
    </Instances>
  );
}
```

---

## **6. WebGPU Readiness**

### **A. Current Strategy: WebGL Now, WebGPU Ready**

We use **WebGL** for maximum browser compatibility today, while writing code that will seamlessly migrate to **WebGPU** when browser support matures.

| Renderer | Browser Support (2026) | Our Status |
|----------|------------------------|------------|
| **WebGL 2** | 98%+ of browsers | Current default |
| **WebGPU** | ~60% (Chrome/Edge only) | Ready when needed |

### **B. WebGPU-Compatible Patterns**

Follow these patterns to ensure future WebGPU migration is trivial:

**1. Use R3F/Drei Abstractions (Not Raw WebGL)**

```tsx
// GOOD: Uses drei abstraction (works on both renderers)
import { useTexture, useGLTF } from '@react-three/drei';

function MyModel() {
  const texture = useTexture('/texture.png');
  const { scene } = useGLTF('/model.glb');
  return <primitive object={scene} />;
}

// AVOID: Raw WebGL calls (won't work on WebGPU)
const gl = renderer.getContext();
gl.bindTexture(gl.TEXTURE_2D, texture);
```

**2. Keep Shaders Simple and Portable**

```glsl
// GOOD: Standard GLSL that Three.js can transpile
uniform float uTime;
varying vec2 vUv;

void main() {
  gl_FragColor = vec4(vUv, sin(uTime), 1.0);
}

// AVOID: WebGL-specific extensions
#extension GL_OES_standard_derivatives : enable
```

**3. Use Three.js Material System**

```tsx
// GOOD: Three.js materials (renderer-agnostic)
<meshStandardMaterial color="#ff0000" metalness={0.5} />
<shaderMaterial uniforms={uniforms} vertexShader={vs} fragmentShader={fs} />

// AVOID: Direct WebGL uniform manipulation
material.program.uniforms.uColor.value = new Color('#ff0000');
```

### **C. Canvas Configuration for Future Migration**

```tsx
// Current setup (WebGL)
import { Canvas } from '@react-three/fiber';

function App() {
  return (
    <Canvas
      gl={{ 
        antialias: true, 
        powerPreference: 'high-performance',
        // Future: Add alpha, preserveDrawingBuffer as needed
      }}
    >
      <Scene />
    </Canvas>
  );
}

// Future setup (WebGPU) - when browser support reaches 80%+
// Simply add the renderer prop:
// <Canvas renderer="webgpu">
```

### **D. What WebGPU Will Enable (Future)**

| Feature | Use Case | Current Workaround |
|---------|----------|-------------------|
| **Compute Shaders** | Particle simulations, procedural generation | CPU-side calculations |
| **Better Batching** | More objects per draw call | Instancing (already using) |
| **Bindless Textures** | Faster texture switching | Texture atlases |
| **Async Compilation** | No shader compile stutter | Preload shaders at startup |

### **E. Migration Triggers**

| Condition | Action |
|-----------|--------|
| Browser support hits 80%+ | Evaluate WebGPU as default with WebGL fallback |
| Performance issues on Acts 2-4 | Test WebGPU renderer for GPU-bound scenes |
| Need compute shaders | WebGPU becomes required for that feature |
| Three.js WebGPU goes stable | Review migration effort |

### **F. Testing WebGPU Today (Optional)**

For periodic compatibility testing:

```tsx
// utils/rendererDetection.ts
export function supportsWebGPU(): boolean {
  return 'gpu' in navigator;
}

// App.tsx - Optional WebGPU preview mode
function App() {
  const useWebGPU = supportsWebGPU() && 
    new URLSearchParams(window.location.search).has('webgpu');
  
  return (
    <Canvas
      // Only enable WebGPU if explicitly requested AND supported
      {...(useWebGPU ? { renderer: 'webgpu' } : {})}
    >
      <Scene />
    </Canvas>
  );
}
```

**Testing URL:** `https://yourgame.com?webgpu` (Chrome/Edge only)

---

## **7. Combat Integration**

Combat is a subsystem triggered during exploration:

```typescript
// stores/combatStore.ts
interface CombatState {
  inCombat: boolean;
  currentEncounter: CombatEncounter | null;
  
  startCombat: (encounterId: string) => void;
  endCombat: (victory: boolean) => void;
}

export const useCombatStore = create<CombatState>((set, get) => ({
  inCombat: false,
  currentEncounter: null,
  
  startCombat: (encounterId) => {
    const encounter = getCombatEncounter(encounterId);
    set({ inCombat: true, currentEncounter: encounter });
    
    emitter.emit('combatStarted', { encounterId });
  },
  
  endCombat: (victory) => {
    const encounter = get().currentEncounter;
    
    if (victory && encounter) {
      // Grant rewards
      encounter.victoryRewards.pages.forEach(pageId => {
        useGrimoireStore.getState().discoverPage(pageId);
      });
      
      // Unlock new location if applicable
      if (encounter.victoryRewards.unlocksLocation) {
        useWorldStore.getState().discoverLocation(
          encounter.victoryRewards.unlocksLocation
        );
      }
    }
    
    set({ inCombat: false, currentEncounter: null });
    
    emitter.emit('combatEnded', { victory });
  },
}));
```

---

## **8. Event System**

Cross-component communication:

```typescript
// utils/events.ts
import mitt from 'mitt';

type Events = {
  // Exploration
  locationDiscovered: { locationId: string };
  playerMoved: { position: [number, number, number] };
  interactionTriggered: { objectId: string; type: string };
  
  // Discovery
  pageDiscovered: { pageId: string };
  questStarted: { questId: string };
  questCompleted: { questId: string; rewards: string[] };
  
  // Combat
  combatStarted: { encounterId: string };
  combatEnded: { victory: boolean };
  
  // Dialogue
  dialogueStarted: { characterId: string };
  dialogueEnded: { characterId: string };
};

export const emitter = mitt<Events>();
```

---

## **9. References**

* **React Three Fiber:** [Official Documentation](https://docs.pmnd.rs/react-three-fiber)
* **Drei Helpers:** [Drei GitHub](https://github.com/pmndrs/drei)
* **Rapier Physics:** [@react-three/rapier Docs](https://github.com/pmndrs/react-three-rapier)
* **Zustand:** [Zustand Documentation](https://github.com/pmndrs/zustand)
* **Three.js WebGPU:** [Three.js WebGPU Examples](https://threejs.org/examples/?q=webgpu)
* **WebGPU Spec:** [W3C WebGPU](https://www.w3.org/TR/webgpu/)
* **Game Design Document:** `_ai_skills/game_design_document.md`
