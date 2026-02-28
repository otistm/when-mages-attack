/**
 * GameOverOverlay - Battle result screen styled as a Grimoire record page.
 * Uses the same arcane tome aesthetic as the crafting screen.
 */

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useCombatStore } from '@/stores/combatStore';
import { useCardStore } from '@/stores/cardStore';
import { useCraftingStore } from '@/stores/craftingStore';
import { useBattleStatsStore, CardBattleStats } from '@/stores/battleStatsStore';
import { AudioCues } from '@/stores/audioStore';
import type { StatusEffectType } from '@/types';

interface BattleSummary {
  result: 'victory' | 'defeat';
  playerHP: number;
  playerMaxHP: number;
  enemyHP: number;
  enemyMaxHP: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  totalStatusEffectDamage: number;
  duration: number;
  playerCardStats: CardBattleStats[];
  mvp: CardBattleStats | null;
}

const STATUS_EFFECT_VISUALS: Record<string, { icon: string; color: string }> = {
  burn:    { icon: '🔥', color: '#f97316' },
  poison:  { icon: '☠️', color: '#22c55e' },
  shocked: { icon: '⚡', color: '#a78bfa' },
};

function getStatusEffectVisual(type?: StatusEffectType) {
  if (!type) return { icon: '🔥', color: '#c9a84c' };
  return STATUS_EFFECT_VISUALS[type] ?? { icon: '🔥', color: '#c9a84c' };
}

export function GameOverOverlay() {
  const player = useGameStore((state) => state.player);
  const enemy = useGameStore((state) => state.enemy);
  const run = useGameStore((state) => state.run);
  const selectedMage = useGameStore((state) => state.selectedMage);
  const setPhase = useGameStore((state) => state.setPhase);
  const selectMage = useGameStore((state) => state.selectMage);
  const isDebugArena = useGameStore((state) => state.isDebugArena);
  const startDebugArena = useGameStore((state) => state.startDebugArena);
  const resetGame = useGameStore((state) => state.reset);
  const resetCombat = useCombatStore((state) => state.reset);
  const clearAllCards = useCardStore((state) => state.clearAll);
  const resetCrafting = useCraftingStore((state) => state.reset);
  const resetBattleStats = useBattleStatsStore((state) => state.reset);
  const getStatsByTeam = useBattleStatsStore((state) => state.getStatsByTeam);
  const getMVP = useBattleStatsStore((state) => state.getMVP);
  
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<BattleSummary | null>(null);
  
  const playerDead = player.health <= 0;
  const enemyDead = enemy.health <= 0;
  const gameOver = playerDead || enemyDead;
  const winner = enemyDead ? 'player' : playerDead ? 'enemy' : null;
  
  const hasCleared = useRef(false);
  
  useEffect(() => {
    if (gameOver && !hasCleared.current) {
      hasCleared.current = true;
      
      const playerCardStats = getStatsByTeam('player');
      const mvp = getMVP('player');
      
      const totalStatusEffectDamage = playerCardStats.reduce((sum, s) => sum + s.statusEffectDamage, 0);
      const totalDirectDamage = playerCardStats.reduce((sum, s) => sum + s.totalDamage, 0);
      
      setSummary({
        result: winner === 'player' ? 'victory' : 'defeat',
        playerHP: player.health,
        playerMaxHP: player.maxHealth,
        enemyHP: enemy.health,
        enemyMaxHP: enemy.maxHealth,
        totalDamageDealt: totalDirectDamage,
        totalDamageTaken: run?.totalDamageTaken ?? 0,
        totalStatusEffectDamage,
        duration: run ? Math.floor((Date.now() - run.startedAt) / 1000) : 0,
        playerCardStats,
        mvp,
      });
      
      if (winner === 'player') {
        AudioCues.onWin();
      }
      
      clearAllCards();
      resetCombat();
    }
    
    if (!gameOver) {
      hasCleared.current = false;
      setSummary(null);
      setShowSummary(false);
    }
  }, [gameOver, winner, player, enemy, run, clearAllCards, resetCombat, getStatsByTeam, getMVP]);
  
  if (!gameOver) return null;
  
  const isPlayerWin = winner === 'player';
  
  const handlePlayAgain = () => {
    if (isDebugArena) {
      resetCombat();
      resetBattleStats();
      clearAllCards();
      startDebugArena();
      return;
    }
    const mageId = selectedMage?.id;
    resetGame();
    resetCrafting();
    clearAllCards();
    resetCombat();
    resetBattleStats();
    if (mageId) {
      selectMage(mageId);
    } else {
      setPhase('crafting');
    }
  };

  const goldAlpha = (a: number) => `rgba(212,175,55,${a})`;
  const redAlpha = (a: number) => `rgba(180,40,40,${a})`;
  const accentAlpha = isPlayerWin ? goldAlpha : redAlpha;
  
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-[100] overflow-y-auto"
      style={{ 
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(5,5,10,0.8)',
      }}
    >
      {/* Animated Background Particles & Smoke */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Smoke wisps */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`smoke-${i}`}
            className="absolute rounded-full"
            style={{
              width: `${120 + i * 60}px`,
              height: `${80 + i * 40}px`,
              left: `${10 + i * 14}%`,
              bottom: `${-10 + (i % 3) * 5}%`,
              background: isPlayerWin
                ? `radial-gradient(ellipse, rgba(212,175,55,${0.03 + (i % 3) * 0.01}) 0%, transparent 70%)`
                : `radial-gradient(ellipse, rgba(180,40,40,${0.04 + (i % 3) * 0.01}) 0%, transparent 70%)`,
              filter: 'blur(20px)',
              animation: `smokeRise ${12 + i * 3}s ease-in-out infinite`,
              animationDelay: `${i * -2.5}s`,
            }}
          />
        ))}

        {/* Floating ember particles */}
        {Array.from({ length: 45 }).map((_, i) => {
          const size = 2 + Math.random() * 3;
          return (
            <div
              key={`ember-${i}`}
              className="absolute rounded-full"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                left: `${5 + Math.random() * 90}%`,
                bottom: '-5%',
                backgroundColor: isPlayerWin
                  ? `rgba(212,175,55,${0.3 + Math.random() * 0.4})`
                  : `rgba(180,40,40,${0.3 + Math.random() * 0.4})`,
                boxShadow: isPlayerWin
                  ? `0 0 ${size * 2}px rgba(212,175,55,0.3)`
                  : `0 0 ${size * 2}px rgba(180,40,40,0.3)`,
                animation: `emberFloat ${8 + Math.random() * 10}s ease-in-out infinite`,
                animationDelay: `${Math.random() * -15}s`,
              }}
            />
          );
        })}

        {/* Slow-drifting large glow orbs */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`orb-${i}`}
            className="absolute rounded-full"
            style={{
              width: `${60 + i * 30}px`,
              height: `${60 + i * 30}px`,
              left: `${15 + i * 30}%`,
              top: `${20 + i * 20}%`,
              background: isPlayerWin
                ? `radial-gradient(circle, rgba(212,175,55,${0.04 - i * 0.01}) 0%, transparent 60%)`
                : `radial-gradient(circle, rgba(180,40,40,${0.05 - i * 0.01}) 0%, transparent 60%)`,
              filter: 'blur(12px)',
              animation: `orbDrift ${18 + i * 6}s ease-in-out infinite`,
              animationDelay: `${i * -5}s`,
            }}
          />
        ))}
      </div>

      {/* Grimoire Tome Frame */}
      <div 
        className="relative flex flex-col items-center w-full my-auto"
        style={{ 
          animation: 'grimoireReveal 0.6s ease-out',
          maxWidth: 'clamp(360px, 55vw, 580px)',
          padding: 'var(--space-lg)',
        }}
      >
        <div
          className="relative w-full rounded-lg"
          style={{
            border: `2px solid ${accentAlpha(0.4)}`,
            background: 'linear-gradient(135deg, rgba(30,20,10,0.92) 0%, rgba(12,8,4,0.95) 50%, rgba(30,20,10,0.92) 100%)',
            boxShadow: `inset 0 0 40px ${accentAlpha(0.06)}, 0 0 30px rgba(0,0,0,0.6), 0 4px 60px rgba(0,0,0,0.4)`,
          }}
        >
          {/* Inner decorative border */}
          <div
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{
              margin: '6px',
              border: `1px solid ${accentAlpha(0.15)}`,
              borderRadius: '4px',
            }}
          />

          {/* Corner ornaments */}
          {(['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'] as const).map((pos, i) => (
            <div
              key={i}
              className={`absolute ${pos} pointer-events-none select-none`}
              style={{
                color: accentAlpha(0.35),
                fontSize: 'clamp(16px, 1.5vw, 22px)',
                padding: '4px 7px',
                transform: i === 1 ? 'scaleX(-1)' : i === 2 ? 'scaleY(-1)' : i === 3 ? 'scale(-1)' : undefined,
              }}
            >
              ❧
            </div>
          ))}

          {/* Result Image / Icon — flush to top of frame */}
          {isPlayerWin && selectedMage ? (
            <div className="relative w-full rounded-t-lg overflow-hidden" style={{ maxHeight: 'clamp(160px, 22vw, 260px)' }}>
              <img
                src={selectedMage.imagePath}
                alt={selectedMage.name}
                className="w-full h-full object-cover"
                style={{
                  maxHeight: 'clamp(160px, 22vw, 260px)',
                }}
              />
              <div className="absolute inset-0" style={{
                background: 'linear-gradient(to top, rgba(20,14,6,1) 0%, rgba(20,14,6,0.4) 30%, transparent 60%)',
              }} />
            </div>
          ) : selectedMage ? (
            <div className="relative w-full rounded-t-lg overflow-hidden" style={{ maxHeight: 'clamp(160px, 22vw, 260px)' }}>
              <img
                src={selectedMage.imagePath}
                alt={selectedMage.name}
                className="w-full h-full object-cover"
                style={{
                  maxHeight: 'clamp(160px, 22vw, 260px)',
                  filter: 'grayscale(0.7) brightness(0.5)',
                }}
              />
              <div className="absolute inset-0" style={{
                background: 'linear-gradient(to top, rgba(25,8,8,1) 0%, rgba(25,8,8,0.5) 30%, rgba(180,40,40,0.1) 100%)',
              }} />
              <div className="absolute inset-0 flex items-center justify-center" style={{
                fontSize: 'clamp(42px, 6vw, 64px)',
                filter: 'drop-shadow(0 0 16px rgba(180,40,40,0.4))',
              }}>
                💀
              </div>
            </div>
          ) : (
            <div
              className="flex items-center justify-center w-full"
              style={{
                height: 'clamp(80px, 12vw, 120px)',
                fontSize: 'clamp(42px, 6vw, 64px)',
                filter: 'drop-shadow(0 0 16px rgba(180,40,40,0.4))',
              }}
            >
              💀
            </div>
          )}

          {/* Decorative Title Band — flush below image */}
          <div
            className="w-full flex flex-col items-center justify-center"
            style={{
              background: isPlayerWin
                ? 'linear-gradient(180deg, rgba(30,20,10,0.0) 0%, rgba(20,14,6,0.95) 25%, rgba(20,14,6,1) 50%, rgba(20,14,6,0.95) 75%, rgba(30,20,10,0.0) 100%)'
                : 'linear-gradient(180deg, rgba(30,10,10,0.0) 0%, rgba(25,8,8,0.95) 25%, rgba(25,8,8,1) 50%, rgba(25,8,8,0.95) 75%, rgba(30,10,10,0.0) 100%)',
              padding: 'clamp(10px, 1.5vw, 16px) clamp(18px, 2.5vw, 32px)',
              borderTop: `1px solid ${accentAlpha(0.25)}`,
              borderBottom: `1px solid ${accentAlpha(0.25)}`,
              position: 'relative',
            }}
          >
            {/* Left/right decorative dashes */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex items-center pointer-events-none" style={{ padding: '0 clamp(10px, 1.5vw, 18px)' }}>
              <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${accentAlpha(0.3)})` }} />
              <div style={{ width: 'clamp(120px, 20vw, 220px)' }} />
              <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, transparent, ${accentAlpha(0.3)})` }} />
            </div>

            {/* Glow layer behind text */}
            <div
              className="font-display font-bold text-center uppercase select-none pointer-events-none"
              aria-hidden="true"
              style={{
                fontSize: 'clamp(30px, 5vw, 52px)',
                letterSpacing: '0.12em',
                color: 'transparent',
                textShadow: isPlayerWin
                  ? '0 0 30px rgba(212,175,55,0.5), 0 0 60px rgba(212,175,55,0.2)'
                  : '0 0 30px rgba(180,40,40,0.4), 0 0 60px rgba(180,40,40,0.2)',
                position: 'absolute',
                left: 0,
                right: 0,
              }}
            >
              {isPlayerWin ? 'Magnifico!' : 'Defeated...'}
            </div>
            {/* Shiny text layer */}
            <h1
              className="font-display font-bold text-center uppercase relative magnifico-shine"
              style={{
                fontSize: 'clamp(30px, 5vw, 52px)',
                letterSpacing: '0.12em',
              }}
            >
              {isPlayerWin ? 'Magnifico!' : 'Defeated...'}
            </h1>
            <p
              className="text-center italic relative"
              style={{
                marginTop: '2px',
                color: selectedMage ? `${selectedMage.color}99` : 'rgba(255,255,255,0.4)',
                fontSize: 'clamp(9px, 1vw, 12px)',
                fontFamily: "'Cinzel', serif",
              }}
            >
              {selectedMage
                ? (isPlayerWin ? selectedMage.victoryQuote : selectedMage.defeatQuote)
                : (isPlayerWin
                  ? '"The enemy has been vanquished. Record this triumph."'
                  : '"The grimoire demands further study. Return prepared."')}
            </p>
            {selectedMage && (
              <p style={{
                marginTop: '4px',
                color: 'rgba(255,255,255,0.25)',
                fontSize: 'clamp(7px, 0.8vw, 10px)',
                fontFamily: "'Cinzel', serif",
              }}>
                — {selectedMage.name}, {selectedMage.title}
              </p>
            )}
          </div>

          {/* Content */}
          <div style={{ padding: 'clamp(16px, 2.5vw, 28px) clamp(18px, 2.5vw, 32px) clamp(20px, 3vw, 36px)' }}>
            
            {/* Thin separator */}
            <div className="w-full" style={{ height: '1px', background: `linear-gradient(to right, transparent 5%, ${accentAlpha(0.2)} 50%, transparent 95%)`, marginBottom: 'var(--space-md)' }} />

            {/* HP Result Bars */}
            {summary && (
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <HPResultBar
                  label="Initiate"
                  hp={summary.playerHP}
                  maxHP={summary.playerMaxHP}
                  barColor={summary.playerHP > 0 ? '#4ade80' : '#6b2020'}
                  accentAlpha={accentAlpha}
                />
                <div style={{ height: 'var(--space-xs)' }} />
                <HPResultBar
                  label="Adversary"
                  hp={summary.enemyHP}
                  maxHP={summary.enemyMaxHP}
                  barColor={summary.enemyHP > 0 ? '#c44040' : '#6b2020'}
                  accentAlpha={accentAlpha}
                />
              </div>
            )}

            {/* Thin separator */}
            <div className="w-full" style={{ height: '1px', background: `linear-gradient(to right, transparent 5%, ${accentAlpha(0.2)} 50%, transparent 95%)`, marginBottom: 'var(--space-md)' }} />

            {/* Action Buttons */}
            <div className="flex flex-col items-center w-full" style={{ gap: 'var(--space-sm)' }}>
              <button
                onClick={handlePlayAgain}
                className="w-full font-display font-bold text-white cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-95"
                style={{
                  fontSize: 'clamp(13px, 1.4vw, 16px)',
                  background: isPlayerWin
                    ? 'linear-gradient(135deg, rgba(74,44,106,0.8) 0%, rgba(50,30,80,0.9) 100%)'
                    : 'linear-gradient(135deg, rgba(140,30,30,0.8) 0%, rgba(90,20,20,0.9) 100%)',
                  border: `1px solid ${accentAlpha(0.3)}`,
                  borderRadius: '6px',
                  padding: 'var(--space-sm) var(--space-xl)',
                  boxShadow: `0 0 20px ${accentAlpha(0.15)}, inset 0 0 15px ${accentAlpha(0.05)}`,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                {isDebugArena ? 'Start Over' : 'Return to Grimoire'}
              </button>
              
              <button
                onClick={() => setShowSummary(!showSummary)}
                className="w-full font-mono cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-95"
                style={{
                  fontSize: 'clamp(10px, 1.1vw, 13px)',
                  color: accentAlpha(0.6),
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${accentAlpha(0.15)}`,
                  borderRadius: '4px',
                  padding: 'var(--space-xs) var(--space-lg)',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}
              >
                {showSummary ? '▾ Seal Report' : '▸ Unseal Battle Report'}
              </button>
            </div>
            
            {/* Battle Summary — Grimoire Record */}
            {showSummary && summary && (
              <div style={{ marginTop: 'var(--space-md)', animation: 'reportUnfurl 0.35s ease-out' }}>
                {/* Decorative report header */}
                <div className="flex items-center gap-2" style={{ marginBottom: 'var(--space-sm)' }}>
                  <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${accentAlpha(0.25)})` }} />
                  <span style={{ color: accentAlpha(0.4), fontSize: 'clamp(9px, 0.9vw, 11px)', letterSpacing: '0.2em' }} className="font-mono uppercase">
                    Archivist's Notes
                  </span>
                  <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, transparent, ${accentAlpha(0.25)})` }} />
                </div>

                {/* Overview Stats - 3 columns in parchment-style boxes */}
                <div className="grid grid-cols-3" style={{ gap: 'var(--space-xs)', marginBottom: 'var(--space-md)' }}>
                  <GrimoireStat label="Dmg Dealt" value={summary.totalDamageDealt} icon="⚔" color="#4ade80" accentAlpha={accentAlpha} />
                  <GrimoireStat label="Effect Dmg" value={summary.totalStatusEffectDamage} icon="✦" color="#c9a84c" accentAlpha={accentAlpha} />
                  <GrimoireStat label="Duration" value={formatDuration(summary.duration)} icon="⌛" color="#60a5fa" accentAlpha={accentAlpha} />
                </div>
                
                {/* MVP Callout */}
                {summary.mvp && summary.mvp.totalDamage > 0 && (
                  <div
                    className="rounded"
                    style={{
                      marginBottom: 'var(--space-md)',
                      padding: 'var(--space-sm)',
                      background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.02) 100%)',
                      border: `1px solid ${goldAlpha(0.25)}`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex items-center justify-center shrink-0 rounded-full"
                        style={{
                          width: 'clamp(36px, 4vw, 48px)',
                          height: 'clamp(36px, 4vw, 48px)',
                          background: `radial-gradient(circle, ${goldAlpha(0.15)} 0%, transparent 70%)`,
                          border: `1px solid ${goldAlpha(0.2)}`,
                          fontSize: 'clamp(16px, 2vw, 22px)',
                        }}
                      >
                        ⭐
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono uppercase" style={{ color: goldAlpha(0.5), fontSize: 'clamp(8px, 0.8vw, 10px)', letterSpacing: '0.15em' }}>
                          Most Valuable Page
                        </div>
                        <div className="font-display font-bold truncate" style={{ color: '#d4af37', fontSize: 'clamp(13px, 1.3vw, 16px)' }}>
                          {summary.mvp.cardName}
                        </div>
                        <div className="font-mono flex items-center gap-1 flex-wrap" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(9px, 0.9vw, 11px)' }}>
                          <span>{summary.mvp.totalDamage} dmg</span>
                          {summary.mvp.statusEffectDamage > 0 && (() => {
                            const visual = getStatusEffectVisual(summary.mvp!.statusEffectType);
                            return (
                              <span>· <span style={{ fontSize: 'clamp(9px, 0.9vw, 11px)' }}>{visual.icon}</span> <span style={{ color: visual.color }}>{summary.mvp!.statusEffectDamage}</span></span>
                            );
                          })()}
                          <span>· {summary.mvp.timesTriggered} triggers</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Per-Card Breakdown */}
                {summary.playerCardStats.length > 0 && (
                  <div>
                    <div className="font-mono uppercase" style={{ color: accentAlpha(0.4), fontSize: 'clamp(8px, 0.8vw, 10px)', letterSpacing: '0.15em', marginBottom: 'var(--space-xs)' }}>
                      Page Performance Log
                    </div>
                    <div className="flex flex-col" style={{ gap: '3px' }}>
                      {summary.playerCardStats.map((stat) => {
                        const isMVP = summary.mvp?.cardId === stat.cardId;
                        const isKeepsake = stat.cardId.startsWith('keepsake_');
                        const combinedDamage = stat.totalDamage + stat.statusEffectDamage;
                        const maxDamage = Math.max(...summary.playerCardStats.map(s => s.totalDamage + s.statusEffectDamage), 1);
                        const barPercent = maxDamage > 0 ? (combinedDamage / maxDamage) * 100 : 0;
                        const keepsakeColor = isKeepsake && selectedMage ? selectedMage.color : undefined;
                        
                        return (
                          <div
                            key={stat.cardId}
                            className="relative rounded overflow-hidden"
                            style={{
                              background: isKeepsake ? 'rgba(25,18,12,0.7)' : 'rgba(20,15,10,0.6)',
                              border: isMVP
                                ? `1px solid ${goldAlpha(0.3)}`
                                : isKeepsake && keepsakeColor
                                  ? `1px solid ${keepsakeColor}30`
                                  : `1px solid ${accentAlpha(0.1)}`,
                            }}
                          >
                            {/* Damage proportion bar */}
                            <div
                              className="absolute inset-0 pointer-events-none"
                              style={{
                                width: `${barPercent}%`,
                                background: isMVP
                                  ? 'linear-gradient(90deg, rgba(212,175,55,0.1) 0%, rgba(212,175,55,0.03) 100%)'
                                  : isKeepsake && keepsakeColor
                                    ? `linear-gradient(90deg, ${keepsakeColor}15 0%, transparent 100%)`
                                    : `linear-gradient(90deg, ${accentAlpha(0.06)} 0%, transparent 100%)`,
                              }}
                            />
                            
                            <div className="relative flex items-center justify-between" style={{ padding: 'var(--space-xs) var(--space-sm)' }}>
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {isMVP && <span style={{ fontSize: 'clamp(10px, 1vw, 13px)' }} className="shrink-0">⭐</span>}
                                {isKeepsake && selectedMage && (
                                  <span style={{ fontSize: 'clamp(10px, 1vw, 13px)' }} className="shrink-0">{selectedMage.keepsake.iconEmoji}</span>
                                )}
                                <span className="font-display font-bold truncate" style={{
                                  color: isMVP ? '#d4af37' : isKeepsake && keepsakeColor ? keepsakeColor : 'rgba(255,255,255,0.7)',
                                  fontSize: 'clamp(11px, 1.1vw, 14px)',
                                }}>
                                  {stat.cardName}
                                </span>
                                {isKeepsake && (
                                  <span className="font-mono uppercase shrink-0" style={{
                                    fontSize: 'clamp(7px, 0.7vw, 9px)',
                                    color: keepsakeColor ? `${keepsakeColor}66` : 'rgba(255,255,255,0.2)',
                                    letterSpacing: '0.1em',
                                  }}>
                                    keepsake
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center shrink-0" style={{ gap: 'var(--space-sm)' }}>
                                <div className="flex items-center gap-1">
                                  <span className="font-mono" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 'clamp(8px, 0.8vw, 10px)' }}>×</span>
                                  <span className="font-mono font-bold" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'clamp(11px, 1.1vw, 13px)', minWidth: '16px', textAlign: 'right' }}>
                                    {stat.timesTriggered}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="font-mono font-bold" style={{ color: '#4ade80', fontSize: 'clamp(11px, 1.1vw, 13px)', minWidth: '28px', textAlign: 'right' }}>
                                    {stat.totalDamage}
                                  </span>
                                  <span className="font-mono" style={{ color: 'rgba(255,255,255,0.25)', fontSize: 'clamp(8px, 0.8vw, 10px)' }}>dmg</span>
                                </div>
                                {stat.statusEffectDamage > 0 && (() => {
                                  const visual = getStatusEffectVisual(stat.statusEffectType);
                                  return (
                                    <div className="flex items-center gap-1">
                                      <span style={{ fontSize: 'clamp(10px, 1vw, 12px)' }}>{visual.icon}</span>
                                      <span className="font-mono font-bold" style={{ color: visual.color, fontSize: 'clamp(11px, 1.1vw, 13px)', minWidth: '28px', textAlign: 'right' }}>
                                        {stat.statusEffectDamage}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Bottom attribution */}
                <div className="text-center italic" style={{ marginTop: 'var(--space-md)', color: 'rgba(255,255,255,0.2)', fontSize: 'clamp(8px, 0.8vw, 10px)', fontFamily: "'Cinzel', serif" }}>
                  — Recorded by the Archivist —
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Animations */}
      <style>{`
        @keyframes grimoireReveal {
          0% { transform: scale(0.9) rotateX(5deg); opacity: 0; }
          100% { transform: scale(1) rotateX(0deg); opacity: 1; }
        }
        @keyframes reportUnfurl {
          0% { opacity: 0; max-height: 0; transform: scaleY(0.8); transform-origin: top; }
          100% { opacity: 1; max-height: 1000px; transform: scaleY(1); transform-origin: top; }
        }
        .magnifico-shine {
          background: linear-gradient(
            105deg,
            ${isPlayerWin ? '#d4af37' : '#c44040'} 0%,
            ${isPlayerWin ? '#d4af37' : '#c44040'} 35%,
            ${isPlayerWin ? '#fff8dc' : '#ffaaaa'} 45%,
            ${isPlayerWin ? '#ffffff' : '#ffcccc'} 50%,
            ${isPlayerWin ? '#fff8dc' : '#ffaaaa'} 55%,
            ${isPlayerWin ? '#d4af37' : '#c44040'} 65%,
            ${isPlayerWin ? '#d4af37' : '#c44040'} 100%
          );
          background-size: 300% 100%;
          background-position: 100% 0;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: textShine 6s ease-in-out 0.5s infinite;
        }
        @keyframes textShine {
          0%, 100% { background-position: 100% 0; }
          50% { background-position: 0% 0; }
        }
        @keyframes smokeRise {
          0% { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
          15% { opacity: 1; }
          50% { transform: translateY(-45vh) translateX(30px) scale(1.6); opacity: 0.7; }
          85% { opacity: 0.3; }
          100% { transform: translateY(-95vh) translateX(-20px) scale(2); opacity: 0; }
        }
        @keyframes emberFloat {
          0% { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
          10% { opacity: 1; }
          50% { transform: translateY(-50vh) translateX(${15}px) scale(0.8); opacity: 0.7; }
          80% { opacity: 0.3; }
          100% { transform: translateY(-105vh) translateX(-10px) scale(0.2); opacity: 0; }
        }
        @keyframes orbDrift {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
          25% { transform: translate(25px, -30px) scale(1.15); opacity: 0.8; }
          50% { transform: translate(-15px, -50px) scale(0.9); opacity: 0.6; }
          75% { transform: translate(-30px, -15px) scale(1.1); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}

/** HP result bar styled as a grimoire ledger entry */
function HPResultBar({ label, hp, maxHP, barColor, accentAlpha }: {
  label: string;
  hp: number;
  maxHP: number;
  barColor: string;
  accentAlpha: (a: number) => string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono uppercase font-bold shrink-0" style={{ color: accentAlpha(0.4), fontSize: 'clamp(9px, 0.9vw, 11px)', letterSpacing: '0.1em', width: 'clamp(54px, 6vw, 70px)' }}>
        {label}
      </span>
      <div
        className="flex-1 rounded-sm overflow-hidden"
        style={{ height: 'clamp(8px, 0.8vw, 12px)', backgroundColor: 'rgba(255,255,255,0.06)', border: `1px solid ${accentAlpha(0.1)}` }}
      >
        <div
          className="h-full rounded-sm transition-all duration-500"
          style={{
            width: `${Math.max(0, (hp / maxHP) * 100)}%`,
            backgroundColor: barColor,
            boxShadow: hp > 0 ? `0 0 6px ${barColor}40` : 'none',
          }}
        />
      </div>
      <span className="font-mono font-bold shrink-0" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(9px, 0.9vw, 11px)', minWidth: 'clamp(40px, 4.5vw, 56px)', textAlign: 'right' }}>
        {hp}/{maxHP}
      </span>
    </div>
  );
}

/** Single stat cell for the overview grid */
function GrimoireStat({ label, value, icon, color, accentAlpha }: {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  accentAlpha: (a: number) => string;
}) {
  return (
    <div
      className="flex flex-col items-center rounded"
      style={{
        padding: 'var(--space-xs) var(--space-xs)',
        background: 'rgba(20,15,10,0.5)',
        border: `1px solid ${accentAlpha(0.12)}`,
      }}
    >
      <span style={{ fontSize: 'clamp(13px, 1.4vw, 17px)', marginBottom: '2px' }}>{icon}</span>
      <span className="font-display font-black" style={{ color, fontSize: 'clamp(14px, 1.5vw, 18px)' }}>{value}</span>
      <span className="font-mono uppercase" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(7px, 0.7vw, 9px)', letterSpacing: '0.15em' }}>{label}</span>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export default GameOverOverlay;
