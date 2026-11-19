# The Ascent: Game Design Document

Draft as of 2026-11-19. Working title: **The Ascent**. This file has the latest brainstorming decisions; the Claude Doc "Walking Game: Game Design Document" may be behind it.

**Rule:** no game code until this design document is approved.

## Overview

**Pitch:** An addictive iPhone game where you earn your play time by walking. Steps you take in daily life, counted by the phone even when the game is closed, become **Flux**. On the couch you spend Flux to gear up your hero, build your base and fight through turn-based Trials, climbing from a Stone Age outcast to a golden post-human.

**Core rule:** walking builds power; the couch tests skill.

**Platform (MVP):** iPhone only.

**Inspirations (tone and themes only, no names or settings borrowed):**

| Series | What we take |
| --- | --- |
| Dungeon Crawler Carl | A sarcastic AI host, loot boxes, achievements with funny descriptions |
| Red Rising | Climbing from the lowest caste to the top; a ruling class hiding the truth |
| Ender's Game | Training games that turn out to be more than games; tactics over raw stats |

**Tone:** darkly funny on the surface, with a serious mystery underneath.

## Story premise

In a far-future empire, the ruling **Aurum** caste are engineered demigods. Once a generation they run **the Ascent**: a lowborn is placed in a simulation of all human history and must fight from caveman to god. Survive every era and you are remade as Aurum.

- The player starts as an **Ember**, the lowest caste.
- The trial is run by **PROCTOR**, an AI host who finds the player unimpressive.
- The simulation runs on real physical effort. Every step the player takes powers their Ascent. This is the story reason for walking.
- Something is wrong with the Ascent. The truth comes out gradually through the world (see Story discovery). We have not decided the answer on purpose; it will grow out of the world as we build it.

## Currencies and materials

- **Flux:** the main currency, earned by walking. Spent in the shop, on base upgrades and on skill respecs.
- **Caches:** loot boxes earned by walking (Bronze, Silver, Gold, Legendary, Celestial). They hold gear, era materials and story fragments.
- **Era materials:** found while walking; they match the current era (flint and bone in Era 1, clay and grain in Era 2, and so on).
- **Ichor:** the rarest material, the golden blood of the Aurum. Endgame only; not in the MVP.

## Core loop

```
WALK (daily life)   ->  Flux + Caches (gear, materials, story fragments)
        |
HERO + BASE         ->  gear, skills, attributes, base upgrades
        |
TRIALS              ->  XP, boss drops, Era Key
        |
Next Trial too hard ->  need more power -> WALK
```

- Trials are free to play and replay. No stamina bar or play timers.
- Progress is gated by power: once the next Trial is too hard, getting stronger takes Flux and materials, which come from walking.
- Players can always replay old Trials or try new builds, so the couch never feels locked.

## The 10 eras

The MVP ships **Eras 1 to 3**. The rest come later on the same systems.

| # | Caste | Era | Base | Hero look | Materials | Era boss |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Ember | Stone Age | Cave and firepit | Hunched, furs, club | Flint, bone | Great Mammoth |
| 2 | Clay | First farmers | Mud-brick village | Upright, woven cloth, spear | Clay, grain | Beast King |
| 3 | Bronze | Bronze Age | Walled city, ziggurat | Bronze armor, sling | Copper, tin | God-King |
| 4 | Iron | Classical empires | Stone fortress | Legion armor, shield | Iron ore, marble | Warlord Titan |
| 5 | Steel | Medieval | Castle and keep | Plate armor, longsword | Steel, timber | Dragon |
| 6 | Powder | Age of sail and gunpowder | Citadel and harbor | Duelist coat, flintlock | Saltpeter, sailcloth | Kraken Admiral |
| 7 | Steam | Industrial | Foundry city | Goggles, gear-arm | Coal, brass | Iron Colossus |
| 8 | Chrome | Modern and atomic | Bunker, then metropolis | Tactical suit, exo-frame | Uranium, alloy | Reactor Beast |
| 9 | Neon | Cyber near future | Arcology tower | Cybernetics, energy blade | Silicon, data shards | The Singularity |
| 10 | Aurum | Stellar post-human | Orbital citadel | Gold metahuman, star-armor | Star-metal, Ichor | The Sovereign |

The hero's body changes across eras, not just their gear: posture, height, augmentations, and finally a gold glow.

**Evolving to the next era needs three things:**

1. The Era Key, dropped by the era boss (Trial 15).
2. The base at max tier for that era.
3. The hero at the era's level threshold.

When the hero evolves, PROCTOR offers **3 random Boons; the player keeps 1** (for example "Berserker Blood: +40% damage below half HP"). After 10 eras every hero is different.

## Hero

- Levels 1 to 100, about 10 levels per era.
- Gear slots: weapon, armor, helm, offhand, trinket.
- **Each level:** 1 Skill Point (unlock or upgrade a skill) and 2 Attribute Points.
- **Attributes:**
  - **Might:** physical damage
  - **Grit:** health and defense
  - **Mind:** spell power and Action Point regeneration
  - **Instinct:** crit chance, dodge, speed
- Respecs cost Flux.
- **Legacy traits:** when the hero evolves, each piece of gear leaves behind one small trait that carries forward, so old gear never feels wasted.

## Base

- One plot of land that changes in place each era: the cave becomes the foundation of the village, which becomes the base of the walled city, and so on. Old layers stay visible.
- Buildings give passive bonuses:
  - **Forge:** crafting tier
  - **Barracks:** hero stats
  - **Storehouse:** how many Caches can be held
  - **Shrine:** loot odds
- Upgrades run on timers; Flux can speed them up.
- The base holds the **Truth Board** (see Story discovery).

## Shop and crafting

- The **shop** sells basic gear and materials for Flux. A dependable fallback.
- The **forge** makes the best gear from walk materials + Trial boss drops + blueprints. The best items need all three, so walking and Trials both matter.

## Trials (combat)

Turn-based strategy. Unlocks at hero level 5 (the first-session tutorial fights come before that).

- **15 Trials per era:** mini-bosses at 5 and 10, the era boss at 15.
- **Enemies show their next move** with an intent icon (attack for 12, block, charging a big attack, calling backup). The player reads the threat and picks an answer.
- The hero gets **3 Action Points per turn** and brings a **loadout of 4 to 6 skills**.
- **Each era adds a new skill branch and a new kind of enemy puzzle.** Skills from earlier eras stay available, so loadouts get deeper over time.

| Era | Skill branch | What it teaches | Enemy puzzle |
| --- | --- | --- | --- |
| Ember | Primal: Club Strike, Hurl Stone, Roar (stun), Firebrand | Attack and defense, reading intents | Wolves hunt in packs; stun one, kill the other |
| Clay | Beastbond: a tamed companion that acts on its own | Managing two units | Raiders target the companion |
| Bronze | Sun Rites: first spells (Solar Flare, Blessing, Curse) | Resources, buffs and debuffs | Armored chariots resist physical damage |
| Later eras | Formations, combos, gunpowder, gadgets, hacking | | |

## Walking and step tracking

- iPhone counts steps on its motion chip all day and stores them in Apple Health, along with Apple Watch steps. The game does not need to run in the background.
- On open, the game reads steps since the last session and pays them out.
- Steps come with timestamps, so rewards can depend on how the player walked:
  - Continuous walks of 20+ minutes roll better Caches.
  - Morning, evening and weekend walks have their own bonuses.
  - Workouts and stairs give special materials.
- **Cache cap:** the Storehouse holds a few days of finds, which encourages regular check-ins without punishing a busy day.
- **Return report:** opening the app after walking shows a summary (steps, Flux, Caches, bonuses, any story anomalies) and lets the player open Caches one by one.
- **Widget:** home and lock screen widget showing Flux today and steps until the next Cache. It refreshes periodically, not live.
- **Daily goals:** three small goals a day plus a weekly bonus. Built around rest days, not unbroken streaks.
- **Anti-cheat:** roll loot on the server; flag implausible step rates; trust phone and watch data over manually entered steps.
- **Location:** not used in the MVP (battery, privacy, App Review).

## PROCTOR (narrator)

PROCTOR is the main source of personality, and cheap to build because it is mostly writing.

- Comments on the player's real step data (lazy days, big days, late-night walks).
- Achievements with funny descriptions. They become a second collection game, teach hidden systems, and get screenshotted and shared.

Sample achievements:

> **First Blood:** You hit a rock with a slightly different rock. Civilization trembles. *(Bronze Cache)*

> **Couch Potato:** You've opened the game 4 times today and walked 212 steps. Even the wolves are worried about you. *(No reward. Go outside.)*

> **Mammoth Problems:** You lost to the Great Mammoth 6 times. It's not even a smart animal.

Still open: text only or voiced.

## Story discovery

- Some Caches contain **story fragments**: corrupted logs, messages from earlier contestants, map pieces, PROCTOR's redacted files.
- Fragments collect on the **Truth Board** in the base.
- The rarest fragments drop only on long continuous walks (30+ minutes) or on special days, so walking is how the player uncovers the story.
- **Glitches** happen more often each era: brief messages that aren't from PROCTOR, which PROCTOR dismisses.
- Open questions the story is built around: who is sending the messages, what happened to earlier contestants, why the Ascent needs real human effort.

## First session (target: 20+ minutes, then the player goes for a walk)

| Time | What happens |
| --- | --- |
| 0:00 | Cold open. Black screen: "Subject 7,301,224. Caste: Ember. Selected for the Ascent. Projected survival: 0.003%." The hero wakes in a cave. |
| 0:30 | First fight, no menus: one wolf, two skills (Club Strike, Guard), intent icons. Won in under a minute. |
| 2:00 | Apple Health permission asked in-story. PROCTOR reviews the player's last 7 days of real steps, roasts or praises them, and converts them into starting Flux and Caches, so new players aren't starting from zero. |
| 4:00 | Open Caches: first loot reveal, equip gear, the hero's look changes. |
| 6:00 | Base: build the firepit (instant). Start the Hide Tent (2-hour timer). |
| 8:00 | First level up: unlock Roar, spend attribute points. |
| 10:00 | Trials 1 to 4: quick wins that introduce new enemy intents one at a time. |
| 14:00 | First glitch: "they told you this was a game." PROCTOR: "Disregard. Minor simulation artifact." |
| 16:00 | Trial 5 mini-boss, the Alpha Wolf. Drops the first story fragment. |
| 19:00 | The wall: Trial 6 is a two-wolf pack the player can't beat yet, and they're out of Flux. "Fortunately, there's a solution. It's called your front door." |
| 20:00 | Clear goal: "Walk 2,000 steps: unlock a Cache and finish your Hide Tent." Ask for notification permission. |

## MVP scope

**In:**

- iPhone
- Eras 1 to 3 (about 45 Trials)
- Walking with Flux, Caches and the return report
- Hero, base, shop and forge
- Turn-based Trials
- PROCTOR and achievements
- Story fragments and the Truth Board
- Widget

**Later:**

- Eras 4 to 10
- Houses (factions with shared step goals)
- Async raids on other players' bases (Clash-style)
- Android
- Location-based loot

**Not planned:** an audience or viewer mechanic.

## Technical

**Requirement: test on real iPhones from the first build.** Step data only works on a real device. Needs a Mac with Xcode; a free Apple ID installs on your own phone but builds expire after 7 days. TestFlight (Apple Developer account, $99/year) gives longer-lived builds and lets testers install them.

**Step data:** Apple HealthKit. Read step samples since the last session on open; optional background delivery for "rare find" notifications, which iOS delivers on its own schedule (often minutes late), so nothing core depends on it.

**Engine (still open):** the game is now a 2D turn-based game with menus, a base view and a widget, on iPhone only.

| Option | Pros | Cons |
| --- | --- | --- |
| Native Swift (SwiftUI + SpriteKit) | Best HealthKit and widget support; no plugins; 2D turn-based doesn't need a big engine | New for the team if they mainly know Godot; iOS only (fine for MVP, a rewrite for Android later) |
| Godot 4 (iOS export) | Team already knows it; strong 2D tools; Android later is easier | Needs a HealthKit plugin (may need to write one); the widget must be built in Swift anyway |
| Unity | Mature HealthKit plugins; cross-platform | New engine for the team; licensing |

**Backend:** accounts, cloud saves and server-side loot rolls. Vercel or a similar host works.

**Proposed performance targets:** 60 fps on iPhones from about 2021 onward. Install size under 150 MB. Very low battery drain, because the OS counts steps rather than the game.

## Open decisions

1. Engine: native Swift or Godot.
2. Art style: pixel art, hand-drawn 2D or stylized low-poly.
3. Hero: fixed character or customizable (name, look, gender).
4. Flux rate: how many steps one Trial's worth of progress should cost.
5. PROCTOR: text only or voiced.
6. Next design pass: detail Era 1 completely (all 15 Trials, enemies, Ember skill tree, base buildings, Great Mammoth boss).
