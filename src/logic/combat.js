// Turn-based combat engine. Pure: takes a battle object and returns events for the UI to animate.
import { SKILLS, ENEMIES, TRIALS, TUNING } from '../data/era1.js';
import { env } from './state.js';
import { heroStats, skillPower } from './hero.js';

const VET = 1.25;
const MAX_ENEMIES = 4;
let nextId = 1;

function makeEnemy(spec) {
  const vet = spec.endsWith('!');
  const id = vet ? spec.slice(0, -1) : spec;
  const d = ENEMIES[id];
  const hp = Math.round(d.hp * (vet ? VET : 1) * TUNING.enemyHp);
  return {
    uid: nextId++, id, name: (vet ? 'Veteran ' : '') + d.name, vet, hp, maxHp: hp, block: 0,
    intent: null, stunned: false, burn: null, feared: false, snarl: false, interrupted: false,
    step: 0, turns: 0, stompBonus: 0, dead: false,
  };
}

export function createBattle(s, trialN) {
  const t = TRIALS.find((x) => x.n === trialN);
  const st = heroStats(s);
  const b = {
    trial: trialN,
    hero: {
      hp: st.maxHp, maxHp: st.maxHp, block: 0, ap: 3, bleed: null, cooldowns: {}, stats: st,
      warpaint: s.active.warpaint > 0 ? 3 : 0, firstStrike: s.hero.boons.includes('b_first_strike'),
      emberHeart: s.hero.boons.includes('b_ember_heart'),
      damageTaken: 0,
    },
    loadout: trialN === 0 ? ['club', 'guard'] : [...s.hero.loadout],
    powers: Object.fromEntries(Object.keys(SKILLS).map((k) => [k, skillPower(s, k)])),
    enemies: t.enemies.map(makeEnemy),
    turn: 1,
    over: null,
  };
  if (b.hero.warpaint) s.active.warpaint--;
  if (b.hero.firstStrike) b.hero.ap += 1;
  for (const e of b.enemies) {
    e.step = Math.floor(env.rand() * 2);
    chooseIntent(b, e);
  }
  return b;
}

export function living(b) {
  return b.enemies.filter((e) => !e.dead);
}

// ---------- Intents ----------
const CYCLES = {
  boar: ['gore', 'gore', 'charging', 'charge'],
  bear: ['swipe', 'swipe', 'hunker'],
  sabre: ['claw', 'bleed', 'claw', 'crouch', 'pounce'],
  mammoth: ['stomp', 'trumpet', 'stomp', 'lower', 'charge'],
  mammothEnraged: ['stomp', 'lower', 'charge'],
};

export function chooseIntent(b, e) {
  const d = ENEMIES[e.id];
  let key;
  switch (d.pattern) {
    case 'wolf':
      key = e.snarl ? 'bite' : env.rand() < 0.35 ? 'snarl' : 'bite';
      break;
    case 'alpha':
      if (e.turns % 3 === 2 && living(b).length < MAX_ENEMIES) key = 'call';
      else key = e.snarl ? 'bite' : env.rand() < 0.3 ? 'snarl' : 'bite';
      break;
    case 'hunter': {
      const r = env.rand();
      key = r < 0.5 ? 'spear' : r < 0.75 && e.lastKey !== 'guard' ? 'guard' : 'throw';
      break;
    }
    case 'mammoth': {
      const enraged = e.hp < e.maxHp / 2;
      if (enraged && !e.enraged) { e.enraged = true; e.step = 0; }
      const cyc = enraged ? CYCLES.mammothEnraged : CYCLES.mammoth;
      key = cyc[e.step % cyc.length];
      e.step++;
      break;
    }
    default: {
      const cyc = CYCLES[d.pattern];
      key = cyc[e.step % cyc.length];
      e.step++;
    }
  }
  e.lastKey = key;
  e.intent = { key, ...d.intents[key] };
  if (e.intent.dmg) e.intent.dmg = intentDamage(e, e.intent);
  e.interrupted = false;
}

function intentDamage(e, it) {
  let dmg = ENEMIES[e.id].intents[it.key].dmg;
  dmg = Math.round(dmg * (e.vet ? VET : 1) * TUNING.enemyDmg);
  if (it.key === 'bite' && e.snarl) dmg = Math.round(dmg * 1.5);
  if (it.key === 'stomp') dmg += e.stompBonus;
  return dmg;
}

// What the intent badge shows.
export function intentLabel(e) {
  if (e.stunned) return { icon: '💫', text: 'Stunned', cls: 'stun' };
  const it = e.intent;
  if (!it) return { icon: '?', text: '', cls: '' };
  if (e.interrupted) return { icon: '✖', text: 'Interrupted', cls: 'stun' };
  if (e.feared && it.kind === 'attack') return { icon: '😨', text: `Scared (skips ${it.label})`, cls: 'stun' };
  switch (it.kind) {
    case 'attack': return { icon: it.pierce ? '🎯' : '⚔', text: `${it.label} ${it.dmg}`, cls: 'atk', note: it.note };
    case 'block': return { icon: '🛡', text: `${it.label} ${Math.round(it.amt * (e.vet ? VET : 1) * TUNING.enemyDmg)}`, cls: 'def', note: it.note };
    case 'buff': return { icon: '⬆', text: it.label, cls: 'buff', note: it.note };
    case 'windup': return { icon: '⚠', text: it.label, cls: 'warn', note: it.note };
    case 'call': return { icon: '📯', text: it.label, cls: 'warn', note: it.note };
    case 'bleed': return { icon: '🩸', text: `${it.label} ${it.dmg}×${it.turns}`, cls: 'atk', note: it.note };
    default: return { icon: '?', text: it.label, cls: '' };
  }
}

// ---------- Player actions ----------
export function canUse(b, id) {
  const sk = SKILLS[id];
  if (b.over) return false;
  if (b.hero.ap < sk.ap) return false;
  if (b.hero.cooldowns[id] > 0) return false;
  if (TUNING.guardOncePerTurn && sk.kind === 'block' && b.hero.guarded) return false;
  return true;
}

function damageEnemy(b, e, raw, kind, ev) {
  const h = b.hero;
  let dmg = raw;
  let crit = false;
  if (kind !== 'burn' && env.rand() < h.stats.crit) { dmg = Math.round(dmg * 1.5); crit = true; }
  const absorbed = Math.min(e.block, dmg);
  e.block -= absorbed;
  dmg -= absorbed;
  e.hp = Math.max(0, e.hp - dmg);
  ev.push({ t: 'hit', who: e.uid, dmg, crit, absorbed, kind, hpAfter: e.hp, blockAfter: e.block });
  if (e.hp <= 0 && !e.dead) {
    e.dead = true;
    ev.push({ t: 'die', who: e.uid });
  }
}

export function useSkill(b, id, targetUid) {
  const ev = [];
  if (!canUse(b, id)) return ev;
  const sk = SKILLS[id];
  const h = b.hero;
  const p = b.powers[id];
  let target = b.enemies.find((e) => e.uid === targetUid && !e.dead) || living(b)[0];
  h.ap -= sk.ap;
  if (sk.cooldown) h.cooldowns[id] = sk.cooldown;
  ev.push({ t: 'use', skill: id, who: target ? target.uid : null });
  switch (sk.kind) {
    case 'physical': {
      if (sk.interrupts && target.intent && target.intent.kind === 'call' && !target.interrupted) {
        target.interrupted = true;
        ev.push({ t: 'interrupt', who: target.uid });
      }
      damageEnemy(b, target, p + h.stats.str + h.stats.weapon + h.warpaint, 'physical', ev);
      if (sk.stunChance && !target.dead && !target.stunned && !ENEMIES[target.id].boss && env.rand() < sk.stunChance) {
        target.stunned = true;
        ev.push({ t: 'stun', who: target.uid });
      }
      break;
    }
    case 'fire': {
      damageEnemy(b, target, p + h.stats.int, 'fire', ev);
      if (!target.dead) {
        target.burn = { dmg: sk.burn, turns: sk.burnTurns + (h.emberHeart ? 1 : 0) };
        if (ENEMIES[target.id].fireFear) {
          target.feared = true;
          ev.push({ t: 'fear', who: target.uid });
        }
      }
      break;
    }
    case 'block': {
      const amt = p + Math.floor(h.stats.vit / 2);
      h.block += amt;
      h.guarded = true;
      ev.push({ t: 'block', who: 'hero', amt });
      break;
    }
    case 'stun': {
      target.stunned = true;
      ev.push({ t: 'stun', who: target.uid });
      break;
    }
  }
  checkOver(b, ev);
  return ev;
}

function checkOver(b, ev) {
  if (b.over) return;
  if (living(b).length === 0) { b.over = 'win'; ev.push({ t: 'win' }); }
  else if (b.hero.hp <= 0) { b.over = 'lose'; ev.push({ t: 'lose' }); }
}

function hurtHero(b, raw, pierce, ev, from) {
  const h = b.hero;
  if (env.rand() < h.stats.dodge) { ev.push({ t: 'dodge', who: 'hero', from }); return; }
  let dmg = raw;
  let absorbed = 0;
  if (!pierce) { absorbed = Math.min(h.block, dmg); h.block -= absorbed; dmg -= absorbed; }
  h.hp = Math.max(0, h.hp - dmg);
  h.damageTaken += dmg;
  ev.push({ t: 'hit', who: 'hero', dmg, absorbed, from, hpAfter: h.hp, blockAfter: h.block });
}

// Ends the player's turn; enemies act; a new player turn starts. Returns events.
export function endTurn(b) {
  const ev = [];
  if (b.over) return ev;
  const h = b.hero;
  const leftover = h.ap;
  for (const e of [...b.enemies]) {
    if (e.dead || b.over) continue;
    e.block = 0;
    // burn ticks at the start of the enemy's turn
    if (e.burn) {
      damageEnemy(b, e, e.burn.dmg, 'burn', ev);
      e.burn.turns--;
      if (e.burn.turns <= 0) e.burn = null;
      if (e.dead) { checkOver(b, ev); continue; }
    }
    const it = e.intent;
    if (e.stunned) {
      ev.push({ t: 'skip', who: e.uid, why: 'stunned' });
      e.stunned = false;
    } else if (e.interrupted) {
      ev.push({ t: 'skip', who: e.uid, why: 'interrupted' });
    } else if (e.feared && it.kind === 'attack') {
      ev.push({ t: 'skip', who: e.uid, why: 'scared' });
      e.feared = false;
      if (it.key === 'bite') e.snarl = false;
    } else {
      ev.push({ t: 'act', who: e.uid, key: it.key });
      switch (it.kind) {
        case 'attack':
          hurtHero(b, it.dmg, it.pierce, ev, e.uid);
          if (it.key === 'bite') e.snarl = false;
          break;
        case 'block': {
          const amt = Math.round(it.amt * (e.vet ? VET : 1) * TUNING.enemyDmg);
          e.block = amt;
          if (it.key === 'trumpet') e.stompBonus += 3;
          ev.push({ t: 'block', who: e.uid, amt });
          break;
        }
        case 'buff':
          e.snarl = true;
          ev.push({ t: 'buff', who: e.uid });
          break;
        case 'windup':
          ev.push({ t: 'windup', who: e.uid });
          break;
        case 'call': {
          const w = makeEnemy('wolf');
          w.step = 0;
          b.enemies.push(w);
          chooseIntent(b, w);
          ev.push({ t: 'summon', who: w.uid, by: e.uid });
          break;
        }
        case 'bleed':
          hurtHero(b, it.dmg, false, ev, e.uid);
          h.bleed = { dmg: it.dmg, turns: it.turns };
          ev.push({ t: 'bleed', who: 'hero' });
          break;
      }
    }
    e.turns++;
    checkOver(b, ev);
    if (!b.over && !e.dead) chooseIntent(b, e);
  }
  if (b.over) return ev;
  // new player turn
  b.turn++;
  h.block = 0;
  h.guarded = false;
  if (h.bleed) {
    h.hp = Math.max(0, h.hp - h.bleed.dmg);
    h.damageTaken += h.bleed.dmg;
    ev.push({ t: 'hit', who: 'hero', dmg: h.bleed.dmg, kind: 'bleed', hpAfter: h.hp, blockAfter: 0 });
    h.bleed.turns--;
    if (h.bleed.turns <= 0) h.bleed = null;
    checkOver(b, ev);
  }
  h.ap = 3 + Math.min(leftover, h.stats.apCarry);
  for (const k of Object.keys(h.cooldowns)) if (h.cooldowns[k] > 0) h.cooldowns[k]--;
  ev.push({ t: 'turn', n: b.turn });
  return ev;
}

// Simple auto-play used by tests and balance checks: greedy, reads intents.
export function autoPlay(b, maxTurns = 60) {
  while (!b.over && b.turn <= maxTurns) {
    let guard = 0;
    while (!b.over && b.hero.ap > 0 && guard++ < 10) {
      const alive = living(b);
      const big = alive.find((e) => e.intent && e.intent.kind === 'attack' && e.intent.dmg >= 14 && !e.stunned);
      const caller = alive.find((e) => e.intent && e.intent.kind === 'call' && !e.interrupted);
      const incoming = alive.reduce((t, e) => t + (e.intent && e.intent.kind === 'attack' && !e.stunned && !e.feared ? e.intent.dmg : 0), 0);
      const weakest = alive.reduce((a, e) => (e.hp < a.hp ? e : a), alive[0]);
      if (caller && b.loadout.includes('hurl') && canUse(b, 'hurl')) { useSkill(b, 'hurl', caller.uid); continue; }
      if (big && b.loadout.includes('roar') && canUse(b, 'roar')) { useSkill(b, 'roar', big.uid); continue; }
      if (b.loadout.includes('firebrand') && canUse(b, 'firebrand') && alive.some((e) => !e.burn)) {
        const t = alive.find((e) => !e.burn && ENEMIES[e.id].fireFear) || alive.find((e) => !e.burn);
        useSkill(b, 'firebrand', t.uid); continue;
      }
      if (incoming >= 10 && b.hero.block < incoming && canUse(b, 'guard') && b.hero.hp < b.hero.maxHp * 0.6) { useSkill(b, 'guard'); continue; }
      if (canUse(b, 'club')) { useSkill(b, 'club', weakest.uid); continue; }
      break;
    }
    endTurn(b);
  }
  return b.over || 'timeout';
}
