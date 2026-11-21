import test from 'node:test';
import assert from 'node:assert/strict';
import { env, newState } from '../src/logic/state.js';
import { createBattle, autoPlay } from '../src/logic/combat.js';
import { addXp, spendAttr, autoEquipBest, grantFinisher } from '../src/logic/hero.js';
import { addGear } from '../src/logic/economy.js';
import { TRIALS } from '../src/data/era1.js';

// seeded rng
export function seed(n) { let a = (n * 2654435761) >>> 0; env.rand = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function heroAt(level, gear = [], loadout = ['club', 'guard', 'roar', 'hurl']) {
  const s = newState();
  let need = 0; for (let l = 1; l < level; l++) need += 50 * l;
  addXp(s, need);
  const order = ['str', 'vit', 'str', 'vit', 'agi', 'int'];
  let i = 0; while (s.hero.freeAttr > 0) spendAttr(s, order[i++ % order.length]);
  for (const g of gear) addGear(s, g);
  autoEquipBest(s);
  s.hero.loadout = loadout.filter((k) => s.hero.ranks[k]);
  if (level >= 4) grantFinisher(s, 'skull');
  return s;
}

export function winRate(trial, level, gear, runs = 200, loadout) {
  let w = 0;
  for (let r = 0; r < runs; r++) {
    seed(r * 7919 + trial * 31 + 1);
    const s = heroAt(level, gear, loadout);
    const b = createBattle(s, trial);
    if (autoPlay(b) === 'win') w++;
  }
  return w / runs;
}

test('tutorial is easy and the era boss needs real power', () => {
  assert.ok(winRate(0, 1, [], 100) > 0.9, 'tutorial should be easy');
  assert.ok(winRate(15, 1, [], 50) < 0.2, 'a level 1 hero should not beat the Great Mammoth');
  // The Mammoth is armored and enrages: it takes the right build (pierce, fire, a stun, a heal).
  const mammothBuild = ['jab', 'firebrand', 'roar', 'secondwind'];
  const gear = ['alpha_fang', 'sabre_hide', 'bone_helm', 'fang_charm', 'flint_buckler'];
  assert.ok(winRate(15, 10, gear, 50, mammothBuild) > 0.4, 'a geared level 10 hero with a Mammoth build should usually win');
  // Note: with 300 runs a generic Club/Guard/Roar/Hurl build still wins slightly more often (75% vs 68%);
  // making build choice matter more for the Mammoth is an open balance item.
});
