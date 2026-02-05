/**
 * DeathSequence - Fire death overlay and respawn UI
 * Triggered when player opens grimoire case without disarming trap
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePuzzleStore } from '@/stores/puzzleStore';

// Death text variations for replayability
const DEATH_TEXTS = [
  "The owner was nothing if not thorough.",
  "Perhaps try reading the journal first.",
  "The Grimoire remains where it belongs. For now.",
  "Even in death, they protect what's theirs.",
  "Impatience is rarely rewarded in matters of magic.",
];

interface DeathSequenceProps {
  isActive: boolean;
  onRespawn: () => void;
}

export function DeathSequence({ isActive, onRespawn }: DeathSequenceProps) {
  const [phase, setPhase] = useState<'fire' | 'fade' | 'text' | 'done'>('fire');
  const [deathText, setDeathText] = useState('');
  const deathCount = usePuzzleStore(s => s.deathCount);
  const hintText = usePuzzleStore(s => s.getHintText());
  
  // Reset and start sequence when activated
  useEffect(() => {
    if (isActive) {
      // Pick a random death text
      setDeathText(DEATH_TEXTS[Math.floor(Math.random() * DEATH_TEXTS.length)]);
      setPhase('fire');
      
      // Sequence timing
      const fireTimer = setTimeout(() => setPhase('fade'), 2000);
      const textTimer = setTimeout(() => setPhase('text'), 3000);
      
      return () => {
        clearTimeout(fireTimer);
        clearTimeout(textTimer);
      };
    } else {
      setPhase('done');
    }
  }, [isActive]);
  
  const handleContinue = useCallback(() => {
    setPhase('done');
    onRespawn();
  }, [onRespawn]);
  
  if (!isActive && phase === 'done') return null;
  
  return (
    <AnimatePresence>
      {isActive && (
        <div className="fixed inset-0 z-[100] pointer-events-auto">
          {/* Fire effect overlay */}
          {phase === 'fire' && (
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <FireOverlay />
            </motion.div>
          )}
          
          {/* Fade to black */}
          <motion.div
            className="absolute inset-0 bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'fire' ? 0.3 : 1 }}
            transition={{ duration: phase === 'fade' ? 1 : 0.5 }}
          />
          
          {/* Death text and continue prompt */}
          {(phase === 'text' || phase === 'fade') && (
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === 'text' ? 1 : 0 }}
              transition={{ duration: 0.5, delay: phase === 'text' ? 0 : 0.5 }}
            >
              {/* Death quote */}
              <motion.p
                className="text-amber-200/90 text-xl md:text-2xl font-serif italic text-center max-w-lg px-8"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                "{deathText}"
              </motion.p>
              
              {/* Hint after multiple deaths */}
              {hintText && (
                <motion.p
                  className="text-gray-400 text-sm mt-6 text-center max-w-md px-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1, duration: 0.5 }}
                >
                  {hintText}
                </motion.p>
              )}
              
              {/* Death count */}
              {deathCount > 1 && (
                <motion.p
                  className="text-gray-600 text-xs mt-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2, duration: 0.3 }}
                >
                  Deaths: {deathCount}
                </motion.p>
              )}
              
              {/* Continue button */}
              <motion.button
                className="mt-10 px-8 py-3 bg-amber-900/50 hover:bg-amber-800/60 
                         text-amber-200 rounded-lg border border-amber-700/50
                         transition-all duration-200 hover:scale-105"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5, duration: 0.3 }}
                onClick={handleContinue}
              >
                Try Again
              </motion.button>
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Fire overlay effect using CSS gradients and animations
 */
function FireOverlay() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base fire gradient */}
      <div 
        className="absolute inset-0 animate-pulse"
        style={{
          background: `
            radial-gradient(ellipse at 50% 100%, 
              rgba(255, 100, 0, 0.9) 0%, 
              rgba(255, 50, 0, 0.7) 30%, 
              rgba(200, 0, 0, 0.5) 60%, 
              transparent 100%
            )
          `,
        }}
      />
      
      {/* Flickering overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 30% 120%, 
              rgba(255, 200, 0, 0.6) 0%, 
              transparent 50%
            )
          `,
          animation: 'flicker 0.15s infinite alternate',
        }}
      />
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 70% 110%, 
              rgba(255, 150, 0, 0.5) 0%, 
              transparent 45%
            )
          `,
          animation: 'flicker 0.12s infinite alternate-reverse',
        }}
      />
      
      {/* Sparks / embers effect */}
      <div className="absolute inset-0">
        {Array.from({ length: 20 }).map((_, i) => (
          <Ember key={i} delay={i * 0.1} />
        ))}
      </div>
      
      {/* Vignette for intensity */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at center, 
              transparent 30%, 
              rgba(100, 0, 0, 0.4) 70%, 
              rgba(50, 0, 0, 0.7) 100%
            )
          `,
        }}
      />
      
      <style>{`
        @keyframes flicker {
          0% { opacity: 0.7; transform: scale(1); }
          100% { opacity: 1; transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
}

/**
 * Individual ember particle
 */
function Ember({ delay }: { delay: number }) {
  const left = Math.random() * 100;
  const size = 2 + Math.random() * 4;
  const duration = 1 + Math.random() * 1;
  
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        left: `${left}%`,
        bottom: '0%',
        width: size,
        height: size,
        background: `radial-gradient(circle, #ffcc00 0%, #ff6600 50%, #ff3300 100%)`,
        boxShadow: '0 0 4px #ff6600',
      }}
      initial={{ y: 0, opacity: 0 }}
      animate={{ 
        y: -window.innerHeight * (0.3 + Math.random() * 0.5),
        x: (Math.random() - 0.5) * 100,
        opacity: [0, 1, 1, 0],
      }}
      transition={{ 
        duration, 
        delay,
        repeat: Infinity,
        ease: 'easeOut',
      }}
    />
  );
}

export default DeathSequence;
