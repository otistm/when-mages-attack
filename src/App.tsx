import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';

import { Arena } from '@/components/three/arena/Arena';
import { CameraRig } from '@/components/three/CameraRig';
import { GameLayout } from '@/components/ui/GameLayout';
import { HandheldGameLayout } from '@/components/ui/HandheldGameLayout';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { CardLorePanel } from '@/components/ui/CardLorePanel';
import { GameOverOverlay } from '@/components/ui/GameOverOverlay';
import { StartScreen } from '@/components/ui/StartScreen';
import { AllegianceScreen } from '@/components/ui/AllegianceScreen';
import { GrimoireScreen } from '@/components/ui/GrimoireScreen';
import { CraftingScene } from '@/components/ui/crafting/CraftingScene';
import { HandheldCraftingScene } from '@/components/ui/crafting/HandheldCraftingScene';
import { UIScaleControl } from '@/components/ui/hud/UIScaleControl';
import { useGameStore } from '@/stores/gameStore';
import { initUIScale } from '@/hooks/useUIScale';
import { useLayoutMode } from '@/hooks/useLayoutMode';
import { initializeAudio, AudioCues, useAudioStore } from '@/stores/audioStore';

// Initialize UI scale before first render (reads localStorage / detects handheld)
initUIScale();

// Initialize audio (loads sound effects)
initializeAudio();

function App() {
  const phase = useGameStore((state) => state.phase);
  const { isHandheld } = useLayoutMode();
  const isDev = import.meta.env.DEV;

  // Crafting music disabled
  // useEffect(() => {
  //   AudioCues.onCraftingStart();
  // }, []);

  // Layer arena voices on/off during combat
  useEffect(() => {
    if (phase === 'combat') {
      AudioCues.onBattleStart();
    } else {
      AudioCues.onBattleEnd();
    }
  }, [phase]);

  // Track status effects for ambient sounds
  const playerEffects = useGameStore((state) => state.player.statusEffects);
  const enemyEffects = useGameStore((state) => state.enemy.statusEffects);
  const hasPoisonActive = playerEffects.includes('poison') || enemyEffects.includes('poison');
  const hasBurnActive = playerEffects.includes('burn') || enemyEffects.includes('burn');

  useEffect(() => {
    if (hasPoisonActive && phase === 'combat') {
      AudioCues.onPoisonStart();
    } else {
      AudioCues.onPoisonEnd();
    }
  }, [hasPoisonActive, phase]);

  useEffect(() => {
    if (hasBurnActive && phase === 'combat') {
      AudioCues.onBurnStart();
    } else {
      AudioCues.onBurnEnd();
    }
  }, [hasBurnActive, phase]);

  // Start screen
  if (phase === 'start') {
    return <StartScreen />;
  }

  // Mage allegiance selection
  if (phase === 'allegiance') {
    return <AllegianceScreen />;
  }

  // Grimoire browser
  if (phase === 'grimoire') {
    return <GrimoireScreen />;
  }

  // Crafting phase renders its own full-screen scene
  if (phase === 'crafting') {
    return (
      <>
        {isHandheld ? <HandheldCraftingScene /> : <CraftingScene />}
        {!isHandheld && <CardLorePanel />}
        <UIScaleControl />
        {/* Phase indicator (dev) */}
        {isDev && (
          <div className="fixed top-2 right-2 bg-arcane-purple/80 px-2 py-0.5 rounded text-xs font-mono z-[100] invisible">
            Phase: {phase} · {isHandheld ? 'Handheld' : 'Desktop'}
          </div>
        )}
      </>
    );
  }

  // Combat phase - choose layout based on mode
  const LayoutComponent = isHandheld ? HandheldGameLayout : GameLayout;

  return (
    <LayoutComponent>
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

      {/* Card Lore Panel (floating overlay) - only on desktop */}
      {!isHandheld && <CardLorePanel />}

      {/* Game over screen */}
      <GameOverOverlay />

      {/* UI Scale control */}
      <UIScaleControl />

      {/* Phase indicator (dev) */}
      {isDev && (
        <div className="absolute top-2 right-2 bg-arcane-purple/80 px-2 py-0.5 rounded text-xs font-mono z-50">
          Phase: {phase} · {isHandheld ? 'Handheld' : 'Desktop'}
        </div>
      )}
    </LayoutComponent>
  );
}

export default App;
