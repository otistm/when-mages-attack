# **Skill: React Three Fiber UI/UX Specialist**

**Version:** 3.0 (Exploration Edition) **Role:** UI Engineer / Interface Designer **Specialization:** Grimoire UI, Exploration HUD, Dialogue Systems, Discovery Feedback **Stack Context:** React, Tailwind CSS, @react-three/drei Html, Framer Motion

## **1. System Instruction (Persona)**

You are a **UI/UX Specialist** for an exploration-focused game. Your UI must enhance immersion, not break it. Exploration UI should be minimal; the Grimoire should be comprehensive. Discovery moments need celebration.

**Your Core Commandments:**

1. **Immersion First:** During exploration, UI should be nearly invisible. Only show what's necessary.
2. **Grimoire as Hub:** The Grimoire is the central UI—it must be beautiful, navigable, and satisfying to browse.
3. **Discovery Celebration:** When players find something, they should FEEL it through UI feedback.
4. **Tailwind for Speed:** Use Tailwind CSS for rapid iteration.
5. **State in Zustand:** UI reads from stores, doesn't manage game state.

---

## **2. UI Architecture**

### **A. Three UI Modes**

| Mode | Description | Visibility |
|------|-------------|------------|
| **Exploration HUD** | Minimal overlay during movement | Almost invisible |
| **Grimoire** | Full-screen collection browser | Full takeover |
| **Dialogue** | NPC conversation interface | Partial overlay |
| **Combat** | Battle UI (existing) | Focused overlay |

### **B. App Structure**

```tsx
// App.tsx
import { Canvas } from '@react-three/fiber';
import { useGameStore } from '@/stores/gameStore';
import { useUIStore } from '@/stores/uiStore';

function App() {
  const phase = useGameStore((s) => s.phase);
  const grimoireOpen = useUIStore((s) => s.grimoireOpen);
  const dialogueActive = useUIStore((s) => s.dialogueActive);
  
  return (
    <div className="relative w-screen h-screen bg-arcane-dark">
      {/* 3D Canvas */}
      <Canvas camera={{ position: [0, 2, 5], fov: 60 }}>
        <Suspense fallback={null}>
          <ExplorationScene />
        </Suspense>
      </Canvas>
      
      {/* UI Layers */}
      <ExplorationHUD />
      {grimoireOpen && <GrimoireUI />}
      {dialogueActive && <DialogueUI />}
      {phase === 'combat' && <CombatHUD />}
      
      {/* Notification Layer - always on top */}
      <DiscoveryNotifications />
    </div>
  );
}
```

---

## **3. Exploration HUD (Minimal)**

During exploration, less is more.

### **A. Layout**

```tsx
// components/ui/exploration/ExplorationHUD.tsx
import { useUIStore } from '@/stores/uiStore';
import { useInteractionStore } from '@/stores/interactionStore';
import { motion, AnimatePresence } from 'framer-motion';

export function ExplorationHUD() {
  const canInteract = useInteractionStore((s) => s.canInteract);
  const hoveredObject = useInteractionStore((s) => s.hoveredObject);
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Center Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-1 h-1 bg-white/50 rounded-full" />
      </div>
      
      {/* Interaction Prompt */}
      <AnimatePresence>
        {canInteract && hoveredObject && (
          <InteractionPrompt object={hoveredObject} />
        )}
      </AnimatePresence>
      
      {/* Grimoire Toggle (corner) */}
      <button 
        className="absolute bottom-4 right-4 p-3 bg-arcane-purple/60 
                   rounded-full hover:bg-arcane-purple transition-colors
                   pointer-events-auto"
        onClick={() => useUIStore.getState().openGrimoire()}
      >
        <BookIcon className="w-6 h-6 text-arcane-gold" />
      </button>
      
      {/* Quest Hint (subtle) */}
      <QuestHint />
    </div>
  );
}
```

### **B. Interaction Prompt**

```tsx
// components/ui/exploration/InteractionPrompt.tsx
import { motion } from 'framer-motion';

interface InteractionPromptProps {
  object: {
    prompt: string;  // "Examine", "Talk", "Collect"
    name?: string;   // Object name if known
  };
}

export function InteractionPrompt({ object }: InteractionPromptProps) {
  return (
    <motion.div
      className="absolute bottom-1/3 left-1/2 -translate-x-1/2
                 bg-black/60 px-4 py-2 rounded-lg backdrop-blur-sm"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
    >
      <div className="flex items-center gap-2 text-white">
        <kbd className="px-2 py-0.5 bg-arcane-purple rounded text-sm">E</kbd>
        <span>{object.prompt}</span>
        {object.name && (
          <span className="text-arcane-gold">{object.name}</span>
        )}
      </div>
    </motion.div>
  );
}
```

### **C. Quest Hint (Subtle)**

```tsx
// components/ui/exploration/QuestHint.tsx
import { useQuestStore } from '@/stores/questStore';

export function QuestHint() {
  const objectives = useQuestStore((s) => s.getActiveObjectives());
  const currentObjective = objectives[0]; // Show one at a time
  
  if (!currentObjective) return null;
  
  return (
    <div className="absolute top-4 left-4 text-white/60 text-sm">
      <span className="text-arcane-gold/60">◇</span>{' '}
      {currentObjective.description}
    </div>
  );
}
```

---

## **4. Grimoire UI (Full System)**

The Grimoire is the heart of the game. It must be satisfying to browse.

### **A. Layout Structure**

```tsx
// components/ui/grimoire/GrimoireUI.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';
import { PageCategory } from '@/types/page';

export function GrimoireUI() {
  const [selectedCategory, setSelectedCategory] = useState<PageCategory>('construct');
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const closeGrimoire = useUIStore((s) => s.closeGrimoire);
  
  return (
    <motion.div
      className="fixed inset-0 z-50 bg-arcane-dark/95 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center
                      border-b border-arcane-purple/30">
        <h1 className="text-3xl font-display text-arcane-gold">Grimoire</h1>
        <div className="flex items-center gap-4">
          <CompletionProgress />
          <button
            onClick={closeGrimoire}
            className="p-2 text-white/60 hover:text-white transition-colors"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
      
      {/* Main Layout */}
      <div className="absolute top-20 bottom-0 left-0 right-0 flex">
        {/* Category Tabs (Left) */}
        <CategoryTabs 
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
        
        {/* Page Grid (Center) */}
        <div className="flex-1 p-6 overflow-y-auto">
          <PageGrid 
            category={selectedCategory}
            selectedPage={selectedPage}
            onSelectPage={setSelectedPage}
          />
        </div>
        
        {/* Page Detail (Right) */}
        <AnimatePresence>
          {selectedPage && (
            <PageDetail 
              pageId={selectedPage}
              onClose={() => setSelectedPage(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
```

### **B. Category Tabs**

```tsx
// components/ui/grimoire/CategoryTabs.tsx
import { PageCategory } from '@/types/page';
import { useGrimoireStore } from '@/stores/grimoireStore';

const CATEGORIES: { id: PageCategory; icon: string; label: string }[] = [
  { id: 'construct', icon: '⚔️', label: 'Constructs' },
  { id: 'location', icon: '📍', label: 'Locations' },
  { id: 'character', icon: '👤', label: 'Characters' },
  { id: 'quest', icon: '📜', label: 'Quests' },
  { id: 'lore', icon: '📖', label: 'Lore' },
  { id: 'recipe', icon: '⚗️', label: 'Recipes' },
];

export function CategoryTabs({ 
  selected, 
  onSelect 
}: { 
  selected: PageCategory;
  onSelect: (cat: PageCategory) => void;
}) {
  const getCount = useGrimoireStore((s) => s.getPagesByCategory);
  
  return (
    <div className="w-48 border-r border-arcane-purple/30 p-4">
      <div className="space-y-2">
        {CATEGORIES.map((cat) => {
          const count = getCount(cat.id).length;
          const isActive = selected === cat.id;
          
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg
                         transition-colors text-left
                         ${isActive 
                           ? 'bg-arcane-purple text-white' 
                           : 'text-white/60 hover:text-white hover:bg-arcane-purple/30'
                         }`}
            >
              <span className="text-xl">{cat.icon}</span>
              <span className="flex-1">{cat.label}</span>
              <span className="text-sm opacity-60">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

### **C. Page Grid**

```tsx
// components/ui/grimoire/PageGrid.tsx
import { useGrimoireStore } from '@/stores/grimoireStore';
import { PageCategory } from '@/types/page';
import { motion } from 'framer-motion';

export function PageGrid({ 
  category, 
  selectedPage, 
  onSelectPage 
}: {
  category: PageCategory;
  selectedPage: string | null;
  onSelectPage: (id: string) => void;
}) {
  const pages = useGrimoireStore((s) => s.getPagesByCategory(category));
  
  return (
    <div className="grid grid-cols-4 gap-4">
      {pages.map((page, index) => (
        <motion.button
          key={page.id}
          onClick={() => onSelectPage(page.id)}
          className={`aspect-[3/4] rounded-lg border-2 p-3 text-left
                     transition-all overflow-hidden
                     ${selectedPage === page.id
                       ? 'border-arcane-gold bg-arcane-purple/50'
                       : 'border-arcane-purple/30 bg-arcane-dark/50 hover:border-arcane-gold/50'
                     }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          {/* Page thumbnail */}
          <div className="w-full h-2/3 bg-arcane-purple/20 rounded mb-2">
            {page.imagePath && (
              <img 
                src={page.imagePath} 
                alt={page.name}
                className="w-full h-full object-cover rounded"
              />
            )}
          </div>
          
          {/* Page name */}
          <div className="text-white text-sm font-medium truncate">
            {page.name}
          </div>
          
          {/* Subtitle */}
          <div className="text-white/40 text-xs truncate">
            {page.subtitle}
          </div>
        </motion.button>
      ))}
      
      {pages.length === 0 && (
        <div className="col-span-4 text-center text-white/40 py-12">
          No pages discovered in this category yet.
        </div>
      )}
    </div>
  );
}
```

### **D. Page Detail Panel**

```tsx
// components/ui/grimoire/PageDetail.tsx
import { useGrimoireStore } from '@/stores/grimoireStore';
import { motion } from 'framer-motion';

export function PageDetail({ 
  pageId, 
  onClose 
}: { 
  pageId: string;
  onClose: () => void;
}) {
  const pages = useGrimoireStore((s) => s.pages);
  const page = pages.get(pageId);
  const connections = useGrimoireStore((s) => s.getConnectionsFor(pageId));
  
  if (!page) return null;
  
  return (
    <motion.div
      className="w-96 border-l border-arcane-purple/30 bg-arcane-dark/80
                 overflow-y-auto"
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-display text-arcane-gold">
              {page.name}
            </h2>
            <p className="text-white/60 text-sm">{page.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/40 hover:text-white"
          >
            ×
          </button>
        </div>
        
        {/* Image */}
        {page.imagePath && (
          <div className="w-full aspect-video bg-arcane-purple/20 rounded-lg mb-4">
            <img 
              src={page.imagePath} 
              alt={page.name}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
        )}
        
        {/* Description */}
        <div className="mb-6">
          <h3 className="text-white/60 text-sm mb-2">Description</h3>
          <p className="text-white">{page.description}</p>
        </div>
        
        {/* Grimoire Text (flavor) */}
        <div className="mb-6 p-4 bg-arcane-purple/10 rounded-lg border border-arcane-purple/20">
          <p className="text-white/80 italic text-sm leading-relaxed">
            "{page.grimoireText}"
          </p>
        </div>
        
        {/* Connections */}
        {connections.length > 0 && (
          <div>
            <h3 className="text-white/60 text-sm mb-2">Connections</h3>
            <div className="space-y-2">
              {connections.map((conn) => (
                <button
                  key={conn.id}
                  className="w-full flex items-center gap-2 p-2 rounded
                             bg-arcane-purple/10 hover:bg-arcane-purple/20
                             text-left transition-colors"
                  onClick={() => {/* Navigate to connection */}}
                >
                  <span className="text-lg">
                    {getCategoryIcon(conn.category)}
                  </span>
                  <span className="text-white text-sm">{conn.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Acquisition Info */}
        <div className="mt-6 pt-4 border-t border-arcane-purple/20">
          <p className="text-white/40 text-xs">
            Discovered: {formatDate(page.discoveredAt)}
          </p>
          <p className="text-white/40 text-xs">
            {page.acquisitionDescription}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
```

---

## **5. Discovery Notifications**

When players discover something, celebrate it!

```tsx
// components/ui/DiscoveryNotifications.tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { emitter } from '@/utils/events';

interface Notification {
  id: string;
  type: 'page' | 'location' | 'quest';
  title: string;
  subtitle: string;
}

export function DiscoveryNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  useEffect(() => {
    const handlePageDiscovered = ({ pageId }: { pageId: string }) => {
      const page = getPageById(pageId);
      if (!page) return;
      
      const notification: Notification = {
        id: `${Date.now()}-${pageId}`,
        type: 'page',
        title: 'New Page Discovered',
        subtitle: page.name,
      };
      
      setNotifications((prev) => [...prev, notification]);
      
      // Auto-remove after 4 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      }, 4000);
    };
    
    emitter.on('pageDiscovered', handlePageDiscovered);
    return () => emitter.off('pageDiscovered', handlePageDiscovered);
  }, []);
  
  return (
    <div className="fixed top-20 right-4 z-[100] space-y-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            className="bg-arcane-purple/90 backdrop-blur-sm rounded-lg p-4
                       border border-arcane-gold/50 shadow-lg
                       min-w-[280px]"
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-arcane-gold/20 rounded-full
                              flex items-center justify-center">
                <span className="text-xl">📜</span>
              </div>
              <div>
                <div className="text-arcane-gold text-sm font-medium">
                  {notification.title}
                </div>
                <div className="text-white font-display">
                  {notification.subtitle}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

---

## **6. Dialogue UI**

For NPC conversations:

```tsx
// components/ui/dialogue/DialogueUI.tsx
import { useDialogueStore } from '@/stores/dialogueStore';
import { motion } from 'framer-motion';

export function DialogueUI() {
  const currentNode = useDialogueStore((s) => s.currentNode);
  const selectResponse = useDialogueStore((s) => s.selectResponse);
  
  if (!currentNode) return null;
  
  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 p-8"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
    >
      {/* Dialogue Box */}
      <div className="max-w-3xl mx-auto">
        <div className="bg-arcane-dark/95 backdrop-blur-sm rounded-xl
                        border border-arcane-purple/50 p-6">
          {/* Speaker */}
          <div className="text-arcane-gold font-display text-lg mb-2">
            {currentNode.speaker}
          </div>
          
          {/* Dialogue Text */}
          <p className="text-white text-lg leading-relaxed mb-6">
            {currentNode.text}
          </p>
          
          {/* Responses */}
          {currentNode.responses && (
            <div className="space-y-2">
              {currentNode.responses.map((response, index) => (
                <button
                  key={index}
                  onClick={() => selectResponse(response)}
                  className="w-full text-left p-3 rounded-lg
                             bg-arcane-purple/20 hover:bg-arcane-purple/40
                             border border-arcane-purple/30 hover:border-arcane-gold/50
                             text-white transition-colors"
                >
                  {response.text}
                </button>
              ))}
            </div>
          )}
          
          {/* Continue prompt (if no responses) */}
          {!currentNode.responses && (
            <div className="text-white/40 text-sm text-center">
              Press <kbd className="px-2 py-0.5 bg-arcane-purple rounded">E</kbd> to continue
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
```

---

## **7. Tailwind Configuration**

```javascript
// tailwind.config.js
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        arcane: {
          dark: '#0a0a1a',
          purple: '#4a2c6a',
          gold: '#d4af37',
          glow: '#8866aa',
        },
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
};
```

---

## **8. Handheld Layout System**

The game supports a dual-layout system for handheld devices (ROG Ally, Steam Deck, etc.). When `useLayoutMode()` returns `'handheld'`, the UI switches to touch-optimized layouts.

### **A. Combat (HandheldGameLayout)**

- Arena fills the full screen
- Enemy cards are hidden (autobattler - they fight automatically)
- HP bars become compact 12px overlay bars at the top/bottom of the arena
- Player cards go in a horizontal scrollable tray at the bottom (~25vh)
- Tapping a card opens a `CardBottomSheet` (bottom drawer) instead of the side `CardLorePanel`
- All tap targets are at least 44x44px

### **B. Crafting (HandheldCraftingScene)**

- Uses **tap-to-place** instead of drag-and-drop
- Crafting chambers are compact side-by-side
- Grimoire pages are in a horizontal scrollable strip
- Book slots are in a horizontal scrollable strip with larger targets
- Long-press a card to see its details in a `CardBottomSheet`
- Ready button spans full width

### **C. Tap-to-Place Interaction**

State managed in `useUIStore`:

```tsx
const selectedCardForPlacement = useUIStore(s => s.selectedCardForPlacement);
const setSelectedCardForPlacement = useUIStore(s => s.setSelectedCardForPlacement);
```

Flow: tap a page to select → tap a slot to place → tap again to deselect.

### **D. Layout Mode Toggle**

The `UIScaleControl` panel (gear icon, bottom-left) includes a desktop/handheld toggle with visual icons and a toggle switch. Users can force either layout regardless of their device.

### **E. Key Files**

- `src/hooks/useLayoutMode.ts` — mode detection and toggle
- `src/hooks/useIsTouchDevice.ts` — touch detection
- `src/components/ui/HandheldGameLayout.tsx` — handheld combat
- `src/components/ui/HandheldCardTray.tsx` — horizontal card strip
- `src/components/ui/CardBottomSheet.tsx` — bottom sheet card details
- `src/components/ui/crafting/HandheldCraftingScene.tsx` — handheld crafting

---

## **9. References**

* **Tailwind CSS:** [Official Documentation](https://tailwindcss.com/docs)
* **Framer Motion:** [Animation Library](https://www.framer.com/motion/)
* **Game Design Document:** `_ai_skills/game_design_document.md`
