/**
 * Interaction System Types
 * Follows skill_r3f_interaction_designer.md patterns
 */

export type InteractionType = 'examine' | 'collect' | 'activate' | 'use';

export interface Interactable {
  id: string;
  type: InteractionType;
  
  // Display
  promptText: string;              // "Examine inscription"
  promptIcon?: string;             // Optional icon path
  
  // Range and detection
  interactionRange: number;        // Max distance to interact (meters)
  highlightRange: number;          // Distance at which highlight appears
  
  // Requirements
  requiresItem?: string;           // Item ID needed
  requiresPage?: string;           // Page must be discovered first
  requiresState?: string;          // World state condition
  
  // Rewards
  grantsPage?: string;             // Page discovered on interaction
  grantsItem?: string;             // Item received
  triggersEvent?: string;          // Event ID to fire
  triggersDialogue?: string;       // Dialogue ID to start
  
  // State
  oneTime: boolean;                // Can only interact once?
  cooldown?: number;               // Seconds before can interact again
  
  // Feedback
  soundEffect?: string;            // Sound to play on interact
  cameraFocus?: boolean;           // Should camera focus on object?
  
  // Optional description for examine type
  description?: string;
}
