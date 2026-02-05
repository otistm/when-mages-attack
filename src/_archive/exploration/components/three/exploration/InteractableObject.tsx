/**
 * InteractableObject - Wrapper component for interactable 3D objects
 * Follows skill_r3f_interaction_designer.md patterns
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { GroupProps } from '@react-three/fiber';
import * as THREE from 'three';
import type { Interactable } from '@/types/interaction';
import { useInteractionStore } from '@/stores/interactionStore';

interface InteractableObjectProps extends GroupProps {
  interactable: Interactable;
  children: React.ReactNode;
  glowColor?: string;
  glowIntensity?: number;
  onInteract?: () => void; // Callback when interaction occurs
}

export function InteractableObject({ 
  interactable, 
  children, 
  glowColor = '#d4af37',
  glowIntensity = 0.3,
  onInteract,
  ...props 
}: InteractableObjectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const isCompleted = useInteractionStore(s => s.isCompleted(interactable.id));
  const hoveredObject = useInteractionStore(s => s.hoveredObject);
  const currentInteraction = useInteractionStore(s => s.currentInteraction);
  const isInteracting = useInteractionStore(s => s.isInteracting);
  
  // Check if this object is currently hovered
  const isHovered = useMemo(() => {
    if (!groupRef.current || !hoveredObject) return false;
    return groupRef.current === hoveredObject || groupRef.current.children.includes(hoveredObject);
  }, [hoveredObject]);
  
  // Detect when this specific object is being interacted with
  useEffect(() => {
    if (isInteracting && currentInteraction?.id === interactable.id && onInteract) {
      onInteract();
    }
  }, [isInteracting, currentInteraction, interactable.id, onInteract]);
  
  // Don't render if one-time and completed
  if (interactable.oneTime && isCompleted) {
    return null;
  }
  
  return (
    <group
      ref={groupRef}
      {...props}
      userData={{ interactable }}
    >
      {children}
      
      {/* Hover highlight effect */}
      {isHovered && (
        <HighlightEffect 
          parent={groupRef} 
          color={glowColor}
          intensity={glowIntensity}
        />
      )}
    </group>
  );
}

/**
 * Visual highlight effect when hovering
 */
function HighlightEffect({ 
  parent, 
  color,
  intensity,
}: { 
  parent: React.RefObject<THREE.Group>;
  color: string;
  intensity: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const canInteract = useInteractionStore(s => s.canInteract);
  
  useFrame((_, delta) => {
    if (!meshRef.current || !parent.current) return;
    
    // Pulse effect
    const pulse = Math.sin(Date.now() * 0.005) * 0.1 + 1;
    meshRef.current.scale.setScalar(pulse);
    
    // Update material opacity based on interaction state
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = THREE.MathUtils.lerp(
      mat.opacity,
      canInteract ? 0.25 : 0.12,
      delta * 10
    );
    mat.color.set(canInteract ? color : '#888888');
  });
  
  // Calculate bounding box of parent
  const size = useMemo(() => {
    if (!parent.current) return new THREE.Vector3(1, 1, 1);
    const bbox = new THREE.Box3().setFromObject(parent.current);
    return bbox.getSize(new THREE.Vector3()).multiplyScalar(1.1);
  }, [parent.current]);
  
  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[size.x, size.y, size.z]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.15}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}
