/**
 * InteractionSystem - Raycast-based detection for interactable objects
 * Follows skill_r3f_interaction_designer.md patterns
 */

import { useRef, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useInteractionStore } from '@/stores/interactionStore';
import { useInputStore } from '@/stores/inputStore';
import type { Interactable } from '@/types/interaction';

interface InteractionSystemProps {
  maxDistance?: number;
  playerRef: React.RefObject<{ getPosition: () => THREE.Vector3 }>;
}

export function InteractionSystem({ 
  maxDistance = 5,
  playerRef,
}: InteractionSystemProps) {
  const { camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  
  const { 
    setHoveredObject, 
    clearHover, 
    startInteraction,
    endInteraction,
    completeInteraction,
    hoveredInteractable,
    canInteract,
    isInteracting,
  } = useInteractionStore();
  
  const interact = useInputStore(s => s.interact);
  const prevInteract = useRef(false);
  
  // Find all interactable objects in scene
  const findInteractables = useCallback(() => {
    const interactables: THREE.Object3D[] = [];
    
    scene.traverse((child) => {
      if (child.userData?.interactable) {
        interactables.push(child);
      }
    });
    
    return interactables;
  }, [scene]);
  
  // Handle interaction input
  useEffect(() => {
    // Detect rising edge (just pressed)
    if (interact && !prevInteract.current) {
      if (canInteract && hoveredInteractable && !isInteracting) {
        const success = startInteraction();
        
        if (success && hoveredInteractable) {
          // Execute the interaction
          console.log(`[Interaction] ${hoveredInteractable.type}: ${hoveredInteractable.promptText}`);
          
          // Mark as complete if one-time
          if (hoveredInteractable.oneTime) {
            completeInteraction(hoveredInteractable.id);
          }
          
          // End interaction after a brief moment (or immediately for simple types)
          setTimeout(() => {
            endInteraction();
          }, 100);
        }
      }
    }
    
    prevInteract.current = interact;
  }, [interact, canInteract, hoveredInteractable, isInteracting, startInteraction, endInteraction, completeInteraction]);
  
  // Track the last hovered object to avoid redundant updates
  const lastHoveredId = useRef<string | null>(null);
  
  useFrame(() => {
    // Cast ray from camera center (slightly below center for third-person)
    raycaster.current.setFromCamera(new THREE.Vector2(0, -0.05), camera);
    raycaster.current.far = maxDistance;
    
    // Get all interactables
    const interactables = findInteractables();
    
    if (interactables.length === 0) {
      if (lastHoveredId.current !== null) {
        lastHoveredId.current = null;
        clearHover();
      }
      return;
    }
    
    // Raycast against interactables
    const intersects = raycaster.current.intersectObjects(interactables, true);
    
    if (intersects.length > 0) {
      // Find the root interactable object (traverse up to find userData.interactable)
      let target = intersects[0].object;
      while (target.parent && !target.userData?.interactable) {
        target = target.parent as THREE.Object3D;
      }
      
      if (target.userData?.interactable) {
        const interactable = target.userData.interactable as Interactable;
        
        // Calculate distance from PLAYER to target (not camera)
        let playerDistance = intersects[0].distance; // fallback to raycast distance
        if (playerRef.current) {
          const playerPos = playerRef.current.getPosition();
          const targetPos = new THREE.Vector3();
          target.getWorldPosition(targetPos);
          playerDistance = playerPos.distanceTo(targetPos);
        }
        
        // Check if within highlight range (using raycast distance for visibility check)
        const raycastDistance = intersects[0].distance;
        if (raycastDistance <= interactable.highlightRange) {
          // Update if target changed OR distance changed significantly
          if (lastHoveredId.current !== interactable.id) {
            lastHoveredId.current = interactable.id;
          }
          // Always update distance (for canInteract to update as player moves)
          setHoveredObject(target, interactable, playerDistance);
        } else {
          if (lastHoveredId.current !== null) {
            lastHoveredId.current = null;
            clearHover();
          }
        }
      } else {
        if (lastHoveredId.current !== null) {
          lastHoveredId.current = null;
          clearHover();
        }
      }
    } else {
      if (lastHoveredId.current !== null) {
        lastHoveredId.current = null;
        clearHover();
      }
    }
  });
  
  return null;
}
