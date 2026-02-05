/**
 * FullWidthHealthBar - Full viewport width health bar
 * Used for both player and enemy HP displays in the new layout
 * Displays active status effects with visual indicators
 * Tracks screen position for projectile targeting
 * 
 * Burn effect: HP bar appears on fire with particles
 */

import { useRef, useEffect, useCallback, useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useUIStore } from '@/stores/uiStore';
import { StatusEffectType } from '@/types';

interface FullWidthHealthBarProps {
  side: 'player' | 'enemy';
}

// Status effect visual configurations (burn excluded - uses fire effect instead)
const STATUS_CONFIG: Record<StatusEffectType, {
  color: string;
  bgColor: string;
  icon: string;
  animation: string;
}> = {
  burn: {
    color: '#ff6b35',
    bgColor: 'rgba(255, 107, 53, 0.3)',
    icon: '🔥',
    animation: 'animate-pulse',
  },
  freeze: {
    color: '#67e8f9',
    bgColor: 'rgba(103, 232, 249, 0.3)',
    icon: '❄️',
    animation: 'animate-bounce',
  },
  shocked: {
    color: '#fbbf24',
    bgColor: 'rgba(251, 191, 36, 0.3)',
    icon: '⚡',
    animation: 'animate-ping',
  },
  poison: {
    color: '#a3e635',
    bgColor: 'rgba(163, 230, 53, 0.3)',
    icon: '☠️',
    animation: 'animate-pulse',
  },
  blighted: {
    color: '#9333ea',
    bgColor: 'rgba(147, 51, 234, 0.3)',
    icon: '💀',
    animation: 'animate-pulse',
  },
};

// Fire particle component for burn effect
function FireParticles({ intensity = 1 }: { intensity?: number }) {
  const particleCount = Math.floor(20 * intensity);
  
  const particles = useMemo(() => 
    Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: 0.5 + Math.random() * 0.5,
      size: 6 + Math.random() * 12,
      hue: 15 + Math.random() * 35, // Red-orange to yellow range
      type: Math.random() > 0.7 ? 'ember' : 'flame',
    })),
    [particleCount]
  );
  
  return (
    <div className="absolute inset-0 overflow-visible pointer-events-none" style={{ zIndex: 10 }}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            bottom: p.type === 'ember' ? '-2px' : '0',
            width: p.type === 'ember' ? p.size * 0.5 : p.size,
            height: p.type === 'ember' ? p.size * 0.5 : p.size * 1.5,
            background: p.type === 'ember' 
              ? `radial-gradient(circle, hsla(${p.hue}, 100%, 70%, 1) 0%, hsla(${p.hue}, 100%, 50%, 0.8) 50%, transparent 100%)`
              : `radial-gradient(ellipse at center bottom, hsla(${p.hue}, 100%, 65%, 0.95) 0%, hsla(${p.hue - 10}, 100%, 50%, 0.7) 40%, transparent 100%)`,
            animation: `fireRise ${p.duration}s ease-out infinite`,
            animationDelay: `${p.delay}s`,
            filter: p.type === 'ember' ? 'blur(0.5px)' : 'blur(2px)',
            boxShadow: p.type === 'ember' ? `0 0 4px hsla(${p.hue}, 100%, 60%, 0.8)` : 'none',
          }}
        />
      ))}
    </div>
  );
}

// Fire glow overlay for the entire bar
function FireGlow() {
  return (
    <>
      {/* Base fire glow overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, rgba(255,60,0,0.5) 0%, rgba(255,120,0,0.6) 30%, rgba(255,180,0,0.5) 50%, rgba(255,120,0,0.6) 70%, rgba(255,60,0,0.5) 100%)',
          animation: 'fireFlicker 0.12s ease-in-out infinite alternate',
        }}
      />
      {/* Intense center glow */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 100%, rgba(255,200,50,0.4) 0%, transparent 60%)',
          animation: 'fireFlicker 0.18s ease-in-out infinite alternate-reverse',
        }}
      />
      {/* Top flame edge - taller and more visible */}
      <div 
        className="absolute inset-x-0 -top-3 h-6 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(255,100,0,0.7) 0%, rgba(255,180,50,0.4) 30%, rgba(255,220,100,0.2) 60%, transparent 100%)',
          animation: 'fireFlicker 0.15s ease-in-out infinite alternate',
          filter: 'blur(3px)',
        }}
      />
      {/* Bottom ember glow */}
      <div 
        className="absolute inset-x-0 -bottom-2 h-4 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(255,50,0,0.6) 0%, rgba(255,100,0,0.3) 50%, transparent 100%)',
          animation: 'fireFlicker 0.2s ease-in-out infinite alternate-reverse',
          filter: 'blur(2px)',
        }}
      />
      {/* Animated flame border */}
      <div 
        className="absolute inset-0 pointer-events-none rounded-sm"
        style={{
          boxShadow: '0 0 12px rgba(255,100,0,0.8), 0 0 24px rgba(255,150,0,0.5), inset 0 0 8px rgba(255,200,0,0.4)',
          animation: 'fireFlicker 0.1s ease-in-out infinite alternate',
        }}
      />
    </>
  );
}

// Status effect indicator component (excludes burn - handled separately)
function StatusIndicator({ effect }: { effect: { type: StatusEffectType; duration: number; elapsed: number } }) {
  const config = STATUS_CONFIG[effect.type];
  if (!config) return null;
  
  // Calculate remaining time as percentage
  const remaining = Math.max(0, effect.duration - effect.elapsed);
  const progress = (remaining / effect.duration) * 100;
  
  return (
    <div 
      className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${config.animation}`}
      style={{ backgroundColor: config.bgColor }}
    >
      <span className="text-sm">{config.icon}</span>
      <div 
        className="w-8 h-1.5 rounded-full overflow-hidden"
        style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
      >
        <div 
          className="h-full transition-all duration-200"
          style={{ 
            width: `${progress}%`,
            backgroundColor: config.color,
          }}
        />
      </div>
    </div>
  );
}

export function FullWidthHealthBar({ side }: FullWidthHealthBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const setHPBarRect = useUIStore((state) => state.setHPBarRect);
  
  // Get player/enemy health and status effects from game store
  const player = useGameStore((state) => state.player);
  const enemy = useGameStore((state) => state.enemy);
  const gameStatusEffects = useGameStore((state) => state.statusEffects);
  const stateData = side === 'player' ? player : enemy;
  
  // Get status effects for this side from game store
  const statusEffects = side === 'player' ? gameStatusEffects.player : gameStatusEffects.enemy;
  
  // Check if burning - special visual effect
  const isBurning = statusEffects.some(e => e.type === 'burn');
  
  // Non-burn status effects for icon display
  const nonBurnEffects = statusEffects.filter(e => e.type !== 'burn');
  
  // Track HP bar position in screen space
  const updatePosition = useCallback(() => {
    if (!barRef.current) return;
    
    const rect = barRef.current.getBoundingClientRect();
    setHPBarRect(side, {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
    });
  }, [side, setHPBarRect]);
  
  // Update position on mount, resize, and periodically
  useEffect(() => {
    updatePosition();
    
    // Update on window resize
    window.addEventListener('resize', updatePosition);
    
    // Also update periodically in case of layout shifts
    const interval = setInterval(updatePosition, 500);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      clearInterval(interval);
    };
  }, [updatePosition]);
  
  const percentage = (stateData.health / stateData.maxHealth) * 100;
  const isPlayer = side === 'player';
  
  // Determine if any non-burn status effects are active
  const hasNonBurnStatus = nonBurnEffects.length > 0;
  
  // Color configuration
  const barBg = isPlayer ? 'bg-green-900/50' : 'bg-red-900/50';
  const barFill = isBurning 
    ? 'bg-gradient-to-r from-orange-600 to-yellow-500' // Fire colors when burning
    : isPlayer 
      ? 'bg-gradient-to-r from-green-600 to-green-400' 
      : 'bg-gradient-to-r from-red-600 to-red-400';
  const glowColor = isBurning 
    ? 'shadow-orange-500/50' 
    : isPlayer ? 'shadow-green-500/30' : 'shadow-red-500/30';
  const borderColor = isBurning
    ? 'border-orange-500'
    : isPlayer ? 'border-green-700/50' : 'border-red-700/50';
  
  // Status effect border overlay for non-burn effects
  const statusBorderStyle = hasNonBurnStatus 
    ? { 
        boxShadow: `inset 0 0 8px ${STATUS_CONFIG[nonBurnEffects[0]?.type]?.color ?? 'transparent'}`,
        borderColor: STATUS_CONFIG[nonBurnEffects[0]?.type]?.color ?? undefined,
      }
    : {};
  
  const label = isPlayer ? 'PLAYER' : 'ENEMY';
  const healthText = `${Math.ceil(stateData.health)}/${stateData.maxHealth}`;
  
  return (
    <div className={`w-full px-3 py-1.5 ${barBg} isolate`}>
      <div className="flex items-center gap-3">
        {/* Label */}
        <span 
          className="text-xs font-bold uppercase tracking-wider min-w-[60px]"
          style={{ color: isBurning ? '#ff6b35' : isPlayer ? '#4ade80' : '#f87171' }}
        >
          {label}
        </span>
        
        {/* Bar container - tracked for projectile targeting */}
        <div 
          ref={barRef}
          className={`flex-1 h-5 rounded-sm overflow-visible border ${borderColor} shadow-lg ${glowColor} transition-all duration-200 relative`}
          style={{ 
            backgroundColor: isBurning ? 'rgba(50,20,0,0.6)' : 'rgba(0,0,0,0.4)',
            ...statusBorderStyle,
          }}
        >
          {/* Fire effect when burning */}
          {isBurning && (
            <>
              <FireGlow />
              <FireParticles intensity={1.2} />
            </>
          )}
          
          {/* Non-burn status effect background pulse */}
          {hasNonBurnStatus && !isBurning && (
            <div 
              className="absolute inset-0 animate-pulse pointer-events-none"
              style={{ 
                backgroundColor: STATUS_CONFIG[nonBurnEffects[0]?.type]?.bgColor,
                borderRadius: 'inherit',
              }}
            />
          )}
          
          {/* Health fill */}
          <div
            className={`h-full ${barFill} transition-all duration-300 ease-out relative`}
            style={{ width: `${Math.max(0, percentage)}%` }}
          >
            {/* Shimmer effect on health - more intense when burning */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              style={{
                animation: isBurning ? 'shimmer 0.5s infinite' : 'shimmer 2s infinite',
              }}
            />
          </div>
          
          {/* Status effect text - centered in bar */}
          {statusEffects.length > 0 && (
            <div 
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ zIndex: 20 }}
            >
              <div className="flex items-center gap-2">
                {Object.values(
                  statusEffects.reduce((acc, effect) => {
                    const existing = acc[effect.type];
                    const remaining = effect.duration - effect.elapsed;
                    const existingRemaining = existing ? existing.duration - existing.elapsed : 0;
                    if (!existing || remaining > existingRemaining) {
                      acc[effect.type] = effect;
                    }
                    return acc;
                  }, {} as Record<string, typeof statusEffects[0]>)
                ).map((effect) => {
                  const config = STATUS_CONFIG[effect.type];
                  if (!config) return null;
                  const remaining = Math.max(0, effect.duration - effect.elapsed);
                  return (
                    <span 
                      key={effect.type}
                      className={`text-xs font-bold uppercase tracking-wider ${config.animation}`}
                      style={{
                        color: config.color,
                        textShadow: `0 0 8px ${config.color}, 0 1px 2px rgba(0,0,0,0.8)`,
                      }}
                    >
                      {config.icon} {effect.type.toUpperCase()} {remaining.toFixed(1)}s
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        {/* Status effect indicators - only non-burn effects (burn uses fire visual) */}
        {hasNonBurnStatus && (
          <div className="flex gap-1">
            {Object.values(
              nonBurnEffects.reduce((acc, effect) => {
                const existing = acc[effect.type];
                const remaining = effect.duration - effect.elapsed;
                const existingRemaining = existing ? existing.duration - existing.elapsed : 0;
                // Keep the one with longest remaining time
                if (!existing || remaining > existingRemaining) {
                  acc[effect.type] = effect;
                }
                return acc;
              }, {} as Record<string, typeof nonBurnEffects[0]>)
            ).map((effect) => (
              <StatusIndicator key={effect.type} effect={effect} />
            ))}
          </div>
        )}
        
        {/* Health text */}
        <span 
          className="text-xs font-mono font-bold min-w-[70px] text-right"
          style={{ color: isBurning ? '#ffaa00' : isPlayer ? '#4ade80' : '#f87171' }}
        >
          {healthText}
        </span>
      </div>
    </div>
  );
}

export default FullWidthHealthBar;
