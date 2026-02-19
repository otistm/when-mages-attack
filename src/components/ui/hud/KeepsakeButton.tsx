import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/stores/gameStore';

export function KeepsakeButton() {
  const selectedMage = useGameStore((state) => state.selectedMage);
  const keepsakeReady = useGameStore((state) => state.keepsakeReady);
  const keepsakeUnlocked = useGameStore((state) => state.keepsakeUnlocked);
  const trialProgress = useGameStore((state) => state.keepsakeTrialProgress);
  const cooldownRemaining = useGameStore((state) => state.keepsakeCooldownRemaining);
  const activateKeepsake = useGameStore((state) => state.activateKeepsake);
  const phase = useGameStore((state) => state.phase);

  const [justUnlocked, setJustUnlocked] = useState(false);
  const [justActivated, setJustActivated] = useState(false);
  const wasUnlocked = useRef(false);
  const activationCount = useRef(0);

  useEffect(() => {
    if (keepsakeUnlocked && !wasUnlocked.current) {
      setJustUnlocked(true);
      const t = setTimeout(() => setJustUnlocked(false), 3000);
      return () => clearTimeout(t);
    }
    wasUnlocked.current = keepsakeUnlocked;
  }, [keepsakeUnlocked]);

  const fireActivation = useCallback(() => {
    activateKeepsake();
    activationCount.current += 1;
    setJustActivated(true);
    const t = setTimeout(() => setJustActivated(false), 800);
    return () => clearTimeout(t);
  }, [activateKeepsake]);

  useEffect(() => {
    if (phase !== 'combat' || !keepsakeUnlocked || !keepsakeReady) return;
    const delay = activationCount.current === 0 ? 600 : 300;
    const t = setTimeout(fireActivation, delay);
    return () => clearTimeout(t);
  }, [keepsakeReady, keepsakeUnlocked, phase, fireActivation]);

  if (!selectedMage || phase !== 'combat') return null;

  const { keepsake } = selectedMage;
  const { trial } = keepsake;
  const cooldownTotal = keepsake.cooldownSeconds;
  const cooldownFraction = cooldownTotal > 0
    ? Math.max(0, cooldownRemaining / cooldownTotal)
    : 0;

  const circumference = 2 * Math.PI * 22;
  const isLocked = !keepsakeUnlocked;
  const progressFraction = trial.targetCount > 0
    ? Math.min(1, trialProgress / trial.targetCount)
    : 0;

  return (
    <div
      className="relative flex items-center gap-3 transition-all duration-300 group"
      style={{
        opacity: 1,
      }}
    >
      {/* Icon circle */}
      <div className="relative shrink-0" style={{ width: '52px', height: '52px' }}>
        <svg className="absolute inset-0" width="52" height="52" viewBox="0 0 52 52">
          <circle
            cx="26" cy="26" r="22"
            fill="rgba(5,5,16,0.7)"
            stroke={isLocked ? 'rgba(255,255,255,0.08)' : justActivated ? selectedMage.color : keepsakeReady ? `${selectedMage.color}60` : 'rgba(255,255,255,0.1)'}
            strokeWidth="2.5"
          />

          {isLocked && (
            <circle
              cx="26" cy="26" r="22"
              fill="none"
              stroke={`${selectedMage.color}80`}
              strokeWidth="2.5"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progressFraction)}
              strokeLinecap="round"
              transform="rotate(-90 26 26)"
              style={{ transition: 'stroke-dashoffset 0.4s ease-out' }}
            />
          )}

          {!isLocked && !keepsakeReady && (
            <circle
              cx="26" cy="26" r="22"
              fill="none"
              stroke={selectedMage.color}
              strokeWidth="2.5"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - cooldownFraction)}
              strokeLinecap="round"
              transform="rotate(-90 26 26)"
              style={{ transition: 'stroke-dashoffset 0.1s linear' }}
            />
          )}
        </svg>

        <div className="absolute inset-0 flex items-center justify-center" style={{
          fontSize: '1.4rem',
          transform: justActivated ? 'scale(1.3)' : 'scale(1)',
          transition: 'transform 0.15s ease-out',
        }}>
          {isLocked ? '🔒' : keepsake.iconEmoji}
        </div>

        {justActivated && (
          <div className="absolute inset-0 rounded-full" style={{
            boxShadow: `0 0 20px ${selectedMage.color}aa, 0 0 40px ${selectedMage.color}60`,
            animation: 'keepsake-activate-burst 800ms ease-out forwards',
          }} />
        )}
      </div>

      {/* Text beside icon */}
      <div className="flex flex-col justify-center min-w-0">
        {isLocked ? (
          <div className="flex items-center gap-3" style={{ whiteSpace: 'nowrap' }}>
            <span className="font-display tracking-wide" style={{
              fontSize: 'clamp(0.8rem, 1.1vw, 1rem)',
              color: 'rgba(255,255,255,0.4)',
            }}>
              {trial.name}
            </span>
            <div style={{ width: '1px', height: '1em', backgroundColor: 'rgba(255,255,255,0.15)' }} />
            <span className="font-display tracking-wide" style={{
              fontSize: 'clamp(0.8rem, 1.1vw, 1rem)',
              color: 'rgba(255,255,255,0.25)',
            }}>
              {trial.description} — <span style={{ color: `${selectedMage.color}aa` }}>{trialProgress}/{trial.targetCount}</span>
            </span>
          </div>
        ) : (
          <>
            <div className="font-display tracking-wide" style={{
              fontSize: 'clamp(0.9rem, 1.2vw, 1.1rem)',
              color: justActivated ? '#ffffff' : keepsakeReady ? selectedMage.color : 'rgba(255,255,255,0.5)',
              textShadow: justActivated
                ? `0 0 12px ${selectedMage.color}cc`
                : keepsakeReady
                  ? `0 0 8px ${selectedMage.color}40`
                  : 'none',
              transition: 'color 0.3s, text-shadow 0.3s',
              lineHeight: 1.2,
            }}>
              {keepsake.name}
            </div>
            {!keepsakeReady && (
              <div className="font-mono" style={{
                fontSize: 'clamp(0.6rem, 0.8vw, 0.75rem)',
                color: 'rgba(255,255,255,0.35)',
                marginTop: '2px',
              }}>
                {Math.ceil(cooldownRemaining)}s
              </div>
            )}
          </>
        )}
      </div>

      {/* Keepsake tooltip on hover */}
      <div
        className="absolute left-0 bottom-full mb-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200"
        style={{
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
          <span style={{ fontSize: '1.2rem' }}>{keepsake.iconEmoji}</span>
          <span className="font-display font-bold" style={{
            fontSize: 'clamp(0.8rem, 1vw, 0.95rem)',
            color: selectedMage.color,
          }}>
            {keepsake.name}
          </span>
        </div>
        <p style={{
          fontSize: 'clamp(0.65rem, 0.85vw, 0.8rem)',
          color: 'rgba(255,255,255,0.6)',
          lineHeight: 1.5,
          marginBottom: '8px',
        }}>
          {keepsake.description}
        </p>
        <div className="flex items-center gap-3 font-mono" style={{
          fontSize: 'clamp(0.55rem, 0.7vw, 0.7rem)',
          color: 'rgba(255,255,255,0.3)',
        }}>
          <span>{keepsake.cooldownSeconds}s cooldown</span>
          <span>·</span>
          <span style={{ color: `${selectedMage.color}88` }}>{keepsake.abilityType}</span>
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
            {keepsake.flavorText}
          </p>
        </div>
      </div>

      {/* ── Unlock notification (center-screen only) ── */}
      {justUnlocked && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 200 }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            animation: 'keepsake-unlock-banner 3s ease-out forwards',
          }}>
            <div style={{
              fontSize: '3rem',
              filter: `drop-shadow(0 0 20px ${selectedMage.color})`,
              animation: 'keepsake-icon-spin 3s ease-out forwards',
            }}>
              {keepsake.iconEmoji}
            </div>
            <div className="font-display tracking-widest uppercase" style={{
              fontSize: 'clamp(1.2rem, 2.5vw, 2rem)',
              color: selectedMage.color,
              textShadow: `0 0 20px ${selectedMage.color}cc, 0 0 40px ${selectedMage.color}60, 0 4px 8px rgba(0,0,0,0.9)`,
              letterSpacing: '0.15em',
            }}>
              Keepsake Awakened
            </div>
            <div className="font-display" style={{
              fontSize: 'clamp(0.85rem, 1.4vw, 1.2rem)',
              color: 'rgba(255,255,255,0.8)',
              textShadow: '0 2px 6px rgba(0,0,0,0.9)',
            }}>
              {keepsake.name}
            </div>
            <div className="font-mono" style={{
              fontSize: 'clamp(0.6rem, 0.9vw, 0.8rem)',
              color: 'rgba(255,255,255,0.4)',
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
              maxWidth: '300px',
              textAlign: 'center',
            }}>
              {keepsake.description}
            </div>
            <div className="font-mono" style={{
              fontSize: 'clamp(0.5rem, 0.7vw, 0.65rem)',
              color: `${selectedMage.color}88`,
              marginTop: '4px',
            }}>
              activates automatically every {keepsake.cooldownSeconds}s
            </div>
          </div>
        </div>
      )}

      {justUnlocked && (
        <div className="fixed inset-0 pointer-events-none" style={{
          backgroundColor: `${selectedMage.color}25`,
          animation: 'keepsake-screen-flash 600ms ease-out forwards',
          zIndex: 150,
        }} />
      )}

      {justUnlocked && (
        <div className="fixed inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse at center, transparent 30%, ${selectedMage.color}15 70%, ${selectedMage.color}30 100%)`,
          animation: 'keepsake-unlock-vignette 3s ease-out forwards',
          zIndex: 149,
        }} />
      )}

      <style>{`
        @keyframes keepsake-activate-burst {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.5); }
          100% { opacity: 0; transform: scale(2); }
        }
        @keyframes keepsake-unlock-banner {
          0% { opacity: 0; transform: scale(0.8) translateY(20px); }
          10% { opacity: 1; transform: scale(1.05) translateY(0); }
          15% { transform: scale(1) translateY(0); }
          75% { opacity: 1; transform: scale(1) translateY(0); }
          100% { opacity: 0; transform: scale(0.95) translateY(-10px); }
        }
        @keyframes keepsake-icon-spin {
          0% { transform: scale(0.5) rotateY(0deg); opacity: 0; }
          15% { transform: scale(1.2) rotateY(360deg); opacity: 1; }
          25% { transform: scale(1) rotateY(360deg); }
          100% { transform: scale(1) rotateY(360deg); opacity: 1; }
        }
        @keyframes keepsake-screen-flash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes keepsake-unlock-vignette {
          0% { opacity: 0; }
          10% { opacity: 1; }
          75% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
