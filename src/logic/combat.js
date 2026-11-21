// Turn-based combat engine. Pure: takes a battle object and returns events for the UI to animate.
import { SKILLS, ENEMIES, TRIALS, TUNING, FURY, LOADOUT_MAX } from '../data/era1.js';
import { env } from './state.js';
import { heroStats, skillPower } from './hero.js';

const VET = 1.25;
const MAX_ENEMIES = 4;
let nextId = 1;

// power: the Trial's difficulty dial (TRIALS[n].power), on top of the global tuning.
function makeEnemy(spec, power = 1) {
  const vet = spec.endsWith('!');
  const id = vet ? spec.slice(0, -1) : spec;
  const d = ENEMIES[id];
  const hp = Math.round(d.hp * (vet ? VET : 1) * TUNING.enemyHp * power);
  return {
    uid: nextId++, id, name: (vet ? 'Veteran ' : '') + d.name, vet, hp, maxHp: hp, block: 0, power,
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
      fury: 0,
      finisher: trialN === 0 ? null : s.hero.finisher || null,
    },
    loadout: trialN === 0 ? ['club', 'guard'] : s.hero.loadout.slice(0, LOADOUT_MAX),
    finishes: 0,
    powers: Object.fromEntries(Object.keys(SKILLS).map((k) => [k, skillPower(s, k)])),
    enemies: t.enemies.map((e) => makeEnemy(e, t.power || 1)),
    power: t.power || 1,
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
  lion: ['swipe', 'swipe', 'stalk', 'pounce'],
  elk: ['antler', 'antler', 'paw', 'charge'],
  rhino: ['horn', 'horn', 'lower', 'charge'],
  boar: ['gore', 'gore', 'charging', 'charge'],
  bear: ['swipe', 'swipe', 'hunker'],
  sabre: ['claw', 'bleed', 'claw', 'crouch', 'pounce'],
  mammoth: ['stomp', 'trumpet', 'stomp', 'lower', 'charge'],
  mammothEnraged: ['stomp', 'lower', 'charge'],
};

export function chooseIntent(b, e) {
  currentBattle = b;
  const d = ENEMIES[e.id];
  let key;
  switch (d.pattern) {
    case 'mangy':
      key = 'bite';
      break;
    case 'hyena':
      key = e.snarl ? 'bite' : living(b).filter((x) => x.id === 'hyena').length > 1 && env.rand() < 0.35 ? 'cackle' : 'bite';
      break;
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

let currentBattle = null;
function intentDamage(e, it) {
  const d = ENEMIES[e.id];
  let dmg = d.intents[it.key].dmg;
  dmg = Math.round(dmg * (e.vet ? VET : 1) * TUNING.enemyDmg * (e.power || 1));
  if (it.key === 'bite' && e.snarl) dmg = Math.round(dmg * 1.5);
  if (it.key === 'stomp') dmg += e.stompBonus;
  const b = currentBattle;
  if (b) {
    // Pack: while a leader lives, the others hit harder. Hyenas also feed off each other.
    if (!d.leader && living(b).some((x) => x !== e && ENEMIES[x.id].leader)) dmg += 2;
    if (e.id === 'hyena') dmg += living(b).filter((x) => x !== e && x.id === 'hyena').length;
  }
  // Enraged: half health or less hits 50% harder
  if (d.enrages && e.hp <= e.maxHp / 2) dmg = Math.round(dmg * 1.5);
  return dmg;
}

// ---------- Fury and finishers ----------
export function executable(e) {
  if (!e || e.dead) return false;
  return e.hp <= e.maxHp * (ENEMIES[e.id].boss ? FURY.bossThreshold : FURY.threshold);
}
export function canFinish(b, uid) {
  const h = b.hero;
  if (b.over || !h.finisher || h.fury < FURY.max || h.ap < FURY.ap) return false;
  if (uid == null) return living(b).some(executable);
  return executable(b.enemies.find((x) => x.uid === uid));
}
function addFury(b, n, ev) {
  const h = b.hero;
  if (!h.finisher || h.fury >= FURY.max) return;
  h.fury = Math.min(FURY.max, h.fury + n);
  ev.push({ t: 'fury', v: h.fury });
}
export function useFinisher(b, targetUid) {
  const ev = [];
  if (!canFinish(b, targetUid)) return ev;
  const h = b.hero;
  const e = b.enemies.find((x) => x.uid === targetUid);
  h.ap -= FURY.ap;
  h.fury = 0;
  b.finishes++;
  ev.push({ t: 'finish', who: e.uid, kind: h.finisher });
  e.hp = 0;
  e.dead = true;
  ev.push({ t: 'hit', who: e.uid, dmg: 0, finish: true, hpAfter: 0, blockAfter: 0 });
  ev.push({ t: 'die', who: e.uid, finish: h.finisher });
  switch (h.finisher) {
    case 'skull': {
      const amt = Math.round(h.maxHp * 0.15);
      h.hp = Math.min(h.maxHp, h.hp + amt);
      ev.push({ t: 'heal', who: 'hero', amt, hpAfter: h.hp });
      break;
    }
    case 'terror':
      for (const o of living(b)) { o.stunned = true; ev.push({ t: 'stun', who: o.uid, terror: true }); }
      break;
    case 'bloodrush':
      h.ap += 2;
      ev.push({ t: 'ap', amt: 2 });
      break;
  }
  ev.push({ t: 'fury', v: 0 });
  checkOver(b, ev);
  return ev;
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
    case 'block': return { icon: '🛡', text: `${it.label} ${Math.round(it.amt * (e.vet ? VET : 1) * TUNING.enemyDmg * (e.power || 1))}`, cls: 'def', note: it.note };
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

function damageEnemy(b, e, raw, kind, ev, pierce = false) {
  const h = b.hero;
  let dmg = raw;
  let crit = false;
  if (kind !== 'burn' && env.rand() < h.stats.crit) { dmg = Math.round(dmg * 1.5); crit = true; }
  // Armor blunts weapon hits; Flint Jab (pierce) and fire go straight through.
  const armor = ENEMIES[e.id].armor || 0;
  if (armor && kind === 'physical' && !pierce) dmg = Math.max(1, dmg - armor);
  const absorbed = pierce ? 0 : Math.min(e.block, dmg);
  e.block -= absorbed;
  dmg -= absorbed;
  e.hp = Math.max(0, e.hp - dmg);
  ev.push({ t: 'hit', who: e.uid, dmg, crit, absorbed, kind, hpAfter: e.hp, blockAfter: e.block, armored: !!(armor && kind === 'physical' && !pierce), executable: e.hp > 0 && executable(e) });
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
      if (sk.interrupts && target.intent && (target.intent.kind === 'call' || target.intent.interruptible) && !target.interrupted) {
        target.interrupted = true;
        ev.push({ t: 'interrupt', who: target.uid });
      }
      damageEnemy(b, target, p + h.stats.str + h.stats.weapon + h.warpaint, 'physical', ev, !!sk.pierce);
      addFury(b, FURY.perHit, ev);
      if (sk.stunChance && !target.dead && !target.stunned && !target.stunImmune && !ENEMIES[target.id].boss && env.rand() < sk.stunChance) {
        target.stunned = true;
        ev.push({ t: 'stun', who: target.uid });
      }
      break;
    }
    case 'fire': {
      damageEnemy(b, target, p + h.stats.int, 'fire', ev);
      addFury(b, FURY.perHit, ev);
      if (!target.dead) {
        target.burn = { dmg: sk.burn, turns: sk.burnTurns + (h.emberHeart ? 1 : 0) };
        // Scared once, then it steels itself: no second scare for 2 of its turns.
        if (ENEMIES[target.id].fireFear && !target.fearImmune && !target.feared) {
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
      if (target.stunImmune) { ev.push({ t: 'resist', who: target.uid }); break; }
      target.stunned = true;
      ev.push({ t: 'stun', who: target.uid });
      break;
    }
    case 'sweep': {
      for (const e of living(b)) damageEnemy(b, e, p + Math.floor(h.stats.str / 2) + Math.floor(h.stats.weapon / 2) + h.warpaint, 'physical', ev);
      addFury(b, FURY.perHit, ev);
      break;
    }
    case 'heal': {
      const amt = p + h.stats.vit;
      h.hp = Math.min(h.maxHp, h.hp + amt);
      h.bleed = null;
      ev.push({ t: 'heal', who: 'hero', amt, hpAfter: h.hp });
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
  if (dmg > 0) addFury(b, FURY.perHurt, ev);
}

// Ends the player's turn; enemies act; a new player turn starts. Returns events.
export function endTurn(b) {
  currentBattle = b;
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
      e.stunImmune = 2; // shrugs off the next stun
      if (it && it.kind === 'windup') e.step = 0;
    } else if (e.interrupted) {
      ev.push({ t: 'skip', who: e.uid, why: 'interrupted' });
      if (it && it.kind === 'windup') e.step = 0;
    } else if (e.feared && it.kind === 'attack') {
      ev.push({ t: 'skip', who: e.uid, why: 'scared' });
      e.feared = false;
      e.fearImmune = 3;
      if (it.key === 'bite') e.snarl = false;
    } else {
      ev.push({ t: 'act', who: e.uid, key: it.key });
      switch (it.kind) {
        case 'attack':
          hurtHero(b, it.dmg, it.pierce, ev, e.uid);
          if (it.key === 'bite') e.snarl = false;
          break;
        case 'block': {
          const amt = Math.round(it.amt * (e.vet ? VET : 1) * TUNING.enemyDmg * (e.power || 1));
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
          const w = makeEnemy('wolf', b.power);
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
    if (e.fearImmune) e.fearImmune--;
    if (e.stunImmune) e.stunImmune--;
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
  const has = (id) => b.loadout.includes(id) && canUse(b, id);
  while (!b.over && b.turn <= maxTurns) {
    let guard = 0;
    while (!b.over && b.hero.ap > 0 && guard++ < 12) {
      const alive = living(b);
      const fin = alive.find((e) => canFinish(b, e.uid));
      if (fin) { useFinisher(b, fin.uid); continue; }
      const big = alive.find((e) => e.intent && e.intent.kind === 'attack' && e.intent.dmg >= 14 && !e.stunned);
      const stopper = alive.find((e) => e.intent && (e.intent.kind === 'call' || e.intent.interruptible) && !e.interrupted && !e.stunned);
      const incoming = alive.reduce((t, e) => t + (e.intent && e.intent.kind === 'attack' && !e.stunned && !e.feared ? e.intent.dmg : 0), 0);
      const leader = alive.find((e) => ENEMIES[e.id].leader);
      const weakest = alive.reduce((a, e) => (e.hp < a.hp ? e : a), alive[0]);
      const focus = leader && alive.length > 1 ? leader : weakest;
      const h = b.hero;
      if (stopper && has('hurl')) { useSkill(b, 'hurl', stopper.uid); continue; }
      if (big && has('roar')) { useSkill(b, 'roar', big.uid); continue; }
      if ((h.bleed || h.hp < h.maxHp * 0.45) && has('secondwind')) { useSkill(b, 'secondwind'); continue; }
      if (alive.length >= 2 && has('sweep')) { useSkill(b, 'sweep'); continue; }
      if (has('firebrand') && alive.some((e) => !e.burn)) {
        const t = alive.find((e) => !e.burn && ENEMIES[e.id].fireFear) || alive.find((e) => !e.burn);
        useSkill(b, 'firebrand', t.uid); continue;
      }
      if (incoming >= 10 && h.block < incoming && has('guard') && h.hp < h.maxHp * 0.6) { useSkill(b, 'guard'); continue; }
      if (ENEMIES[focus.id].armor && has('jab')) { useSkill(b, 'jab', focus.uid); continue; }
      if (has('club')) { useSkill(b, 'club', focus.uid); continue; }
      if (has('jab')) { useSkill(b, 'jab', focus.uid); continue; }
      break;
    }
    endTurn(b);
  }
  return b.over || 'timeout';
}
