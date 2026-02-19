import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useAudioStore } from '@/stores/audioStore';

export function StartScreen() {
  const setPhase = useGameStore((state) => state.setPhase);
  const startNewRun = useGameStore((state) => state.startNewRun);
  const playMusic = useAudioStore((state) => state.playMusic);
  const stopMusic = useAudioStore((state) => state.stopMusic);
  const [fadeOut, setFadeOut] = useState(false);
  const musicStarted = useRef(false);

  const startMusic = useCallback(() => {
    if (!musicStarted.current) {
      musicStarted.current = true;
      playMusic('/assets/sounds/mages_start.mp3', true);
    }
  }, [playMusic]);

  useEffect(() => {
    return () => {
      stopMusic();
    };
  }, [stopMusic]);

  // Start music on any user interaction (click, key, touch)
  useEffect(() => {
    const handler = () => startMusic();
    window.addEventListener('click', handler, { once: true });
    window.addEventListener('keydown', handler, { once: true });
    window.addEventListener('touchstart', handler, { once: true });
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('keydown', handler);
      window.removeEventListener('touchstart', handler);
    };
  }, [startMusic]);

  const handlePlay = () => {
    setFadeOut(true);
    setTimeout(() => {
      stopMusic();
      startNewRun();
    }, 600);
  };

  const handleGrimoire = () => {
    setFadeOut(true);
    setTimeout(() => {
      stopMusic();
      setPhase('grimoire');
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-end overflow-hidden select-none"
    >
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700"
        style={{
          backgroundImage: "url('/assets/images/mages_start.png')",
          opacity: fadeOut ? 0 : 1,
        }}
      />

      {/* Gradient overlay for readability */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          background: 'linear-gradient(to top, rgba(5,5,16,0.95) 0%, rgba(5,5,16,0.6) 30%, rgba(5,5,16,0.1) 55%, transparent 70%)',
          opacity: fadeOut ? 0 : 1,
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 150px 60px rgba(5,5,16,0.8)',
        }}
      />

      {/* Mute button */}
      <MuteButton />

      {/* Content container */}
      <div
        className="relative z-10 flex flex-col items-center pb-[8vh] transition-all duration-700"
        style={{
          opacity: fadeOut ? 0 : 1,
          transform: fadeOut ? 'translateY(30px)' : 'translateY(0)',
        }}
      >
        {/* Title */}
        <h1
          className="font-display text-center mb-2 tracking-wider"
          style={{
            fontSize: 'clamp(2.5rem, 6vw, 5rem)',
            color: '#d4af37',
            textShadow: '0 0 40px rgba(212,175,55,0.4), 0 2px 8px rgba(0,0,0,0.8)',
            letterSpacing: '0.12em',
          }}
        >
          When Things Attack
        </h1>

        {/* Subtitle */}
        <p
          className="font-display text-center mb-12 tracking-widest uppercase"
          style={{
            fontSize: 'clamp(0.7rem, 1.2vw, 1rem)',
            color: 'rgba(212,175,55,0.5)',
            letterSpacing: '0.3em',
          }}
        >
          A Grimoire of Curious Weapons
        </p>

        {/* Buttons */}
        <div className="flex gap-6">
          <StartButton
            label="Play"
            sublabel="Enter the Arena"
            onClick={handlePlay}
            primary
          />
          <StartButton
            label="Grimoire"
            sublabel="Browse Pages"
            onClick={handleGrimoire}
          />
        </div>
      </div>

      {/* Fade-out overlay */}
      {fadeOut && (
        <div
          className="absolute inset-0 z-20 pointer-events-none"
          style={{
            backgroundColor: '#050510',
            animation: 'fadeIn 600ms ease-out forwards',
          }}
        />
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function MuteButton() {
  const isMuted = useAudioStore((state) => state.isMuted);
  const toggleMute = useAudioStore((state) => state.toggleMute);

  return (
    <button
      onClick={(e) => { e.stopPropagation(); toggleMute(); }}
      className="absolute top-4 right-4 z-30 flex items-center justify-center rounded-full cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95"
      style={{
        width: '36px',
        height: '36px',
        backgroundColor: 'rgba(5,5,16,0.6)',
        border: '1px solid rgba(212,175,55,0.2)',
        backdropFilter: 'blur(4px)',
        color: isMuted ? 'rgba(255,255,255,0.35)' : 'rgba(212,175,55,0.7)',
      }}
      title={isMuted ? 'Unmute' : 'Mute'}
    >
      <span style={{ fontSize: '16px', lineHeight: 1 }}>{isMuted ? '🔇' : '🔊'}</span>
    </button>
  );
}

function StartButton({
  label,
  sublabel,
  onClick,
  primary = false,
}: {
  label: string;
  sublabel: string;
  onClick: () => void;
  primary?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative group cursor-pointer focus:outline-none"
      style={{
        minWidth: '180px',
      }}
    >
      {/* Button background */}
      <div
        className="rounded-lg border px-8 py-4 transition-all duration-300"
        style={{
          backgroundColor: hovered
            ? primary
              ? 'rgba(212,175,55,0.15)'
              : 'rgba(74,44,106,0.25)'
            : 'rgba(5,5,16,0.7)',
          borderColor: hovered
            ? primary
              ? 'rgba(212,175,55,0.6)'
              : 'rgba(107,77,138,0.6)'
            : 'rgba(212,175,55,0.2)',
          boxShadow: hovered
            ? primary
              ? '0 0 30px rgba(212,175,55,0.2), inset 0 0 20px rgba(212,175,55,0.05)'
              : '0 0 30px rgba(107,77,138,0.2), inset 0 0 20px rgba(107,77,138,0.05)'
            : 'none',
          backdropFilter: 'blur(8px)',
          transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        }}
      >
        <div
          className="font-display text-center tracking-wider"
          style={{
            fontSize: 'clamp(1.1rem, 2vw, 1.5rem)',
            color: hovered
              ? primary
                ? '#e8c555'
                : '#b89ddb'
              : primary
                ? '#d4af37'
                : 'rgba(255,255,255,0.7)',
            textShadow: hovered
              ? primary
                ? '0 0 12px rgba(212,175,55,0.4)'
                : '0 0 12px rgba(107,77,138,0.4)'
              : 'none',
          }}
        >
          {label}
        </div>
        <div
          className="text-center mt-1 transition-opacity duration-300"
          style={{
            fontSize: 'clamp(0.6rem, 0.9vw, 0.75rem)',
            color: hovered ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)',
            letterSpacing: '0.15em',
          }}
        >
          {sublabel}
        </div>
      </div>
    </button>
  );
}
