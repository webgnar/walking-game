// Save state, clock and random helpers. Pure data; no DOM.
import { HERO_START, BUILDING_ORDER, RECIPES } from '../data/era1.js';

export const SAVE_KEY = 'ascent.save.v1';

// Clock and RNG can be swapped in tests.
export const env = {
  now: () => Date.now(),
  rand: () => Math.random(),
};

export const pick = (arr) => arr[Math.floor(env.rand() * arr.length)];
export const randInt = (a, b) => a + Math.floor(env.rand() * (b - a + 1));
export const chance = (p) => env.rand() < p;
export const uid = () => Math.floor(env.rand() * 1e9).toString(36) + env.now().toString(36).slice(-4);

export function dayKey(t = env.now()) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// Monday-start week key
export function weekKey(t = env.now()) {
  const d = new Date(t);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return dayKey(d.getTime());
}

export function newState() {
  const s = freshState();
  giveStarterKit(s);
  return s;
}

function freshState() {
  const base = {};
  for (const b of BUILDING_ORDER) base[b] = { tier: 0, job: null };
  return {
    v: 1,
    created: env.now(),
    intro: false, // cold open seen
    tutorial: 'fight', // fight -> grant -> boxes -> gear -> base -> level -> trials -> done
    era: 1,
    soles: 0,
    solesEarned: 0,
    steps: { total: 0, byDay: {}, towardBox: 0, towardMat: 0, remainder: 0 },
    report: null, // pending expedition report
    boxes: [], // {id, tier, at}
    mats: { flint: 0, bone: 0, wood: 0, fang: 0, claw: 0, tine: 0, hide: 0, ember: 0 }, // materials and beast parts
    pity: { gold: 0, platinum: 0, legendary: 0 }, // loot boxes since the last of each tier
    inv: [], // gear instances {uid, key}
    boosters: {}, // key -> count
    active: { strideUntil: 0, luckyLeft: 0, warpaint: 0 },
    hero: {
      level: 1, xp: 0, attrs: { ...HERO_START }, freeAttr: 0, freeSkill: 0,
      ranks: { club: 1, guard: 1 }, loadout: ['club', 'guard'],
      equip: { weapon: null, armor: null, helm: null, offhand: null, trinket: null },
      respecTokens: 0, boons: [], spentXpSoles: 0,
      finishers: [], finisher: null, // finishing moves owned / equipped
    },
    base,
    firstBuildFree: true,
    recipes: RECIPES.filter((r) => r.known).map((r) => r.id),
    blueprints: [],
    crafted: 0,
    trials: { cleared: {}, losses: {}, wins: 0, replays: 0, stars: {} },
    starRewards: [], // star totals already rewarded
    eraKey: false,
    evolved: false,
    fragments: { found: [], decoded: [] },
    flashbacksSeen: [], // eras whose Truth Board flashback has played
    transmissions: { active: null, queue: [], cleared: [] }, // messages from 7,301,223
    flickersSeen: [],
    proctorSlipped: false,
    glitches: 0,
    achievements: {},
    toasts: [],
    goals: null,
    weekly: null,
    opens: { day: null, count: 0, lastDay: null },
    proctorSeen: {},
    trainedOnce: false,
    starterKit: false,
  };
}

export function load() {
  try {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(SAVE_KEY);
    if (!raw) return newState();
    const s = JSON.parse(raw);
    // Fill fields added in later builds.
    const fresh = freshState();
    for (const k of Object.keys(fresh)) if (s[k] === undefined) s[k] = fresh[k];
    for (const k of Object.keys(fresh.hero)) if (s.hero[k] === undefined) s.hero[k] = fresh.hero[k];
    if (!s.trials.stars) s.trials.stars = {};
    if (!s.starterKit) giveStarterKit(s);
    for (const k of Object.keys(fresh.mats)) if (s.mats[k] === undefined) s.mats[k] = 0;
    // Fang Ripper was removed: saves that had it get Bloodrush instead
    if (s.hero.finishers.includes('fang')) {
      s.hero.finishers = [...new Set(s.hero.finishers.map((f) => (f === 'fang' ? 'bloodrush' : f)))];
      if (s.hero.finisher === 'fang') s.hero.finisher = 'bloodrush';
    }
    return s;
  } catch (e) {
    console.warn('Save unreadable, starting fresh', e);
    return newState();
  }
}

// Wipes everything this game stored in the browser and blocks any further saves, so nothing still
// running can write the old game back before the page reloads.
let wiped = false;
export function wipeSave() {
  wiped = true;
  try { localStorage.clear(); } catch (e) { /* private mode */ }
  try { sessionStorage.clear(); } catch (e) { /* private mode */ }
  try {
    if (indexedDB.databases) indexedDB.databases().then((dbs) => dbs.forEach((d) => d.name && indexedDB.deleteDatabase(d.name)));
  } catch (e) { /* not supported */ }
}

// The starter kit: the Worn Club (+1 damage), equipped if the weapon slot is empty.
export const STARTER_KIT = { weapon: 'starter_club' };
export function giveStarterKit(s) {
  for (const [slot, key] of Object.entries(STARTER_KIT)) {
    const it = { uid: uid(), key };
    s.inv.push(it);
    if (!s.hero.equip[slot]) s.hero.equip[slot] = it.uid;
  }
  s.starterKit = true;
}

export function save(s) {
  if (wiped) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch (e) {
    /* storage full or private mode */
  }
}

export function toast(s, t) {
  s.toasts.push({ id: uid(), ...t });
}
