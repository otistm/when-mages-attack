import { useMemo } from 'react';
import { getToonRamp3Band } from '@/shaders/ToonMaterials';

export const OFFICE_TOON_COLORS = {
  woodDark: '#4a3525',
  woodMid: '#5a4030',
  woodLight: '#6a4a3a',
  metalDark: '#3a3a3a',
  metalMid: '#4a4a4a',
  metalGold: '#aa8844',
  stone: '#5a5a6a',
  wall: '#5a5a5a',
  floor: '#4a3a2a',
  paper: '#d4c5a0',
  parchment: '#e8e0d0',
  glass: '#667788',
  fabricDark: '#5a3a3a',
  fabricMid: '#6a4a4a',
  fabricLight: '#7a5a5a',
  ink: '#1a1a2a',
  dust: '#7a7a7a',
};

export function useOfficeToonGradient() {
  return useMemo(() => getToonRamp3Band(), []);
}
