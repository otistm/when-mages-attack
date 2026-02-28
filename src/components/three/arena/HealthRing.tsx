import * as THREE from 'three';

interface HealthRingProps {
  healthPercent: number;
  team: 'player' | 'enemy';
  yOffset?: number;
  width?: number;
  height?: number;
}

/**
 * Shared billboard health bar for minions and constructs.
 * Renders a black background with a colored fill bar.
 */
export function HealthRing({
  healthPercent,
  team,
  yOffset = 3.0,
  width = 1.6,
  height = 0.22,
}: HealthRingProps) {
  const fillWidth = (width - 0.04) * healthPercent;
  const fillColor = team === 'player' ? '#4ade80' : '#f87171';

  return (
    <group position={[0, yOffset, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#000000" opacity={0.6} transparent />
      </mesh>
      <mesh position={[(healthPercent - 1) * (width / 2), 0, 0.01]}>
        <planeGeometry args={[fillWidth, height - 0.04]} />
        <meshBasicMaterial color={fillColor} />
      </mesh>
    </group>
  );
}

export default HealthRing;
