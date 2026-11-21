// Every icon id in src/ui/gameIcons.js must be listed in docs/icon-list.md, and the other way round.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GEAR } from '../src/data/era1.js';

test('icon list doc matches the icon ids in code', () => {
  const src = readFileSync(new URL('../src/ui/gameIcons.js', import.meta.url), 'utf8');
  const body = src.slice(src.indexOf('export const ICONS'), src.indexOf('};', src.indexOf('export const ICONS')));
  const ids = new Set([...body.matchAll(/'([a-z0-9-]+)':/g)].map((m) => m[1]));
  for (const k of Object.keys(GEAR)) ids.add(`gear-${k.replace(/_/g, '-')}`);
  const doc = readFileSync(new URL('../docs/icon-list.md', import.meta.url), 'utf8');
  const listed = new Set([...doc.matchAll(/^\| `([a-z0-9-]+)\.png` \|/gm)].map((m) => m[1]));
  assert.deepEqual([...ids].filter((i) => !listed.has(i)), [], 'ids missing from docs/icon-list.md');
  assert.deepEqual([...listed].filter((i) => !ids.has(i)), [], 'doc lists ids the code does not know');
});
