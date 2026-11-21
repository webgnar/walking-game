import test from 'node:test';
import assert from 'node:assert/strict';
import { newState } from '../src/logic/state.js';
import { addGear, addBooster, invUsed, junkGear, salvageJunk } from '../src/logic/economy.js';
import { autoEquipBest } from '../src/logic/hero.js';

test('consumables never take inventory slots', () => {
  const s = newState();
  addBooster(s, 'warpaint', 5);
  addBooster(s, 'lucky_knot', 2);
  assert.equal(invUsed(s), 0);
});

test('salvage junk keeps equipped, better, boss and one recipe copy', () => {
  const s = newState();
  addGear(s, 'flint_club');          // worse than the boss weapon below: junk
  addGear(s, 'cracked_club');        // worse weapon: junk
  addGear(s, 'cracked_club');        // junk
  addGear(s, 'hide_wrap');           // equipped as armor
  addGear(s, 'hide_wrap');           // a spare copy: junk
  addGear(s, 'torn_hide');           // worse armor: junk
  addGear(s, 'alpha_fang');          // boss and set gear: never junk (and better, so equipped)
  autoEquipBest(s);
  const junk = junkGear(s).map((it) => it.key).sort();
  assert.deepEqual(junk, ['cracked_club', 'cracked_club', 'flint_club', 'hide_wrap', 'torn_hide']);
  const before = s.soles;
  const r = salvageJunk(s);
  assert.equal(r.count, 5);
  assert.equal(s.soles - before, 2 + 2 + 8 + 5 + 2);
  assert.ok(s.inv.some((it) => it.key === 'alpha_fang'));
  assert.equal(s.inv.filter((it) => it.key === 'hide_wrap').length, 1);
});
