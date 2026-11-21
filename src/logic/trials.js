// Trial availability and rewards (first win vs replay).
import { TRIALS, RECIPES, STAR_REWARDS, ENEMIES, PARTS, BOSS_BLUEPRINTS } from '../data/era1.js';
import { grantFinisher } from './hero.js';
import { env, randInt, chance, pick } from './state.js';
import { addXp } from './hero.js';
import { addBox, addGear, rollTier, giveFragment, goalEvent, grantReward, STARTER } from './economy.js';
import { startTransmission } from './story.js';
import { TRANSMISSIONS, FLICKERS } from '../data/story.js';

export function trialUnlocked(s, n) {
  if (n === 0) return true;
  if (n === 1) return !!s.trials.cleared[0];
  return !!s.trials.cleared[n - 1];
}

export function nextTrial(s) {
  return TRIALS.find((t) => t.n > 0 && !s.trials.cleared[t.n]) || null;
}

const REPLAY_GEAR = ['cracked_club', 'torn_hide', 'pebble_string'];

// Apply rewards after a battle. Returns a reward summary for the Reward screen.
export function finishTrial(s, n, result, battle) {
  const t = TRIALS.find((x) => x.n === n);
  const out = { n, result, first: false, xp: 0, box: null, mats: { flint: 0, bone: 0 }, gear: [], respec: false, blueprint: null, eraKey: false, fragment: null, glitch: false };
  if (result !== 'win') {
    s.trials.losses[n] = (s.trials.losses[n] || 0) + 1;
    out.lossCount = s.trials.losses[n];
    return out;
  }
  // Stars: win; finish above half health; win within par turns
  if (battle && n > 0) {
    const h = battle.hero;
    out.starList = [true, h.hp >= h.maxHp / 2, battle.turn <= t.par];
    out.stars = out.starList.filter(Boolean).length;
    const prev = s.trials.stars[n] || 0;
    if (out.stars > prev) s.trials.stars[n] = out.stars;
    out.newBest = out.stars > prev;
    const total = totalStars(s);
    out.starRewards = [];
    for (const r of STAR_REWARDS) {
      if (total >= r.stars && !s.starRewards.includes(r.stars)) {
        s.starRewards.push(r.stars);
        addBox(s, r.box);
        out.starRewards.push(r);
      }
    }
  }
  s.trials.wins++;
  goalEvent(s, 'win', 1);
  if (battle && battle.hero.damageTaken === 0) s.flawless = true;
  const first = !s.trials.cleared[n];
  out.first = first;
  if (first) {
    s.trials.cleared[n] = env.now();
    out.xp = t.xp;
    addXp(s, t.xp);
    if (n === 0) {
      // Starter grant (MVP)
      s.soles += STARTER.soles;
      s.solesEarned += STARTER.soles;
      for (let i = 0; i < STARTER.boxes; i++) addBox(s, 'bronze');
      out.starter = STARTER;
      return out;
    }
    // Loot boxes come from walking; Trials only give boxes for bosses.
    if (t.boss) { const tier = t.boss === 'era' ? 'platinum' : 'gold'; addBox(s, tier); out.box = tier; }
    out.parts = beastParts(t, 2);
    const m = randInt(2, 4);
    const f = randInt(0, m);
    out.mats = { flint: f, bone: m - f };
    if (n === 5) { addGear(s, 'alpha_fang'); out.gear.push('alpha_fang'); grantFinisher(s, 'skull'); out.finisher = 'skull'; }
    if (n === 10) { addGear(s, 'sabre_hide'); out.gear.push('sabre_hide'); grantFinisher(s, 'bloodrush'); out.finisher = 'bloodrush'; }
    if (n === 15) { addGear(s, 'tusk_club'); out.gear.push('tusk_club'); }
    if (t.boss === 'mini') { s.hero.respecTokens++; out.respec = true; }
    if (t.boss === 'era') { s.eraKey = true; out.eraKey = true; }
    out.blueprints = [];
    for (const id of BOSS_BLUEPRINTS[n] || []) if (!s.recipes.includes(id)) { s.recipes.push(id); s.blueprints.push(id); out.blueprints.push(id); }
    // First-hour story beats (GDD "The first hour")
    const t0 = TRANSMISSIONS.find((x) => x.trial === n);
    if (t0 && startTransmission(s, t0.id)) out.transmission = t0.id;
    const fl = Object.entries(FLICKERS).find(([, f]) => f.trial === n);
    if (fl && !s.flickersSeen.includes(fl[0])) out.flicker = fl[0];
    if (n === 12 && !s.proctorSlipped) { s.proctorSlipped = true; out.slip = true; }
    if (n === 5 || n === 10 || n === 15) { const fr = giveFragment(s); if (fr) out.fragment = fr.id; }
  } else {
    s.trials.replays++;
    const m = randInt(1, 3) + (s.hero.boons.includes('b_scavenger') ? 1 : 0);
    const f = randInt(0, m);
    out.mats = { flint: f, bone: m - f };
    // replays are where you farm a beast's parts
    out.parts = chance(0.6) ? beastParts(t, 1) : {};
    if (chance(0.1)) {
      const key = pick(REPLAY_GEAR);
      const it = addGear(s, key);
      out.gear.push(key);
      if (!it) out.salvaged = true;
    }
  }
  s.mats.flint += out.mats.flint;
  s.mats.bone += out.mats.bone;
  for (const [k, v] of Object.entries(out.parts || {})) s.mats[k] = (s.mats[k] || 0) + v;
  if (first && s.hero.boons.includes('b_scavenger')) s.mats.flint++;
  return out;
}

// Parts dropped by the beasts in a Trial: n parts, from the kinds those beasts drop.
function beastParts(t, n) {
  const kinds = [...new Set(t.enemies.flatMap((e) => Object.keys(PARTS).filter((p) => PARTS[p].drops.includes(e.replace('!', '')))))];
  const out = {};
  if (!kinds.length) return out;
  for (let i = 0; i < n; i++) { const k = kinds[Math.floor(env.rand() * kinds.length)]; out[k] = (out[k] || 0) + 1; }
  return out;
}

export function totalStars(s) {
  return Object.values(s.trials.stars || {}).reduce((a, n) => a + n, 0);
}

export { grantReward };
