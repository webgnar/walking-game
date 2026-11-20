// The game app: screens, actions and the combat controller. Renders HTML over the Three.js stage.
import { Stage, STRIKE_MS } from './scene/stage.js';
import { env, load, save, wipeSave, newState, toast, pick, SAVE_KEY, dayKey } from './logic/state.js';
import {
  SKILLS, SKILL_ORDER, ENEMIES, TRIALS, ATTRS, GEAR, SLOTS, SLOT_NAMES, BOOSTERS, RECIPES, BUILDINGS, BUILDING_ORDER,
  INVENTORY_SLOTS, MATERIALS, BOONS, xpToNext, setTuning, TUNING_PRESETS,
} from './data/era1.js';
import { INTRO_LINES, INTRO_CUTSCENE, PROCTOR, FRAGMENTS, FLASHBACKS, FORMER_TRIBUTE, ACHIEVEMENTS, TRANSMISSIONS, FLICKERS, PROCTOR_SLIP } from './data/story.js';
import * as ST from './logic/story.js';
import { IC, WREATH, DISH } from './ui/icons.js';
import * as H from './logic/hero.js';
import * as E from './logic/economy.js';
import * as B from './logic/base.js';
import * as C from './logic/combat.js';
import * as T from './logic/trials.js';

// ---------- App state ----------
let s;
let stage;
const app = {
  screen: 'home', heroTab: 'stats', modal: null, proctor: null, battle: null, target: null, busy: false,
  craft: [null, null, null], selectedTrial: null, lastReward: null, boonChoices: null,
};
const $ = (sel) => document.querySelector(sel);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n) => Math.floor(n).toLocaleString('en-US');
const ICON = { weapon: '🏏', armor: '🦺', helm: '⛑️', offhand: '🛡️', trinket: '📿', flint: '🪨', bone: '🦴', stride_brew: '🧪', lucky_knot: '🪢', warpaint: '🎨' };
const TIER_ICON = { bronze: '📦', silver: '🎁', gold: '💰', platinum: '💎', legendary: '🔥', celestial: '🌌' };
const gearIcon = (key) => ICON[GEAR[key].slot];
const statText = (st) => Object.entries(st).map(([k, v]) => (k === 'dmg' ? `+${v} damage` : k === 'hp' ? `+${v} health` : `+${v} ${ATTRS[k].short}`)).join(', ');

export function start() {
  s = load();
  setTuning(s.tuning || 'tuned');
  stage = new Stage($('#stage'));
  // app opens (for achievements and the rest-day bonus)
  const today = dayKey();
  if (s.opens.day !== today) {
    if (s.opens.lastDay) {
      const gap = (new Date(today) - new Date(s.opens.lastDay)) / 864e5;
      if (gap >= 2) s.restDayReturn = true;
    }
    s.opens = { day: today, count: 0, lastDay: today };
  }
  s.opens.count++;
  E.ensureGoals(s);
  B.tickBase(s);
  syncLook();
  applyUiStyle();
  stage.setBase(tiers());
  for (const t of TRANSMISSIONS) if (s.trials.cleared[t.trial]) ST.startTransmission(s, t.id);
  if (!s.intro) go('intro');
  else if (s.tutorial === 'fight') startBattle(0);
  else { go('home'); say(pick(PROCTOR.home)); }
  stage.snapCamera();
  document.addEventListener('click', onClick);
  // fullscreen: browsers only allow it from a tap, so ask on the first one
  // Auto-fullscreen on the first tap only on touch phones; desktop uses the Settings button.
  if (isPhone()) document.addEventListener('pointerdown', () => { if (!s.noFullscreen) enterFullscreen(); }, { once: true });
  // belt and braces: save when the app is backgrounded or closed (blocked after a reset)
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(s); });
  window.addEventListener('pagehide', () => save(s));
  bindHold();
  setInterval(tick, 1000);
  requestAnimationFrame(follow);
  commit();
}

function tiers() {
  return Object.fromEntries(BUILDING_ORDER.map((b) => [b, s.base[b].tier]));
}
function syncLook() {
  const looks = {};
  for (const g of H.equippedGear(s)) looks[g.slot] = g.look;
  stage.setHeroLook(looks);
}

// Save, check achievements, re-render.
function commit() {
  B.checkAchievements(s);
  save(s);
  render();
}

function go(screen, opts = {}) {
  app.screen = screen;
  Object.assign(app, opts);
  const modeFor = { intro: 'intro', home: 'home', hero: 'hero', base: 'base', craft: 'base', truth: 'base', map: 'map', combat: 'combat', shop: 'home', reward: 'combat' };
  stage.setMode(modeFor[screen] || 'home');
  if (screen === 'combat' && app.battle) stage.setEnemies(app.battle.enemies.filter((e) => !e.dead));
  render();
}

function say(text, opts = {}) {
  const p = { text, glitch: !!opts.glitch, wide: !!opts.wide, then: opts.then || null, who: opts.who || null };
  app.proctor = p;
  renderProctor();
  // PROCTOR gets out of the way on its own unless the line matters
  if (!opts.sticky) setTimeout(() => { if (app.proctor === p) { app.proctor = null; renderProctor(); } }, opts.auto || (app.screen === 'combat' ? 5000 : 8000));
}

function tick() {
  if (B.tickBase(s)) { stage.setBase(tiers()); commit(); return; }
  // update countdowns in place; a full re-render would eat taps
  document.querySelectorAll('[data-timer]').forEach((el) => {
    const job = s.base[el.dataset.timer].job;
    if (job) el.textContent = timeLeft(job);
  });
  renderToasts();
}

// ---------- Rendering ----------
function render() {
  const fn = SCREENS[app.screen] || SCREENS.home;
  $('#ui').innerHTML = fn();
  renderModal();
  renderProctor();
  renderToasts();
  follow(true);
}

function curPlate() {
  return `<div class="cur">
      <span class="c soles" title="Soles">${IC.sole}${fmt(s.soles)}</span><i>/</i>
      <span class="c" title="Flint">${IC.flint}${s.mats.flint}</span><i>/</i>
      <span class="c" title="Bone">${IC.bone}${s.mats.bone}</span>
    </div>`;
}

function topbar(title, sub, back = 'home', backLabel = '') {
  return `<div class="topbar">
    ${back && backLabel ? `<button class="btn small" data-a="go" data-v="${back}">${IC.back}${backLabel}</button>` : back ? `<button class="iconbtn" data-a="go" data-v="${back}" aria-label="Back">${IC.back}</button>` : `<button class="iconbtn" data-a="settings" aria-label="Settings">${IC.gear}</button>`}
    <div class="ttl"><div class="title">${esc(title)}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div>
    <div class="spacer"></div>
    ${curPlate()}
  </div>`;
}

function applyUiStyle() {
  const retro = s.uiStyle === 'retro';
  document.body.classList.toggle('retro', retro);
}

const BUILD = typeof __BUILD__ !== 'undefined' ? __BUILD__ : 'dev';
const cycle = () => String(4327 + Math.max(0, Math.floor((env.now() - (s.created || env.now())) / 86400000))).padStart(6, '0').replace(/^(\d{3})/, '$1,');

// Home header: era banner (opens Settings), era title, build tag and the subject dossier.
function homeHeader() {
  const era = s.era === 1 ? 'Primal' : 'Brick';
  return `<div class="homehead">
    <button class="banner" data-a="settings" aria-label="Settings">${WREATH}</button>
    <div class="dossier">
      <div class="era" aria-label="${era}">${esc(era.toUpperCase().replace(/A/g, 'Λ'))}</div>
      <div class="ver">Simulation ${esc(BUILD.split(' ')[0])}</div>
      <div class="subj">Subject 7,301,224</div>
      <div class="lvl">Level ${s.hero.level}</div>
      <dl><dt>Class</dt><dd>${esc(era)}</dd><dt>State</dt><dd class="ok">Active</dd><dt>Rank</dt><dd>Unassigned</dd></dl>
      <div class="barcode"></div>
    </div>
  </div>
  <div class="topbar home">${curPlate()}</div>`;
}

// SIMULATION LOG: the step meter plus the current transmission, as one terminal line.
function simLog() {
  const today = E.todaySteps(s);
  const toBox = E.STEPS_PER_BOX - s.steps.towardBox;
  const stride = s.active.strideUntil > env.now();
  const a = ST.activeTransmission(s);
  const line = a
    ? `Signal ${Math.floor(a.frac * 100)}% · ${esc(FORMER_TRIBUTE)} · walk ${fmt(a.left)} steps to clear it`
    : `Awaiting movement · ${fmt(toBox)} steps to the next loot box${stride ? ' · Stride Brew active' : ''}`;
  return `<div class="simlog">
    <div class="slh"><span>&gt; Simulation log // Cycle ${cycle()}</span><span class="r">Today <b>${fmt(today)}</b> steps · next loot box in <b>${fmt(toBox)}</b></span></div>
    <button class="slline ${a ? 'sig' : ''}" ${a ? 'data-a="modal" data-v="transmission"' : 'disabled'}>&gt; ${line} <span class="cur">▍</span></button>
    <div class="slbar"><i style="width:${(s.steps.towardBox / 10).toFixed(1)}%"></i></div>
  </div>`;
}

function obsFeed() {
  return `<div class="obsfeed"><div class="cam">${DISH}</div><div class="ol"><div class="oh"><i></i>Observation feed A.03</div>
    <div>Subject: 7,301,224</div><div>Biometrics: stable</div><div>Env: simulation</div><div>Integrity: 99.4%</div></div></div>`;
}

function hint(key) {
  // pulsing guidance during the first session
  const t = s.tutorial;
  return (t === 'boxes' && key === 'boxes') || (t === 'base' && key === 'base') || (t === 'level' && key === 'hero') || (t === 'trials' && key === 'trials') || (key === 'report' && s.report) ? 'pulse' : '';
}

const SCREENS = {
  intro() {
    if (app.introPhase === 'cut') return cutShot(INTRO_CUTSCENE[app.cutI], app.cutI, INTRO_CUTSCENE.length);
    return `<div class="intro premise" data-a="introTap"><div class="scanlines"></div>${INTRO_LINES.map((l, i) => `<div class="line" id="il${i}"></div>`).join('')}<div class="skip">tap to continue</div></div>`;
  },

  home() {
    const goals = E.ensureGoals(s);
    const goalsReady = goals.list.filter((g) => !g.claimed && E.goalDone(g)).length + (!goals.bonusClaimed && goals.list.every((g) => g.claimed) ? 1 : 0) + (E.weeklyDays(s) >= E.WEEKLY.daysNeeded && !E.updateWeekly(s).claimed ? 1 : 0);
    const jobs = BUILDING_ORDER.filter((b) => s.base[b].job).length;
    const sp = s.hero.freeAttr + s.hero.freeSkill;
    return `${homeHeader()}
    ${simLog()}
    <div class="homecenter">
      ${s.report ? `<button class="btn small ${hint('report')}" data-a="modal" data-v="report">Expedition report · ${fmt(s.report.steps)} steps</button>` : ''}
    </div>
    <div class="home-left">
      <button class="btn plate cream ${hint('base')}" data-a="go" data-v="base">${IC.base}<span>Base</span>${jobs ? `<span class="badge">${jobs}</span>` : ''}</button>
      <button class="btn plate" data-a="go" data-v="shop">${IC.shop}<span>Shop</span></button>
      <button class="btn plate" data-a="modal" data-v="goals">${IC.goals}<span>Goals</span>${goalsReady ? `<span class="badge">${goalsReady}</span>` : ''}</button>
    </div>
    <div class="home-right">
      <button class="btn plate crimson big ${hint('trials')}" data-a="go" data-v="map">${IC.trials}<span>Trials</span></button>
      <button class="btn plate ${hint('boxes')}" data-a="modal" data-v="boxes">${IC.boxes}<span>Boxes</span>${s.boxes.length ? `<span class="badge">${s.boxes.length}</span>` : ''}</button>
      ${s.boxes.length > 1 ? '<button class="btn small openall" data-a="openAll">Open all</button>' : ''}
    </div>
    <div class="herotap" data-a="hero" data-v="${sp ? 'stats' : 'gear'}" aria-label="Open hero">
      ${sp || hint('hero') ? `<div class="herotag ${hint('hero') || 'pulse'}">${sp ? `${sp} point${sp > 1 ? 's' : ''} to spend` : 'Tap your hero'}</div>` : ''}
    </div>
    ${isIOS() && !isStandalone() && !s.installTipSeen ? `<div class="installtip panel pad" data-a="installTip"><b>Play fullscreen:</b> tap the Share button (square with an arrow), then <b>Add to Home Screen</b>, and open The Ascent from its icon. <span class="muted">(tap to hide)</span></div>` : ''}
    ${obsFeed()}
    <div class="home-bottom">
      <button class="iconbtn" data-a="modal" data-v="achievements" title="Achievements">${IC.trophy}</button>
      <button class="btn plate crimson stepbtn" data-hold="steps"><span>+100 steps</span><small>Hold to keep walking <span class="debugtag">Test</span></small></button>
    </div>`;
  },

  hero() {
    const tabs = ['stats', 'skills', 'gear'];
    let body = '';
    if (app.heroTab === 'stats') body = heroStatsTab();
    if (app.heroTab === 'skills') body = heroSkillsTab();
    if (app.heroTab === 'gear') body = heroGearTab();
    return `${topbar('Hero', `Level ${s.hero.level} · ${s.era === 1 ? 'Primal' : 'Brick'}`)}
    <div class="screen"><div class="col hero-right panel halftone pad">
      <div class="tabs">${tabs.map((t) => `<button class="tab ${app.heroTab === t ? 'on' : ''}" data-a="heroTab" data-v="${t}">${t === 'stats' ? 'Stats' : t === 'skills' ? `Skills${s.hero.freeSkill ? ` (${s.hero.freeSkill})` : ''}` : 'Gear & inventory'}</button>`).join('')}</div>
      <div class="scroll grow">${body}</div>
    </div></div>`;
  },

  base() {
    const evolveReady = B.canEvolve(s);
    return `${topbar('Base', 'Cave and firepit · tap a building')}
    ${BUILDING_ORDER.map((b) => {
      const st = s.base[b];
      return `<div class="bldg" data-anchor="${b}" data-a="building" data-v="${b}">
        <div class="bn">${BUILDINGS[b].icon} ${BUILDINGS[b].short}</div>
        <div class="tiers">${[1, 2, 3].map((t) => `<i class="${st.tier >= t ? 'on' : ''}"></i>`).join('')}</div>
        ${st.job ? `<div class="timer">⏳ <span data-timer="${b}">${timeLeft(st.job)}</span></div>` : st.tier === 0 ? `<div class="timer">${s.firstBuildFree ? 'Build free!' : 'Not built'}</div>` : ''}
      </div>`;
    }).join('')}
    <div style="position:absolute;right:calc(var(--sr) + 12px);bottom:calc(var(--sb) + 10px)" class="row">
      <button class="btn small ${evolveReady ? 'yellow pulse' : 'ghost'}" data-a="modal" data-v="evolve">🧬 Evolve</button>
      <button class="btn small ghost" data-a="go" data-v="truth">📌 Truth Board</button>
      <button class="btn small ghost" data-a="go" data-v="craft">⚒ Craft</button>
    </div>`;
  },

  shop() {
    return `${topbar('Shop', 'Basic gear and materials for Soles')}
    <div class="screen"><div class="col grow panel halftone pad">
      <div class="scroll grow"><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
      ${E.SHOP_ITEMS.map((it, i) => {
        const g = it.kind === 'gear' ? GEAR[it.key] : null;
        const owned = g ? s.inv.filter((x) => x.key === it.key).length : 0;
        return `<div class="panel pad" style="background:var(--panel2)">
          <div class="row"><span style="font-size:28px">${g ? gearIcon(it.key) : ICON[it.key]}</span><div class="grow"><div class="comic" style="font-size:18px">${g ? g.name : `${it.n} ${MATERIALS[it.key].name}`}</div>
          <div class="small muted">${g ? `${SLOT_NAMES[g.slot]} · ${statText(g.stats)}` : 'Crafting and building material'}${owned ? ` · owned ${owned}` : ''}</div></div></div>
          <button class="btn small ${s.soles >= it.price ? 'yellow' : 'off'}" style="width:100%;margin-top:6px" data-a="buy" data-v="${i}">👣 ${it.price}</button>
        </div>`;
      }).join('')}
      </div></div>
      <div class="small muted">Soles only come from walking. Boss gear and crafted gear are stronger than anything sold here.</div>
    </div></div>`;
  },

  map() {
    // three rows of five, snaking like the sketch
    const pos = (n) => {
      const row = Math.floor((n - 1) / 5), i = (n - 1) % 5;
      const col = row === 1 ? 4 - i : i;
      return { x: 10 + col * 20, y: 14 + row * 30 };
    };
    const nodes = TRIALS.filter((t) => t.n > 0);
    const pts = nodes.map((t) => pos(t.n));
    const nt = T.nextTrial(s);
    return `<div style="position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,rgba(13,11,20,.55),rgba(13,11,20,.85))"></div>
    ${topbar('Trials · Primal', `${Object.keys(s.trials.cleared).filter((k) => k > 0).length}/15 cleared${s.eraKey ? ' · Era Key ✔' : ''}`, 'home', '🏠 Home')}
    <div class="map">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${pts.map((p) => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="#c9a24c" stroke-width="0.35" stroke-dasharray="1.2 1.2" opacity=".6"/></svg>
      ${nodes.map((t) => {
        const p = pos(t.n);
        const done = !!s.trials.cleared[t.n];
        const open = T.trialUnlocked(s, t.n);
        const cls = [t.boss === 'mini' ? 'mini' : t.boss === 'era' ? 'era' : '', done ? 'done' : open ? 'open' : 'lock'].join(' ');
        return `<div class="node ${cls}" style="left:${p.x}%;top:${p.y}%" data-a="trial" data-v="${t.n}">${t.boss === 'era' ? '🦣' : t.boss === 'mini' ? '💀' : t.n}<span class="lbl">${t.boss ? esc(t.name) : `Lv ${t.level}`}</span></div>`;
      }).join('')}
    </div>
    ${app.selectedTrial != null ? trialCard(app.selectedTrial) : nt ? '' : ''}`;
  },

  combat() {
    const b = app.battle;
    if (!b) return '';
    const h = b.hero;
    const sh = app.shown || {};
    const hp = (who, real) => (sh[who] ? sh[who].hp : real);
    const bl = (who, real) => (sh[who] ? sh[who].block : real);
    const t = TRIALS.find((x) => x.n === b.trial);
    const alive = C.living(b);
    if (!alive.find((e) => e.uid === app.target)) app.target = alive[0] && alive[0].uid;
    return `<div class="combat-top"><div class="comic">${t.n === 0 ? 'First Trial' : `Trial ${t.n}: ${esc(t.name)}`}</div><div class="small muted">Turn ${b.turn}${s.trials.cleared[t.n] && t.n ? ' · replay' : ''}</div></div>
    <div class="combat-hero panel pad">
      <div class="row"><span class="comic" style="font-size:18px">You</span><span class="grow"></span><span class="small muted">Lv ${s.hero.level}</span></div>
      <div class="hp hero"><i style="width:${(hp('hero', h.hp) / h.maxHp) * 100}%"></i><span class="tx">${hp('hero', h.hp)}/${h.maxHp}</span>${bl('hero', h.block) ? `<span class="bl">🛡${bl('hero', h.block)}</span>` : ''}</div>
      ${h.bleed ? `<div class="status bad">🩸 Bleeding ${h.bleed.dmg} × ${h.bleed.turns}</div>` : ''}
      ${h.warpaint ? '<div class="status warn">🎨 Warpaint +3 damage</div>' : ''}
    </div>
    <button class="iconbtn" style="position:absolute;top:calc(var(--st) + 6px);left:calc(var(--sl) + 8px);display:none"></button>
    <button class="btn tiny ghost" style="position:absolute;top:calc(var(--st) + 6px);right:calc(var(--sr) + 8px)" data-a="retreat">🏳 Retreat</button>
    ${b.enemies.filter((e) => !e.dead || (sh[e.uid] && sh[e.uid].hp > 0)).map((e) => {
      const il = C.intentLabel(e);
      return `<div class="hpbox ${e.uid === app.target && alive.length > 1 ? 'target' : ''}" data-anchor="${e.uid}" data-a="target" data-v="${e.uid}">
        <div class="intent ${il.cls}">${il.icon} ${esc(il.text)}${il.note ? `<span class="note">${esc(il.note)}</span>` : ''}</div>
        <div class="nm">${esc(e.name)}</div>
        <div class="hp"><i style="width:${(hp(e.uid, e.hp) / e.maxHp) * 100}%"></i><span class="tx">${hp(e.uid, e.hp)}/${e.maxHp}</span>${bl(e.uid, e.block) ? `<span class="bl">🛡${bl(e.uid, e.block)}</span>` : ''}</div>
        <div class="status">${e.burn ? `🔥${e.burn.dmg}×${e.burn.turns} ` : ''}${e.feared ? '😨 ' : ''}${e.snarl ? '⬆ ' : ''}${e.stompBonus ? `+${e.stompBonus} stomp` : ''}</div>
      </div>`;
    }).join('')}
    <div class="skillbar">
      <div class="apbox"><div class="comic" style="font-size:14px">AP</div><div class="apdots">${Array.from({ length: Math.max(3, h.ap) }, (_, i) => `<i class="${i < h.ap ? 'on' : ''}"></i>`).join('')}</div></div>
      ${b.loadout.map((id) => {
        const sk = SKILLS[id];
        const cd = h.cooldowns[id] || 0;
        return `<div class="sk ${C.canUse(b, id) && !app.busy ? '' : 'no'}" data-a="skill" data-v="${id}">
          <span class="ap">${sk.ap}</span><span class="si">${sk.icon}</span><span class="sn">${sk.name}</span>
          <span class="sp">${skillShort(id, b)}</span>${cd ? `<span class="cd">${cd}</span>` : ''}</div>`;
      }).join('')}
    </div>
    <button class="btn small ghost endturn ${app.busy || b.over ? 'off' : ''}" data-a="endTurn" title="End your turn early. Up to ${h.stats.apCarry} unspent AP carries over to next turn.">Save AP ▶<small style="display:block;font-size:10px;font-family:Rajdhani;text-transform:none;letter-spacing:0">end turn early</small></button>`;
  },

  reward() {
    const r = app.lastReward;
    if (!r) return '';
    const t = TRIALS.find((x) => x.n === r.n);
    if (r.result !== 'win') {
      return `<div class="overlay"><div class="dialog panel halftone" style="text-align:center">
        <div class="tierlabel" style="color:var(--red);font-size:44px">DEFEAT</div>
        <p>${esc(r.line)}</p>
        <p class="small muted">No penalty. Get stronger: walk for Soles, train at the altar, upgrade gear, or try a different skill order.</p>
        <div class="actions" style="justify-content:center"><button class="btn" data-a="go" data-v="home">Home</button><button class="btn cyan" data-a="go" data-v="map">Back to the map</button>
        <button class="btn pink" data-a="fight" data-v="${r.n}">Try again</button></div>
      </div></div>`;
    }
    const cards = [];
    if (r.starter) {
      cards.push(card('👣', `${r.starter.soles} Soles`, 'Starter grant'));
      cards.push(card('📦', `${r.starter.boxes} Bronze loot boxes`, 'Starter grant'));
    }
    if (r.xp) cards.push(card('⭐', `${r.xp} XP`, r.first ? 'First win' : ''));
    if (r.box) cards.push(card(TIER_ICON[r.box], `${E.TIER_NAMES[r.box]} loot box`, 'Added to your boxes'));
    if (r.mats.flint) cards.push(card('🪨', `${r.mats.flint} Flint`));
    if (r.mats.bone) cards.push(card('🦴', `${r.mats.bone} Bone`));
    for (const g of r.gear) cards.push(card(gearIcon(g), GEAR[g].name, statText(GEAR[g].stats), GEAR[g].tier === 'boss' ? 'boss' : ''));
    if (r.respec) cards.push(card('🔄', 'Respec token', 'Reset your points once'));
    if (r.blueprint) cards.push(card('📐', 'Blueprint', B.recipeName(RECIPES.find((x) => x.id === r.blueprint)), 'rare'));
    if (r.fragment) cards.push(card('📄', 'Story fragment', 'Pinned to the Truth Board', 'frag'));
    if (r.eraKey) cards.push(card('🗝️', 'ERA KEY', 'Primal → Brick', 'boss'));
    return `<div class="overlay"><div class="dialog panel halftone wide" style="text-align:center">
      <div class="tierlabel" style="color:var(--yellow);font-size:44px">${r.first ? 'VICTORY!' : 'REPLAY CLEARED'}</div>
      <div class="muted">${t.n === 0 ? 'First Trial' : `Trial ${t.n}: ${esc(t.name)}`}${r.flawless ? ' · <span class="ok">no damage taken</span>' : ''}</div>
      <div class="sep"></div>
      <div class="loot">${cards.join('') || '<span class="muted">Nothing this time. Replays drop materials and the odd piece of worn gear.</span>'}</div>
      <div class="actions" style="justify-content:center">
        ${r.box ? `<button class="btn yellow" data-a="openLatest">Open the loot box</button>` : ''}
        ${r.n === 0 ? `<button class="btn cyan pulse" data-a="afterTutorial">Continue</button>` : `<button class="btn" data-a="go" data-v="home">Home</button><button class="btn cyan" data-a="go" data-v="map">Back to the map</button>`}
      </div>
    </div></div>`;
  },

  craft() {
    const slots = B.craftSlots(s);
    const keys = app.craft.slice(0, slots);
    const rec = B.findRecipe(keys);
    const studio = s.base.studio.tier;
    const items = B.craftables(s);
    const known = RECIPES.filter((r) => s.recipes.includes(r.id));
    let preview = '❔';
    let note = studio < 1 ? '<span class="bad">Build the Workshop first.</span>' : 'Put items in the slots. Matching a recipe you don\'t know teaches it.';
    if (rec && keys.filter(Boolean).length >= 2) {
      const knownR = s.recipes.includes(rec.id);
      preview = rec.out.gear ? gearIcon(rec.out.gear) : ICON[rec.out.booster];
      if (rec.blueprint && !knownR) note = '<span class="warn">Something is here, but you need its blueprint.</span>';
      else if (rec.studio > studio) note = `<span class="warn">Needs Workshop tier ${rec.studio}.</span>`;
      else note = `${knownR ? '' : '<b class="ok">New recipe! </b>'}${esc(B.recipeName(rec))}: needs ${Object.entries(rec.inputs).map(([k, n]) => `${n} ${itemName(k)}`).join(' + ')}${B.hasInputs(s, rec) ? '' : ' <span class="bad">(not enough)</span>'}`;
    }
    return `${topbar('Workshop', `Tier ${studio} · ${slots}-item crafts`, 'base')}
    <div class="screen">
      <div class="col grow panel halftone pad">
        <div class="row" style="justify-content:center;gap:10px;margin:4px 0 8px">
          ${keys.map((k, i) => `${i ? '<span class="comic" style="font-size:28px">+</span>' : ''}<div class="cell" style="width:76px" data-a="craftClear" data-v="${i}">${k ? `<span class="gi">${itemIcon(k)}</span>${esc(itemName(k))}` : '<span class="muted">empty</span>'}</div>`).join('')}
          <span class="comic" style="font-size:28px">=</span>
          <div class="cell" style="width:76px;background:#13321f"><span class="gi">${preview}</span></div>
          <button class="btn yellow" data-a="craftGo">Craft</button>
        </div>
        <div class="small" style="min-height:2.4em">${note}</div>
        <div class="sep"></div>
        <h3 class="h">Your items</h3>
        <div class="scroll grow"><div class="grid">${items.map((c) => `<div class="cell" data-a="craftAdd" data-v="${c.key}"><span class="gi">${itemIcon(c.key)}</span>${esc(itemName(c.key))}<span class="n">${c.n}</span></div>`).join('') || '<span class="muted small">Nothing to craft with. Walk for materials.</span>'}</div></div>
      </div>
      <div class="col panel pad" style="width:min(300px,36vw)">
        <h3 class="h">Known recipes</h3>
        <div class="scroll grow">${known.map((r) => `<div class="skill" data-a="craftFill" data-v="${r.id}" style="cursor:pointer">
          <div class="si">${r.out.gear ? gearIcon(r.out.gear) : ICON[r.out.booster]}</div>
          <div class="grow"><div class="sname">${esc(B.recipeName(r))}${r.studio > studio ? ` <span class="small warn">tier ${r.studio}</span>` : ''}</div>
          <div class="small muted">${Object.entries(r.inputs).map(([k, n]) => `${n} ${itemName(k)}`).join(' + ')}</div>
          <div class="small">${r.out.gear ? statText(GEAR[r.out.gear].stats) : BOOSTERS[r.out.booster].desc}</div></div></div>`).join('')}
          <div class="small muted">Recipes are learned from blueprints, or by trying combinations.</div></div>
      </div>
    </div>`;
  },

  truth() {
    const tier = s.base.truth.tier;
    const era = 1;
    const list = B.eraFragments(era);
    const done = list.filter((f) => s.fragments.decoded.includes(f.id)).length;
    const fb = FLASHBACKS[era];
    const ready = B.flashbackReady(s, era);
    return `${topbar('Truth Board', `Tier ${tier} · ${s.fragments.decoded.length}/${FRAGMENTS.length} decoded`, 'base')}
    <div class="screen"><div class="col grow panel pad truthboard">
      <div class="memory ${ready ? 'ready' : ''}">
        <div class="grow"><div class="mk">Flashback · Primal era</div><div class="mt">${esc(fb.title)}</div>
          ${ready ? '<div class="small">Every piece decoded. The memory is whole.</div>' : `<div class="small">Decode all ${list.length} pieces of this era to recover the memory.</div><div class="mbar"><i style="width:${(done / list.length) * 100}%"></i></div>`}</div>
        <button class="btn small ${ready ? 'yellow' : 'off'}" data-a="flashback" data-v="${era}">${ready ? (s.flashbacksSeen.includes(era) ? '▶ Watch again' : '▶ Play memory') : `🔒 ${done}/${list.length}`}</button>
      </div>
      ${s.transmissions.cleared.length || s.transmissions.active ? `<button class="btn tiny ghost" style="align-self:flex-start" data-a="modal" data-v="transmission">📡 Transmissions (${s.transmissions.cleared.length} cleared${s.transmissions.active ? ', 1 incoming' : ''})</button>` : ''}
      <div class="scroll grow story">
      ${list.map((f, i) => {
        const st = B.fragmentState(s, f);
        const from = f.from ? `<span class="from">${esc(f.from)}</span>` : '';
        const head = `<div class="ch">Part ${i + 1}</div>`;
        if (st === 'missing') return `<div class="entry missing">${head}<div class="et">Not found yet</div><div class="small">Walk and open loot boxes. Pieces turn up after the Alpha Wolf.</div></div>`;
        if (st === 'decoded') return `<div class="entry ${f.from ? 'msg' : ''}" data-a="readFrag" data-v="${f.id}">${head}<div class="ek">${esc(f.kind)}${from}</div><div class="et">${esc(f.title)}</div><p>${esc(f.text)}</p></div>`;
        return `<div class="entry redacted">${head}<div class="ek">${esc(f.kind)}${from}</div><div class="et">${esc(f.title)}</div>
          <p class="fx">${esc(f.text.slice(0, 90))}</p>
          ${st === 'decodable' ? `<button class="btn tiny yellow" data-a="decode" data-v="${f.id}">Decode · 👣${f.cost}</button>` : `<div class="small" style="color:#8a2a20">Needs Truth Board tier ${f.level}</div>`}
        </div>`;
      }).join('')}
      </div>
    </div></div>`;
  },

  era2() {
    return `${topbar('Brick', 'Era 2')}
    <div class="screen" style="align-items:center;justify-content:center"><div class="panel halftone pad" style="max-width:560px;text-align:center">
      <div class="tierlabel" style="color:var(--yellow)">ERA 2: BRICK</div>
      <p>The cave becomes a mud-brick village. Clay and grain. A tamed companion. The Beast King.</p>
      <p class="muted">This era is still being designed. Your Primal progress, Boon and gear are saved, and the Primal Trials stay open for replays.</p>
      <button class="btn cyan" data-a="go" data-v="home">Home</button></div></div>`;
  },
};

// One shot of the opening cutscene. Real art when shot.art is set; otherwise a
// black-and-white manga placeholder that shows the art brief.
function cutShot(sh, i, n, tapA = 'introTap', skipA = 'introSkip') {
  const dots = `<div class="cutdots">${Array.from({ length: n }, (_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>`;
  const skip = `<button class="btn tiny ghost cutskip" data-a="${skipA}">Skip</button>`;
  if (sh.style === 'title') {
    return `<div class="cut title" data-a="${tapA}"><div class="speed"></div><div class="tt"><small>${esc(sh.title)}</small>${esc(sh.text)}</div>${dots}</div>`;
  }
  const pic = sh.art
    ? `<img class="cutart" src="${esc(sh.art)}" alt="">`
    : `<div class="cutph"><div class="speed"></div>${sh.icon ? `<div class="cutico ${sh.glow ? 'glow' : ''}">${sh.icon}</div>` : ''}<div class="brief">ART: ${esc(sh.brief)}</div></div>`;
  return `<div class="cut ${sh.style === 'flash' ? 'flash' : ''}" data-a="${tapA}" key="${i}">
    <div class="cutpanel">${pic}
      ${sh.caption ? `<div class="cap">${esc(sh.caption)}</div>` : ''}
      ${sh.sfx ? `<div class="sfx">${esc(sh.sfx)}</div>` : ''}
      ${sh.thought ? `<div class="thought">${esc(sh.thought)}</div>` : ''}
      ${sh.voice ? `<div class="voice"><b>${esc(sh.voice.who)}</b>${esc(sh.voice.text)}</div>` : ''}
    </div>${dots}${skip}</div>`;
}

function card(icon, title, sub = '', cls = '') {
  return `<div class="lootcard ${cls}"><div class="li">${icon}</div>${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
}
function itemName(k) {
  return MATERIALS[k] ? MATERIALS[k].name : GEAR[k] ? GEAR[k].name : BOOSTERS[k] ? BOOSTERS[k].name : k;
}
function itemIcon(k) {
  return ICON[k] || (GEAR[k] ? gearIcon(k) : '?');
}
function skillShort(id, b) {
  const sk = SKILLS[id];
  const p = b.powers[id];
  const st = b.hero.stats;
  if (sk.kind === 'physical') return `${p + st.str + st.weapon + b.hero.warpaint} dmg`;
  if (sk.kind === 'fire') return `${p + st.int} +burn`;
  if (sk.kind === 'block') return `block ${p + Math.floor(st.vit / 2)}`;
  if (sk.kind === 'stun') return 'stun';
  return '';
}
function timeLeft(job) {
  const ms = Math.max(0, job.ends - env.now());
  const m = Math.floor(ms / 60e3), sec = Math.floor((ms % 60e3) / 1000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}:${String(sec).padStart(2, '0')}`;
}

function trialCard(n) {
  const t = TRIALS.find((x) => x.n === n);
  const open = T.trialUnlocked(s, n);
  const done = !!s.trials.cleared[n];
  const names = {};
  for (const e of t.enemies) { const k = (e.endsWith('!') ? 'Veteran ' : '') + ENEMIES[e.replace('!', '')].name; names[k] = (names[k] || 0) + 1; }
  const under = s.hero.level < t.level;
  const rewards = done ? 'Replay: crafting materials, sometimes worn gear' : `${t.xp} XP, ${t.boss === 'era' ? 'Platinum' : t.boss === 'mini' ? 'Gold' : 'a'} loot box, materials${t.boss === 'mini' ? ', boss gear, respec token' : ''}${t.boss === 'era' ? ', boss gear, blueprint, ERA KEY' : ''}`;
  return `<div class="trialcard panel halftone pad">
    <button class="x" data-a="trial" data-v="">✕</button>
    <div class="comic" style="font-size:22px;color:var(--yellow)">Trial ${n}: ${esc(t.name)}</div>
    <div class="small">${Object.entries(names).map(([k, v]) => `${v > 1 ? `${v}× ` : ''}${k}`).join(', ')}</div>
    <div class="small">Suggested level <b class="${under ? 'warn' : 'ok'}">${t.level}</b> · you are ${s.hero.level}</div>
    <div class="small muted" style="margin:4px 0">${rewards}</div>
    ${open ? `<button class="btn pink" style="width:100%" data-a="fight" data-v="${n}">${done ? 'Replay' : 'Fight'} ⚔</button>` : `<div class="small bad">Beat Trial ${n - 1} first.</div>`}
  </div>`;
}

function heroStatsTab() {
  const h = s.hero;
  const st = H.heroStats(s);
  const cap = H.levelCap(s);
  const need = xpToNext(h.level);
  const atCap = h.level >= cap;
  const xpLeft = atCap ? 0 : need - h.xp;
  const cost = H.trainCost(s, xpLeft);
  return `<div class="row"><div class="comic" style="font-size:26px">Level ${h.level}</div><div class="grow">
      <div class="bar" style="height:10px"><i style="width:${atCap ? 100 : (h.xp / need) * 100}%"></i></div>
      <div class="small muted">${atCap ? `Era cap reached (level ${cap})` : `${h.xp}/${need} XP`}</div></div></div>
    <div class="row wrap" style="margin:6px 0">
      <button class="btn small ${!atCap && s.soles >= cost ? 'yellow' : 'off'}" data-a="train">🗿 Train to level ${h.level + 1} · 👣${fmt(cost)}</button>
      ${!atCap && s.soles >= H.trainCost(s, 10) && s.soles < cost ? `<button class="btn small" data-a="train10">+10 XP · 👣${H.trainCost(s, 10)}</button>` : ''}
      ${h.respecTokens ? `<button class="btn small ghost" data-a="respec">🔄 Respec (${h.respecTokens})</button>` : ''}
    </div>
    <div class="small muted">Training costs ${H.trainCost(s, 1)} Soles per XP. First wins of Trials give XP too.</div>
    <div class="sep"></div>
    ${h.freeAttr ? `<div class="ok small">You have ${h.freeAttr} attribute point${h.freeAttr > 1 ? 's' : ''} to spend.</div>` : ''}
    ${Object.entries(ATTRS).map(([k, a]) => `<div class="stat"><span class="k">${a.short}</span><span class="v">${st[k]}</span><span class="d">${a.desc}${st[k] !== h.attrs[k] ? ` <span class="ok">(+${st[k] - h.attrs[k]} gear)</span>` : ''}</span>${h.freeAttr ? `<button class="plus" data-a="attr" data-v="${k}">+</button>` : ''}</div>`).join('')}
    <div class="sep"></div>
    <div class="row wrap small">
      <span>❤ Health <b>${st.maxHp}</b></span><span>🏏 Weapon <b>+${st.weapon}</b></span><span>🎯 Crit <b>${Math.round(st.crit * 100)}%</b></span><span>💨 Dodge <b>${Math.round(st.dodge * 100)}%</b></span><span>⚡ AP carry <b>${st.apCarry}</b></span>
    </div>
    ${h.boons.length ? `<div class="small" style="margin-top:6px">Boons: ${h.boons.map((id) => BOONS.find((b) => b.id === id).name).join(', ')}</div>` : ''}`;
}

function heroSkillsTab() {
  const h = s.hero;
  const max = H.maxRank(s);
  const size = H.loadoutSize(s);
  return `<div class="small muted">Loadout ${h.loadout.length}/${size} · max rank ${max} (upgrade the Hero Training Altar for more) · ${h.freeSkill} skill point${h.freeSkill === 1 ? '' : 's'}</div>
  ${SKILL_ORDER.map((id) => {
    const sk = SKILLS[id];
    const rank = h.ranks[id];
    const inL = h.loadout.includes(id);
    if (!rank) return `<div class="skill locked"><div class="si">${sk.icon}</div><div class="grow"><div class="sname">${sk.name}<span class="ap">${sk.ap} AP</span></div><div class="small">Unlocks at level ${sk.unlock}</div></div></div>`;
    return `<div class="skill"><div class="si">${sk.icon}</div><div class="grow"><div class="sname">${sk.name}<span class="ap">${sk.ap} AP</span> <span class="rank">${'◆'.repeat(rank)}<span style="opacity:.35">${'◇'.repeat(3 - rank)}</span></span></div>
      <div class="small">${sk.desc(H.skillPower(s, id))}</div></div>
      ${h.freeSkill && rank < max && sk.power ? `<button class="btn tiny green" data-a="rank" data-v="${id}">+2</button>` : ''}
      <button class="btn tiny ${inL ? 'cyan' : 'ghost'}" data-a="loadout" data-v="${id}">${inL ? 'In loadout' : 'Add'}</button></div>`;
  }).join('')}`;
}

function heroGearTab() {
  const used = E.invUsed(s), cap = E.invCapacity(s);
  const cells = [];
  for (const it of s.inv) {
    const g = GEAR[it.key];
    cells.push(`<div class="cell t-${g.tier} ${H.isEquipped(s, it.uid) ? 'eq' : ''}" data-a="item" data-v="${it.uid}"><span class="gi">${gearIcon(it.key)}</span>${esc(g.name)}</div>`);
  }
  for (const [k, n] of Object.entries(s.boosters)) if (n > 0) cells.push(`<div class="cell" data-a="booster" data-v="${k}"><span class="gi">${ICON[k]}</span>${esc(BOOSTERS[k].name)}<span class="n">${n}</span></div>`);
  while (cells.length < cap) cells.push('<div class="cell empty"></div>');
  return `<div class="slots">${SLOTS.map((sl) => {
    const g = H.gearOf(s, s.hero.equip[sl]);
    return `<div class="slot ${g ? 'full' : ''}" ${g ? `data-a="item" data-v="${g.uid}"` : ''}><span class="sn">${SLOT_NAMES[sl]}</span>${g ? `<span style="font-size:20px">${gearIcon(g.key)}</span>${esc(g.name)}` : `<span style="font-size:20px;opacity:.3">${ICON[sl]}</span>`}</div>`;
  }).join('')}</div>
  <div class="row" style="margin:8px 0 4px"><h3 class="h grow">Inventory ${used}/${cap}</h3><span class="small">🪨 ${s.mats.flint} · 🦴 ${s.mats.bone}</span><button class="btn tiny ghost" data-a="autoEquip">Equip best</button></div>
  <div class="grid">${cells.join('')}</div>`;
}

// ---------- Modals ----------
function openModal(type, data = {}) {
  app.modal = { type, ...data };
  renderModal();
  renderProctor();
}
function closeModal() {
  app.modal = null;
  renderModal();
  renderProctor();
}

function renderModal() {
  const m = app.modal;
  const el = $('#modal');
  if (!m) { el.innerHTML = ''; return; }
  const fn = MODALS[m.type];
  el.innerHTML = fn ? `<div class="overlay" data-a="overlay">${fn(m)}</div>` : '';
}

const MODALS = {
  report() {
    const r = s.report;
    if (!r) return '';
    const comment = (r.steps < 1000 ? pick(PROCTOR.walkSmall) : r.steps < 5000 ? pick(PROCTOR.walkMid) : pick(PROCTOR.walkBig)).replace('{steps}', fmt(r.steps));
    return `<div class="dialog panel halftone">
      <h2 class="h">📜 Expedition report</h2>
      <div class="muted small">While you were out</div>
      <div class="body">
      ${(r.transmissions || []).map((id) => `<div class="txmsg cleared"><div class="txh">📡 Signal cleared · ${esc(FORMER_TRIBUTE)}</div><p>${esc(ST.txById(id).text)}</p></div>`).join('')}
      <div class="loot" style="margin:10px 0">
        ${card('🚶', `${fmt(r.steps)} steps`)}
        ${card('👣', `${fmt(r.soles)} Soles`, `${E.stepsPerSole(s)} steps per Sole`)}
        ${r.boxes.map((t) => card(TIER_ICON[t], `${E.TIER_NAMES[t]} box`)).join('')}
        ${r.mats.flint ? card('🪨', `${r.mats.flint} Flint`, 'found on the way') : ''}
        ${r.mats.bone ? card('🦴', `${r.mats.bone} Bone`, 'found on the way') : ''}
      </div>
      ${r.lost ? `<div class="small warn">${r.lost} loot box${r.lost > 1 ? 'es' : ''} lost: you can hold ${E.BOX_LIMIT} unopened. Open them more often.</div>` : ''}
      </div>
      <div class="proctor wide" style="position:static;margin-top:8px"><div class="eye"></div><div class="bubble"><span class="who">PROCTOR</span>${esc(comment)}</div></div>
      <div class="actions"><button class="btn yellow" data-a="collect">Collect</button></div>
    </div>`;
  },

  boxes(m) {
    if (m.openedAll) {
      const o = m.openedAll;
      return `<div class="dialog panel wide halftone reveal" style="align-items:center">
        <div class="tierlabel" style="color:var(--yellow)">${o.count} LOOT BOXES OPENED</div>
        <div class="small" style="margin:4px 0 2px">${E.TIERS.filter((t) => o.tiers[t]).map((t) => `<span style="color:var(--${t})">${o.tiers[t]} ${E.TIER_NAMES[t]}</span>`).join(' · ')}</div>
        ${m.revealed ? `<div class="loot body">${o.items.map((it, i) => lootCard(it, Math.min(i, 12))).join('')}</div>` : `<div class="bigbox tier-${E.TIERS.filter((t) => o.tiers[t]).pop()}">📦</div>`}
        <div class="actions" style="justify-content:center">${m.revealed ? '<button class="btn cyan" data-a="closeModal">Done</button>' : ''}</div>
      </div>`;
    }
    if (m.opened) {
      const o = m.opened;
      return `<div class="dialog panel wide halftone reveal" style="align-items:center">
        <div class="tierlabel" style="color:var(--${o.tier})">${E.TIER_NAMES[o.tier].toUpperCase()} LOOT BOX</div>
        ${m.revealed ? `<div class="loot">${o.items.map((it, i) => lootCard(it, i)).join('')}</div>` : `<div class="bigbox tier-${o.tier}">${TIER_ICON[o.tier]}</div>`}
        <div class="actions" style="justify-content:center">${m.revealed ? `${s.boxes.length ? `<button class="btn yellow" data-a="openBox" data-v="${s.boxes[0].id}">Open next (${s.boxes.length})</button>` : ''}${s.boxes.length > 1 ? `<button class="btn orange" data-a="openAll">Open all (${s.boxes.length})</button>` : ''}<button class="btn cyan" data-a="closeModal">Done</button>` : ''}</div>
      </div>`;
    }
    const odds = E.boxOdds(s.base.shrine.tier);
    return `<div class="dialog panel halftone">
      <button class="x" data-a="closeModal">✕</button>
      <h2 class="h">📦 Loot boxes</h2>
      <div class="small muted">One for every 1,000 steps. You can hold ${E.BOX_LIMIT}. Contents scale to your level.</div>
      <div class="body" style="margin:10px 0">
        <div class="boxes">${s.boxes.map((b) => `<div class="lbox tier-${b.tier}" data-a="openBox" data-v="${b.id}"><span class="ico">${TIER_ICON[b.tier]}</span>${E.TIER_NAMES[b.tier]}</div>`).join('') || '<div class="muted">No boxes. Walk 1,000 steps to earn one.</div>'}</div>
        <div class="sep"></div>
        <div class="small muted">Odds${s.base.shrine.tier ? ` (Shrine tier ${s.base.shrine.tier})` : ''}: ${E.TIERS.map((t) => `${E.TIER_NAMES[t]} ${(odds[t] * 100).toFixed(2)}%`).join(' · ')}</div>
      </div>
      ${s.boxes.length > 1 ? `<div class="actions"><button class="btn yellow" data-a="openBox" data-v="${s.boxes[0].id}">Open first</button><button class="btn orange" data-a="openAll">Open all (${s.boxes.length})</button></div>` : ''}
    </div>`;
  },

  goals() {
    const g = E.ensureGoals(s);
    const wd = E.weeklyDays(s);
    const w = E.updateWeekly(s);
    return `<div class="dialog panel halftone">
      <button class="x" data-a="closeModal">✕</button>
      <h2 class="h">🎯 Daily goals</h2>
      <div class="body">
      ${g.list.map((it, i) => {
        const d = E.GOAL_POOL[it.id];
        const done = E.goalDone(it);
        const p = Math.min(1, it.progress / d.target);
        return `<div class="skill"><div class="si">${it.claimed ? '✅' : done ? '🎁' : '⬜'}</div><div class="grow"><div class="sname">${d.text}</div>
          <div class="bar"><i style="width:${p * 100}%"></i></div><div class="small muted">${fmt(Math.min(it.progress, d.target))}/${fmt(d.target)} · reward: ${rewardText(d.reward)}</div></div>
          ${done && !it.claimed ? `<button class="btn tiny yellow" data-a="claimGoal" data-v="${i}">Claim</button>` : ''}</div>`;
      }).join('')}
      <div class="row small"><span class="grow">All three: ${rewardText(E.ALL_GOALS_BONUS)}</span>${!g.bonusClaimed && g.list.every((x) => x.claimed) ? '<button class="btn tiny yellow" data-a="claimBonus">Claim</button>' : g.bonusClaimed ? '<span class="ok">claimed</span>' : ''}</div>
      <div class="sep"></div>
      <h3 class="h">Weekly bonus</h3>
      <div class="small">Walk ${fmt(E.WEEKLY.stepsPerDay)}+ steps on any ${E.WEEKLY.daysNeeded} days this week. Rest days are fine. Reward: ${rewardText(E.WEEKLY.reward)}.</div>
      <div class="row" style="margin:6px 0">${Array.from({ length: 7 }, (_, i) => `<span class="chip" style="${i < wd ? 'background:var(--green);color:var(--ink)' : ''}">${i < wd ? '✔' : '·'}</span>`).join('')}
        <span class="grow"></span>${wd >= E.WEEKLY.daysNeeded && !w.claimed ? '<button class="btn tiny yellow" data-a="claimWeekly">Claim</button>' : w.claimed ? '<span class="ok small">claimed</span>' : `<span class="small muted">${wd}/${E.WEEKLY.daysNeeded}</span>`}</div>
      </div></div>`;
  },

  achievements() {
    const got = ACHIEVEMENTS.filter((a) => s.achievements[a.id]).length;
    return `<div class="dialog panel halftone wide">
      <button class="x" data-a="closeModal">✕</button>
      <h2 class="h">🏆 Achievements ${got}/${ACHIEVEMENTS.length}</h2>
      <div class="body">${ACHIEVEMENTS.map((a) => {
        const has = s.achievements[a.id];
        return `<div class="skill ${has ? '' : 'locked'}"><div class="si">${has ? '🏆' : '🔒'}</div><div class="grow"><div class="sname">${has ? esc(a.name) : '???'}</div>
          <div class="small">${has ? esc(a.text) : 'Keep playing. Or walking. Mostly walking.'}</div>
          ${has ? `<div class="small muted">${a.reward ? rewardText(a.reward) : esc(a.rewardText || '')}</div>` : ''}</div></div>`;
      }).join('')}</div></div>`;
  },

  building(m) {
    const b = m.id;
    const st = s.base[b];
    const def = BUILDINGS[b];
    const cost = B.upgradeCost(s, b);
    const free = s.firstBuildFree;
    let action = '';
    if (st.job) {
      const c = B.speedUpCost(st.job);
      action = `<div class="row"><span class="grow">⏳ Upgrading to tier ${st.job.to}: <b data-timer="${b}">${timeLeft(st.job)}</b> left</span><button class="btn small ${s.soles >= c ? 'yellow' : 'off'}" data-a="speed" data-v="${b}">Finish now · 👣${c}</button></div>`;
    } else if (cost) {
      const ok = free || B.canAfford(s, cost);
      action = `<div class="row wrap"><span class="grow small">${free ? '<b class="ok">Your first building is free and instant.</b>' : `Tier ${cost.to}: 👣${cost.soles} · 🪨${cost.mats.flint} · 🦴${cost.mats.bone} · ⏳${cost.minutes >= 60 ? `${cost.minutes / 60}h` : `${cost.minutes}m`}`}</span>
        <button class="btn small ${ok ? 'yellow' : 'off'} ${free ? 'pulse' : ''}" data-a="upgrade" data-v="${b}">${st.tier ? 'Upgrade' : 'Build'}</button></div>`;
    } else action = '<div class="ok">Max tier for this era.</div>';
    const use = { studio: ['craft', '⚒ Craft'], altar: ['heroStats', '🗿 Train hero'], inventory: ['heroGear', '🎒 Open inventory'], shrine: ['modalBoxes', '📦 Loot box odds'], truth: ['truth', '📌 Open board'] }[b];
    return `<div class="dialog panel halftone">
      <button class="x" data-a="closeModal">✕</button>
      <h2 class="h">${def.icon} ${def.name}</h2>
      <div class="small muted">Tier ${st.tier}/3</div>
      <div class="body">
        ${def.unlocks.map((u, i) => `<div class="small ${st.tier > i ? 'ok' : 'muted'}">${st.tier > i ? '✔' : '○'} Tier ${i + 1}: ${u}</div>`).join('')}
        <div class="sep"></div>
        ${action}
      </div>
      <div class="actions"><button class="btn cyan small" data-a="${use[0]}">${use[1]}</button></div>
    </div>`;
  },

  item(m) {
    const it = s.inv.find((x) => x.uid === m.uid);
    if (!it) return '';
    const g = GEAR[it.key];
    const eq = H.isEquipped(s, it.uid);
    const cur = H.gearOf(s, s.hero.equip[g.slot]);
    const sv = E.salvageValue(it.key);
    return `<div class="dialog panel halftone" style="width:min(420px,92vw)">
      <button class="x" data-a="closeModal">✕</button>
      <div class="row"><span style="font-size:44px">${gearIcon(it.key)}</span><div><h2 class="h">${esc(g.name)}</h2><div class="small muted">${SLOT_NAMES[g.slot]} · ${g.tier}</div></div></div>
      <div style="margin:8px 0">${statText(g.stats)}</div>
      ${cur && !eq ? `<div class="small muted">Equipped now: ${esc(cur.name)} (${statText(cur.stats)})</div>` : ''}
      <div class="actions">
        ${eq ? '' : `<button class="btn small ghost" data-a="salvage" data-v="${it.uid}">Salvage → 🪨${sv.flint} 🦴${sv.bone}</button>`}
        <button class="btn small ${eq ? 'ghost' : 'yellow'}" data-a="equip" data-v="${it.uid}">${eq ? 'Unequip' : 'Equip'}</button>
      </div></div>`;
  },

  booster(m) {
    const b = BOOSTERS[m.key];
    return `<div class="dialog panel halftone" style="width:min(420px,92vw)">
      <button class="x" data-a="closeModal">✕</button>
      <div class="row"><span style="font-size:44px">${ICON[m.key]}</span><div><h2 class="h">${esc(b.name)}</h2><div class="small muted">Booster · you have ${s.boosters[m.key] || 0}</div></div></div>
      <div style="margin:8px 0">${esc(b.desc)}</div>
      <div class="actions"><button class="btn small yellow" data-a="useBooster" data-v="${m.key}">Use</button></div></div>`;
  },

  frag(m) {
    const f = FRAGMENTS.find((x) => x.id === m.id);
    return `<div class="dialog panel" style="background:#efe6cc;color:#1a1408;width:min(520px,92vw)">
      <button class="x" data-a="closeModal">✕</button>
      <div class="small" style="color:#8a2a20;text-transform:uppercase;letter-spacing:.1em">${esc(f.kind)}${f.from ? ` · from ${esc(f.from)}` : ''}</div>
      <h2 class="h" style="color:#1a1408;text-shadow:none">${esc(f.title)}</h2>
      <p style="font-size:16px">${esc(f.text)}</p>
      ${m.flashback ? `<div class="actions" style="justify-content:space-between;align-items:center"><span class="small" style="color:#8a2a20">The last piece. Something is surfacing…</span><button class="btn yellow" data-a="flashback" data-v="${m.flashback}">▶ Play memory</button></div>` : ''}</div>`;
  },

  cut(m) {
    return cutShot(m.shots[m.i], m.i, m.shots.length, 'cutNext', 'cutSkip');
  },

  transmission() {
    const a = ST.activeTransmission(s);
    const log = s.transmissions.cleared;
    return `<div class="dialog panel halftone tx">
      <button class="x" data-a="closeModal">✕</button>
      <h2 class="h">📡 Transmissions</h2>
      <div class="small muted">From ${esc(FORMER_TRIBUTE)}. The signal only gets stronger while you walk.</div>
      <div class="body">
        ${a ? `<div class="txmsg live"><div class="txh">Incoming · signal ${Math.floor(a.frac * 100)}%</div><p>${esc(ST.signalText(a, a.frac))}</p>
          <div class="mbar"><i style="width:${a.frac * 100}%"></i></div><div class="small">Walk ${fmt(a.left)} more steps to clear it.</div></div>` : '<div class="small muted">No signal right now.</div>'}
        ${log.slice().reverse().map((id) => `<div class="txmsg"><div class="txh">Cleared</div><p>${esc(ST.txById(id).text)}</p></div>`).join('')}
      </div></div>`;
  },

  flashback(m) {
    const fb = FLASHBACKS[m.era];
    const p = fb.panels[m.i];
    const last = m.i >= fb.panels.length - 1;
    return `<div class="flashback" data-a="flashNext">
      <div class="scanlines"></div>
      <div class="fbhead"><span>${esc(fb.title)}</span><span>${esc(fb.source)}</span></div>
      <div class="fbpanel ${p.speaker ? 'speech' : ''} ${p.end ? 'end' : ''}" key="${m.i}">
        <div class="cap">${esc(p.caption)}</div>
        ${p.speaker ? `<div class="spk">${esc(p.speaker)}</div>` : ''}
        <p>${esc(p.text)}</p>
      </div>
      <div class="fbfoot"><span>${fb.panels.map((_, i) => `<i class="${i <= m.i ? 'on' : ''}"></i>`).join('')}</span>
        <span>${last ? 'tap to return' : 'tap to continue'}</span>
        ${last ? '' : '<button class="btn tiny ghost" data-a="flashSkip">Skip</button>'}</div>
    </div>`;
  },

  evolve(m) {
    if (m.choices) {
      return `<div class="dialog panel halftone wide">
        <h2 class="h">🧬 Choose a Boon</h2>
        <div class="small muted">PROCTOR offers three. You keep one, forever.</div>
        <div class="loot" style="margin:10px 0">${m.choices.map((b) => `<div class="lootcard rare" style="width:170px;cursor:pointer" data-a="pickBoon" data-v="${b.id}"><div class="li">✨</div>${esc(b.name)}<small>${esc(b.desc)}</small></div>`).join('')}</div>
      </div>`;
    }
    const checks = B.evolveChecks(s);
    return `<div class="dialog panel halftone">
      <button class="x" data-a="closeModal">✕</button>
      <h2 class="h">🧬 Evolve to Era 2</h2>
      <div class="body">${checks.map((c) => `<div class="${c.ok ? 'ok' : 'muted'}">${c.ok ? '✔' : '○'} ${c.label}</div>`).join('')}
      <div class="sep"></div>
      <div class="small muted">When you evolve: choose 1 of 3 Boons, get a free respec, and your leftover flint and bone turn into Soles.${s.evolved ? ' <b class="ok">Already evolved.</b>' : ''}</div></div>
      <div class="actions"><button class="btn ${B.canEvolve(s) ? 'yellow pulse' : 'off'}" data-a="evolveGo">Evolve</button></div>
    </div>`;
  },

  settings(m) {
    return `<div class="dialog panel halftone">
      <button class="x" data-a="closeModal">✕</button>
      <h2 class="h">⚙ Settings</h2>
      <div class="body">
        <h3 class="h">Test tools <span class="debugtag">TEST BUILD</span></h3>
        <div class="row wrap">
          <button class="btn small green" data-a="addSteps" data-v="1000">+1,000 steps</button>
          <button class="btn small green" data-a="addSteps" data-v="6000">+6,000 steps (a day)</button>
          <button class="btn small" data-a="finishTimers">Finish all timers</button>
        </div>
        <div class="sep"></div>
        <h3 class="h">Fullscreen</h3>
        <div class="small">${fullscreenHelp()}</div>
        ${!isStandalone() && canFullscreen() && !isIOS() ? '<div class="row" style="margin-top:6px"><button class="btn small cyan" data-a="fullscreen">⛶ Go fullscreen</button></div>' : ''}
        <div class="sep"></div>
        <h3 class="h">UI style</h3>
        <div class="small muted">Retro dither is a UI mockup: pixel type and dithered shading on the interface. The 3D scene is unchanged.</div>
        <div class="row" style="margin:6px 0">${[['current', 'Current'], ['retro', 'Retro dither']].map(([k, l]) => `<button class="tab ${(s.uiStyle || 'current') === k ? 'on' : ''}" data-a="uiStyle" data-v="${k}">${l}</button>`).join('')}</div>
        <div class="sep"></div>
        <h3 class="h">Combat numbers</h3>
        <div class="small muted">"Tuned" raises enemy health ×1.25 and damage ×1.5, and lets Guard be used once a turn. "GDD v1" uses the design document's table exactly.</div>
        <div class="row" style="margin:6px 0">${Object.keys(TUNING_PRESETS).map((k) => `<button class="tab ${(s.tuning || 'tuned') === k ? 'on' : ''}" data-a="tuning" data-v="${k}">${k === 'gdd' ? 'GDD v1' : 'Tuned'}</button>`).join('')}</div>
        <div class="sep"></div>
        <h3 class="h">Progress</h3>
        <div class="small"><span class="ok">✔ Autosaves after every action</span> <span class="muted">(in this browser only; no accounts yet).</span></div>
        <div class="small muted"> Total steps ${fmt(s.steps.total)} · Soles earned ${fmt(s.solesEarned)} · Trials won ${s.trials.wins}</div>
        <div class="row" style="margin-top:6px"><button class="btn small ${m.confirm ? 'pink' : 'ghost'}" data-a="reset">${m.confirm ? 'Tap again to wipe everything and restart' : '🗑 Reset game'}</button></div>
        <div class="small muted" style="margin-top:8px">Version ${__BUILD__}</div>
      </div></div>`;
  },
};

function rewardText(r) {
  if (!r) return '';
  return [r.soles ? `👣${r.soles} Soles` : '', r.box ? `${E.TIER_NAMES[r.box]} loot box` : ''].filter(Boolean).join(' + ');
}

function lootCard(it, i) {
  const d = `style="animation-delay:${i * 0.12}s"`;
  switch (it.type) {
    case 'mat': return `<div class="lootcard" ${d}><div class="li">${ICON[it.key]}</div>${it.n} ${MATERIALS[it.key].name}</div>`;
    case 'gear': { const g = GEAR[it.key]; return `<div class="lootcard ${g.tier === 'rare' ? 'rare' : g.tier === 'boss' ? 'boss' : ''}" ${d}><div class="li">${gearIcon(it.key)}</div>${esc(g.name)}<small>${statText(g.stats)}${it.salvaged ? ' (bag full: salvaged)' : ''}</small></div>`; }
    case 'frag': return `<div class="lootcard frag" ${d}><div class="li">📄</div>Story fragment<small>Pinned to the Truth Board</small></div>`;
    case 'booster': return `<div class="lootcard" ${d}><div class="li">${ICON[it.key]}</div>${it.n > 1 ? `${it.n} × ` : ''}${esc(BOOSTERS[it.key].name)}<small>${esc(BOOSTERS[it.key].desc)}</small></div>`;
    case 'blueprint': return `<div class="lootcard rare" ${d}><div class="li">📐</div>Blueprint<small>${esc(B.recipeName(RECIPES.find((r) => r.id === it.id)))}</small></div>`;
    case 'respec': return `<div class="lootcard" ${d}><div class="li">🔄</div>Respec token</div>`;
  }
  return '';
}

// ---------- PROCTOR and toasts ----------
function renderProctor() {
  const p = app.proctor;
  const el = $('#proctor');
  const hide = !p || app.screen === 'intro' || app.modal || (app.screen === 'combat' && app.battle && app.battle.trial !== 0 && !p.glitch);
  document.body.classList.toggle('proctor-on', !hide);
  if (hide) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="proctor ${p.glitch ? 'glitch' : ''} ${p.wide && app.screen !== 'combat' ? 'wide' : ''} ${app.screen === 'combat' ? 'incombat' : ''}" data-a="dismissProctor"><div class="eye"></div><div class="bubble"><span class="who">${p.glitch ? esc(p.who || FORMER_TRIBUTE) : 'PROCTOR'}</span>${esc(p.text)}</div></div>`;
}

function renderToasts() {
  const el = $('#toasts');
  const now = Date.now();
  while (s.toasts.length) {
    const t = s.toasts.shift();
    app.toastQ = app.toastQ || [];
    app.toastQ.push({ ...t, born: now });
  }
  app.toastQ = (app.toastQ || []).filter((t) => now - t.born < 4000);
  const shown = app.toastQ.slice(0, 2);
  const html = shown.map((t) => `<div class="toast ${t.kind}" data-a="dismissToast" data-v="${t.id}" data-tid="${t.id}"><div class="tt">${esc(t.title)}</div><div class="tx">${esc(t.text)}${t.reward ? ` <b>${rewardText(t.reward)}</b>` : t.rewardText ? ` <i>(${esc(t.rewardText)})</i>` : ''}</div></div>`).join('');
  const sig = shown.map((t) => t.id).join(',');
  if (el.dataset.sig !== sig) { el.innerHTML = html; el.dataset.sig = sig; }
}

// Keep HTML anchored to 3D actors (HP bars, building labels).
function follow(once) {
  document.querySelectorAll('[data-anchor]').forEach((el) => {
    const id = el.dataset.anchor;
    const p = stage.anchor(/^\d+$/.test(id) ? Number(id) : id, 0.15);
    if (p) { el.style.left = `${p.x}px`; el.style.top = `${Math.max(el.classList.contains('hpbox') ? 92 : 70, p.y)}px`; }
  });
  if (once !== true) requestAnimationFrame(follow);
}

function floatText(who, text, cls = '') {
  const p = stage.anchor(who, -0.5);
  if (!p) return;
  const d = document.createElement('div');
  d.className = cls.includes('pow') ? 'pow' : `dmg ${cls}`;
  d.textContent = text;
  d.style.left = `${p.x + (Math.random() * 30 - 15)}px`;
  d.style.top = `${p.y}px`;
  $('#float').appendChild(d);
  setTimeout(() => d.remove(), 1000);
}

// ---------- Combat controller ----------
function startBattle(n) {
  app.battle = C.createBattle(s, n);
  app.target = null;
  app.busy = false;
  app.selectedTrial = null;
  go('combat');
  if (n === 0) say(PROCTOR.wake[0], { wide: true });
  else app.proctor = null;
  renderProctor();
  save(s);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function playEvents(ev) {
  for (const e of ev) {
    switch (e.t) {
      case 'use': {
        const sk = SKILLS[e.skill];
        if (sk.kind === 'physical') stage.anim('hero', 'attack', { dist: e.skill === 'hurl' ? 0.4 : 1.5, skill: e.skill });
        else if (sk.kind === 'block') stage.anim('hero', 'block');
        else stage.anim('hero', 'cast', { skill: e.skill });
        if (sk.kind === 'stun') floatText('hero', 'ROAR!', 'pow');
        // strikes land on the swing's contact frame, at the peak of the lunge
        await wait(sk.kind === 'block' || sk.kind === 'stun' ? 200 : STRIKE_MS);
        break;
      }
      case 'hit':
        if (app.shown && e.hpAfter !== undefined) app.shown[e.who] = { hp: e.hpAfter, block: e.blockAfter };
        if (e.who === 'hero') {
          stage.anim('hero', 'hit');
          floatText('hero', e.dmg ? `-${e.dmg}` : 'BLOCKED', `hero ${e.dmg ? '' : 'info'}`);
          if (e.dmg >= 12) { $('#ui').classList.remove('shake'); void $('#ui').offsetWidth; $('#ui').classList.add('shake'); }
        } else {
          stage.anim(e.who, 'hit');
          floatText(e.who, e.dmg ? `${e.dmg}${e.crit ? '!' : ''}` : 'BLOCKED', `${e.crit ? 'crit' : ''} ${e.kind === 'burn' ? 'info' : ''} ${e.dmg ? '' : 'info'}`);
          if (e.crit) floatText(e.who, 'CRIT!', 'pow');
        }
        render();
        await wait(e.kind === 'burn' ? 350 : e.who === 'hero' ? 450 : 250);
        break;
      case 'die':
        stage.anim(e.who, 'die');
        floatText(e.who, 'KO!', 'pow');
        await wait(350);
        break;
      case 'act': {
        const en = app.battle.enemies.find((x) => x.uid === e.who);
        const it = en && ENEMIES[en.id].intents[e.key];
        if (it && (it.kind === 'attack' || it.kind === 'bleed')) stage.anim(e.who, 'attack', { dist: en.id === 'mammoth' ? 1.6 : 2.2 });
        else if (it && it.kind === 'block') { stage.anim(e.who, 'block'); floatText(e.who, it.label.toUpperCase(), 'info'); }
        else if (it) floatText(e.who, it.label.toUpperCase() + '!', 'info');
        await wait(it && (it.kind === 'attack' || it.kind === 'bleed') ? 200 : 400);
        break;
      }
      case 'skip':
        floatText(e.who, e.why === 'stunned' ? 'STUNNED' : e.why === 'scared' ? 'SCARED!' : 'INTERRUPTED', 'info');
        stage.anim(e.who, 'stun');
        await wait(450);
        break;
      case 'stun': stage.anim(e.who, 'stun'); floatText(e.who, 'STUNNED', 'info'); await wait(200); break;
      case 'fear': floatText(e.who, 'SCARED!', 'info'); await wait(200); break;
      case 'interrupt': floatText(e.who, 'INTERRUPTED!', 'pow'); await wait(250); break;
      case 'dodge': floatText('hero', 'DODGE', 'info'); await wait(250); break;
      case 'block': if (e.who === 'hero') floatText('hero', `+${e.amt} BLOCK`, 'info'); await wait(150); break;
      case 'summon': stage.setEnemies(C.living(app.battle)); render(); floatText(e.who, 'AWOOO!', 'pow'); await wait(500); break;
      case 'turn': break;
      case 'win': stage.anim('hero', 'win'); await wait(700); break;
      case 'lose': stage.anim('hero', 'die'); await wait(900); break;
    }
  }
}

async function runAction(fn) {
  if (app.busy || !app.battle || app.battle.over) return;
  app.busy = true;
  const b0 = app.battle;
  app.shown = { hero: { hp: b0.hero.hp, block: b0.hero.block } };
  for (const e of b0.enemies) app.shown[e.uid] = { hp: e.hp, block: e.block };
  render();
  const ev = fn();
  for (const e of b0.enemies) if (!app.shown[e.uid]) app.shown[e.uid] = { hp: e.maxHp, block: 0 };
  await playEvents(ev);
  app.shown = null;
  app.busy = false;
  if (app.battle.over) return endBattle();
  // nothing left to do this turn: end it automatically
  const b = app.battle;
  if (!b.loadout.some((id) => C.canUse(b, id))) {
    render();
    await wait(350);
    return runAction(() => C.endTurn(b));
  }
  render();
}

function endBattle() {
  const b = app.battle;
  const result = b.over;
  const r = T.finishTrial(s, b.trial, result, b);
  r.flawless = result === 'win' && b.hero.damageTaken === 0;
  if (result !== 'win') {
    r.line = b.trial === 15 && (s.trials.losses[15] || 0) >= 3 ? 'Mammoth Problems loading...' : pick(PROCTOR.lose);
    if (b.trial === 6 && !s.wallShown) { s.wallShown = true; r.line = PROCTOR.wall[0]; }
  }
  app.lastReward = r;
  app.battle = null;
  stage.setMode('combat');
  app.screen = 'reward';
  app.proctor = null;
  commit();
  if (result === 'win' && b.trial > 0) say(r.first ? pick(PROCTOR.win) : pick(PROCTOR.replayWin));
  if (r.glitch) setTimeout(() => glitch(), 900);
  if (r.transmission) setTimeout(() => incoming(r.transmission), 900);
  if (r.slip) setTimeout(() => say(PROCTOR_SLIP[0], { sticky: true, then: () => say(PROCTOR_SLIP[1]) }), 900);
  if (r.flicker) setTimeout(() => playCut(FLICKERS[r.flicker].shots, () => { s.flickersSeen.push(r.flicker); commit(); say('A corrupted frame. Someone else\'s footage. Happens. Moving on.'); }), 1200);
  if (r.n === 5 && r.first) app.pendingWall = true;
  syncLook();
}

// A broken transmission arrives from 7,301,223 (former tribute).
function incoming(id) {
  const def = ST.txById(id);
  say(`${ST.signalText(def, 0)}  [signal 0%: walk ${fmt(def.steps)} steps to clear it]`, {
    glitch: true, sticky: true, who: FORMER_TRIBUTE,
    then: () => say('Cosmic ray. Ignore it. Definitely do not go for a walk to hear the rest.'),
  });
}

// Play a short black-and-white cutscene in the modal layer.
function playCut(shots, done) {
  app.proctor = null;
  app.modal = { type: 'cut', shots, i: 0, done };
  renderModal();
  renderProctor();
}

function glitch() {
  const text = E.nextGlitch(s);
  s.glitches++;
  save(s);
  say(text, { glitch: true, sticky: true, then: () => say(pick(PROCTOR.glitchDismiss)) });
}

// ---------- Actions ----------
const ACTIONS = {
  go(v) {
    if (v === 'map' && s.tutorial === 'trials') { /* keep hint until a trial is won */ }
    app.selectedTrial = null;
    if (v === 'home' && app.pendingWall && s.soles < 150) { app.pendingWall = false; go('home'); say(PROCTOR.wall[0], { wide: true, sticky: true }); return; }
    if (v === 'home' && Math.random() < 0.25 && !app.proctor) app.proctor = { text: pick(PROCTOR.home) };
    if (v === 'shop' && !app.proctor) app.proctor = { text: PROCTOR.shop[0] };
    go(v);
  },
  hero(v) { app.heroTab = v || 'stats'; go('hero'); },
  heroTab(v) { app.heroTab = v; render(); },
  heroStats() { closeModal(); app.heroTab = 'stats'; go('hero'); },
  heroGear() { closeModal(); app.heroTab = 'gear'; go('hero'); },
  craft() { closeModal(); go('craft'); },
  truth() { closeModal(); go('truth'); },
  modalBoxes() { openModal('boxes'); },
  settings() { openModal('settings'); },
  modal(v) { openModal(v); },
  closeModal() { closeModal(); render(); },
  overlay(_, el, ev) { if (ev.target === el && app.modal && !['report', 'evolve', 'flashback', 'cut'].includes(app.modal.type) && !(app.modal.type === 'boxes' && app.modal.opened && !app.modal.revealed)) { closeModal(); render(); } },
  dismissProctor() { const then = app.proctor && app.proctor.then; app.proctor = null; renderProctor(); if (then) then(); },
  dismissToast(v) { app.toastQ = (app.toastQ || []).filter((t) => t.id !== v); renderToasts(); },

  introTap() {
    if (app.introPhase === 'cut') {
      if (app.cutI < INTRO_CUTSCENE.length - 1) { app.cutI++; render(); return; }
      return ACTIONS.introSkip();
    }
    if (app.introTimer) { clearInterval(app.introTimer); app.introTimer = null; INTRO_LINES.forEach((l, i) => { const el = $(`#il${i}`); if (el) el.textContent = l; }); app.introDone = true; return; }
    if (!app.introStarted) return typeIntro();
    if (app.introDone) { app.introPhase = 'cut'; app.cutI = 0; render(); }
  },
  introSkip() {
    app.introPhase = null;
    s.intro = true;
    save(s);
    startBattle(0);
  },
  afterTutorial() {
    s.tutorial = 'boxes';
    go('home');
    say(PROCTOR.starterGrant[0], { wide: true, sticky: true });
    commit();
  },

  collect() {
    const r = E.collectReport(s);
    closeModal();
    if (r && r.boxes.length && s.tutorial === 'done') say(`${r.boxes.length} new loot box${r.boxes.length > 1 ? 'es' : ''}. Open ${r.boxes.length > 1 ? 'them' : 'it'}. You know you want to.`);
    commit();
  },
  openBox(v) {
    const o = E.openBox(s, v);
    if (!o) return;
    app.modal = { type: 'boxes', opened: o, revealed: false };
    renderModal();
    commit();
    setTimeout(() => { if (app.modal && app.modal.opened === o) { app.modal.revealed = true; renderModal(); } }, 750);
    if (s.tutorial === 'boxes' && s.boxes.length === 0) {
      s.tutorial = 'base';
      app.proctor = { text: s.inv.length ? 'Gear! Equip it from the Hero screen. Then go to your Base: your first building is free.' : 'Next: your Base. Your first building is free. I am feeling generous. It will pass.' };
    }
    if (s.trials.cleared[5] && Math.random() < 0.08) setTimeout(glitch, 1500);
  },
  openAll() {
    if (!s.boxes.length) return;
    const o = E.openAll(s);
    app.modal = { type: 'boxes', openedAll: o, revealed: false };
    renderModal();
    commit();
    setTimeout(() => { if (app.modal && app.modal.openedAll === o) { app.modal.revealed = true; renderModal(); } }, 750);
    if (s.tutorial === 'boxes') {
      s.tutorial = 'base';
      app.proctor = { text: s.inv.length ? 'Gear! Equip it from the Hero screen. Then go to your Base: your first building is free.' : 'Next: your Base. Your first building is free. I am feeling generous. It will pass.' };
    }
    if (s.trials.cleared[5] && Math.random() < 0.08) setTimeout(glitch, 1500);
  },
  openLatest() {
    const last = s.boxes[s.boxes.length - 1];
    if (last) ACTIONS.openBox(last.id);
  },
  claimGoal(v) { E.claimGoal(s, Number(v)); commit(); },
  claimBonus() { E.claimAllGoalsBonus(s); commit(); },
  claimWeekly() { E.claimWeekly(s); commit(); },

  addSteps(v) {
    E.ingestSteps(s, Number(v));
    closeModal();
    commit();
  },
  finishTimers() {
    for (const b of BUILDING_ORDER) if (s.base[b].job) s.base[b].job.ends = env.now();
    B.tickBase(s);
    stage.setBase(tiers());
    closeModal();
    commit();
  },
  fullscreen() { s.noFullscreen = false; enterFullscreen(); closeModal(); },
  installTip() { s.installTipSeen = true; save(s); render(); },
  uiStyle(v) { s.uiStyle = v; applyUiStyle(); app.modal = { type: 'settings' }; commit(); },
  tuning(v) { s.tuning = v; setTuning(v); app.modal = { type: 'settings' }; commit(); },
  reset() {
    if (!app.modal.confirm) { app.modal.confirm = true; renderModal(); return; }
    wipeSave();
    // reload with a fresh URL so the browser can't hand back a cached page
    location.replace(`${location.pathname}?fresh=${Date.now()}`);
  },

  // hero
  attr(v) {
    H.spendAttr(s, v);
    if (s.tutorial === 'level' && s.hero.freeAttr === 0) { s.tutorial = 'trials'; say('Stronger. Marginally. Now go to the Trials. Four easy ones. Then a less easy one.'); }
    commit();
  },
  rank(v) { H.rankUp(s, v); commit(); },
  loadout(v) { if (!H.toggleLoadout(s, v)) say(`Your loadout is full (${H.loadoutSize(s)}). Remove a skill first, or upgrade the Hero Training Altar.`); commit(); },
  train() {
    const need = xpToNext(s.hero.level) - s.hero.xp;
    const r = H.train(s, need);
    if (!r.ok && r.why === 'soles') say(pick(PROCTOR.noSoles));
    else if (r.ok) { E.goalEvent(s, 'train', 1); say(pick(PROCTOR.levelUp)); }
    commit();
  },
  train10() { const r = H.train(s, 10); if (r.ok) E.goalEvent(s, 'train', 1); commit(); },
  respec() { H.respec(s); commit(); },
  item(v) { openModal('item', { uid: v }); },
  booster(v) { openModal('booster', { key: v }); },
  equip(v) { H.equip(s, v); syncLook(); closeModal(); commit(); },
  autoEquip() { H.autoEquipBest(s); syncLook(); commit(); },
  salvage(v) { E.salvage(s, v); closeModal(); commit(); },
  useBooster(v) { if (E.useBooster(s, v)) say(`${BOOSTERS[v].name} active. ${BOOSTERS[v].desc}.`); closeModal(); commit(); },

  // shop
  buy(v) {
    const r = E.buy(s, Number(v));
    if (!r.ok) say(r.why === 'full' ? 'Your inventory is full. Upgrade it at the Base, or salvage something.' : pick(PROCTOR.noSoles));
    commit();
  },

  // base
  building(v) { openModal('building', { id: v }); },
  upgrade(v) {
    const r = B.startUpgrade(s, v);
    if (r.ok) {
      stage.setBase(tiers());
      if (r.instant) say(`${BUILDINGS[v].name} built. Instantly. Never again. Everything after this runs on timers.`);
      else say(pick(PROCTOR.build));
      if (s.tutorial === 'base') { s.tutorial = 'level'; setTimeout(() => say('You reached level 2 in that first fight. Spend your attribute points on the Hero screen.'), 2500); }
    } else if (r.why === 'cost') say(s.soles < r.cost.soles ? pick(PROCTOR.noSoles) : 'Not enough materials. Walking finds flint and bone. So do Trial replays.');
    closeModal();
    commit();
  },
  speed(v) { B.speedUp(s, v); stage.setBase(tiers()); commit(); },

  // crafting
  craftAdd(v) {
    const n = B.craftSlots(s);
    if (app.craft.slice(0, n).includes(v)) return;
    const i = app.craft.slice(0, n).findIndex((x) => !x);
    if (i >= 0) app.craft[i] = v; else app.craft[n - 1] = v;
    render();
  },
  craftClear(v) { app.craft[Number(v)] = null; render(); },
  craftFill(v) {
    const r = RECIPES.find((x) => x.id === v);
    const keys = Object.keys(r.inputs);
    app.craft = [keys[0] || null, keys[1] || null, keys[2] || null];
    render();
  },
  craftGo() {
    const r = B.craft(s, app.craft.slice(0, B.craftSlots(s)));
    if (r.ok) {
      say(`${r.learned ? 'New recipe learned! ' : ''}${pick(PROCTOR.craft)}`);
      app.craft = [null, null, null];
    } else {
      const msg = { studio: 'Build the Workshop first.', empty: 'Put at least two items in.', nothing: 'That makes nothing. Well, it makes a mess.', blueprint: 'There is a recipe here, but you need its blueprint. Bosses and rare boxes drop them.', tier: `This needs Workshop tier ${r.need}.`, amount: 'Not enough of something. Check the recipe amounts.' }[r.why];
      say(msg);
    }
    commit();
  },

  // truth board
  decode(v) {
    const r = B.decode(s, v);
    if (r.ok) openModal('frag', { id: v, flashback: r.flashback });
    else if (r.why === 'soles') say(pick(PROCTOR.noSoles));
    commit();
  },
  readFrag(v) { openModal('frag', { id: v }); },
  cutNext() {
    const m = app.modal;
    if (!m || m.type !== 'cut') return;
    if (m.i < m.shots.length - 1) { m.i++; renderModal(); return; }
    ACTIONS.cutSkip();
  },
  cutSkip() {
    const m = app.modal;
    if (!m || m.type !== 'cut') return;
    closeModal();
    render();
    if (m.done) m.done();
  },
  flashback(v) {
    const era = Number(v);
    if (!B.flashbackReady(s, era)) return;
    app.proctor = null;
    app.modal = { type: 'flashback', era, i: 0 };
    renderModal();
    renderProctor();
  },
  flashNext() {
    const m = app.modal;
    if (!m || m.type !== 'flashback') return;
    if (m.i < FLASHBACKS[m.era].panels.length - 1) { m.i++; renderModal(); return; }
    ACTIONS.flashSkip();
  },
  flashSkip(_, el, ev) {
    if (ev) ev.stopPropagation();
    const m = app.modal;
    if (!m || m.type !== 'flashback') return;
    const first = !s.flashbacksSeen.includes(m.era);
    B.markFlashbackSeen(s, m.era);
    closeModal();
    commit();
    if (first) setTimeout(() => say('That was a corrupted memory file. Nothing to see. Back to work.'), 400);
  },

  // evolve
  evolveGo() {
    if (!B.canEvolve(s)) return;
    app.modal = { type: 'evolve', choices: B.boonChoices(s) };
    renderModal();
  },
  pickBoon(v) {
    const r = B.evolve(s, v);
    closeModal();
    if (r) { go('era2'); say(`Evolved. Your leftover materials became ${r.converted} Soles. The next era is still loading. Even I have limits.`, { wide: true }); }
    commit();
  },

  // trials
  trial(v) {
    app.selectedTrial = v === '' ? null : Number(v);
    render();
  },
  fight(v) {
    if (s.tutorial === 'trials') s.tutorial = 'done';
    startBattle(Number(v));
  },
  target(v) { app.target = Number(v); render(); },
  skill(v) {
    const b = app.battle;
    if (!b || app.busy) return;
    if (!C.canUse(b, v)) {
      const sk = SKILLS[v];
      if (b.hero.cooldowns[v]) floatText('hero', `COOLDOWN ${b.hero.cooldowns[v]}`, 'info');
      else if (b.hero.ap < sk.ap) floatText('hero', 'NOT ENOUGH AP', 'info');
      else floatText('hero', 'ONCE A TURN', 'info');
      return;
    }
    runAction(() => C.useSkill(b, v, app.target));
  },
  endTurn() { runAction(() => C.endTurn(app.battle)); },
  retreat() {
    const b = app.battle;
    if (!b || app.busy) return;
    if (b.trial === 0) { say("There is no retreat from the tutorial. There's barely a retreat from anything."); return; }
    b.over = 'lose';
    endBattle();
  },
};

// ---------- Fullscreen ----------
const isStandalone = () => window.matchMedia('(display-mode: fullscreen)').matches || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const canFullscreen = () => !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
const isIOS = () => /iPhone|iPod/.test(navigator.userAgent);
const isPhone = () => window.matchMedia('(pointer: coarse)').matches && /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent);
function enterFullscreen() {
  if (isStandalone() || document.fullscreenElement || document.webkitFullscreenElement) return;
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) return;
  try {
    const p = req.call(el, { navigationUI: 'hide' });
    if (p && p.then) p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
  } catch (e) { /* not allowed here */ }
}
function fullscreenHelp() {
  if (isStandalone()) return '<span class="ok">Running fullscreen from your home screen.</span>';
  if (isIOS() || !canFullscreen()) return 'iPhone Safari can\'t go fullscreen from a web page. Tap <b>Share → Add to Home Screen</b>, then open The Ascent from its icon: it runs fullscreen with no browser bars.';
  return 'The game goes fullscreen on your first tap. If you left fullscreen, tap the button.';
}

function typeIntro() {
  app.introStarted = true;
  let li = 0, ci = 0;
  app.introTimer = setInterval(() => {
    const line = INTRO_LINES[li];
    const el = $(`#il${li}`);
    if (!el) return;
    ci++;
    el.textContent = line.slice(0, ci);
    el.classList.add('caret');
    if (ci >= line.length) {
      el.classList.remove('caret');
      li++;
      ci = 0;
      if (li >= INTRO_LINES.length) { clearInterval(app.introTimer); app.introTimer = null; app.introDone = true; }
    }
  }, 28);
}

function onClick(ev) {
  const el = ev.target.closest('[data-a]');
  if (!el) return;
  const fn = ACTIONS[el.dataset.a];
  if (!fn) return;
  if (el.dataset.a === 'overlay' && ev.target !== el) return;
  fn(el.dataset.v, el, ev);
}

// +100 steps: tap, or hold to keep walking.
function bindHold() {
  let timer = null, count = 0;
  const step = () => {
    E.ingestSteps(s, 100);
    count++;
    const btn = document.querySelector('[data-hold="steps"]');
    if (btn) {
      const r = btn.getBoundingClientRect();
      const d = document.createElement('div');
      d.className = 'dmg info';
      d.textContent = '+100';
      d.style.left = `${r.left + r.width / 2}px`;
      d.style.top = `${r.top}px`;
      $('#float').appendChild(d);
      setTimeout(() => d.remove(), 900);
    }
    if (count % 5 === 0 || !timer) commit();
  };
  const stop = () => { if (timer) { clearInterval(timer); timer = null; commit(); } };
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('[data-hold="steps"]')) return;
    e.preventDefault();
    count = 0;
    step();
    timer = setInterval(step, 140);
  });
  document.addEventListener('pointerup', stop);
  document.addEventListener('pointercancel', stop);
  document.addEventListener('pointerleave', stop);
}

// exposed for debugging in the console
window.ascent = { get state() { return s; }, get stage() { return stage; }, app, E, B, H, C, T };
