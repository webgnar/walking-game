# MVP build notes (Era 1)

What the first playable build contains, and every place where the build had to fill a gap in the GDD. The GDD stays the source of truth: anything here that the design thread decides differently should change in code, not in this file.

## How to run

```
npm install
npm run dev      # local server, open the printed URL on your phone (same Wi-Fi)
npm test         # combat balance check + a bot that plays Era 1 end to end
npm run build    # production build in dist/ (what Vercel serves)
```

Progress is saved in the browser (localStorage). **Settings → Reset progress** starts over.

## What's in the build

| GDD system | Status |
| --- | --- |
| Opening: premise text, 9-shot black-and-white cutscene (placeholder art with art briefs), tutorial wolf fight, starter grant (300 Soles, 3 Bronze boxes) | Done. Drop art into `public/cutscenes/` and set `art` on each shot in `INTRO_CUTSCENE` |
| +100 steps button (hold to keep walking) feeding one step entry point | Done. `ingestSteps()` in `src/logic/economy.js` is the single path HealthKit will call later |
| Soles at 10 steps per Sole, daily soft cap 30,000 (half rate above) | Done |
| Loot box every 1,000 steps, GDD rarity table, Shrine bonus, 3-day box limit | Done |
| Expedition report | Done: steps collect into a report you open from Home |
| Daily goals (three a day) and weekly bonus (rest days allowed) | Done |
| Hero: levels, 2 attribute + 1 skill point per level, training at 2 Soles per XP, era cap at level 10 | Done |
| Five gear slots, shop, crafted and boss gear with GDD numbers | Done |
| Base: five buildings, three tiers, GDD costs and timers, speed-up at 1 Sole a minute, first building free | Done |
| Workshop: two-item crafts, three-item after tier 2, blueprints, learn-by-experimenting | Done |
| All 15 Era 1 Trials, mini-bosses, Great Mammoth, Era Key, first-win vs replay rewards | Done |
| Combat: 3 AP + carry-over, intents, block, crit, dodge, stun, burn, bleed, fire fear, interrupts, veterans | Done |
| PROCTOR lines, glitches (first after Trial 4), 19 achievements | Done |
| Story fragments and Truth Board decoding | Done: 9 Act 1 fragments read in order as a story; decoding all 9 plays the Era 1 flashback cutscene |
| First-hour story beats | Done: transmissions from 7,301,223 (former tribute) after Trials 4, 10 and 14 clear with 1,000 / 2,000 / 3,000 steps (followed on the Truth Board, where each one sits in the story between the parts where it arrives; cleared message also opens the expedition report); memory flicker after Trial 7; PROCTOR's slip after Trial 12. Saves that already passed those Trials get their transmissions on next launch |
| Currency display | Top right shows Soles only, with the walking rate under it ("1 Sole = 10 steps"). Flint and bone show only on Base, Workshop and Shop |
| Inventory | Gear and Consumables tabs. Only gear uses inventory slots; consumables (boosters) have unlimited storage. **Salvage junk** turns all unneeded gear into Soles in one tap, after a confirm that lists every item. Values: worn 2, shop 5, crafted 8 Soles. Junk = not equipped, no better than what's worn in that slot, not the one copy a recipe needs; boss and rare gear is never included |
| Trials v2 | Three acts up the food chain, 8 skills with a 4-skill loadout, enemy traits, Fury and 3 in-combat finishers, hit-stop, blood and gold-dust deaths, stars with star-total rewards, loss hints from 7,301,223. Difficulty dials per Trial set with a balance bot (see GDD "Era 1 Trials, v2") |
| Loot and crafting v2 | Wood and beast parts, boxes feed crafting (finished gear only from Legendary+), pity timer, recipe-based Workshop with a part slot, hammer timing for quality, reinforce +1 to +5, Pack Hunter and Predator sets. See GDD "Loot boxes and crafting, v2" |
| Open all loot boxes | Done: on Home (with 2+ boxes) and in the loot box window; shows one merged summary |
| Evolve: Era Key + base tier 3 + level 10, pick 1 of 3 Boons, free respec, materials to Soles | Done. Era 2 shows an "under construction" screen |
| 3D comic look: toon shading, ink outlines, halftone overlay; cyberpunk comic UI | Placeholder shapes, as agreed |
| Eras 2 and 3 | Not started: waiting on their design |
| Backend, accounts, server-side loot | Not started (MVP phase 5) |

## Gaps the build filled (MVP guesses, all easy to change)

All in `src/data/era1.js`, `src/data/story.js` and `src/logic/economy.js`.

- **Combat tuning.** In simulation, the GDD v1 table let a level 1-2 hero beat almost every Era 1 Trial, including the Trial 6 "wall". The build defaults to enemy health ×1.25, enemy damage ×1.5 and Guard once per turn. **Settings → Combat numbers → GDD v1** switches back to the exact table. This one needs a decision in the design thread.
- **Skills vs. Altar.** The GDD unlocks skills by level and also says the Altar unlocks new skills. The build unlocks skills by level (the v1 table) and uses Altar tiers for loadout size (4, 5, 6) and max skill rank (1, 2, 3), plus 25% cheaper training at tier 3.
- **Materials while walking:** 1 flint or bone per 500 steps, on top of loot boxes.
- **Loot box contents** by tier (materials, gear tier, fragment, booster, blueprint chances). Fragments only start dropping after Trial 5, where the GDD puts the first one.
- **Trial loot boxes:** regular Trials roll the normal odds; mini-bosses give Gold, the era boss Platinum.
- **Replays:** 1-3 materials, 20% chance of worn gear.
- **Crafting recipes:** 8 recipes, e.g. 5 Flint + 2 Bone = Flint Club (+4 damage). Two need blueprints (from the Mammoth and rare boxes).
- **Boosters:** Stride Brew (12h of 5 steps per Sole, as in the GDD), Lucky Knot (next 3 boxes roll a tier up), Warpaint (+3 damage next Trial).
- **Shop:** the GDD gear plus flint and bone at 10 Soles each.
- **Inventory slots:** 20, then 30/40/50 by tier. Full bags salvage new gear into materials.
- **Shrine:** +10% Silver/Gold odds and +5% Platinum and up, per tier.
- **Truth Board:** tier N decodes level N fragments; decoding costs 40-200 Soles. The Era 1 flashback (`FLASHBACKS` in `src/data/story.js`) has 7 panels and must not reveal the SOULS twist.
- **Base costs (after playtest):** 50/150/400 Soles and 5 min/45 min/3 h per tier, down from 100/300/800 and 10 min/2 h/8 h.
- **Daily goals:** one walking goal plus two from win, open, craft, train, build. All three give a Silver box. **Weekly:** 4,000+ steps on any 4 days gives a Gold box.
- **Box limit "3 days":** 18 unopened boxes; extra boxes from walking are lost and the report says so.
- **Boons:** six placeholder Boons.
- **Steps-per-Sole upgrades (8 and 5)** are not in the shop yet; their prices are an open GDD decision.

## Economy check

`tests/era1.test.js` has a bot play Era 1 at 6,000 steps a day using the real game logic. It finishes Era 1 (Era Key, all buildings tier 3, level 10, evolve) in **13 days**, inside the GDD's 10-14 day target.

## Hero model and animations

The hero is the rigged caveman in `public/models/caveman.fbx` (Mixamo bone names), loaded by `src/scene/caveman.js` with toon shading (no ink outline, by request). Gear hangs off his hand, head and chest bones.

Animation clips live in `public/models/anims/`, one FBX per clip: `idle` (loops), `walk` (loaded, not used yet), `attack` (Club Strike), `throw` (Hurl Stone and Firebrand), `block` (Guard), `roar` (Roar), `hurt` (taking a hit), `death` (losing) and `victory` (winning). Straight Mixamo exports are Y-up and get turned into the rig's Z-up frame on load, and every clip is pinned in place horizontally. Any missing clip is skipped; with none at all he falls back to a hand-made pose.
