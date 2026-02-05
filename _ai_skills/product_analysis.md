# **Product Market Analysis: "When Things Attack"**

**Date:** January 2026 **Product Type:** Spatial Autobattler / Deckbuilder Hybrid **Core Hook:** "Infinite Craft" meets "The Bazaar" in a spatial arena. **Platform:** Web-First (Browser-Native)

## **1. Executive Summary & Value Proposition**

**The Concept:** "When Things Attack" is a hybrid Autobattler that solves the genre's two biggest retention problems: **Static Metas** and **Passive Combat**.  
**The Problem:** Most autobattlers (*The Bazaar*, *Super Auto Pets*) rely on fixed pools of units. Once the "best build" is solved, the game becomes stale. Furthermore, combat is often just two spreadsheets bumping into each other (pure math, no spectacle).  
**The Solution:**

1. **Combinatorial Crafting:** By allowing players to fuse cards, you create an exponentially larger card pool, making the "meta" nearly impossible to solve quickly.  
2. **Spatial Arena:** Moving minions out of static slots into a physical arena adds a layer of "spectacle" and tactical positioning absent in competitors.

**Web-First Advantage:** By building with React Three Fiber instead of a native engine, we unlock:
* **Zero Friction:** No download, no install. Click a link and play instantly.
* **Viral Shareability:** Players can share replays and builds via URL.
* **Cross-Platform:** Works on any device with a modern browser (PC, Mac, Chromebook, tablets).
* **Rapid Iteration:** Web deployment enables instant updates without app store approval.

**Verdict:** High Potential. The game effectively merges the economy of *The Bazaar* with the synthesis depth of *Infinite Craft* and the visual payoff of *Clash Royale*—delivered with the accessibility of a browser game.

## **2. Competitive Landscape**

### **Direct Competitor: *The Bazaar* (Reynad / Tempo Storm)**

* **Core Loop:** Asynchronous hero building; buying/selling items.  
* **Strengths:** Incredible UI polish, fast game loop, massive influencer backing.  
* **Weakness (Opportunity):** It is purely about *items* and math. It lacks "Unit" identity. You cannot attach an emotional bond to a sword icon.  
* **Your Edge:** Your **Minion Arena** gives players *pets* to root for. The visual of a "Lava-Golem" physically walking across the screen is more engaging than a number increasing.

### **Direct Competitor: *Super Auto Pets* (Team Wood Games)**

* **Core Loop:** Asynchronous pet battling with simple emojis.  
* **Strengths:** Infinite replayability, low barrier to entry, "Merge" mechanic.  
* **Weakness (Opportunity):** Merging is linear (Snake \+ Snake \= Big Snake). It rarely changes the *nature* of the unit.  
* **Your Edge:** **Synergistic Crafting** (Snake \+ Fire Potion \= Inferno Cobra). This appeals to the "Alchemist" player type who wants discovery, not just upgrades.

### **Indirect Competitor: *Teamfight Tactics (TFT)* (Riot Games)**

* **Core Loop:** Real-time autobattler with spatial movement.  
* **Weakness (Opportunity):** Extremely high complexity barrier. Requires learning 50+ items and champion recipes.  
* **Your Edge:** As a **Card** battler, you can offer the depth of TFT but with the approachable UI and pacing of a card game.

### **Platform Advantage: Web vs. Native**

| Aspect | Native Games | Web (R3F) |
|--------|--------------|-----------|
| **Discovery** | App store search, paid UA | Shareable URLs, social embeds |
| **Onboarding** | Download → Install → Play | Click → Play |
| **Updates** | App store review (1-7 days) | Deploy instantly |
| **Monetization** | 30% platform cut | Direct payments (Stripe, etc.) |
| **Streaming** | Capture software required | Built-in spectator modes via URL |

## **3. User Segments & Personas**

### **Segment A: The "Theory-Crafter" (Primary Target)**

* **Profile:** Loves *Slay the Spire*, *Balatro*, and spreadsheet optimization.  
* **Motivation:** "I want to break the game." They want to find a card combination that the developers didn't intend.  
* **Retention Strategy:** The Crafting System. If you have 100 base cards, you have 10,000 combinations. They will play forever to find them all.

### **Segment B: The "Spectator" (Secondary Target)**

* **Profile:** Watches Twitch streamers. Plays *Clash Royale* or *Hearthstone Battlegrounds*.  
* **Motivation:** Dopamine. They want to see big explosions, funny interactions, and "High Rolls."  
* **Retention Strategy:** The **Spatial Arena** and Cel-Shaded visuals. The spectacle of the minions traveling and colliding is what keeps them watching.

### **Segment C: The "Casual Alchemist"**

* **Profile:** Played *Infinite Craft* or *Little Alchemy*.  
* **Motivation:** Curiosity. "What happens if I combine a toaster and a dragon?"  
* **Retention Strategy:** **Discovery Log / Collection Book**. Give them a "Pokedex" of crafted cards to fill out.

### **Segment D: The "Browser Gamer" (Web-Native Opportunity)**

* **Profile:** Plays games during lunch breaks, at work, or on shared devices.  
* **Motivation:** Quick sessions without commitment. No downloads.  
* **Retention Strategy:** **Instant access** via URL. Saved progress via cloud sync. Session length optimized for 5-15 minute runs.

## **4. Risks & Opportunities (Sentiment Analysis)**

### **The Risk: "Complexity Bloat" (The *Artifact* Problem)**

* **Sentiment:** "I quit because I didn't want to memorize 400 recipes."  
* **Mitigation:** Crafting must be **Intuitive Logic**, not random recipes. (Fire \+ Sword \= Fire Sword, NOT Fire \+ Sword \= Dragon).  
* **Design Pillar:** The UI must show a "Preview" of the craft outcome before the player commits.

### **The Risk: "Visual Clutter" (The *TFT* Problem)**

* **Sentiment:** "I can't tell who is winning because there are too many particle effects."  
* **Mitigation:** The **Arena Space** needs clear lanes or focus points. The Cel-Shaded aesthetic helps here—clean outlines are readable.  
* **Design Pillar:** Prioritize readability over fidelity.

### **The Risk: "Browser Performance" (Web-Specific)**

* **Sentiment:** "Web games are laggy and don't look as good."  
* **Mitigation:** React Three Fiber + Three.js is battle-tested for high-performance 3D. Use LOD (Level of Detail), instanced meshes, and GPU particles. Target 60fps on mid-range hardware.
* **Design Pillar:** Performance budgets are non-negotiable. Profile early and often.

### **The Opportunity: "The Asynchronous Sweet Spot"**

* **Sentiment:** Players love *The Bazaar* because there is no turn timer pressure during the "Shopping Phase," but they miss the real-time excitement of *Clash Royale*.  
* **Strategy:** Lean into this hybrid. Infinite time to craft (Relaxing) \-\> Frenetic, automated combat (Exciting).

### **The Opportunity: "Zero-Install Virality"**

* **Sentiment:** Players share screenshots and clips, but friends don't download the game.
* **Strategy:** Every game generates a shareable URL. Friends can spectate live or watch replays instantly. The "friction to fun" is measured in seconds, not minutes.

## **5. Strategic Pillars for MVP**

1. **The "Recipe Book" (Discovery Mechanic):**  
   * Do not just let players craft; record it. When a player discovers a "Void Arrow" for the first time, play a special animation and add it to their permanent collection. This gamifies the learning curve.  
2. **The "Hero" Unit (Spatial Anchor):**  
   * Since minions travel out into the arena, the player's "Avatar" (the thing being attacked) needs to feel defenseless but valuable. This grounds the spatial combat ("Defend the King").  
3. **Visual "Weight" on Rarity:**  
   * If I craft a Tier 3 card, it shouldn't just do more damage; it should look physically bigger in the arena. Size \= Power is a universal language for the Spectator audience.
4. **Instant Shareability (Web Advantage):**  
   * Every match generates a replay URL. Every crafted card can be shared as a preview card. Build virality into the core loop.

## **6. Marketing Hook**

**"The strategic depth of a deckbuilder meets the chaotic physics of an autobattler. Don't just draw the perfect card—forge it. No download required."**
