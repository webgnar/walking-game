// Game icons. Every icon has an id and an emoji placeholder. Drop a PNG named <id>.png into
// src/icons/ and the game shows it instead of the emoji (Vite picks it up on the next build).
// The full list, with what each icon shows and a ChatGPT prompt, is docs/icon-list.md.
import { GEAR } from '../data/era1.js';

const FILES = import.meta.glob('../icons/*.png', { eager: true, query: '?url', import: 'default' });
const URL_OF = {};
for (const [path, url] of Object.entries(FILES)) URL_OF[path.split('/').pop().slice(0, -4)] = url;

// id -> emoji placeholder. Keep in step with docs/icon-list.md (tests/icons.test.js checks).
export const ICONS = {
  // currencies and rewards
  'cur-soles': '👣', 'cur-steps': '🚶', 'cur-xp': '⭐', 'cur-respec': '🔄', 'cur-blueprint': '📐',
  'cur-fragment': '📄', 'cur-era-key': '🗝️', 'cur-boon': '✨', 'cur-signal': '📡', 'cur-report': '📜',
  // materials and beast parts
  'mat-flint': '🪨', 'mat-bone': '🦴', 'mat-wood': '🪵',
  'part-fang': '🦷', 'part-claw': '🐾', 'part-tine': '🦌', 'part-hide': '🟫', 'part-ember': '🔥',
  // boosters
  'boost-stride-brew': '🧪', 'boost-lucky-knot': '🪢', 'boost-warpaint': '🎨',
  // loot boxes
  'box-bronze': '📦', 'box-silver': '🎁', 'box-gold': '💰', 'box-platinum': '💎', 'box-legendary': '🔥', 'box-celestial': '🌌',
  // gear slots (also the fallback for any gear item without its own icon)
  'slot-weapon': '🏏', 'slot-armor': '🦺', 'slot-helm': '⛑️', 'slot-offhand': '🛡️', 'slot-trinket': '📿',
  // skills and finishers
  'skill-club': '🪵', 'skill-guard': '🛡', 'skill-roar': '📣', 'skill-hurl': '🪨', 'skill-jab': '🗡',
  'skill-firebrand': '🔥', 'skill-sweep': '🌀', 'skill-secondwind': '💨',
  'fin-skull': '💀', 'fin-terror': '😱', 'fin-bloodrush': '🩸',
  // buildings
  'bld-studio': '⚒', 'bld-altar': '🗿', 'bld-inventory': '🧺', 'bld-shrine': '⛩', 'bld-truth': '📌',
  // combat: statuses and enemy intents
  'st-attack': '⚔', 'st-pierce': '🎯', 'st-block': '🛡', 'st-buff': '⬆', 'st-windup': '⚠', 'st-call': '📯',
  'st-bleed': '🩸', 'st-burn': '🔥', 'st-stun': '💫', 'st-interrupted': '✖', 'st-scared': '😨', 'st-execute': '💀',
  // hero stats
  'stat-health': '❤', 'stat-weapon': '🏏', 'stat-crit': '🎯', 'stat-dodge': '💨', 'stat-ap': '⚡',
  // Trials map
  'node-mini-boss': '💀', 'node-era-boss': '🦣',
  // goals and achievements
  'goal-done': '✅', 'goal-ready': '🎁', 'goal-open': '⬜', 'ach-unlocked': '🏆', 'ach-locked': '🔒',
  // actions and screen headers
  'act-evolve': '🧬', 'act-train': '🗿', 'act-inventory': '🎒', 'act-retreat': '🏳', 'act-home': '🏠',
  'act-timer': '⏳', 'act-reset': '🗑', 'act-fullscreen': '⛶', 'act-fight': '⚔', 'act-points': '✦',
  'act-play': '▶', 'act-locked': '🔒', 'hdr-boxes': '📦', 'hdr-goals': '🎯', 'hdr-trophy': '🏆', 'hdr-settings': '⚙',
};
for (const key of Object.keys(GEAR)) ICONS[gearId(key)] = null; // falls back to the slot icon

export function gearId(key) { return `gear-${key.replace(/_/g, '-')}`; }
export const hasIcon = (id) => !!URL_OF[id];

// HTML for an icon: the PNG if one was dropped in, otherwise the emoji.
export function gi(id, emoji) {
  if (URL_OF[id]) return `<img class="gimg" src="${URL_OF[id]}" alt="" draggable="false">`;
  return emoji ?? ICONS[id] ?? '?';
}
// Gear: its own icon, else its slot's icon.
export function gearGi(key) {
  const id = gearId(key);
  return URL_OF[id] ? gi(id) : gi(`slot-${GEAR[key].slot}`);
}
