// Hero stats, XP, levels, gear and training.
import { SKILLS, GEAR, SOLES_PER_XP, xpToNext, ERA1, HERO_START, SLOTS } from '../data/era1.js';
import { toast } from './state.js';

export function gearOf(s, uidv) {
  if (!uidv) return null;
  const it = s.inv.find((i) => i.uid === uidv);
  return it ? { ...it, ...GEAR[it.key] } : null;
}

export function equippedGear(s) {
  return SLOTS.map((sl) => gearOf(s, s.hero.equip[sl])).filter(Boolean);
}

export function heroStats(s) {
  const h = s.hero;
  const a = { ...h.attrs };
  let dmg = 0, hpBonus = 0;
  for (const g of equippedGear(s)) {
    dmg += g.stats.dmg || 0;
    hpBonus += g.stats.hp || 0;
    for (const k of ['str', 'vit', 'int', 'agi']) a[k] += g.stats[k] || 0;
  }
  if (h.boons.includes('b_thick_skin')) hpBonus += 15;
  const maxHp = 50 + 5 * a.vit + hpBonus;
  return {
    ...a,
    weapon: dmg,
    maxHp,
    crit: 0.05 + 0.01 * a.agi + (h.boons.includes('b_keen_eye') ? 0.05 : 0),
    dodge: 0.01 * a.agi,
    apCarry: 1 + Math.floor(a.int / 10),
  };
}

export function skillPower(s, id) {
  const sk = SKILLS[id];
  const rank = s.hero.ranks[id] || 1;
  return sk.power + 2 * (rank - 1);
}

export function levelCap(s) {
  return s.era === 1 ? ERA1.levelThreshold : 100;
}

export function maxRank(s) {
  return Math.min(3, 1 + s.base.altar.tier);
}
export function loadoutSize(s) {
  const t = s.base.altar.tier;
  return t >= 3 ? 6 : t >= 1 ? 5 : 4;
}

// Unlock skills by level (GDD v1 table). Returns newly unlocked ids.
export function syncSkills(s) {
  const newly = [];
  for (const id of Object.keys(SKILLS)) {
    if (s.hero.level >= SKILLS[id].unlock && !s.hero.ranks[id]) {
      s.hero.ranks[id] = 1;
      newly.push(id);
      if (s.hero.loadout.length < loadoutSize(s)) s.hero.loadout.push(id);
    }
  }
  return newly;
}

export function addXp(s, amount) {
  const h = s.hero;
  const cap = levelCap(s);
  let levels = 0;
  if (h.level >= cap) return { levels, wasted: amount };
  h.xp += amount;
  while (h.level < cap && h.xp >= xpToNext(h.level)) {
    h.xp -= xpToNext(h.level);
    h.level++;
    h.freeAttr += 2;
    h.freeSkill += 1;
    levels++;
  }
  if (h.level >= cap) h.xp = 0;
  const unlocked = syncSkills(s);
  if (levels) toast(s, { kind: 'level', title: `Level ${h.level}!`, text: `+${2 * levels} attribute points, +${levels} skill point${levels > 1 ? 's' : ''}` });
  for (const id of unlocked) toast(s, { kind: 'skill', title: 'New skill', text: `${SKILLS[id].name}: ${SKILLS[id].desc(SKILLS[id].power)}` });
  return { levels, unlocked };
}

export function xpRemainingToCap(s) {
  const h = s.hero;
  const cap = levelCap(s);
  if (h.level >= cap) return 0;
  let need = xpToNext(h.level) - h.xp;
  for (let l = h.level + 1; l < cap; l++) need += xpToNext(l);
  return need;
}

export function trainCost(s, xp) {
  const per = s.base.altar.tier >= 3 ? SOLES_PER_XP * 0.75 : SOLES_PER_XP;
  return Math.ceil(xp * per);
}

// Train up to the next level, or a fixed chunk.
export function train(s, xp) {
  xp = Math.min(xp, xpRemainingToCap(s));
  if (xp <= 0) return { ok: false, why: 'cap' };
  const cost = trainCost(s, xp);
  if (s.soles < cost) return { ok: false, why: 'soles', cost };
  s.soles -= cost;
  s.hero.spentXpSoles += cost;
  s.trainedOnce = true;
  addXp(s, xp);
  return { ok: true, cost, xp };
}

export function spendAttr(s, k) {
  if (s.hero.freeAttr <= 0) return false;
  s.hero.attrs[k]++;
  s.hero.freeAttr--;
  return true;
}

export function rankUp(s, id) {
  const h = s.hero;
  if (h.freeSkill <= 0 || !h.ranks[id] || h.ranks[id] >= maxRank(s)) return false;
  h.ranks[id]++;
  h.freeSkill--;
  return true;
}

export function respec(s, free = false) {
  const h = s.hero;
  if (!free) {
    if (h.respecTokens <= 0) return false;
    h.respecTokens--;
  }
  const spentA = Object.keys(HERO_START).reduce((t, k) => t + h.attrs[k] - HERO_START[k], 0);
  h.attrs = { ...HERO_START };
  h.freeAttr += spentA;
  for (const id of Object.keys(h.ranks)) {
    h.freeSkill += h.ranks[id] - 1;
    h.ranks[id] = 1;
  }
  return true;
}

export function toggleLoadout(s, id) {
  const lo = s.hero.loadout;
  const i = lo.indexOf(id);
  if (i >= 0) {
    if (lo.length <= 1) return false;
    lo.splice(i, 1);
    return true;
  }
  if (!s.hero.ranks[id] || lo.length >= loadoutSize(s)) return false;
  lo.push(id);
  return true;
}

export function equip(s, uidv) {
  const it = s.inv.find((i) => i.uid === uidv);
  if (!it) return false;
  const slot = GEAR[it.key].slot;
  s.hero.equip[slot] = s.hero.equip[slot] === uidv ? null : uidv;
  return true;
}

export function isEquipped(s, uidv) {
  return Object.values(s.hero.equip).includes(uidv);
}

export function gearScore(g) {
  const st = g.stats;
  return (st.dmg || 0) * 3 + (st.hp || 0) / 4 + (st.str || 0) * 2 + (st.vit || 0) * 2 + (st.int || 0) * 2 + (st.agi || 0) * 2;
}

export function autoEquipBest(s) {
  for (const slot of SLOTS) {
    const cur = gearOf(s, s.hero.equip[slot]);
    let best = cur;
    for (const it of s.inv) {
      const g = GEAR[it.key];
      if (g.slot !== slot) continue;
      if (!best || gearScore(g) > gearScore(best)) best = { ...it, ...g };
    }
    if (best) s.hero.equip[slot] = best.uid;
  }
}
