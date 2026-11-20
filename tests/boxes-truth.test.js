import test from 'node:test';
import assert from 'node:assert/strict';
import { newState } from '../src/logic/state.js';
import { openAll } from '../src/logic/economy.js';
import { decode, flashbackReady, eraFragments, markFlashbackSeen } from '../src/logic/base.js';
import { FRAGMENTS, FLASHBACKS } from '../src/data/story.js';

test('open all empties the box list and merges materials', () => {
  const s = newState();
  s.boxes = ['bronze', 'bronze', 'silver', 'gold'].map((tier, i) => ({ id: `b${i}`, tier, at: 0 }));
  const flint0 = s.mats.flint, bone0 = s.mats.bone;
  const r = openAll(s);
  assert.equal(s.boxes.length, 0);
  assert.equal(r.count, 4);
  assert.deepEqual(r.tiers, { bronze: 2, silver: 1, gold: 1 });
  const mats = r.items.filter((it) => it.type === 'mat');
  assert.ok(mats.length <= 2, 'one card per material');
  const sum = (k) => mats.filter((m) => m.key === k).reduce((a, m) => a + m.n, 0);
  assert.equal(sum('flint'), s.mats.flint - flint0);
  assert.equal(sum('bone'), s.mats.bone - bone0);
});

test('decoding the last fragment of an era unlocks its flashback once', () => {
  const s = newState();
  s.soles = 10000;
  s.base.truth.tier = 3;
  const list = eraFragments(1);
  assert.equal(list.length, FRAGMENTS.filter((f) => f.era === 1).length);
  assert.ok(FLASHBACKS[1].panels.length > 0);
  s.fragments.found = list.map((f) => f.id);
  let last;
  for (const f of list) last = decode(s, f.id);
  assert.ok(flashbackReady(s, 1));
  assert.equal(last.flashback, 1);
  markFlashbackSeen(s, 1);
  assert.deepEqual(s.flashbacksSeen, [1]);
});
