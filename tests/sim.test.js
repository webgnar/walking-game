import test from 'node:test';
import assert from 'node:assert/strict';
import { env, newState } from '../src/logic/state.js';
import { createBattle, autoPlay } from '../src/logic/combat.js';
import { addXp, spendAttr, autoEquipBest } from '../src/logic/hero.js';
import { addGear } from '../src/logic/economy.js';
import { TRIALS } from '../src/data/era1.js';

// seeded rng
export function seed(n) { let a = (n * 2654435761) >>> 0; env.rand = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function heroAt(level, gear = []) {
  const s = newState();
  let need = 0; for (let l = 1; l < level; l++) need += 50 * l;
  addXp(s, need);
  const order = ['str', 'vit', 'str', 'vit', 'agi', 'int'];
  let i = 0; while (s.hero.freeAttr > 0) spendAttr(s, order[i++ % order.length]);
  for (const g of gear) addGear(s, g);
  autoEquipBest(s);
  s.hero.loadout = ['club', 'guard', 'roar', 'hurl', 'firebrand'].filter((k) => s.hero.ranks[k]);
  return s;
}

export function winRate(trial, level, gear, runs = 200) {
  let w = 0;
  for (let r = 0; r < runs; r++) {
    seed(r * 7919 + trial * 31 + 1);
    const s = heroAt(level, gear);
    const b = createBattle(s, trial);
    if (autoPlay(b) === 'win') w++;
  }
  return w / runs;
}

test('tutorial is easy and the era boss needs real power', () => {
  assert.ok(winRate(0, 1, [], 100) > 0.9, 'tutorial should be easy');
  assert.ok(winRate(15, 1, [], 50) < 0.2, 'a level 1 hero should not beat the Great Mammoth');
  assert.ok(winRate(15, 10, ['flint_club', 'bone_mail', 'skull_cap', 'tooth_charm'], 50) > 0.4, 'a geared level 10 hero should usually beat the Mammoth');
});
