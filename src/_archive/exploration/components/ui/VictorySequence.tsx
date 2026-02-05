/**
 * VictorySequence - Displayed after defeating The Archivist
 * Shows page acquisition montage and vertical slice completion
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AcquiredPage {
  type: 'character' | 'construct' | 'lore';
  title: string;
  description: string;
}

const ACQUIRED_PAGES: AcquiredPage[] = [
  {
    type: 'character',
    title: 'The Unknown Scholar',
    description: 'The former owner of this office. Their legacy lives on in their final creation.',
  },
  {
    type: 'construct',
    title: 'The Archivist',
    description: 'A guardian made of ink and memory. Now it serves you.',
  },
  {
    type: 'lore',
    title: 'A Duty Fulfilled',
    description: 'After years of waiting, the guardian has found a worthy successor.',
  },
];

interface VictorySequenceProps {
  isActive: boolean;
  onComplete?: () => void;
}

export function VictorySequence({ isActive, onComplete }: VictorySequenceProps) {
  const [phase, setPhase] = useState<'dialogue' | 'pages' | 'grimoire' | 'title' | 'credits' | 'done'>('dialogue');
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  
  useEffect(() => {
    if (!isActive) {
      setPhase('dialogue');
      setCurrentPageIndex(0);
      return;
    }
    
    // Auto-advance through phases
    const timers: NodeJS.Timeout[] = [];
    
    // Phase 1: Dialogue (3s)
    timers.push(setTimeout(() => setPhase('pages'), 3000));
    
    // Phase 2: Pages (6s total, 2s per page)
    timers.push(setTimeout(() => setCurrentPageIndex(1), 5000));
    timers.push(setTimeout(() => setCurrentPageIndex(2), 7000));
    timers.push(setTimeout(() => setPhase('grimoire'), 9000));
    
    // Phase 3: Grimoire message (3s)
    timers.push(setTimeout(() => setPhase('title'), 12000));
    
    // Phase 4: Title card (3s)
    timers.push(setTimeout(() => setPhase('credits'), 15000));
    
    return () => timers.forEach(t => clearTimeout(t));
  }, [isActive]);
  
  if (!isActive) return null;
  
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] bg-black pointer-events-auto">
        {/* Phase 1: Archivist dialogue */}
        {phase === 'dialogue' && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.p
              className="text-amber-200/80 text-xl md:text-2xl font-serif italic text-center max-w-lg px-8"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              "You... will continue their work. Take it. Remember... us."
            </motion.p>
          </motion.div>
        )}
        
        {/* Phase 2: Page acquisition montage */}
        {phase === 'pages' && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PageAcquisition page={ACQUIRED_PAGES[currentPageIndex]} index={currentPageIndex} />
          </motion.div>
        )}
        
        {/* Phase 3: Grimoire message */}
        {phase === 'grimoire' && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Grimoire icon */}
            <motion.div
              className="w-24 h-32 bg-gradient-to-b from-purple-900 to-purple-950 
                       rounded-sm border-2 border-amber-600/50 shadow-lg shadow-purple-500/30
                       flex items-center justify-center mb-8"
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <div className="text-amber-500 text-4xl">📖</div>
            </motion.div>
            
            <motion.p
              className="text-amber-100 text-lg md:text-xl text-center max-w-md px-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              Your Grimoire awaits its first true entries.
            </motion.p>
          </motion.div>
        )}
        
        {/* Phase 4: Title card */}
        {phase === 'title' && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.h1
              className="text-4xl md:text-6xl font-bold text-amber-200 tracking-wide"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 150 }}
            >
              End of Vertical Slice
            </motion.h1>
            
            <motion.p
              className="text-gray-400 text-lg mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Thank you for playing
            </motion.p>
          </motion.div>
        )}
        
        {/* Phase 5: Credits tease */}
        {phase === 'credits' && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.h1
              className="text-3xl md:text-5xl font-bold text-amber-200 tracking-wide mb-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              When Things Attack
            </motion.h1>
            
            {/* Letter slides under door tease */}
            <motion.div
              className="mt-8 text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              <p className="text-gray-500 text-sm italic">
                A wax-sealed letter slides under the office door...
              </p>
              <p className="text-amber-600/60 text-xs mt-2">
                To be continued...
              </p>
            </motion.div>
            
            {/* Play again button */}
            <motion.button
              className="mt-16 px-8 py-3 bg-amber-900/50 hover:bg-amber-800/60 
                       text-amber-200 rounded-lg border border-amber-700/50
                       transition-all duration-200 hover:scale-105"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              onClick={onComplete}
            >
              Play Again
            </motion.button>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
}

/**
 * Page acquisition card animation
 */
function PageAcquisition({ page, index }: { page: AcquiredPage; index: number }) {
  const typeColors = {
    character: { bg: 'from-blue-900', border: 'border-blue-500', icon: '👤' },
    construct: { bg: 'from-purple-900', border: 'border-purple-500', icon: '⚔️' },
    lore: { bg: 'from-amber-900', border: 'border-amber-500', icon: '📖' },
  };
  
  const colors = typeColors[page.type];
  
  return (
    <motion.div
      key={index}
      className={`
        w-72 md:w-80 p-6 rounded-lg
        bg-gradient-to-b ${colors.bg} to-gray-900
        border ${colors.border}/50
        shadow-xl
      `}
      initial={{ scale: 0.5, opacity: 0, rotateY: -30 }}
      animate={{ scale: 1, opacity: 1, rotateY: 0 }}
      exit={{ scale: 0.8, opacity: 0, x: 100 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{colors.icon}</span>
        <span className="text-xs uppercase tracking-widest text-gray-400">
          {page.type} Page
        </span>
      </div>
      
      {/* Title */}
      <h3 className="text-xl font-semibold text-white mb-2">
        {page.title}
      </h3>
      
      {/* Description */}
      <p className="text-gray-300 text-sm leading-relaxed">
        {page.description}
      </p>
      
      {/* "Added to Grimoire" badge */}
      <motion.div
        className="mt-4 pt-4 border-t border-gray-700/50 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <span className="text-amber-400 text-xs uppercase tracking-wider">
          ✨ Added to Grimoire ✨
        </span>
      </motion.div>
    </motion.div>
  );
}

export default VictorySequence;
