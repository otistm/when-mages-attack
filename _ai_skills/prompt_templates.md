# **Master Prompt Templates for "When Things Attack"**

**Usage:** Copy these prompts directly into Cursor Composer (Cmd+I / Ctrl+I). **Prerequisite:** Ensure your \_ai\_skills folder contains all 10 Skill Markdown files for React Three Fiber.

## **1. Project Initialization (Start Here)**

Use this to set up the skeleton of your game correctly from Day 1.

### **Template: Project Skeleton & Core Systems**

**Context:** I am starting the project. **Task:** Initialize the folder structure and core systems.

1. **@skill\_r3f\_dev\_environment:** Set up the Vite project with TypeScript, install all R3F dependencies (fiber, drei, rapier, react-spring, zustand, howler).  
2. **@skill\_r3f\_lead\_architect:** Create the folder structure (components/three, components/ui, stores, hooks, types) based on the "Feature Domain" standard.  
3. **@skill\_r3f\_lead\_architect:** Create the core Zustand stores (gameStore, craftingStore, arenaStore, audioStore) with TypeScript interfaces.
4. **@skill\_r3f\_dev\_environment:** Configure Tailwind CSS and set up the base styles with our "Arcane Punk" color palette.

## **2. Gameplay Systems (The Brain)**

Use these when building the mechanics (Crafting, Combat, Movement).

### **Template: The Crafting System Logic**

**Context:** I need to implement the core Crafting logic. **Task:** Build the CraftingManager.

1. **@skill\_product\_manager:** Verify my rule: "Crafting must be intuitive (Tag-based)." Reject any random-number generation logic.  
2. **@skill\_r3f\_systems\_designer:** Define the TypeScript interfaces for CardDefinition, CardInstance, and CardStats.
3. **@skill\_r3f\_systems\_designer:** Write the `synthesizeCards()` function. It should merge Tags, average Stats, and apply a synergy multiplier.  
4. **@skill\_r3f\_lead\_architect:** Create the craftingStore Zustand slice with actions for addToInventory, removeFromInventory, and craftCards.
5. **@skill\_r3f\_game\_feel:** Add a recipe discovery animation hook that we can trigger when a new combination is found.

### **Template: The Spatial Arena (Movement)**

**Context:** I need minions to move down lanes. **Task:** Create the Arena and movement system.

1. **@skill\_r3f\_scene\_designer:** Set up the Arena.tsx component with greyboxed lanes, spawn circles, and throne positions.
2. **@skill\_r3f\_lead\_architect:** Create a Minion component with RigidBody physics using @react-three/rapier.
3. **@skill\_r3f\_lead\_architect:** Write a `useMinionBehavior` hook that handles state (Idle → Move → Attack) using useFrame.
4. **@skill\_r3f\_scene\_designer:** Add physics colliders for arena boundaries and kill zones.

## **3. Content Generation (New Cards/Units)**

**This is your bread and butter.** Use this every time you want to add a new unit to the game.

### **Template: Create a New Minion**

**Task:** Create a new Minion Card: **\[INSERT NAME/CONCEPT HERE, e.g., "The Obsidian Turtle"\]**.

1. **@skill\_product\_manager:** Check if this unit fits our "Spatial" hook. Does it interact with the arena or other units in interesting ways?  
2. **@skill\_r3f\_systems\_designer:** Define its HP/Atk/Speed stats. Calculate its "Power Budget" cost and assign a Tier.
3. **@skill\_r3f\_systems\_designer:** Define its Tags and any special Abilities.
4. **@skill\_r3f\_shader\_artist:** If it needs a custom material, write a shader snippet (e.g., glowing eyes, rock skin).
5. **@skill\_r3f\_lead\_architect:** Create the Minion component with proper TypeScript typing.
6. **@skill\_r3f\_scene\_designer:** Add it to the arena with placeholder geometry if no model exists yet.

### **Template: Create a Spell/Action Card**

**Task:** Create a Spell Card: **\[INSERT CONCEPT, e.g., "Chain Lightning"\]**.

1. **@skill\_r3f\_systems\_designer:** Define the damage formula and cooldown. How does it scale if I craft two of them together?  
2. **@skill\_r3f\_game\_feel:** Design the animation sequence using @react-spring. How does the projectile fly? What happens on impact (Shake/Particles)?  
3. **@skill\_r3f\_audio\_engineer:** Describe the sound (Pitch variance, spatial positioning).  
4. **@skill\_r3f\_lead\_architect:** Write the Spell component with projectile logic.

## **4. UI & Polish (The Juice)**

Use these to make the game look expensive.

### **Template: Building a Responsive UI Menu**

**Context:** I need to build the **\[INSERT MENU NAME, e.g., "Victory Screen"\]**. **Task:** Create the layout and animation.

1. **@skill\_r3f\_ui\_specialist:** Generate the React component using Tailwind CSS. Use flex/grid layouts, not absolute positioning.
2. **@skill\_r3f\_ui\_specialist:** Add Framer Motion animations for entrance/exit transitions.
3. **@skill\_r3f\_game\_feel:** If needed, add camera or scene effects that complement the UI state.

### **Template: Building 3D World UI**

**Context:** I need UI elements that exist in 3D space: **\[INSERT ELEMENT, e.g., "Health bars above minions"\]**.

1. **@skill\_r3f\_ui\_specialist:** Use drei's `<Html>` component to position React UI in world space.
2. **@skill\_r3f\_lead\_architect:** Connect the UI to the minion's Zustand state for reactive updates.
3. **@skill\_r3f\_game\_feel:** Add spring animations for damage feedback.

### **Template: The "Game Feel" Pass (Refactoring)**

**Context:** This interaction feels flat/boring: **\[INSERT INTERACTION, e.g., "Minion attacking"\]**. **Task:** Add "Juice" to it.

1. **@skill\_r3f\_game\_feel:** Analyze the current code. Refactor it to add Anticipation (Wind-up), Impact (Shake/Particles), and Follow-through.
2. **@skill\_r3f\_audio\_engineer:** Add code to play a specific SFX with pitch randomization.
3. **@skill\_r3f\_shader\_artist:** If needed, add a flash effect or outline highlight on impact.

## **5. Visual Polish**

Use these to achieve the Arcane Punk aesthetic.

### **Template: Implement Cel Shading**

**Context:** I want the game to have a stylized, cel-shaded look. **Task:** Set up the NPR rendering pipeline.

1. **@skill\_r3f\_shader\_artist:** Create the CelMaterial using drei's shaderMaterial with toon ramp sampling.
2. **@skill\_r3f\_shader\_artist:** Set up post-processing with @react-three/postprocessing (Outline, Bloom).
3. **@skill\_r3f\_scene\_designer:** Configure the lighting for NPR (no environment maps, colored directional lights).

### **Template: Add Particle Effects**

**Context:** I need particles for: **\[INSERT EFFECT, e.g., "Magic summoning circle"\]**.

1. **@skill\_r3f\_game\_feel:** Create an instanced particle system using THREE.InstancedMesh.
2. **@skill\_r3f\_shader\_artist:** If needed, create a custom particle shader with additive blending.
3. **@skill\_r3f\_lead\_architect:** Ensure particles are properly disposed when complete to prevent memory leaks.

## **6. Debugging & Maintenance**

Use this when something breaks.

### **Template: "It's Broken" (General Fix)**

**Context:** I am getting an error. **Error Message:** \[PASTE ERROR HERE\] **Current Code:** \[PASTE RELEVANT COMPONENT\]

1. **@skill\_r3f\_qa\_specialist:** Analyze this error. Is it a null reference? A hook misuse? A Three.js context issue?  
2. **@skill\_r3f\_qa\_specialist:** Tell me which steps to take in Browser DevTools and React DevTools to confirm the issue.  
3. **@skill\_r3f\_dev\_environment:** If it's a build/config issue, help me fix Vite or TypeScript configuration.

### **Template: "Why isn't it working?" (Logic Fix)**

**Context:** The code runs, but the behavior is wrong. **Expected:** \[Describe what should happen\] **Actual:** \[Describe what happened\]

1. **@skill\_r3f\_lead\_architect:** Review the logic flow. Are we forgetting to await a promise? Is a useEffect dependency missing?
2. **@skill\_r3f\_systems\_designer:** Check the math. Is the variable overflowing or calculating to zero?
3. **@skill\_r3f\_qa\_specialist:** Add strategic console.logs to trace execution.

### **Template: "It's Slow" (Performance Fix)**

**Context:** The game stutters when: **\[INSERT SCENARIO, e.g., "spawning many minions"\]**.

1. **@skill\_r3f\_qa\_specialist:** Add drei's `<Stats />` to monitor FPS. Profile with Chrome Performance tab.
2. **@skill\_r3f\_lead\_architect:** Check for objects created inside useFrame or unnecessary re-renders.
3. **@skill\_r3f\_scene\_designer:** Ensure we're using instancing for repeated geometry.
4. **@skill\_r3f\_game\_feel:** Consider using object pooling for frequently spawned/despawned entities.

## **7. Deployment**

### **Template: Deploy to Production**

**Context:** I'm ready to deploy. **Task:** Set up production hosting.

1. **@skill\_r3f\_dev\_environment:** Run `npm run build` and verify the dist folder.
2. **@skill\_r3f\_dev\_environment:** Configure deployment to Vercel/Netlify/Cloudflare Pages.
3. **@skill\_r3f\_lead\_architect:** Ensure environment variables are set for production.
4. **@skill\_product\_manager:** Verify the shareable URL works and loads quickly (<3 seconds).
