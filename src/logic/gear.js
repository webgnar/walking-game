// A piece of gear in the inventory is an instance: { uid, key, q (quality), affix, plus }.
// Its stats come from the base item, scaled by forging quality and reinforce level.
import { GEAR, QUALITY, AFFIXES, SETS, SLOTS } from '../data/era1.js';

const ATTRS = ['str', 'vit', 'int', 'agi'];

export function itemStats(it) {
  const base = GEAR[it.key].stats;
  const q = QUALITY[it.q || 'fine'].mult;
  const p = it.plus || 0;
  const out = {};
  if (base.dmg) out.dmg = Math.round(base.dmg * q) + p;
  if (base.hp) out.hp = Math.round(base.hp * q) + 3 * p;
  for (const k of ATTRS) if (base[k]) out[k] = Math.max(1, Math.round(base[k] * q)) + (p >= 3 ? 1 : 0) + (p >= 5 ? 1 : 0);
  return out;
}

export function itemName(it) {
  const g = GEAR[it.key];
  const q = it.q && it.q !== 'fine' ? `${QUALITY[it.q].name} ` : '';
  const a = it.affix ? `${AFFIXES[it.affix].name} ` : '';
  return `${q}${a}${g.name}${it.plus ? ` +${it.plus}` : ''}`;
}

// Rough strength, for comparing within a slot (auto-equip, junk detection).
export function itemScore(it) {
  const st = itemStats(it);
  return (st.dmg || 0) * 3 + (st.hp || 0) / 4 + ATTRS.reduce((t, k) => t + (st[k] || 0) * 2, 0) + (it.affix ? 4 : 0) + (GEAR[it.key].set ? 2 : 0);
}

export function equippedItems(s) {
  return SLOTS.map((sl) => s.inv.find((i) => i.uid === s.hero.equip[sl])).filter(Boolean);
}

// How many pieces of each set are equipped, and which bonuses are active.
export function setStatus(s) {
  const eq = equippedItems(s).map((i) => i.key);
  return Object.values(SETS).map((set) => {
    const n = set.pieces.filter((k) => eq.includes(k)).length;
    const active = Object.entries(set.bonus).filter(([need]) => n >= Number(need)).map(([, b]) => b);
    return { set, n, active };
  });
}

// Everything gear adds on top of plain stats: special effects and set bonuses.
export function gearBonuses(s) {
  const b = { crit: 0, bleed: 0, burn: 0, pierce: 0, hp: 0, furyMult: 1, firstAp: 0 };
  for (const it of equippedItems(s)) {
    const a = it.affix && AFFIXES[it.affix];
    if (!a) continue;
    b.crit += a.crit || 0;
    b.bleed = Math.max(b.bleed, a.bleed || 0);
    b.burn = Math.max(b.burn, a.burn || 0);
    b.pierce += a.pierce || 0;
    b.hp += a.hp || 0;
  }
  for (const st of setStatus(s)) for (const x of st.active) {
    b.crit += x.crit || 0;
    b.bleed = Math.max(b.bleed, x.bleed || 0);
    if (x.furyMult) b.furyMult = Math.max(b.furyMult, x.furyMult);
    b.firstAp += x.firstAp || 0;
  }
  return b;
}
