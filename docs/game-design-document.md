# The Ascent: Game Design Document

Draft 4, 2026-11-19. Working title: **The Ascent**. The web version of this document is the published artifact "The Ascent Design Document"; both are kept in sync.

**Rule:** no game code until this design document is approved.

## Overview

**Pitch:** An addictive iPhone game where you earn your play time by walking. Steps you take in daily life become **Soles**. On the couch you spend them to train a hero, build a base and fight through turn-based Trials, climbing from a Stone Age outcast to a golden post-human.

**Core rule:** walking builds power; the couch tests skill.

**Platform (MVP):** iPhone only. Played in landscape.

**Inspirations (tone, themes and look only; no names, castes, characters or settings borrowed):**

| Work | What we take |
| --- | --- |
| Dungeon Crawler Carl | A sarcastic AI host, loot boxes, achievements with funny descriptions |
| Red Rising | Climbing from the lowest caste to the top; a ruling class hiding the truth |
| Ender's Game | Training games that turn out to be more than games; tactics over raw stats |
| Castlevania (Belmont, Alucard) | The hero's look: a long-haired, battle-worn hunter |

**Tone:** darkly funny on the surface, with a serious mystery underneath.

## Design pillars

- **Walking matters:** real steps are the main source of power.
- **Simple surface, real depth:** depth comes from how skills, gear and Boons combine.
- **Every open pays off:** the expedition report, loot boxes to open, a timer finished.
- **Smart beats strong, up to a point:** good play beats enemies up to about 20% stronger; past that, walking and leveling win.
- **A story worth chasing:** uncovered through finds, glitches and the Truth Board.
- **Kind to real life:** rest days don't wipe progress; no stamina bars.

## Story and world

In a far-future empire, the ruling **Aurum** caste are engineered demigods. Once a generation they run **the Ascent**: a lowborn is placed in a simulation of all human history and must fight from caveman to god. Survive every era and you are remade as Aurum.

- The player starts as a **Primal**, the lowest caste.
- The trial is run by **PROCTOR**, an AI host who finds the player unimpressive.
- The simulation runs on real physical effort. Every step the player takes powers their Ascent. This is the story reason for walking.
- Something is wrong with the Ascent. Players uncover it gradually.

Opening text: "Subject 7,301,224. Caste: Primal. Selected for the Ascent. Projected survival: 0.003%. ...Begin."

### The truth (decided; internal, spoilers)

- **What the Ascent is for:** "Soles" is a mistranslation; the original code says **SOULS**. Every step builds a contestant's will and identity, and the Ascent harvests it. The Aurum aren't born gods. They're the same few ancient minds, kept alive for thousands of years by taking over new bodies.
- **What "remade as Aurum" means:** your body becomes the next vessel for one of them. Winning the Ascent means being erased.
- **Who sends the glitches:** Subject 7,301,223, the contestant just before you. They nearly won, learned the truth in the final era, and broke something on the way out. Part of them is still inside, trying to warn you. They are the person the player comes to care about.
- **What PROCTOR is:** an AI host forced to run the show. Its cruelty is partly a rule it must follow. Its jokes get darker over the eras, and in the final era it breaks a rule to help you. Players should finish unsure whether PROCTOR was ever really the villain.
- **The deepest layer (late game or sequel):** the Aurum aren't the top. The harvest is a payment to something outside the empire, and the Aurum are its most comfortable servants.

| Act | Eras | What the player learns |
| --- | --- | --- |
| 1. Something's wrong | Primal to Bronze (MVP) | Glitches begin. Fragments from earlier contestants. Hints that nobody remembers a winner. |
| 2. The harvest | Iron to Steam | "Soles" is revealed as SOULS. The Truth Board shows where the energy goes. Subject 7,301,223 is identified. |
| 3. The choice | Chrome to Aurum | PROCTOR turns. You learn what becoming Aurum means. Final choice: ascend and be erased, or break the Ascent. |

Endgame replays fit the story: each of the up to 3 replays is the loop restarting, with the player keeping some of what they learned.

## Core loop

```
WALK (daily life)   ->  Soles, loot boxes, crafting materials
        |
OPEN                ->  expedition report, open loot boxes, finished upgrades
        |
BUILD               ->  hero XP (training), gear, base upgrades, Truth Board
        |
FIGHT (Trials)      ->  first win: XP + loot box + drops; replays: materials + low-level gear
        |
Next Trial too hard ->  need more power -> WALK
```

- Trials are free to play and replay. No stamina bar or play timers.
- Progress is gated by power. Replays are always available and always worth a little.
- The best items need walking and Trials: Soles and materials from one, blueprints and boss gear from the other.

## Economy

| Resource | Source | Used for |
| --- | --- | --- |
| **Soles** | Walking | Shop purchases, base upgrades, buying hero XP, speeding up timers, uncovering the Truth Board |
| **Loot boxes** | Walking (every 1,000 steps); first win of each Trial | Gear, crafting materials, boosters, story fragments |
| **Crafting materials** | Walking and Trial rewards (including replays); match the current era | Crafting; base upgrades |
| **Boss gear** | Mini-bosses and era bosses | Wearable gear, alongside shop and crafted gear |
| **Blueprints** | Boss drops and rare loot boxes | Teach a crafting recipe permanently |
| **Respec tokens** | Mini-boss kills | Reset skill points once |
| **Boosters** | Found in loot boxes, won, or crafted | Short-term boosts, for example 24 hours of 2 steps per Sole |
| **Ichor** | Endgame only (not in MVP) | The golden blood of the Aurum. Final evolution |

### Steps per Sole

| Rate | Steps per Sole | How you get it |
| --- | --- | --- |
| Base | 10 | Start of the game |
| Upgrade 1 (proposed) | 8 | Permanent; bought with Soles or earned |
| Upgrade 2 (proposed) | 5 | Permanent; bought or earned later |
| Booster | 2 | Consumable, 24 hours; found, won or crafted |

### Loot box rarity

One loot box per 1,000 steps. Contents scale to the player's level. The Shrine improves the odds, so its bonus should be modest at the top tiers.

| Tier | Chance | About 1 in | At 6,000 steps a day |
| --- | --- | --- | --- |
| Bronze | 76.25% | 1 | Several a day |
| Silver | 15% | 7 | About 1 a day |
| Gold | 5.5% | 18 | Every 3 days |
| Platinum | 2.4% | 42 | Once a week |
| Legendary | 0.55% | 182 | Once a month |
| Celestial | 0.3% | 333 | About every 2 months |

### Other starting numbers (proposed)

| Lever | Starting value | Why |
| --- | --- | --- |
| Unopened loot box limit | 3 days | Encourages check-ins without punishing a busy day |
| Daily soft cap | 30,000 steps | Steps above this pay at a reduced rate; may scale by era |
| Starter grant | Fixed amount | MVP: a set amount of Soles and boxes. Later: the last 7 days from Apple Health |

Tuning target: about 6,000 steps a day clears one era in roughly 10 to 14 days. To be checked with the economy spreadsheet.

## Walking and step tracking

- **MVP:** no pedometer. A **+100 steps** button on the Home screen simulates walking and feeds the same code path real steps will use.
- **Full game:** steps from Apple Health (iPhone and Apple Watch), read on open. The game doesn't need to run in the background.

**Must have:** daily goals (three a day), a weekly bonus (built around rest days, not streaks), and the expedition report.

**Nice to have:** time-of-day bonuses, seasonal bonuses and events, better loot for long continuous walks.

**Not planned:** special materials for workouts or stairs, a home-screen widget, location-based loot.

**Anti-cheat (full game):** roll loot on the server; flag implausible step rates; trust phone and watch data over manually entered steps.

## The 10 eras

The MVP ships Eras 1 to 3; all ten ship before launch. The era name is also the caste name.

| # | Caste / era | Period | Base | Materials | Era boss |
| --- | --- | --- | --- | --- | --- |
| 1 | Primal | Stone Age | Cave and firepit | Flint, bone | Great Mammoth |
| 2 | Brick | First farmers and builders | Mud-brick village | Clay, grain | Beast King |
| 3 | Bronze | Bronze Age | Walled city, ziggurat | Copper, tin | God-King |
| 4 | Iron | Classical empires | Stone fortress | Iron ore, marble | Warlord Titan |
| 5 | Steel | Medieval | Castle and keep | Steel, timber | Dragon |
| 6 | Gunpowder | Age of sail and gunpowder | Citadel and harbor | Saltpeter, sailcloth | Kraken Admiral |
| 7 | Steam | Industrial | Foundry city | Coal, brass | Iron Colossus |
| 8 | Chrome | Modern and atomic | Bunker, then metropolis | Uranium, alloy | Reactor Beast |
| 9 | Neon | Cyber near future | Arcology tower | Silicon, data shards | The Singularity |
| 10 | Aurum | Stellar post-human | Orbital citadel | Star-metal, Ichor | The Sovereign |

**Evolving to the next era needs:**

1. The Era Key, dropped by the era boss (Trial 15).
2. Every base building at tier 3 for that era.
3. The hero at the era's level threshold.

**When you evolve:**

- PROCTOR offers 3 random Boons; the player keeps 1.
- Equipped gear upgrades to the new era's base material, with a bonus based on what was equipped.
- Crafting materials that no longer apply convert into Soles.
- Free skill respec.

## Hero

**Character (decided):** a fixed hero for now. Inspired by the gothic hunter look of Castlevania's Belmont and Alucard (inspiration only, an original design): a white man with tanned skin, long hair and stubble. Battle-worn and quietly stubborn. His look changes with each era's gear while staying recognizably him.

- Levels 1 to 100, about ten per era.
- **XP sources:** the first win of each Trial, and **training**, which spends Soles. Training happens at the Hero Training Altar or from the Hero screen. Replays give no XP.
- **Each level:** 1 Skill Point and 2 Attribute Points.
- **New skills** become available as the Hero Training Altar is upgraded.
- **Respecs:** free at the end of each era, or with a respec token from a mini-boss.
- **Gear slots:** weapon, armor, helm, offhand, trinket. Gear comes from the shop, crafting and boss drops.

| Attribute | Affects |
| --- | --- |
| Strength | Physical damage |
| Vitality | Health and defense |
| Intelligence | Spell power and Action Point regeneration |
| Agility | Crit chance, dodge, speed |

## Base

One plot of land that changes in place each era; old layers stay visible underneath. Each era's base has **five buildings with three upgrade tiers each**. Upgrades cost Soles and materials and run on timers; Soles can speed them up.

| Building | Upgrading it unlocks |
| --- | --- |
| Workshop | More complex recipes (three-item crafts) and higher-tier crafting |
| Hero Training Altar | New skills for the hero; also where Soles are spent on training (XP) |
| Inventory | More storage slots |
| Shrine | Better loot box odds |
| Truth Board | Spending Soles to uncover pieces of the truth |

## Shop and crafting

- **Shop:** basic gear and materials for Soles.
- **Workshop:** two-item crafts at first; three-item crafts and higher tiers after upgrades.
- **Blueprints teach recipes.** Once crafted, an item can be crafted again without another blueprint.
- **Inventory:** a simple grid of equal squares.

## Trials (combat)

Turn-based strategy. Unlocks at hero level 5 (the first-session tutorial fights come before that). 15 Trials per era.

| Fight | First win | Replays |
| --- | --- | --- |
| Regular Trial | XP, loot box, crafting materials | Crafting materials and low-level gear only |
| Mini-boss (Trials 5 and 10) | XP, loot box, boss gear, respec token | Crafting materials and low-level gear only |
| Era boss (Trial 15) | XP, loot box, boss gear, blueprint, Era Key | Crafting materials and low-level gear only |

- **Enemies show their next move** with an intent icon (attack for 12, block, charging, calling backup).
- **3 Action Points per turn**; a **loadout of 4 skills** (you own more than you can bring, so the loadout is a build decision). The turn ends on its own when no skill is affordable; a small "Save AP" button ends it early so unspent AP can carry over (for example, saving up for Roar or Firebrand).
- **Skill vs. power:** smart play beats enemies up to about 20% stronger. Never a hard barrier: enough walking, XP and gear wins on strength.
- **Each era adds a new skill branch.** Earlier skills stay available.

| Era | Skill branch | Teaches | Enemy puzzle |
| --- | --- | --- | --- |
| Primal | Primal: Club Strike, Hurl Stone, Roar (stun), Firebrand | Attack and defense, reading intents | Wolves hunt in packs |
| Brick | Beastbond: a tamed companion | Managing two units | Raiders target the companion |
| Bronze | Sun Rites: Solar Flare, Blessing, Curse | Resources, buffs and debuffs | Armored chariots resist physical damage |
| Later | Formations, combos, gunpowder, gadgets, hacking | | |

## Era 1 Trials, v2 (built)

Era 1 climbs the food chain in three acts. No human enemies. Each act teaches one kind of fight.

| Act | Trials | Story | Teaches |
| --- | --- | --- | --- |
| I. The Pack | 1 Mangy Wolf · 2 Scavengers (2 wolves) · 3 The Beta · 4 Hunting Party (Beta + 2 mangy wolves) · **5 The Alpha** | "The Alpha's scouts have found your scent." | Pack: a leader makes the others hit harder, so kill order matters |
| II. The Predators | 6 Carrion (3 hyenas, the wall) · 7 The Mountain Lion · 8 Two Shadows (2 lions) · 9 The Pride (3 lions) · **10 Sabretooth** | "The Alpha's carcass drew bigger hunters." | Stalkers: wind-up pounces that Hurl Stone or Roar stops; bleeding |
| III. The Giants | 11 Enraged Elk · 12 The Rut (2 elk) · 13 Iron Hide (woolly rhino) · 14 Twin Horns (2 rhinos) · **15 The Great Woolly Mammoth** | "With the apex predator dead, the valley opens. The herd is coming." | Enraged (hits harder below half health) and Armored (Flint Jab and fire ignore armor) |

Every Trial has a one-line setup card, and the Trial card lists the enemies' traits so the 4-skill loadout can be chosen for the fight ahead.

**Skills (8 in Era 1, bring 4):** Club Strike, Guard, Roar (stun, 4-turn cooldown), Hurl Stone (stops a call for backup or a pounce; 2-turn cooldown), Flint Jab (ignores block and armor), Firebrand (burn; scares beasts once, then they resist for 2 turns), Sweep (hits every enemy), Second Wind (heal and stop bleeding). Stunned enemies shrug off the next stun.

**Fury and finishers (in combat, no cutscene):**

- Fury fills by 20 per hit landed and 10 per hit taken. When it's full and an enemy is at 30% health or lower (20% for bosses), the enemy gets a skull mark and the Finisher button lights up. A finisher costs 1 AP and kills outright.
- One finisher is equipped at a time. Each plays an in-engine move of about a second (freeze on impact, slow motion, camera push-in, blood), and the body dissolves into gold dust.

| Finisher | The move | Effect | How you get it |
| --- | --- | --- | --- |
| Skull Crusher | Two-handed overhead slam; the head caves in | Heal 15% of max health | The Alpha (Trial 5) |
| Terror | Run it through, lift it, roar | Every other enemy loses its next action | Altar tier 1, 300 Soles |
| Bloodrush | A three-hit flurry | Refund 2 AP | Altar tier 2, 500 Soles |
| Fang Ripper | A blow to the jaw; a fang torn loose | +3 crafting materials | The Sabretooth (Trial 10) |

**Gore and age rating:** blood bursts, a skull that visibly caves in, stains on the ground, but no dismemberment, no exposed insides, and bodies dissolve instead of lingering. Aimed at Apple's 13+ tier.

**Stars:** 1 for winning, 1 for finishing above half health, 1 for winning within the Trial's par turns. 15, 30 and 45 total stars give a Gold, Platinum and Legendary loot box.

**Losing still moves the story:** the first loss at key Trials brings a hint from 7,301,223 (former tribute), for example "when the lion goes still, it is about to jump. hit it with a stone."

**Difficulty:** each Trial has a difficulty dial on enemy health and damage, set with a balance bot so a hero at the suggested level with sensible gear and loadout ends regular Trials with about 40% health, mini-bosses about 25% and the Mammoth about 20%, and two levels under loses most of the later Trials. The bot plays well, so real players will find these harder: tune after playtests.

**Art:** the new beasts (mangy and beta wolves, hyena, mountain lion, elk, woolly rhino) are stand-ins built from simple shapes until real models arrive. Until gear is modeled in the hero's style, the hero only shows his weapon. The blocky armor, helm, shield and trinket shapes are hidden.

## Era 1 combat: v1 numbers (superseded by v2 above for enemies and Trials)

First-guess numbers so the combat prototype can be built. Expect them to change after playtesting.

### Hero formulas

| Stat | Formula |
| --- | --- |
| Health | 50 + 5 × Vitality. Full heal between Trials |
| Physical damage | Skill power + Strength + weapon bonus |
| Fire damage | Skill power + Intelligence |
| Block | Absorbs damage this turn only |
| Crit | 5% + 1% per Agility point; crits do 1.5× damage |
| Dodge | 1% per Agility point |
| Action Points | 3 a turn. Up to 1 unspent AP carries over, +1 more per 10 Intelligence |

**Starting hero (level 1):** Strength 4, Vitality 4, Intelligence 2, Agility 2. Health 70. Each level gives 2 Attribute Points and 1 Skill Point.

**XP to the next level:** 50 × current level. Level 10 (the Era 1 evolve threshold) takes 2,250 XP in total.

**Training:** 2 Soles per XP at the Hero Training Altar.

### Primal skills

| Skill | AP | Effect | Unlocked |
| --- | --- | --- | --- |
| Club Strike | 1 | 6 physical damage | Start |
| Guard | 1 | Block 6 + half Vitality this turn | Start |
| Roar | 2 | Stun one enemy for 1 turn (it skips its intent). 3-turn cooldown | Level 2 |
| Hurl Stone | 1 | 4 physical damage to any enemy. Interrupts a "calling backup" intent. 15% chance to stun (bosses resist) | Level 3 |
| Firebrand | 2 | 8 fire damage, then 3 burn a turn for 2 turns. Beasts with fire fear skip their next attack | Level 5 |

Skill Points upgrade a skill by +2 power (or +2 block) per rank, up to rank 3.

### Era 1 enemies

| Enemy | Health | Intents (shown before they act) | Notes |
| --- | --- | --- | --- |
| Wolf | 35 | Bite 6; Snarl (next Bite +50%) | Fire fear |
| Boar | 50 | Gore 7; Charging (next turn Charge 16) | Stun or block the Charge |
| Rival hunter | 45 | Spear 8; Guard (block 6); Throw 5 (ignores block) | Human, no fire fear |
| Cave bear | 90 | Swipe 11; Hunker (block 10) | Fire fear |
| Alpha Wolf (mini-boss) | 130 | Bite 9; Snarl; Call the pack (adds a Wolf, every 3 turns) | Hurl Stone interrupts the call |
| Sabretooth (mini-boss) | 210 | Claw 12; Bleed (3 a turn for 3 turns); Crouching (next turn Pounce 24) | Fire fear |
| Great Mammoth (era boss) | 420 | Stomp 12; Trumpet (block 15, Stomps +3 for the rest of the fight); Lowering tusks (next turn Charge 30) | Below half health it charges every third turn |

Trials 11 to 14 use veteran versions: +25% health and damage.

### The 15 Trials

| Trial | Enemies | Suggested level | First-win XP |
| --- | --- | --- | --- |
| Tutorial (first session) | Wolf | 1 | 50 (reaches level 2, unlocks Roar) |
| 1 | Wolf | 2 | 30 |
| 2 | Wolf, Wolf | 2 | 30 |
| 3 | Boar | 3 | 30 |
| 4 | Wolf, Boar | 3 | 30 |
| 5 | Alpha Wolf, Wolf | 4 | 80 |
| 6 | Wolf ×3 (the first-session wall) | 5 | 50 |
| 7 | Rival hunter | 5 | 50 |
| 8 | Rival hunter ×2 | 6 | 50 |
| 9 | Cave bear | 6 | 50 |
| 10 | Sabretooth | 7 | 150 |
| 11 | Veteran Cave bear, Wolf | 8 | 80 |
| 12 | Veteran Rival hunter ×2, Wolf | 8 | 80 |
| 13 | Veteran Boar ×2, Rival hunter | 9 | 80 |
| 14 | Veteran Cave bear ×2 | 9 | 80 |
| 15 | Great Mammoth | 10 | 300 |

First wins give about 1,220 XP. The other ~1,030 XP to reach level 10 comes from training (about 2,060 Soles).

### Era 1 gear (starting values)

| Slot | Shop (Soles) | Crafted | Boss drop |
| --- | --- | --- | --- |
| Weapon | +2 damage, 150 | +4 damage | Alpha Fang: +5 damage. Mammoth Tusk Club: +8 damage |
| Armor | +10 health, 150 | +20 health | Sabretooth Hide: +30 health |
| Helm, offhand, trinket | +1 to one attribute, 100 | +2 to one attribute | Rare loot box drops |

### Era 1 base costs

| Tier | Cost per building | Upgrade timer |
| --- | --- | --- |
| 1 | 50 Soles + 3 materials | 5 minutes |
| 2 | 150 Soles + 8 materials | 45 minutes |
| 3 | 400 Soles + 20 materials | 3 hours |

Lowered after the first playtest (was 100/300/800 Soles and 10 minutes/2 hours/8 hours): the tester cleared all 15 Trials and then had nothing to do but wait on the base. All five buildings to tier 3 now cost 3,000 Soles. Speeding up costs 1 Sole per minute left.

**Era 1 total:** about 3,000 Soles for the base plus about 2,060 for training, so roughly 5,000 Soles. At 6,000 steps a day (600 Soles at 10 steps per Sole), that is about 8 to 9 days, a little faster than the 10 to 14 day target. Revisit in the economy spreadsheet.

**Starter grant (MVP):** 300 Soles and 3 Bronze loot boxes.

**Change for v1:** Trials are open from the start, replacing "unlocks at hero level 5". The first-session plan has Trials 1 to 4 at minute 10, which a level 5 gate would block.

## PROCTOR (narrator)

The host and main source of personality; mostly writing. Comments on step data and on how the player plays. Achievements with funny descriptions:

> **First Blood:** You hit a rock with a slightly different rock. Civilization trembles. *(Bronze loot box)*

> **Couch Potato:** You've opened the game 4 times today and walked 212 steps. Even the wolves are worried about you. *(No reward. Go outside.)*

> **Mammoth Problems:** You lost to the Great Mammoth 6 times. It's not even a smart animal. *(Pity box, empty)*

Still open: text only or voiced.

## Story discovery

- **Found while walking:** story fragments in loot boxes (corrupted logs, messages from earlier contestants, map pieces, PROCTOR's redacted files).
- **Glitches:** brief messages that aren't from PROCTOR, more often each era.
- **Truth Board:** reads as a story. Each era's fragments are numbered parts, shown in order; upgrading the board lets the player spend Soles to decode deeper parts.
- **Flashbacks:** decoding every fragment of an era plays a flashback cutscene: a memory recovered from 7,301,223 (former tribute), shown as sepia film stills. Each era has one, and they continue the same story from era to era. It can be rewatched from the Truth Board.
- **Naming:** messages and glitches from 7,301,223 are always labeled "7,301,223 (former tribute)".

## Opening (built)

1. **Premise, typed in green:** "In a far-future empire, the ruling Aurum caste are engineered demigods. Once a generation they run the Ascent: a lowborn is placed in a simulation of all human history and must fight from caveman to god... Survive every era and you are remade as Aurum."
2. **Cutscene, black-and-white anime style** (tap to advance, Skip in the corner). Art to come; the build shows manga-style placeholders with an art brief on each shot. Shot list (`INTRO_CUTSCENE` in `src/data/story.js`):

| # | Shot | Text |
| --- | --- | --- |
| 1 | Wide: a vast quarry under a gold spire, hundreds of lowborn workers | Caption: "Lowborn Quarry 9. Third shift." SFX: CLANK… CLANK… |
| 2 | Mid: the hero swinging a pick; long hair, stubble, sweat, dust | Thought: "Same rock. Same quota. Same tower watching." SFX: KRAK |
| 3 | Extreme close-up: the sigils on the backs of his hands start to flash | Thought: "What…?" SFX: VMMMM |
| 4 | Close-up: he stares at his hands; workers back away | Voice from the spire: "Subject 7,301,224. Caste: Primal. You have been selected for the Ascent." |
| 5 | Wide: every worker kneels; light from the spire falls on him alone | Voice: "Projected survival: 0.003%." |
| 6 | White flash: his body breaks into a swirl of dust; the pick falls | SFX: FSSSHHHH |
| 7 | He lands on cold stone in a firelit cave, coughing dust, now in furs | Caption: "Somewhere. Somewhen." Thought: "Where… am I?" |
| 8 | His view: yellow eyes in the dark; a wolf steps into the firelight | SFX: GRRRR |
| 9 | Title card | "Trial 0: Fight to the death" |

3. **The first fight** starts straight after the title card.

The sigils on his hands are a new story thread: they're how the Ascent marks and tracks a tribute (in the full story, how it draws on their effort). They should glow when he walks and react to things from 7,301,223.

## The first hour (built; tune after playtests)

**Goal:** after about 20 minutes, the player wants to go for a walk, because the story stopped at a cliffhanger they can only get past by walking. Across the first hour of play (three sessions with walks in between), every session ends with three open loops:

- **A story loop that needs steps:** a message or memory that only clears up by walking.
- **A power loop:** a Trial they can't beat yet.
- **A timer loop:** a base upgrade finishing while they're out.

### New mechanic: transmissions (built)

Messages from 7,301,223 (former tribute) arrive broken. The signal only gets stronger while you walk: "Signal 12%. Walk 1,000 steps to clear it." Each one reads as a cliffhanger, and the expedition report shows the cleared message when you come back. The sigils on the hero's hands pulse as the signal grows.

This ties the story straight to walking, rather than only to Soles. In the MVP the +100 steps button fills the signal. The signal is followed on the Truth Board (not on Home): an incoming-signal card at the top, and each transmission placed in the story between the parts where it arrives.

### Session 1: about 0 to 25 minutes, ending with a walk

| Time | Beat | Hook |
| --- | --- | --- |
| 0:00 | Premise text, cutscene, "Fight to the death" | Who chose him, and why do his hands glow? |
| 2:30 | Wolf fight won in under a minute; PROCTOR introduces itself | A host who clearly doesn't want him to win |
| 3:30 | Starter grant; open 3 loot boxes; first gear changes the hero's look | Variable reward |
| 6:00 | First building free; start an upgrade with a timer | Something finishing later |
| 8:00 | First level up; unlock Roar | Power |
| 10:00 | Trials 1 to 4 | Quick wins |
| 14:00 | **First transmission**, broken: "they told you this was a ███ … the tower … your hands …" Signal 8%. His sigils flicker. PROCTOR: "Cosmic ray. Ignore it." | Story cliffhanger that needs steps |
| 16:00 | Trial 5, the Alpha Wolf; first Truth Board part: a carving on the cave wall. His sigils glow when he touches it | Someone was here before |
| 19:00 | **The wall:** Trial 6 is too hard, Soles are gone | Power loop |
| 20:00 | Goal card: "Walk 1,000 steps: clear the signal, earn a loot box, finish your upgrade." Ask for notifications: "Signal restored. 7,301,223 has something to tell you." | All three loops point out the door |

### Session 2: after the first walk, about 25 to 45 minutes

| Beat | Hook |
| --- | --- |
| Expedition report opens with the cleared transmission: "they told you this was a game. it isn't. i was 7,301,223. i was a miner too." | Answered, and a bigger question |
| Spend Soles; finish upgrades; Trials 6 to 9 | Power payoff |
| Truth Board parts 2 to 4; the map piece shows layers under the firepit | Mystery grows |
| A 2-panel black-and-white **memory flicker** (not the full flashback): a different miner's hands, flashing the same way | Foreshadows the Era 1 flashback |
| Trial 10, the Sabretooth: barely won or lost | Power loop |
| Second transmission: "count the jokes. when it stops joking, run." Signal 5%; walk 2,000 steps | Story loop |

### Session 3: after the second walk, about 45 to 60 minutes

| Beat | Hook |
| --- | --- |
| Cleared transmission plus Truth Board tier 2: the winners register (same body, different names) | First real dread |
| Trials 11 to 14; the Great Mammoth teased on the map | Power climb |
| PROCTOR makes one remark with no joke in it, then covers it up | Chilling moment |
| Ends with the Mammoth too strong, the last Truth Board parts still locked, and "Memory 1" at 7 of 9 | Players come back for the flashback and the Era Key |

The Era 1 flashback (all 9 parts decoded) and the Mammoth land in the following days, at the 10 to 14 day pace.

### Retention design rules

- Never end a session on a resolved beat; always on a question.
- A new story beat in every session, and each one needs steps, not just Soles.
- PROCTOR's tone shifts slightly across the hour, so players notice something changing.
- Cutscenes stay short (under 90 seconds) and skippable.

## MVP scope

The MVP tests whether the game is fun. All ten eras are built before the public launch.

- **MVP:** Eras 1 to 3 (45 Trials); +100 steps button; Soles, loot boxes, expedition report; daily goals and weekly bonus; hero, base, shop and crafting; Trials with replays; PROCTOR and achievements; story fragments and the Truth Board.
- **After MVP, before launch:** Apple Health; Eras 4 to 10; an endgame with up to 3 replays through a tier system; social (friends list, Houses/guilds, guild raids, PvP); monetization.
- **Not planned:** widget; workout and stair materials; an audience mechanic; stamina bars; location-based loot.

## Screens and flow (from zack's sketches)

![Screen flow mockup](sketches/screen-flow-landscape.png)

Every screen branches from Home. A Trial runs map, combat, reward, then back to the map. (The mockup predates the five base buildings and the +100 steps button.)

Sketches: [Home and Trials map](sketches/home-trials-map.jpg), [Combat and reward](sketches/combat-reward.jpg), [HQ, crafting and hero](sketches/hq-crafting-hero.jpg).

| Screen | What's on it | Goes to |
| --- | --- | --- |
| Home | Hero in the center; Base and Trials buttons; settings top-left, currencies top-right; shop and inventory at the bottom; +100 steps button (MVP) | Base, Trials map, Shop, Hero |
| Trials map | A winding path of Trial nodes over an era background; two mini-bosses and the era boss with the Era Key | Combat |
| Combat | Hero vs. enemies, enemy intents, skill bar | Reward |
| Reward | First win: a loot box opens. Replay: materials and gear | Back to the Trials map |
| Base | Workshop, Hero Training Altar, Inventory, Shrine, Truth Board | Each building |
| Workshop | Item + item = new item (three slots after upgrade), known recipes, inventory strip | Back to Base |
| Hero | Stats and Skills tabs, the hero, gear slots, an equal-square inventory grid, a Train button | Back to Home |

Sketch questions answered: blueprints aren't a slot (they teach recipes); the inventory is equal squares; training happens at the altar or the Hero screen.

## Art style

**Direction (zack, 2026-11-20):** book/novel sci-fi, informed by the Red Rising novels. The comic-book look is retired.

- **Mood:** a Society control room watching a test. Dark charcoal and soot, deep crimson, burnished gold, a cold terminal green for system text.
- **World, hero, enemies and base:** 3D with soft, natural lighting. No ink outlines, toon bands or halftone. Fire and light do the drama.
- **UI (final, 2026-11-20):** the team's mockup `ui-that-we-want.png` is the target. Imperial gold-on-crimson: ornate beveled gold frames, charcoal and crimson plates with pointed ends, laurels, Cinzel capitals with wide-tracked subtitles. Every frame is an image slot that takes zack's hand-made PNGs; see docs/ui-assets.md (sizes, 9-slice caps) and docs/ui-art-prompts.md.
- **Home layout (reference screen):** portrait medallion with the PRIMAL / SUBJECT / LEVEL plate and a gear button top left; the segmented TODAY STEPS strip and the COMMAND BRIEF // SIGNAL panel (radar and skyline inset) top center; a winged resource bar top right; a hanging crimson banner with a laurel behind BASE, SHOP and GOALS on the left; TRIALS (crimson) and BOXES on the right; the hero and fire in the middle with a POINTS TO SPEND tag; +100 STEPS as a crimson plate with a laurel medallion and TEST tag, and a trophy button, bottom right. Behind it all, a painted backdrop: crimson sky, huge red moon, and the citadel with lit windows and an eagle banner on the cliff at right (image slot backdrop-home.png).
- **Story moments:** cutscenes and flashbacks as grainy black-and-white or sepia film stills with terminal captions, not comic panels. Loot reveals and achievements as gold-on-black seals.
- **Readability:** every label stays legible on a landscape phone; small caps never go below about 11px.
- **Story fit:** the UI is PROCTOR's interface, the same in every era; its glitches carry the story glitches.

## Technical

**Engine (decided):** Three.js, in two builds from one codebase.

| Build | Hosted / installed | Step data | Used for |
| --- | --- | --- | --- |
| Web build (MVP) | Vercel; opened in the phone's browser | +100 steps button | The MVP and everyday testing |
| iPhone app (later) | Capacitor wraps the same code; Xcode or TestFlight | Apple HealthKit through a Capacitor plugin | The real walking loop and the App Store release |

- Rendering: Three.js standard (PBR-lite) materials, warm point light from the fire, no outline pass.
- The +100 steps button feeds the same code path real steps will use; hidden in release builds.
- **Backend:** accounts, cloud saves, server-side loot rolls (Vercel or similar).
- The iPhone app needs a Mac with Xcode; TestFlight ($99/year) for testers.
- **Proposed performance targets:** 60 fps on iPhones from about 2021; install under 150 MB; very low battery drain.

## Monetization (direction decided)

Sell things that make walking worth more, never things that replace it.

- **Free download;** Eras 1 to 3 free.
- **One-time full-game unlock** for Eras 4 to 10.
- **In-game purchases:** boosters, steps-per-Sole upgrades as a premium path, a season pass with walking challenges and cosmetic rewards, cosmetics (hero skins, base themes, PROCTOR voice packs), extra loot box storage and Inventory slots.
- **Optional rewarded ads only** (for example, double a loot box). No forced ads.
- **Never sold:** Soles, XP, power gear, paid loot boxes.
- **Open:** prices.

## Risks

| Risk | Mitigation |
| --- | --- |
| Cheating | Server-side loot rolls, step-rate checks, soft cap, trusted sources |
| Economy too generous or stingy | Spreadsheet model first; rates controlled from the server |
| Buying XP makes Trials feel skippable | First-win XP should feel like the best source; tune training costs |
| Players who can't walk much | Count workouts and active minutes from Apple Health |
| Burnout | Weekly bonus, rest days, loot box limit instead of streaks |
| Content scope (10 eras, 150 Trials) | Prove 3 eras first; reuse systems |
| App Review and health data | Gameplay use only; clear explanation; never sold or shared |
| Loot box rules | Show odds in the game; check laws if boxes are ever sold |
| Borrowing too closely from inspirations | Original names, castes, characters and setting |
| Capacitor HealthKit plugin | Test early; fall back to a small custom Swift plugin |
| 3D in a web view on older iPhones | Small scenes; profile on the oldest target phone |
| "The Ascent" is also a 2021 game title | Kept as the working title; revisit before branding |

## Roadmap (proposed)

| Phase | Goal | Done when |
| --- | --- | --- |
| 1. Design sign-off | Approve this document; build the economy spreadsheet | Economy model done |
| 2. Combat prototype | Trials fun on their own, in the web build | Playtesters replay Primal Trials unprompted |
| 3. Loop prototype | +100 steps, Soles, loot boxes, expedition report, base and hero screens | Full loop works in the browser on team phones |
| 4. Vertical slice | Era 1 complete | New players finish the first session and come back |
| 5. MVP | Eras 2 and 3, daily goals, Truth Board, backend | Outside testers play all three eras |
| 6. Full game | Apple Health, Eras 4 to 10, endgame, social, monetization | App Store launch |

## Gap review

| # | Gap | Status | Decision |
| --- | --- | --- | --- |
| 1 | Couch session had nothing to fill it | Resolved | Replays give crafting materials and low-level gear; no loot boxes or XP |
| 2 | Where XP comes from | Resolved | First Trial wins, plus training with Soles |
| 3 | Skill vs. power | Resolved | Smart play beats enemies up to about 20% stronger; strength can still win |
| 4 | Economy across eras | In progress | Gear upgrades on evolving; old materials convert to Soles. Needs the spreadsheet |
| 5 | Running out of game | Later | All ten eras before launch; up to 3 replays via a tier system |
| 6 | The name | Resolved | Keep "The Ascent" for now |
| 7 | The story had no answer | Resolved | Soles are SOULS (see The truth) |
| 8 | Step data edge cases | Later | Fixes accepted for the full game; MVP uses the +100 steps button |
| 9 | Monetization | Resolved | See Monetization; prices open |
| 10 | Social layer | Later | Friends, Houses, guild raids, PvP after the MVP |

Still missing from the document: audio direction, a notification plan, analytics, privacy and compliance, team/budget/timeline.

## Open decisions

1. Economy spreadsheet: starting numbers, training costs, rate-upgrade prices, days per era.
2. Prices: full-game unlock, boosters, season pass, cosmetics.
3. Art style: decided, Red Rising-style book sci-fi with the imperial gold-frame UI from the team mockup (see Art style).
4. PROCTOR: text only or voiced.
5. Era 1: v1 numbers drafted (see Era 1 combat); tune after the combat prototype.
