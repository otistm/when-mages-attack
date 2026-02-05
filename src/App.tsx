import { Suspense, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';

import { Arena } from '@/components/three/arena/Arena';
import { CameraRig } from '@/components/three/CameraRig';
import { ExplorationScene } from '@/components/three/exploration';
import { ExplorationHUD, InteractionPrompt } from '@/components/ui/exploration';
import { GameLayout } from '@/components/ui/GameLayout';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { CardLorePanel } from '@/components/ui/CardLorePanel';
import { GameOverOverlay } from '@/components/ui/GameOverOverlay';
import { CraftingScene } from '@/components/ui/crafting/CraftingScene';
import { DeathSequence } from '@/components/ui/DeathSequence';
import { VictorySequence } from '@/components/ui/VictorySequence';
import { useGameStore } from '@/stores/gameStore';
import { usePuzzleStore } from '@/stores/puzzleStore';

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

  // Exploration phase - 3D world exploration with vertical slice
  if (phase === 'exploration') {
    return <ExplorationPhase isDev={isDev} />;
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

/**
 * ExplorationPhase - Manages the vertical slice game flow
 * Handles death sequence, victory sequence, and game state
 */
function ExplorationPhase({ isDev }: { isDev: boolean }) {
  const [showDeathSequence, setShowDeathSequence] = useState(false);
  const [showVictorySequence, setShowVictorySequence] = useState(false);
  const [showKeeperBattle, setShowKeeperBattle] = useState(false);
  
  const resetPuzzle = usePuzzleStore(s => s.reset);
  
  // Handle trap triggered - show death sequence
  const handleTrapTriggered = useCallback(() => {
    setShowDeathSequence(true);
  }, []);
  
  // Handle respawn after death
  const handleRespawn = useCallback(() => {
    setShowDeathSequence(false);
    // Note: puzzle state is preserved, player can try again
  }, []);
  
  // Handle keeper awakening - would transition to combat
  // For now, just show victory (simplified vertical slice)
  const handleKeeperAwakened = useCallback(() => {
    console.log('[App] Keeper awakened - starting battle sequence');
    // TODO: Implement full combat transition
    // For vertical slice, skip to victory after brief delay
    setShowKeeperBattle(true);
    setTimeout(() => {
      setShowKeeperBattle(false);
      setShowVictorySequence(true);
    }, 3000);
  }, []);
  
  // Handle victory sequence complete - reset game
  const handleVictoryComplete = useCallback(() => {
    setShowVictorySequence(false);
    resetPuzzle();
    // Could transition to menu or restart exploration
  }, [resetPuzzle]);
  
  return (
    <div className="w-screen h-screen bg-black">
      <Canvas
        shadows={{ type: THREE.BasicShadowMap }}
        camera={{ fov: 60, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false }}
        className="!absolute inset-0 w-full h-full"
      >
        <ExplorationScene 
          onTrapTriggered={handleTrapTriggered}
          onKeeperAwakened={handleKeeperAwakened}
        />
      </Canvas>
      
      {/* Exploration UI overlay */}
      <ExplorationHUD />
      
      {/* Interaction prompts */}
      <InteractionPrompt />
      
      {/* Keeper battle indicator (simplified) */}
      {showKeeperBattle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="text-amber-200 text-2xl font-serif animate-pulse">
            The Archivist awakens...
          </div>
        </div>
      )}
      
      {/* Death sequence overlay */}
      <DeathSequence 
        isActive={showDeathSequence} 
        onRespawn={handleRespawn} 
      />
      
      {/* Victory sequence overlay */}
      <VictorySequence 
        isActive={showVictorySequence} 
        onComplete={handleVictoryComplete}
      />
      
      {/* Phase indicator (dev) */}
      {isDev && (
        <div className="fixed top-2 right-2 bg-arcane-purple/80 px-2 py-0.5 rounded text-xs font-mono z-[100]">
          Phase: exploration
        </div>
      )}
    </div>
  );
}

export default App;
