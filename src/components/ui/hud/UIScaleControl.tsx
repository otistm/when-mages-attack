/**
 * UIScaleControl - Floating gear icon that expands to a UI scale slider
 * with layout mode toggle (desktop/handheld).
 * 
 * Allows users to adjust the global UI scale factor (--ui-scale) and
 * switch between desktop and handheld layout modes.
 * 
 * Particularly useful for PC gaming handhelds (ROG Ally, Steam Deck, etc.)
 * where the default scale may be too small on a 7" screen.
 * 
 * Persists preferences to localStorage.
 */

import { useState, useCallback } from 'react';
import { useUIScale } from '@/hooks/useUIScale';
import { useLayoutMode } from '@/hooks/useLayoutMode';

export function UIScaleControl() {
  const { scale, setScale, resetScale, MIN_SCALE, MAX_SCALE, STEP } = useUIScale();
  const { mode, toggleMode } = useLayoutMode();
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setScale(parseFloat(e.target.value));
    },
    [setScale],
  );

  const percentage = Math.round(scale * 100);
  const isHandheld = mode === 'handheld';

  return (
    <div className="fixed z-[200] pointer-events-auto" style={{ bottom: 'var(--space-md)', left: 'var(--space-md)' }}>
      {isOpen ? (
        <div
          className="flex flex-col gap-2 rounded-xl border border-arcane-purple/50 shadow-xl"
          style={{
            backgroundColor: 'rgba(10, 10, 26, 0.95)',
            backdropFilter: 'blur(12px)',
            padding: 'var(--space-sm) var(--space-md)',
          }}
        >
          {/* Top row: close + scale slider */}
          <div className="flex items-center gap-3">
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/60 hover:text-white transition-colors flex items-center justify-center"
              style={{ width: '24px', height: '24px', minWidth: '24px', minHeight: '24px' }}
              aria-label="Close UI settings"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            {/* Label */}
            <span className="text-white/60 text-xs font-mono whitespace-nowrap select-none">UI</span>

            {/* Slider */}
            <input
              type="range"
              min={MIN_SCALE}
              max={MAX_SCALE}
              step={STEP}
              value={scale}
              onChange={handleChange}
              className="w-24 h-1.5 appearance-none rounded-full cursor-pointer"
              style={{
                background: `linear-gradient(to right, #d4af37 0%, #d4af37 ${((scale - MIN_SCALE) / (MAX_SCALE - MIN_SCALE)) * 100}%, #4a2c6a ${((scale - MIN_SCALE) / (MAX_SCALE - MIN_SCALE)) * 100}%, #4a2c6a 100%)`,
              }}
              aria-label="UI Scale"
            />

            {/* Percentage display */}
            <span className="text-arcane-gold text-xs font-mono font-bold whitespace-nowrap select-none" style={{ minWidth: '36px', textAlign: 'right' }}>
              {percentage}%
            </span>

            {/* Reset button */}
            <button
              onClick={resetScale}
              className="text-white/40 hover:text-white transition-colors text-xs font-mono flex items-center justify-center"
              style={{ minWidth: '24px', minHeight: '24px' }}
              aria-label="Reset UI scale"
              title="Reset to auto-detected scale"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1V4.5H4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M1.82 7.5A5 5 0 1 0 2.34 3.5L1 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Bottom row: layout mode toggle */}
          <div className="flex items-center gap-3">
            <span className="text-white/60 text-xs font-mono whitespace-nowrap select-none">Layout</span>

            {/* Layout toggle button */}
            <button
              onClick={toggleMode}
              className={`flex items-center gap-2 rounded-full border transition-all text-xs font-mono font-bold ${
                isHandheld
                  ? 'border-amber-500/60 bg-amber-900/30 text-amber-400'
                  : 'border-arcane-purple/50 bg-arcane-purple/20 text-white/70'
              }`}
              style={{ padding: '4px 12px', minHeight: '28px' }}
              aria-label={`Switch to ${isHandheld ? 'desktop' : 'handheld'} layout`}
              title={`Currently: ${mode} layout. Click to switch.`}
            >
              {/* Desktop icon */}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"
                style={{ opacity: isHandheld ? 0.4 : 1 }}
              >
                <rect x="1" y="2" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <path d="M5 12H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M7 10V12" stroke="currentColor" strokeWidth="1.2" />
              </svg>

              <div
                className="w-8 h-4 rounded-full relative transition-all"
                style={{
                  backgroundColor: isHandheld ? 'rgba(245,158,11,0.4)' : 'rgba(100,100,140,0.3)',
                }}
              >
                <div
                  className="absolute top-0.5 w-3 h-3 rounded-full transition-all duration-200"
                  style={{
                    left: isHandheld ? '18px' : '2px',
                    backgroundColor: isHandheld ? '#fbbf24' : '#888',
                  }}
                />
              </div>

              {/* Handheld icon */}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"
                style={{ opacity: isHandheld ? 1 : 0.4 }}
              >
                <rect x="3" y="1" width="8" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="7" cy="11" r="0.75" fill="currentColor" />
                <path d="M5 3H9" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
              </svg>
            </button>

            <span className="text-white/40 text-xs font-mono capitalize select-none">{mode}</span>
          </div>
        </div>
      ) : (
        /* Gear icon - collapsed state */
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center rounded-full border border-arcane-purple/40 text-white/40 hover:text-arcane-gold hover:border-arcane-gold/50 transition-all"
          style={{
            width: '32px',
            height: '32px',
            minWidth: '32px',
            minHeight: '32px',
            backgroundColor: 'rgba(10, 10, 26, 0.8)',
            backdropFilter: 'blur(8px)',
          }}
          aria-label="Open UI settings"
          title="UI Scale & Layout"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M6.86 1.45C7.15 0.85 7.85 0.85 8.14 1.45L8.76 2.71C8.92 3.03 9.24 3.23 9.59 3.23H10.97C11.63 3.23 11.93 4.07 11.42 4.47L10.34 5.31C10.07 5.52 9.95 5.87 10.04 6.2L10.42 7.55C10.61 8.19 9.9 8.72 9.35 8.36L8.21 7.62C7.91 7.43 7.53 7.43 7.23 7.62L6.09 8.36C5.54 8.72 4.83 8.19 5.02 7.55L5.4 6.2C5.49 5.87 5.37 5.52 5.1 5.31L4.02 4.47C3.51 4.07 3.81 3.23 4.47 3.23H5.85C6.2 3.23 6.52 3.03 6.68 2.71L6.86 1.45Z"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <circle cx="8" cy="11" r="1" fill="currentColor" />
            <circle cx="5" cy="12.5" r="0.75" fill="currentColor" opacity="0.5" />
            <circle cx="11" cy="12.5" r="0.75" fill="currentColor" opacity="0.5" />
          </svg>
        </button>
      )}

      {/* Slider thumb styling */}
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #d4af37;
          cursor: pointer;
          border: 2px solid #0a0a1a;
          box-shadow: 0 0 6px rgba(212, 175, 55, 0.5);
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #d4af37;
          cursor: pointer;
          border: 2px solid #0a0a1a;
          box-shadow: 0 0 6px rgba(212, 175, 55, 0.5);
        }
      `}</style>
    </div>
  );
}

export default UIScaleControl;
