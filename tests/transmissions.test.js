import test from 'node:test';
import assert from 'node:assert/strict';
import { newState } from '../src/logic/state.js';
import { ingestSteps } from '../src/logic/economy.js';
import { startTransmission, activeTransmission, signalText, txById } from '../src/logic/story.js';

test('a transmission clears with walking and shows in the report', () => {
  const s = newState();
  assert.ok(startTransmission(s, 't1'));
  assert.ok(!startTransmission(s, 't1'), 'only starts once');
  ingestSteps(s, 400);
  assert.equal(activeTransmission(s).done, 400);
  ingestSteps(s, 700);
  assert.equal(activeTransmission(s), null);
  assert.deepEqual(s.transmissions.cleared, ['t1']);
  assert.deepEqual(s.report.transmissions, ['t1']);
});

test('a second transmission waits its turn and leftover steps carry over', () => {
  const s = newState();
  startTransmission(s, 't1');
  startTransmission(s, 't2');
  ingestSteps(s, 1500);
  assert.equal(activeTransmission(s).id, 't2');
  assert.equal(activeTransmission(s).done, 500);
});

test('signal text fills in as the signal grows', () => {
  const d = txById('t1');
  const blocks = (t) => (t.match(/█+/g) || []).length;
  assert.ok(blocks(signalText(d, 0)) > blocks(signalText(d, 0.5)));
  assert.equal(signalText(d, 1), d.text);
});
