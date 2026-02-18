---
name: page_builder
description: Guide to adding new Pages (Cards) to "When Things Attack", including data definitions, assets, and minion/construct logic. Use when adding new cards, minions, or constructs to the game.
---

# Page Builder Strategy & Workflow

This skill guides the creation of new Pages (Cards) in "When Things Attack". Pages can be Minions (mobile units), Constructs (stationary units), Spells, or other types.

## Workflow Overview

1.  **Define Card Data**: Create the `CardDefinition` in `src/data/cards.ts`.
2.  **Prepare Assets**: Add GLB models and UI images.
3.  **Implement Logic**: Create React components for the entity.
4.  **Register Entity**: Hook the component into `MinionManager.tsx` or `Arena.tsx`.

---

## Step 1: Define Card Data

Add a new entry to `CARD_DEFINITIONS` in `src/data/cards.ts`.

**Required Fields:**
-   `id`: Unique string ID (snake_case).
-   `name`: Display name.
-   `type`: `MINION` (mobile) or `CONSTRUCT` (stationary).
-   `tier`: 1 (Basic) or 2 (Crafted).
-   `baseStats`: HP, Attack, Speed, etc.
-   `abilities`: Array of `CardAbility` objects.
-   `visuals`: `meshPath` (GLB), `imagePath` (Card Art), `iconPath` (Small Icon).

**Example:**
```typescript
my_new_minion: {
  id: 'my_new_minion',
  name: 'New Minion',
  type: 'MINION',
  rarity: 'common',
  tier: 1,
  tags: ['bio', 'melee'],
  baseStats: { hp: 10, attack: 2, speed: 1.5, ...DEFAULT_STATS },
  abilities: [
    { id: 'bash', name: 'Bash', trigger: 'onHit', powerCost: 2 }
  ],
  meshPath: '/assets/models/my_minion.glb',
  imagePath: '/assets/images/my_minion.png',
  iconPath: '/assets/cards/my_minion_icon.png',
  color: '#ff0000',
},
```

---

## Step 2: Prepare Assets

Place files in the public directory:
-   **Models**: `public/assets/models/` (GLB format, ~1-2MB max).
-   **Card Art**: `public/assets/images/` (PNG, ~512x512).
-   **Icons**: `public/assets/cards/` (PNG, ~128x128).

---

## Step 3: Implement Logic

Choose the implementation path based on the Page Type.

### Path A: Standard Minion
If the minion just moves and attacks with standard melee/range behavior:
1.  Use the generic `Minion` component in `src/components/three/minions/Minion.tsx`.
2.  Ensure `meshPath` is set in the Card Definition.
3.  **No new component needed.**

### Path B: Custom Minion
If the minion has unique movement, animations, or ability logic (e.g., `SentientSlime`):
1.  Duplicate `src/components/three/minions/Minion.tsx` to `src/components/three/minions/MyMinion.tsx`.
2.  Customize `useFrame` loop for unique behavior.
3.  Implement ability triggers (e.g., `onDeath`, `onSpawn`) using `useCombatStore`.

### Path C: Construct
If the entity is stationary and spawned in a slot (e.g., `Toaster`, `Cactus`):
1.  Create `src/components/three/arena/SpawnedMyConstruct.tsx`.
2.  Reference `SpawnedToaster.tsx` for structure.
3.  Implement firing logic using `onFire` prop or `useFrame` timers.

---

## Step 4: Register Entity

Hook the new component into the rendering system.

### For Minions (Standard & Custom)
Update `src/components/three/minions/MinionManager.tsx`:

```typescript
// Add ID constant
const MY_MINION_IDS = new Set(['my_new_minion']);

// Inside MinionManager loop
if (MY_MINION_IDS.has(minion.cardDefinitionId)) {
  return <MyMinion key={minion.id} data={minion} />;
}
```

### For Constructs
Update `src/components/three/arena/Arena.tsx`:

1.  Import your new component.
2.  Update the `constructs.map` loop:

```typescript
// Inside constructs.map
if (cardId === 'my_new_construct') {
  return <SpawnedMyConstruct {...sharedProps} />;
}
```

---

## Step 5: Special Projectiles (Optional)

If the card fires a unique projectile:
1.  Create projectile component in `src/components/three/effects/`.
2.  Update `handleCardFire` in `src/components/three/arena/Arena.tsx` to spawn the new projectile type based on `card.id`.
3.  Update `Arena.tsx` render loop to render the new projectile type.

---

## Reference: Page Types

-   **MINION**: Mobile unit, AI controlled, moves towards enemies.
-   **CONSTRUCT**: Stationary unit, fixed to a card slot, usually fires projectiles.
-   **SPELL**: Instant effect, usually fires a projectile or applies a status.
-   **ESSENCE/MODIFIER**: Used in crafting, typically no in-arena representation unless it adds an ability.
