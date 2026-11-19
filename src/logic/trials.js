// Trial availability and rewards (first win vs replay).
import { TRIALS, RECIPES } from '../data/era1.js';
import { env, randInt, chance, pick } from './state.js';
import { addXp } from './hero.js';
import { addBox, addGear, rollTier, giveFragment, goalEvent, grantReward, STARTER } from './economy.js';

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
    return out;
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
    // loot box tier: regular rolls normally; bosses get better boxes (MVP guess)
    const tier = t.boss === 'era' ? 'platinum' : t.boss === 'mini' ? 'gold' : rollTier(s);
    addBox(s, tier);
    out.box = tier;
    const m = randInt(2, 4);
    const f = randInt(0, m);
    out.mats = { flint: f, bone: m - f };
    if (n === 5) { addGear(s, 'alpha_fang'); out.gear.push('alpha_fang'); }
    if (n === 10) { addGear(s, 'sabre_hide'); out.gear.push('sabre_hide'); }
    if (n === 15) { addGear(s, 'tusk_club'); out.gear.push('tusk_club'); }
    if (t.boss === 'mini') { s.hero.respecTokens++; out.respec = true; }
    if (t.boss === 'era') {
      s.eraKey = true;
      out.eraKey = true;
      const bp = RECIPES.find((r) => r.blueprint && !s.recipes.includes(r.id));
      if (bp) { s.recipes.push(bp.id); s.blueprints.push(bp.id); out.blueprint = bp.id; }
    }
    if (n === 4) out.glitch = true;
    if (n === 5 || n === 10 || n === 15) { const fr = giveFragment(s); if (fr) out.fragment = fr.id; }
  } else {
    s.trials.replays++;
    const m = randInt(1, 3) + (s.hero.boons.includes('b_scavenger') ? 1 : 0);
    const f = randInt(0, m);
    out.mats = { flint: f, bone: m - f };
    if (chance(0.2)) {
      const key = pick(REPLAY_GEAR);
      const it = addGear(s, key);
      out.gear.push(key);
      if (!it) out.salvaged = true;
    }
  }
  s.mats.flint += out.mats.flint;
  s.mats.bone += out.mats.bone;
  if (first && s.hero.boons.includes('b_scavenger')) s.mats.flint++;
  return out;
}

export { grantReward };
