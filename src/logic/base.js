// Base buildings, crafting, Truth Board, evolving, achievements.
import { BUILDINGS, BUILD_COST, BUILD_MAT_SPLIT, RECIPES, GEAR, BOONS, BUILDING_ORDER, MATERIALS } from '../data/era1.js';
import { FRAGMENTS, ACHIEVEMENTS } from '../data/story.js';
import { env, toast, pick } from './state.js';
import { addGear, addBooster, goalEvent, grantReward, todaySteps } from './economy.js';
import { respec } from './hero.js';

// ---------- Buildings ----------
export function matSplit(b, n) {
  const m = BUILD_MAT_SPLIT[b];
  if (m === 'flint') return { flint: Math.ceil(n * 2 / 3), bone: Math.floor(n / 3) };
  if (m === 'bone') return { flint: Math.floor(n / 3), bone: Math.ceil(n * 2 / 3) };
  return { flint: Math.ceil(n / 2), bone: Math.floor(n / 2) };
}

export function upgradeCost(s, b) {
  const to = s.base[b].tier + 1;
  if (to > 3) return null;
  const c = BUILD_COST[to];
  return { to, soles: c.soles, mats: matSplit(b, c.mats), minutes: c.minutes };
}

export function canAfford(s, cost) {
  return s.soles >= cost.soles && s.mats.flint >= cost.mats.flint && s.mats.bone >= cost.mats.bone;
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
    s.mats.flint -= cost.mats.flint;
    s.mats.bone -= cost.mats.bone;
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
export function craftSlots(s) {
  const t = s.base.studio.tier;
  return t >= 2 ? 3 : 2;
}

// item keys available for crafting: materials with counts, unequipped gear by key
export function craftables(s) {
  const out = [];
  for (const k of Object.keys(MATERIALS)) if (s.mats[k] > 0) out.push({ key: k, n: s.mats[k], mat: true });
  const equipped = Object.values(s.hero.equip);
  const counts = {};
  for (const it of s.inv) if (!equipped.includes(it.uid)) counts[it.key] = (counts[it.key] || 0) + 1;
  for (const [k, n] of Object.entries(counts)) out.push({ key: k, n, mat: false });
  return out;
}

export function findRecipe(keys) {
  const set = [...new Set(keys.filter(Boolean))].sort().join('+');
  return RECIPES.find((r) => Object.keys(r.inputs).sort().join('+') === set) || null;
}

export function hasInputs(s, r) {
  const av = Object.fromEntries(craftables(s).map((c) => [c.key, c.n]));
  return Object.entries(r.inputs).every(([k, n]) => (av[k] || 0) >= n);
}

// keys: the item keys in the slots
export function craft(s, keys) {
  const studio = s.base.studio.tier;
  if (studio < 1) return { ok: false, why: 'studio' };
  const filled = keys.filter(Boolean);
  if (filled.length < 2) return { ok: false, why: 'empty' };
  const r = findRecipe(filled);
  if (!r) return { ok: false, why: 'nothing' };
  if (r.blueprint && !s.recipes.includes(r.id)) return { ok: false, why: 'blueprint' };
  if (r.studio > studio) return { ok: false, why: 'tier', need: r.studio };
  if (!hasInputs(s, r)) return { ok: false, why: 'amount', recipe: r };
  const equipped = Object.values(s.hero.equip);
  for (const [k, n] of Object.entries(r.inputs)) {
    if (MATERIALS[k]) s.mats[k] -= n;
    else for (let i = 0; i < n; i++) {
      const idx = s.inv.findIndex((it) => it.key === k && !equipped.includes(it.uid));
      s.inv.splice(idx, 1);
    }
  }
  const learned = !s.recipes.includes(r.id);
  if (learned) s.recipes.push(r.id);
  if (r.out.gear) addGear(s, r.out.gear);
  if (r.out.booster) addBooster(s, r.out.booster);
  s.crafted++;
  goalEvent(s, 'craft', 1);
  return { ok: true, recipe: r, learned };
}

export function recipeName(r) {
  return r.out.gear ? GEAR[r.out.gear].name : r.out.booster;
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
  return { ok: true };
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
  const converted = (s.mats.flint + s.mats.bone) * 3;
  s.soles += converted;
  s.mats.flint = 0;
  s.mats.bone = 0;
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
