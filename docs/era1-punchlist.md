# Era 1 punch list

From a full playtest on 2026-11-21: a new save played through in a phone-sized browser (844×390). It covered the opening, tutorial, loot boxes, Base, Hero, Shop, Goals, achievements, Settings, all 15 Trials with every enemy, the memory flicker, finisher unlocks, the Truth Board and flashback, evolving and the Era 2 screen. It also includes an audit of the code and assets for stand-ins. No errors were thrown during the run.

Priority: **P0** blocks a good playtest with outside players · **P1** needed before Era 1 is "done" · **P2** polish and later.

## 1. Bugs

| | Item | Status |
| --- | --- | --- |
| P0 | After being hit, the hero could stay tinted solid red (into later fights and on Home): a hit flash cut off by a screen change never cleared | **Fixed** |
| P1 | Base showed "Build free!" on all five buildings; only the first build is free | **Fixed** (now "First one free") |
| P1 | Trial 15's long title ("The Great Woolly Mammoth") wraps onto two lines on phones and overlaps the Mammoth's intent badge and name | To do |
| P1 | Level-up and "new skill to learn" notes stack on top of the Victory header | To do |
| P2 | Evolve window says "leftover flint and bone turn into Soles"; wood and beast parts convert too | To do |
| P2 | Boss and star-reward loot boxes ignore the 18-box limit (the limit only applies to walking). Decide: intended, or cap everything | Decide |
| P2 | All six Boon cards use the same icon | Art |

## 2. Art and animation still missing

**Enemies:** Act I is done (rigged Mangy, Wolf, Beta, Alpha). Everything after it is a stand-in built from simple shapes. Reference images are in `docs/art/reference/enemies/`.

| | Enemy | Now | Needs |
| --- | --- | --- | --- |
| P0 | Mountain Lion (Trials 7–9) | Block stand-in | Model, rig, clips: idle, swipe, stalk wind-up, pounce, hurt, death |
| P0 | Sabretooth (Trial 10, mini-boss) | Block stand-in | Model, rig, clips; boss-scale presence |
| P0 | Enraged Elk (Trials 11–12) | Block stand-in | Model, rig, clips incl. paw-the-ground and charge |
| P0 | Woolly Rhino (Trials 13–14) | Block stand-in | Model, rig, clips incl. horn-lower and charge |
| P0 | Great Woolly Mammoth (Trial 15, era boss) | Block stand-in | Model, rig, clips incl. trumpet, tusk-lower, charge, a big death |
| P1 | Cave Hyena (Trial 6) | Wolf model repainted with spots | Own model (sloped back, rounded ears) |

**Hero animations** (the rig has idle, walk, attack, block, hurt, roar, throw, death, victory):

- P1 **Jump attack** clip: to redo Skull Crusher as a crouch, leap, land in front and drive the club down. It was reverted because faking it without a clip looked wrong.
- P1 **Firebrand** (cast or throw a burning brand), **Sweep** (wide arc), **Second Wind** (catch breath, glow). These currently reuse attack and throw.
- P2 **Terror** (run through, lift, roar) and **Bloodrush** (three-hit flurry) are built from the generic attack; dedicated clips would sell them.

**Base:** tier-1 models exist for all five buildings. P1: tier 2 and tier 3 models (references are in `docs/art/reference/buildings/`). Right now a building looks the same at every tier, so upgrading has no visual payoff.

**Icons:** P2: the starter Worn Club and the six Boons still use generic icons.

**Story art:**
- P1 Memory flicker after Trial 7: 2 shots, currently placeholders.
- P1 Era 1 flashback ("Memory 1: The first cave"): 7 panels, currently text on parchment cards.

**Audio (none in the game today):**
- P0 Combat hits, finisher impacts, beast snarls and roars, the forge's hammer strikes, loot box opening by tier (rarer boxes should sound bigger), UI taps.
- P1 Ambient fire and cave, a music bed for Home and Trials, a boss theme.
- P2 PROCTOR voice.

This is the single biggest gap in how the game *feels*.

## 3. Cutscenes: where the story needs them

The opening is done. Proposed additions, in the same black-and-white style with gold accents:

| | Moment | What it shows | Shots |
| --- | --- | --- | --- |
| **P0** | **Evolution: Era 1 → Era 2** (the next big item) | See the outline below | 6–8 |
| P1 | Memory flicker (after Trial 7) | Another miner's hands flashing; the spire selecting 7,301,223 | 2 (art) |
| P1 | Era 1 flashback (all 9 Truth Board parts decoded) | 7,301,223's first cave, the tally marks, the message carved for you | 7 (art) |
| P1 | Boss intros, first fight only | **Alpha:** howl on a ridge, the pack gathers. **Sabretooth:** eyes in the rocks, the other predators scatter. **Mammoth:** the ground shakes, the herd parts | 2–3 each |
| P1 | Mammoth falls → Era Key | The Mammoth collapses into gold dust; the Era Key forms from the dust; the sigils answer it | 3 |
| P2 | Transmission cleared (×3) | One illustrated panel per cleared message from 7,301,223 | 1 each |
| P2 | PROCTOR's slip (after Trial 12) | A screen glitch: the UI flickers to something underneath for a frame | effect |

**Era 1 → Era 2 evolution, proposed outline:** this is Act 1's closing beat, so it should mirror the opening.

1. The hero stands in the cave with the Era Key; the sigils on his hands ignite gold (callback to opening shot 3).
2. Gold light from above, like the spire's beam in the quarry (callback to shot 5).
3. His body breaks into gold dust (callback to shot 6), but this time we follow the dust.
4. A time-lapse while he's in transit: the cave's firepit becomes a mud-brick wall, then a village, as millennia pass.
5. He reforms upright in a mud-brick village, in woven cloth with a spear: visibly further along the ladder.
6. PROCTOR: "Era 2. Brick. Congratulations: you have invented walls. Try not to die inside them."
7. A glitch from 7,301,223 (red italic): "two eras. i made it to nine. they let you think you're climbing."
8. Title card: **ERA II: BRICK**.

## 4. Missing features and systems

| | Item | Notes |
| --- | --- | --- |
| P0 | Era 2 content | Now a "still being designed" screen after evolving |
| P1 | Real steps (Apple Health via the Capacitor iPhone app) | The +100 steps button stands in. `ingestSteps()` is the single entry point |
| P1 | Push notifications | Signal cleared, building finished, loot boxes waiting, daily goals. Probably the biggest retention lever we're missing |
| P1 | Accounts and cloud save | Progress lives only in the browser; clearing it or changing phones loses everything. Server-side loot rolls come with this |
| P1 | Teach the remaining systems | The first session teaches boxes, the Base, leveling and Trials. Not taught: Workshop, beast parts, hammer timing, Truth Board, stars, the 4-skill loadout choice |
| P1 | Boons | Six placeholders, all generic. Needs a real list (ideally era-themed) and icons |
| P2 | Steps-per-Sole upgrades (10 → 8 → 5 steps per Sole) | In the design, not in the game |
| P2 | Heirloom on evolve | Keep one item into the next era (designed, not built) |
| P2 | Settings | Sound and music volume (once audio exists), gore toggle, 2× combat speed |
| P2 | Monetization | Direction decided (free Eras 1–3, unlock, walking boosters, cosmetics); nothing built |
| P2 | Analytics | Needed to measure retention and tune the economy |

## 5. Balance and economy

| | Item | Notes |
| --- | --- | --- |
| P1 | Era 1 pace | The bot finishes in about 8 days at 6,000 steps a day; the target is 10–14. Mostly the cheaper base. Confirm with real playtests before changing |
| P1 | Skill points are tight | 9 points through level 10; learning all 6 extra skills uses 6, leaving 3 for ranks. Good for build choice, but check that later Trials don't feel underpowered |
| P1 | The Mammoth doesn't reward the right build | A generic build wins 75% vs 68% for a Mammoth build (300 simulated fights). The armor and enrage puzzle should matter more |
| P2 | Boss fights play like big regular fights | Add a phase change (Mammoth enrage visuals, the Alpha's howl) to make them feel like set pieces |

## 6. Playability and addictiveness, by feature

Ratings are for how each feature plays now, as experienced in the playtest.

| Feature | Rating | What works | What's holding it back |
| --- | --- | --- | --- |
| Opening | **Strong** | Great art, short, clear stakes, straight into a fight | Silent: needs sound most of all |
| Walking → expedition report → loot boxes | **Good** | Clear cause and effect; grouped boxes; pity timer means a good box always arrives | No sound or extra spectacle for Gold-and-up boxes; no notification pulling you back after a walk |
| Trials (Act I) | **Good** | Readable intents, traits, 4-skill choice, Fury and finishers, stars give replay goals | Boss fights lack set-piece moments |
| Trials (Acts II–III) | **Weak (art)** | The mechanics are there: stalkers, armor, enrage | Block-shaped animals undercut everything; this is where players would drop |
| Crafting | **Okay** | Real choices (parts and effects, sets in green), easier hammer | Still short on dopamine: needs sound, sparks, a slow reveal for Masterwork, maybe a rare "Flawless" grade |
| Base | **Okay** | Timers pull you back; tap-to-open | Buildings look the same at every tier, so upgrades feel invisible |
| Hero and gear | **Good** | Gear shows on the model, swipe to spin, set bonuses | — |
| Story (transmissions, Truth Board, flicker, flashback) | **Good structure, weak presentation** | A mystery that unlocks by walking is the right hook | Flicker and flashback have no art; transmissions are text only |
| PROCTOR | **Improved** | Speaks less, each line helps | Needs a voice or sound to land as a character |
| Daily goals, weekly bonus, achievements | **Okay** | Present and rewarding | Nothing reminds you they exist outside the app |

**Overall:** the loop is complete and the first ~30 minutes (opening through the Alpha) are genuinely engaging. To make Era 1 sticky enough for outside playtesters, in this order:

1. Rig the five stand-in animals.
2. Add sound.
3. Make the evolution cutscene.
4. Add push notifications.

The first two matter most: right now the strongest moments (finishers, Gold boxes, Masterwork forges) happen in silence, and Act II onwards loses its visual punch.

## Suggested order of work

1. **Art (zack):** Mountain Lion, Sabretooth, Elk, Woolly Rhino, Mammoth models and clips; building tiers 2–3.
2. **Audio:** a first pass of combat, loot and forge sound effects plus one music bed.
3. **Story:** the Era 1 → 2 evolution cutscene (outline above), then the flicker and flashback art.
4. **Bugs:** Mammoth title overlap, toast overlap, evolve text.
5. **Systems:** Apple Health + notifications (the iPhone app), then cloud save.
6. **Era 2** design and build.
