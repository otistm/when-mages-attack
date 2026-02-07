/**
 * Health Bar - Player/Enemy health display
 */

import { useGameStore } from '@/stores/gameStore';

interface HealthBarProps {
  side: 'player' | 'enemy';
}

export function HealthBar({ side }: HealthBarProps) {
  const player = useGameStore((state) => state.player);
  const enemy = useGameStore((state) => state.enemy);
  
  const data = side === 'player' ? player : enemy;
  const percentage = (data.health / data.maxHealth) * 100;
  
  const barColor = side === 'player' ? 'bg-green-500' : 'bg-red-500';
  const glowColor = side === 'player' ? 'shadow-green-500/50' : 'shadow-red-500/50';
  
  return (
    <div style={{ width: 'clamp(120px, 15vw, 192px)' }}>
      {/* Label */}
      <div className="flex justify-between text-game-caption text-white/80 mb-1 font-body">
        <span className="font-semibold">
          {side === 'player' ? 'You' : 'Enemy'}
        </span>
        <span>
          {data.health}/{data.maxHealth}
        </span>
      </div>
      
      {/* Bar container */}
      <div className="bg-arcane-dark rounded-full overflow-hidden border border-arcane-purple/50 shadow-lg" style={{ height: 'var(--hp-bar-height)' }}>
        {/* Fill */}
        <div
          className={`h-full ${barColor} transition-all duration-300 ease-out shadow-lg ${glowColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default HealthBar;
