// Plays Era 1 end to end at 6,000 steps a day with a simple bot, through the real game logic.
import test from 'node:test';
import assert from 'node:assert/strict';
import { env, newState } from '../src/logic/state.js';
import * as E from '../src/logic/economy.js';
import * as B from '../src/logic/base.js';
import * as H from '../src/logic/hero.js';
import * as C from '../src/logic/combat.js';
import * as T from '../src/logic/trials.js';
import { BUILDING_ORDER, RECIPES } from '../src/data/era1.js';
import { seed } from './sim.test.js';

function playEra1(stepsPerDay, seedN) {
  seed(seedN);
  let now = new Date('2026-01-05T08:00:00').getTime();
  env.now = () => now;
  const s = newState();
  T.finishTrial(s, 0, 'win', null); // tutorial
  const log = { days: 0, losses: 0 };
  const spend = () => {
    E.collectReport(s);
    while (s.boxes.length) E.openBox(s, s.boxes[0].id);
    B.tickBase(s);
    // build: cheapest available upgrade first
    for (const b of [...BUILDING_ORDER].sort((x, y) => s.base[x].tier - s.base[y].tier)) {
      const c = B.upgradeCost(s, b);
      if (c && !s.base[b].job && B.canAfford(s, c)) B.startUpgrade(s, b);
    }
    // craft weapon/armor upgrades when possible
    for (const id of ['r_flint_club', 'r_bone_mail', 'r_wolf_pelt', 'r_fang_charm', 'r_lion_mask', 'r_claw_buckler']) {
      const r = RECIPES.find((x) => x.id === id);
      if (!s.inv.some((i) => i.key === r.out.gear) && B.canForge(s, r).ok) B.forge(s, id, null, 'fine');
    }
    for (const k of ['stone_club', 'hide_wrap']) if (!s.inv.some((i) => i.key === k) && s.soles > 400) E.buy(s, E.SHOP_ITEMS.findIndex((x) => x.key === k));
    H.autoEquipBest(s);
    // train only when the base is waiting on timers
    if (BUILDING_ORDER.every((b) => s.base[b].tier >= 3 || s.base[b].job)) while (H.train(s, 50).ok);
    const order = ['str', 'vit', 'str', 'vit', 'agi', 'int'];
    let i = 0;
    while (s.hero.freeAttr > 0) H.spendAttr(s, order[i++ % order.length]);
    for (const id of ['club', 'jab', 'firebrand', 'hurl', 'roar', 'secondwind', 'guard']) while (H.rankUp(s, id));
    // pick 4 skills for the act ahead, like a player reading the Trial card
    const nt = T.nextTrial(s);
    const want = !nt || nt.n <= 5 ? ['club', 'guard', 'roar', 'hurl'] : nt.n <= 10 ? ['club', 'hurl', 'firebrand', 'roar'] : ['jab', 'firebrand', 'roar', 'secondwind'];
    s.hero.loadout = want.filter((k) => s.hero.ranks[k]);
    for (const k of ['club', 'guard', 'hurl', 'firebrand']) if (s.hero.loadout.length < 4 && s.hero.ranks[k] && !s.hero.loadout.includes(k)) s.hero.loadout.push(k);
  };
  while (log.days < 60 && !(s.eraKey && B.baseComplete(s) && s.hero.level >= 10)) {
    log.days++;
    for (let h = 0; h < 6; h++) { E.ingestSteps(s, stepsPerDay / 6); now += 2 * 3600e3; spend(); }
    // couch session: push trials until a loss, then replay a couple for materials
    let tries = 0;
    while (tries++ < 20) {
      const t = T.nextTrial(s);
      if (!t) break;
      const b = C.createBattle(s, t.n);
      const res = C.autoPlay(b);
      T.finishTrial(s, t.n, res, b);
      if (res !== 'win') { log.losses++; break; }
      spend();
    }
    for (let r = 0; r < 3; r++) { const b = C.createBattle(s, 1); T.finishTrial(s, 1, C.autoPlay(b), b); }
    spend();
    now += 12 * 3600e3;
  }
  log.level = s.hero.level;
  log.key = s.eraKey;
  log.base = BUILDING_ORDER.map((b) => s.base[b].tier).join('');
  log.canEvolve = B.canEvolve(s);
  if (log.canEvolve) {
    const choice = B.boonChoices(s)[0];
    B.evolve(s, choice.id);
    log.evolved = s.era === 2;
  }
  env.now = () => Date.now();
  return log;
}

test('Era 1 can be finished end to end at 6,000 steps a day', () => {
  const runs = [1, 2, 3].map((n) => playEra1(6000, n));
  console.log(runs.map((r) => JSON.stringify(r)).join('\n'));
  for (const r of runs) {
    assert.ok(r.canEvolve, `should be able to evolve: ${JSON.stringify(r)}`);
    assert.ok(r.evolved);
  }
  const avg = runs.reduce((t, r) => t + r.days, 0) / runs.length;
  console.log('average days to finish Era 1:', avg.toFixed(1));
});
