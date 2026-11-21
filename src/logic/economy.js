// Steps -> Soles, loot boxes, materials, the expedition report, daily goals and the weekly bonus.
import { GEAR, BOOSTERS, RECIPES, INVENTORY_SLOTS, MATERIALS, PARTS, AFFIXES } from '../data/era1.js';
import { itemScore } from './gear.js';
import { FRAGMENTS, GLITCHES } from '../data/story.js';
import { env, dayKey, weekKey, pick, randInt, chance, uid, toast } from './state.js';
import { feedTransmission } from './story.js';

export const STEPS_PER_BOX = 1000;
export const STEPS_PER_MAT = 500; // MVP guess
export const DAILY_SOFT_CAP = 30000;
export const BOX_LIMIT = 18; // "3 days" of boxes at 6,000 steps a day
export const STARTER = { soles: 300, boxes: 3 };

export const TIERS = ['bronze', 'silver', 'gold', 'platinum', 'legendary', 'celestial'];
export const TIER_NAMES = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum', legendary: 'Legendary', celestial: 'Celestial' };
export const BASE_ODDS = { bronze: 0.7625, silver: 0.15, gold: 0.055, platinum: 0.024, legendary: 0.0055, celestial: 0.003 };

export function stepsPerSole(s) {
  if (s.active.strideUntil > env.now()) return BOOSTERS.stride_brew.stepsPerSole;
  return 10; // upgrades to 8 and 5 are proposed in the GDD; not in the MVP shop yet
}

export function boxOdds(shrineTier = 0) {
  const o = { ...BASE_ODDS };
  const t = shrineTier;
  o.silver *= 1 + 0.1 * t;
  o.gold *= 1 + 0.1 * t;
  o.platinum *= 1 + 0.05 * t;
  o.legendary *= 1 + 0.05 * t;
  o.celestial *= 1 + 0.05 * t;
  o.bronze = 1 - (o.silver + o.gold + o.platinum + o.legendary + o.celestial);
  return o;
}

// Pity: a bad luck streak never runs long. At most this many boxes without the tier (or better).
export const PITY = { gold: 15, platinum: 50, legendary: 220 };

export function rollTier(s) {
  const o = boxOdds(s.base.shrine.tier);
  let r = env.rand();
  let tier = 'bronze';
  for (const t of [...TIERS].reverse()) {
    if (r < o[t]) { tier = t; break; }
    r -= o[t];
  }
  if (s.active.luckyLeft > 0) {
    s.active.luckyLeft--;
    tier = TIERS[Math.min(TIERS.length - 1, TIERS.indexOf(tier) + 1)];
  }
  // pity counters: boxes since the last box of that tier or better
  const pity = s.pity || (s.pity = { gold: 0, platinum: 0, legendary: 0 });
  for (const k of Object.keys(PITY)) pity[k]++;
  for (const k of ['legendary', 'platinum', 'gold']) {
    if (pity[k] >= PITY[k] && TIERS.indexOf(tier) < TIERS.indexOf(k)) { tier = k; break; }
  }
  for (const k of Object.keys(PITY)) if (TIERS.indexOf(tier) >= TIERS.indexOf(k)) pity[k] = 0;
  return tier;
}

export function todaySteps(s) {
  return s.steps.byDay[dayKey()] || 0;
}

// The single entry point for steps. The +100 button calls this now; HealthKit will later.
export function ingestSteps(s, n, source = 'debug') {
  if (n <= 0) return;
  const day = dayKey();
  const before = s.steps.byDay[day] || 0;
  const after = before + n;
  s.steps.byDay[day] = after;
  s.steps.total += n;
  // Soft cap: steps above 30,000 a day count half.
  const full = Math.max(0, Math.min(after, DAILY_SOFT_CAP) - before);
  const effective = full + (n - full) * 0.5;

  const r = s.report || (s.report = { steps: 0, soles: 0, boxes: [], mats: { flint: 0, bone: 0, wood: 0 }, lost: 0, since: env.now(), source });
  if (r.mats.wood === undefined) r.mats.wood = 0;
  r.steps += n;

  const sps = stepsPerSole(s);
  const total = s.steps.remainder + effective;
  const soles = Math.floor(total / sps);
  s.steps.remainder = total - soles * sps;
  let bonus = 0;
  if (s.hero.boons.includes('b_long_stride')) bonus = Math.floor((s.steps.total) / 100) - Math.floor((s.steps.total - n) / 100);
  r.soles += soles + bonus;

  s.steps.towardBox += n;
  while (s.steps.towardBox >= STEPS_PER_BOX) {
    s.steps.towardBox -= STEPS_PER_BOX;
    if (s.boxes.length + r.boxes.length >= BOX_LIMIT) r.lost++;
    else r.boxes.push(rollTier(s));
  }
  s.steps.towardMat += n;
  while (s.steps.towardMat >= STEPS_PER_MAT) {
    s.steps.towardMat -= STEPS_PER_MAT;
    const x = env.rand();
    r.mats[x < 0.45 ? 'wood' : x < 0.75 ? 'flint' : 'bone']++;
  }
  const cleared = feedTransmission(s, n);
  if (cleared.length) r.transmissions = [...(r.transmissions || []), ...cleared];
  updateWeekly(s);
  goalEvent(s, 'steps', 0);
}

export function collectReport(s) {
  const r = s.report;
  if (!r) return null;
  s.soles += r.soles;
  s.solesEarned += r.soles;
  for (const t of r.boxes) addBox(s, t);
  for (const [k, n] of Object.entries(r.mats)) s.mats[k] = (s.mats[k] || 0) + n;
  s.report = null;
  return r;
}

export function addBox(s, tier) {
  s.boxes.push({ id: uid(), tier, at: env.now() });
}

// ---------- Inventory ----------
export function invCapacity(s) {
  return INVENTORY_SLOTS[s.base.inventory.tier];
}
// Only gear takes inventory slots. Consumables (boosters) have unlimited storage.
export function invUsed(s) {
  return s.inv.length;
}

// Returns the new instance, or null if salvaged because the bag is full.
export function addGear(s, key, opts = {}) {
  if (invUsed(s) >= invCapacity(s)) {
    const m = salvageValue(key);
    s.mats.flint += m.flint;
    s.mats.bone += m.bone;
    toast(s, { kind: 'warn', title: 'Inventory full', text: `${GEAR[key].name} was salvaged into ${m.flint} flint and ${m.bone} bone. Upgrade the Inventory for more room.` });
    return null;
  }
  const it = { uid: uid(), key, ...opts };
  s.inv.push(it);
  return it;
}

// ---------- Parts and materials ----------
// A random basic material: flint, bone or wood.
export function randomMat() {
  const x = env.rand();
  return x < 0.36 ? 'wood' : x < 0.68 ? 'flint' : 'bone';
}
export function addMats(s, mats) {
  for (const [k, n] of Object.entries(mats)) s.mats[k] = (s.mats[k] || 0) + n;
}
// Random parts, all kinds (loot boxes are the only source of Ember Coal).
export function randomPart() {
  const keys = Object.keys(PARTS);
  return keys[Math.floor(env.rand() * keys.length)];
}

export function salvageValue(key) {
  const t = GEAR[key].tier;
  const n = { worn: 2, shop: 3, crafted: 5, rare: 8, boss: 10 }[t] || 2;
  return { flint: Math.ceil(n / 2), bone: Math.floor(n / 2) };
}

export function salvage(s, uidv) {
  const i = s.inv.findIndex((x) => x.uid === uidv);
  if (i < 0) return false;
  if (Object.values(s.hero.equip).includes(uidv)) return false;
  const m = salvageValue(s.inv[i].key);
  s.inv.splice(i, 1);
  s.mats.flint += m.flint;
  s.mats.bone += m.bone;
  return m;
}

// ---------- Salvage junk into Soles ----------
// Rough strength of a piece of gear, for comparing within a slot.
export function gearScore(key) {
  const st = GEAR[key].stats;
  return (st.dmg || 0) * 2 + (st.hp || 0) / 5 + (st.str || 0) + (st.vit || 0) + (st.int || 0) + (st.agi || 0);
}
// Soles for salvaging a whole item (kept modest so walking stays the main source).
export const SOLE_VALUE = { worn: 2, shop: 5, crafted: 8, rare: 12, boss: 15 };
export function soleValue(key) {
  return SOLE_VALUE[GEAR[key].tier] || 2;
}

// Junk = gear you can safely lose: not equipped, not a boss or rare item, no better than what
// you're wearing in that slot, and not the one copy you'd need as a crafting ingredient.
export function junkGear(s) {
  const equipped = Object.values(s.hero.equip).filter(Boolean);
  const wornScore = {};
  for (const id of equipped) {
    const it = s.inv.find((x) => x.uid === id);
    if (it) wornScore[GEAR[it.key].slot] = itemScore(it);
  }
  const ingredient = new Set(RECIPES.flatMap((r) => Object.keys(r.mats)).filter((k) => GEAR[k]));
  const keptForRecipe = new Set();
  const junk = [];
  for (const it of s.inv) {
    const g = GEAR[it.key];
    if (equipped.includes(it.uid) || g.tier === 'boss' || g.tier === 'rare' || g.set || it.affix || it.q === 'masterwork' || it.plus) continue;
    if (ingredient.has(it.key) && !keptForRecipe.has(it.key)) { keptForRecipe.add(it.key); continue; }
    if (itemScore(it) > (wornScore[g.slot] ?? -1)) continue;
    junk.push(it);
  }
  return junk;
}

export function salvageJunk(s) {
  const junk = junkGear(s);
  const soles = junk.reduce((a, it) => a + soleValue(it.key), 0);
  const ids = new Set(junk.map((it) => it.uid));
  s.inv = s.inv.filter((it) => !ids.has(it.uid));
  s.soles += soles;
  return { count: junk.length, soles };
}

export function addBooster(s, key, n = 1) {
  s.boosters[key] = (s.boosters[key] || 0) + n;
}

export function useBooster(s, key) {
  if (!s.boosters[key]) return false;
  const b = BOOSTERS[key];
  s.boosters[key]--;
  if (b.hours) s.active.strideUntil = Math.max(env.now(), s.active.strideUntil) + b.hours * 3600e3;
  if (b.boxesUp) s.active.luckyLeft += b.boxesUp;
  if (b.fights) s.active.warpaint += b.fights;
  return true;
}

// ---------- Story ----------
export function nextFragment(s) {
  return FRAGMENTS.find((f) => !s.fragments.found.includes(f.id)) || null;
}
export function giveFragment(s) {
  const f = nextFragment(s);
  if (!f) return null;
  s.fragments.found.push(f.id);
  return f;
}
export function nextGlitch(s) {
  return GLITCHES[s.glitches % GLITCHES.length];
}

// ---------- Loot box contents ----------
const SHOP_GEAR = ['stone_club', 'hide_wrap', 'skull_cap', 'bark_shield', 'tooth_charm', 'ember_stone'];
const WORN_GEAR = ['cracked_club', 'torn_hide', 'pebble_string'];
const CRAFTED_GEAR = ['flint_club', 'bone_mail', 'bone_helm', 'flint_buckler', 'fang_charm', 'ember_totem'];
const RARE_GEAR = ['storm_crown', 'obsidian_ward', 'ghost_amber'];
// Boxes feed crafting: materials and parts. Finished gear only from Legendary and Celestial.
const BOX_TABLE = {
  bronze: { mats: [2, 3], parts: 0, frag: 0.08, boost: 0.08 },
  silver: { mats: [4, 5], parts: 1, frag: 0.2, boost: 0.15 },
  gold: { mats: [6, 8], parts: 2, frag: 0.35, boost: 0.3, blueprint: 0.35 },
  platinum: { mats: [9, 11], parts: 3, frag: 0.5, boost: 0.6, blueprint: 1 },
  legendary: { mats: [12, 14], parts: 3, frag: 1, boost: 1, blueprint: 1, gear: 1 },
  celestial: { mats: [15, 18], parts: 4, frag: 1, boost: 1, blueprint: 1, gear: 2, respec: true, extraBoost: true },
};

// Opens a box and applies its contents. Returns a list of reveal cards.
export function openBox(s, boxId) {
  const i = s.boxes.findIndex((b) => b.id === boxId);
  if (i < 0) return null;
  const box = s.boxes[i];
  s.boxes.splice(i, 1);
  return { tier: box.tier, items: rollContents(s, box.tier) };
}

// Opens every unopened box. Returns the tiers opened and the loot merged into one list:
// materials and boosters are summed, everything else is listed once per drop.
export function openAll(s) {
  const tiers = {};
  const merged = [];
  const sums = {};
  while (s.boxes.length) {
    const o = openBox(s, s.boxes[0].id);
    tiers[o.tier] = (tiers[o.tier] || 0) + 1;
    for (const it of o.items) {
      if (it.type === 'mat' || it.type === 'part' || it.type === 'booster') {
        const k = `${it.type}:${it.key}`;
        if (!sums[k]) { sums[k] = { ...it, n: 0 }; merged.push(sums[k]); }
        sums[k].n += it.n || 1;
      } else merged.push(it);
    }
  }
  const order = { mat: 0, part: 1, booster: 2, gear: 3, blueprint: 4, frag: 5, respec: 6 };
  merged.sort((a, b) => order[a.type] - order[b.type]);
  return { tiers, items: merged, count: Object.values(tiers).reduce((a, b) => a + b, 0) };
}

export function rollContents(s, tier) {
  const T = BOX_TABLE[tier];
  const items = [];
  const got = {};
  const nm = randInt(T.mats[0], T.mats[1]);
  for (let i = 0; i < nm; i++) { const k = randomMat(); got[k] = (got[k] || 0) + 1; }
  for (let i = 0; i < T.parts; i++) { const k = randomPart(); got[k] = (got[k] || 0) + 1; }
  addMats(s, got);
  for (const [k, n] of Object.entries(got)) items.push({ type: PARTS[k] ? 'part' : 'mat', key: k, n });
  for (let i = 0; i < (T.gear || 0); i++) {
    // finished gear: a rare or boss piece, Masterwork, with a random special effect
    const key = pick(RARE_GEAR.concat(['alpha_fang', 'sabre_hide']));
    const affix = pick(Object.keys(AFFIXES));
    const it = addGear(s, key, { q: 'masterwork', affix });
    items.push({ type: 'gear', key, inst: it, salvaged: !it });
  }
  if (s.trials.cleared[5] && chance(T.frag)) {
    const f = giveFragment(s);
    if (f) items.push({ type: 'frag', id: f.id });
  }
  if (chance(T.boost)) {
    const key = tier === 'bronze' ? 'warpaint' : pick(tier === 'silver' ? ['warpaint', 'lucky_knot'] : ['warpaint', 'lucky_knot', 'stride_brew']);
    addBooster(s, key);
    items.push({ type: 'booster', key });
  }
  if (T.extraBoost) { addBooster(s, 'stride_brew'); items.push({ type: 'booster', key: 'stride_brew' }); }
  if (T.blueprint && chance(T.blueprint)) {
    const bp = RECIPES.find((r) => r.blueprint && !s.recipes.includes(r.id) && !['r_wolf_pelt', 'r_fang_charm', 'r_lion_mask', 'r_claw_buckler'].includes(r.id));
    if (bp) { s.recipes.push(bp.id); s.blueprints.push(bp.id); items.push({ type: 'blueprint', id: bp.id }); }
  }
  if (T.respec) { s.hero.respecTokens++; items.push({ type: 'respec' }); }
  goalEvent(s, 'open', 1);
  return items;
}

// ---------- Daily goals and weekly bonus ----------
export const GOAL_POOL = {
  walk3k: { text: 'Walk 3,000 steps', target: 3000, kind: 'steps', reward: { mats: { wood: 3 } } },
  walk6k: { text: 'Walk 6,000 steps', target: 6000, kind: 'steps', reward: { mats: { wood: 2 }, parts: 1 } },
  win2: { text: 'Win 2 Trials (replays count)', target: 2, kind: 'win', reward: { mats: { flint: 3, bone: 2 } } },
  open2: { text: 'Open 2 loot boxes', target: 2, kind: 'open', reward: { booster: 'warpaint' } },
  craft1: { text: 'Forge an item', target: 1, kind: 'craft', reward: { parts: 1 } },
  train1: { text: 'Train at the altar', target: 1, kind: 'train', reward: { mats: { bone: 3 } } },
  build1: { text: 'Start a building upgrade', target: 1, kind: 'build', reward: { mats: { wood: 3 } } },
};
export const ALL_GOALS_BONUS = { box: 'silver' };
export const WEEKLY = { daysNeeded: 4, stepsPerDay: 4000, reward: { box: 'gold' } };

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function ensureGoals(s) {
  const day = dayKey();
  if (s.goals && s.goals.day === day) return s.goals;
  const h = hash(day);
  const walk = h % 2 ? 'walk6k' : 'walk3k';
  const others = ['win2', 'open2', 'craft1', 'train1', 'build1'];
  const a = others[h % others.length];
  const b = others[(h + 1 + ((h >> 4) % (others.length - 1))) % others.length];
  const ids = [walk, a, b === a ? others[(others.indexOf(a) + 1) % others.length] : b];
  s.goals = { day, list: ids.map((id) => ({ id, progress: 0, claimed: false })), bonusClaimed: false };
  return s.goals;
}

export function goalEvent(s, kind, n) {
  const g = ensureGoals(s);
  for (const it of g.list) {
    const def = GOAL_POOL[it.id];
    if (def.kind !== kind) continue;
    if (kind === 'steps') it.progress = todaySteps(s);
    else it.progress += n;
  }
}

export function goalDone(it) {
  return it.progress >= GOAL_POOL[it.id].target;
}

export function grantReward(s, reward) {
  if (!reward) return;
  if (reward.soles) { s.soles += reward.soles; s.solesEarned += reward.soles; }
  if (reward.box) addBox(s, reward.box);
  if (reward.mats) addMats(s, reward.mats);
  if (reward.parts) for (let i = 0; i < reward.parts; i++) addMats(s, { [randomPart()]: 1 });
  if (reward.booster) addBooster(s, reward.booster);
}

export function claimGoal(s, idx) {
  const g = ensureGoals(s);
  const it = g.list[idx];
  if (!it || it.claimed || !goalDone(it)) return false;
  it.claimed = true;
  grantReward(s, GOAL_POOL[it.id].reward);
  return true;
}

export function claimAllGoalsBonus(s) {
  const g = ensureGoals(s);
  if (g.bonusClaimed || !g.list.every((x) => x.claimed)) return false;
  g.bonusClaimed = true;
  grantReward(s, ALL_GOALS_BONUS);
  return true;
}

export function updateWeekly(s) {
  const wk = weekKey();
  if (!s.weekly || s.weekly.week !== wk) s.weekly = { week: wk, claimed: false };
  return s.weekly;
}

export function weeklyDays(s) {
  const wk = updateWeekly(s).week;
  const start = new Date(wk + 'T00:00:00');
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if ((s.steps.byDay[dayKey(d.getTime())] || 0) >= WEEKLY.stepsPerDay) n++;
  }
  return n;
}

export function claimWeekly(s) {
  const w = updateWeekly(s);
  if (w.claimed || weeklyDays(s) < WEEKLY.daysNeeded) return false;
  w.claimed = true;
  grantReward(s, WEEKLY.reward);
  return true;
}

// ---------- Shop ----------
export const SHOP_ITEMS = [
  ...SHOP_GEAR.map((k) => ({ kind: 'gear', key: k, price: GEAR[k].price })),
  { kind: 'mat', key: 'flint', n: 5, price: 50 },
  { kind: 'mat', key: 'bone', n: 5, price: 50 },
  { kind: 'mat', key: 'wood', n: 5, price: 50 },
];

export function buy(s, idx) {
  const item = SHOP_ITEMS[idx];
  if (!item || s.soles < item.price) return { ok: false, why: 'soles' };
  if (item.kind === 'gear') {
    if (invUsed(s) >= invCapacity(s)) return { ok: false, why: 'full' };
    s.soles -= item.price;
    addGear(s, item.key);
  } else {
    s.soles -= item.price;
    s.mats[item.key] = (s.mats[item.key] || 0) + item.n;
  }
  return { ok: true };
}
