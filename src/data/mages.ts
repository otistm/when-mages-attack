/**
 * Mage Definitions — The Seven of the Inner Circle
 *
 * Each mage represents a philosophical branch of synthesis.
 * Players pledge allegiance before their first crafting phase,
 * receiving the mage's keepsake as an activatable combat ability.
 */

import { MageDefinition } from '@/types/mage';

export const MAGE_DEFINITIONS: MageDefinition[] = [
  // ─── 1. REN ──────────────────────────────────────────────────
  {
    id: 'ren',
    name: 'Ren',
    title: 'The Cerulean Archivist',
    affinity: 'Arcane / Ice',
    personality: ['Meticulous', 'Curious', 'Quietly fierce', 'Hoarder of forbidden texts'],
    lore: `DOSSIER — REN, THE CERULEAN ARCHIVIST
Classification: Adept, Fifth Circle — Restricted Access

She arrived at the Society carrying nothing but a satchel of frozen ink and a journal written in a language no living scholar could identify. The Admissions Board nearly rejected her — until the journal thawed itself and began rewriting their entrance exam in real time.

Ren believes synthesis is a language, not a science. Where others see formulas, she reads sentences. Where others measure reagents, she listens for grammar. Her workshop is a library that rearranges itself based on her mood, and her constructs move with an eerie intentionality that suggests they understand what they are.

The Society watches her carefully. Not because she is dangerous — though she is — but because her research implies that the pages in our grimoires may be listening back.

Threat Assessment: Moderate. Potential asset if properly directed. Do not confiscate her journal.`,
    backstory: `Before the Society found her, Ren was a librarian in a coastal village where the winters lasted nine months. She learned to read before she could walk — or so the story goes. The truth is stranger: the books read themselves to her, whispering their contents in languages that predated the village by centuries.

At fourteen, she froze her entire library solid during an argument with the head archivist. Not out of anger — out of focus. She was so intent on proving her point that the ambient temperature dropped forty degrees. The books survived. The archivist's tea did not.

The Society's recruiters found her three years later, still thawing the frozen wing. She had catalogued every book in the ice by memory, written corrections in the margins of seventeen volumes, and taught herself synthesis from a water-damaged grimoire she found behind a radiator. She was already better than most Second Circle adepts.

What makes Ren dangerous is not her power — it is her certainty. She does not doubt. She does not hesitate. When she writes a word, reality adjusts to accommodate her spelling.`,
    greeting: '"You chose me? Interesting. Most initiates prefer fire. Fire is loud. Ice remembers."',
    victoryQuote: '"Excellent. I\'ve already catalogued their mistakes. Seventeen, if you were counting."',
    defeatQuote: '"A setback. Not a conclusion. I will annotate what went wrong... extensively."',
    imagePath: '/assets/images/mages/ren.png',
    color: '#4a9eed',
    emissiveColor: '#2563eb',
    keepsake: {
      id: 'frozen_quill',
      name: 'Frozen Quill',
      description: 'Freezes all enemy minions for 2 seconds, halting their attacks.',
      flavorText: '"The quill writes one word — STOP — and the world obeys." — Recovered from Ren\'s workshop notes',
      iconEmoji: '🪶',
      cooldownSeconds: 18,
      abilityType: 'cc',
      effectConfig: {
        target: 'all_enemy_minions',
        freezeDuration: 2,
      },
      trial: {
        name: 'Archive the Fallen',
        description: 'Defeat 5 enemy minions',
        flavorText: '"One must study the opposition before one can silence it."',
        objectiveType: 'defeat_minions',
        targetCount: 5,
      },
      modelPath: '/assets/models/frozen_quill.glb',
      imagePath: '/assets/images/frozen_quill.png',
    },
    _art_prompts: 'Portrait of a young woman with deep blue hair and piercing blue eyes, wearing a wide-brimmed pointed hat, dark cloak with arcane frost patterns, scholarly yet dangerous demeanor, anime-influenced dark fantasy style, dramatic side lighting, dark background with faint blue magical particles',
  },

  // ─── 2. IGNIS ────────────────────────────────────────────────
  {
    id: 'ignis',
    name: 'Ignis',
    title: 'The Reckless Pyromancer',
    affinity: 'Fire',
    personality: ['Impulsive', 'Charismatic', 'Self-destructive', 'Laughs at danger'],
    lore: `DOSSIER — IGNIS, THE RECKLESS PYROMANCER
Classification: Adept, Third Circle — Under Observation

Three workshops. Ignis has burned through three workshops in eighteen months. The Quartermaster has stopped issuing him replacement furniture and now provides only stone tables and iron stools.

His synthesis technique is, by all scholarly accounts, wrong. He applies heat first, structure second — the thermal inverse of every documented methodology. And yet his constructs burn hotter, strike harder, and last longer than those produced by mages two circles above him.

When questioned about his methods, he shrugged and said: "I don't build weapons. I build arguments. Fire is just the loudest one."

His record includes seventeen disciplinary hearings, four commendations, and one incident classified so deeply that even this dossier cannot reference it. He was the only survivor.

Threat Assessment: High. To himself, primarily. Assign fireproof mentor.`,
    backstory: `Ignis does not remember his parents. He remembers the fire, though — the one that took the orphanage when he was six. He walked out of the ruins without a scratch, carrying a cat that was also, inexplicably, unharmed. The cat has since died of old age. Ignis still has not been burned.

He discovered synthesis by accident at nineteen. A bar fight escalated. Someone threw a bottle. Ignis caught it, and the glass melted in his hand, reformed into a blade, and ignited. He didn't mean to do it. He also didn't stop doing it.

The Society recruited him after he burned down a warehouse full of smuggled weapons. He claims it was an accident. The smugglers disagree. The warehouse was on an island. In a lake. The lake boiled.

Ignis treats fire not as a force but as a friend — an old companion that has been with him since childhood. His constructs feel alive because, to him, they are. He talks to them. They listen. And when he asks them to burn, they burn with the enthusiasm of something that has been waiting its whole existence to be set free.

The classified incident in his dossier? He burned something that should not have been burnable. The Society still doesn't know how. Neither does he.`,
    greeting: '"Finally! Someone with taste. Let\'s make things burn, shall we? Everything\'s better on fire."',
    victoryQuote: '"HA! Did you see that?! Everything is on fire and I am LIVING for it!"',
    defeatQuote: '"Okay, FINE, we lost. But did you see how big that last explosion was? Almost worth it."',
    imagePath: '/assets/images/mages/ignis_the_reckless_pyromancer.png',
    color: '#ef4444',
    emissiveColor: '#dc2626',
    keepsake: {
      id: 'cinder_heart',
      name: 'Cinder Heart',
      description: 'Scorches all enemy minions with burn damage over time.',
      flavorText: '"It still beats. Three hundred years, and it still beats. Don\'t hold it too long." — Quartermaster\'s warning label',
      iconEmoji: '🔥',
      cooldownSeconds: 15,
      abilityType: 'damage',
      effectConfig: {
        target: 'all_enemy_minions',
        statusEffect: {
          type: 'burn',
          damagePerTick: 3,
          tickInterval: 0.5,
          duration: 4,
        },
      },
      trial: {
        name: 'Trial by Fire',
        description: 'Deal 50 cumulative damage',
        flavorText: '"Fire doesn\'t ask permission. Neither should you."',
        objectiveType: 'deal_damage',
        targetCount: 50,
      },
    },
    _art_prompts: 'Portrait of a young man with wild red-orange hair and amber eyes, cocky grin, burn scars on hands, wearing a singed leather coat with ember-glowing seams, fire dancing in his palm, anime-influenced dark fantasy style, warm dramatic lighting, dark background with sparks and embers',
  },

  // ─── 3. MORRIGAN ─────────────────────────────────────────────
  {
    id: 'morrigan',
    name: 'Morrigan',
    title: 'The Blight Weaver',
    affinity: 'Poison / Nature',
    personality: ['Patient', 'Calculating', 'Darkly maternal', 'Speaks to plants'],
    lore: `DOSSIER — MORRIGAN, THE BLIGHT WEAVER
Classification: Adept, Sixth Circle — Greenhouse Access Only

The greenhouse that Morrigan tends was, before her arrival, a storage room for broken furniture. Now it contains over four hundred species of flora — sixty-seven of which do not exist in any botanical record. Twelve of them move. Three of them speak.

Her synthesis philosophy is evolutionary. She does not build constructs; she grows them. Each creation begins as a seed, fed with reagents and intention, coaxed into form over days or weeks. The results are patient, adaptive, and deeply unsettling in their intelligence.

She was asked once why all her creations produce toxins. She smiled and said: "Everything in nature produces toxins, dear. Most things just aren't honest about it."

The Society permits her greenhouse to exist because her antidotes are as potent as her poisons. She is, simultaneously, the most valuable healer and the most dangerous poisoner in the organization.

Threat Assessment: Low, so long as the greenhouse remains fed. Do not skip feeding day.`,
    backstory: `Morrigan grew up in a marsh village where the children learned to identify poisonous plants before they learned their letters. Her mother was a herbalist. Her grandmother was a herbalist. Her great-grandmother was hanged for witchcraft, which the family considered an occupational hazard.

She could make things grow from the age of seven. Not just plants — anything organic. A dropped apple seed became a sapling overnight. A dead mouse left near her bed sprouted mushrooms by morning. Her mother recognized the gift for what it was and began training her in the old ways: not synthesis, but something older. Something the Society would later classify as "pre-formal biosynthesis."

The Society found her at twenty-three, tending a garden that had consumed an abandoned church. The garden was beautiful. It was also producing compounds that no pharmaceutical company had ever synthesized. Two of those compounds could cure diseases previously thought terminal. Three of them could kill a horse in under four seconds.

Morrigan does not see a contradiction. To her, healing and harming are the same gesture performed with different intent. A scalpel and a knife are the same tool. She joined the Society not for power or knowledge, but because they had a greenhouse. She is, perhaps, the only member who joined for the real estate.

Her constructs grow from seeds she keeps in a locket around her neck. Each seed contains a complete organism, waiting. She whispers to them. They respond. The relationship between Morrigan and her creations is less like a mage and her weapons and more like a mother and her very, very dangerous children.`,
    greeting: '"Ah, a new seedling. Don\'t worry — I\'ll help you grow. Growth requires... patience. And a little venom."',
    victoryQuote: '"The rot takes everything eventually, dear. We simply... accelerated the schedule."',
    defeatQuote: '"Even the deepest roots can be torn up. We will grow back. We always do."',
    imagePath: '/assets/images/mages/morrigan_the_blight_weaver.png',
    color: '#22c55e',
    emissiveColor: '#16a34a',
    keepsake: {
      id: 'spore_locket',
      name: 'Spore Locket',
      description: 'Releases toxic spores that poison all enemy minions.',
      flavorText: '"Open it gently. The spores inside remember their mother, and she taught them to bite." — Greenhouse containment protocol',
      iconEmoji: '🌿',
      cooldownSeconds: 16,
      abilityType: 'debuff',
      effectConfig: {
        target: 'all_enemy_minions',
        statusEffect: {
          type: 'poison',
          damagePerTick: 2,
          tickInterval: 0.5,
          duration: 6,
        },
      },
      trial: {
        name: 'The Garden Grows',
        description: 'Apply status effects 4 times',
        flavorText: '"Every garden begins with a single spore. Patience, seedling."',
        objectiveType: 'apply_status_effects',
        targetCount: 4,
      },
    },
    _art_prompts: 'Portrait of a woman with dark green hair woven with living vines, pale skin, knowing green eyes, wearing a cloak of woven leaves and moss, small glowing mushrooms growing from her shoulders, anime-influenced dark fantasy style, eerie green bioluminescent lighting, dark background with floating spores',
  },

  // ─── 4. VOLTA ────────────────────────────────────────────────
  {
    id: 'volta',
    name: 'Volta',
    title: 'The Storm Conductor',
    affinity: 'Lightning',
    personality: ['Eccentric', 'Hyperactive', 'Brilliant', 'Talks too fast'],
    lore: `DOSSIER — VOLTA, THE STORM CONDUCTOR
Classification: Adept, Fourth Circle — Laboratory Wing (Insulated)

Volta's laboratory requires its own electrical grid. This is not because her experiments consume large amounts of power — it is because they produce it. The Society's main generator failed twice before they installed the isolation transformer.

She approaches synthesis as engineering rather than alchemy. Her workshop is filled with copper wire, glass capacitors, and blackboards covered in equations that make the Mathematics Department uneasy. She insists that magic is simply electricity that hasn't been properly measured yet.

Her constructs crackle. They hum with stored potential. They discharge without warning. Three assistants have been reassigned after developing involuntary twitching.

Despite the hazards, her work on energy transfer has revolutionized the Society's understanding of how synthesis channels power between reagents. She proved that every act of synthesis involves an electrical discharge — a spark of creation, she calls it.

Threat Assessment: Moderate. Primarily electrical. Ground yourself before entering her lab.`,
    backstory: `Volta was struck by lightning at the age of twelve. This is not what gave her powers — she had been conducting unsanctioned experiments with static electricity since she was eight. The lightning strike simply confirmed her hypothesis that she was, in her words, "electrically compatible."

She was expelled from three schools. Not for behavioral problems — for infrastructure damage. The first school lost its electrical system when she rerouted it through a homemade Tesla coil in the science lab. The second lost its fire alarm system when she discovered that smoke detectors contain americium-241 and attempted to build a nuclear battery. The third she left voluntarily after the headmaster's toupee was permanently magnetized.

The Society's recruiters found her at a science fair where her entry — a device that could wirelessly charge any battery within fifty meters — had accidentally disabled every electronic device in the building, including three pacemakers. The pacemaker patients survived. Volta felt terrible about it. She sent flowers. The flowers arrived via drone, which she had also built.

Her mind moves faster than language allows. She speaks in half-sentences, completes other people's thoughts (usually incorrectly), and has been known to answer questions that haven't been asked yet. Her laboratory notebooks are indecipherable to anyone but her — and occasionally to her as well.

What makes Volta remarkable is not her power but her understanding. She doesn't just channel electricity; she comprehends it at a fundamental level. She hears the hum of electrons. She feels the potential in a charged capacitor like a held breath. To her, the entire world is a circuit waiting to be completed.`,
    greeting: '"Oh! Oh, you picked me? Excellent — I have FOURTEEN experiments that need a second pair of hands. Non-conductive gloves are in the drawer. Probably."',
    victoryQuote: '"YES! The voltage readings were PERFECT! Quick, write down everything before I forget — actually, never mind, I already forgot. But we WON!"',
    defeatQuote: '"Hmm. The polarity was inverted. Or maybe the frequency was off. Either way — NEXT TIME we double the amperage!"',
    imagePath: '/assets/images/mages/volta_storm_conductor.png',
    color: '#eab308',
    emissiveColor: '#ca8a04',
    keepsake: {
      id: 'static_coil',
      name: 'Static Coil',
      description: 'Unleashes chain lightning that shocks all enemy minions.',
      flavorText: '"The coil stores exactly one thunderbolt. The discharge is... uncomfortable. For everyone in the room." — Lab safety incident report #47',
      iconEmoji: '⚡',
      cooldownSeconds: 14,
      abilityType: 'damage',
      effectConfig: {
        target: 'all_enemy_minions',
        damage: 12,
        statusEffect: {
          type: 'shocked',
          damagePerTick: 2,
          tickInterval: 1,
          duration: 3,
        },
      },
      trial: {
        name: 'Surge Protocol',
        description: 'Deal 30 damage in a single hit',
        flavorText: '"One bolt. One moment. That\'s all it takes to change the equation."',
        objectiveType: 'single_hit_damage',
        targetCount: 30,
      },
    },
    _art_prompts: 'Portrait of a young woman with short spiky yellow-white hair standing on end from static, bright golden eyes behind cracked goggles pushed up on forehead, wearing a leather apron covered in scorch marks and copper wire, anime-influenced dark fantasy style, crackling electric blue-yellow lighting, dark background with arcing electricity',
  },

  // ─── 5. ORIN ─────────────────────────────────────────────────
  {
    id: 'orin',
    name: 'Orin',
    title: 'The Iron Sage',
    affinity: 'Earth / Metal',
    personality: ['Stoic', 'Protective', 'Immovable', 'Speaks rarely but precisely'],
    lore: `DOSSIER — ORIN, THE IRON SAGE
Classification: Adept, Seventh Circle — Foundry Master

Orin has not left the Foundry in four years. This is not because he cannot — it is because he believes his work is too important to interrupt with trivialities like sunlight or conversation.

His synthesis methodology is structural. Where others focus on elemental alignment or biological compatibility, Orin studies the architecture of magic itself. His constructs are not merely strong — they are engineered. Load-bearing. Each joint and seam calculated to distribute force with mathematical precision.

He was a builder before the Society found him. Bridges. Walls. Things that protect people from other things. He brought that philosophy into synthesis and has never wavered from it. His creations defend. They endure. They do not break.

The Seventh Circle recognized him not for brilliance but for reliability. In forty-seven recorded combat trials, not a single construct of his has fallen before its operator. He considers this statistic more important than any accolade.

Threat Assessment: Minimal. He is the wall between us and what lies beyond. Do not reassign.`,
    backstory: `Orin built his first wall when he was nine years old. His village was flooding. The adults were evacuating. Orin walked to the riverbank, put his hands on the mud, and the earth rose. Not dramatically — not like in the stories. It rose slowly, deliberately, six inches at a time, until the water had nowhere to go but back.

The wall held for three days. It held longer than the sandbags. It held longer than the professional levee upstream. When the flood receded and the engineers came to study what had happened, they found a wall of compressed earth so dense it had the structural properties of concrete. It had been built by a child who didn't know what he was doing.

He spent the next twenty years learning what he was doing. He apprenticed with stonemasons, ironworkers, structural engineers. He studied load distribution, tensile strength, compression ratios. He built bridges that are still standing in four countries. He never told anyone about the river.

The Society found him because one of his bridges shouldn't have worked. The mathematics said it should have collapsed under its own weight. It didn't. An engineering professor spent three years trying to understand why before concluding that the bridge was being held together by something that wasn't in the blueprints. The Society recognized what it was: synthesis, applied instinctively, woven into the steel like a prayer into stone.

Orin does not build weapons. He builds shields. Walls. Barriers. Things that stand between the vulnerable and the threat. Every construct he creates is an act of protection. He lost something once — the details are in a file he asked to have sealed — and he has spent every day since making sure nothing else is lost on his watch.`,
    greeting: '"You stand before me. Good. Standing is important. I will teach you to build things that do not fall."',
    victoryQuote: '"The foundation held. As I knew it would."',
    defeatQuote: '"Even mountains erode. But stone remembers its shape. We will rebuild."',
    imagePath: '/assets/images/mages/orin_the_iron_sage.png',
    color: '#a1887f',
    emissiveColor: '#78716c',
    keepsake: {
      id: 'rusted_aegis',
      name: 'Rusted Aegis',
      description: 'Shields all allied minions, temporarily reducing incoming damage by 50%.',
      flavorText: '"The rust is not decay. It is memory. Every scratch records a blow that someone else did not have to suffer." — Foundry inscription',
      iconEmoji: '🛡️',
      cooldownSeconds: 20,
      abilityType: 'buff',
      effectConfig: {
        target: 'all_ally_minions',
        buffDuration: 4,
        buffMultiplier: 0.5,
      },
      trial: {
        name: 'The Iron Wall',
        description: 'Win 1 battle',
        flavorText: '"Stand firm. The wall does not move. The wall does not break. Be the wall."',
        objectiveType: 'win_battle',
        targetCount: 1,
      },
    },
    _art_prompts: 'Portrait of a broad-shouldered older man with a shaved head and iron-grey beard, deep brown eyes, wearing a heavy leather apron over chainmail, hands calloused and scarred from metalwork, anime-influenced dark fantasy style, warm forge-glow lighting from below, dark background with floating metal particles and ember sparks',
  },

  // ─── 6. SABLE ────────────────────────────────────────────────
  {
    id: 'sable',
    name: 'Sable',
    title: 'The Void Whisperer',
    affinity: 'Shadow / Void',
    personality: ['Mysterious', 'Sardonic', 'Lonely', 'Sees things others cannot'],
    lore: `DOSSIER — SABLE, THE VOID WHISPERER
Classification: Adept, Fifth Circle — Restricted Wing (Self-Imposed)

Sable's file contains more redactions than any other in Society history. What remains legible paints an incomplete but troubling picture.

She arrived during what the records call the "Blackout Incident" — a three-day period where every light source in the Undercroft extinguished simultaneously. When the lights returned, she was standing in the entrance hall as if she had always been there. No one could confirm how she entered. No one could confirm she hadn't been there for years.

Her synthesis draws on absence. Not darkness — absence. The space between things. The pause between heartbeats. She does not add elements to create constructs; she removes elements from reality until only the weapon remains. The process is quiet, unsettling, and produces results that the Research Division cannot fully explain.

She keeps to herself. Not out of hostility — she simply finds existing exhausting when you can see the void behind everything. She once told a colleague: "You see walls. I see the nothing they're built on."

Threat Assessment: Unknown. She has not been hostile. She has also not been fully understood.`,
    backstory: `No one knows where Sable came from. This is not unusual for Society members — many have obscured pasts. What is unusual is that Sable's past appears to have been actively erased. Not hidden. Erased. Census records that should contain her name are blank. Photographs that should include her show empty space where a person should be standing. A school register in a town three hundred miles away has a name scratched out so thoroughly the paper tore.

She does not talk about her childhood. When asked, she looks at a point slightly behind the questioner's head and says, "I was always here." This is demonstrably false. It is also, in a way she cannot explain, demonstrably true.

What is known: she can see the void. Not metaphorically — literally. She perceives the absence that exists beneath reality the way others perceive color or sound. She describes it as a hum, a constant low frequency that most people filter out the way they filter out the sound of their own heartbeat. She cannot filter it out. She has never been able to filter it out.

Her synthesis is subtraction. Where other mages add elements together to create something new, Sable removes elements from existence until only the desired outcome remains. It is, theoretically, impossible. It is, practically, devastating. Her constructs are not built — they are what's left after she's finished taking things away.

The loneliness is the hardest part. She can see what others cannot, hear what others cannot, perceive dimensions of reality that are invisible to everyone around her. It is isolating in a way that no amount of companionship can fix. She joined the Society because they were the first people who didn't look at her like she was broken. They looked at her like she was useful. She prefers useful to understood.`,
    greeting: '"...You can see me? Most people look right through. Perhaps you\'ll be worth the effort."',
    victoryQuote: '"They never saw it coming. That\'s the point."',
    defeatQuote: '"...Interesting. The void showed me this outcome. I chose to ignore it. My mistake."',
    imagePath: '/assets/images/mages/sable_the_void_whisperer.png',
    color: '#7c3aed',
    emissiveColor: '#6d28d9',
    keepsake: {
      id: 'obsidian_pendant',
      name: 'Obsidian Pendant',
      description: 'Drains life from all enemy minions and heals your HP bar.',
      flavorText: '"The pendant doesn\'t take. It reminds things that they were never really there." — Sable\'s personal notes (recovered from void pocket)',
      iconEmoji: '🔮',
      cooldownSeconds: 20,
      abilityType: 'drain',
      effectConfig: {
        target: 'all_enemy_minions',
        damage: 8,
        healAmount: 15,
      },
      trial: {
        name: 'Embrace the Void',
        description: 'Take 30 damage and survive',
        flavorText: '"The void doesn\'t destroy. It reveals what was never real."',
        objectiveType: 'survive_damage',
        targetCount: 30,
      },
    },
    _art_prompts: 'Portrait of a pale woman with long black hair that fades into wisps of shadow at the tips, violet eyes that glow faintly, wearing a high-collared dark coat that seems to absorb light, an obsidian pendant at her throat, anime-influenced dark fantasy style, dramatic rim lighting with purple void energy, dark background dissolving into nothingness',
  },

  // ─── 7. LUMI ─────────────────────────────────────────────────
  {
    id: 'lumi',
    name: 'Lumi',
    title: 'The Gilded Alchemist',
    affinity: 'Transmutation',
    personality: ['Jovial', 'Generous', 'Obsessive', 'Sees potential in everything'],
    lore: `DOSSIER — LUMI, THE GILDED ALCHEMIST
Classification: Adept, Fourth Circle — Open Workshop (Public Hours)

Lumi is, by all accounts, the happiest person in the Society. This makes everyone deeply suspicious.

His workshop is the only one with posted visiting hours. He keeps a kettle on at all times. He has named every one of his constructs and insists on introducing them to visitors. The fact that his constructs are among the most lethal in the Society's arsenal somehow makes this more unsettling, not less.

His synthesis philosophy is transmutative — he believes nothing is truly one thing. A toaster is not just a toaster; it is a potential sword, a potential shield, a potential friend. His process involves convincing reagents to become what they secretly want to be. The results are remarkably cooperative.

Before the Society, he was a tinker. He fixed broken things in a market stall — kettles, clocks, music boxes. He still fixes things. The difference is that now the things he fixes sometimes fix themselves afterward.

The Quartermaster considers him the Society's greatest resource. Everyone else considers him slightly unhinged. Both assessments are correct.

Threat Assessment: Minimal. Unless you insult his constructs. Then: significant.`,
    backstory: `Lumi's mother sold buttons. His father repaired shoes. They lived above the shop in a building that smelled of leather polish and brass, and Lumi grew up believing that everything broken could be fixed and everything ordinary could be made extraordinary.

He was twelve when he fixed his first impossible thing. A customer brought in a music box that had been crushed by a cart. The mechanism was shattered — gears bent, springs snapped, the cylinder cracked in three places. His father shook his head and offered a refund. Lumi took the box to his room and emerged six hours later with a functioning music box that played a song no one had ever heard before. The customer wept. The song was her mother's lullaby, a melody that had died with the old woman thirty years prior. Lumi could not explain how he knew it.

This is what Lumi does: he finds the truth inside broken things. Not what they were — what they wanted to be. The music box didn't want to play its original tune; it wanted to play the song that mattered most to its owner. The toaster doesn't want to make toast; it wants to be something magnificent. Lumi just listens and helps.

The Society recruited him at twenty-six, after he accidentally transmuted an entire shipment of brass buttons into gold. He was horrified — not because of the transmutation, but because gold is too soft for buttons. "They'll bend!" he kept saying, while the Society's Quartermaster calculated the monetary value and nearly fainted.

His workshop is the warmest place in the Undercroft. Not temperature-warm — emotionally warm. His constructs purr. They follow him around like puppies. One of them — a transmuted kettle he calls "Duchess" — brings him tea at precisely 4pm every day. He insists she does it because she wants to, not because he programmed her. He may be right.`,
    greeting: '"Welcome, welcome! Oh, you chose ME? How wonderful! I\'ve just put the kettle on. Let me show you — I\'ve been working on something spectacular."',
    victoryQuote: '"Oh, SPLENDID! Everything transmuted perfectly! I knew that recipe would work — well, I hoped. Celebrations call for tea!"',
    defeatQuote: '"Oh dear. That wasn\'t supposed to happen. But every failed experiment is just a successful lesson! ...Right?"',
    imagePath: '/assets/images/mages/lumi_the_gilded_alchemist.png',
    color: '#d4af37',
    emissiveColor: '#b8972e',
    keepsake: {
      id: 'philosophers_thimble',
      name: "Philosopher's Thimble",
      description: 'Transmutes allied minions, temporarily doubling their attack power.',
      flavorText: '"It\'s just a thimble. But put it on, and suddenly every broken thing in the room looks like it\'s asking to become a masterpiece." — Lumi, during Tuesday tea',
      iconEmoji: '✨',
      cooldownSeconds: 22,
      abilityType: 'buff',
      effectConfig: {
        target: 'all_ally_minions',
        buffDuration: 5,
        buffMultiplier: 2.0,
      },
      trial: {
        name: "The Transmuter's Touch",
        description: 'Have minions deal 80 total damage',
        flavorText: '"Everything wants to be more than it is. You just have to listen."',
        objectiveType: 'minion_damage_dealt',
        targetCount: 80,
      },
    },
    _art_prompts: 'Portrait of a warm-faced man with curly golden-brown hair and kind hazel eyes, round spectacles, wearing a patchwork vest covered in pockets and pouches, golden light emanating from his hands, anime-influenced dark fantasy style, warm golden lighting, dark background with floating golden particles and tiny transmutation circles',
  },
];

export function getMageDefinition(id: string): MageDefinition | undefined {
  return MAGE_DEFINITIONS.find((m) => m.id === id);
}

export function getAllMages(): MageDefinition[] {
  return MAGE_DEFINITIONS;
}
