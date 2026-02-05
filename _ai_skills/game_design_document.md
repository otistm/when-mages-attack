# **Game Design Document: "When Things Attack"**

**Version:** 3.0 (Exploration Edition) **Status:** Pre-Production **Engine:** React Three Fiber + Vite **Target Platforms:** Web (Primary)

---

## **1. Vision Statement**

"When Things Attack" is a **3D exploration adventure** set in the underground domain of a Secret Mage Society. Players explore atmospheric environments, discover the world's secrets, and collect **Grimoire Pages** that document their journey. Combat encounters punctuate exploration as exciting set-pieces, using an autobattler system where crafted constructs fight on your behalf.

**The Hook:** *Your Grimoire is your journal of conquest. Every page tells a story of where you've been and what you've overcome.*

---

## **2. Design Pillars**

| Pillar | Definition | Execution |
|--------|------------|-----------|
| **The Living Grimoire** | Every page is a meaningful discovery. Collection IS the game. | 6 page categories, 50+ pages per act, each with acquisition story |
| **World as Character** | Locations have personality, secrets, moods. They invite exploration. | Distinct visual themes, environmental storytelling, hidden areas |
| **Combat as Punctuation** | Battles are exciting moments WITHIN exploration, not the whole game. | 5 min explore → encounter → reward → continue. Combat is spectacle. |
| **The 3-Line Web** | Everything connects to 3+ other things. No orphan content. | Pages reference locations, characters, recipes, quests. Web of meaning. |

---

## **3. Core Loop**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   EXPLORE          DISCOVER         ENCOUNTER        PROGRESS   │
│   ───────>         ───────>         ───────>         ───────>   │
│                                                                 │
│   Walk through     Find pages,      Combat or        Pages add  │
│   3D environments  secrets, NPCs    NPC events       to Grimoire│
│                                                                 │
│                         ↑                                 │     │
│                         └─────────────────────────────────┘     │
│                              (New areas unlock)                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### **3.1 Exploration Phase**
- Player moves through 3D environments in first/third person
- Interacts with objects, examines details, talks to NPCs
- Discovers hidden paths, collects items, triggers events
- Emotional arc: Wonder → Curiosity → Dread → Understanding

### **3.2 Discovery Phase**
- Finding a new area grants a **Location Page**
- Meeting an NPC grants a **Character Page**
- Completing objectives grants **Quest Pages**
- Learning secrets grants **Lore Pages**
- Each discovery is celebrated with visual/audio feedback

### **3.3 Encounter Phase**
- Combat encounters are triggered by story events or exploration
- Uses autobattler system: player's **Construct Pages** fight automatically
- Synthesis (crafting) creates stronger constructs
- Victory grants **Battle Trophy** pages and unlocks new areas

### **3.4 Progression Phase**
- New pages unlock new recipes, new areas, new story beats
- The Grimoire fills with evidence of your journey
- The 3-Line Web means every discovery leads to more discoveries

---

## **4. The Grimoire System**

The Grimoire is the central UI and progression system. It contains ALL knowledge the player has acquired.

### **4.1 Page Categories**

| Category | Icon | Purpose | Examples |
|----------|------|---------|----------|
| **Construct** | ⚔️ | Battle-usable minions, spells, essences | Sentient Slime, Rusty Shiv, Pyric Essence |
| **Location** | 📍 | Places discovered in the world | The Undercroft, Drainage Tunnels |
| **Character** | 👤 | NPCs met, opponents defeated | Vesper, The Quartermaster, The Street Rat |
| **Quest** | 📜 | Objectives completed (become trophies) | "Repair the Generator", "First Steps" |
| **Lore** | 📖 | Knowledge, history, secrets uncovered | "The Art of Synthesis", "The First Circle" |
| **Recipe** | ⚗️ | Synthesis combinations discovered | Rusty Shiv + Pyric Essence = Searing Blade |

### **4.2 The 3-Line Rule**

Every page must have **at least 3 meaningful connections** to other content:

```
Example: Rusty Shiv (Construct Page)
├── Connection 1: Dropped by The Street Rat (Character Page)
├── Connection 2: Found in The Undercroft (Location Page)
├── Connection 3: Synthesizes into Searing Blade (Recipe Page)
└── Connection 4: Part of quest "Arm Yourself" (Quest Page)
```

This ensures nothing feels like filler—every page matters.

### **4.3 Page Acquisition Sources**

| Source | Feeling | Example |
|--------|---------|---------|
| **Discovery** | "I found this in a forgotten place" | Sentient Slime in drainage pipe |
| **Battle Trophy** | "I took this from a worthy opponent" | Rusty Shiv from The Street Rat |
| **Quest Reward** | "I earned this through service" | Old Battery from generator quest |
| **Milestone** | "I've grown strong enough" | Potted Cactus at Rank 3 |
| **Secret** | "I discovered something hidden" | Strange Meat behind false wall |

---

## **5. World & Narrative**

### **5.1 The Setting**

The world is ruled by Mages, but the true tests of power happen in the shadows. A **Secret Society** sends wax-sealed invitations to up-and-coming spellcasters, inviting them to an underground domain to learn the forbidden art of **Living Synthesis**.

### **5.2 The Player Role**

You are an **Initiate**—newly invited to the Society. Your journey takes you from curious newcomer to someone who uncovers dark truths about Synthesis and the Society's history.

### **5.3 Emotional Arc**

| Act | Location | Tone | Player Feeling |
|-----|----------|------|----------------|
| 1 | The Undercroft | Adventure | "This is exciting! What's around the corner?" |
| 2 | The Arena District | Competition | "I'm proving myself. Who are my rivals?" |
| 3 | The Laboratory Wing | Dread | "Something is wrong here. What happened?" |
| 4 | The Spire | Revelation | "Now I understand. What do I do with this truth?" |

### **5.4 Chapter Locations**

Each act takes place in a distinct region:

**Act 1: The Undercroft** — *"Where all initiates begin - in the dark."*
Gothic catacombs, ritual circles, caged specimens. 9 explorable sub-locations.

**Act 2: The Arena District** — *"Cheers above. Blood below."*
Tournament grounds, spectator galleries, betting halls. Competition and rivalry.

**Act 3: The Laboratory Wing** — *"Some doors should stay locked."*
Mad science aesthetic, failed experiments, forbidden archives. Horror elements.

**Act 4: The Spire** — *"The truth is written here - for those who dare read it."*
Towering bookshelves, floating platforms, reality distortion. Revelation.

---

## **6. Combat System**

Combat uses an **autobattler** system where the player's Construct Pages fight automatically.

### **6.1 Combat Flow**

1. **Encounter Triggered** — Story event or exploration discovery
2. **Deployment** — Player places Constructs from their Grimoire
3. **Battle** — Constructs fight automatically, player watches
4. **Resolution** — Victory grants pages, defeat allows retry

### **6.2 Synthesis (Crafting)**

Combines two pages to create a more powerful result:
- **Tag-based logic:** [Fire] + [Weapon] = Flaming Weapon
- **Recipes discovered** become Recipe Pages in the Grimoire
- Encourages experimentation and collection

### **6.3 Combat Feel**

Combat is a **spectacle**—a reward for exploration, not a grind:
- Quick battles (30-60 seconds)
- Impactful visuals and audio
- Clear winners/losers visible at a glance
- Victory feels earned, defeat feels fair

---

## **7. Technical Architecture**

### **7.1 Technology Stack**

| Category | Technology |
|----------|------------|
| **Framework** | React 18+ with TypeScript |
| **3D Engine** | React Three Fiber (R3F) + Three.js |
| **State Management** | Zustand |
| **Animation** | @react-spring/three |
| **Physics** | @react-three/rapier |
| **UI** | React + Tailwind CSS |
| **Audio** | Howler.js + Web Audio API |
| **Build Tool** | Vite |

### **7.2 Project Structure**

```
src/
├── components/
│   ├── three/
│   │   ├── exploration/     # Player controller, interaction system
│   │   ├── locations/       # Act-specific environments
│   │   │   ├── undercroft/
│   │   │   ├── arena/
│   │   │   └── laboratory/
│   │   ├── combat/          # Battle arena, minions, effects
│   │   └── effects/         # Particles, shaders, VFX
│   └── ui/
│       ├── grimoire/        # Page browser, category tabs
│       ├── exploration/     # Minimal HUD, interaction prompts
│       ├── dialogue/        # NPC conversations
│       └── combat/          # Battle UI
├── stores/
│   ├── worldStore.ts        # Location discovery, current location
│   ├── grimoireStore.ts     # All collected pages
│   ├── questStore.ts        # Quest state, flags
│   ├── combatStore.ts       # Battle state
│   └── gameStore.ts         # Meta state, saves
├── data/
│   ├── pages/               # All page definitions by category
│   ├── locations/           # Location definitions
│   ├── quests/              # Quest definitions
│   └── recipes/             # Synthesis recipes
├── types/
│   ├── page.ts              # Base page + category extensions
│   ├── location.ts
│   ├── quest.ts
│   └── game.ts
└── ...
```

### **7.3 Key Systems**

| System | Responsibility |
|--------|---------------|
| **Exploration Controller** | Player movement, camera, interaction |
| **World State** | Tracks discovered locations, triggers, flags |
| **Grimoire Manager** | Page collection, category browsing, connections |
| **Quest System** | Objective tracking, completion, rewards |
| **Combat Manager** | Battle initiation, resolution, rewards |
| **Scene Loader** | Async loading of location assets |

---

## **8. Development Phases**

### **Phase 1: Vertical Slice (8-12 weeks)**

Prove the concept with ONE complete experience:
- **The Initiation Chamber** — Single explorable room
- 2 discoverable pages (Location + Lore)
- 1 NPC encounter (Vesper)
- 1 combat encounter (The Nervous Initiate)
- Grimoire UI showing acquired pages
- **Goal:** Can a player spend 15 minutes here and want more?

### **Phase 2: Act 1 Expansion (16-24 weeks)**

If vertical slice succeeds:
- Expand to all 9 Undercroft locations
- Add all 12 Act 1 characters
- Implement all 10 Act 1 quests
- 50+ pages total
- Ship as "Act 1: The Undercroft" (Early Access)

### **Phase 3: Full Campaign (Post-EA)**

- Acts 2-4
- Branching paths
- Multiple endings
- 200+ total pages

---

## **9. Aesthetic Direction**

### **9.1 Visual Style**

- **Art Direction:** "Arcane Punk" / "Secret Society Gothic"
- **References:** *Arcane*, *Hades*, *Hollow Knight*, *Inscryption*
- **Atmosphere:** Dark, moody with vibrant magical accents
- **Exploration:** Immersive, detailed environments that reward looking closely
- **Combat:** Stylized, readable, "Saturday morning cartoon villain" energy

### **9.2 Audio Direction**

- **Exploration:** Ambient, atmospheric, location-specific soundscapes
- **Discovery:** Satisfying stingers when pages are collected
- **Combat:** Energetic, punchy, distinct from exploration quiet
- **NPCs:** Personality through sound (not necessarily voice acting)

---

## **10. Success Metrics**

| Metric | Target | How Measured |
|--------|--------|--------------|
| **Session Length** | 20+ minutes | Analytics |
| **Exploration Engagement** | Players visit 80%+ of Act 1 areas | Completion tracking |
| **Collection Drive** | 60%+ of players fill Grimoire to 75% | Page acquisition data |
| **Return Rate** | 40%+ return for session 2 | Retention analytics |
| **Emotional Response** | Players describe "wanting to know more" | Feedback surveys |
