import test from 'node:test';
import assert from 'node:assert/strict';
import { env, newState } from '../src/logic/state.js';
import { rollTier, PITY, openBox, addBox, addGear } from '../src/logic/economy.js';
import { forge, qualityFromStrikes, reinforce, canForge } from '../src/logic/base.js';
import { heroStats } from '../src/logic/hero.js';
import { itemStats, setStatus } from '../src/logic/gear.js';
import { finishTrial } from '../src/logic/trials.js';
import { createBattle } from '../src/logic/combat.js';
import { RECIPES } from '../src/data/era1.js';

test('pity: a Gold box at least every 15', () => {
  const s = newState();
  env.rand = () => 0.999; // always rolls Bronze
  const tiers = Array.from({ length: PITY.gold }, () => rollTier(s));
  assert.ok(tiers.includes('gold'), `got ${tiers.join(',')}`);
  assert.equal(tiers.indexOf('gold'), PITY.gold - 1);
});

test('boxes give materials and parts, not finished gear (below Legendary)', () => {
  env.rand = Math.random;
  const s = newState();
  for (let i = 0; i < 40; i++) addBox(s, i % 2 ? 'silver' : 'gold');
  let gear = 0, parts = 0;
  while (s.boxes.length) {
    const o = openBox(s, s.boxes[0].id);
    gear += o.items.filter((x) => x.type === 'gear').length;
    parts += o.items.filter((x) => x.type === 'part').reduce((t, x) => t + x.n, 0);
  }
  assert.equal(gear, 0);
  assert.ok(parts >= 40);
});

test('hammer timing sets quality', () => {
  assert.equal(qualityFromStrikes(['perfect', 'perfect', 'good']), 'masterwork');
  assert.equal(qualityFromStrikes(['good', 'good', 'miss']), 'fine');
  assert.equal(qualityFromStrikes(['miss', 'good', 'miss']), 'crude');
  assert.equal(qualityFromStrikes(null), 'fine');
  assert.equal(qualityFromStrikes(['perfect', 'good', 'good'], 3), 'masterwork', 'tier 3 Workshop is more forgiving');
});

test('forging with a part adds its special effect; Masterwork is stronger', () => {
  env.rand = Math.random;
  const s = newState();
  s.base.studio.tier = 2;
  s.recipes.push('r_wolf_pelt');
  s.mats = { ...s.mats, bone: 20, wood: 10, fang: 8 };
  const a = forge(s, 'r_wolf_pelt', 'fang', 'masterwork');
  const b = forge(s, 'r_wolf_pelt', null, 'crude');
  assert.ok(a.ok && b.ok);
  assert.equal(a.item.affix, 'serrated');
  assert.ok(!b.item.affix);
  assert.ok(itemStats(a.item).hp > itemStats(b.item).hp);
  assert.equal(s.mats.fang, 8 - 3 - 1 - 3);
});

test('no part slot before Workshop tier 2; blueprints required', () => {
  const s = newState();
  s.base.studio.tier = 1;
  s.mats = { ...s.mats, flint: 20, wood: 20, fang: 5 };
  const club = RECIPES.find((r) => r.id === 'r_flint_club');
  assert.equal(canForge(s, club, 'fang').why, 'slot');
  assert.equal(canForge(s, RECIPES.find((r) => r.id === 'r_wolf_pelt')).why, 'blueprint');
});

test('reinforcing raises stats up to +5', () => {
  const s = newState();
  s.mats = { ...s.mats, flint: 200, wood: 200 };
  const it = addGear(s, 'flint_club');
  const before = itemStats(it).dmg;
  for (let i = 0; i < 6; i++) reinforce(s, it.uid);
  assert.equal(it.plus, 5);
  assert.equal(itemStats(it).dmg, before + 5);
});

test('a full Pack Hunter set fills Fury faster and adds crit', () => {
  const s = newState();
  const base = heroStats(s);
  for (const k of ['alpha_fang', 'wolf_pelt', 'fang_charm']) { const it = addGear(s, k); s.hero.equip[it.key === 'alpha_fang' ? 'weapon' : it.key === 'wolf_pelt' ? 'armor' : 'trinket'] = it.uid; }
  const st = heroStats(s);
  assert.equal(setStatus(s).find((x) => x.set.id === 'pack').n, 3);
  assert.ok(st.crit > base.crit);
  assert.equal(st.furyMult, 1.5);
});

test('regular first wins drop beast parts, not loot boxes; bosses drop set blueprints', () => {
  env.rand = Math.random;
  const s = newState();
  const r1 = finishTrial(s, 2, 'win', createBattle(s, 2));
  assert.equal(r1.box, null);
  assert.ok((r1.parts.fang || 0) >= 1);
  const r5 = finishTrial(s, 5, 'win', createBattle(s, 5));
  assert.equal(r5.box, 'gold');
  assert.deepEqual(r5.blueprints, ['r_wolf_pelt', 'r_fang_charm']);
});
