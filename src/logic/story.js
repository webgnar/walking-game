// Transmissions from 7,301,223 (former tribute): broken messages that clear as you walk.
import { TRANSMISSIONS } from '../data/story.js';

export const txById = (id) => TRANSMISSIONS.find((t) => t.id === id);

function tx(s) {
  if (!s.transmissions) s.transmissions = { active: null, queue: [], cleared: [] };
  return s.transmissions;
}

// Start (or queue) a transmission. Each one only ever starts once.
export function startTransmission(s, id) {
  const t = tx(s);
  if (!txById(id) || t.cleared.includes(id) || (t.active && t.active.id === id) || t.queue.includes(id)) return false;
  if (t.active) t.queue.push(id);
  else t.active = { id, steps: 0 };
  return true;
}

export function activeTransmission(s) {
  const a = tx(s).active;
  if (!a) return null;
  const def = txById(a.id);
  return { ...def, done: a.steps, frac: Math.min(1, a.steps / def.steps), left: Math.max(0, def.steps - a.steps) };
}

// Called with every batch of steps. Returns the ids cleared by these steps.
export function feedTransmission(s, n) {
  const t = tx(s);
  const cleared = [];
  while (t.active && n > 0) {
    const def = txById(t.active.id);
    const use = Math.min(n, def.steps - t.active.steps);
    t.active.steps += use;
    n -= use;
    if (t.active.steps >= def.steps) {
      cleared.push(t.active.id);
      t.cleared.push(t.active.id);
      const next = t.queue.shift();
      t.active = next ? { id: next, steps: 0 } : null;
    }
  }
  return cleared;
}

// The message as readable at a given signal (0..1): words fill in, in a fixed
// scrambled order, starting from def.start at 0% signal.
export function signalText(def, frac) {
  const words = def.text.split(' ');
  const shown = Math.floor(words.length * (def.start + (1 - def.start) * frac));
  const order = words.map((w, i) => [((i + 1) * 2654435761) % 1000, i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const visible = new Set(order.slice(0, shown));
  return words.map((w, i) => (visible.has(i) ? w : '█'.repeat(Math.max(3, Math.min(6, w.length))))).join(' ');
}
