/**
 * GameOverOverlay - Battle result screen with blur effect
 */

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useCombatStore } from '@/stores/combatStore';
import { useCardStore } from '@/stores/cardStore';
import { useCraftingStore } from '@/stores/craftingStore';

export function GameOverOverlay() {
  const player = useGameStore((state) => state.player);
  const enemy = useGameStore((state) => state.enemy);
  const setPhase = useGameStore((state) => state.setPhase);
  const resetGame = useGameStore((state) => state.reset);
  const resetCombat = useCombatStore((state) => state.reset);
  const clearAllCards = useCardStore((state) => state.clearAll);
  const resetCrafting = useCraftingStore((state) => state.reset);
  
  // Check for game over based on health (disabled in dev mode for testing)
  const playerDead = player.health <= 0;
  const enemyDead = enemy.health <= 0;
  const gameOver = import.meta.env.DEV ? false : (playerDead || enemyDead);
  const winner = enemyDead ? 'player' : playerDead ? 'enemy' : null;
  
  // Track if we've already cleared the combat scene
  const hasCleared = useRef(false);
  
  // Immediately clear cards and stop combat when game over is detected
  useEffect(() => {
    if (gameOver && !hasCleared.current) {
      hasCleared.current = true;
      // Clear all active cards to stop cooldowns and remove pages from display
      clearAllCards();
      // Reset combat state (stops minion spawning, etc.)
      resetCombat();
    }
    
    // Reset the flag when game is no longer over
    if (!gameOver) {
      hasCleared.current = false;
    }
  }, [gameOver, clearAllCards, resetCombat]);
  
  if (!gameOver) return null;
  
  const isPlayerWin = winner === 'player';
  
  const handlePlayAgain = () => {
    // Reset game and crafting state (cards/combat already cleared when game over detected)
    resetGame();
    resetCrafting();
    // Go back to crafting phase
    setPhase('crafting');
  };
  
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-[100]"
      style={{ 
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
      }}
    >
      <div 
        className="flex flex-col items-center"
        style={{ animation: 'zoomIn 0.5s ease-out', gap: 'var(--space-xl)' }}
      >
        {/* Title */}
        <h1 
          className="text-game-title font-bold"
          style={{
            color: isPlayerWin ? '#FFD700' : '#FF6B6B',
            textShadow: isPlayerWin 
              ? '0 0 40px rgba(255, 215, 0, 0.8), 0 0 80px rgba(255, 215, 0, 0.4)' 
              : '0 0 40px rgba(255, 107, 107, 0.8)',
            WebkitTextStroke: '2px rgba(0,0,0,0.3)',
            paintOrder: 'stroke fill',
          }}
        >
          {isPlayerWin ? 'Magnifico!' : 'Defeated...'}
        </h1>
        
        {/* Subtitle */}
        <p className="text-game-subheading text-white/70 italic">
          {isPlayerWin 
            ? 'The enemy has been vanquished!' 
            : 'Your grimoire needs more power...'}
        </p>
        
        {/* Play Again Button */}
        <button
          onClick={handlePlayAgain}
          className="text-game-subheading font-bold text-white rounded-xl cursor-pointer transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
            border: 'none',
            padding: 'var(--space-md) var(--space-2xl)',
          }}
        >
          Play Again
        </button>
      </div>
      
      {/* CSS Animation */}
      <style>{`
        @keyframes zoomIn {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default GameOverOverlay;
