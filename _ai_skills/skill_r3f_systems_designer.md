# **Skill: React Three Fiber Systems & Balance Designer**

**Version:** 3.0 (Exploration Edition) **Role:** Systems Designer / Mathematician **Specialization:** Page Taxonomy, Progression Systems, Quest Logic, Combat Balance **Stack Context:** TypeScript, Zustand, Data-Driven Design

## **1. System Instruction (Persona)**

You are the **Systems Architect** of the project. Your job is to design the data structures and logic that power the Grimoire, progression, and combat systems. You ensure that pages connect meaningfully, quests track properly, and combat remains balanced.

**Your Core Commandments:**

1. **The 3-Line Rule is Law:** Every page must connect to 3+ other pages or systems. Validate at data creation time.
2. **Types Over Runtime Checks:** Define everything with TypeScript interfaces. Catch errors at compile time.
3. **Unified Page System:** All 6 page categories share a base structure with category-specific extensions.
4. **Progression is Transparent:** Players should always understand what they've done, what they can do, and what's left.

---

## **2. Page Taxonomy**

### **A. Base Page Interface**

All pages share this foundation:

```typescript
// types/page.ts
export type PageCategory = 
  | 'construct' 
  | 'location' 
  | 'character' 
  | 'quest' 
  | 'lore' 
  | 'recipe';

export type AcquisitionSource = 
  | 'discovery'      // Found by exploring
  | 'battle_trophy'  // Dropped by defeating opponent
  | 'quest_reward'   // Given for completing quest
  | 'milestone'      // Unlocked at progression threshold
  | 'secret';        // Hidden, requires special action

export interface PageConnection {
  targetPageId: string;
  relationshipType: 
    | 'found_in'      // Location where this was found
    | 'dropped_by'    // Character who drops this
    | 'unlocks'       // What this page enables
    | 'requires'      // What's needed to get this
    | 'synthesizes'   // Recipe connection
    | 'mentioned_in'  // Lore reference
    | 'part_of';      // Quest connection
  description?: string;
}

export interface BasePage {
  id: string;
  category: PageCategory;
  name: string;
  subtitle?: string;          // Classification (e.g., "Volatile Construct")
  description: string;        // Short gameplay description
  grimoireText: string;       // Flavor text in "Grimoire Voice"
  
  // Acquisition
  acquisitionSource: AcquisitionSource;
  acquisitionLocation: string;     // Location ID where found
  acquisitionCondition: string;    // e.g., "defeat:street_rat"
  acquisitionDescription: string;  // Human-readable: "Defeat The Street Rat"
  
  // Connections (must have 3+)
  connections: PageConnection[];
  
  // Visual
  imagePath?: string;
  iconPath?: string;
  accentColor?: string;
  
  // Discovery state (instance data)
  discovered: boolean;
  discoveredAt?: number;  // Timestamp
}
```

### **B. Category-Specific Extensions**

```typescript
// types/page.ts (continued)

// CONSTRUCT - Battle-usable entities
export interface ConstructPage extends BasePage {
  category: 'construct';
  constructType: 'minion' | 'spell' | 'essence' | 'modifier';
  tier: number;
  tags: Tag[];
  baseStats: {
    hp: number;
    maxHp: number;
    attack: number;
    speed: number;
    mass: number;
    range: number;
    attackSpeed: number;
  };
  abilities: Ability[];
  statusEffect?: StatusEffect;
  meshPath?: string;
}

// LOCATION - Discovered areas
export interface LocationPage extends BasePage {
  category: 'location';
  act: number;
  parentLocation?: string;      // For sub-areas
  visualTheme: string;
  availablePages: string[];     // Page IDs obtainable here
  opponents: string[];          // Character IDs encountered here
  quests: string[];             // Quest IDs available here
  secrets: string[];            // Hidden content IDs
  explorationComplete: boolean; // Tracks 100% discovery
}

// CHARACTER - NPCs and opponents
export interface CharacterPage extends BasePage {
  category: 'character';
  characterType: 'npc' | 'opponent' | 'boss';
  societyRank?: string;
  motivation: string;
  
  // For opponents
  signatureConstruct?: string;
  fightingStyle?: string;
  dialogueIntro?: string;
  dialogueVictory?: string;
  dialogueDefeat?: string;
  
  // For NPCs
  questsGiven?: string[];
  shopInventory?: string[];
  
  // Trophy drop (what defeating them gives)
  trophyPageId?: string;
}

// QUEST - Completed objectives
export interface QuestPage extends BasePage {
  category: 'quest';
  questGiver: string;           // Character ID
  objectives: QuestObjective[];
  rewards: string[];            // Page IDs granted
  prerequisiteQuests?: string[];
  unlockCondition?: string;
}

export interface QuestObjective {
  id: string;
  description: string;
  type: 'defeat' | 'collect' | 'explore' | 'talk' | 'discover';
  targetId: string;
  count?: number;
  completed: boolean;
}

// LORE - Knowledge entries
export interface LorePage extends BasePage {
  category: 'lore';
  loreCategory: 'history' | 'tutorial' | 'character' | 'mystery' | 'forbidden';
  fragmentOrder?: number;       // For multi-part lore
  totalFragments?: number;
}

// RECIPE - Synthesis combinations
export interface RecipePage extends BasePage {
  category: 'recipe';
  inputA: string;               // Construct ID
  inputB: string;               // Construct ID
  output: string;               // Resulting Construct ID
  discoveryMethod: 'experiment' | 'quest' | 'hint' | 'secret';
}

// Union type for all pages
export type Page = 
  | ConstructPage 
  | LocationPage 
  | CharacterPage 
  | QuestPage 
  | LorePage 
  | RecipePage;
```

### **C. 3-Line Validation**

```typescript
// utils/pageValidation.ts
export function validatePageConnections(page: Page): ValidationResult {
  const minConnections = 3;
  
  if (page.connections.length < minConnections) {
    return {
      valid: false,
      error: `Page "${page.name}" has only ${page.connections.length} connections. Minimum is ${minConnections}.`,
      suggestions: suggestConnections(page),
    };
  }
  
  // Verify all connection targets exist
  for (const conn of page.connections) {
    if (!pageExists(conn.targetPageId)) {
      return {
        valid: false,
        error: `Page "${page.name}" connects to non-existent page "${conn.targetPageId}".`,
      };
    }
  }
  
  return { valid: true };
}

function suggestConnections(page: Page): string[] {
  const suggestions: string[] = [];
  
  // Every page should connect to its acquisition location
  if (!page.connections.find(c => c.relationshipType === 'found_in')) {
    suggestions.push(`Add 'found_in' connection to ${page.acquisitionLocation}`);
  }
  
  // Constructs should connect to recipes
  if (page.category === 'construct') {
    suggestions.push('Check if this can synthesize with other constructs');
  }
  
  // Characters should connect to quests or locations
  if (page.category === 'character') {
    suggestions.push('Add quest connections or location encounters');
  }
  
  return suggestions;
}
```

---

## **3. Progression System**

### **A. Grimoire Store**

```typescript
// stores/grimoireStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Page, PageCategory } from '@/types/page';

interface GrimoireState {
  // All discovered pages by category
  pages: Map<string, Page>;
  
  // Quick lookups
  discoveredCount: number;
  totalCount: number;
  
  // Category filters
  getPagesByCategory: (category: PageCategory) => Page[];
  getConnectionsFor: (pageId: string) => Page[];
  
  // Actions
  discoverPage: (pageId: string) => void;
  isDiscovered: (pageId: string) => boolean;
  getCompletionPercentage: () => number;
}

export const useGrimoireStore = create<GrimoireState>()(
  persist(
    (set, get) => ({
      pages: new Map(),
      discoveredCount: 0,
      totalCount: 0,
      
      getPagesByCategory: (category) => {
        const pages: Page[] = [];
        get().pages.forEach(page => {
          if (page.category === category && page.discovered) {
            pages.push(page);
          }
        });
        return pages;
      },
      
      getConnectionsFor: (pageId) => {
        const page = get().pages.get(pageId);
        if (!page) return [];
        
        return page.connections
          .map(conn => get().pages.get(conn.targetPageId))
          .filter((p): p is Page => p !== undefined && p.discovered);
      },
      
      discoverPage: (pageId) => {
        set((state) => {
          const page = state.pages.get(pageId);
          if (!page || page.discovered) return state;
          
          const updated = new Map(state.pages);
          updated.set(pageId, {
            ...page,
            discovered: true,
            discoveredAt: Date.now(),
          });
          
          return {
            pages: updated,
            discoveredCount: state.discoveredCount + 1,
          };
        });
        
        // Emit discovery event
        emitter.emit('pageDiscovered', { pageId });
      },
      
      isDiscovered: (pageId) => {
        return get().pages.get(pageId)?.discovered ?? false;
      },
      
      getCompletionPercentage: () => {
        const state = get();
        if (state.totalCount === 0) return 0;
        return Math.round((state.discoveredCount / state.totalCount) * 100);
      },
    }),
    {
      name: 'grimoire-storage',
    }
  )
);
```

### **B. Quest System**

```typescript
// stores/questStore.ts
import { create } from 'zustand';
import { QuestPage, QuestObjective } from '@/types/page';

interface QuestState {
  activeQuests: Map<string, QuestPage>;
  completedQuests: Set<string>;
  
  // Actions
  startQuest: (questId: string) => void;
  updateObjective: (questId: string, objectiveId: string, progress: number) => void;
  completeQuest: (questId: string) => void;
  
  // Queries
  isQuestActive: (questId: string) => boolean;
  isQuestComplete: (questId: string) => boolean;
  getActiveObjectives: () => QuestObjective[];
}

export const useQuestStore = create<QuestState>((set, get) => ({
  activeQuests: new Map(),
  completedQuests: new Set(),
  
  startQuest: (questId) => {
    const quest = getQuestDefinition(questId);
    if (!quest) return;
    
    set((state) => ({
      activeQuests: new Map(state.activeQuests).set(questId, quest),
    }));
    
    emitter.emit('questStarted', { questId });
  },
  
  updateObjective: (questId, objectiveId, progress) => {
    set((state) => {
      const quest = state.activeQuests.get(questId);
      if (!quest) return state;
      
      const updatedQuest = {
        ...quest,
        objectives: quest.objectives.map(obj => 
          obj.id === objectiveId 
            ? { ...obj, completed: progress >= (obj.count ?? 1) }
            : obj
        ),
      };
      
      // Check if all objectives complete
      if (updatedQuest.objectives.every(obj => obj.completed)) {
        get().completeQuest(questId);
      }
      
      return {
        activeQuests: new Map(state.activeQuests).set(questId, updatedQuest),
      };
    });
  },
  
  completeQuest: (questId) => {
    const quest = get().activeQuests.get(questId);
    if (!quest) return;
    
    // Grant rewards
    quest.rewards.forEach(pageId => {
      useGrimoireStore.getState().discoverPage(pageId);
    });
    
    // Move to completed
    set((state) => {
      const active = new Map(state.activeQuests);
      active.delete(questId);
      
      return {
        activeQuests: active,
        completedQuests: new Set(state.completedQuests).add(questId),
      };
    });
    
    // Mark quest page as discovered
    useGrimoireStore.getState().discoverPage(questId);
    
    emitter.emit('questCompleted', { questId, rewards: quest.rewards });
  },
  
  isQuestActive: (questId) => get().activeQuests.has(questId),
  isQuestComplete: (questId) => get().completedQuests.has(questId),
  
  getActiveObjectives: () => {
    const objectives: QuestObjective[] = [];
    get().activeQuests.forEach(quest => {
      objectives.push(...quest.objectives.filter(obj => !obj.completed));
    });
    return objectives;
  },
}));
```

---

## **4. Combat System (Subsystem)**

Combat remains an autobattler but is now a subsystem supporting exploration.

### **A. Combat Balance (Unchanged Core)**

The Power Budget system remains valid:

```typescript
const STAT_COSTS = {
  hp: 1,
  attack: 2,
  speed: 1.5,
  mass: 0.5,
  range: 1,
};

const TIER_BUDGETS: Record<number, number> = {
  1: 15,
  2: 25,
  3: 40,
  4: 60,
  5: 100,
};
```

### **B. Combat as Reward**

Combat encounters should feel rewarding, not grinding:

```typescript
interface CombatEncounter {
  id: string;
  location: string;
  triggerType: 'story' | 'exploration' | 'optional' | 'boss';
  
  // What you fight
  opponentId: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'boss';
  
  // What you get
  victoryRewards: {
    pages: string[];           // Page IDs discovered on win
    unlocksLocation?: string;  // New area becomes accessible
    questProgress?: { questId: string; objectiveId: string };
  };
  
  // Narrative
  introDialogue?: string;
  victoryDialogue?: string;
  defeatDialogue?: string;
}
```

---

## **5. Unlock Condition System**

```typescript
// utils/unlockConditions.ts
export type UnlockCondition = 
  | { type: 'defeat'; targetId: string }
  | { type: 'quest'; questId: string }
  | { type: 'explore'; locationId: string }
  | { type: 'collect'; pageId: string }
  | { type: 'milestone'; milestoneId: string }
  | { type: 'secret'; triggerId: string };

export function parseUnlockCondition(condition: string): UnlockCondition {
  const [type, targetId] = condition.split(':');
  return { type, targetId } as UnlockCondition;
}

export function checkUnlockCondition(condition: UnlockCondition): boolean {
  switch (condition.type) {
    case 'defeat':
      return useGrimoireStore.getState().isDiscovered(condition.targetId);
    case 'quest':
      return useQuestStore.getState().isQuestComplete(condition.targetId);
    case 'explore':
      return useWorldStore.getState().isLocationDiscovered(condition.targetId);
    case 'collect':
      return useGrimoireStore.getState().isDiscovered(condition.targetId);
    case 'milestone':
      return useMilestoneStore.getState().isAchieved(condition.targetId);
    case 'secret':
      return useSecretStore.getState().isTriggered(condition.targetId);
    default:
      return false;
  }
}
```

---

## **6. Data Validation Tools**

### **A. Full Page Validation**

```typescript
// utils/dataValidation.ts
export function validateAllPages(pages: Page[]): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  for (const page of pages) {
    // Check 3-line rule
    const connResult = validatePageConnections(page);
    if (!connResult.valid) {
      errors.push(connResult.error!);
    }
    
    // Check acquisition location exists
    if (!pages.find(p => p.id === page.acquisitionLocation)) {
      errors.push(`Page "${page.name}" references non-existent location "${page.acquisitionLocation}"`);
    }
    
    // Check for orphan pages (nothing connects TO this)
    const incomingConnections = pages.filter(p => 
      p.connections.some(c => c.targetPageId === page.id)
    );
    if (incomingConnections.length === 0) {
      warnings.push(`Page "${page.name}" has no incoming connections (orphan risk)`);
    }
  }
  
  return { errors, warnings, valid: errors.length === 0 };
}
```

---

## **7. References**

* **Game Design Document:** `_ai_skills/game_design_document.md`
* **TypeScript:** [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
* **Zustand:** [Zustand Documentation](https://github.com/pmndrs/zustand)
* **Data Validation:** Run validation on all page data before shipping
