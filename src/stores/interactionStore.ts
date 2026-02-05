/**
 * Interaction Store - Manages interaction state and hover targets
 * Follows skill_r3f_interaction_designer.md patterns
 */

import { create } from 'zustand';
import * as THREE from 'three';
import type { Interactable } from '@/types/interaction';

interface InteractionState {
  // Current hover target
  hoveredObject: THREE.Object3D | null;
  hoveredInteractable: Interactable | null;
  canInteract: boolean;
  distanceToTarget: number;
  
  // Interaction in progress
  isInteracting: boolean;
  currentInteraction: Interactable | null;
  
  // Completed interactions (for one-time checks)
  completedInteractions: Set<string>;
  
  // Actions
  setHoveredObject: (obj: THREE.Object3D | null, data: Interactable | null, distance?: number) => void;
  setCanInteract: (can: boolean) => void;
  startInteraction: () => boolean;
  endInteraction: () => void;
  completeInteraction: (id: string) => void;
  isCompleted: (id: string) => boolean;
  clearHover: () => void;
}

export const useInteractionStore = create<InteractionState>((set, get) => ({
  hoveredObject: null,
  hoveredInteractable: null,
  canInteract: false,
  distanceToTarget: Infinity,
  isInteracting: false,
  currentInteraction: null,
  completedInteractions: new Set(),
  
  setHoveredObject: (obj, data, distance = Infinity) => set({
    hoveredObject: obj,
    hoveredInteractable: data,
    distanceToTarget: distance,
    canInteract: data ? distance <= data.interactionRange : false,
  }),
  
  setCanInteract: (can) => set({ canInteract: can }),
  
  startInteraction: () => {
    const { hoveredInteractable, canInteract, completedInteractions } = get();
    
    if (!hoveredInteractable || !canInteract) {
      return false;
    }
    
    // Check if already completed (for one-time interactions)
    if (hoveredInteractable.oneTime && completedInteractions.has(hoveredInteractable.id)) {
      return false;
    }
    
    set({
      isInteracting: true,
      currentInteraction: hoveredInteractable,
    });
    
    return true;
  },
  
  endInteraction: () => set({
    isInteracting: false,
    currentInteraction: null,
  }),
  
  completeInteraction: (id) => set((state) => {
    const newCompleted = new Set(state.completedInteractions);
    newCompleted.add(id);
    return { completedInteractions: newCompleted };
  }),
  
  isCompleted: (id) => get().completedInteractions.has(id),
  
  clearHover: () => set({
    hoveredObject: null,
    hoveredInteractable: null,
    canInteract: false,
    distanceToTarget: Infinity,
  }),
}));
