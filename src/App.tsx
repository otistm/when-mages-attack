import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';

import { Arena } from '@/components/three/arena/Arena';
import { CameraRig } from '@/components/three/CameraRig';
import { GameLayout } from '@/components/ui/GameLayout';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { CardLorePanel } from '@/components/ui/CardLorePanel';
import { GameOverOverlay } from '@/components/ui/GameOverOverlay';
import { CraftingScene } from '@/components/ui/crafting/CraftingScene';
import { useGameStore } from '@/stores/gameStore';

function App() {
  const phase = useGameStore((state) => state.phase);
  const isDev = import.meta.env.DEV;

  // Crafting phase renders its own full-screen scene
  if (phase === 'crafting') {
    return (
      <>
        <CraftingScene />
        {/* Phase indicator (dev) */}
        {isDev && (
          <div className="fixed top-2 right-2 bg-arcane-purple/80 px-2 py-0.5 rounded text-xs font-mono z-[100]">
            Phase: {phase}
          </div>
        )}
      </>
    );
  }

  return (
    <GameLayout>
      {/* 3D Canvas - fills the arena section of the layout */}
      <Canvas
        shadows={{ type: THREE.BasicShadowMap }}
        camera={{ position: [0, 35, 0.1], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        className="!absolute inset-0 w-full h-full"
        style={{ background: '#1a1a2e' }}
      >
        {isDev && <Stats />}
        
        <Suspense fallback={null}>
          <Physics gravity={[0, -9.81, 0]} debug={isDev}>
            <CameraRig />
            <Arena />
          </Physics>
        </Suspense>
      </Canvas>

      {/* Loading screen overlay */}
      <Suspense fallback={<LoadingScreen />}>
        <div /> {/* Empty div to trigger suspense boundary */}
      </Suspense>

      {/* Card Lore Panel (floating overlay) */}
      <CardLorePanel />

      {/* Game over screen */}
      <GameOverOverlay />

      {/* Phase indicator (dev) */}
      {isDev && (
        <div className="absolute top-2 right-2 bg-arcane-purple/80 px-2 py-0.5 rounded text-xs font-mono z-50">
          Phase: {phase}
        </div>
      )}
    </GameLayout>
  );
}

export default App;
