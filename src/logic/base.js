// Base buildings, crafting, Truth Board, evolving, achievements.
import { BUILDINGS, BUILD_COST, RECIPES, GEAR, BOONS, BUILDING_ORDER, MATERIALS, PARTS, QUALITY, REINFORCE_MAX, SLOT_MAT } from '../data/era1.js';
import { FRAGMENTS, FLASHBACKS, ACHIEVEMENTS } from '../data/story.js';
import { env, toast, pick } from './state.js';
import { addGear, addBooster, goalEvent, grantReward, todaySteps, invUsed, invCapacity } from './economy.js';
import { respec } from './hero.js';

// ---------- Buildings ----------
// Buildings cost Soles and wood.
export function upgradeCost(s, b) {
  const to = s.base[b].tier + 1;
  if (to > 3) return null;
  const c = BUILD_COST[to];
  return { to, soles: c.soles, mats: { wood: c.wood }, minutes: c.minutes };
}

export function hasMats(s, mats) {
  return Object.entries(mats).every(([k, n]) => (s.mats[k] || 0) >= n);
}
function spendMats(s, mats) {
  for (const [k, n] of Object.entries(mats)) s.mats[k] -= n;
}

export function canAfford(s, cost) {
  return s.soles >= cost.soles && hasMats(s, cost.mats);
}

export function startUpgrade(s, b) {
  const bs = s.base[b];
  if (bs.job) return { ok: false, why: 'busy' };
  const cost = upgradeCost(s, b);
  if (!cost) return { ok: false, why: 'max' };
  const free = s.firstBuildFree;
  if (!free && !canAfford(s, cost)) return { ok: false, why: 'cost', cost };
  if (!free) {
    s.soles -= cost.soles;
    spendMats(s, cost.mats);
  }
  goalEvent(s, 'build', 1);
  if (free) {
    s.firstBuildFree = false;
    bs.tier = cost.to;
    finishedBuilding(s, b);
    return { ok: true, instant: true };
  }
  bs.job = { to: cost.to, ends: env.now() + cost.minutes * 60e3 };
  return { ok: true };
}

export function minutesLeft(job) {
  return Math.max(0, Math.ceil((job.ends - env.now()) / 60e3));
}
export function speedUpCost(job) {
  return minutesLeft(job); // 1 Sole per minute left
}
export function speedUp(s, b) {
  const job = s.base[b].job;
  if (!job) return false;
  const c = speedUpCost(job);
  if (s.soles < c) return false;
  s.soles -= c;
  job.ends = env.now();
  tickBase(s);
  return true;
}

function finishedBuilding(s, b) {
  toast(s, { kind: 'build', title: `${BUILDINGS[b].name} tier ${s.base[b].tier}`, text: BUILDINGS[b].unlocks[s.base[b].tier - 1] });
}

export function tickBase(s) {
  let changed = false;
  for (const b of BUILDING_ORDER) {
    const job = s.base[b].job;
    if (job && job.ends <= env.now()) {
      s.base[b].tier = job.to;
      s.base[b].job = null;
      finishedBuilding(s, b);
      changed = true;
    }
  }
  return changed;
}

export function baseComplete(s) {
  return BUILDING_ORDER.every((b) => s.base[b].tier >= 3);
}

// ---------- Crafting ----------
// Workshop tier 2 adds the part slot (special effects). Tier 3 makes Masterwork easier to hit.
export function partSlot(s) {
  return s.base.studio.tier >= 2;
}

export function knownRecipes(s) {
  return RECIPES.filter((r) => s.recipes.includes(r.id));
}

export function recipeName(r) {
  return r.out.gear ? GEAR[r.out.gear].name : r.out.booster;
}

// Can this recipe be forged right now? part = optional part key for the special-effect slot.
export function canForge(s, r, part = null) {
  if (s.base.studio.tier < 1) return { ok: false, why: 'studio' };
  if (!s.recipes.includes(r.id)) return { ok: false, why: 'blueprint' };
  if (r.studio > s.base.studio.tier) return { ok: false, why: 'tier', need: r.studio };
  const need = { ...r.mats };
  if (part) {
    if (!partSlot(s) || !r.out.gear) return { ok: false, why: 'slot' };
    need[part] = (need[part] || 0) + 1;
  }
  if (!hasMats(s, need)) return { ok: false, why: 'amount' };
  if (r.out.gear && invUsed(s) >= invCapacity(s)) return { ok: false, why: 'full' };
  return { ok: true, need };
}

// Hammer timing: 3 strikes, each 'perfect' (2), 'good' (1) or 'miss' (0). Skipping = Fine.
export function qualityFromStrikes(strikes, studioTier = 1) {
  if (!strikes) return 'fine';
  const pts = strikes.reduce((t, x) => t + (x === 'perfect' ? 2 : x === 'good' ? 1 : 0), 0);
  // 2 points per perfect, 1 per good. Two perfects (or a perfect and two goods) = Masterwork.
  if (pts >= (studioTier >= 3 ? 3 : 4)) return 'masterwork';
  if (pts >= 1) return 'fine';
  return 'crude'; // only when every strike misses
}

export function forge(s, recipeId, part = null, quality = 'fine') {
  const r = RECIPES.find((x) => x.id === recipeId);
  if (!r) return { ok: false, why: 'nothing' };
  const c = canForge(s, r, part);
  if (!c.ok) return c;
  spendMats(s, c.need);
  let item = null;
  if (r.out.gear) {
    item = addGear(s, r.out.gear, { q: QUALITY[quality] ? quality : 'fine', ...(part ? { affix: PARTS[part].affix } : {}) });
  }
  if (r.out.booster) addBooster(s, r.out.booster);
  s.crafted++;
  goalEvent(s, 'craft', 1);
  return { ok: true, recipe: r, item };
}

// ---------- Reinforcing (+1 to +5) ----------
export function reinforceCost(it) {
  const next = (it.plus || 0) + 1;
  if (next > REINFORCE_MAX) return null;
  const m = SLOT_MAT[GEAR[it.key].slot];
  return { plus: next, mats: { [m]: 2 + 2 * next, wood: next } };
}
export function reinforce(s, uidv) {
  const it = s.inv.find((x) => x.uid === uidv);
  if (!it) return { ok: false };
  const c = reinforceCost(it);
  if (!c) return { ok: false, why: 'max' };
  if (!hasMats(s, c.mats)) return { ok: false, why: 'amount' };
  spendMats(s, c.mats);
  it.plus = c.plus;
  return { ok: true, plus: it.plus };
}

// ---------- Truth Board ----------
export function fragmentState(s, f) {
  if (s.fragments.decoded.includes(f.id)) return 'decoded';
  if (s.fragments.found.includes(f.id)) return s.base.truth.tier >= f.level ? 'decodable' : 'locked';
  return 'missing';
}

export function decode(s, id) {
  const f = FRAGMENTS.find((x) => x.id === id);
  if (!f || fragmentState(s, f) !== 'decodable') return { ok: false };
  if (s.soles < f.cost) return { ok: false, why: 'soles' };
  s.soles -= f.cost;
  s.fragments.decoded.push(id);
  // Decoding the last fragment of an era unlocks that era's flashback.
  const flashback = flashbackReady(s, f.era) && !s.flashbacksSeen.includes(f.era) ? f.era : null;
  return { ok: true, flashback };
}

export function eraFragments(era) {
  return FRAGMENTS.filter((f) => f.era === era);
}

// All of an era's fragments decoded, and the era has a flashback written.
export function flashbackReady(s, era) {
  const list = eraFragments(era);
  return !!FLASHBACKS[era] && list.length > 0 && list.every((f) => s.fragments.decoded.includes(f.id));
}

export function markFlashbackSeen(s, era) {
  if (!s.flashbacksSeen.includes(era)) s.flashbacksSeen.push(era);
}

// ---------- Evolving ----------
export function evolveChecks(s) {
  return [
    { label: 'Era Key (beat the Great Mammoth)', ok: s.eraKey },
    { label: 'All five buildings at tier 3', ok: baseComplete(s) },
    { label: 'Hero level 10', ok: s.hero.level >= 10 },
  ];
}
export function canEvolve(s) {
  return !s.evolved && evolveChecks(s).every((c) => c.ok);
}
export function boonChoices(s) {
  const pool = BOONS.filter((b) => !s.hero.boons.includes(b.id));
  const out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(env.rand() * pool.length), 1)[0]);
  return out;
}
export function evolve(s, boonId) {
  if (!canEvolve(s)) return null;
  s.hero.boons.push(boonId);
  // leftover materials and parts don't carry into the next era: they become Soles
  let converted = 0;
  for (const k of Object.keys(s.mats)) { converted += s.mats[k] * (PARTS[k] ? 5 : 3); s.mats[k] = 0; }
  s.soles += converted;
  respec(s, true);
  s.evolved = true;
  s.era = 2;
  return { converted };
}

// ---------- Achievements ----------
const CHECKS = {
  first_blood: (s) => s.trials.wins >= 1,
  couch_potato: (s) => s.opens.count >= 4 && todaySteps(s) < 500,
  mammoth_problems: (s) => (s.trials.losses[15] || 0) >= 6,
  first_steps: (s) => s.steps.total >= 1000,
  ten_k: (s) => todaySteps(s) >= 10000,
  marathon: (s) => s.steps.total >= 42195,
  hoarder: (s) => s.soles >= 1000,
  fashion: (s) => Object.values(s.hero.equip).every(Boolean),
  crafter: (s) => s.crafted >= 1,
  builder: (s) => BUILDING_ORDER.some((b) => s.base[b].tier >= 1),
  alpha_down: (s) => !!s.trials.cleared[5],
  sabre_down: (s) => !!s.trials.cleared[10],
  mammoth_down: (s) => !!s.trials.cleared[15],
  no_damage: (s) => !!s.flawless,
  grinder: (s) => s.trials.replays >= 10,
  truth_seeker: (s) => s.fragments.decoded.length >= 1,
  big_spender: (s) => s.trainedOnce,
  era_key: (s) => s.eraKey,
  rest_day: (s) => !!s.restDayReturn,
};

export function checkAchievements(s) {
  const got = [];
  for (const a of ACHIEVEMENTS) {
    if (s.achievements[a.id]) continue;
    const fn = CHECKS[a.id];
    if (fn && fn(s)) {
      s.achievements[a.id] = env.now();
      grantReward(s, a.reward);
      got.push(a);
      toast(s, { kind: 'achievement', title: a.name, text: a.text, reward: a.reward, rewardText: a.rewardText });
    }
  }
  return got;
}
