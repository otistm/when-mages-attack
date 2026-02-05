/**
 * Action Buttons - Phase-specific action buttons
 */

import { useGameStore } from '@/stores/gameStore';
import { useArenaStore } from '@/stores/arenaStore';
import { useCraftingStore } from '@/stores/craftingStore';
import { v4 as uuid } from 'uuid';

export function ActionButtons() {
  const phase = useGameStore((state) => state.phase);
  const setPhase = useGameStore((state) => state.setPhase);
  const startNewRun = useGameStore((state) => state.startNewRun);
  const advanceTurn = useGameStore((state) => state.advanceTurn);
  
  const spawnMinion = useArenaStore((state) => state.spawnMinion);
  const startCombat = useArenaStore((state) => state.startCombat);
  const clearArena = useArenaStore((state) => state.clearArena);
  
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
        // Spawn test minions
        spawnTestMinions();
        setPhase('combat');
        startCombat();
        break;
        
      case 'combat':
        // Combat runs automatically
        break;
        
      case 'result':
        clearArena();
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
  
  // Spawn test minions (5 per side for 5 card slots)
  const spawnTestMinions = () => {
    // Player minions
    for (let i = 0; i < 5; i++) {
      spawnMinion(
        { cardInstanceId: `test-${i}`, team: 'player', slotIndex: i },
        {
          name: `Player Unit ${i + 1}`,
          cardDefinitionId: 'test',
          stats: {
            hp: 20,
            maxHp: 20,
            attack: 5,
            speed: 2,
            mass: 1,
            range: 1.5,
            attackSpeed: 1,
          },
          tags: [],
          abilities: [],
          color: '#00ff88',
        }
      );
    }
    
    // Enemy minions
    for (let i = 0; i < 5; i++) {
      spawnMinion(
        { cardInstanceId: `enemy-${i}`, team: 'enemy', slotIndex: i },
        {
          name: `Enemy Unit ${i + 1}`,
          cardDefinitionId: 'enemy',
          stats: {
            hp: 15,
            maxHp: 15,
            attack: 4,
            speed: 1.8,
            mass: 1,
            range: 1.5,
            attackSpeed: 1.2,
          },
          tags: [],
          abilities: [],
          color: '#ff4444',
        }
      );
    }
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
    <div className="flex gap-3">
      <button
        onClick={handlePrimaryAction}
        disabled={isDisabled}
        className={`
          px-6 py-3 rounded-lg font-display text-lg font-bold
          transition-all duration-200
          ${isDisabled
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-arcane-gold text-arcane-dark hover:bg-arcane-gold-light hover:scale-105 active:scale-95'
          }
          shadow-lg shadow-arcane-gold/20
        `}
      >
        {getButtonLabel()}
      </button>
    </div>
  );
}

export default ActionButtons;
