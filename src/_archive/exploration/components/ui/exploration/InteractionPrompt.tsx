/**
 * InteractionPrompt - UI overlay showing interaction button and prompt
 * Follows skill_r3f_interaction_designer.md patterns
 */

import { useInteractionStore } from '@/stores/interactionStore';
import { useInputStore } from '@/stores/inputStore';

export function InteractionPrompt() {
  const hoveredInteractable = useInteractionStore(s => s.hoveredInteractable);
  const canInteract = useInteractionStore(s => s.canInteract);
  const inputDevice = useInputStore(s => s.inputDevice);
  
  if (!hoveredInteractable) return null;
  
  const buttonKey = inputDevice === 'gamepad' ? 'A' : 'E';
  
  return (
    <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div 
        className={`
          flex items-center gap-3 px-5 py-3 rounded-lg
          transition-all duration-200
          ${canInteract 
            ? 'bg-amber-900/90 border border-amber-500/50 scale-100' 
            : 'bg-gray-900/80 border border-gray-600/50 scale-95 opacity-80'
          }
          backdrop-blur-sm shadow-lg
        `}
        style={{
          animation: canInteract ? 'pulse-subtle 2s ease-in-out infinite' : undefined,
        }}
      >
        {/* Button icon */}
        <div 
          className={`
            w-9 h-9 rounded flex items-center justify-center
            font-mono text-base font-bold
            transition-colors duration-200
            ${canInteract 
              ? 'bg-amber-500 text-black' 
              : 'bg-gray-600 text-gray-300'
            }
          `}
        >
          {buttonKey}
        </div>
        
        {/* Prompt text */}
        <span 
          className={`
            text-sm font-medium
            transition-colors duration-200
            ${canInteract ? 'text-amber-100' : 'text-gray-400'}
          `}
        >
          {hoveredInteractable.promptText}
        </span>
        
        {/* Distance indicator if too far */}
        {!canInteract && (
          <span className="text-xs text-gray-500 ml-2 italic">
            (move closer)
          </span>
        )}
      </div>
      
      {/* Subtle pulse animation */}
      <style>{`
        @keyframes pulse-subtle {
          0%, 100% { box-shadow: 0 0 0 0 rgba(217, 119, 6, 0); }
          50% { box-shadow: 0 0 20px 2px rgba(217, 119, 6, 0.3); }
        }
      `}</style>
    </div>
  );
}
