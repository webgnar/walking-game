import test from 'node:test';
import assert from 'node:assert/strict';
import { env, newState } from '../src/logic/state.js';
import { createBattle, useSkill, endTurn, useFinisher, canFinish, executable, living } from '../src/logic/combat.js';
import { addXp, syncSkills, grantFinisher, toggleLoadout, buyFinisher } from '../src/logic/hero.js';
import { finishTrial, totalStars } from '../src/logic/trials.js';
import { FURY, LOADOUT_MAX } from '../src/data/era1.js';

function hero(level = 9) {
  env.rand = () => 0.5;
  const s = newState();
  let need = 0; for (let l = 1; l < level; l++) need += 50 * l;
  addXp(s, need); syncSkills(s);
  return s;
}

test('loadout is capped at 4 skills', () => {
  const s = hero(9);
  assert.equal(s.hero.loadout.length, LOADOUT_MAX);
  const extra = Object.keys(s.hero.ranks).find((k) => !s.hero.loadout.includes(k));
  assert.equal(toggleLoadout(s, extra), false);
});

test('a finisher needs full Fury and an enemy marked low enough', () => {
  const s = hero(5);
  grantFinisher(s, 'skull');
  const b = createBattle(s, 3);
  const e = living(b)[0];
  assert.equal(canFinish(b, e.uid), false, 'no Fury yet');
  b.hero.fury = FURY.max;
  assert.equal(canFinish(b, e.uid), false, 'enemy not low yet');
  e.hp = Math.floor(e.maxHp * FURY.threshold);
  assert.ok(executable(e));
  b.hero.hp = 10;
  const ev = useFinisher(b, e.uid);
  assert.ok(ev.some((x) => x.t === 'finish' && x.kind === 'skull'));
  assert.ok(e.dead);
  assert.ok(b.hero.hp > 10, 'Skull Crusher heals');
  assert.equal(b.hero.fury, 0);
});

test('Terror stuns the rest of the pack', () => {
  const s = hero(5);
  grantFinisher(s, 'skull'); s.hero.finishers.push('terror'); s.hero.finisher = 'terror';
  const b = createBattle(s, 4);
  const [a, ...rest] = living(b);
  b.hero.fury = FURY.max; a.hp = 1;
  useFinisher(b, a.uid);
  assert.ok(rest.every((e) => e.stunned));
});

test('armor blunts weapon hits but not Flint Jab', () => {
  const s = hero(9);
  s.hero.loadout = ['club', 'jab'];
  const b = createBattle(s, 13);
  const rhino = living(b)[0];
  const club = useSkill(b, 'club', rhino.uid).find((x) => x.t === 'hit');
  const jab = useSkill(b, 'jab', rhino.uid).find((x) => x.t === 'hit');
  assert.ok(club.armored);
  assert.ok(!jab.armored);
});

test('Hurl Stone stops a stalking pounce, and the lion starts over', () => {
  const s = hero(5);
  s.hero.loadout = ['hurl', 'club'];
  const b = createBattle(s, 7);
  const lion = living(b)[0];
  let guard = 0;
  while (lion.intent.key !== 'stalk' && guard++ < 10) endTurn(b);
  assert.equal(lion.intent.key, 'stalk');
  useSkill(b, 'hurl', lion.uid);
  assert.ok(lion.interrupted);
  endTurn(b);
  assert.notEqual(lion.intent.key, 'pounce');
});

test('stars: win, above half health, within par turns', () => {
  const s = hero(9);
  grantFinisher(s, 'skull');
  const b = createBattle(s, 1);
  b.over = 'win'; b.turn = 1;
  const r = finishTrial(s, 1, 'win', b);
  assert.deepEqual(r.starList, [true, true, true]);
  assert.equal(totalStars(s), 3);
});

test('finishers can be bought at the Altar tier they need', () => {
  const s = hero(5);
  s.soles = 1000;
  assert.equal(buyFinisher(s, 'terror').why, 'altar');
  s.base.altar.tier = 1;
  assert.ok(buyFinisher(s, 'terror').ok);
  assert.ok(s.hero.finishers.includes('terror'));
});
