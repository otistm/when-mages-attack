import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useCraftingStore } from '@/stores/craftingStore';
import { useGameStore } from '@/stores/gameStore';
import { useCardStore } from '@/stores/cardStore';
import { useUIStore } from '@/stores/uiStore';
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
  const addCard = useCardStore((state) => state.addCard);
  const clearAllCards = useCardStore((state) => state.clearAll);
  const setHoveredCard = useUIStore((state) => state.setHoveredCard);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  
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
    
    // Start video playback with sound
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = false;
      videoRef.current.volume = 0.7;
      videoRef.current.play();
    }
  }, [canCraft]);

  const handleReady = useCallback(() => {
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
    
    setPhase('combat');
  }, [deckSlots, inventory, addCard, clearAllCards, setPhase]);

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
          {/* Enemy Header - Name and Level */}
          <div className="shrink-0 w-full bg-gradient-to-b from-red-950/60 to-transparent z-10" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center" style={{ gap: 'var(--space-md)' }}>
                <div className="text-game-subheading font-bold text-red-400">??? Enemy ???</div>
                <div className="bg-red-900/50 rounded-full text-game-caption text-red-300 border border-red-800" style={{ padding: 'var(--space-xs) var(--space-sm)' }}>
                  Level 1
                </div>
              </div>
              <div className="text-gray-500 text-game-caption italic">Prepare for battle...</div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 relative overflow-hidden z-10">
            {/* Enhanced Floating Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Large glowing orbs */}
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
                      ['rgba(255,106,0,0.4)', 'rgba(245,158,11,0.3)', 'rgba(251,191,36,0.35)'][i % 3]
                    } 0%, transparent 70%)`,
                    animation: `floatOrb ${8 + Math.random() * 6}s ease-in-out infinite`,
                    animationDelay: `${Math.random() * 4}s`,
                    filter: 'blur(2px)',
                  }}
                />
              ))}
              
              {/* Small sparkle particles */}
              {[...Array(40)].map((_, i) => (
                <div
                  key={`sparkle-${i}`}
                  className="absolute rounded-full"
                  style={{
                    width: `${2 + Math.random() * 4}px`,
                    height: `${2 + Math.random() * 4}px`,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    backgroundColor: ['#ff6a00', '#fbbf24', '#f59e0b', '#ffffff'][i % 4],
                    opacity: 0.3 + Math.random() * 0.4,
                    animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
                    animationDelay: `${Math.random() * 3}s`,
                    boxShadow: '0 0 6px currentColor',
                  }}
                />
              ))}
              
              {/* Rising ember particles */}
              {[...Array(15)].map((_, i) => (
                <div
                  key={`ember-${i}`}
                  className="absolute w-1 h-1 rounded-full bg-orange-500"
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    bottom: '-10px',
                    opacity: 0.6,
                    animation: `riseEmber ${4 + Math.random() * 4}s linear infinite`,
                    animationDelay: `${Math.random() * 4}s`,
                    boxShadow: '0 0 8px #ff6a00',
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
                <div className="relative z-10" style={{ padding: 'var(--space-lg)' }}>
                  <h1 className="text-game-heading font-bold text-amber-500 text-center tracking-wide" style={{ textShadow: '0 0 20px rgba(245,158,11,0.3)' }}>
                    Arcane Synthesis
                  </h1>
                  <p className="text-amber-200/60 text-center mt-1 text-game-caption italic">
                    "Fusion of essences yields power beyond comprehension"
                  </p>
                </div>

                {/* Crafting Area */}
                <div className="flex-1 flex flex-col items-center justify-center" style={{ padding: 'var(--space-lg)' }}>
                  <div className="flex items-center relative" style={{ gap: 'var(--space-xl)' }}>
                    {/* Crafting Circle Glow */}
                    {canCraft() && (
                      <>
                        <div 
                          className="absolute inset-0 -m-16 rounded-full pointer-events-none"
                          style={{
                            background: 'radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 60%)',
                            animation: 'pulseBlob 3s ease-in-out infinite',
                          }}
                        />
                        {/* Energy ring */}
                        <div 
                          className="absolute inset-0 -m-20 rounded-full pointer-events-none border-2 border-amber-500/20"
                          style={{
                            animation: 'energyPulse 2s ease-in-out infinite',
                          }}
                        />
                        {/* Rotating arcane symbols */}
                        <div 
                          className="absolute inset-0 -m-24 pointer-events-none flex items-center justify-center"
                          style={{
                            animation: 'spin 20s linear infinite',
                          }}
                        >
                          {[0, 60, 120, 180, 240, 300].map((angle) => (
                            <div
                              key={angle}
                              className="absolute text-amber-500/30 text-game-subheading"
                              style={{
                                transform: `rotate(${angle}deg) translateY(-120px)`,
                              }}
                            >
                              ✦
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
                            ? 'text-amber-500 scale-125 animate-pulse' 
                            : 'text-gray-600'
                        }`}
                        style={{ textShadow: canCraft() ? '0 0 20px rgba(245,158,11,0.8)' : 'none' }}
                      >
                        ✦
                      </div>
                      <button
                        onClick={handleCraft}
                        disabled={!canCraft()}
                        className={`
                          rounded-full font-bold text-game-body transition-all duration-300 relative overflow-hidden
                          ${canCraft()
                            ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-[0_0_30px_rgba(245,158,11,0.5)] transform hover:scale-105 active:scale-95'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
                        `}
                        style={{ padding: 'var(--space-sm) var(--space-xl)' }}
                      >
                        {/* Shimmer effect */}
                        {canCraft() && (
                          <div 
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                            style={{ animation: 'shimmer 2s infinite' }}
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

                  {/* Grimoire Pages (available pages) */}
                  <div className="w-full max-w-6xl" style={{ marginTop: 'var(--space-2xl)' }}>
                    <h3 className="text-game-body font-bold text-amber-200/80 flex items-center gap-2" style={{ marginBottom: 'var(--space-md)' }}>
                      <span className="text-amber-500">📜</span> Grimoire Pages
                    </h3>
                    <div className="bg-black/30 rounded-xl border border-amber-900/20 overflow-y-auto backdrop-blur-sm" style={{ padding: 'var(--space-lg)', maxHeight: 'clamp(200px, 45vh, 500px)' }}>
                      <div className="flex flex-wrap gap-3 justify-center">
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
                              className="hover:-translate-y-2 cursor-grab active:cursor-grabbing transition-all duration-200 hover:z-10"
                            >
                              <GrimoirePage page={card} />
                            </div>
                          );
                        })}
                        {availableCards.length === 0 && (
                          <div className="text-gray-500 text-game-caption py-8 italic">
                            All pages are placed in your book or synthesis chambers.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Close button */}
                <div className="flex justify-end" style={{ padding: 'var(--space-md)' }}>
                  <button
                    onClick={() => setShowGrimoire(false)}
                    className="bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 hover:text-white transition-colors text-game-caption"
                    style={{ padding: 'var(--space-xs) var(--space-lg)' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Grimoire Toggle Button (when closed) */}
            {!showGrimoire && !resultCard && (
              <button
                onClick={() => setShowGrimoire(true)}
                className="absolute bg-gradient-to-r from-amber-600/80 to-orange-600/80 hover:from-amber-500 hover:to-orange-500 rounded-lg font-bold text-white text-game-body shadow-lg transition-all z-30 flex items-center gap-2"
                style={{ top: 'var(--space-md)', right: 'var(--space-md)', padding: 'var(--space-sm) var(--space-lg)' }}
              >
                <span>📖</span> Grimoire
              </button>
            )}
          </div>

      {/* Player's Book - Bottom */}
      <div className="shrink-0 w-full bg-gradient-to-t from-blue-950/60 to-transparent z-10">
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

          {/* Ready Button */}
          <div className="shrink-0 w-full bg-gradient-to-t from-emerald-950/40 to-transparent flex justify-center z-10" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
            <button
              onClick={handleReady}
              disabled={!hasCardInDeck}
              className={`
                rounded-xl font-bold text-game-subheading transition-all
                ${hasCardInDeck
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
              `}
              style={{ padding: 'var(--space-md) var(--space-2xl)' }}
            >
              {hasCardInDeck ? 'Ready for Battle' : 'Place at least one page'}
            </button>
          </div>
        </>
      )}

      {/* Result Overlay - Shows after video ends */}
      {resultCard && !isPlayingVideo && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100]">
          {/* Particle burst */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-amber-500 rounded-full"
                style={{
                  left: '50%',
                  top: '50%',
                  animation: `burst ${0.5 + Math.random() * 0.5}s ease-out forwards`,
                  animationDelay: `${Math.random() * 0.3}s`,
                  '--angle': `${(i / 30) * 360}deg`,
                  '--distance': `${100 + Math.random() * 200}px`,
                } as React.CSSProperties}
              />
            ))}
          </div>
          
          <div 
            className="flex flex-col items-center"
            style={{ animation: 'zoomIn 0.5s ease-out', gap: 'var(--space-lg)' }}
          >
            <h2 
              className="text-game-heading font-bold text-amber-400"
              style={{ textShadow: '0 0 20px rgba(245,158,11,0.8)' }}
            >
              ✦ Synthesis Complete ✦
            </h2>
            <p className="text-amber-200/60 text-game-caption italic max-w-md text-center">
              A new essence has been forged from the primordial fires of creation.
            </p>
            <div 
              className="m-4"
              style={{ animation: 'float 2s ease-in-out infinite' }}
            >
              <GrimoirePage page={resultCard} isNewlyForged />
            </div>
            <button
              onClick={handleCollectResult}
              className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg hover:from-amber-500 hover:to-orange-500 font-bold transition-all text-white text-game-body shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-105 active:scale-95"
              style={{ padding: 'var(--space-sm) var(--space-xl)' }}
            >
              Claim
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
            box-shadow: 0 0 20px rgba(255,106,0,0.3), 0 0 40px rgba(255,106,0,0.2);
          }
          50% { 
            box-shadow: 0 0 40px rgba(255,106,0,0.5), 0 0 80px rgba(255,106,0,0.3);
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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

  return (
    <div 
      onDrop={onDrop}
      onDragOver={onDragOver}
      className={`
        rounded-xl border-4 transition-all duration-300 relative
        flex items-center justify-center
        ${card 
          ? 'border-amber-500/50 bg-amber-900/10 border-solid' 
          : 'border-gray-700 bg-gray-800/30 hover:border-gray-500 hover:bg-gray-800/50 border-dashed'}
      `}
      style={{ width: 'var(--craft-slot-w)', height: 'var(--craft-slot-h)' }}
    >
      {/* Arcane Circle Pattern */}
      <div 
        className="absolute inset-2 rounded-lg border border-amber-900/30 pointer-events-none"
        style={{
          background: card ? 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)' : 'none',
        }}
      />
      
      {card ? (
        <div className="relative group">
          <CraftingSlotPage page={card} />
          <button
            onClick={onClear}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="text-gray-600 font-bold text-game-body pointer-events-none flex flex-col items-center gap-2">
          <span className="text-game-subheading opacity-50">◇</span>
          <span>Chamber {index + 1}</span>
        </div>
      )}
    </div>
  );
}

/**
 * GrimoirePage - Displays a page in the grimoire (same size as book slots)
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
      className={`relative overflow-hidden rounded-lg shadow-lg ${isNewlyForged ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-gray-900' : ''}`}
      style={{ 
        width: 'var(--page-w)', 
        height: 'var(--page-h)',
        border: `2px solid ${accentColor}`,
        boxShadow: isNewlyForged ? `0 0 30px ${accentColor}` : undefined,
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
      
      {/* Newly forged glow */}
      {isNewlyForged && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${accentColor}33 0%, transparent 70%)`,
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Page name */}
      <div className="absolute left-0 right-0 bottom-0 p-2">
        <h3
          className="text-game-caption font-bold text-white truncate"
          style={{
            WebkitTextStroke: '0.5px #000',
            paintOrder: 'stroke fill',
          }}
        >
          {def.name}
        </h3>
      </div>

      {/* Stats - show attack/HP or burn damage depending on page type */}
      <div 
        className="absolute right-2 bottom-2 flex items-center gap-2 text-game-caption font-bold"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
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

      {/* Status Effect Indicator - only show if page also has attack/HP */}
      {statusEffect && (def.baseStats.attack > 0 || def.baseStats.hp > 0) && (
        <div 
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-500 shadow-lg border border-white flex items-center justify-center text-game-micro"
          title={statusEffect.type}
          style={{ animation: 'pulse 1s ease-in-out infinite' }}
        >
          {statusEffect.type === 'burn' ? '🔥' : '!'}
        </div>
      )}
      
      {/* Rarity indicator for rare+ pages */}
      {def.rarity === 'rare' && (
        <div className="absolute top-2 left-2 w-6 h-6 flex items-center justify-center text-game-body">
          ⭐
        </div>
      )}
    </div>
  );
}

/**
 * CraftingSlotPage - Smaller page for synthesis chambers
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
      className="relative overflow-hidden rounded-lg shadow-lg"
      style={{ 
        width: 'var(--craft-page-w)',
        height: 'var(--craft-page-h)',
        border: `2px solid ${accentColor}`,
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
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)',
        }}
      />

      {/* Page name */}
      <div className="absolute left-0 right-0 bottom-0 p-2">
        <h3
          className="text-game-caption font-bold text-white truncate"
          style={{
            WebkitTextStroke: '0.5px #000',
            paintOrder: 'stroke fill',
          }}
        >
          {def.name}
        </h3>
      </div>

      {/* Stats - show attack/HP or burn damage depending on page type */}
      <div 
        className="absolute right-2 bottom-2 flex items-center gap-2 text-game-caption font-bold"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
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

      {/* Status Effect Indicator - only show if page also has attack/HP */}
      {statusEffect && (def.baseStats.attack > 0 || def.baseStats.hp > 0) && (
        <div 
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-500 shadow-lg border border-white flex items-center justify-center text-game-micro"
        >
          {statusEffect.type === 'burn' ? '🔥' : '!'}
        </div>
      )}
    </div>
  );
}
