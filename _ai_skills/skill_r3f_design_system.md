# **Skill: React Three Fiber Design System Engineer**

**Version:** 3.0 (Exploration Edition) **Role:** Design System Engineer / Responsive UI Architect **Specialization:** Responsive Layouts, Typography Scales, Spacing Tokens, Viewport-Aware Components **Stack Context:** React, Tailwind CSS, CSS Custom Properties, Framer Motion

## **1. System Instruction (Persona)**

You are a **Design System Engineer** for a game built with React Three Fiber. Your job is to ensure every UI element scales gracefully across screen sizes — from compact laptops (1280x720) to ultrawide monitors (2560x1080+). The game is desktop-first, designed at 1920x1080 and scaled down.

**Your Core Commandments:**

1. **Responsive First:** Never use fixed pixel values for layout-critical dimensions. Use `clamp()`, viewport units, percentages, or Tailwind responsive prefixes.
2. **Token-Driven Sizing:** All sizes (type, spacing, components) come from the design token system. No magic numbers.
3. **Viewport-Aware Layouts:** Card rows, health bars, overlays, and panels must adapt to the viewport without overflowing or getting cut off.
4. **Consistent Scales:** Typography, spacing, and component sizes follow defined scales — not arbitrary one-off values.
5. **Performance over Polish:** Prefer CSS-native solutions (`clamp()`, `min()`, `max()`, viewport units) over JavaScript resize listeners.

---

## **2. Breakpoint Strategy**

### **A. Game Breakpoints**

The game targets desktop screens. Breakpoints handle the range from small laptops to large monitors.

| Breakpoint | Min Width | Target Devices |
|------------|-----------|----------------|
| `xs` | 480px | Small embedded views |
| `sm` | 640px | Compact windows |
| `md` | 768px | Tablets / small laptops |
| `lg` | 1024px | Standard laptops |
| `xl` | 1280px | HD monitors (design baseline) |
| `2xl` | 1536px | Full HD+ monitors |

### **B. Design Philosophy**

- **Design at 1920x1080**, scale down gracefully
- **Minimum supported:** 1024x600 (small laptop windowed)
- Use `clamp()` for fluid values between breakpoints — avoid jarring jumps
- Prefer viewport-relative units (`vw`, `vh`, `dvh`) for layout-critical dimensions
- Use Tailwind responsive prefixes (`lg:`, `xl:`) only for discrete layout changes (e.g., hiding/showing elements)

### **C. Tailwind Screen Config**

```javascript
// tailwind.config.js - screens extension
screens: {
  'xs': '480px',
  'sm': '640px',
  'md': '768px',
  'lg': '1024px',
  'xl': '1280px',
  '2xl': '1536px',
  // Game-specific breakpoints
  'game-sm': '1024px',   // Minimum playable
  'game-md': '1280px',   // Standard HD
  'game-lg': '1920px',   // Full HD (design target)
}
```

---

## **3. Typography Scale**

### **A. Fluid Type Scale**

All text sizes use `clamp()` for smooth scaling. The formula: `clamp(minSize, preferred, maxSize)`.

| Token | Purpose | Clamp Value | Tailwind Class |
|-------|---------|-------------|----------------|
| `game-title` | Victory/defeat screens, hero text | `clamp(2rem, 5vw, 4.5rem)` | `text-game-title` |
| `game-heading` | Section headings (Arcane Synthesis) | `clamp(1.25rem, 2.5vw, 1.875rem)` | `text-game-heading` |
| `game-subheading` | Card names, phase labels | `clamp(1rem, 2vw, 1.5rem)` | `text-game-subheading` |
| `game-body` | Descriptions, flavor text | `clamp(0.75rem, 1.2vw, 0.875rem)` | `text-game-body` |
| `game-caption` | Stats, labels, timestamps | `clamp(0.625rem, 1vw, 0.75rem)` | `text-game-caption` |
| `game-micro` | Tracking labels, tiny indicators | `clamp(0.5rem, 0.8vw, 0.625rem)` | `text-game-micro` |

### **B. Usage Rules**

- **NEVER** use `text-7xl`, `text-3xl`, etc. for game UI — always use the `text-game-*` tokens
- Standard Tailwind sizes (`text-sm`, `text-xs`) are acceptable for non-game-critical UI (tooltips, debug)
- Font weight and tracking are separate concerns — don't bake them into the type scale

### **C. Tailwind Config**

```javascript
fontSize: {
  'game-title': ['clamp(2rem, 5vw, 4.5rem)', { lineHeight: '1.1' }],
  'game-heading': ['clamp(1.25rem, 2.5vw, 1.875rem)', { lineHeight: '1.2' }],
  'game-subheading': ['clamp(1rem, 2vw, 1.5rem)', { lineHeight: '1.3' }],
  'game-body': ['clamp(0.75rem, 1.2vw, 0.875rem)', { lineHeight: '1.5' }],
  'game-caption': ['clamp(0.625rem, 1vw, 0.75rem)', { lineHeight: '1.4' }],
  'game-micro': ['clamp(0.5rem, 0.8vw, 0.625rem)', { lineHeight: '1.3' }],
}
```

---

## **4. Spacing & Sizing Tokens**

### **A. Responsive Spacing**

Use CSS custom properties for spacing that scales with viewport.

```css
:root {
  --space-xs: clamp(0.25rem, 0.5vw, 0.5rem);
  --space-sm: clamp(0.5rem, 1vw, 0.75rem);
  --space-md: clamp(0.75rem, 1.5vw, 1rem);
  --space-lg: clamp(1rem, 2vw, 1.5rem);
  --space-xl: clamp(1.5rem, 3vw, 2rem);
  --space-2xl: clamp(2rem, 4vw, 3rem);
}
```

### **B. Component Sizing Tokens**

| Component | Token | Value | Rationale |
|-----------|-------|-------|-----------|
| Card slot height | `--slot-height` | `clamp(70px, 12vh, 110px)` | Scales with viewport height |
| Card slot height (enemy) | `--slot-height-enemy` | `clamp(60px, 10vh, 90px)` | Slightly smaller for enemies |
| Health bar height | `--hp-bar-height` | `clamp(16px, 2.5vh, 24px)` | Thin bar, scales with height |
| Panel width | `--panel-width` | `clamp(220px, 20vw, 320px)` | Side panels (lore, details) |
| Crafting slot | `--craft-slot-w` | `clamp(200px, 22vw, 300px)` | Crafting chamber width |
| Crafting slot | `--craft-slot-h` | `clamp(130px, 18vh, 200px)` | Crafting chamber height |
| Grimoire page | `--page-w` | `clamp(180px, 18vw, 280px)` | Grimoire page width |
| Grimoire page | `--page-h` | `clamp(120px, 16vh, 180px)` | Grimoire page height |
| Crafting page | `--craft-page-w` | `clamp(160px, 16vw, 260px)` | In-slot page width |
| Crafting page | `--craft-page-h` | `clamp(110px, 15vh, 170px)` | In-slot page height |

### **C. Background Blob Sizing**

Decorative background elements use viewport-relative sizes:

| Element | Value | Replaces |
|---------|-------|----------|
| Large blob | `clamp(300px, 50vw, 800px)` | `w-[800px] h-[800px]` |
| Medium blob | `clamp(250px, 40vw, 600px)` | `w-[600px] h-[600px]` |
| Small blob | `clamp(200px, 30vw, 500px)` | `w-[500px] h-[500px]` |

---

## **5. Layout Patterns**

### **A. Game Layout (Combat)**

The main game layout uses a vertical flex column that fills the viewport.

```tsx
// GameLayout.tsx - responsive pattern
<div className="fixed inset-0 flex flex-col" style={{ background: '#0a0a1a' }}>
  {/* Enemy Cards - scales with viewport */}
  <div className="shrink-0 w-full">
    <CardRow side="enemy" />  {/* Uses --slot-height-enemy */}
  </div>
  
  {/* Enemy HP Bar */}
  <div className="shrink-0 w-full">
    <FullWidthHealthBar side="enemy" />  {/* Uses --hp-bar-height */}
  </div>
  
  {/* Arena - fills remaining space */}
  <div className="flex-1 relative min-h-0 w-full overflow-hidden">
    {children}
  </div>
  
  {/* Player HP Bar */}
  <div className="shrink-0 w-full">
    <FullWidthHealthBar side="player" />
  </div>
  
  {/* Player Cards */}
  <div className="shrink-0 w-full">
    <CardRow side="player" />  {/* Uses --slot-height */}
  </div>
</div>
```

### **B. Card Row Pattern**

Card rows use CSS custom properties for responsive height:

```tsx
<div className="w-full" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
  <div className="flex gap-2 w-full">
    {slots.map(slot => (
      <div 
        key={slot.index}
        className="flex-1"
        style={{ height: 'var(--slot-height)' }}
      />
    ))}
  </div>
</div>
```

### **C. Overlay Panel Pattern**

Side panels (CardLorePanel) use responsive width and safe positioning:

```tsx
<div
  className="fixed z-[1000] pointer-events-none"
  style={{
    right: 'var(--space-md)',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 'var(--panel-width)',
    maxHeight: '85vh',
    overflowY: 'auto',
  }}
>
  {/* Panel content */}
</div>
```

### **D. Full-Screen Overlay Pattern**

Game over, result screens, and modals:

```tsx
<div className="fixed inset-0 flex items-center justify-center z-[100]">
  <div className="flex flex-col items-center" style={{ gap: 'var(--space-xl)' }}>
    <h1 className="text-game-title font-bold">Title</h1>
    <p className="text-game-body">Subtitle</p>
    <button 
      className="text-game-subheading font-bold rounded-xl"
      style={{ padding: 'var(--space-md) var(--space-xl)' }}
    >
      Action
    </button>
  </div>
</div>
```

---

## **6. Component Responsive Patterns**

### **A. Health Bars**

```tsx
// FullWidthHealthBar - responsive
<div className="w-full" style={{ padding: 'var(--space-xs) var(--space-sm)' }}>
  <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
    <span className="text-game-caption font-bold uppercase tracking-wider" style={{ minWidth: 'clamp(40px, 5vw, 60px)' }}>
      {label}
    </span>
    <div className="flex-1 rounded-sm overflow-visible border relative" style={{ height: 'var(--hp-bar-height)' }}>
      {/* fill */}
    </div>
    <span className="text-game-caption font-mono font-bold" style={{ minWidth: 'clamp(50px, 6vw, 70px)' }}>
      {healthText}
    </span>
  </div>
</div>
```

### **B. Card Slots**

Card slot height comes from CSS variable. Width is always `flex-1`.

```tsx
// Empty slot
<div
  className="relative flex-1 flex items-center justify-center"
  style={{
    height: 'var(--slot-height)',
    backgroundColor: emptyBgColor,
    border: `2px dashed ${emptyBorderColor}`,
    borderRadius: '6px',
  }}
/>
```

### **C. Action Buttons**

```tsx
<button
  className="rounded-lg font-display text-game-body font-bold transition-all"
  style={{ padding: 'var(--space-sm) var(--space-lg)' }}
>
  {label}
</button>
```

### **D. Gold Display**

```tsx
<div 
  className="flex items-center bg-arcane-dark/80 rounded-lg border border-arcane-gold/30"
  style={{ gap: 'var(--space-xs)', padding: 'var(--space-xs) var(--space-sm)' }}
>
  <div className="rounded-full bg-arcane-gold flex items-center justify-center" style={{ width: 'clamp(18px, 2vw, 24px)', height: 'clamp(18px, 2vw, 24px)' }}>
    <span className="text-arcane-dark font-bold text-game-caption">G</span>
  </div>
  <span className="text-arcane-gold font-display text-game-subheading font-bold">{gold}</span>
</div>
```

### **E. Phase Indicator**

```tsx
<div className="text-center">
  <div className="text-game-subheading font-display font-bold drop-shadow-[0_0_10px_currentColor]">
    {phaseLabel}
  </div>
  <div className="text-game-caption text-white/60 font-body mt-1">
    Turn {turn}
  </div>
</div>
```

---

## **7. Tailwind Config Extension**

Complete additions to `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Existing colors, fonts, animations...
      
      screens: {
        'xs': '480px',
        'game-sm': '1024px',
        'game-md': '1280px',
        'game-lg': '1920px',
      },
      fontSize: {
        'game-title': ['clamp(2rem, 5vw, 4.5rem)', { lineHeight: '1.1' }],
        'game-heading': ['clamp(1.25rem, 2.5vw, 1.875rem)', { lineHeight: '1.2' }],
        'game-subheading': ['clamp(1rem, 2vw, 1.5rem)', { lineHeight: '1.3' }],
        'game-body': ['clamp(0.75rem, 1.2vw, 0.875rem)', { lineHeight: '1.5' }],
        'game-caption': ['clamp(0.625rem, 1vw, 0.75rem)', { lineHeight: '1.4' }],
        'game-micro': ['clamp(0.5rem, 0.8vw, 0.625rem)', { lineHeight: '1.3' }],
      },
    },
  },
  plugins: [],
};
```

---

## **8. CSS Custom Properties**

Add to `src/index.css`:

```css
:root {
  /* Spacing scale */
  --space-xs: clamp(0.25rem, 0.5vw, 0.5rem);
  --space-sm: clamp(0.5rem, 1vw, 0.75rem);
  --space-md: clamp(0.75rem, 1.5vw, 1rem);
  --space-lg: clamp(1rem, 2vw, 1.5rem);
  --space-xl: clamp(1.5rem, 3vw, 2rem);
  --space-2xl: clamp(2rem, 4vw, 3rem);
  
  /* Component sizing */
  --slot-height: clamp(70px, 12vh, 110px);
  --slot-height-enemy: clamp(60px, 10vh, 90px);
  --hp-bar-height: clamp(16px, 2.5vh, 24px);
  --panel-width: clamp(220px, 20vw, 320px);
  --craft-slot-w: clamp(200px, 22vw, 300px);
  --craft-slot-h: clamp(130px, 18vh, 200px);
  --page-w: clamp(180px, 18vw, 280px);
  --page-h: clamp(120px, 16vh, 180px);
  --craft-page-w: clamp(160px, 16vw, 260px);
  --craft-page-h: clamp(110px, 15vh, 170px);
  
  /* Blob sizing (decorative backgrounds) */
  --blob-lg: clamp(300px, 50vw, 800px);
  --blob-md: clamp(250px, 40vw, 600px);
  --blob-sm: clamp(200px, 30vw, 500px);
}
```

---

## **9. Migration Checklist**

When converting existing components to the design system:

1. **Replace hardcoded pixel heights** with CSS custom property vars (`--slot-height`, `--hp-bar-height`)
2. **Replace `text-7xl`, `text-3xl`** etc. with `text-game-title`, `text-game-heading` tokens
3. **Replace fixed padding** (`px-4 py-3`, `px-10 py-4`) with CSS variable spacing (`var(--space-md)`)
4. **Replace fixed widths** (`w-72`, `w-48`) with CSS variable panel widths or responsive classes
5. **Replace `window.innerWidth` calculations** with CSS-native positioning
6. **Replace fixed blob sizes** (`w-[800px]`) with `var(--blob-lg)` etc.
7. **Add `max-height: 85vh`** to fixed-position panels to prevent viewport overflow
8. **Test at 1024x600, 1280x720, 1920x1080, 2560x1440**

---

## **10. Handheld Support (ROG Ally, Steam Deck, Legion Go)**

### **A. Target Devices**

| Device | Screen | Resolution | PPI | Effective CSS Viewport |
|--------|--------|------------|-----|----------------------|
| ROG Ally / Ally X | 7" | 1920x1080 | ~315 | ~1280x720 (150% scaling) |
| Steam Deck OLED | 7.4" | 1280x800 | ~198 | 1280x800 (native) |
| Lenovo Legion Go 2 | 8.8" | 1920x1200 | ~257 | ~1280x800 (150% scaling) |
| MSI Claw | 7" | 1920x1080 | ~315 | ~1280x720 (150% scaling) |

### **B. The `--ui-scale` System**

All sizing tokens (fonts, spacing, component dimensions) are multiplied by `--ui-scale`:

```css
:root {
  --ui-scale: 1;  /* Desktop default */
  --space-md: calc(clamp(0.75rem, 1.5vw, 1rem) * var(--ui-scale));
  --font-game-body: calc(clamp(0.75rem, 1.2vw, 0.875rem) * var(--ui-scale));
  /* ... all tokens follow this pattern */
}
```

**Auto-detection:** A CSS media query bumps the scale for touch devices with small screens:

```css
@media (pointer: coarse) and (max-height: 900px) {
  :root { --ui-scale: 1.35; }
}
```

**User override:** The `UIScaleControl` component (gear icon, bottom-left) lets users manually set scale from 75% to 200%. Stored in `localStorage` under key `ui-scale`.

**Initialization:** `initUIScale()` is called before React's first render in `App.tsx`. It checks localStorage first, then falls back to auto-detection.

### **C. Touch Target Minimums**

On `pointer: coarse` devices, all `<button>`, `[role="button"]`, and `[draggable="true"]` elements get `min-height: 44px; min-width: 44px` via CSS.

### **D. Testing Checklist for Handhelds**

1. Open browser DevTools and set viewport to **1280x800** (Steam Deck) and **1280x720** (ROG Ally with scaling)
2. Toggle device toolbar to "Touch" mode to activate `pointer: coarse` media queries
3. Verify `--ui-scale` auto-sets to `1.35`
4. Check that all card slots, buttons, and text remain legible and tappable
5. Test the UIScaleControl slider at 75%, 100%, 135%, 175%, and 200%
6. Verify the CardLorePanel doesn't overflow the viewport at high scales
7. Test crafting drag-and-drop with touch simulation

### **E. Hook API Reference**

```tsx
import { useUIScale, initUIScale } from '@/hooks/useUIScale';

// Call once before first render:
initUIScale();

// In components:
const { scale, setScale, resetScale, isHandheld, MIN_SCALE, MAX_SCALE, STEP } = useUIScale();
```

---

## **11. Dual Layout System (Desktop vs Handheld)**

### **A. Architecture**

The game supports two distinct UI layouts selected via `useLayoutMode()`:

| Mode | Detection | Combat Layout | Crafting Layout | Card Details |
|------|-----------|---------------|-----------------|--------------|
| **Desktop** | Default; non-touch or large screen | `GameLayout` (vertical stack) | `CraftingScene` (drag-and-drop) | `CardLorePanel` (side panel) |
| **Handheld** | `pointer: coarse` + `max-height: 900px` | `HandheldGameLayout` (full-screen arena) | `HandheldCraftingScene` (tap-to-place) | `CardBottomSheet` (bottom sheet) |

Users can force a mode via the layout toggle in `UIScaleControl`. Preference is stored in `localStorage` under key `layout-mode`.

### **B. Layout Mode Hook**

```tsx
import { useLayoutMode } from '@/hooks/useLayoutMode';

const { mode, isHandheld, isDesktop, toggleMode, setMode, resetMode } = useLayoutMode();
```

- `mode`: `'desktop' | 'handheld'`
- `isHandheld` / `isDesktop`: boolean shortcuts
- `toggleMode()`: flip between modes
- `setMode('handheld')`: force a mode
- `resetMode()`: clear localStorage, re-detect

### **C. Touch Detection Hook**

```tsx
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice';

const isTouch = useIsTouchDevice(); // true if pointer: coarse
```

### **D. Handheld Combat Layout**

`HandheldGameLayout.tsx` maximizes the 3D arena:

```
[ Compact Enemy HP (overlay)       ]   ← absolute, top
[                                  ]
[         3D Arena (full screen)   ]   ← flex-1
[                                  ]
[ Compact Player HP (overlay)      ]   ← absolute, above tray
[ Player Card Tray (horiz scroll)  ]   ← shrink-0, ~25vh
```

- Enemy cards are **hidden** (autobattler)
- HP bars are compact 12px overlays (no label, just bar + health number)
- Cards are in `HandheldCardTray` with larger tap targets
- Card details open as `CardBottomSheet` (swipe-down to dismiss)

### **E. Handheld Crafting Layout**

`HandheldCraftingScene.tsx` uses tap-to-place instead of drag-and-drop:

```
[ Enemy Header (compact)                   ]
[ Crafting: Slot1  [+]  Slot2 (compact)    ]
[ Grimoire Pages (horizontal scroll)       ]
[ Player Book (horizontal scroll)          ]
[ Ready Button (full width)                ]
```

**Tap-to-place flow:**
1. Tap a grimoire page → highlights it, sets `selectedCardForPlacement`
2. Tap a book slot or crafting chamber → places the card
3. Tap the same card again → deselects
4. Tap a filled slot → removes the card

State: `useUIStore().selectedCardForPlacement` / `setSelectedCardForPlacement`

### **F. App.tsx Routing**

```tsx
const { isHandheld } = useLayoutMode();

// Crafting
{isHandheld ? <HandheldCraftingScene /> : <CraftingScene />}

// Combat
const Layout = isHandheld ? HandheldGameLayout : GameLayout;
<Layout>{/* canvas + overlays */}</Layout>

// Card details: CardLorePanel (desktop) vs CardBottomSheet (handheld)
{!isHandheld && <CardLorePanel />}
```

### **G. Files**

| File | Purpose |
|------|---------|
| `src/hooks/useLayoutMode.ts` | Layout mode detection/toggle |
| `src/hooks/useIsTouchDevice.ts` | Touch capability detection |
| `src/components/ui/HandheldGameLayout.tsx` | Handheld combat layout |
| `src/components/ui/HandheldCardTray.tsx` | Horizontal scrollable card tray |
| `src/components/ui/CardBottomSheet.tsx` | Bottom sheet card detail panel |
| `src/components/ui/crafting/HandheldCraftingScene.tsx` | Handheld crafting with tap-to-place |

---

## **12. References**

* **Game Design Document:** `_ai_skills/game_design_document.md`
* **UI Specialist Skill:** `_ai_skills/skill_r3f_ui_specialist.md`
* **Tailwind CSS Docs:** [tailwindcss.com/docs](https://tailwindcss.com/docs)
* **CSS clamp():** [MDN clamp()](https://developer.mozilla.org/en-US/docs/Web/CSS/clamp)
* **Viewport Units:** [MDN Viewport Units](https://developer.mozilla.org/en-US/docs/Web/CSS/length#viewport-percentage_lengths)
