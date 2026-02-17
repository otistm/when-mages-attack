# Arcane Design System

**When Things Attack** — Accessible UI Design System
Version 1.0 | Arcane Punk / Secret Society Gothic

---

## 1. Design Philosophy

The UI is a page from the Society's archives — scholarly, restrained, and subtly dangerous. Every element should feel like it belongs in a world where mages document volatile phenomena with clinical precision and ornamental pride.

### Core Principles

1. **Immersion Through Restraint.** UI elements are artifacts of the world, not overlays on top of it. Panels are specimen dossiers. Buttons are containment wards. Notifications are field reports.
2. **Accessibility as Baseline.** Every player can read the text, distinguish the states, and understand the feedback — regardless of vision, motor ability, or device. Accessibility is not a mode; it is the default.
3. **Nothing Moves Linearly.** All motion uses spring physics or custom easing. When reduced motion is enabled, animations resolve instantly to their goal values — no information is lost.
4. **Dual-Coded Feedback.** Never rely on color alone. Every status is communicated through color AND icon/text/shape. Every interactive state has a non-color indicator (border weight, underline, icon change).

---

## 2. Color System

### 2.1 Primitive Palette

These are the raw color values. They are never used directly in components — always accessed through semantic tokens.

| Token            | Hex       | Usage                            |
|------------------|-----------|----------------------------------|
| `arcane-dark`    | `#0a0a1a` | Deepest background               |
| `arcane-darker`  | `#050510` | Void-depth background            |
| `arcane-purple`  | `#4a2c6a` | Primary accent, interactive      |
| `arcane-purple-light` | `#6b4d8a` | Hover/active states         |
| `arcane-gold`    | `#d4af37` | Display text, ornaments, borders |
| `arcane-gold-light` | `#e8c555` | Highlighted gold elements     |
| `arcane-glow`    | `#8866aa` | Soft ambient glow                |
| `arcane-ember`   | `#ff6b35` | Fire / damage                    |
| `arcane-ice`     | `#4da6ff` | Ice / cooldown                   |
| `arcane-poison`  | `#7cfc00` | Poison / blight                  |

### 2.2 Semantic Color Tokens (CSS Custom Properties)

Components reference these semantic tokens, allowing runtime theme switching (default vs high-contrast). All tokens are defined as CSS custom properties in `src/index.css`.

#### Surfaces

| Token                   | Default Value                                          | Role                        |
|-------------------------|--------------------------------------------------------|-----------------------------|
| `--surface-primary`     | `rgba(10, 10, 26, 0.98)`                              | Panel/card backgrounds      |
| `--surface-secondary`   | `rgba(5, 5, 16, 0.95)`                                | Nested section backgrounds  |
| `--surface-elevated`    | `rgba(74, 44, 106, 0.08)`                             | Stat boxes, hover backfills |
| `--surface-overlay`     | `rgba(0, 0, 0, 0.6)`                                  | Modal backdrops             |

#### Text

| Token                  | Default Value             | Contrast on `--surface-primary` | Role                        |
|------------------------|---------------------------|---------------------------------|-----------------------------|
| `--text-primary`       | `rgba(255, 255, 255, 0.9)` | ~17:1                         | Body text, stat values      |
| `--text-secondary`     | `rgba(255, 255, 255, 0.6)` | ~10:1                         | Descriptions, flavor text   |
| `--text-muted`         | `rgba(255, 255, 255, 0.4)` | ~6:1                          | Timestamps, minor labels    |
| `--text-gold`          | `rgba(212, 175, 55, 0.9)`  | ~7:1                          | Display headings, ornaments |
| `--text-gold-secondary`| `rgba(212, 175, 55, 0.7)`  | ~5.5:1                        | Ability names, tags         |
| `--text-gold-muted`    | `rgba(212, 175, 55, 0.5)`  | ~4:1 (decorative only)        | Section labels, separators  |

> **WCAG AA minimum:** 4.5:1 for normal text, 3:1 for large text (>= 18px or >= 14px bold). All `--text-*` tokens except `--text-gold-muted` meet AA for normal text. `--text-gold-muted` is only used for decorative labels that are always paired with adjacent readable content.

#### Borders

| Token                  | Default Value               | Role                         |
|------------------------|-----------------------------|------------------------------|
| `--border-primary`     | `rgba(212, 175, 55, 0.3)`  | Panel outer frames           |
| `--border-secondary`   | `rgba(212, 175, 55, 0.15)` | Section separators           |
| `--border-subtle`      | `rgba(212, 175, 55, 0.1)`  | Inner wards, stat box edges  |
| `--border-interactive` | `rgba(212, 175, 55, 0.5)`  | Focus rings, active borders  |

#### Status Colors

These are always paired with icons and text labels — never used as the sole differentiator.

| Token              | Default Value | Icon  | Label    |
|--------------------|---------------|-------|----------|
| `--status-damage`  | `#ef4444`     | `⚔`  | DMG      |
| `--status-heal`    | `#4ade80`     | `♥`  | HP       |
| `--status-speed`   | `#fbbf24`     | `⚡` | SPD      |
| `--status-cooldown`| `#60a5fa`     | `⏱`  | CD       |
| `--status-burn`    | `#ef4444`     | 🔥   | Burn     |
| `--status-freeze`  | `#60a5fa`     | ❄️   | Freeze   |
| `--status-poison`  | `#7cfc00`     | ☠️   | Poison   |
| `--status-blight`  | `#a855f7`     | 🦠   | Blight   |
| `--status-shock`   | `#fbbf24`     | ⚡   | Shock    |

### 2.3 High Contrast Mode

When `highContrast` is enabled, CSS custom properties are overridden to increase all contrast ratios. The `:root.high-contrast` class applies these overrides.

| Token (High Contrast)    | Override Value                 | Change                         |
|--------------------------|--------------------------------|--------------------------------|
| `--text-primary`         | `rgba(255, 255, 255, 1.0)`    | Full white                     |
| `--text-secondary`       | `rgba(255, 255, 255, 0.8)`    | Brighter                      |
| `--text-muted`           | `rgba(255, 255, 255, 0.6)`    | Readable on its own            |
| `--text-gold`            | `#e8c555`                      | Lighter gold, higher contrast  |
| `--text-gold-secondary`  | `rgba(232, 197, 85, 0.9)`     | Near-full gold                 |
| `--text-gold-muted`      | `rgba(212, 175, 55, 0.7)`     | Now meets AA                   |
| `--border-primary`       | `rgba(212, 175, 55, 0.5)`     | More visible frame             |
| `--border-interactive`   | `rgba(232, 197, 85, 0.8)`     | Strong focus indicator         |
| `--surface-primary`      | `rgba(5, 5, 16, 1.0)`         | Fully opaque, darker           |

---

## 3. Typography

### 3.1 Font Families

| Role       | Family              | CSS Class      | Usage                                   |
|------------|---------------------|----------------|-----------------------------------------|
| **Display**| Cinzel, serif       | `font-display` | Headings, card names, labels, buttons   |
| **Body**   | Inter, sans-serif   | `font-body`    | Descriptions, stats, effect text        |
| **Mono**   | System monospace    | `font-mono`    | Damage numbers, tick rates, durations   |

### 3.2 Type Scale

All sizes use `clamp()` for fluid scaling and are multiplied by `--ui-scale` for handheld adaptation. The `--text-scale` multiplier (1.0 - 1.5) provides an additional user-controlled size boost for accessibility.

| Token             | Base Clamp                       | Class               | Min Size | Usage                         |
|-------------------|----------------------------------|----------------------|----------|-------------------------------|
| `game-title`      | `clamp(2rem, 5vw, 4.5rem)`      | `text-game-title`    | 32px     | Victory/defeat, hero text     |
| `game-heading`    | `clamp(1.25rem, 2.5vw, 1.875rem)` | `text-game-heading` | 20px     | Panel titles, card names      |
| `game-subheading` | `clamp(1rem, 2vw, 1.5rem)`      | `text-game-subheading` | 16px  | Section headers               |
| `game-body`       | `clamp(0.75rem, 1.2vw, 0.875rem)` | `text-game-body`   | 12px     | Descriptions, flavor text     |
| `game-caption`    | `clamp(0.625rem, 1vw, 0.75rem)` | `text-game-caption`  | 10px     | Stat values, labels           |
| `game-micro`      | `clamp(0.5rem, 0.8vw, 0.625rem)` | `text-game-micro`   | 8px      | Decorative labels, indicators |

### 3.3 Accessibility Text Scale

The `--text-scale` CSS variable (default `1`, range `1.0` - `1.5`) multiplies all font size tokens. Users adjust this in the settings panel. This is independent of `--ui-scale` (which scales all UI including spacing and components for handheld devices).

```css
--font-game-body: calc(clamp(0.75rem, 1.2vw, 0.875rem) * var(--ui-scale) * var(--text-scale));
```

### 3.4 Rules

- **Minimum readable size:** `game-micro` (8px at base) is the absolute floor. Nothing smaller.
- **Decorative text** (`game-micro` at reduced opacity) must always be adjacent to full-contrast readable text — it is supplementary, not informational.
- **All informational text** (stats, descriptions, labels) must use `game-caption` or larger.
- **Never rely on font weight alone** to convey state. Pair with color, border, or icon changes.

---

## 4. Motion & Animation

### 4.1 Motion Principles

1. **Spring-first.** Use `@react-spring/three` or CSS spring-like curves. No linear transitions.
2. **Purposeful.** Every animation communicates state change, draws attention, or provides feedback. No gratuitous motion.
3. **Interruptible.** Animations that respond to input (hover, drag) should be interruptible and redirect smoothly.

### 4.2 Animation Categories

| Category       | Examples                                        | Reduced Motion Behavior           |
|----------------|------------------------------------------------|-----------------------------------|
| **Essential**  | Page transitions, result reveals, toast entry  | Instant (opacity fade only, 150ms) |
| **Feedback**   | Button press, hover glow, slot activation      | Instant state change, no bounce    |
| **Ambient**    | Floating particles, sigil rotation, idle pulse | Disabled entirely                  |
| **Celebratory**| Discovery glow, synthesis burst, victory FX    | Single brief flash (200ms)         |

### 4.3 Reduced Motion Implementation

The game reads `reducedMotion` from `GameSettings` in the `gameStore`. Components check this value and:

1. **CSS animations:** Apply a global `[data-reduced-motion="true"]` attribute to `<html>`. CSS rules disable or simplify animations:
   ```css
   [data-reduced-motion="true"] * {
     animation-duration: 0.01ms !important;
     animation-iteration-count: 1 !important;
     transition-duration: 150ms !important;
   }
   ```
2. **React Spring:** Pass `immediate: true` to `useSpring` when `reducedMotion` is enabled, causing springs to jump to goal values.
3. **Particle systems:** Reduce particle count to 0 or render static placeholder glows.
4. **Camera shake:** Disable `addTrauma()` calls. Impact feedback uses visual flash only.

### 4.4 Respecting OS Preference

On first load, if no user preference is stored, the game checks `window.matchMedia('(prefers-reduced-motion: reduce)')` and sets `reducedMotion` accordingly. The user can always override in settings.

---

## 5. Interactive States

### 5.1 Focus Management

All interactive elements must have visible focus indicators for keyboard and gamepad navigation.

| State     | Visual Treatment                                                        |
|-----------|-------------------------------------------------------------------------|
| **Default** | Element at rest. Border at `--border-subtle` or no border.            |
| **Hover**   | Border brightens to `--border-primary`. Subtle background shift.      |
| **Focus**   | `2px solid var(--border-interactive)` outline with `2px` offset. Must be visible against all backgrounds. |
| **Active**  | Scale to `0.97`. Border at `--border-interactive`. Background shift.  |
| **Disabled**| `opacity: 0.4`. `cursor: not-allowed`. No hover/focus effects.       |

### 5.2 Touch Targets

Per WCAG 2.5.5 and Apple HIG, all interactive elements must have a minimum touch target of **44x44px** on touch (`pointer: coarse`) devices. This is enforced globally in `src/index.css`.

### 5.3 Keyboard Navigation

- All panels and overlays trap focus when open and restore focus on close.
- `Escape` closes the topmost overlay/panel.
- Tab order follows visual reading order (top-to-bottom, left-to-right).
- Card grids are navigable with arrow keys.

---

## 6. Spacing & Layout

### 6.1 Spacing Scale

All spacing uses CSS custom properties with `clamp()` for fluid scaling. Values are defined in `src/index.css` and multiplied by `--ui-scale`.

| Token        | Value                           | Usage                   |
|--------------|---------------------------------|-------------------------|
| `--space-xs` | `clamp(0.25rem, 0.5vw, 0.5rem)` | Tight gaps, icon padding |
| `--space-sm` | `clamp(0.5rem, 1vw, 0.75rem)`  | Section padding          |
| `--space-md` | `clamp(0.75rem, 1.5vw, 1rem)`  | Panel padding            |
| `--space-lg` | `clamp(1rem, 2vw, 1.5rem)`     | Section gaps             |
| `--space-xl` | `clamp(1.5rem, 3vw, 2rem)`     | Major section spacing    |
| `--space-2xl`| `clamp(2rem, 4vw, 3rem)`       | Full-screen overlay gaps |

### 6.2 Component Sizing

Defined in `src/index.css` as CSS custom properties. See the existing design system skill (`_ai_skills/skill_r3f_design_system.md`) for the full token table.

### 6.3 Layout Rules

- **Never hardcode pixel values** for layout-critical dimensions. Use `clamp()`, viewport units, or tokens.
- **Panels** must set `max-height: 85vh` or `92vh` and `overflow-y: auto` to prevent viewport overflow.
- **Card grids** use `flex-1` for equal distribution, never fixed widths.

---

## 7. Iconography & Symbology

### 7.1 Arcane Sigils

The UI uses a consistent set of Unicode symbols as arcane sigils, avoiding emoji where possible for cross-platform consistency.

| Symbol | Usage                               | Semantic Meaning          |
|--------|-------------------------------------|---------------------------|
| `✦`    | Ability markers, synthesis sigils   | Arcane energy / active    |
| `◆`    | Section headers, cardinal marks     | Structural / directional  |
| `❧`    | Corner ornaments on panels          | Decorative frame element  |
| `⬡`    | Empty chamber placeholder           | Awaiting content          |

### 7.2 Rules

- **Never use color-only icons.** If an icon conveys state (active/inactive), pair it with a text label or shape change.
- **Decorative symbols** (ornaments, separators) must have `aria-hidden="true"` or be rendered as CSS pseudo-elements.
- **Status effect icons** (emoji) are always paired with a text label.

---

## 8. Component Patterns

### 8.1 Panel (Dossier)

The standard panel frame used for `CardLorePanel`, `CardBottomSheet`, and crafting chambers.

```
Structure:
┌─ Gold outer border (--border-primary) ─────────────────┐
│ ┌─ Inner ward border (--border-subtle) ──────────────┐ │
│ │ ❧                                              ❧ │ │
│ │   [Content]                                       │ │
│ │ ❧                                              ❧ │ │
│ └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘

Background: --surface-primary (gradient)
Separator: centered gold gradient line (--border-secondary)
```

### 8.2 Section Header

```
◆ SECTION TITLE
```
- Font: `font-display`, `text-game-micro`, `uppercase`, `tracking-[0.15em]`
- Color: `--text-gold-muted`
- Preceded by a separator line

### 8.3 Button (Arcane Frame)

```
Structure:
┌─ Gold border (--border-primary) ─┐
│  BUTTON TEXT (font-display)      │
└──────────────────────────────────┘

Hover: border brightens to --border-interactive, subtle bg shift
Focus: 2px outline at --border-interactive, 2px offset
Active: scale(0.97)
Disabled: opacity 0.4
```

### 8.4 Stat Box

```
┌─ Subtle border (--border-subtle) ─┐
│         ⚔ (status color)          │
│          42 (white, bold)          │
│       DMG (--text-gold-muted)      │
└────────────────────────────────────┘

Background: radial gradient (arcane purple glow center, void edge)
```

### 8.5 Tag / Property Pill

```
┌─ Gold border (--border-secondary) ─┐
│  TAG NAME (--text-gold-secondary)  │
└────────────────────────────────────┘

Background: --surface-elevated
Font: font-display, text-game-micro, uppercase, tracking-wider
```

---

## 9. Accessibility Settings

These settings are stored in `GameSettings` (in `gameStore`) and persisted to localStorage.

| Setting         | Type                                                   | Default   | Effect                                   |
|-----------------|--------------------------------------------------------|-----------|------------------------------------------|
| `reducedMotion` | `boolean`                                              | OS pref   | Disables ambient animation, simplifies transitions |
| `highContrast`  | `boolean`                                              | `false`   | Overrides color tokens for higher contrast |
| `textScale`     | `number` (1.0 - 1.5, step 0.1)                        | `1.0`     | Multiplies all font size tokens          |
| `colorblindMode`| `'none' \| 'protanopia' \| 'deuteranopia' \| 'tritanopia'` | `'none'` | Applies colorblind-safe palette filter   |

### Implementation

1. `gameStore.updateSettings({ highContrast: true })` toggles the `high-contrast` class on `<html>`.
2. `gameStore.updateSettings({ textScale: 1.2 })` sets `--text-scale: 1.2` on `:root`.
3. `gameStore.updateSettings({ reducedMotion: true })` sets `data-reduced-motion="true"` on `<html>`.
4. Components read settings via `useGameStore((s) => s.settings)`.

---

## 10. Lore Integration

### Naming Conventions (Grimoire Voice)

| UI Concept      | Lore Name           | Example Text                                        |
|-----------------|---------------------|-----------------------------------------------------|
| Card details    | Sigil Registry      | "◆ Combat Statistics"                                |
| Card collection | Grimoire            | "Arcane Synthesis"                                   |
| Crafting slots  | Containment Chambers| "CHAMBER I — Awaiting essence"                       |
| Card types      | Pages / Sigils      | "Autonomous Construct"                               |
| Crafting        | Synthesis           | "Dual-sigil fusion protocol"                         |
| Result screen   | Synthesis Complete  | "A new specimen has been catalogued."                 |
| Enemy section   | Threat Assessment   | "Classification Pending"                             |
| Tags            | Properties          | "◆ Properties"                                       |
| Lore text       | Field Notes         | "◆ Field Notes"                                      |
| Card collection | Player's Book       | Book slots in the crafting scene                      |

### Tone Rules

- **Scholarly, not casual.** "Applied Effect" not "Buff/Debuff."
- **Clinical, not dramatic.** "Handle with appropriate precautions" not "BEWARE!"
- **Curious, not omniscient.** "Classification Pending" not "Unknown Enemy."

---

## 11. Files Reference

| File                                   | Role                                    |
|----------------------------------------|-----------------------------------------|
| `src/index.css`                        | CSS custom properties, global styles    |
| `tailwind.config.js`                   | Tailwind theme extension                |
| `src/types/game.ts`                    | `GameSettings` interface                |
| `src/stores/gameStore.ts`              | Settings state management               |
| `src/components/ui/CardLorePanel.tsx`   | Desktop Sigil Registry panel           |
| `src/components/ui/CardBottomSheet.tsx` | Handheld Sigil Registry bottom sheet   |
| `src/components/ui/crafting/CraftingScene.tsx` | Desktop crafting UI              |
| `src/components/ui/crafting/HandheldCraftingScene.tsx` | Handheld crafting UI    |
| `_ai_skills/skill_r3f_design_system.md`| Responsive layout & sizing reference   |
| `_ai_skills/skill_r3f_narrative_designer.md` | Lore voice & tone guide          |
| `_ai_skills/skill_r3f_ui_specialist.md` | UI architecture & patterns            |
| `_ai_skills/skill_r3f_game_feel.md`    | Motion & feedback principles           |
