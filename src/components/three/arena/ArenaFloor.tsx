/**
 * ArenaFloor — Rich procedural stone-tile floor with shadow receiving.
 */

import { useMemo } from 'react';
import { Box } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';

const FLOOR_SIZE = 200;

function seededRandom(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function createFloorTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cx = size / 2;
  const cy = size / 2;

  // Dark base fill
  ctx.fillStyle = '#0a0a16';
  ctx.fillRect(0, 0, size, size);

  // Radial gradient: brighter center, dark edges
  const radial = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx);
  radial.addColorStop(0, 'rgba(40, 35, 60, 0.9)');
  radial.addColorStop(0.25, 'rgba(28, 25, 45, 0.85)');
  radial.addColorStop(0.5, 'rgba(18, 16, 32, 0.7)');
  radial.addColorStop(0.75, 'rgba(10, 10, 22, 0.5)');
  radial.addColorStop(1, 'rgba(4, 4, 10, 0.0)');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, size, size);

  // Stone tile grid — staggered brick pattern
  const tileW = 64;
  const tileH = 48;
  const rows = Math.ceil(size / tileH) + 1;
  const cols = Math.ceil(size / tileW) + 1;

  for (let row = 0; row < rows; row++) {
    const offset = (row % 2) * (tileW / 2);
    for (let col = 0; col < cols; col++) {
      const x = col * tileW + offset;
      const y = row * tileH;

      const tileRand = seededRandom(col + row * 100, row);
      const brightness = 0.85 + tileRand * 0.3;

      const tileCx = x + tileW / 2;
      const tileCy = y + tileH / 2;
      const distFromCenter = Math.sqrt((tileCx - cx) ** 2 + (tileCy - cy) ** 2) / (cx * 0.9);
      const vignetteMultiplier = Math.max(0, 1.0 - distFromCenter * 0.6);

      const base = Math.floor(18 * brightness * vignetteMultiplier);
      const r = Math.floor(base * 1.1);
      const g = Math.floor(base * 1.0);
      const b = Math.floor(base * 1.4);

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x + 1, y + 1, tileW - 2, tileH - 2);

      // Inner bevel
      ctx.fillStyle = `rgba(255, 255, 255, ${0.02 * vignetteMultiplier})`;
      ctx.fillRect(x + 2, y + 2, tileW - 4, 1);
      ctx.fillRect(x + 2, y + 2, 1, tileH - 4);

      ctx.fillStyle = `rgba(0, 0, 0, ${0.15 * vignetteMultiplier})`;
      ctx.fillRect(x + 2, y + tileH - 3, tileW - 4, 1);
      ctx.fillRect(x + tileW - 3, y + 2, 1, tileH - 4);

      // Random surface details
      if (tileRand > 0.6) {
        const px = x + 4 + seededRandom(col * 3, row * 7) * (tileW - 8);
        const py = y + 4 + seededRandom(col * 5, row * 3) * (tileH - 8);
        const ps = 3 + seededRandom(col * 11, row * 13) * 8;
        ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + seededRandom(col * 17, row * 19) * 0.1})`;
        ctx.beginPath();
        ctx.arc(px, py, ps, 0, Math.PI * 2);
        ctx.fill();
      }

      // Occasional crack lines
      if (tileRand > 0.85) {
        ctx.strokeStyle = `rgba(0, 0, 0, ${0.15 * vignetteMultiplier})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        const sx = x + 5 + seededRandom(col * 7, row * 11) * (tileW - 10);
        const sy = y + 5 + seededRandom(col * 13, row * 17) * (tileH - 10);
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + (seededRandom(col, row) - 0.5) * 20, sy + seededRandom(row, col) * 15);
        ctx.stroke();
      }
    }
  }

  // Mortar lines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = 1;
  for (let row = 0; row <= rows; row++) {
    ctx.beginPath();
    ctx.moveTo(0, row * tileH);
    ctx.lineTo(size, row * tileH);
    ctx.stroke();
  }
  for (let row = 0; row < rows; row++) {
    const offset = (row % 2) * (tileW / 2);
    for (let col = 0; col <= cols; col++) {
      const x = col * tileW + offset;
      ctx.beginPath();
      ctx.moveTo(x, row * tileH);
      ctx.lineTo(x, (row + 1) * tileH);
      ctx.stroke();
    }
  }

  // Noise overlay
  const imageData = ctx.getImageData(0, 0, size, size);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const noise = (Math.random() - 0.5) * 6;
    d[i] = Math.max(0, Math.min(255, d[i] + noise));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + noise));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function ArenaFloor() {
  const floorTex = useMemo(() => createFloorTexture(), []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
        <meshStandardMaterial
          map={floorTex}
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>

      <RigidBody type="fixed" colliders="cuboid">
        <Box args={[FLOOR_SIZE, 0.5, FLOOR_SIZE]} position={[0, -0.25, 0]} visible={false} />
      </RigidBody>
    </group>
  );
}

export default ArenaFloor;
