/**
 * Action Buttons - Phase-specific action buttons
 */

import { useGameStore } from '@/stores/gameStore';
import { useCombatStore } from '@/stores/combatStore';
import { useCraftingStore } from '@/stores/craftingStore';
import { v4 as uuid } from 'uuid';

export function ActionButtons() {
  const phase = useGameStore((state) => state.phase);
  const setPhase = useGameStore((state) => state.setPhase);
  const startNewRun = useGameStore((state) => state.startNewRun);
  const advanceTurn = useGameStore((state) => state.advanceTurn);
  
  const startCombat = useCombatStore((state) => state.startCombat);
  const resetCombat = useCombatStore((state) => state.reset);
  
  const addCard = useCraftingStore((state) => state.addCard);
  
  // Handle action based on current phase
  const handlePrimaryAction = () => {
    switch (phase) {
      case 'menu':
        startNewRun();
        break;
        
      case 'draft':
        // Add some starter cards for testing
        addStarterCards();
        setPhase('shop');
        break;
        
      case 'shop':
        setPhase('deploy');
        break;
        
      case 'deploy':
        setPhase('combat');
        startCombat();
        break;
        
      case 'combat':
        // Combat runs automatically
        break;
        
      case 'result':
        resetCombat();
        advanceTurn();
        break;
    }
  };
  
  // Add starter cards (for testing)
  const addStarterCards = () => {
    const starterCards = [
      { name: 'Fire Imp', color: '#ff6b35', tags: ['fire', 'fast'] },
      { name: 'Stone Golem', color: '#8b8b8b', tags: ['earth', 'heavy'] },
      { name: 'Water Sprite', color: '#4da6ff', tags: ['water', 'swift'] },
    ];
    
    starterCards.forEach((card) => {
      addCard({
        instanceId: uuid(),
        definitionId: card.name.toLowerCase().replace(' ', '_'),
        statModifiers: {},
        bonusTags: card.tags as any[],
        bonusAbilities: [],
        level: 1,
        experience: 0,
      });
    });
  };
  
  const getButtonLabel = () => {
    switch (phase) {
      case 'menu': return 'Start Game';
      case 'draft': return 'Confirm Draft';
      case 'shop': return 'Ready to Deploy';
      case 'deploy': return 'Start Combat!';
      case 'combat': return 'Combat in Progress...';
      case 'result': return 'Next Turn';
      default: return 'Continue';
    }
  };
  
  const isDisabled = phase === 'combat';
  
  return (
    <div className="flex" style={{ gap: 'var(--space-sm)' }}>
      <button
        onClick={handlePrimaryAction}
        disabled={isDisabled}
        className={`
          rounded-lg font-display text-game-body font-bold
          transition-all duration-200
          ${isDisabled
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-arcane-gold text-arcane-dark hover:bg-arcane-gold-light hover:scale-105 active:scale-95'
          }
          shadow-lg shadow-arcane-gold/20
        `}
        style={{ padding: 'var(--space-sm) var(--space-lg)' }}
      >
        {getButtonLabel()}
      </button>
    </div>
  );
}

export default ActionButtons;
