/**
 * HandheldCraftingScene - Touch-optimized crafting layout for handhelds
 * 
 * Key differences from desktop CraftingScene:
 * - Crafting chambers are compact (side-by-side or stacked)
 * - Grimoire pages are in a horizontal scrollable strip (not flex-wrap grid)
 * - Book slots use horizontal scrolling with larger tap targets
 * - Uses tap-to-place instead of drag-and-drop
 * - Card lore appears as a bottom sheet
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useCraftingStore } from '@/stores/craftingStore';
import { useGameStore } from '@/stores/gameStore';
import { useCardStore } from '@/stores/cardStore';
import { useUIStore } from '@/stores/uiStore';
import { CardInstance } from '@/types';
import { getCardDefinition } from '@/data/cards';
import { CARD_SLOTS } from '@/types';
import { CardBottomSheet } from '@/components/ui/CardBottomSheet';
import { CardDefinition } from '@/types';

export function HandheldCraftingScene() {
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

  const selectedCardForPlacement = useUIStore((state) => state.selectedCardForPlacement);
  const setSelectedCardForPlacement = useUIStore((state) => state.setSelectedCardForPlacement);

  const videoRef = useRef<HTMLVideoElement>(null);

  const [showGrimoire, setShowGrimoire] = useState(true);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [resultCard, setResultCard] = useState<CardInstance | null>(null);
  const [screenFlash, setScreenFlash] = useState(false);
  const [bottomSheetCard, setBottomSheetCard] = useState<CardDefinition | null>(null);

  // Player's deck slots
  const [deckSlots, setDeckSlots] = useState<(string | null)[]>(
    CARD_SLOTS.map(() => null)
  );

  const hasCardInDeck = deckSlots.some(id => id !== null);

  useEffect(() => {
    if (lastCraftedCardId) {
      clearLastCrafted();
    }
  }, [lastCraftedCardId, clearLastCrafted]);

  // Handle video end
  const handleVideoEnded = useCallback(() => {
    setScreenFlash(true);
    setTimeout(() => setScreenFlash(false), 150);

    const result = craftSelectedCards();
    setResultCard(result);

    if (videoRef.current) {
      const video = videoRef.current;
      video.loop = true;
      video.play();
      const fadeInterval = setInterval(() => {
        if (video.volume > 0.1) {
          video.volume = Math.max(0.1, video.volume - 0.1);
        } else {
          clearInterval(fadeInterval);
          video.volume = 0.15;
        }
      }, 100);
    }

    setIsPlayingVideo(false);
  }, [craftSelectedCards]);

  // --- Tap-to-place handlers ---

  /** Tap a grimoire page -> select it for placement */
  const handleTapGrimoirePage = useCallback((cardId: string) => {
    if (selectedCardForPlacement === cardId) {
      // Deselect
      setSelectedCardForPlacement(null);
    } else {
      setSelectedCardForPlacement(cardId);
    }
  }, [selectedCardForPlacement, setSelectedCardForPlacement]);

  /** Tap a book slot -> place or remove */
  const handleTapBookSlot = useCallback((slotIndex: number) => {
    const currentCard = deckSlots[slotIndex];

    if (selectedCardForPlacement) {
      // Place the selected card
      const existingSlot = deckSlots.findIndex(id => id === selectedCardForPlacement);
      if (existingSlot !== -1) {
        // Swap
        setDeckSlots(prev => {
          const next = [...prev];
          next[existingSlot] = prev[slotIndex];
          next[slotIndex] = selectedCardForPlacement;
          return next;
        });
      } else {
        setDeckSlots(prev => {
          const next = [...prev];
          next[slotIndex] = selectedCardForPlacement;
          return next;
        });
      }
      setSelectedCardForPlacement(null);
    } else if (currentCard) {
      // Remove card from slot
      setDeckSlots(prev => {
        const next = [...prev];
        next[slotIndex] = null;
        return next;
      });
    }
  }, [deckSlots, selectedCardForPlacement, setSelectedCardForPlacement]);

  /** Tap a crafting chamber -> place selected card */
  const handleTapCraftingSlot = useCallback((slotIndex: 0 | 1) => {
    if (selectedCardForPlacement) {
      selectCard(slotIndex, selectedCardForPlacement);
      setSelectedCardForPlacement(null);
    } else if (selectedCards[slotIndex]) {
      // Clear the slot
      selectCard(slotIndex, null);
    }
  }, [selectedCardForPlacement, selectedCards, selectCard, setSelectedCardForPlacement]);

  /** Long-press a page to show details */
  const handleLongPressCard = useCallback((cardId: string) => {
    const card = inventory.find(c => c.instanceId === cardId);
    if (card) {
      const def = getCardDefinition(card.definitionId);
      if (def) setBottomSheetCard(def);
    }
  }, [inventory]);

  const handleCraft = useCallback(() => {
    if (!canCraft()) return;
    setIsPlayingVideo(true);
    setShowGrimoire(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = false;
      videoRef.current.volume = 0.7;
      videoRef.current.play();
    }
  }, [canCraft]);

  const handleReady = useCallback(() => {
    clearAllCards();
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
      const firstEmptySlot = deckSlots.findIndex(slot => slot === null);
      if (firstEmptySlot !== -1) {
        setDeckSlots(prev => {
          const next = [...prev];
          next[firstEmptySlot] = resultCard.instanceId;
          return next;
        });
      }
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.loop = false;
      videoRef.current.currentTime = 0;
      videoRef.current.muted = true;
    }
    setResultCard(null);
    setShowGrimoire(true);
  };

  // Available cards (not in deck or crafting)
  const availableCards = inventory.filter(card =>
    !deckSlots.includes(card.instanceId) &&
    !selectedCards.includes(card.instanceId)
  );

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: '#0a0a1a' }}>
      {/* Background Video */}
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

      {/* Animated Background */}
      {!isPlayingVideo && (
        <div className="absolute inset-0 z-[1] overflow-hidden">
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute rounded-full blur-[100px] opacity-25"
            style={{
              width: '60vw', height: '60vw',
              background: 'radial-gradient(circle, #ff6a00 0%, transparent 70%)',
              left: '10%', top: '20%',
              animation: 'floatBlob1 15s ease-in-out infinite',
            }}
          />
          <div
            className="absolute rounded-full blur-[80px] opacity-20"
            style={{
              width: '40vw', height: '40vw',
              background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)',
              right: '10%', bottom: '10%',
              animation: 'floatBlob2 18s ease-in-out infinite',
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)',
            }}
          />
        </div>
      )}

      {/* Screen Flash */}
      {screenFlash && (
        <div className="fixed inset-0 bg-amber-400 z-[200] pointer-events-none animate-pulse" />
      )}

      {/* Main UI */}
      {!isPlayingVideo && (
        <>
          {/* Enemy Header - compact */}
          <div className="shrink-0 w-full bg-gradient-to-b from-red-950/60 to-transparent z-10" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
            <div className="flex items-center justify-between">
              <div className="text-game-body font-bold text-red-400">??? Enemy ???</div>
              <div className="bg-red-900/50 rounded-full text-game-micro text-red-300 border border-red-800" style={{ padding: 'var(--space-xs) var(--space-sm)' }}>
                Level 1
              </div>
            </div>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto z-10" style={{ WebkitOverflowScrolling: 'touch' }}>
            {showGrimoire && (
              <div className="flex flex-col" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                {/* Grimoire Header */}
                <div className="text-center" style={{ marginBottom: 'var(--space-md)' }}>
                  <h1 className="text-game-subheading font-bold text-amber-500 tracking-wide" style={{ textShadow: '0 0 20px rgba(245,158,11,0.3)' }}>
                    Arcane Synthesis
                  </h1>
                </div>

                {/* Crafting Chambers - compact side-by-side */}
                <div className="flex items-center justify-center" style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                  <HandheldCraftingSlot
                    index={0}
                    selectedCardId={selectedCards[0]}
                    onTap={() => handleTapCraftingSlot(0)}
                    onClear={() => selectCard(0, null)}
                    isHighlighted={!!selectedCardForPlacement}
                  />

                  {/* Connector + Synthesize */}
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`text-2xl transition-all duration-500 ${
                        canCraft() ? 'text-amber-500 scale-125 animate-pulse' : 'text-gray-600'
                      }`}
                      style={{ textShadow: canCraft() ? '0 0 20px rgba(245,158,11,0.8)' : 'none' }}
                    >
                      ✦
                    </div>
                    <button
                      onClick={handleCraft}
                      disabled={!canCraft()}
                      className={`
                        rounded-full font-bold text-game-caption transition-all duration-300 relative overflow-hidden
                        ${canCraft()
                          ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.5)] active:scale-95'
                          : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
                      `}
                      style={{ padding: 'var(--space-xs) var(--space-md)', minHeight: '44px', minWidth: '44px' }}
                    >
                      <span className="relative z-10">Fuse</span>
                    </button>
                  </div>

                  <HandheldCraftingSlot
                    index={1}
                    selectedCardId={selectedCards[1]}
                    onTap={() => handleTapCraftingSlot(1)}
                    onClear={() => selectCard(1, null)}
                    isHighlighted={!!selectedCardForPlacement}
                  />
                </div>

                {/* Selected card indicator */}
                {selectedCardForPlacement && (
                  <div
                    className="text-center text-game-caption text-amber-300 animate-pulse"
                    style={{ marginBottom: 'var(--space-sm)' }}
                  >
                    Tap a slot or chamber to place the selected page
                  </div>
                )}

                {/* Grimoire Pages - horizontal scroll strip */}
                <div style={{ marginBottom: 'var(--space-md)' }}>
                  <h3 className="text-game-caption font-bold text-amber-200/80 flex items-center gap-2" style={{ marginBottom: 'var(--space-sm)' }}>
                    <span className="text-amber-500">📜</span> Grimoire Pages
                  </h3>
                  <div
                    className="overflow-x-auto overflow-y-hidden rounded-xl border border-amber-900/20 bg-black/30 backdrop-blur-sm"
                    style={{
                      padding: 'var(--space-sm)',
                      WebkitOverflowScrolling: 'touch',
                      scrollSnapType: 'x mandatory',
                    }}
                  >
                    <div className="flex gap-3" style={{ minWidth: 'min-content' }}>
                      {availableCards.map((card) => (
                        <HandheldGrimoirePage
                          key={card.instanceId}
                          page={card}
                          isSelected={selectedCardForPlacement === card.instanceId}
                          onTap={() => handleTapGrimoirePage(card.instanceId)}
                          onLongPress={() => handleLongPressCard(card.instanceId)}
                        />
                      ))}
                      {availableCards.length === 0 && (
                        <div className="text-gray-500 text-game-micro py-4 italic whitespace-nowrap">
                          All pages placed.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Grimoire Toggle (when closed) */}
            {!showGrimoire && !resultCard && (
              <button
                onClick={() => setShowGrimoire(true)}
                className="bg-gradient-to-r from-amber-600/80 to-orange-600/80 active:from-amber-500 active:to-orange-500 rounded-lg font-bold text-white text-game-caption shadow-lg transition-all z-30 flex items-center gap-2"
                style={{ margin: 'var(--space-md)', padding: 'var(--space-sm) var(--space-md)', minHeight: '44px' }}
              >
                <span>📖</span> Grimoire
              </button>
            )}
          </div>

          {/* Player's Book - horizontal scroll at bottom */}
          <div className="shrink-0 w-full bg-gradient-to-t from-blue-950/60 to-transparent z-10">
            <div
              className="overflow-x-auto overflow-y-hidden"
              style={{
                padding: 'var(--space-sm) var(--space-md)',
                WebkitOverflowScrolling: 'touch',
                scrollSnapType: 'x mandatory',
              }}
            >
              <div className="flex gap-2" style={{ minWidth: 'min-content' }}>
                {CARD_SLOTS.map((slot, index) => {
                  const pageId = deckSlots[index];
                  const page = pageId ? inventory.find(c => c.instanceId === pageId) : null;

                  return (
                    <HandheldBookSlot
                      key={index}
                      page={page}
                      onTap={() => handleTapBookSlot(index)}
                      isHighlighted={!!selectedCardForPlacement}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Ready Button */}
          <div className="shrink-0 w-full bg-gradient-to-t from-emerald-950/40 to-transparent flex justify-center z-10" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
            <button
              onClick={handleReady}
              disabled={!hasCardInDeck}
              className={`
                rounded-xl font-bold text-game-body transition-all w-full
                ${hasCardInDeck
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 active:from-emerald-500 active:to-teal-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
              `}
              style={{ padding: 'var(--space-md)', minHeight: '48px' }}
            >
              {hasCardInDeck ? 'Ready for Battle' : 'Place at least one page'}
            </button>
          </div>
        </>
      )}

      {/* Result Overlay */}
      {resultCard && !isPlayingVideo && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100]">
          <div className="flex flex-col items-center" style={{ gap: 'var(--space-md)', padding: 'var(--space-lg)' }}>
            <h2
              className="text-game-subheading font-bold text-amber-400 text-center"
              style={{ textShadow: '0 0 20px rgba(245,158,11,0.8)' }}
            >
              ✦ Synthesis Complete ✦
            </h2>
            <p className="text-amber-200/60 text-game-micro italic text-center">
              A new essence has been forged.
            </p>
            <div style={{ animation: 'float 2s ease-in-out infinite' }}>
              <HandheldGrimoirePage page={resultCard} isSelected={false} isNewlyForged onTap={() => {}} onLongPress={() => {}} />
            </div>
            <button
              onClick={handleCollectResult}
              className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg font-bold text-white text-game-body shadow-lg active:scale-95 transition-all w-full"
              style={{ padding: 'var(--space-md)', minHeight: '48px' }}
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
        @keyframes pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* Bottom Sheet for card details */}
      <CardBottomSheet card={bottomSheetCard} onClose={() => setBottomSheetCard(null)} />
    </div>
  );
}

/**
 * HandheldCraftingSlot - Compact crafting chamber for handheld
 */
function HandheldCraftingSlot({
  index,
  selectedCardId,
  onTap,
  onClear,
  isHighlighted,
}: {
  index: number;
  selectedCardId: string | null;
  onTap: () => void;
  onClear: () => void;
  isHighlighted: boolean;
}) {
  const card = useCraftingStore((state) =>
    selectedCardId ? state.inventory.find(c => c.instanceId === selectedCardId) : null
  );

  return (
    <div
      onClick={onTap}
      className={`
        rounded-lg border-2 transition-all duration-200 relative
        flex items-center justify-center cursor-pointer active:scale-95
        ${card
          ? 'border-amber-500/50 bg-amber-900/10 border-solid'
          : isHighlighted
            ? 'border-amber-400 bg-amber-900/20 border-dashed animate-pulse'
            : 'border-gray-700 bg-gray-800/30 border-dashed'}
      `}
      style={{
        width: 'clamp(80px, 22vw, 120px)',
        height: 'clamp(100px, 28vw, 150px)',
        minWidth: '80px',
        minHeight: '100px',
      }}
    >
      {card ? (
        <div className="relative w-full h-full">
          <HandheldCraftSlotCard page={card} />
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 rounded-full text-white flex items-center justify-center shadow-lg z-10 text-game-micro"
            style={{ minWidth: '28px', minHeight: '28px' }}
          >
            ×
          </button>
        </div>
      ) : (
        <div className="text-gray-500 font-bold text-game-micro pointer-events-none flex flex-col items-center gap-1">
          <span className="text-game-body opacity-50">◇</span>
          <span>{index + 1}</span>
        </div>
      )}
    </div>
  );
}

/**
 * HandheldCraftSlotCard - Card preview inside crafting chamber
 */
function HandheldCraftSlotCard({ page }: { page: CardInstance }) {
  const def = getCardDefinition(page.definitionId);
  if (!def) return null;

  const accentColor = def.emissiveColor ?? '#ff6a00';
  const imagePath = def.imagePath || '/assets/images/tabletop_1.png';

  return (
    <div className="relative w-full h-full overflow-hidden rounded-md" style={{ border: `1px solid ${accentColor}` }}>
      <img src={imagePath} alt={def.name} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)' }} />
      <div className="absolute left-0 right-0 bottom-0 p-1">
        <span className="text-game-micro font-bold text-white truncate block">{def.name}</span>
      </div>
    </div>
  );
}

/**
 * HandheldGrimoirePage - Tappable grimoire page card for handheld
 */
function HandheldGrimoirePage({
  page,
  isSelected,
  isNewlyForged = false,
  onTap,
  onLongPress,
}: {
  page: CardInstance;
  isSelected: boolean;
  isNewlyForged?: boolean;
  onTap: () => void;
  onLongPress: () => void;
}) {
  const def = getCardDefinition(page.definitionId);
  const statusEffect = page.statusEffect || def?.statusEffect;
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!def) return null;

  const accentColor = def.emissiveColor ?? '#ff6a00';
  const imagePath = def.imagePath || '/assets/images/tabletop_1.png';

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      onLongPress();
      longPressTimer.current = null;
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      onTap();
    }
  };

  const handleTouchCancel = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-lg shadow-lg shrink-0 transition-all duration-150 active:scale-95 cursor-pointer ${
        isSelected ? 'ring-2 ring-amber-400 -translate-y-2' : ''
      } ${isNewlyForged ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-gray-900' : ''}`}
      style={{
        width: 'clamp(80px, 20vw, 120px)',
        height: 'clamp(100px, 26vw, 150px)',
        border: `2px solid ${isSelected ? '#fbbf24' : accentColor}`,
        boxShadow: isNewlyForged ? `0 0 30px ${accentColor}` : isSelected ? '0 0 12px rgba(251,191,36,0.5)' : undefined,
        scrollSnapAlign: 'center',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onClick={onTap}
    >
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <img src={imagePath} alt={def.name} className="w-full h-full object-cover" style={{ objectPosition: def.imagePosition || 'center center', transform: def.imageScale ? `scale(${def.imageScale})` : undefined }} />
      </div>

      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.1) 100%)' }} />

      {/* Name */}
      <div className="absolute left-0 right-0 bottom-0 p-1.5">
        <h3 className="text-game-micro font-bold text-white truncate" style={{ WebkitTextStroke: '0.5px #000', paintOrder: 'stroke fill' }}>
          {def.name}
        </h3>
      </div>

      {/* Stats */}
      <div className="absolute right-1 bottom-1 flex items-center gap-1 text-game-micro font-bold pointer-events-none" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
        {(def.baseStats.attack > 0 || def.baseStats.hp > 0) ? (
          <>
            <span style={{ color: '#ff6b6b' }}>⚔</span>
            <span className="text-white">{def.baseStats.attack + (page.statModifiers.attack || 0)}</span>
            <span style={{ color: '#6bff6b' }}>♥</span>
            <span className="text-white">{def.baseStats.hp + (page.statModifiers.hp || 0)}</span>
          </>
        ) : statusEffect ? (
          <span className="bg-orange-600/80 px-1 py-0.5 rounded text-white">🔥{statusEffect.damagePerTick}/s</span>
        ) : null}
      </div>

      {/* Status indicator */}
      {statusEffect && (def.baseStats.attack > 0 || def.baseStats.hp > 0) && (
        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 shadow-lg border border-white flex items-center justify-center text-game-micro">
          🔥
        </div>
      )}

      {/* Rarity */}
      {def.rarity === 'rare' && (
        <div className="absolute top-1 left-1 text-game-caption">⭐</div>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute inset-0 pointer-events-none border-2 border-amber-400 rounded-lg" style={{ boxShadow: 'inset 0 0 10px rgba(251,191,36,0.3)' }} />
      )}
    </div>
  );
}

/**
 * HandheldBookSlot - Tappable book slot for handheld
 */
function HandheldBookSlot({
  page,
  onTap,
  isHighlighted,
}: {
  page: CardInstance | null | undefined;
  onTap: () => void;
  isHighlighted: boolean;
}) {
  if (!page) {
    return (
      <div
        onClick={onTap}
        className={`flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all ${
          isHighlighted ? 'border-amber-400 animate-pulse' : ''
        }`}
        style={{
          width: 'clamp(70px, 16vw, 110px)',
          height: 'var(--slot-height)',
          backgroundColor: isHighlighted ? 'rgba(245,158,11,0.1)' : 'rgba(26, 26, 46, 0.3)',
          border: `2px dashed ${isHighlighted ? 'rgba(245,158,11,0.6)' : 'rgba(100, 100, 140, 0.4)'}`,
          borderRadius: '8px',
          scrollSnapAlign: 'center',
          minHeight: '60px',
        }}
      >
        <div className="text-game-subheading text-white/10 font-bold">+</div>
      </div>
    );
  }

  const def = getCardDefinition(page.definitionId);
  if (!def) return null;

  const accentColor = def.emissiveColor ?? '#ff6a00';
  const imagePath = def.imagePath || '/assets/images/tabletop_1.png';

  return (
    <div
      onClick={onTap}
      className="relative shrink-0 cursor-pointer active:scale-95 transition-all"
      style={{
        width: 'clamp(70px, 16vw, 110px)',
        height: 'var(--slot-height)',
        scrollSnapAlign: 'center',
        minHeight: '60px',
      }}
    >
      <div className="relative w-full h-full overflow-hidden" style={{ border: `2px solid ${accentColor}`, borderRadius: '8px' }}>
        <img src={imagePath} alt={def.name} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: def.imagePosition || 'center center', transform: def.imageScale ? `scale(${def.imageScale})` : undefined }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 40%, transparent 100%)' }} />

        {/* Name */}
        <div className="absolute left-0 right-0 bottom-0 p-1">
          <h3 className="text-game-micro font-bold text-white truncate" style={{ WebkitTextStroke: '0.5px #000', paintOrder: 'stroke fill' }}>
            {def.name}
          </h3>
        </div>

        {/* Stats */}
        <div className="absolute right-1 bottom-1 flex items-center gap-1 text-game-micro font-bold pointer-events-none" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
          {(def.baseStats.attack > 0 || def.baseStats.hp > 0) && (
            <>
              <span style={{ color: '#ff6b6b' }}>⚔</span>
              <span className="text-white">{def.baseStats.attack}</span>
              <span style={{ color: '#6bff6b' }}>♥</span>
              <span className="text-white">{def.baseStats.hp}</span>
            </>
          )}
        </div>

        {/* Tap to remove indicator */}
        <div className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500/60 rounded-full text-white flex items-center justify-center text-game-micro">
          ×
        </div>
      </div>
    </div>
  );
}

export default HandheldCraftingScene;
