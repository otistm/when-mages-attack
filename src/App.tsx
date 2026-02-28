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
import { ErrorBoundary, CanvasFallback } from '@/components/ui/ErrorBoundary';
import { useGameStore } from '@/stores/gameStore';
import { initUIScale } from '@/hooks/useUIScale';
import { useLayoutMode } from '@/hooks/useLayoutMode';
import { initializeAudio, AudioCues, useAudioStore } from '@/stores/audioStore';
import { preloadPhaseAssets } from '@/utils/assetPreloader';
import { usePhaseRouter } from '@/hooks/usePhaseRouter';
import { DebugSpawnPanel } from '@/components/ui/debug/DebugSpawnPanel';
import '@/data/minionRegistrations';

// Initialize UI scale before first render (reads localStorage / detects handheld)
initUIScale();

// Initialize audio (loads sound effects)
initializeAudio();

function App() {
  const phase = useGameStore((state) => state.phase);

  const { isHandheld } = useLayoutMode();
  const isDev = import.meta.env.DEV;

  // Sync gameStore.phase ↔ browser URL
  usePhaseRouter();

  // Crafting music disabled
  // useEffect(() => {
  //   AudioCues.onCraftingStart();
  // }, []);

  // Preload assets for upcoming phase
  useEffect(() => {
    preloadPhaseAssets(phase);
  }, [phase]);

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

  if (phase === 'start') {
    return <ErrorBoundary name="StartScreen"><StartScreen /></ErrorBoundary>;
  }

  if (phase === 'allegiance') {
    return <ErrorBoundary name="AllegianceScreen"><AllegianceScreen /></ErrorBoundary>;
  }

  if (phase === 'grimoire') {
    return <ErrorBoundary name="GrimoireScreen"><GrimoireScreen /></ErrorBoundary>;
  }

  if (phase === 'crafting') {
    return (
      <ErrorBoundary name="CraftingScene">
        {isHandheld ? <HandheldCraftingScene /> : <CraftingScene />}
        {!isHandheld && <CardLorePanel />}
        <UIScaleControl />
      </ErrorBoundary>
    );
  }

  // Combat phase - choose layout based on mode
  const LayoutComponent = isHandheld ? HandheldGameLayout : GameLayout;

  return (
    <ErrorBoundary name="CombatLayout">
      <LayoutComponent>
        <ErrorBoundary name="3DCanvas" fallback={<CanvasFallback />}>
          <Canvas
            shadows={{ type: THREE.BasicShadowMap }}
            camera={{ position: [0, 38, 22], fov: 45 }}
            gl={{ antialias: true, alpha: false }}
            className="!absolute inset-0 w-full h-full"
            style={{ background: '#1a1a2e' }}
          >
            {isDev && <Stats />}
            
            <Suspense fallback={null}>
              <Physics gravity={[0, -9.81, 0]}>
                <CameraRig />
                <Arena />
              </Physics>
            </Suspense>
          </Canvas>
        </ErrorBoundary>

        <Suspense fallback={<LoadingScreen />}>
          <div />
        </Suspense>

        {!isHandheld && <CardLorePanel />}

        <ErrorBoundary name="GameOverOverlay">
          <GameOverOverlay />
        </ErrorBoundary>

        <UIScaleControl />

        {isDev && <DebugSpawnPanel />}

      </LayoutComponent>
    </ErrorBoundary>
  );
}

export default App;
