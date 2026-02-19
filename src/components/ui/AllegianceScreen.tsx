import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment, ContactShadows } from '@react-three/drei';
import { useGameStore } from '@/stores/gameStore';
import { MAGE_DEFINITIONS } from '@/data/mages';
import { MageDefinition } from '@/types/mage';
import * as THREE from 'three';
import { useRef } from 'react';

type CellSize = 'large' | 'tall' | 'wide' | 'standard';

interface CellDef {
  gridColumn: string;
  gridRow: string;
  size: CellSize;
  cols: number[];
  rows: number[];
}

const BENTO_CELLS: CellDef[] = [
  { gridColumn: '1 / 3', gridRow: '1 / 3', size: 'large', cols: [0, 1], rows: [0, 1] },
  { gridColumn: '3 / 4', gridRow: '1 / 2', size: 'standard', cols: [2], rows: [0] },
  { gridColumn: '4 / 5', gridRow: '1 / 3', size: 'tall', cols: [3], rows: [0, 1] },
  { gridColumn: '3 / 4', gridRow: '2 / 3', size: 'standard', cols: [2], rows: [1] },
  { gridColumn: '1 / 3', gridRow: '3 / 4', size: 'wide', cols: [0, 1], rows: [2] },
  { gridColumn: '3 / 4', gridRow: '3 / 4', size: 'standard', cols: [2], rows: [2] },
  { gridColumn: '4 / 5', gridRow: '3 / 4', size: 'standard', cols: [3], rows: [2] },
];

function getGridTemplates(selectedIdx: number | null) {
  const colWeights = [1, 1, 1, 1];
  const rowWeights = [1, 1, 1.4];

  if (selectedIdx !== null) {
    const cell = BENTO_CELLS[selectedIdx];
    const SHRINK = 0.6;
    const colBoost = cell.cols.length >= 2 ? 1.5 : 2.2;
    const rowBoost = cell.rows.length >= 2 ? 1.5 : 2.2;

    for (let c = 0; c < 4; c++) {
      colWeights[c] = cell.cols.includes(c) ? colBoost : SHRINK;
    }
    for (let r = 0; r < 3; r++) {
      rowWeights[r] = cell.rows.includes(r) ? rowBoost : SHRINK;
    }
  }

  return {
    gridTemplateColumns: colWeights.map((w) => `${w}fr`).join(' '),
    gridTemplateRows: rowWeights.map((w) => `${w}fr`).join(' '),
  };
}

export function AllegianceScreen() {
  const selectMage = useGameStore((state) => state.selectMage);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [fadeIn, setFadeIn] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const selectedMage = selectedIdx !== null ? MAGE_DEFINITIONS[selectedIdx] : null;

  useEffect(() => {
    requestAnimationFrame(() => setFadeIn(true));
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedIdx === null) return;
    setFadeOut(true);
    setTimeout(() => {
      selectMage(MAGE_DEFINITIONS[selectedIdx].id);
    }, 600);
  }, [selectedIdx, selectMage]);

  const gridTemplates = useMemo(() => getGridTemplates(selectedIdx), [selectedIdx]);

  const particles = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: 1 + Math.random() * 2.5,
        duration: 12 + Math.random() * 20,
        delay: Math.random() * -20,
        opacity: 0.15 + Math.random() * 0.25,
      })),
    [],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden select-none"
      style={{ background: '#0a0a1a' }}
      onClick={() => setSelectedIdx(null)}
    >
      {/* ── Ambient ── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: selectedMage
          ? `conic-gradient(from 0deg at 50% 45%, ${selectedMage.color}06 0deg, transparent 60deg, ${selectedMage.emissiveColor}04 120deg, transparent 180deg, ${selectedMage.color}05 240deg, transparent 300deg, ${selectedMage.emissiveColor}03 360deg)`
          : 'conic-gradient(from 0deg at 50% 45%, rgba(74,44,106,0.04) 0deg, transparent 60deg, rgba(212,175,55,0.02) 120deg, transparent 180deg, rgba(74,44,106,0.03) 240deg, transparent 360deg)',
        animation: 'arcaneRotate 90s linear infinite',
        opacity: fadeIn && !fadeOut ? 1 : 0,
        transition: 'opacity 1200ms ease',
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: selectedMage
          ? `radial-gradient(ellipse at 35% 40%, ${selectedMage.color}0a 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, ${selectedMage.emissiveColor}06 0%, transparent 40%)`
          : 'radial-gradient(ellipse at 50% 40%, rgba(74,44,106,0.06) 0%, transparent 55%)',
        opacity: fadeIn && !fadeOut ? 1 : 0,
        transition: 'opacity 800ms ease, background 600ms ease',
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 220px 100px rgba(5,5,16,0.9)' }} />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <div key={p.id} className="absolute rounded-full" style={{
            left: p.left, top: p.top,
            width: `${p.size}px`, height: `${p.size}px`,
            background: selectedMage
              ? `radial-gradient(circle, ${selectedMage.color}bb, ${selectedMage.color}00)`
              : 'radial-gradient(circle, rgba(212,175,55,0.6), rgba(212,175,55,0))',
            opacity: fadeIn ? p.opacity : 0,
            animation: `particleDrift ${p.duration}s ease-in-out ${p.delay}s infinite`,
            transition: 'opacity 1500ms ease, background 800ms ease',
          }} />
        ))}
      </div>

      {/* ── Header ── */}
      <div className="relative z-10 shrink-0 transition-all duration-700" style={{
        paddingLeft: 'clamp(28px, 4vw, 56px)',
        paddingTop: 'clamp(24px, 4vh, 48px)',
        paddingBottom: '6px',
        opacity: fadeIn && !fadeOut ? 1 : 0,
        transform: fadeIn && !fadeOut ? 'translateY(0)' : 'translateY(-12px)',
      }}>
        <div className="font-mono tracking-widest uppercase mb-1" style={{ fontSize: 'clamp(0.38rem, 0.52vw, 0.48rem)', color: 'rgba(212,175,55,0.15)', letterSpacing: '0.35em' }}>
          Society of Synthesis — Inner Circle Registry — Classified
        </div>
        <h1 className="font-display tracking-wider" style={{
          fontSize: 'clamp(1.3rem, 2.8vw, 2rem)', color: '#d4af37',
          textShadow: '0 0 30px rgba(212,175,55,0.25), 0 0 60px rgba(212,175,55,0.08), 0 2px 4px rgba(0,0,0,0.9)',
          letterSpacing: '0.12em',
        }}>Choose Your Allegiance</h1>
        <div className="flex items-center gap-3 mt-1.5" style={{ maxWidth: '340px' }}>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(212,175,55,0.4), rgba(212,175,55,0.08))' }} />
          <span style={{ fontSize: 'clamp(0.5rem, 0.7vw, 0.62rem)', color: 'rgba(212,175,55,0.35)' }}>◆</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, rgba(212,175,55,0.4), rgba(212,175,55,0.08))' }} />
        </div>
        <p className="font-display tracking-widest uppercase mt-1" style={{ fontSize: 'clamp(0.44rem, 0.65vw, 0.58rem)', color: 'rgba(212,175,55,0.22)', letterSpacing: '0.3em' }}>
          Pledge to a mage — receive their keepsake — enter the arena
        </p>
      </div>

      {/* ── Bento Grid ── */}
      <div className="relative z-10 flex-1 min-h-0" style={{
        display: 'grid', ...gridTemplates,
        gap: 'clamp(5px, 0.55vw, 9px)',
        padding: '0 clamp(28px, 4vw, 56px) clamp(20px, 3vh, 40px)',
        opacity: fadeIn && !fadeOut ? 1 : 0,
        transform: fadeIn && !fadeOut ? 'translateY(0)' : 'translateY(14px)',
        transition: 'grid-template-columns 250ms cubic-bezier(0.25,0.46,0.45,0.94), grid-template-rows 250ms cubic-bezier(0.25,0.46,0.45,0.94), opacity 700ms ease, transform 700ms ease',
      }}>
        {MAGE_DEFINITIONS.map((mage, i) => {
          const cell = BENTO_CELLS[i];
          const isSelectedCell = selectedIdx === i;
          const effectiveSize: CellSize = isSelectedCell ? 'large' : selectedIdx !== null ? 'standard' : cell.size;
          return (
            <BentoCard key={mage.id} mage={mage} index={i}
              gridColumn={cell.gridColumn} gridRow={cell.gridRow}
              cellSize={effectiveSize} isSelected={isSelectedCell}
              hasAnySelection={selectedIdx !== null}
              onClick={() => setSelectedIdx(i)} onConfirm={handleConfirm} fadeIn={fadeIn}
            />
          );
        })}
      </div>

      {/* Fade-out */}
      {fadeOut && (
        <div className="absolute inset-0 z-30 pointer-events-none" style={{ backgroundColor: '#050510', animation: 'allegianceFadeOut 600ms ease-out forwards' }} />
      )}

      <style>{`
        @keyframes allegianceFadeOut { from { opacity: 0 } to { opacity: 1 } }
        @keyframes arcaneRotate { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes particleDrift {
          0%, 100% { transform: translate(0,0) scale(1) }
          25% { transform: translate(8px,-14px) scale(1.2) }
          50% { transform: translate(-6px,-28px) scale(0.8) }
          75% { transform: translate(10px,-16px) scale(1.1) }
        }
        @keyframes borderPulse { 0%, 100% { opacity: 0.6 } 50% { opacity: 1 } }
        @keyframes bentoCardReveal {
          from { opacity: 0; transform: scale(0.96) translateY(10px) }
          to { opacity: 1; transform: scale(1) translateY(0) }
        }
        @keyframes bentoContentIn {
          from { opacity: 0; transform: translateY(8px) }
          to { opacity: 1; transform: translateY(0) }
        }
        @keyframes keepsakeGlow {
          0%, 100% { text-shadow: 0 0 4px currentColor }
          50% { text-shadow: 0 0 12px currentColor, 0 0 24px currentColor }
        }
        @keyframes keepsakeModelIn {
          from { opacity: 0; transform: scale(0.85) }
          to { opacity: 1; transform: scale(1) }
        }
        .mage-scroll::-webkit-scrollbar { display: none }
        .mage-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   3D Keepsake Viewer
   ═══════════════════════════════════════════════════ */

function InlineKeepsakeViewer({ modelPath, color }: { modelPath: string; color: string }) {
  return (
    <Canvas camera={{ position: [0, 0.6, 3.8], fov: 36 }} style={{ pointerEvents: 'none' }} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={0.7} color="#ffffff" />
      <pointLight position={[-2, 1, 3]} intensity={0.45} color={color} distance={8} />
      <pointLight position={[2, -1, -2]} intensity={0.25} color={color} distance={6} />
      <Suspense fallback={null}>
        <RotatingKeepsake modelPath={modelPath} />
        <ContactShadows position={[0, -0.5, 0]} opacity={0.25} scale={4} blur={2} far={2} color={color} />
        <Environment preset="city" />
      </Suspense>
    </Canvas>
  );
}

function RotatingKeepsake({ modelPath }: { modelPath: string }) {
  const { scene } = useGLTF(modelPath);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const pivotRef = useRef<THREE.Group>(null);
  const offsetRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (pivotRef.current) {
      pivotRef.current.scale.set(1, 1, 1);
      pivotRef.current.rotation.set(0, 0, 0);
    }
    if (offsetRef.current) {
      offsetRef.current.position.set(0, 0, 0);
    }

    cloned.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const s = 6.0 / maxDim;

    if (offsetRef.current) {
      offsetRef.current.position.set(-center.x, -center.y, -center.z);
    }
    if (pivotRef.current) {
      pivotRef.current.scale.setScalar(s);
    }
  }, [cloned]);

  useFrame((_, delta) => {
    if (pivotRef.current) {
      pivotRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group ref={pivotRef}>
      <group ref={offsetRef}>
        <primitive object={cloned} />
      </group>
    </group>
  );
}

/* ═══════════════════════════════════════════════════
   Bento Card
   ═══════════════════════════════════════════════════ */

function BentoCard({
  mage, index, gridColumn, gridRow, cellSize, isSelected, hasAnySelection, onClick, onConfirm, fadeIn,
}: {
  mage: MageDefinition; index: number; gridColumn: string; gridRow: string;
  cellSize: CellSize; isSelected: boolean; hasAnySelection: boolean;
  onClick: () => void; onConfirm: () => void; fadeIn: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showLore, setShowLore] = useState(false);
  const active = isSelected || hovered;
  const isLargeish = cellSize === 'large' || cellSize === 'tall';
  const isCompact = hasAnySelection && !isSelected;
  const hasKeepsakeImage = !!mage.keepsake.imagePath;

  useEffect(() => { setShowLore(false); }, [isSelected]);

  useEffect(() => { setImgError(false); }, [mage.id]);

  return (
    <div style={{
      gridColumn, gridRow, position: 'relative',
      zIndex: isSelected ? 4 : hovered ? 3 : 1,
      animation: fadeIn ? `bentoCardReveal 600ms cubic-bezier(0.25,0.46,0.45,0.94) ${index * 80}ms both` : 'none',
    }}>
      <button
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="block w-full h-full cursor-pointer focus:outline-none rounded-lg overflow-hidden"
        style={{
          position: 'relative',
          border: isSelected ? `2px solid ${mage.color}` : hovered ? '2px solid rgba(212,175,55,0.35)' : '2px solid rgba(255,255,255,0.04)',
          boxShadow: isSelected
            ? `0 0 40px ${mage.color}30, 0 0 80px ${mage.color}10, 0 8px 32px rgba(0,0,0,0.6), inset 0 0 60px ${mage.color}08`
            : hovered ? '0 0 20px rgba(212,175,55,0.08), 0 4px 16px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.3)',
          transition: 'border 280ms ease, box-shadow 380ms ease, transform 400ms cubic-bezier(0.25,0.46,0.45,0.94)',
          transform: isSelected ? 'scale(1.01)' : hovered ? 'scale(1.008)' : 'scale(1)',
          transformOrigin: 'center center',
          background: '#08081a',
        }}
      >
        {/* Portrait */}
        {!imgError ? (
          <img src={mage.imagePath} alt={mage.name} onError={() => setImgError(true)}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              transition: 'transform 550ms cubic-bezier(0.25,0.46,0.45,0.94), filter 400ms ease',
              transform: active ? 'scale(1.06)' : 'scale(1)',
              filter: isCompact ? 'brightness(0.38) saturate(0.45)' : !active ? 'brightness(0.5) saturate(0.65)' : 'brightness(1) saturate(1)',
            }}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 40% 25%, ${mage.color}28, ${mage.emissiveColor}10, #08081a 80%)` }} />
        )}

        {/* Overlays */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(135deg, ${mage.color}06 0%, transparent 50%, ${mage.emissiveColor}04 100%)`, mixBlendMode: 'screen' }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: isSelected
            ? 'linear-gradient(to top, rgba(5,5,16,0.99) 0%, rgba(5,5,16,0.94) 40%, rgba(5,5,16,0.5) 62%, transparent 80%)'
            : 'linear-gradient(to top, rgba(5,5,16,0.95) 0%, rgba(5,5,16,0.3) 20%, transparent 48%)',
        }} />
        {isSelected && (
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to right, rgba(5,5,16,0.7) 0%, rgba(5,5,16,0.3) 40%, transparent 65%)' }} />
        )}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(5,5,16,0.3) 0%, transparent 18%)' }} />

        {isSelected && (
          <>
            <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: `inset 0 0 50px ${mage.color}10, inset 0 -30px 40px ${mage.color}06` }} />
            <div className="absolute inset-0 pointer-events-none rounded-lg" style={{ border: `1px solid ${mage.color}35`, animation: 'borderPulse 3s ease-in-out infinite', margin: '-1px' }} />
            <CornerMarks color={mage.color} />
          </>
        )}

        {/* ── Content ── */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col justify-end text-left"
          style={{ padding: isSelected ? 'clamp(28px, 3.5vw, 48px) clamp(18px, 2.4vw, 32px) clamp(28px, 3.5vw, 48px) clamp(32px, 4vw, 56px)' : isLargeish ? 'clamp(14px, 1.5vw, 22px)' : 'clamp(10px, 1vw, 16px)' }}
        >
          {/* ── Unselected view ── */}
          {!isSelected && (
            <>
              <h2 className="font-display" style={{
                fontSize: isLargeish ? 'clamp(1.05rem, 1.7vw, 1.5rem)' : isCompact ? 'clamp(0.7rem, 0.95vw, 0.88rem)' : 'clamp(0.85rem, 1.2vw, 1.1rem)',
                color: active ? '#d4af37' : 'rgba(212,175,55,0.65)',
                textShadow: '0 2px 4px rgba(0,0,0,0.7)',
                lineHeight: 1.2, letterSpacing: '0.06em', margin: 0,
              }}>{mage.name}</h2>
              <p className="font-display uppercase" style={{
                fontSize: isCompact ? 'clamp(0.32rem, 0.42vw, 0.38rem)' : isLargeish ? 'clamp(0.48rem, 0.7vw, 0.64rem)' : 'clamp(0.4rem, 0.55vw, 0.5rem)',
                color: 'rgba(255,255,255,0.22)', letterSpacing: '0.2em', lineHeight: 1.3, marginTop: '2px',
              }}>{mage.title}</p>
              {hovered && !isCompact && (
                <div className="flex flex-wrap gap-1 mt-1.5" style={{ animation: 'bentoContentIn 200ms ease forwards' }}>
                  {mage.personality.slice(0, isLargeish ? 3 : 2).map((t) => (
                    <span key={t} className="rounded-sm font-mono" style={{ fontSize: 'clamp(0.36rem, 0.46vw, 0.42rem)', padding: '1px 5px', color: 'rgba(255,255,255,0.32)', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Selected: Netflix hero style ── */}
          {isSelected && (
            <div style={{ animation: 'bentoContentIn 350ms ease forwards', display: 'flex', flexDirection: 'column', minHeight: 0, maxWidth: '65%' }}>
              {/* Category label */}
              <span className="font-mono uppercase" style={{
                fontSize: 'clamp(0.5rem, 0.68vw, 0.62rem)',
                color: `${mage.color}90`, letterSpacing: '0.3em',
                marginBottom: '4px',
              }}>
                {mage.affinity}
              </span>

              {/* Name — hero title */}
              <h2 className="font-display" style={{
                fontSize: 'clamp(2rem, 3.6vw, 3.2rem)',
                color: '#ffffff',
                textShadow: `0 0 40px ${mage.color}50, 0 2px 8px rgba(0,0,0,0.9)`,
                lineHeight: 1.05, letterSpacing: '0.02em', margin: 0,
                fontWeight: 700,
              }}>
                {mage.name}
              </h2>

              {/* Metadata row — title · traits */}
              <div className="flex items-center flex-wrap gap-x-2.5" style={{ marginTop: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: 'clamp(0.72rem, 0.95vw, 0.88rem)', color: 'rgba(255,255,255,0.55)' }}>
                  {mage.title}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
                {mage.personality.slice(0, 3).map((t, i) => (
                  <React.Fragment key={t}>
                    {i > 0 && <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>}
                    <span style={{ fontSize: 'clamp(0.68rem, 0.9vw, 0.84rem)', color: 'rgba(255,255,255,0.45)' }}>{t}</span>
                  </React.Fragment>
                ))}
              </div>

              {/* Greeting — tagline */}
              <p style={{
                fontStyle: 'italic',
                fontSize: 'clamp(0.82rem, 1.1vw, 1rem)',
                color: 'rgba(255,255,255,0.6)',
                lineHeight: 1.5, marginBottom: '14px', maxWidth: '52ch',
              }}>
                {mage.greeting}
              </p>

              {/* ── Keepsake section ── */}
              <div style={{ marginBottom: '14px', flexShrink: 0 }}>
                {/* Keepsake details */}
                <div className="flex-1 min-w-0">
                  <span className="font-mono uppercase tracking-widest block" style={{
                    fontSize: 'clamp(0.58rem, 0.76vw, 0.7rem)', color: 'rgba(255,255,255,0.3)',
                    letterSpacing: '0.25em', marginBottom: '6px',
                  }}>Keepsake</span>

                  <span className="font-display tracking-wide block" style={{
                    fontSize: 'clamp(1.1rem, 1.5vw, 1.4rem)', color: mage.color, lineHeight: 1.2,
                    marginBottom: '8px',
                  }}>{mage.keepsake.name}</span>

                  <p style={{
                    fontSize: 'clamp(0.82rem, 1.08vw, 1rem)',
                    color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, maxWidth: '48ch', marginBottom: '6px',
                  }}>{mage.keepsake.description}</p>

                  {mage.keepsake.flavorText && (
                    <p style={{
                      fontStyle: 'italic',
                      fontSize: 'clamp(0.7rem, 0.9vw, 0.84rem)',
                      color: `${mage.color}55`, lineHeight: 1.5, maxWidth: '48ch', marginBottom: '6px',
                    }}>{mage.keepsake.flavorText}</p>
                  )}

                  <span className="font-mono" style={{
                    fontSize: 'clamp(0.6rem, 0.78vw, 0.72rem)', color: 'rgba(255,255,255,0.3)',
                  }}>{mage.keepsake.cooldownSeconds}s cooldown · {mage.keepsake.abilityType}</span>

                  {/* Trial info */}
                  <div style={{
                    marginTop: '14px', padding: 'clamp(12px, 1.4vw, 18px)',
                    backgroundColor: `${mage.color}0a`, border: `1px solid ${mage.color}18`,
                    borderRadius: '8px',
                  }}>
                    <span className="font-mono uppercase tracking-widest block" style={{
                      fontSize: 'clamp(0.5rem, 0.65vw, 0.58rem)', color: 'rgba(255,255,255,0.25)',
                      letterSpacing: '0.25em', marginBottom: '6px',
                    }}>Quest</span>
                    <div className="flex items-center gap-2.5" style={{ marginBottom: '6px' }}>
                      <span style={{ fontSize: 'clamp(0.9rem, 1.15vw, 1.05rem)' }}>🔒</span>
                      <span className="font-display" style={{
                        fontSize: 'clamp(0.88rem, 1.15vw, 1.05rem)', color: `${mage.color}cc`,
                      }}>{mage.keepsake.trial.name}</span>
                    </div>
                    <p style={{
                      fontSize: 'clamp(0.76rem, 0.98vw, 0.9rem)',
                      color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginBottom: '4px',
                    }}>{mage.keepsake.trial.description}</p>
                    <p style={{
                      fontStyle: 'italic',
                      fontSize: 'clamp(0.66rem, 0.86vw, 0.8rem)',
                      color: `${mage.color}50`, lineHeight: 1.45,
                    }}>{mage.keepsake.trial.flavorText}</p>
                  </div>
                </div>
              </div>

              {/* ── Action buttons — side by side ── */}
              <div className="flex items-center gap-3" style={{ flexShrink: 0 }}>
                <PledgeButton mage={mage} onClick={onConfirm} />

                {/* Lore button */}
                <div role="button" tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); setShowLore(!showLore); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setShowLore(!showLore); } }}
                  className="flex items-center gap-2 rounded-md cursor-pointer transition-all duration-300"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: showLore ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgba(255,255,255,0.6)', flexShrink: 0 }}>
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                  <span className="font-display" style={{
                    fontSize: 'clamp(0.78rem, 1.05vw, 0.95rem)',
                    color: 'rgba(255,255,255,0.7)', lineHeight: 1.3, whiteSpace: 'nowrap',
                  }}>Lore</span>
                </div>
              </div>

              {/* ── Backstory overlay ── */}
              {showLore && (
                <div className="mage-scroll" style={{
                  marginTop: '12px',
                  maxHeight: 'clamp(120px, 18vh, 220px)',
                  overflowY: 'auto',
                  padding: 'clamp(12px, 1.4vw, 18px)',
                  backgroundColor: 'rgba(5,5,16,0.7)',
                  border: `1px solid ${mage.color}15`,
                  borderRadius: '8px',
                  backdropFilter: 'blur(8px)',
                  animation: 'bentoContentIn 250ms ease forwards',
                  maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
                }}>
                  <p style={{
                    fontSize: 'clamp(0.72rem, 0.94vw, 0.86rem)',
                    color: 'rgba(255,255,255,0.5)',
                    lineHeight: 1.7,
                    maxWidth: '58ch',
                  }}>
                    {mage.backstory}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </button>

    </div>
  );
}

/* ─── Corner Marks ─── */
function CornerMarks({ color }: { color: string }) {
  const s: React.CSSProperties = { position: 'absolute', width: '14px', height: '14px', pointerEvents: 'none', opacity: 0.45 };
  const line = `2px solid ${color}45`;
  return (
    <>
      <div style={{ ...s, top: 4, left: 4, borderTop: line, borderLeft: line }} />
      <div style={{ ...s, top: 4, right: 4, borderTop: line, borderRight: line }} />
      <div style={{ ...s, bottom: 4, left: 4, borderBottom: line, borderLeft: line }} />
      <div style={{ ...s, bottom: 4, right: 4, borderBottom: line, borderRight: line }} />
    </>
  );
}

/* ─── Pledge Button ─── */
function PledgeButton({ mage, onClick }: { mage: MageDefinition; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div role="button" tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onClick(); } }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-2.5 rounded-md cursor-pointer transition-all duration-300"
      style={{
        padding: '10px 22px',
        backgroundColor: hovered ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.12)',
        border: 'none',
        backdropFilter: 'blur(8px)',
        transform: hovered ? 'scale(1.03)' : 'scale(1)',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'white', flexShrink: 0 }}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
      <span className="font-display" style={{
        fontSize: 'clamp(0.78rem, 1.05vw, 0.95rem)',
        color: '#ffffff',
        lineHeight: 1.3, whiteSpace: 'nowrap',
      }}>Pledge Allegiance</span>
    </div>
  );
}
