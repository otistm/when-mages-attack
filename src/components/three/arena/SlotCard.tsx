/**
 * SlotCard - Visual card that hovers above a slot
 * 
 * Two phases:
 * 1. SPAWN COOLDOWN: Card charges up to spawn the construct
 * 2. SPAWNED: Card continues to show firing cooldown
 * 
 * Hover triggers 2D lore panel overlay (via UI store)
 */

import { useRef, useState, useCallback } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CardDefinition, Team, CardSlotConfig } from '@/types';
import { useUIStore } from '@/stores/uiStore';

interface SlotCardProps {
  slot: CardSlotConfig;
  team: Team;
  zPosition: number;
  card: CardDefinition;
  hasSpawned?: boolean;
  onSpawn?: (slotIndex: number) => void;
}

export function SlotCard({ 
  slot, 
  team: _team, 
  zPosition, 
  card, 
  hasSpawned: _hasSpawned = false,
  onSpawn 
}: SlotCardProps) {
  const [hovered, setHovered] = useState(false);
  const [cooldownProgress, setCooldownProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [hasTriggeredSpawn, setHasTriggeredSpawn] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const lastTriggerRef = useRef(0);
  
  const setHoveredCard = useUIStore((state) => state.setHoveredCard);
  const { camera, size } = useThree();

  const isConstruct = card.type === 'CONSTRUCT';
  const cooldownDuration = card.cooldown ?? 5;

  // Convert 3D position to screen coordinates
  const getScreenPosition = useCallback(() => {
    if (!groupRef.current) return { x: 0, y: 0 };
    
    const vector = new THREE.Vector3(slot.xPosition, 1.5, zPosition);
    vector.project(camera);
    
    return {
      x: (vector.x * 0.5 + 0.5) * size.width,
      y: (-vector.y * 0.5 + 0.5) * size.height,
    };
  }, [camera, size, slot.xPosition, zPosition]);

  // Handle hover enter
  const handleMouseEnter = useCallback(() => {
    setHovered(true);
    const pos = getScreenPosition();
    setHoveredCard(card, pos.x, pos.y);
  }, [card, getScreenPosition, setHoveredCard]);

  // Handle hover exit
  const handleMouseLeave = useCallback(() => {
    setHovered(false);
    setHoveredCard(null);
  }, [setHoveredCard]);

  // Cooldown logic - continues even after spawn
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    
    const time = clock.elapsedTime;
    
    // Floating animation
    const baseFloat = 0.9 + Math.sin(time * 1.1 + slot.index * 0.7) * 0.06;
    const hoverLift = hovered ? 0.15 : 0;
    groupRef.current.position.y = baseFloat + hoverLift;

    // Cooldown timer
    const elapsed = time - lastTriggerRef.current;
    const progress = Math.min(elapsed / cooldownDuration, 1);
    setCooldownProgress(progress);

    // Trigger when cooldown completes
    if (progress >= 1) {
      setIsReady(true);
      lastTriggerRef.current = time;
      
      // Only trigger spawn once
      if (!hasTriggeredSpawn && onSpawn) {
        setHasTriggeredSpawn(true);
        onSpawn(slot.index);
      }
      
      setTimeout(() => {
        setIsReady(false);
      }, 200);
    }
  });

  const fillPercent = cooldownProgress * 100;
  
  // Status text
  const getStatusText = () => {
    if (isReady) return 'FIRE!';
    return `${Math.ceil(cooldownDuration * (1 - cooldownProgress))}s`;
  };

  // Cel-shaded color palette
  const bgColor = '#1a1a2e';         // Solid dark background
  const accentColor = card.emissiveColor ?? '#ff6a00';
  const borderColor = hovered || isReady ? accentColor : '#3a3a5a';

  // Scale factor for crisp text rendering
  // Render at 2x size internally, then scale down in 3D space for crisp text
  const renderScale = 2;
  // Base card dimensions (will be multiplied by renderScale)
  const cardWidth = 120; // pixels
  const cardHeight = 168; // pixels (aspect ratio ~1:1.4)

  return (
    <group ref={groupRef} position={[slot.xPosition, 0, zPosition]}>
      <Html
        transform
        scale={1 / renderScale}
        distanceFactor={10}
        position={[0, 0.5, 0]}
        occlude={false}
        zIndexRange={[100, 0]}
      >
        <div 
          className="relative pointer-events-auto select-none"
          style={{
            // Render at higher resolution for crisp text
            fontSize: '16px',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          }}
        >
          {/* Main Card - Rendered at 2x size for crisp text */}
          <div
            className="relative overflow-hidden cursor-pointer transition-transform duration-150"
            style={{
              width: `${cardWidth * renderScale}px`,
              height: `${cardHeight * renderScale}px`,
              transform: hovered ? 'scale(1.08) translateY(-8px)' : 'scale(1)',
              backgroundColor: bgColor,
              border: `${4 * renderScale}px solid ${borderColor}`,
              borderRadius: `${10 * renderScale}px`,
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Card Background - Solid color */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ backgroundColor: bgColor }}
            >
              {/* Toaster Image - Cel-shaded PNG */}
              <img 
                src="/assets/images/toaster_cel.png" 
                alt={card.name}
                style={{
                  width: `${80 * renderScale}px`,
                  height: `${80 * renderScale}px`,
                  objectFit: 'contain',
                }}
              />
            </div>

            {/* Cooldown Fill Overlay - Solid color, no gradient */}
            <div
              className="absolute bottom-0 left-0 right-0 pointer-events-none"
              style={{
                height: `${fillPercent}%`,
                backgroundColor: accentColor,
                opacity: isReady ? 0.9 : 0.5,
                transition: fillPercent < 5 ? 'none' : 'height 100ms linear',
              }}
            />

            {/* Ready indicator - solid flash */}
            {isReady && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ backgroundColor: accentColor, opacity: 0.3 }}
              />
            )}

            {/* Card Name - text with outline, no background to allow cooldown fill to show */}
            <div 
              className="absolute top-0 left-0 right-0 text-center pointer-events-none z-10"
              style={{ padding: `${10 * renderScale}px` }}
            >
              <span 
                className="font-bold tracking-wide text-white"
                style={{
                  fontSize: `${20 * renderScale}px`,
                  WebkitTextStroke: `${3 * renderScale}px #111111`,
                  paintOrder: 'stroke fill',
                }}
              >
                {card.name}
              </span>
            </div>

            {/* Bottom Stats Bar - solid colors */}
            <div 
              className="absolute bottom-0 left-0 right-0 pointer-events-none"
              style={{ 
                backgroundColor: '#0a0a12',
                padding: `${10 * renderScale}px ${12 * renderScale}px`,
              }}
            >
              {/* Cooldown progress bar - solid fill */}
              <div 
                className="absolute top-0 left-0 right-0"
                style={{ 
                  height: `${4 * renderScale}px`,
                  backgroundColor: '#222',
                }}
              >
                <div
                  className="h-full"
                  style={{
                    width: `${fillPercent}%`,
                    backgroundColor: accentColor,
                    transition: fillPercent < 5 ? 'none' : 'width 100ms linear',
                  }}
                />
              </div>

              <div 
                className="flex items-center justify-between font-bold"
                style={{ 
                  fontSize: `${16 * renderScale}px`,
                  marginTop: `${4 * renderScale}px`,
                }}
              >
                <div className="flex items-center" style={{ gap: `${4 * renderScale}px` }}>
                  <span style={{ color: '#ff6b6b' }}>⚔</span>
                  <span className="text-white">{card.baseStats.attack}</span>
                </div>
                
                <div className="flex items-center" style={{ gap: `${4 * renderScale}px` }}>
                  <span style={{ color: isReady ? accentColor : '#6bb3ff' }}>⏱</span>
                  <span style={{ color: isReady ? accentColor : '#ffffff' }}>
                    {getStatusText()}
                  </span>
                </div>
                
                {isConstruct && (
                  <div className="flex items-center" style={{ gap: `${4 * renderScale}px` }}>
                    <span style={{ color: '#6bff6b' }}>♥</span>
                    <span className="text-white">{card.baseStats.hp}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
}

export default SlotCard;
