import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useCraftingStore } from '@/stores/craftingStore';
import { useGameStore } from '@/stores/gameStore';
import { useCardStore } from '@/stores/cardStore';
import { useUIStore } from '@/stores/uiStore';
import { useBattleStatsStore } from '@/stores/battleStatsStore';
import { AudioCues, useAudioStore } from '@/stores/audioStore';
import { Howler } from 'howler';
import { CardInstance } from '@/types';
import { getCardDefinition } from '@/data/cards';
import { CARD_SLOTS } from '@/types';
import { CardLorePanel } from '@/components/ui/CardLorePanel';

export function CraftingScene() {
  const inventory = useCraftingStore((state) => state.inventory);
  const selectedCards = useCraftingStore((state) => state.selectedCards);
  const selectCard = useCraftingStore((state) => state.selectCard);
  const craftSelectedCards = useCraftingStore((state) => state.craftSelectedCards);
  const canCraft = useCraftingStore((state) => state.canCraft);
  const lastCraftedCardId = useCraftingStore((state) => state.lastCraftedCardId);
  const clearLastCrafted = useCraftingStore((state) => state.clearLastCrafted);
  
  const setPhase = useGameStore((state) => state.setPhase);
  const selectedMage = useGameStore((state) => state.selectedMage);
  const resetForCombat = useGameStore((state) => state.resetForCombat);
  const addCard = useCardStore((state) => state.addCard);
  const clearAllCards = useCardStore((state) => state.clearAll);
  const setHoveredCard = useUIStore((state) => state.setHoveredCard);
  const resetBattleStats = useBattleStatsStore((state) => state.reset);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const grimoireScrollRef = useRef<HTMLDivElement>(null);
  
  const [showGrimoire, setShowGrimoire] = useState(true);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [resultCard, setResultCard] = useState<CardInstance | null>(null);
  const [screenFlash, setScreenFlash] = useState(false);
  
  // Player's deck slots - cards placed here will be used in combat
  const [deckSlots, setDeckSlots] = useState<(string | null)[]>(
    CARD_SLOTS.map(() => null)
  );

  // Check if at least one card is in deck
  const hasCardInDeck = deckSlots.some(id => id !== null);

  // Clear lastCraftedCardId when set (we handle placement in handleCollectResult)
  useEffect(() => {
    if (lastCraftedCardId) {
      clearLastCrafted();
    }
  }, [lastCraftedCardId, clearLastCrafted]);

  // Handle video end - show crafted card result and fade audio
  const handleVideoEnded = useCallback(() => {
    setScreenFlash(true);
    setTimeout(() => setScreenFlash(false), 150);
    
    const result = craftSelectedCards();
    setResultCard(result);
    
    // Fade audio out and loop video as ambient background
    if (videoRef.current) {
      const video = videoRef.current;
      video.loop = true;
      video.play();
      
      // Fade volume down over 1 second
      const fadeInterval = setInterval(() => {
        if (video.volume > 0.1) {
          video.volume = Math.max(0.1, video.volume - 0.1);
        } else {
          clearInterval(fadeInterval);
          video.volume = 0.15; // Keep quiet ambient level
        }
      }, 100);
    }
    
    // Resume game audio (respect user's mute setting)
    const userMuted = useAudioStore.getState().isMuted;
    Howler.mute(userMuted);
    
    setIsPlayingVideo(false);
  }, [craftSelectedCards]);

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData('cardId', cardId);
    e.dataTransfer.setData('source', 'inventory');
    // Clear the lore panel when dragging starts
    setHoveredCard(null);
  };

  const handleDragStartFromSlot = (e: React.DragEvent, cardId: string, slotIndex: number) => {
    e.dataTransfer.setData('cardId', cardId);
    e.dataTransfer.setData('source', 'deck');
    e.dataTransfer.setData('slotIndex', slotIndex.toString());
    // Clear the lore panel when dragging starts
    setHoveredCard(null);
  };

  const handleDropOnDeckSlot = (e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardId');
    const source = e.dataTransfer.getData('source');
    
    if (!cardId) return;
    
    AudioCues.onPageSelect();
    
    if (source === 'deck') {
      const fromSlot = parseInt(e.dataTransfer.getData('slotIndex'));
      setDeckSlots(prev => {
        const newSlots = [...prev];
        const temp = newSlots[slotIndex];
        newSlots[slotIndex] = newSlots[fromSlot];
        newSlots[fromSlot] = temp;
        return newSlots;
      });
    } else {
      const existingSlot = deckSlots.findIndex(id => id === cardId);
      if (existingSlot !== -1) {
        setDeckSlots(prev => {
          const newSlots = [...prev];
          newSlots[existingSlot] = prev[slotIndex];
          newSlots[slotIndex] = cardId;
          return newSlots;
        });
      } else {
        setDeckSlots(prev => {
          const newSlots = [...prev];
          newSlots[slotIndex] = cardId;
          return newSlots;
        });
      }
    }
  };

  const handleDropOnCraftingSlot = (e: React.DragEvent, slotIndex: 0 | 1) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardId');
    if (cardId) {
      selectCard(slotIndex, cardId);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCraft = useCallback(() => {
    if (!canCraft()) return;
    
    // Hide UI and play video
    setIsPlayingVideo(true);
    setShowGrimoire(false);
    
    // Mute all game audio while video plays
    Howler.mute(true);
    
    // Start video playback with sound
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = false;
      videoRef.current.volume = 0.7;
      videoRef.current.play();
    }
  }, [canCraft]);

  const handleReady = useCallback(() => {
    // Reset health/effects for next combat round
    resetForCombat();
    resetBattleStats();
    
    // Clear existing cards from previous combat
    clearAllCards();
    
    // Transfer deck cards to card store for combat
    deckSlots.forEach((cardInstanceId, slotIndex) => {
      if (cardInstanceId) {
        const cardInstance = inventory.find(c => c.instanceId === cardInstanceId);
        if (cardInstance) {
          const cardDef = getCardDefinition(cardInstance.definitionId);
          if (cardDef) {
            addCard(slotIndex, cardDef, 'player');
          }
        }
      }
    });
    
    // Give the enemy a toaster to fight back with
    const enemyToaster = getCardDefinition('toaster');
    if (enemyToaster) {
      addCard(2, enemyToaster, 'enemy');
    }
    
    setPhase('combat');
  }, [deckSlots, inventory, addCard, clearAllCards, setPhase, resetForCombat, resetBattleStats]);

  const handleCollectResult = () => {
    if (resultCard) {
      // Find first empty slot in the book and place the crafted card there
      const firstEmptySlot = deckSlots.findIndex(slot => slot === null);
      if (firstEmptySlot !== -1) {
        setDeckSlots(prev => {
          const newSlots = [...prev];
          newSlots[firstEmptySlot] = resultCard.instanceId;
          return newSlots;
        });
      }
    }
    
    // Stop the looping video and reset
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.loop = false;
      videoRef.current.currentTime = 0;
      videoRef.current.muted = true;
    }
    
    // Ensure game audio is restored
    const userMuted = useAudioStore.getState().isMuted;
    Howler.mute(userMuted);
    
    setResultCard(null);
    setShowGrimoire(true);
  };

  const removeFromDeckSlot = (slotIndex: number) => {
    setDeckSlots(prev => {
      const newSlots = [...prev];
      newSlots[slotIndex] = null;
      return newSlots;
    });
  };

  // Cards available in inventory (not in deck slots or crafting)
  const availableCards = inventory.filter(card => 
    !deckSlots.includes(card.instanceId) && 
    !selectedCards.includes(card.instanceId)
  );

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: '#0a0a1a' }}>
      {/* Background Video - always present, paused until synthesis */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover z-0"
        style={{ 
          opacity: isPlayingVideo ? 1 : 0.15,
          filter: isPlayingVideo ? 'none' : 'grayscale(0.5) brightness(0.3)',
        }}
        src="/assets/videos/crafting.mp4"
        muted
        playsInline
        onEnded={handleVideoEnded}
      />
      
      {/* Animated Mesh Gradient Background */}
      {!isPlayingVideo && (
        <div className="absolute inset-0 z-[1] overflow-hidden">
          {/* Base dark overlay */}
          <div className="absolute inset-0 bg-black/50" />
          
          {/* Animated gradient blobs - responsive sizes */}
          <div 
            className="absolute rounded-full blur-[120px] opacity-30"
            style={{
              width: 'var(--blob-lg)',
              height: 'var(--blob-lg)',
              background: 'radial-gradient(circle, #ff6a00 0%, transparent 70%)',
              left: '10%',
              top: '20%',
              animation: 'floatBlob1 15s ease-in-out infinite',
            }}
          />
          <div 
            className="absolute rounded-full blur-[100px] opacity-25"
            style={{
              width: 'var(--blob-md)',
              height: 'var(--blob-md)',
              background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)',
              right: '10%',
              bottom: '10%',
              animation: 'floatBlob2 18s ease-in-out infinite',
            }}
          />
          <div 
            className="absolute rounded-full blur-[80px] opacity-20"
            style={{
              width: 'var(--blob-sm)',
              height: 'var(--blob-sm)',
              background: 'radial-gradient(circle, #0ea5e9 0%, transparent 70%)',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              animation: 'pulseBlob 8s ease-in-out infinite',
            }}
          />
          
          
          {/* Vignette */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)',
            }}
          />
        </div>
      )}
      
      {/* Screen Flash Effect */}
      {screenFlash && (
        <div className="fixed inset-0 bg-amber-400 z-[200] pointer-events-none animate-pulse" />
      )}
      
      {/* Main UI - hidden during video playback */}
      {!isPlayingVideo && (
        <>
          {/* Threat Assessment Header */}
          <div className="shrink-0 w-full z-10" style={{ padding: 'var(--space-md) var(--space-lg)', background: `linear-gradient(to bottom, ${selectedMage ? selectedMage.color + '30' : 'rgba(60,20,20,0.5)'}, transparent)` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center" style={{ gap: 'var(--space-md)' }}>
              </div>
              <div className="flex items-center" style={{ gap: 'var(--space-md)' }}>
                {selectedMage && (
                  <div className="relative group" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <button
                      onClick={() => setPhase('allegiance')}
                      className="flex items-center cursor-pointer transition-all duration-200 active:scale-95"
                      style={{
                        gap: 'var(--space-sm)',
                        padding: 'var(--space-xs) var(--space-md)',
                        border: `1px solid ${selectedMage.color}30`,
                        borderRadius: '6px',
                        background: `linear-gradient(135deg, ${selectedMage.color}10, transparent)`,
                        color: `${selectedMage.color}cc`,
                        fontSize: 'clamp(10px, 1vw, 13px)',
                        fontFamily: "'Cinzel', serif",
                        letterSpacing: '0.08em',
                      }}
                    >
                      <span style={{ fontSize: 'clamp(12px, 1.2vw, 16px)' }}>{selectedMage.keepsake.iconEmoji}</span>
                      <span>{selectedMage.name}</span>
                      <span style={{ color: 'rgba(255,255,255,0.25)', margin: '0 2px' }}>·</span>
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>Change Alliance</span>
                    </button>
                    {/* Keepsake tooltip on hover */}
                    <div
                      className="absolute right-0 top-full mt-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200"
                      style={{
                        minWidth: '100%',
                        width: 'clamp(240px, 22vw, 320px)',
                        padding: 'clamp(10px, 1.2vw, 16px)',
                        background: 'linear-gradient(135deg, rgba(15,10,25,0.97), rgba(8,6,16,0.98))',
                        border: `1px solid ${selectedMage.color}25`,
                        borderRadius: '8px',
                        boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${selectedMage.color}10`,
                        zIndex: 50,
                      }}
                    >
                      <div className="font-mono uppercase" style={{
                        fontSize: 'clamp(0.5rem, 0.65vw, 0.6rem)',
                        color: 'rgba(255,255,255,0.2)',
                        letterSpacing: '0.15em',
                        marginBottom: '6px',
                      }}>Keepsake</div>
                      <div className="flex items-center gap-2" style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '1.2rem' }}>{selectedMage.keepsake.iconEmoji}</span>
                        <span className="font-display font-bold" style={{
                          fontSize: 'clamp(0.8rem, 1vw, 0.95rem)',
                          color: selectedMage.color,
                        }}>
                          {selectedMage.keepsake.name}
                        </span>
                      </div>
                      <p style={{
                        fontSize: 'clamp(0.65rem, 0.85vw, 0.8rem)',
                        color: 'rgba(255,255,255,0.6)',
                        lineHeight: 1.5,
                        marginBottom: '8px',
                      }}>
                        {selectedMage.keepsake.description}
                      </p>
                      <div className="flex items-center gap-3 font-mono" style={{
                        fontSize: 'clamp(0.55rem, 0.7vw, 0.7rem)',
                        color: 'rgba(255,255,255,0.3)',
                      }}>
                        <span>{selectedMage.keepsake.cooldownSeconds}s cooldown</span>
                        <span>·</span>
                        <span style={{ color: `${selectedMage.color}88` }}>{selectedMage.keepsake.abilityType}</span>
                      </div>
                      <div style={{
                        marginTop: '8px',
                        paddingTop: '8px',
                        borderTop: `1px solid ${selectedMage.color}15`,
                      }}>
                        <p className="italic" style={{
                          fontSize: 'clamp(0.55rem, 0.75vw, 0.7rem)',
                          color: `${selectedMage.color}55`,
                          lineHeight: 1.4,
                        }}>
                          {selectedMage.keepsake.flavorText}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 relative overflow-hidden z-10">
            {/* Arcane Ambient Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Drifting arcane orbs */}
              {[...Array(8)].map((_, i) => (
                <div
                  key={`orb-${i}`}
                  className="absolute rounded-full"
                  style={{
                    width: `${20 + Math.random() * 30}px`,
                    height: `${20 + Math.random() * 30}px`,
                    left: `${10 + Math.random() * 80}%`,
                    top: `${10 + Math.random() * 80}%`,
                    background: `radial-gradient(circle, ${
                      ['rgba(212,175,55,0.3)', 'rgba(74,44,106,0.35)', 'rgba(136,102,170,0.25)', 'rgba(212,175,55,0.2)', 'rgba(74,44,106,0.3)'][i % 5]
                    } 0%, transparent 70%)`,
                    animation: `floatOrb ${8 + Math.random() * 6}s ease-in-out infinite`,
                    animationDelay: `${Math.random() * 4}s`,
                    filter: 'blur(2px)',
                  }}
                />
              ))}
              
              {/* Sigil sparkles */}
              {[...Array(35)].map((_, i) => (
                <div
                  key={`sparkle-${i}`}
                  className="absolute rounded-full"
                  style={{
                    width: `${2 + Math.random() * 3}px`,
                    height: `${2 + Math.random() * 3}px`,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    backgroundColor: ['#d4af37', '#4a2c6a', '#8866aa', '#d4af37', '#6b4d8a'][i % 5],
                    opacity: 0.2 + Math.random() * 0.35,
                    animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
                    animationDelay: `${Math.random() * 3}s`,
                    boxShadow: '0 0 6px currentColor',
                  }}
                />
              ))}
              
              {/* Rising arcane motes */}
              {[...Array(12)].map((_, i) => (
                <div
                  key={`ember-${i}`}
                  className="absolute w-1 h-1 rounded-full"
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    bottom: '-10px',
                    opacity: 0.5,
                    backgroundColor: i % 3 === 0 ? '#d4af37' : '#8866aa',
                    animation: `riseEmber ${4 + Math.random() * 4}s linear infinite`,
                    animationDelay: `${Math.random() * 4}s`,
                    boxShadow: `0 0 6px ${i % 3 === 0 ? 'rgba(212,175,55,0.5)' : 'rgba(136,102,170,0.5)'}`,
                  }}
                />
              ))}
            </div>

            {/* Grimoire Panel (toggleable) - transparent to show effects */}
            {showGrimoire && (
              <div 
                className="absolute inset-4 flex flex-col rounded-xl z-40"
              >
                {/* Grimoire Header */}
                <div className="relative z-10" style={{ padding: 'var(--space-lg)', marginTop: '100px' }}>
                  <div className="flex items-center justify-center gap-3 mb-1">
                    <div className="flex-1 max-w-[80px] h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.25))' }} />
                    <h1 
                      className="text-game-heading font-bold font-display text-arcane-gold text-center tracking-wider uppercase"
                      style={{ textShadow: '0 0 25px rgba(212,175,55,0.25)', letterSpacing: '0.12em' }}
                    >
                      Arcane Synthesis
                    </h1>
                    <div className="flex-1 max-w-[80px] h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(212,175,55,0.25))' }} />
                  </div>
                  <p className="text-arcane-gold/30 text-center text-game-caption italic font-display">
                    "Classification: Restricted. Dual-sigil fusion protocol."
                  </p>
                </div>

                {/* Crafting Area */}
                <div className="flex-1 flex flex-col items-center justify-center" style={{ padding: 'var(--space-lg)', marginTop: '-100px' }}>
                  <div className="flex items-center relative" style={{ gap: 'var(--space-xl)' }}>
                    {/* Containment ward glow */}
                    {canCraft() && (
                      <>
                        <div 
                          className="absolute inset-0 -m-16 rounded-full pointer-events-none"
                          style={{
                            background: 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, rgba(74,44,106,0.06) 40%, transparent 60%)',
                            animation: 'pulseBlob 3s ease-in-out infinite',
                          }}
                        />
                        {/* Ward ring */}
                        <div 
                          className="absolute inset-0 -m-20 rounded-full pointer-events-none"
                          style={{
                            border: '2px solid rgba(212,175,55,0.15)',
                            animation: 'energyPulse 2.5s ease-in-out infinite',
                          }}
                        />
                        {/* Rotating sigil marks */}
                        <div 
                          className="absolute inset-0 -m-24 pointer-events-none flex items-center justify-center"
                          style={{
                            animation: 'spin 25s linear infinite',
                          }}
                        >
                          {[0, 60, 120, 180, 240, 300].map((angle) => (
                            <div
                              key={angle}
                              className="absolute text-game-subheading"
                              style={{
                                transform: `rotate(${angle}deg) translateY(-120px)`,
                                color: angle % 120 === 0 ? 'rgba(212,175,55,0.25)' : 'rgba(74,44,106,0.2)',
                              }}
                            >
                              {angle % 120 === 0 ? '◆' : '✦'}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    
                    {/* Slot 1 */}
                    <CraftingSlot 
                      index={0}
                      selectedCardId={selectedCards[0]}
                      onDrop={(e) => handleDropOnCraftingSlot(e, 0)}
                      onDragOver={handleDragOver}
                      onClear={() => selectCard(0, null)}
                    />

                    {/* Synthesis Connector */}
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div 
                        className={`text-4xl transition-all duration-500 ${
                          canCraft() 
                            ? 'text-arcane-gold scale-125' 
                            : 'text-arcane-purple/40'
                        }`}
                        style={{ 
                          textShadow: canCraft() ? '0 0 20px rgba(212,175,55,0.6)' : 'none',
                          animation: canCraft() ? 'chamberActivePulse 2s ease-in-out infinite' : 'none',
                        }}
                      >
                        ✦
                      </div>
                      <button
                        onClick={handleCraft}
                        disabled={!canCraft()}
                        className={`
                          rounded-lg font-bold font-display text-game-body tracking-wider uppercase transition-all duration-300 relative overflow-hidden
                          ${canCraft()
                            ? 'hover:scale-105 active:scale-95'
                            : 'cursor-not-allowed'}
                        `}
                        style={{ 
                          padding: 'var(--space-sm) var(--space-xl)',
                          border: canCraft() ? '2px solid rgba(212,175,55,0.4)' : '2px solid rgba(74,44,106,0.25)',
                          background: canCraft() 
                            ? 'linear-gradient(135deg, rgba(30,20,10,0.9), rgba(15,10,5,0.95))' 
                            : 'rgba(20,20,35,0.6)',
                          color: canCraft() ? 'rgba(212,175,55,0.9)' : 'rgba(74,44,106,0.4)',
                          boxShadow: canCraft() ? '0 0 25px rgba(212,175,55,0.15), inset 0 0 15px rgba(212,175,55,0.04)' : 'none',
                          letterSpacing: '0.1em',
                        }}
                      >
                        {/* Shimmer effect */}
                        {canCraft() && (
                          <div 
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-arcane-gold/10 to-transparent -skew-x-12"
                            style={{ animation: 'shimmer 2.5s infinite' }}
                          />
                        )}
                        <span className="relative z-10">Synthesize</span>
                      </button>
                    </div>

                    {/* Slot 2 */}
                    <CraftingSlot 
                      index={1}
                      selectedCardId={selectedCards[1]}
                      onDrop={(e) => handleDropOnCraftingSlot(e, 1)}
                      onDragOver={handleDragOver}
                      onClear={() => selectCard(1, null)}
                    />
                  </div>

                  {/* Grimoire Pages - Arcane Tome Frame */}
                  <div className="w-full" style={{ marginTop: 'var(--space-2xl)', padding: '0 var(--space-lg)' }}>
                    <div
                      className="relative rounded-lg"
                      style={{
                        border: '2px solid rgba(212,175,55,0.35)',
                        background: 'linear-gradient(135deg, rgba(30,20,10,0.85) 0%, rgba(15,10,5,0.9) 50%, rgba(30,20,10,0.85) 100%)',
                        boxShadow: 'inset 0 0 30px rgba(212,175,55,0.06), 0 0 20px rgba(0,0,0,0.5)',
                      }}
                    >
                      {/* Outer decorative border inset */}
                      <div
                        className="absolute inset-[5px] rounded pointer-events-none"
                        style={{
                          border: '1px solid rgba(212,175,55,0.15)',
                        }}
                      />

                      {/* Corner ornaments */}
                      {(['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'] as const).map((pos, i) => (
                        <div
                          key={i}
                          className={`absolute ${pos} text-arcane-gold/30 pointer-events-none select-none`}
                          style={{
                            fontSize: 'clamp(16px, 1.5vw, 22px)',
                            padding: '4px 7px',
                            transform: i === 1 ? 'scaleX(-1)' : i === 2 ? 'scaleY(-1)' : i === 3 ? 'scale(-1)' : undefined,
                          }}
                        >
                          ❧
                        </div>
                      ))}

                      {/* Header area */}
                      <div
                        className="flex items-center justify-center gap-3 relative"
                        style={{ padding: 'var(--space-sm) var(--space-lg)' }}
                      >
                        {/* Left rule */}
                        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.3))' }} />
                        <h3 className="text-game-body font-bold text-arcane-gold/80 flex items-center gap-2 shrink-0 tracking-wider uppercase" style={{ fontSize: 'var(--font-game-caption)', letterSpacing: '0.15em' }}>
                          <span className="text-arcane-gold/50">✦</span>
                          Grimoire Pages
                          <span className="text-arcane-gold/50">✦</span>
                        </h3>
                        {/* Right rule */}
                        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(212,175,55,0.3))' }} />
                      </div>

                      {/* Left edge arrow */}
                      <button
                        onClick={() => {
                          grimoireScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' });
                        }}
                        className="absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95 group"
                        style={{
                          left: 'clamp(-20px, -2.5vw, -14px)',
                          width: 'clamp(36px, 4vw, 52px)',
                          height: 'clamp(36px, 4vw, 52px)',
                          background: 'linear-gradient(135deg, rgba(30,20,10,0.95), rgba(15,10,5,0.95))',
                          border: '2px solid rgba(212,175,55,0.4)',
                          boxShadow: '0 0 12px rgba(0,0,0,0.6), inset 0 0 8px rgba(212,175,55,0.05)',
                        }}
                      >
                        <span
                          className="text-arcane-gold/60 group-hover:text-arcane-gold transition-colors duration-200 select-none"
                          style={{ fontSize: 'clamp(22px, 2.5vw, 34px)', lineHeight: 1 }}
                        >
                          ‹
                        </span>
                      </button>

                      {/* Scrollable page carousel */}
                      <div
                        ref={grimoireScrollRef}
                        className="overflow-x-auto overflow-y-hidden grimoire-carousel"
                        style={{
                          padding: 'var(--space-sm) var(--space-lg) var(--space-lg)',
                          scrollSnapType: 'x mandatory',
                          WebkitOverflowScrolling: 'touch',
                        }}
                      >
                        <div className="flex gap-3" style={{ minWidth: 'min-content' }}>
                          {availableCards.map((card) => {
                            const def = getCardDefinition(card.definitionId);
                            return (
                              <div
                                key={card.instanceId}
                                draggable
                                onDragStart={(e) => handleDragStart(e, card.instanceId)}
                                onMouseEnter={() => {
                                  if (def) setHoveredCard(def, window.innerWidth * 0.65, window.innerHeight * 0.5);
                                }}
                                onMouseLeave={() => setHoveredCard(null)}
                                className="shrink-0 hover:-translate-y-2 cursor-grab active:cursor-grabbing transition-all duration-200 hover:z-10"
                                style={{ scrollSnapAlign: 'center' }}
                              >
                                <GrimoirePage page={card} />
                              </div>
                            );
                          })}
                          {availableCards.length === 0 && (
                            <div className="text-amber-200/40 text-game-caption py-8 italic whitespace-nowrap w-full text-center">
                              All pages are placed in your book or synthesis chambers.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right edge arrow */}
                      <button
                        onClick={() => {
                          grimoireScrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' });
                        }}
                        className="absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95 group"
                        style={{
                          right: 'clamp(-20px, -2.5vw, -14px)',
                          width: 'clamp(36px, 4vw, 52px)',
                          height: 'clamp(36px, 4vw, 52px)',
                          background: 'linear-gradient(135deg, rgba(30,20,10,0.95), rgba(15,10,5,0.95))',
                          border: '2px solid rgba(212,175,55,0.4)',
                          boxShadow: '0 0 12px rgba(0,0,0,0.6), inset 0 0 8px rgba(212,175,55,0.05)',
                        }}
                      >
                        <span
                          className="text-arcane-gold/60 group-hover:text-arcane-gold transition-colors duration-200 select-none"
                          style={{ fontSize: 'clamp(22px, 2.5vw, 34px)', lineHeight: 1 }}
                        >
                          ›
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Grimoire Toggle */}
            {!showGrimoire && !resultCard && (
              <button
                onClick={() => setShowGrimoire(true)}
                className="absolute rounded-lg font-bold font-display text-game-body tracking-wider uppercase transition-all z-30 flex items-center gap-2 hover:scale-105 active:scale-95"
                style={{ 
                  top: 'var(--space-md)', 
                  right: 'var(--space-md)', 
                  padding: 'var(--space-sm) var(--space-lg)',
                  border: '2px solid rgba(212,175,55,0.35)',
                  background: 'linear-gradient(135deg, rgba(30,20,10,0.9), rgba(15,10,5,0.95))',
                  color: 'rgba(212,175,55,0.85)',
                  boxShadow: '0 0 15px rgba(212,175,55,0.1), inset 0 0 10px rgba(212,175,55,0.03)',
                  letterSpacing: '0.08em',
                }}
              >
                <span className="text-arcane-gold/50">✦</span> Grimoire
              </button>
            )}
          </div>

      {/* Player's Grimoire — Active Battle Pages */}
      <div className="shrink-0 w-full z-10" style={{ background: 'linear-gradient(to top, rgba(74,44,106,0.35), transparent)' }}>
        <div style={{ padding: 'var(--space-sm) var(--space-md)' }}>
          <div className="flex gap-2 w-full">
            {CARD_SLOTS.map((slot, index) => {
              const pageId = deckSlots[index];
              const page = pageId ? inventory.find(c => c.instanceId === pageId) : null;
              
              return (
                <BookSlot
                  key={index}
                  slotIndex={index}
                  page={page}
                  onDrop={(e) => handleDropOnDeckSlot(e, index)}
                  onDragOver={handleDragOver}
                  onDragStart={(e) => page && handleDragStartFromSlot(e, page.instanceId, index)}
                  onRemove={() => removeFromDeckSlot(index)}
                />
              );
            })}
          </div>
        </div>
      </div>

          {/* Initiate Combat */}
          <div className="shrink-0 w-full flex justify-center z-10" style={{ padding: 'var(--space-md) var(--space-lg)', background: 'linear-gradient(to top, rgba(10,10,26,0.4), transparent)' }}>
            <button
              onClick={handleReady}
              disabled={!hasCardInDeck}
              className={`
                rounded-xl font-bold font-display text-game-subheading tracking-wider uppercase transition-all relative overflow-hidden
                ${hasCardInDeck
                  ? 'hover:scale-105 active:scale-95'
                  : 'cursor-not-allowed'}
              `}
              style={{ 
                padding: 'var(--space-md) var(--space-2xl)',
                border: hasCardInDeck ? '2px solid rgba(212,175,55,0.4)' : '2px solid rgba(74,44,106,0.2)',
                background: hasCardInDeck 
                  ? 'linear-gradient(135deg, rgba(30,20,10,0.9), rgba(15,10,5,0.95))' 
                  : 'rgba(20,20,35,0.5)',
                color: hasCardInDeck ? 'rgba(212,175,55,0.9)' : 'rgba(74,44,106,0.35)',
                boxShadow: hasCardInDeck ? '0 0 30px rgba(212,175,55,0.15), inset 0 0 20px rgba(212,175,55,0.04)' : 'none',
                letterSpacing: '0.1em',
              }}
            >
              {hasCardInDeck && (
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-arcane-gold/10 to-transparent -skew-x-12"
                  style={{ animation: 'shimmer 3s infinite' }}
                />
              )}
              <span className="relative z-10">{hasCardInDeck ? 'Begin Trial' : 'Place at least one page'}</span>
            </button>
          </div>
        </>
      )}

      {/* Result Overlay — Arcane synthesis ceremony */}
      {resultCard && !isPlayingVideo && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: 'radial-gradient(ellipse at center, rgba(10,10,26,0.97) 0%, rgba(5,5,16,0.99) 100%)' }}
        >
          {/* Atmospheric effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Slow rotating sigil ring */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ animation: 'spin 30s linear infinite' }}
            >
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                <div
                  key={angle}
                  className="absolute"
                  style={{
                    transform: `rotate(${angle}deg) translateY(clamp(-150px, -20vw, -220px))`,
                    color: 'rgba(212,175,55,0.12)',
                    fontSize: 'clamp(12px, 1.5vw, 18px)',
                  }}
                >
                  {angle % 90 === 0 ? '◆' : '✦'}
                </div>
              ))}
            </div>

            {/* Central glow */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: 'clamp(250px, 35vw, 400px)',
                height: 'clamp(250px, 35vw, 400px)',
                background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, rgba(74,44,106,0.04) 50%, transparent 70%)',
                animation: 'pageGlow 3s ease-in-out infinite',
              }}
            />

            {/* Rising arcane particles */}
            {[...Array(20)].map((_, i) => (
              <div
                key={`result-particle-${i}`}
                className="absolute rounded-full"
                style={{
                  width: `${2 + Math.random() * 3}px`,
                  height: `${2 + Math.random() * 3}px`,
                  left: `${30 + Math.random() * 40}%`,
                  bottom: '-5px',
                  backgroundColor: ['#d4af37', '#4a2c6a', '#8866aa'][i % 3],
                  opacity: 0.5,
                  animation: `riseEmber ${3 + Math.random() * 4}s linear infinite`,
                  animationDelay: `${Math.random() * 3}s`,
                  boxShadow: `0 0 6px ${i % 3 === 0 ? 'rgba(212,175,55,0.4)' : 'rgba(74,44,106,0.4)'}`,
                }}
              />
            ))}
          </div>

          {/* Vignette */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.5) 100%)' }}
          />
          
          <div 
            className="flex flex-col items-center relative z-10"
            style={{ animation: 'zoomIn 0.5s ease-out', gap: 'var(--space-lg)' }}
          >
            {/* Top decorative rule */}
            <div className="flex items-center gap-3" style={{ width: 'clamp(200px, 30vw, 320px)' }}>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.25))' }} />
              <span style={{ color: 'rgba(212,175,55,0.25)', fontSize: 'clamp(8px, 1vw, 12px)' }}>✦</span>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(212,175,55,0.25))' }} />
            </div>

            <h2 
              className="text-game-heading font-bold font-display text-arcane-gold tracking-wider uppercase"
              style={{ textShadow: '0 0 25px rgba(212,175,55,0.4)', letterSpacing: '0.12em' }}
            >
              Synthesis Complete
            </h2>
            <p className="text-arcane-gold/30 text-game-caption italic font-display max-w-md text-center">
              A new specimen has been catalogued. Handle with appropriate precautions.
            </p>

            <div 
              className="my-2"
              style={{ animation: 'float 2.5s ease-in-out infinite' }}
            >
              <GrimoirePage page={resultCard} isNewlyForged />
            </div>

            {/* Bottom decorative rule */}
            <div className="flex items-center gap-3" style={{ width: 'clamp(200px, 30vw, 320px)' }}>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.25))' }} />
              <span style={{ color: 'rgba(212,175,55,0.25)', fontSize: 'clamp(8px, 1vw, 12px)' }}>✦</span>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(212,175,55,0.25))' }} />
            </div>

            <button
              onClick={handleCollectResult}
              className="relative overflow-hidden rounded-lg font-bold font-display transition-all text-game-body tracking-wider uppercase hover:scale-105 active:scale-95"
              style={{ 
                padding: 'var(--space-sm) var(--space-xl)',
                border: '2px solid rgba(212,175,55,0.35)',
                background: 'linear-gradient(135deg, rgba(30,20,10,0.9), rgba(15,10,5,0.95))',
                color: 'rgba(212,175,55,0.85)',
                boxShadow: '0 0 20px rgba(212,175,55,0.12), inset 0 0 15px rgba(212,175,55,0.04)',
                letterSpacing: '0.1em',
              }}
            >
              Collect Specimen
            </button>
          </div>
        </div>
      )}
      
      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        @keyframes zoomIn {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes burst {
          0% { transform: translate(-50%, -50%) rotate(var(--angle)) translateX(0); opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(var(--angle)) translateX(var(--distance)); opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }
        @keyframes floatBlob1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(50px, -30px) scale(1.1); }
          50% { transform: translate(100px, 20px) scale(0.95); }
          75% { transform: translate(30px, 50px) scale(1.05); }
        }
        @keyframes floatBlob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-60px, 40px) scale(1.15); }
          66% { transform: translate(40px, -30px) scale(0.9); }
        }
        @keyframes pulseBlob {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.2; }
          50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0.35; }
        }
        @keyframes floatOrb {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          25% { transform: translate(20px, -30px) scale(1.2); opacity: 0.5; }
          50% { transform: translate(-10px, -50px) scale(0.8); opacity: 0.4; }
          75% { transform: translate(-30px, -20px) scale(1.1); opacity: 0.35; }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }
        @keyframes riseEmber {
          0% { 
            transform: translateY(0) translateX(0) scale(1); 
            opacity: 0.8; 
          }
          50% {
            transform: translateY(-50vh) translateX(20px) scale(0.8);
            opacity: 0.5;
          }
          100% { 
            transform: translateY(-100vh) translateX(-10px) scale(0.3); 
            opacity: 0; 
          }
        }
        @keyframes energyPulse {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(212,175,55,0.2), 0 0 40px rgba(74,44,106,0.15);
          }
          50% { 
            box-shadow: 0 0 40px rgba(212,175,55,0.35), 0 0 80px rgba(74,44,106,0.2);
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes chamberIdle {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.08); }
        }
        @keyframes chamberActivePulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes pageGlow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
      
      {/* Card Lore Panel for hover details */}
      <CardLorePanel />
    </div>
  );
}

interface BookSlotProps {
  slotIndex: number;
  page: CardInstance | null | undefined;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
  onRemove: () => void;
}

function BookSlot({ slotIndex: _slotIndex, page, onDrop, onDragOver, onDragStart, onRemove }: BookSlotProps) {
  const setHoveredCard = useUIStore((state) => state.setHoveredCard);

  if (!page) {
    return (
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        className="relative flex-1 flex items-center justify-center group"
        style={{
          height: 'var(--slot-height)',
          backgroundColor: 'rgba(26, 26, 46, 0.3)',
          border: '2px dashed rgba(100, 100, 140, 0.4)',
          borderRadius: '6px',
        }}
      >
        <div className="text-game-subheading text-white/10 font-bold group-hover:text-white/30 transition-colors">+</div>
      </div>
    );
  }

  const def = getCardDefinition(page.definitionId);
  if (!def) return null;

  const accentColor = def.emissiveColor ?? '#ff6a00';
  const imagePath = def.imagePath || '/assets/images/tabletop_1.png';

  return (
    <div
      className="relative flex-1 cursor-grab active:cursor-grabbing group"
      style={{ height: 'var(--slot-height)' }}
      draggable
      onDragStart={onDragStart}
      onMouseEnter={() => setHoveredCard(def, window.innerWidth * 0.65, window.innerHeight * 0.5)}
      onMouseLeave={() => setHoveredCard(null)}
    >
      <div
        className="relative w-full h-full overflow-hidden"
        style={{
          border: `2px solid ${accentColor}`,
          borderRadius: '6px',
        }}
      >
        {/* Background image */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={imagePath}
            alt={def.name}
            className="w-full h-full object-cover"
            style={{ 
              objectPosition: def.imagePosition || 'center center',
              transform: def.imageScale ? `scale(${def.imageScale})` : undefined,
            }}
          />
        </div>
        
        {/* Dark gradient overlay */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.1) 100%)',
          }}
        />
        
        {/* Page name */}
        <div className="absolute left-0 right-0 bottom-0 p-1.5 pointer-events-none">
          <h3
            className="text-game-micro font-bold text-white truncate"
            style={{
              WebkitTextStroke: '0.5px #000',
              paintOrder: 'stroke fill',
            }}
          >
            {def.name}
          </h3>
        </div>
        
        {/* Stats overlay - show attack/HP or burn damage */}
        <div 
          className="absolute right-1 bottom-1 flex items-center gap-1.5 text-game-micro font-bold pointer-events-none"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
        >
          {(def.baseStats.attack > 0 || def.baseStats.hp > 0) ? (
            <>
              <div className="flex items-center gap-0.5">
                <span style={{ color: '#ff6b6b' }}>⚔</span>
                <span className="text-white text-game-micro">{def.baseStats.attack}</span>
              </div>
              <div className="flex items-center gap-0.5">
                <span style={{ color: '#6bff6b' }}>♥</span>
                <span className="text-white text-game-micro">{def.baseStats.hp}</span>
              </div>
            </>
          ) : (page.statusEffect || def.statusEffect) ? (
            <div className="flex items-center gap-0.5 bg-orange-600/80 px-1.5 py-0.5 rounded text-game-micro">
              <span>🔥</span>
              <span className="text-white">{(page.statusEffect || def.statusEffect)?.damagePerTick}/s</span>
            </div>
          ) : null}
        </div>

        {/* Remove button */}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-1 right-1 w-5 h-5 bg-red-500/80 hover:bg-red-400 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-game-micro"
        >
          ×
        </button>

        {/* Status effect indicator - only show if page also has attack/HP */}
        {(page.statusEffect || def.statusEffect) && (def.baseStats.attack > 0 || def.baseStats.hp > 0) && (
          <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-amber-500 shadow-lg border border-white flex items-center justify-center text-game-micro">
            🔥
          </div>
        )}
      </div>
    </div>
  );
}

function CraftingSlot({ 
  index, 
  selectedCardId, 
  onDrop, 
  onDragOver, 
  onClear,
}: { 
  index: number;
  selectedCardId: string | null;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onClear: () => void;
}) {
  const card = useCraftingStore((state) => 
    selectedCardId ? state.inventory.find(c => c.instanceId === selectedCardId) : null
  );

  const chamberNumeral = index === 0 ? 'I' : 'II';
  const isActive = !!card;

  return (
    <div 
      onDrop={onDrop}
      onDragOver={onDragOver}
      className={`relative flex items-center justify-center group transition-all duration-500 ${
        !isActive ? 'hover:scale-[1.02]' : ''
      }`}
      style={{ width: 'var(--craft-slot-w)', height: 'var(--craft-slot-h)' }}
    >
      {/* Outer containment ward */}
      <div 
        className="absolute inset-0 rounded-xl pointer-events-none transition-all duration-500"
        style={{
          border: `2px solid ${isActive ? 'rgba(212,175,55,0.35)' : 'rgba(74,44,106,0.35)'}`,
          boxShadow: isActive 
            ? '0 0 25px rgba(212,175,55,0.12), inset 0 0 35px rgba(212,175,55,0.08)' 
            : '0 0 15px rgba(0,0,0,0.4), inset 0 0 25px rgba(74,44,106,0.15)',
          background: isActive
            ? 'radial-gradient(ellipse at center, rgba(212,175,55,0.05) 0%, rgba(10,10,26,0.95) 60%, rgba(5,5,16,0.98) 100%)'
            : 'radial-gradient(ellipse at center, rgba(74,44,106,0.08) 0%, rgba(10,10,26,0.95) 60%, rgba(5,5,16,0.98) 100%)',
        }}
      />

      {/* Inner ward ring */}
      <div 
        className="absolute inset-[7px] rounded-lg pointer-events-none transition-all duration-500"
        style={{
          border: `1px solid ${isActive ? 'rgba(212,175,55,0.18)' : 'rgba(74,44,106,0.2)'}`,
        }}
      />

      {/* Corner ward ornaments */}
      {(['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'] as const).map((pos, i) => (
        <div
          key={i}
          className={`absolute ${pos} pointer-events-none select-none transition-colors duration-500`}
          style={{
            color: isActive ? 'rgba(212,175,55,0.35)' : 'rgba(74,44,106,0.3)',
            fontSize: 'clamp(13px, 1.3vw, 18px)',
            padding: '2px 5px',
            transform: i === 1 ? 'scaleX(-1)' : i === 2 ? 'scaleY(-1)' : i === 3 ? 'scale(-1)' : undefined,
          }}
        >
          ❧
        </div>
      ))}

      {/* Cardinal sigil marks */}
      {[
        'top-[4px] left-1/2 -translate-x-1/2',
        'bottom-[4px] left-1/2 -translate-x-1/2',
        'left-[4px] top-1/2 -translate-y-1/2',
        'right-[4px] top-1/2 -translate-y-1/2',
      ].map((pos, i) => (
        <div
          key={`cardinal-${i}`}
          className={`absolute ${pos} pointer-events-none transition-colors duration-500`}
          style={{ 
            color: isActive ? 'rgba(212,175,55,0.25)' : 'rgba(74,44,106,0.2)',
            fontSize: 'clamp(5px, 0.6vw, 8px)',
          }}
        >
          ◆
        </div>
      ))}

      {/* Active containment glow */}
      {isActive && (
        <div 
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, rgba(212,175,55,0.06) 0%, transparent 55%)',
            animation: 'chamberActivePulse 3s ease-in-out infinite',
          }}
        />
      )}

      {/* Content */}
      {card ? (
        <div className="relative group z-10">
          <CraftingSlotPage page={card} />
          <button
            onClick={onClear}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center pointer-events-none z-10" style={{ gap: 'clamp(4px, 0.8vh, 10px)' }}>
          <div 
            style={{ 
              color: 'rgba(74,44,106,0.45)', 
              fontSize: 'clamp(22px, 2.5vw, 34px)',
              animation: 'chamberIdle 5s ease-in-out infinite',
              filter: 'drop-shadow(0 0 8px rgba(74,44,106,0.25))',
            }}
          >
            ⬡
          </div>
          <div className="text-center">
            <div 
              className="font-display tracking-[0.2em] uppercase"
              style={{ 
                color: 'rgba(212,175,55,0.3)', 
                fontSize: 'clamp(11px, 1.3vw, 16px)',
              }}
            >
              Chamber {chamberNumeral}
            </div>
            <div 
              className="italic"
              style={{ 
                color: 'rgba(74,44,106,0.4)', 
                fontSize: 'clamp(7px, 0.7vw, 9px)',
                marginTop: '2px',
              }}
            >
              Awaiting essence
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * GrimoirePage - Arcane specimen page from the Society's archives
 */
function GrimoirePage({ 
  page,
  isNewlyForged = false,
}: { 
  page: CardInstance;
  isNewlyForged?: boolean;
}) {
  const def = getCardDefinition(page.definitionId);
  const statusEffect = page.statusEffect || def?.statusEffect;
  
  if (!def) return null;

  const accentColor = def.emissiveColor ?? '#ff6a00';
  const imagePath = def.imagePath || '/assets/images/tabletop_1.png';

  return (
    <div 
      className="relative overflow-hidden rounded-lg"
      style={{ 
        width: 'var(--page-w)', 
        height: 'var(--page-h)',
        border: `2px solid ${isNewlyForged ? accentColor : 'rgba(212,175,55,0.3)'}`,
        boxShadow: isNewlyForged 
          ? `0 0 25px ${accentColor}66, 0 4px 16px rgba(0,0,0,0.5)` 
          : '0 4px 16px rgba(0,0,0,0.5)',
        background: '#050510',
      }}
    >
      {/* Inner ward border */}
      <div 
        className="absolute inset-[3px] rounded-sm pointer-events-none z-20"
        style={{
          border: `1px solid ${isNewlyForged ? `${accentColor}33` : 'rgba(212,175,55,0.1)'}`,
        }}
      />

      {/* Corner ornaments */}
      {(['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'] as const).map((pos, i) => (
        <div
          key={i}
          className={`absolute ${pos} pointer-events-none select-none z-20`}
          style={{
            color: isNewlyForged ? `${accentColor}99` : 'rgba(212,175,55,0.2)',
            fontSize: 'clamp(9px, 1vw, 13px)',
            padding: '1px 3px',
            transform: i === 1 ? 'scaleX(-1)' : i === 2 ? 'scaleY(-1)' : i === 3 ? 'scale(-1)' : undefined,
          }}
        >
          ❧
        </div>
      ))}

      {/* Background image */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={imagePath}
          alt={def.name}
          className="w-full h-full object-cover"
          style={{ 
            objectPosition: def.imagePosition || 'center center',
            transform: def.imageScale ? `scale(${def.imageScale})` : undefined,
          }}
        />
      </div>
      
      {/* Arcane vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            linear-gradient(to top, rgba(5,5,16,0.9) 0%, rgba(5,5,16,0.35) 35%, transparent 65%),
            radial-gradient(ellipse at center, transparent 30%, rgba(5,5,16,0.35) 100%)
          `,
        }}
      />
      
      {/* Newly forged arcane glow */}
      {isNewlyForged && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${accentColor}20 0%, transparent 60%)`,
            animation: 'pageGlow 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Name plate with separator */}
      <div className="absolute left-0 right-0 bottom-0 z-10">
        <div 
          className="mx-2 h-px"
          style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.2), transparent)' }}
        />
        <div className="px-2 py-1.5">
          <h3
            className="font-display text-game-caption font-bold truncate"
            style={{
              color: 'rgba(212,175,55,0.85)',
              textShadow: '0 1px 3px rgba(0,0,0,0.9)',
            }}
          >
            {def.name}
          </h3>
        </div>
      </div>

      {/* Stats */}
      <div 
        className="absolute right-2 bottom-2 flex items-center gap-2 text-game-caption font-bold z-10"
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
      >
        {(def.baseStats.attack > 0 || def.baseStats.hp > 0) ? (
          <>
            <div className="flex items-center gap-1">
              <span style={{ color: '#ff6b6b' }}>⚔</span>
              <span className="text-white">{def.baseStats.attack + (page.statModifiers.attack || 0)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span style={{ color: '#6bff6b' }}>♥</span>
              <span className="text-white">{def.baseStats.hp + (page.statModifiers.hp || 0)}</span>
            </div>
          </>
        ) : statusEffect ? (
          <div className="flex items-center gap-1 bg-orange-600/80 px-2 py-0.5 rounded text-game-micro">
            <span>🔥</span>
            <span className="text-white">{statusEffect.damagePerTick}/s · {statusEffect.duration}s</span>
          </div>
        ) : null}
      </div>

      {/* Status Effect Indicator */}
      {statusEffect && (def.baseStats.attack > 0 || def.baseStats.hp > 0) && (
        <div 
          className="absolute top-2 right-2 w-6 h-6 rounded-full shadow-lg flex items-center justify-center text-game-micro z-10"
          title={statusEffect.type}
          style={{ 
            background: 'rgba(212,175,55,0.85)',
            border: '1px solid rgba(212,175,55,0.4)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        >
          {statusEffect.type === 'burn' ? '🔥' : '!'}
        </div>
      )}
      
      {/* Rarity sigil */}
      {def.rarity === 'rare' && (
        <div 
          className="absolute top-1.5 left-1.5 flex items-center justify-center pointer-events-none z-10"
          style={{ 
            color: 'rgba(212,175,55,0.75)',
            fontSize: 'clamp(10px, 1.1vw, 14px)',
            filter: 'drop-shadow(0 0 4px rgba(212,175,55,0.4))',
          }}
        >
          ✦
        </div>
      )}
    </div>
  );
}

/**
 * CraftingSlotPage - Specimen page placed into a synthesis chamber
 */
function CraftingSlotPage({ 
  page,
}: { 
  page: CardInstance;
}) {
  const def = getCardDefinition(page.definitionId);
  const statusEffect = page.statusEffect || def?.statusEffect;
  
  if (!def) return null;

  const accentColor = def.emissiveColor ?? '#ff6a00';
  const imagePath = def.imagePath || '/assets/images/tabletop_1.png';

  return (
    <div 
      className="relative overflow-hidden rounded-lg"
      style={{ 
        width: 'var(--craft-page-w)',
        height: 'var(--craft-page-h)',
        border: '2px solid rgba(212,175,55,0.3)',
        boxShadow: `0 0 15px ${accentColor}22, 0 4px 12px rgba(0,0,0,0.4)`,
        background: '#050510',
      }}
    >
      {/* Inner border */}
      <div 
        className="absolute inset-[3px] rounded-sm pointer-events-none z-20"
        style={{ border: '1px solid rgba(212,175,55,0.1)' }}
      />

      {/* Background image */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={imagePath}
          alt={def.name}
          className="w-full h-full object-cover"
          style={{ 
            objectPosition: def.imagePosition || 'center center',
            transform: def.imageScale ? `scale(${def.imageScale})` : undefined,
          }}
        />
      </div>
      
      {/* Arcane vignette */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            linear-gradient(to top, rgba(5,5,16,0.9) 0%, rgba(5,5,16,0.3) 40%, transparent 70%),
            radial-gradient(ellipse at center, transparent 30%, rgba(5,5,16,0.3) 100%)
          `,
        }}
      />

      {/* Name plate */}
      <div className="absolute left-0 right-0 bottom-0 z-10">
        <div 
          className="mx-2 h-px"
          style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.15), transparent)' }}
        />
        <div className="px-2 py-1.5">
          <h3
            className="font-display text-game-caption font-bold truncate"
            style={{
              color: 'rgba(212,175,55,0.85)',
              textShadow: '0 1px 3px rgba(0,0,0,0.9)',
            }}
          >
            {def.name}
          </h3>
        </div>
      </div>

      {/* Stats */}
      <div 
        className="absolute right-2 bottom-2 flex items-center gap-2 text-game-caption font-bold z-10"
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
      >
        {(def.baseStats.attack > 0 || def.baseStats.hp > 0) ? (
          <>
            <div className="flex items-center gap-1">
              <span style={{ color: '#ff6b6b' }}>⚔</span>
              <span className="text-white">{def.baseStats.attack}</span>
            </div>
            <div className="flex items-center gap-1">
              <span style={{ color: '#6bff6b' }}>♥</span>
              <span className="text-white">{def.baseStats.hp}</span>
            </div>
          </>
        ) : statusEffect ? (
          <div className="flex items-center gap-1 bg-orange-600/80 px-2 py-0.5 rounded text-game-micro">
            <span>🔥</span>
            <span className="text-white">{statusEffect.damagePerTick}/s · {statusEffect.duration}s</span>
          </div>
        ) : null}
      </div>

      {/* Status Effect Indicator */}
      {statusEffect && (def.baseStats.attack > 0 || def.baseStats.hp > 0) && (
        <div 
          className="absolute top-2 right-2 w-6 h-6 rounded-full shadow-lg flex items-center justify-center text-game-micro z-10"
          style={{ 
            background: 'rgba(212,175,55,0.85)',
            border: '1px solid rgba(212,175,55,0.4)',
          }}
        >
          {statusEffect.type === 'burn' ? '🔥' : '!'}
        </div>
      )}
    </div>
  );
}
