/**
 * ExplorationHUD - Minimal HUD for exploration mode
 */

import { useInputStore } from '@/stores/inputStore';
import { InteractionPrompt } from './InteractionPrompt';

export function ExplorationHUD() {
  const inputDevice = useInputStore(s => s.inputDevice);
  const pointerLocked = useInputStore(s => s.pointerLocked);
  
  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-2 h-2 border border-white/50 rounded-full" />
        <div className="absolute top-1/2 left-1/2 w-0.5 h-0.5 bg-white/60 rounded-full -translate-x-1/2 -translate-y-1/2" />
      </div>
      
      {/* Interaction prompt */}
      <InteractionPrompt />
      
      {/* Click to lock pointer prompt (keyboard only) */}
      {inputDevice === 'keyboard' && !pointerLocked && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 
                        bg-black/70 px-4 py-2 rounded-lg border border-white/20">
          <p className="text-white/80 text-sm">Click to control camera</p>
        </div>
      )}
      
      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-2 rounded-lg">
        <div className="text-white/60 text-xs space-y-1">
          {inputDevice === 'keyboard' ? (
            <>
              <p><span className="text-white/90">WASD</span> - Move</p>
              <p><span className="text-white/90">Mouse</span> - Look</p>
              <p><span className="text-white/90">Shift</span> - Sprint</p>
              <p><span className="text-white/90">E</span> - Interact</p>
              <p><span className="text-white/90">G</span> - Grimoire</p>
              <p><span className="text-white/90">Esc</span> - Release cursor</p>
            </>
          ) : (
            <>
              <p><span className="text-white/90">Left Stick</span> - Move</p>
              <p><span className="text-white/90">Right Stick</span> - Look</p>
              <p><span className="text-white/90">LT</span> - Sprint</p>
              <p><span className="text-white/90">A</span> - Interact</p>
              <p><span className="text-white/90">Back</span> - Grimoire</p>
            </>
          )}
        </div>
      </div>
      
      {/* Input device indicator */}
      <div className="absolute bottom-4 right-4 bg-black/50 px-3 py-2 rounded-lg">
        <p className="text-white/40 text-xs">
          Input: {inputDevice === 'keyboard' ? '⌨️ Keyboard' : '🎮 Gamepad'}
        </p>
      </div>
    </div>
  );
}
