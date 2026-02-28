/**
 * Syncs gameStore.phase ↔ React Router location.
 * - When phase changes in the store → navigate to the corresponding route
 * - When the user navigates with browser back/forward → update the phase
 *
 * This lets existing setPhase() calls keep working everywhere while
 * also enabling deep-linking and browser history.
 */

import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import { GamePhase } from '@/types';

const PHASE_TO_PATH: Record<GamePhase, string> = {
  start: '/',
  menu: '/menu',
  allegiance: '/allegiance',
  draft: '/draft',
  shop: '/shop',
  crafting: '/crafting',
  deploy: '/deploy',
  combat: '/combat',
  result: '/result',
  grimoire: '/grimoire',
  paused: '/paused',
};

const PATH_TO_PHASE: Record<string, GamePhase> = {};
for (const [phase, path] of Object.entries(PHASE_TO_PATH)) {
  PATH_TO_PHASE[path] = phase as GamePhase;
}

export function usePhaseRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  const phase = useGameStore((s) => s.phase);
  const setPhase = useGameStore((s) => s.setPhase);
  const isNavigatingRef = useRef(false);

  // Phase → route
  useEffect(() => {
    const targetPath = PHASE_TO_PATH[phase] ?? '/';
    if (location.pathname !== targetPath) {
      isNavigatingRef.current = true;
      navigate(targetPath, { replace: false });
      // Reset flag after React Router processes the navigation
      requestAnimationFrame(() => {
        isNavigatingRef.current = false;
      });
    }
  }, [phase, navigate, location.pathname]);

  // Route → phase (browser back/forward)
  useEffect(() => {
    if (isNavigatingRef.current) return;
    const phaseFromPath = PATH_TO_PHASE[location.pathname];
    if (phaseFromPath && phaseFromPath !== phase) {
      setPhase(phaseFromPath);
    }
  }, [location.pathname, phase, setPhase]);
}
