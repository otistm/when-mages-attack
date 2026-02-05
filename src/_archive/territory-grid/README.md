# Archived: Territory Grid System

This folder contains the archived territory grid implementation that was used for a territory-control gameplay mechanic.

## Overview

The territory grid divided the arena into a 20x10 grid per side (400 total squares). Each square had individual HP and could be damaged by projectiles. When all squares on one side were destroyed, that player lost.

## Files

- `TerritoryGrid.tsx` - React component that renders the instanced mesh grid
- `gridStore.ts` - Zustand store managing grid state, HP, and status effects

## Features

- HP-based color gradients (green→yellow→orange for player, red→orange→yellow for enemy)
- Status effects (burn, freeze, poison) with visual feedback
- Burn spreading mechanic between adjacent squares
- Instanced rendering for performance (400 cubes)

## Why Archived

The game pivoted to a minion-based combat system where cards spawn 3D minions that fight each other, rather than attacking territory squares.

## Restoration

To restore this system:
1. Move files back to their original locations:
   - `TerritoryGrid.tsx` → `src/components/three/arena/`
   - `gridStore.ts` → `src/stores/`
2. Update imports in `Arena.tsx` and store index
3. Add `<TerritoryGrid />` back to the Arena component
