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
    mats: { flint: 0, bone: 0 },
    inv: [], // gear instances {uid, key}
    boosters: {}, // key -> count
    active: { strideUntil: 0, luckyLeft: 0, warpaint: 0 },
    hero: {
      level: 1, xp: 0, attrs: { ...HERO_START }, freeAttr: 0, freeSkill: 0,
      ranks: { club: 1, guard: 1 }, loadout: ['club', 'guard'],
      equip: { weapon: null, armor: null, helm: null, offhand: null, trinket: null },
      respecTokens: 0, boons: [], spentXpSoles: 0,
    },
    base,
    firstBuildFree: true,
    recipes: RECIPES.filter((r) => r.known).map((r) => r.id),
    blueprints: [],
    crafted: 0,
    trials: { cleared: {}, losses: {}, wins: 0, replays: 0 },
    eraKey: false,
    evolved: false,
    fragments: { found: [], decoded: [] },
    glitches: 0,
    achievements: {},
    toasts: [],
    goals: null,
    weekly: null,
    opens: { day: null, count: 0, lastDay: null },
    proctorSeen: {},
    trainedOnce: false,
  };
}

export function load() {
  try {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(SAVE_KEY);
    if (!raw) return newState();
    const s = JSON.parse(raw);
    // Fill fields added in later builds.
    const fresh = newState();
    for (const k of Object.keys(fresh)) if (s[k] === undefined) s[k] = fresh[k];
    for (const k of Object.keys(fresh.hero)) if (s.hero[k] === undefined) s.hero[k] = fresh.hero[k];
    return s;
  } catch (e) {
    console.warn('Save unreadable, starting fresh', e);
    return newState();
  }
}

export function save(s) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch (e) {
    /* storage full or private mode */
  }
}

export function toast(s, t) {
  s.toasts.push({ id: uid(), ...t });
}
