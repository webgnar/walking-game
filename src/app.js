// The game app: screens, actions and the combat controller. Renders HTML over the Three.js stage.
import { Stage, STRIKE_MS } from './scene/stage.js';
import { env, load, save, wipeSave, newState, toast, pick, SAVE_KEY, dayKey } from './logic/state.js';
import {
  SKILLS, SKILL_ORDER, ENEMIES, TRIALS, ATTRS, GEAR, SLOTS, SLOT_NAMES, BOOSTERS, RECIPES, BUILDINGS, BUILDING_ORDER,
  INVENTORY_SLOTS, MATERIALS, BOONS, xpToNext, setTuning, TUNING_PRESETS, FINISHERS, FINISHER_ORDER, FURY, TRAITS, ACTS, LOADOUT_MAX, STAR_REWARDS, PARTS, AFFIXES, QUALITY, REINFORCE_MAX, SETS } from './data/era1.js';
import { INTRO_LINES, INTRO_CUTSCENE, PROCTOR, FRAGMENTS, FLASHBACKS, FORMER_TRIBUTE, ACHIEVEMENTS, TRANSMISSIONS, FLICKERS, PROCTOR_SLIP } from './data/story.js';
import * as ST from './logic/story.js';
import * as GR from './logic/gear.js';
import { IC, WREATH } from './ui/icons.js';
import { gi, gearGi } from './ui/gameIcons.js';
import { loadUiAssets } from './ui/assets.js';
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
  recipe: 'r_flint_club', part: null, selectedTrial: null, lastReward: null, boonChoices: null,
};
const $ = (sel) => document.querySelector(sel);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n) => Math.floor(n).toLocaleString('en-US');
// Icons: emoji placeholders until a PNG is dropped into src/icons/ (see docs/icon-list.md).
const ICON_ID = {
  weapon: 'slot-weapon', armor: 'slot-armor', helm: 'slot-helm', offhand: 'slot-offhand', trinket: 'slot-trinket',
  flint: 'mat-flint', bone: 'mat-bone', wood: 'mat-wood', stride_brew: 'boost-stride-brew', lucky_knot: 'boost-lucky-knot', warpaint: 'boost-warpaint',
  fang: 'part-fang', claw: 'part-claw', tine: 'part-tine', hide: 'part-hide', ember: 'part-ember',
};
const ICON = Object.fromEntries(Object.entries(ICON_ID).map(([k, id]) => [k, gi(id)]));
const TIER_ICON = Object.fromEntries(['bronze', 'silver', 'gold', 'platinum', 'legendary', 'celestial'].map((t) => [t, gi(`box-${t}`)]));
const gearIcon = gearGi;
const SOLE = gi('cur-soles');
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
  loadUiAssets();
  stage.setBase(tiers());
  for (const t of TRANSMISSIONS) if (s.trials.cleared[t.trial]) ST.startTransmission(s, t.id);
  if (!s.intro) go('intro');
  else if (s.tutorial === 'fight') startBattle(0);
  else { go('home'); say(pick(PROCTOR.home)); }
  stage.snapCamera();
  document.addEventListener('click', onClick);
  bindSpin();
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
  const looks = {}, ids = {};
  for (const g of H.equippedGear(s)) { looks[g.slot] = g.look; ids[g.slot] = g.key; }
  stage.setHeroLook(looks, ids);
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
  // keep each scrolling list where it was when the same screen redraws (e.g. spending points)
  const keep = app.lastRendered === app.screen ? [...$('#ui').querySelectorAll('.scroll')].map((el) => el.scrollTop) : [];
  $('#ui').innerHTML = fn();
  if (keep.length) {
    // restore now, and again once icons have loaded and the list is full height
    const restore = () => $('#ui').querySelectorAll('.scroll').forEach((el, i) => { if (keep[i] && el.scrollTop < keep[i]) el.scrollTop = keep[i]; });
    restore();
    requestAnimationFrame(restore);
    $('#ui').querySelectorAll('.scroll img').forEach((img) => { if (!img.complete) img.addEventListener('load', restore, { once: true }); });
  }
  app.lastRendered = app.screen;
  renderModal();
  renderProctor();
  renderToasts();
  follow(true);
}

// Soles everywhere (with the walking rate under them); flint and bone only on the
// screens where they're spent: Base, Workshop and Shop.
const MAT_SCREENS = ['base', 'craft', 'shop'];
function curPlate() {
  const mats = MAT_SCREENS.includes(app.screen);
  return `<div class="cur">
      <span class="c soles" title="Soles">${SOLE}<span class="sv">${fmt(s.soles)}<small class="rate">1 Sole = ${E.stepsPerSole(s)} steps</small></span></span>
      ${mats ? `<i>/</i><span class="c" title="Flint">${ICON.flint}${s.mats.flint}</span><i>/</i><span class="c" title="Bone">${ICON.bone}${s.mats.bone}</span><i>/</i><span class="c" title="Wood">${ICON.wood}${s.mats.wood || 0}</span>` : ''}
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

const BUILD = typeof __BUILD__ !== 'undefined' ? __BUILD__ : 'dev';
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
const roman = (n) => ROMAN[n] || String(n);

// ---------- Home (imperial layout; every frame is an image slot, see docs/ui-assets.md) ----------
function homeTop() {
  const era = s.era === 1 ? 'Primal' : 'Brick';
  const today = E.todaySteps(s);
  const toBox = E.STEPS_PER_BOX - s.steps.towardBox;
  const seg = Math.floor(s.steps.towardBox / 100); // 10 segments, one per 100 steps
  const stride = s.active.strideUntil > env.now();
  return `
    <button class="ui-gear sq" data-a="settings" aria-label="Settings">${IC.gear}</button>
    <div class="ui-id">
      <div class="ui-portrait"><i></i></div>
      <div class="ui-idplate"><div class="t1">${esc(era)}</div><div class="t2">Subject 7,301,224</div><div class="t3">Level ${roman(s.hero.level)}</div></div>
    </div>
    <div class="ui-steps ${s.soles < 100 && !s.report ? 'needwalk' : ''}" data-a="walkHint"><div class="lbl">Today <b>${fmt(today)}</b> steps <span>·</span> next loot box in <b>${fmt(toBox)}</b>${stride ? ' <span>·</span> <em>Stride Brew</em>' : ''}</div>
      <div class="segs">${Array.from({ length: 10 }, (_, i) => `<i class="${i < seg ? 'on' : ''}"></i>`).join('')}</div></div>
    <div class="ui-res">
      <span class="c" title="Soles">${SOLE}${fmt(s.soles)}<small class="rate">1 Sole = ${E.stepsPerSole(s)} steps</small></span>
    </div>`;
}

// The flashing notice over the hero: only when there's something to do there.
function heroNotice() {
  const h = s.hero;
  const sp = h.freeAttr + h.freeSkill;
  const owned = Object.keys(h.ranks).length;
  const better = s.inv.some((it) => {
    if (H.isEquipped(s, it.uid)) return false;
    const cur = s.inv.find((x) => x.uid === h.equip[GEAR[it.key].slot]);
    return !cur || GR.itemScore(it) > GR.itemScore(cur);
  });
  const [tab, text] = sp ? ['stats', `${sp} point${sp > 1 ? 's' : ''} to spend`]
    : better ? ['gear', 'New gear to equip']
      : h.loadout.length < Math.min(LOADOUT_MAX, owned) ? ['skills', 'Choose your skills'] : [null, null];
  if (!tab) return '';
  return `<button class="ui-points pulse" data-a="hero" data-v="${tab}"><span>${gi('act-points')}</span>${text}</button>`;
}

// Something new on the Truth Board: a part ready to decode, or a memory ready to play.
function truthNews() {
  return FRAGMENTS.some((f) => B.fragmentState(s, f) === 'decodable' && s.soles >= f.cost) || (B.flashbackReady(s, 1) && !s.flashbacksSeen.includes(1));
}

function homePlate(cls, icon, label, sub, attrs, badge) {
  return `<button class="ui-plate ${cls}" ${attrs}><span class="uicon ic-${icon}">${IC[icon]}</span><span class="tx"><span class="l">${label}</span><span class="sub">${sub}</span></span>${badge ? `<span class="badge">${badge}</span>` : ''}</button>`;
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
    return `<div class="ui-home">
    ${homeTop()}
    <div class="ui-banner"><i class="pole"></i><i class="cloth">${WREATH}</i></div>
    <div class="ui-notes">
      ${s.report ? `<button class="btn small ui-report ${hint('report')}" data-a="modal" data-v="report">Expedition report · ${fmt(s.report.steps)} steps</button>` : ''}
      ${s.signal ? `<button class="ui-signal" data-a="modal" data-v="signal"><span class="dot"></span>A signal from ${esc(FORMER_TRIBUTE)}</button>` : ''}
    </div>
    <div class="ui-left">
      ${homePlate(`dark big ${hint('base')}`, 'base', 'Base', 'Command · Develop · Survive', 'data-a="go" data-v="base"', truthNews() ? '!' : jobs)}
      ${homePlate('dark', 'shop', 'Shop', 'Supply · Gear · Upgrade', 'data-a="go" data-v="shop"')}
      ${homePlate('dark', 'goals', 'Goals', 'Missions · Progress · Rewards', 'data-a="modal" data-v="goals"', goalsReady)}
    </div>
    <div class="ui-right">
      ${homePlate(`crimson big ${hint('trials')}`, 'trials', 'Trials', 'Prove · Rank · Ascend', 'data-a="go" data-v="map"')}
      ${homePlate(`dark ${hint('boxes')}`, 'boxes', 'Boxes', 'Loot · Rewards · Artifacts', 'data-a="modal" data-v="boxes"', s.boxes.length)}
      ${s.boxes.length > 1 ? '<button class="btn small openall" data-a="openAll">Open all</button>' : ''}
    </div>
    <div class="herotap" data-a="hero" data-v="${sp ? 'stats' : 'gear'}" aria-label="Open hero"></div>
    ${heroNotice()}
    <button class="ui-stepbtn" data-hold="steps"><span class="medal"><span class="uicon ic-steps">${IC.sole}</span></span><span class="tx"><span class="l">+100 Steps</span><span class="sub">Hold to keep walking</span></span><span class="test">Test</span></button>
    <button class="ui-trophy sq" data-a="modal" data-v="achievements" title="Achievements">${IC.trophy}</button>
    ${isIOS() && !isStandalone() && !s.installTipSeen ? `<div class="installtip panel pad" data-a="installTip"><b>Play fullscreen:</b> tap the Share button (square with an arrow), then <b>Add to Home Screen</b>, and open The Ascent from its icon. <span class="muted">(tap to hide)</span></div>` : ''}
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
        <div class="bn">${gi(`bld-${b}`)} ${BUILDINGS[b].short}</div>
        <div class="tiers">${[1, 2, 3].map((t) => `<i class="${st.tier >= t ? 'on' : ''}"></i>`).join('')}</div>
        ${st.job ? `<div class="timer">${gi('act-timer')} <span data-timer="${b}">${timeLeft(st.job)}</span></div>` : st.tier === 0 ? `<div class="timer">${s.firstBuildFree ? 'Build free!' : 'Not built'}</div>` : ''}
      </div>`;
    }).join('')}
    <div style="position:absolute;right:calc(var(--sr) + 12px);bottom:calc(var(--sb) + 10px)" class="row">
      <button class="btn small ${evolveReady ? 'yellow pulse' : 'ghost'}" data-a="modal" data-v="evolve">${gi('act-evolve')} Evolve</button>
      <button class="btn small ghost" data-a="go" data-v="truth">${gi('bld-truth')} Truth Board</button>
      <button class="btn small ghost" data-a="go" data-v="craft">${gi('bld-studio')} Craft</button>
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
          <button class="btn small ${s.soles >= it.price ? 'yellow' : 'off'}" style="width:100%;margin-top:6px" data-a="buy" data-v="${i}">${SOLE} ${it.price}</button>
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
    ${topbar('Trials · Primal', `${Object.keys(s.trials.cleared).filter((k) => k > 0).length}/15 cleared · ★ ${T.totalStars(s)}/45${s.eraKey ? ' · Era Key ✔' : ''}`, 'home', `${gi('act-home')} Home`)}
    <div class="map">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${pts.map((p) => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="#c9a24c" stroke-width="0.35" stroke-dasharray="1.2 1.2" opacity=".6"/></svg>
      ${nodes.map((t) => {
        const p = pos(t.n);
        const done = !!s.trials.cleared[t.n];
        const open = T.trialUnlocked(s, t.n);
        const cls = [t.boss === 'mini' ? 'mini' : t.boss === 'era' ? 'era' : '', done ? 'done' : open ? 'open' : 'lock'].join(' ');
        const st = s.trials.stars[t.n] || 0;
        return `<div class="node ${cls}" style="left:${p.x}%;top:${p.y}%" data-a="trial" data-v="${t.n}">${t.boss === 'era' ? gi('node-era-boss') : t.boss === 'mini' ? gi('node-mini-boss') : t.n}<span class="lbl">${t.boss ? esc(t.name) : `Lv ${t.level}`}${done ? `<b class="nstars">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</b>` : ''}</span></div>`;
      }).join('')}
      ${ACTS.map((a, i) => `<div class="actlbl" style="top:${14 + i * 30}%">Act ${roman(a.n)} · ${esc(a.name)}</div>`).join('')}
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
      <div class="hp hero"><i style="width:${(hp('hero', h.hp) / h.maxHp) * 100}%"></i><span class="tx">${hp('hero', h.hp)}/${h.maxHp}</span>${bl('hero', h.block) ? `<span class="bl">${gi('st-block')}${bl('hero', h.block)}</span>` : ''}</div>
      ${h.finisher ? `<div class="fury ${h.fury >= FURY.max ? 'full' : ''}" title="Fury: fills as you hit and get hit. Full Fury lets you finish a marked enemy."><i style="width:${(h.fury / FURY.max) * 100}%"></i><span>Fury</span></div>` : ''}
      ${h.bleed ? `<div class="status bad">${gi('st-bleed')} Bleeding ${h.bleed.dmg} × ${h.bleed.turns}</div>` : ''}
      ${h.warpaint ? `<div class="status warn">${ICON.warpaint} Warpaint +3 damage</div>` : ''}
    </div>
    <button class="iconbtn" style="position:absolute;top:calc(var(--st) + 6px);left:calc(var(--sl) + 8px);display:none"></button>
    <button class="btn tiny ghost" style="position:absolute;top:calc(var(--st) + 6px);right:calc(var(--sr) + 8px)" data-a="retreat">${gi('act-retreat')} Retreat</button>
    ${b.enemies.filter((e) => !e.dead || (sh[e.uid] && sh[e.uid].hp > 0)).map((e) => {
      const il = C.intentLabel(e);
      const ex = !e.dead && C.executable(e) && h.finisher;
      return `<div class="hpbox ${e.uid === app.target && alive.length > 1 ? 'target' : ''} ${ex ? 'exec' : ''}" data-anchor="${e.uid}" data-a="target" data-v="${e.uid}">
        <div class="intent ${il.cls}">${gi(il.ic, il.icon)} ${esc(il.text)}${il.note ? `<span class="note">${esc(il.note)}</span>` : ''}</div>
        <div class="nm">${ex ? `<span class="skull">${gi('st-execute')}</span>` : ''}${esc(e.name)}</div>
        <div class="traits">${(ENEMIES[e.id].traits || []).filter((k) => k !== 'fireFear').map((k) => `<span>${esc(TRAITS[k].name)}</span>`).join('')}</div>
        <div class="hp"><i style="width:${(hp(e.uid, e.hp) / e.maxHp) * 100}%"></i><span class="tx">${hp(e.uid, e.hp)}/${e.maxHp}</span>${bl(e.uid, e.block) ? `<span class="bl">${gi('st-block')}${bl(e.uid, e.block)}</span>` : ''}</div>
        <div class="status">${e.burn ? `${gi('st-burn')}${e.burn.dmg}×${e.burn.turns} ` : ''}${e.feared ? `${gi('st-scared')} ` : ''}${e.snarl ? `${gi('st-buff')} ` : ''}${e.stompBonus ? `+${e.stompBonus} stomp` : ''}</div>
      </div>`;
    }).join('')}
    <div class="skillbar">
      <div class="apbox"><div class="comic" style="font-size:14px">AP</div><div class="apdots">${Array.from({ length: Math.max(3, h.ap) }, (_, i) => `<i class="${i < h.ap ? 'on' : ''}"></i>`).join('')}</div></div>
      ${b.loadout.map((id) => {
        const sk = SKILLS[id];
        const cd = h.cooldowns[id] || 0;
        return `<div class="sk ${C.canUse(b, id) && !app.busy ? '' : 'no'}" data-a="skill" data-v="${id}">
          <span class="ap">${sk.ap}</span><span class="si">${gi(`skill-${sk.id}`)}</span><span class="sn">${sk.name}</span>
          <span class="sp">${skillShort(id, b)}</span>${cd ? `<span class="cd">${cd}</span>` : ''}</div>`;
      }).join('')}
      ${h.finisher ? (() => { const f = FINISHERS[h.finisher]; const ok = C.canFinish(b) && !app.busy; return `<div class="sk fin ${ok ? 'ready' : 'no'}" data-a="finish" title="${esc(f.desc)}"><span class="ap">${FURY.ap}</span><span class="si">${gi(`fin-${f.id}`)}</span><span class="sn">${esc(f.name)}</span><span class="sp">${h.fury >= FURY.max ? (C.canFinish(b) ? 'Finish!' : `needs ${gi('st-execute')}`) : `Fury ${h.fury}%`}</span></div>`; })() : ''}
    </div>`;
  },

  reward() {
    const r = app.lastReward;
    if (!r) return '';
    const t = TRIALS.find((x) => x.n === r.n);
    if (r.result !== 'win') {
      return `<div class="overlay"><div class="dialog panel halftone" style="text-align:center">
        <div class="tierlabel" style="color:var(--red);font-size:44px">DEFEAT</div>
        <p class="defline">"${esc(r.line)}"</p>
        ${lossAdvice(t)}
        <div class="actions" style="justify-content:center"><button class="btn" data-a="go" data-v="home">Home</button><button class="btn cyan" data-a="go" data-v="map">Back to the map</button>
        <button class="btn pink" data-a="fight" data-v="${r.n}">Try again</button></div>
      </div></div>`;
    }
    const cards = [];
    if (r.starter) {
      cards.push(card(SOLE, `${r.starter.soles} Soles`, 'Starter grant'));
      cards.push(card(TIER_ICON.bronze, `${r.starter.boxes} Bronze loot boxes`, 'Starter grant'));
    }
    if (r.xp) cards.push(card(gi('cur-xp'), `${r.xp} XP`, r.first ? 'First win' : ''));
    if (r.box) cards.push(card(TIER_ICON[r.box], `${E.TIER_NAMES[r.box]} loot box`, 'Added to your boxes'));
    cards.push(...matCards(r.mats));
    cards.push(...matCards(r.parts, 'Beast part'));
    for (const g of r.gear) cards.push(card(gearIcon(g), GEAR[g].name, statText(GEAR[g].stats), `${GEAR[g].tier === 'boss' ? 'boss' : ''} ${GEAR[g].set ? 'set' : ''}`));
    if (r.respec) cards.push(card(gi('cur-respec'), 'Respec token', 'Reset your points once'));
    for (const id of r.blueprints || []) cards.push(card(gi('cur-blueprint'), 'Blueprint', B.recipeName(RECIPES.find((x) => x.id === id)), 'rare'));
    if (r.fragment) cards.push(card(gi('cur-fragment'), 'Story fragment', 'Pinned to the Truth Board', 'frag'));
    if (r.eraKey) cards.push(card(gi('cur-era-key'), 'ERA KEY', 'Primal → Brick', 'boss'));
    if (r.finisher) cards.push(card(gi(`fin-${r.finisher}`), `Finisher: ${FINISHERS[r.finisher].name}`, FINISHERS[r.finisher].desc, 'boss'));
    for (const sr of r.starRewards || []) cards.push(card(TIER_ICON[sr.box], `${E.TIER_NAMES[sr.box]} loot box`, `${sr.stars} stars reached`, 'rare'));
    return `<div class="overlay"><div class="dialog panel halftone wide" style="text-align:center">
      <div class="tierlabel" style="color:var(--yellow);font-size:44px">${r.first ? 'VICTORY!' : 'REPLAY CLEARED'}</div>
      <div class="muted">${t.n === 0 ? 'First Trial' : `Trial ${t.n}: ${esc(t.name)}`}${r.flawless ? ' · <span class="ok">no damage taken</span>' : ''}</div>
      ${r.starList ? `<div class="stars">${[0, 1, 2].map((i) => `<span class="${i < r.stars ? 'on' : ''}">★</span>`).join('')}${r.newBest && r.stars > 1 ? '<em>new best</em>' : ''}</div>
        <div class="small muted">${['Win', 'Above half health', `Within ${t.par} turns`].map((l, i) => `${r.starList[i] ? '✔' : '✖'} ${l}`).join(' · ')}</div>` : ''}
      <div class="sep"></div>
      <div class="loot compact">${(cards.length > 6 ? cards.slice(0, 5) : cards).join('')}${cards.length > 6 ? `<div class="lootcard more"><div class="li">+${cards.length - 5}</div>more<small>in your inventory</small></div>` : ''}${cards.length ? '' : '<span class="muted">Nothing this time. Replays drop materials and the odd piece of worn gear.</span>'}</div>
      <div class="actions" style="justify-content:center">
        ${r.box ? `<button class="btn yellow" data-a="openLatest">Open the loot box</button>` : ''}
        ${r.n === 0 ? `<button class="btn cyan pulse" data-a="afterTutorial">Continue</button>` : `<button class="btn" data-a="go" data-v="home">Home</button><button class="btn cyan" data-a="go" data-v="map">Back to the map</button>`}
      </div>
    </div></div>`;
  },

  craft() {
    const studio = s.base.studio.tier;
    const r = RECIPES.find((x) => x.id === app.recipe) || RECIPES[0];
    const known = s.recipes.includes(r.id);
    const part = app.part && (s.mats[app.part] || 0) > 0 ? app.part : null;
    const check = B.canForge(s, r, part);
    const g = r.out.gear && GEAR[r.out.gear];
    const set = g && g.set && SETS[g.set];
    const why = { studio: 'Build the Workshop first.', blueprint: 'You need this blueprint.', tier: `Needs Workshop tier ${check.need}.`, amount: 'Not enough materials.', full: 'Your inventory is full.', slot: '' }[check.why] || '';
    const parts = Object.keys(PARTS).filter((k) => (s.mats[k] || 0) > 0);
    const list = RECIPES.map((x) => {
      const k = s.recipes.includes(x.id);
      const xg = x.out.gear && GEAR[x.out.gear];
      const src = Object.entries({ 5: 'the Alpha', 10: 'the Sabretooth' }).find(([n]) => (['r_wolf_pelt', 'r_fang_charm'].includes(x.id) && n === '5') || (['r_lion_mask', 'r_claw_buckler'].includes(x.id) && n === '10'));
      return `<div class="recipe ${x.id === r.id ? 'on' : ''} ${k ? '' : 'locked'}" data-a="pickRecipe" data-v="${x.id}">
        <span class="ri">${xg ? gearIcon(x.out.gear) : ICON[x.out.booster]}</span>
        <span class="grow"><span class="rn ${k && xg && xg.set ? 'setname' : ''}">${k ? esc(B.recipeName(x)) : 'Unknown blueprint'}</span>
        <span class="small muted">${k ? (xg && xg.set ? `${esc(SETS[xg.set].name)} set` : xg ? SLOT_NAMES[xg.slot] : 'Booster') : src ? `Dropped by ${src[1]}` : 'Found in Gold+ loot boxes'}</span></span>
        ${k && B.canForge(s, x).ok ? '<span class="ok small">✔</span>' : ''}</div>`;
    }).join('');
    return `${topbar('Workshop', `Tier ${studio} · ${B.partSlot(s) ? 'part slot open' : 'part slot at tier 2'}`, 'base')}
    <div class="screen">
      <div class="col panel pad" style="width:min(300px,36vw)">
        <h3 class="h">Recipes</h3>
        <div class="scroll grow">${list}</div>
      </div>
      <div class="col grow panel halftone pad forgepanel">
        ${known ? `<div class="row"><span style="font-size:40px">${g ? gearIcon(r.out.gear) : ICON[r.out.booster]}</span><div class="grow">
          <h2 class="h ${set ? 'setname' : ''}" style="margin:0">${esc(B.recipeName(r))}</h2>
          <div class="small">${g ? `${SLOT_NAMES[g.slot]} · ${statText(g.stats)}` : esc(BOOSTERS[r.out.booster].desc)}</div>
          ${set ? `<div class="small setline">${esc(set.name)} set · ${Object.entries(set.bonus).map(([n, b]) => `${n}: ${esc(b.text)}`).join(' · ')}</div>` : ''}</div>
          <button class="btn yellow ${check.ok ? 'pulse' : 'off'}" data-a="forgeStart">${gi('bld-studio')} Forge</button></div>
        <div class="sep"></div>
        <div class="small"><b>Needs</b> ${matList(r.mats, part ? { [part]: 1 } : {})}${check.ok ? '' : ` <span class="warn">· ${esc(why)}</span>`}</div>
        ${g ? `<h3 class="h" style="margin-top:8px">Part slot <span class="small muted">· special effect</span></h3>
        ${B.partSlot(s) ? `<div class="partrow"><button class="chip ${part ? '' : 'on'}" data-a="pickPart" data-v="">None</button>${parts.map((k) => `<button class="chip ${part === k ? 'on' : ''}" data-a="pickPart" data-v="${k}">${ICON[k]} ${esc(PARTS[k].name)} <b>${s.mats[k]}</b></button>`).join('') || '<span class="small muted">No parts yet. Beasts drop them, and so do Silver+ loot boxes.</span>'}</div>
          ${part ? `<div class="small ok">${esc(AFFIXES[PARTS[part].affix].name)}: ${esc(AFFIXES[PARTS[part].affix].desc)}</div>` : ''}` : '<div class="small muted">Upgrade the Workshop to tier 2 to add a beast part for a special effect.</div>'}` : ''}
        <div class="small muted" style="margin-top:6px">Forging: strike the anvil three times in rhythm. Better timing, better quality.</div>`
        : `<div class="muted" style="margin:auto;text-align:center">This blueprint hasn't been found yet.</div>`}
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
    const live = ST.activeTransmission(s);
    const txEntry = (t) => s.transmissions.cleared.includes(t.id)
      ? `<div class="entry msg tx"><div class="ch">Transmission</div><div class="ek">Signal cleared · from ${esc(FORMER_TRIBUTE)}</div><p>${esc(t.text)}</p></div>`
      : live && live.id === t.id ? `<div class="entry msg tx live"><div class="ch">Transmission · incoming</div><div class="ek">Signal ${Math.floor(live.frac * 100)}% · from ${esc(FORMER_TRIBUTE)}</div><p>${esc(ST.signalText(live, live.frac))}</p><div class="mbar"><i style="width:${live.frac * 100}%"></i></div><div class="small">Walk ${fmt(live.left)} more steps to clear the signal.</div></div>` : '';
    const parts = list.map((f, i) => {
      const st = B.fragmentState(s, f);
      const from = f.from ? `<span class="from">${esc(f.from)}</span>` : '';
      const head = `<div class="ch">Part ${i + 1}</div>`;
      if (st === 'missing') return `<div class="entry missing">${head}<div class="et">Not found yet</div><div class="small">Walk and open loot boxes. Pieces turn up after the Alpha Wolf.</div></div>`;
      if (st === 'decoded') return `<div class="entry ${f.from ? 'msg' : ''}" data-a="readFrag" data-v="${f.id}">${head}<div class="ek">${esc(f.kind)}${from}</div><div class="et">${esc(f.title)}</div><p>${esc(f.text)}</p></div>`;
      return `<div class="entry redacted">${head}<div class="ek">${esc(f.kind)}${from}</div><div class="et">${esc(f.title)}</div>
        <p class="fx">${esc(f.text.slice(0, 90))}</p>
        ${st === 'decodable' ? `<button class="btn tiny yellow" data-a="decode" data-v="${f.id}">Decode · ${SOLE}${f.cost}</button>` : `<div class="small" style="color:#8a2a20">Needs Truth Board tier ${f.level}</div>`}
      </div>`;
    });
    // One story: each transmission sits between the parts where it arrives.
    const story = [];
    for (let i = 0; i <= parts.length; i++) {
      for (const t of TRANSMISSIONS.filter((x) => x.after === i)) story.push(txEntry(t));
      if (i < parts.length) story.push(parts[i]);
    }
    return `${topbar('Truth Board', `Tier ${tier} · ${done}/${list.length} decoded`, 'base')}
    <div class="screen"><div class="col grow panel pad truthboard">
      <div class="tbhead">
        ${live ? `<div class="memory signalcard"><div class="grow"><div class="mk">Incoming signal · ${esc(FORMER_TRIBUTE)}</div><div class="mt">${Math.floor(live.frac * 100)}%</div><div class="small">Walk ${fmt(live.left)} steps to clear it.</div><div class="mbar"><i style="width:${live.frac * 100}%"></i></div></div></div>` : ''}
        <div class="memory ${ready ? 'ready' : ''}">
          <div class="grow"><div class="mk">Flashback · Primal era</div><div class="mt">${esc(fb.title)}</div>
            ${ready ? '<div class="small">Every piece decoded. The memory is whole.</div>' : `<div class="small">Decode all ${list.length} parts to recover it.</div><div class="mbar"><i style="width:${(done / list.length) * 100}%"></i></div>`}</div>
          <button class="btn small ${ready ? 'yellow' : 'off'}" data-a="flashback" data-v="${era}">${ready ? (s.flashbacksSeen.includes(era) ? `${gi('act-play')} Watch again` : `${gi('act-play')} Play memory`) : `${gi('act-locked')} ${done}/${list.length}`}</button>
        </div>
      </div>
      <div class="scroll grow story">${story.join('')}</div>
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
    ? `<img class="cutart" src="${esc(sh.art)}" alt="">${(sh.glows || []).map((g, k) => `<i class="sglow ${g.strong ? 'strong' : ''} ${g.dust ? 'dust' : ''} ${g.fire ? 'fire' : ''} ${g.eye ? 'eye' : ''}" style="left:${g.x};top:${g.y};animation-delay:${k * 0.13}s"></i>`).join('')}`
    : `<div class="cutph"><div class="speed"></div>${sh.icon ? `<div class="cutico ${sh.glow ? 'glow' : ''}">${sh.icon}</div>` : ''}<div class="brief">ART: ${esc(sh.brief)}</div></div>`;
  // per-shot text placement over real art
  const at = (k) => (sh.at && sh.at[k] ? ` style="${Object.entries(sh.at[k]).map(([p, v]) => `${p}:${v}`).join(';')}"` : '');
  return `<div class="cut ${sh.style === 'flash' ? 'flash' : ''}" data-a="${tapA}" key="${i}">
    <div class="cutpanel ${sh.art ? 'art' : ''}">${pic}${sh.style === 'flash' && sh.art ? '<i class="whiteout"></i>' : ''}
      ${sh.caption ? `<div class="cap"${at('caption')}>${esc(sh.caption)}</div>` : ''}
      ${sh.sfx ? `<div class="sfx code"${at('sfx')}>${[...sh.sfx].map((c, k) => `<i style="--k:${k}">${esc(c)}</i>`).join('')}<b class="caret"></b></div>` : ''}
      ${sh.thought ? `<div class="thought"${at('thought')}>${esc(sh.thought)}</div>` : ''}
      ${sh.voice ? `<div class="voice"${at('voice')}><b>${esc(sh.voice.who)}</b>${esc(sh.voice.text)}</div>` : ''}
    </div>${dots}${skip}</div>`;
}

// ---------- Forge: hammer timing ----------
// The marker sweeps back and forth; strike when it crosses the gold zone in the middle.
function hammerPos(m) {
  const t = (performance.now() - m.t0) / m.period;
  return (Math.sin(t * Math.PI * 2 - Math.PI / 2) + 1) / 2;
}
function hammerLoop() {
  const m = app.modal;
  if (!m || m.type !== 'forge' || m.result) return;
  const el = $('#hmark');
  if (el) el.style.left = `${hammerPos(m) * 100}%`;
  requestAnimationFrame(hammerLoop);
}
function finishForge(quality) {
  const m = app.modal;
  if (!m || m.type !== 'forge' || m.result) return;
  const r = B.forge(s, m.recipe.id, m.part, quality);
  if (!r.ok) { closeModal(); say('The forge sputtered. Check your materials.'); return; }
  m.result = r;
  if (s.mats[app.part] <= 0) app.part = null;
  renderModal();
  say(quality === 'masterwork' ? 'A Masterwork. I am almost impressed. Almost.' : quality === 'crude' ? 'Crude. It will still hurt something. Probably you.' : pick(PROCTOR.craft));
  commit();
}

function card(icon, title, sub = '', cls = '') {
  return `<div class="lootcard ${cls}"><div class="li">${icon}</div>${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
}
function itemName(k) {
  return MATERIALS[k] ? MATERIALS[k].name : PARTS[k] ? PARTS[k].name : GEAR[k] ? GEAR[k].name : BOOSTERS[k] ? BOOSTERS[k].name : k;
}
// "3 Flint + 2 Wood", red where you don't have enough
function matList(mats, extra = {}) {
  const need = { ...mats };
  for (const [k, n] of Object.entries(extra)) need[k] = (need[k] || 0) + n;
  return Object.entries(need).map(([k, n]) => `<span class="${(s.mats[k] || 0) >= n ? '' : 'bad'}">${ICON[k] || ''}${n} ${esc(itemName(k))}</span>`).join(' · ');
}
function matCards(mats, sub = '') {
  return Object.entries(mats || {}).filter(([, n]) => n > 0).map(([k, n]) => card(ICON[k] || '?', `${n} ${itemName(k)}`, PARTS[k] ? 'Beast part' : sub, PARTS[k] ? 'part' : ''));
}
function itemIcon(k) {
  return ICON[k] || (GEAR[k] ? gearIcon(k) : '?');
}
function skillShort(id, b) {
  const sk = SKILLS[id];
  const p = b.powers[id];
  const st = b.hero.stats;
  if (sk.kind === 'physical') return `${p + st.str + st.weapon + b.hero.warpaint} dmg${sk.pierce ? ' pierce' : ''}`;
  if (sk.kind === 'sweep') return `${p + Math.floor(st.str / 2) + Math.floor(st.weapon / 2) + b.hero.warpaint} all`;
  if (sk.kind === 'heal') return `heal ${p + st.vit}`;
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
  for (const e of t.enemies) { const k = ENEMIES[e.replace('!', '')].name; names[k] = (names[k] || 0) + 1; }
  const traits = [...new Set(t.enemies.flatMap((e) => ENEMIES[e.replace('!', '')].traits || []))];
  const under = s.hero.level < t.level;
  const stars = s.trials.stars[n] || 0;
  const partNames = [...new Set(t.enemies.flatMap((e) => Object.keys(PARTS).filter((p) => PARTS[p].drops.includes(e.replace('!', '')))))].map((p) => PARTS[p].name);
  const rewards = done ? `Replay: materials${partNames.length ? `, often a ${partNames.join(' or ')}` : ''}` : `${t.xp} XP, materials${partNames.length ? `, ${partNames.join(' / ')}` : ''}${t.boss ? `, ${t.boss === 'era' ? 'Platinum' : 'Gold'} loot box, boss gear, set blueprints` : ''}${t.boss === 'mini' ? ', a finisher, respec token' : ''}${t.boss === 'era' ? ', ERA KEY' : ''}`;
  const act = ACTS.find((x) => x.n === t.act);
  return `<div class="trialcard panel halftone pad">
    <button class="x" data-a="trial" data-v="">✕</button>
    ${act ? `<div class="small actname">Act ${roman(act.n)} · ${esc(act.name)}</div>` : ''}
    <div class="comic" style="font-size:22px;color:var(--yellow)">Trial ${n}: ${esc(t.name)}</div>
    ${t.line ? `<div class="small"><i>${esc(t.line)}</i></div>` : ''}
    <div class="small" style="margin-top:4px">${Object.entries(names).map(([k, v]) => `${v > 1 ? `${v}× ` : ''}${k}`).join(', ')}</div>
    ${traits.length ? `<div class="tc-traits">${traits.map((k) => `<div><b>${esc(TRAITS[k].name)}</b> ${esc(TRAITS[k].desc)}</div>`).join('')}</div>` : ''}
    <div class="small">Suggested level <b class="${under ? 'warn' : 'ok'}">${t.level}</b> · you are ${s.hero.level} · <span class="stars sm">${[1, 2, 3].map((i) => `<span class="${i <= stars ? 'on' : ''}">★</span>`).join('')}</span> <span class="muted">3rd star: ${t.par} turns</span></div>
    <div class="small">Your skills: ${s.hero.loadout.map((id) => esc(SKILLS[id].name)).join(', ')}${s.hero.finisher ? ` · ${esc(FINISHERS[s.hero.finisher].name)}` : ''} <a href="#" data-a="hero" data-v="skills">Change</a></div>
    <div class="small muted" style="margin:4px 0">${rewards}</div>
    ${open ? `<button class="btn pink" style="width:100%" data-a="fight" data-v="${n}">${done ? 'Replay' : 'Fight'} ${gi('act-fight')}</button>` : `<div class="small bad">Beat Trial ${n - 1} first.</div>`}
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
      <button class="btn small ${!atCap && s.soles >= cost ? 'yellow' : 'off'}" data-a="train">${gi('act-train')} Train to level ${h.level + 1} · ${SOLE}${fmt(cost)}</button>
      ${!atCap && s.soles >= H.trainCost(s, 10) && s.soles < cost ? `<button class="btn small" data-a="train10">+10 XP · ${SOLE}${H.trainCost(s, 10)}</button>` : ''}
      ${h.respecTokens ? `<button class="btn small ghost" data-a="respec">${gi('cur-respec')} Respec (${h.respecTokens})</button>` : ''}
    </div>
    <div class="small muted">Training costs ${H.trainCost(s, 1)} Soles per XP. First wins of Trials give XP too.</div>
    <div class="sep"></div>
    ${h.freeAttr ? `<div class="ok small">You have ${h.freeAttr} attribute point${h.freeAttr > 1 ? 's' : ''} to spend.</div>` : ''}
    ${Object.entries(ATTRS).map(([k, a]) => `<div class="stat"><span class="k">${a.short}</span><span class="v">${st[k]}</span><span class="d">${a.desc}${st[k] !== h.attrs[k] ? ` <span class="ok">(+${st[k] - h.attrs[k]} gear)</span>` : ''}</span>${h.freeAttr ? `<button class="plus" data-a="attr" data-v="${k}">+</button>` : ''}</div>`).join('')}
    <div class="sep"></div>
    <div class="row wrap small">
      <span>${gi('stat-health')} Health <b>${st.maxHp}</b></span><span>${gi('stat-weapon')} Weapon <b>+${st.weapon}</b></span><span>${gi('stat-crit')} Crit <b>${Math.round(st.crit * 100)}%</b></span><span>${gi('stat-dodge')} Dodge <b>${Math.round(st.dodge * 100)}%</b></span><span>${gi('stat-ap')} AP carry <b>${st.apCarry}</b></span>
    </div>
    ${h.boons.length ? `<div class="small" style="margin-top:6px">Boons: ${h.boons.map((id) => BOONS.find((b) => b.id === id).name).join(', ')}</div>` : ''}`;
}

function heroSkillsTab() {
  const h = s.hero;
  const max = H.maxRank(s);
  const size = H.loadoutSize(s);
  const fin = `<h3 class="h" style="margin-top:10px">Finisher <span class="small muted">· one equipped · fill Fury, then finish an enemy marked ${gi('st-execute')}</span></h3>
  ${FINISHER_ORDER.map((id) => {
    const f = FINISHERS[id];
    const own = h.finishers.includes(id);
    const eq = h.finisher === id;
    const buy = !own && f.price ? H.canBuyFinisher(s, id) : null;
    return `<div class="skill ${own ? '' : 'locked'}"><div class="si">${gi(`fin-${f.id}`)}</div><div class="grow"><div class="sname">${esc(f.name)}</div><div class="small">${esc(f.desc)}</div>${own ? '' : `<div class="small muted">${esc(f.how)}${f.price ? ` · ${SOLE}${f.price}` : ''}</div>`}</div>
      ${own ? `<button class="btn tiny ${eq ? 'cyan' : 'ghost'}" data-a="equipFinisher" data-v="${id}">${eq ? 'Equipped' : 'Equip'}</button>` : f.price ? `<button class="btn tiny ${buy.ok ? 'yellow' : 'off'}" data-a="buyFinisher" data-v="${id}">Buy</button>` : ''}</div>`;
  }).join('')}`;
  return `<div class="small muted">Bring ${size} into a fight: choose for the Trial ahead · max rank ${max} (upgrade the Hero Training Altar for more) · ${h.freeSkill} skill point${h.freeSkill === 1 ? '' : 's'}</div>
  ${SKILL_ORDER.map((id) => {
    const sk = SKILLS[id];
    const rank = h.ranks[id];
    const inL = h.loadout.includes(id);
    if (!rank) {
      const avail = h.level >= sk.unlock;
      return `<div class="skill ${avail ? 'learnable' : 'locked'}"><div class="si">${gi(`skill-${sk.id}`)}</div><div class="grow"><div class="sname">${sk.name}<span class="ap">${sk.ap} AP</span></div>
        <div class="small">${avail ? sk.desc(H.skillPower(s, id)) : `Available at level ${sk.unlock}`}</div></div>
        ${avail ? `<button class="btn tiny ${h.freeSkill ? 'yellow' : 'off'}" data-a="learn" data-v="${id}">Learn · 1 point</button>` : ''}</div>`;
    }
    return `<div class="skill"><div class="si">${gi(`skill-${sk.id}`)}</div><div class="grow"><div class="sname">${sk.name}<span class="ap">${sk.ap} AP</span> <span class="rank">${'◆'.repeat(rank)}<span style="opacity:.35">${'◇'.repeat(3 - rank)}</span></span></div>
      <div class="small">${sk.desc(H.skillPower(s, id))}</div></div>
      ${h.freeSkill && rank < max && sk.power ? `<button class="btn tiny green" data-a="rank" data-v="${id}">+2</button>` : ''}
      <button class="btn tiny ${inL ? 'cyan' : 'ghost'}" data-a="loadout" data-v="${id}">${inL ? 'In loadout' : 'Add'}</button></div>`;
  }).join('')}${fin}`;
}

function heroGearTab() {
  const used = E.invUsed(s), cap = E.invCapacity(s);
  const tab = app.invTab || 'gear';
  const boosters = Object.entries(s.boosters).filter(([, n]) => n > 0);
  const junk = E.junkGear(s);
  const slots = `<div class="slots">${SLOTS.map((sl) => {
    const g = H.gearOf(s, s.hero.equip[sl]);
    return `<div class="slot ${g ? 'full' : ''} ${g && g.set ? 'set' : ''} ${g && g.q ? `q-${g.q}` : ''}" ${g ? `data-a="item" data-v="${g.uid}"` : ''}><span class="sn">${SLOT_NAMES[sl]}</span>${g ? `<span style="font-size:20px">${gearIcon(g.key)}</span>${esc(GR.itemName(g))}` : `<span style="font-size:20px;opacity:.3">${ICON[sl]}</span>`}</div>`;
  }).join('')}</div>
  ${GR.setStatus(s).filter((x) => x.n > 0).map((x) => `<div class="small setline">${esc(x.set.name)} ${x.n}/3 · ${Object.entries(x.set.bonus).map(([n, b]) => `<span class="${x.n >= Number(n) ? 'ok' : 'muted'}">${n}: ${esc(b.text)}</span>`).join(' · ')}</div>`).join('')}`;
  const tabs = `<div class="invtabs">
    <button class="tab ${tab === 'gear' ? 'on' : ''}" data-a="invTab" data-v="gear">Gear ${used}/${cap}</button>
    <button class="tab ${tab === 'use' ? 'on' : ''}" data-a="invTab" data-v="use">Consumables${boosters.length ? ` (${boosters.reduce((a, [, n]) => a + n, 0)})` : ''}</button>
    <span class="grow"></span>
    ${tab === 'gear' ? `<button class="btn tiny ${junk.length ? '' : 'off'}" data-a="modal" data-v="salvageJunk">Salvage junk${junk.length ? ` (${junk.length})` : ''}</button><button class="btn tiny ghost" data-a="autoEquip">Equip best</button>` : ''}
  </div>`;
  if (tab === 'use') {
    return `${slots}${tabs}
    <div class="small muted" style="margin:2px 0 6px">No storage limit. Consumables, materials and parts never take inventory slots.</div>
    <div class="small" style="margin-bottom:6px">${[...Object.keys(MATERIALS), ...Object.keys(PARTS)].filter((k) => s.mats[k]).map((k) => `${ICON[k]} ${s.mats[k]} ${esc(itemName(k))}`).join(' · ') || 'No materials yet.'}</div>
    <div class="grid">${boosters.map(([k, n]) => `<div class="cell" data-a="booster" data-v="${k}"><span class="gi">${ICON[k]}</span>${esc(BOOSTERS[k].name)}<span class="n">${n}</span></div>`).join('') || '<span class="muted small">No consumables yet. They turn up in loot boxes and the Workshop.</span>'}</div>`;
  }
  const junkIds = new Set(junk.map((it) => it.uid));
  const cells = s.inv.map((it) => {
    const g = GEAR[it.key];
    return `<div class="cell t-${g.tier} ${g.set ? 'set' : ''} ${it.q ? `q-${it.q}` : ''} ${H.isEquipped(s, it.uid) ? 'eq' : ''} ${junkIds.has(it.uid) ? 'junk' : ''}" data-a="item" data-v="${it.uid}"><span class="gi">${gearIcon(it.key)}</span>${esc(GR.itemName(it))}</div>`;
  });
  while (cells.length < cap) cells.push('<div class="cell empty"></div>');
  return `${slots}${tabs}<div class="grid">${cells.join('')}</div>`;
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
      <h2 class="h">${gi('cur-report')} Expedition report</h2>
      <div class="muted small">While you were out</div>
      <div class="body">
      ${(r.transmissions || []).map((id) => `<div class="txmsg cleared"><div class="txh">${gi('cur-signal')} Signal cleared · ${esc(FORMER_TRIBUTE)}</div><p>${esc(ST.txById(id).text)}</p></div>`).join('')}
      <div class="loot" style="margin:10px 0">
        ${card(gi('cur-steps'), `${fmt(r.steps)} steps`)}
        ${card(SOLE, `${fmt(r.soles)} Soles`, `${E.stepsPerSole(s)} steps per Sole`)}
        ${r.boxes.map((t) => card(TIER_ICON[t], `${E.TIER_NAMES[t]} box`)).join('')}
        ${matCards(r.mats, 'found on the way').join('')}
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
        ${m.revealed ? `<div class="loot body">${o.items.map((it, i) => lootCard(it, Math.min(i, 12))).join('')}</div>` : `<div class="bigbox tier-${E.TIERS.filter((t) => o.tiers[t]).pop()}">${TIER_ICON[E.TIERS.filter((t) => o.tiers[t]).pop()]}</div>`}
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
      <h2 class="h">${gi('hdr-boxes')} Loot boxes</h2>
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
      <h2 class="h">${gi('hdr-goals')} Daily goals</h2>
      <div class="body">
      ${g.list.map((it, i) => {
        const d = E.GOAL_POOL[it.id];
        const done = E.goalDone(it);
        const p = Math.min(1, it.progress / d.target);
        return `<div class="skill"><div class="si">${gi(it.claimed ? 'goal-done' : done ? 'goal-ready' : 'goal-open')}</div><div class="grow"><div class="sname">${d.text}</div>
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
      <h2 class="h">${gi('hdr-trophy')} Achievements ${got}/${ACHIEVEMENTS.length}</h2>
      <div class="body">${ACHIEVEMENTS.map((a) => {
        const has = s.achievements[a.id];
        return `<div class="skill ${has ? '' : 'locked'}"><div class="si">${gi(has ? 'ach-unlocked' : 'ach-locked')}</div><div class="grow"><div class="sname">${has ? esc(a.name) : '???'}</div>
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
      action = `<div class="row"><span class="grow">${gi('act-timer')} Upgrading to tier ${st.job.to}: <b data-timer="${b}">${timeLeft(st.job)}</b> left</span><button class="btn small ${s.soles >= c ? 'yellow' : 'off'}" data-a="speed" data-v="${b}">Finish now · ${SOLE}${c}</button></div>`;
    } else if (cost) {
      const ok = free || B.canAfford(s, cost);
      action = `<div class="row wrap"><span class="grow small">${free ? '<b class="ok">Your first building is free and instant.</b>' : `Tier ${cost.to}: ${SOLE}${cost.soles} · ${matList(cost.mats)} · ${gi('act-timer')}${cost.minutes >= 60 ? `${cost.minutes / 60}h` : `${cost.minutes}m`}`}</span>
        <button class="btn small ${ok ? 'yellow' : 'off'} ${free ? 'pulse' : ''}" data-a="upgrade" data-v="${b}">${st.tier ? 'Upgrade' : 'Build'}</button></div>`;
    } else action = '<div class="ok">Max tier for this era.</div>';
    const use = { studio: ['craft', `${gi('bld-studio')} Craft`], altar: ['heroStats', `${gi('act-train')} Train hero`], inventory: ['heroGear', `${gi('act-inventory')} Open inventory`], shrine: ['modalBoxes', `${TIER_ICON.bronze} Loot box odds`], truth: ['truth', `${gi('bld-truth')} Open board`] }[b];
    return `<div class="dialog panel halftone">
      <button class="x" data-a="closeModal">✕</button>
      <h2 class="h">${gi(`bld-${b}`)} ${def.name}</h2>
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
    const set = g.set && SETS[g.set];
    const owned = set ? set.pieces.map((k) => ({ k, eq: GR.equippedItems(s).some((x) => x.key === k) })) : [];
    const rc = B.reinforceCost(it);
    return `<div class="dialog panel halftone" style="width:min(460px,92vw)">
      <button class="x" data-a="closeModal">✕</button>
      <div class="row"><span style="font-size:44px">${gearIcon(it.key)}</span><div><h2 class="h ${set ? 'setname' : ''}">${esc(GR.itemName(it))}</h2><div class="small muted">${SLOT_NAMES[g.slot]} · ${esc(QUALITY[it.q || 'fine'].name)} · ${g.tier}</div></div></div>
      <div style="margin:8px 0">${statText(GR.itemStats(it))}</div>
      ${it.affix ? `<div class="small ok">${esc(AFFIXES[it.affix].name)}: ${esc(AFFIXES[it.affix].desc)}</div>` : ''}
      ${set ? `<div class="small setline">${esc(set.name)} set: ${owned.map((o) => `<span class="${o.eq ? 'ok' : 'muted'}">${o.eq ? '✔' : '·'} ${esc(GEAR[o.k].name)}</span>`).join(', ')}<br>${Object.entries(set.bonus).map(([n, b]) => `<span class="${owned.filter((o) => o.eq).length >= Number(n) ? 'ok' : 'muted'}">${n} pieces: ${esc(b.text)}</span>`).join(' · ')}</div>` : ''}
      ${cur && !eq ? `<div class="small muted">Equipped now: ${esc(GR.itemName(cur))} (${statText(cur.stats)})</div>` : ''}
      ${rc ? `<div class="small" style="margin-top:6px">Reinforce to +${rc.plus}: ${matList(rc.mats)}</div>` : '<div class="small muted" style="margin-top:6px">Fully reinforced (+5).</div>'}
      <div class="actions">
        ${eq ? '' : `<button class="btn small ghost" data-a="salvage" data-v="${it.uid}">Salvage → ${ICON.flint}${sv.flint} ${ICON.bone}${sv.bone}</button>`}
        ${rc ? `<button class="btn small ${B.hasMats(s, rc.mats) ? 'green' : 'off'}" data-a="reinforce" data-v="${it.uid}">Reinforce +${rc.plus}</button>` : ''}
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

  forge(m) {
    if (m.result) {
      const it = m.result.item;
      return `<div class="dialog panel halftone reveal" style="align-items:center;text-align:center;width:min(460px,92vw)">
        <div class="tierlabel" style="color:${it && it.q === 'masterwork' ? 'var(--gold2)' : it && it.q === 'crude' ? '#b9a58a' : '#f1e3c2'}">${it ? esc(QUALITY[it.q].name.toUpperCase()) : 'FORGED'}</div>
        ${it ? `<div class="loot">${lootCard({ type: 'gear', key: it.key, inst: it }, 0)}</div>${it.affix ? `<div class="small ok">${esc(AFFIXES[it.affix].desc)}</div>` : ''}` : `<div class="loot">${lootCard({ type: 'booster', key: m.recipe.out.booster }, 0)}</div>`}
        <div class="actions" style="justify-content:center">${it ? `<button class="btn" data-a="equipNew" data-v="${it.uid}">Equip</button>` : ''}<button class="btn cyan" data-a="closeModal">Done</button></div>
      </div>`;
    }
    const n = m.strikes.length;
    return `<div class="dialog panel halftone forge" data-a="hammer" style="width:min(520px,94vw);text-align:center">
      <div class="small muted">${esc(B.recipeName(m.recipe))}${m.part ? ` · ${esc(AFFIXES[PARTS[m.part].affix].name)}` : ''}</div>
      <h2 class="h" style="margin:4px 0">Strike ${Math.min(3, n + 1)} of 3</h2>
      <div class="anvil ${m.flash ? `hit-${m.flash}` : ''}" key="${n}"><div class="zone good"></div><div class="zone perfect"></div><div class="marker" id="hmark"></div>${m.flash ? `<span class="hitword">${m.flash === 'perfect' ? 'PERFECT!' : m.flash === 'good' ? 'GOOD' : 'MISS'}</span>` : ''}</div>
      <div class="strikes">${[0, 1, 2].map((i) => `<span class="${m.strikes[i] || ''}">${m.strikes[i] ? m.strikes[i].toUpperCase() : '·'}</span>`).join('')}</div>
      <div class="small muted">Tap anywhere when the marker crosses the gold. Two perfect strikes make a Masterwork.</div>
      <div class="actions" style="justify-content:center"><button class="btn tiny ghost" data-a="forgeSkip">Skip (Fine quality)</button></div>
    </div>`;
  },

  signal() {
    const sg = s.signal;
    if (!sg) return '';
    const live = sg.kind === 'tx' ? ST.activeTransmission(s) : null;
    const def = sg.kind === 'tx' ? ST.txById(sg.id) : null;
    const text = sg.kind === 'tx' ? (live && live.id === sg.id ? ST.signalText(live, live.frac) : def.text) : sg.text;
    return `<div class="dialog signalnote">
      <button class="x" data-a="closeSignal">✕</button>
      <div class="nk">${esc(FORMER_TRIBUTE)}</div>
      <p>${esc(text)}</p>
      ${live && live.id === sg.id ? `<div class="small">The signal is weak. Walk ${fmt(live.left)} more steps to clear it.</div>` : ''}
      <div class="actions"><button class="btn small" data-a="closeSignal">Close</button><button class="btn small yellow" data-a="signalTruth">Open the Truth Board</button></div>
    </div>`;
  },

  salvageJunk() {
    const junk = E.junkGear(s);
    const soles = junk.reduce((a, it) => a + E.soleValue(it.key), 0);
    return `<div class="dialog panel halftone" style="width:min(520px,92vw)">
      <button class="x" data-a="closeModal">✕</button>
      <h2 class="h">Salvage junk</h2>
      <div class="small muted">Gear you can safely lose: not equipped, no better than what you're wearing in that slot, and not the one copy a recipe needs. Boss and rare gear is never included.</div>
      <div class="body" style="margin:8px 0">${junk.length ? `<div class="grid">${junk.map((it) => `<div class="cell t-${GEAR[it.key].tier}"><span class="gi">${gearIcon(it.key)}</span>${esc(GEAR[it.key].name)}<span class="n">${SOLE}${E.soleValue(it.key)}</span></div>`).join('')}</div>` : '<span class="muted">Nothing to salvage.</span>'}</div>
      ${junk.length ? `<div class="actions"><button class="btn ghost" data-a="closeModal">Cancel</button><button class="btn yellow" data-a="salvageJunkGo">Salvage ${junk.length} for ${SOLE}${fmt(soles)}</button></div>` : ''}
    </div>`;
  },

  frag(m) {
    const f = FRAGMENTS.find((x) => x.id === m.id);
    return `<div class="dialog notepaper ${f.from ? 'msg' : ''}">
      <button class="x" data-a="closeModal">✕</button>
      <div class="nk">${esc(f.kind)}${f.from ? ` · from ${esc(f.from)}` : ''}</div>
      <h2 class="nt">${esc(f.title)}</h2>
      <p>${esc(f.text)}</p>
      ${m.flashback ? `<div class="actions" style="justify-content:space-between;align-items:center"><span class="small" style="color:#8a2a20">The last piece. Something is surfacing…</span><button class="btn yellow" data-a="flashback" data-v="${m.flashback}">▶ Play memory</button></div>` : ''}</div>`;
  },

  cut(m) {
    return cutShot(m.shots[m.i], m.i, m.shots.length, 'cutNext', 'cutSkip');
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
        <h2 class="h">${gi('act-evolve')} Choose a Boon</h2>
        <div class="small muted">PROCTOR offers three. You keep one, forever.</div>
        <div class="loot" style="margin:10px 0">${m.choices.map((b) => `<div class="lootcard rare" style="width:170px;cursor:pointer" data-a="pickBoon" data-v="${b.id}"><div class="li">${gi('cur-boon')}</div>${esc(b.name)}<small>${esc(b.desc)}</small></div>`).join('')}</div>
      </div>`;
    }
    const checks = B.evolveChecks(s);
    return `<div class="dialog panel halftone">
      <button class="x" data-a="closeModal">✕</button>
      <h2 class="h">${gi('act-evolve')} Evolve to Era 2</h2>
      <div class="body">${checks.map((c) => `<div class="${c.ok ? 'ok' : 'muted'}">${c.ok ? '✔' : '○'} ${c.label}</div>`).join('')}
      <div class="sep"></div>
      <div class="small muted">When you evolve: choose 1 of 3 Boons, get a free respec, and your leftover flint and bone turn into Soles.${s.evolved ? ' <b class="ok">Already evolved.</b>' : ''}</div></div>
      <div class="actions"><button class="btn ${B.canEvolve(s) ? 'yellow pulse' : 'off'}" data-a="evolveGo">Evolve</button></div>
    </div>`;
  },

  settings(m) {
    return `<div class="dialog panel halftone">
      <button class="x" data-a="closeModal">✕</button>
      <h2 class="h">${gi('hdr-settings')} Settings</h2>
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
        ${!isStandalone() && canFullscreen() && !isIOS() ? `<div class="row" style="margin-top:6px"><button class="btn small cyan" data-a="fullscreen">${gi('act-fullscreen')} Go fullscreen</button></div>` : ''}
        <div class="sep"></div>
        <h3 class="h">Combat numbers</h3>
        <div class="small muted">"Tuned" raises enemy health ×1.25 and damage ×1.5, and lets Guard be used once a turn. "GDD v1" uses the design document's table exactly.</div>
        <div class="row" style="margin:6px 0">${Object.keys(TUNING_PRESETS).map((k) => `<button class="tab ${(s.tuning || 'tuned') === k ? 'on' : ''}" data-a="tuning" data-v="${k}">${k === 'gdd' ? 'GDD v1' : 'Tuned'}</button>`).join('')}</div>
        <div class="sep"></div>
        <h3 class="h">Progress</h3>
        <div class="small"><span class="ok">✔ Autosaves after every action</span> <span class="muted">(in this browser only; no accounts yet).</span></div>
        <div class="small muted"> Total steps ${fmt(s.steps.total)} · Soles earned ${fmt(s.solesEarned)} · Trials won ${s.trials.wins}</div>
        <div class="row" style="margin-top:6px"><button class="btn small ${m.confirm ? 'pink' : 'ghost'}" data-a="reset">${m.confirm ? 'Tap again to wipe everything and restart' : `${gi('act-reset')} Reset game`}</button></div>
        <div class="small muted" style="margin-top:8px">Version ${__BUILD__}</div>
      </div></div>`;
  },
};

function rewardText(r) {
  if (!r) return '';
  return [r.soles ? `${SOLE}${r.soles} Soles` : '', r.box ? `${E.TIER_NAMES[r.box]} loot box` : ''].filter(Boolean).join(' + ');
}

function lootCard(it, i) {
  const d = `style="animation-delay:${i * 0.12}s"`;
  switch (it.type) {
    case 'mat': return `<div class="lootcard" ${d}><div class="li">${ICON[it.key]}</div>${it.n} ${MATERIALS[it.key].name}</div>`;
    case 'part': return `<div class="lootcard part" ${d}><div class="li">${ICON[it.key]}</div>${it.n} ${PARTS[it.key].name}<small>Beast part</small></div>`;
    case 'gear': { const g = GEAR[it.key]; const inst = it.inst || { key: it.key }; return `<div class="lootcard ${g.tier === 'rare' ? 'rare' : g.tier === 'boss' ? 'boss' : ''} ${g.set ? 'set' : ''}" ${d}><div class="li">${gearIcon(it.key)}</div>${esc(GR.itemName(inst))}<small>${statText(GR.itemStats(inst))}${inst.affix ? ` · ${esc(AFFIXES[inst.affix].name)}` : ''}${it.salvaged ? ' (bag full: salvaged)' : ''}</small></div>`; }
    case 'frag': return `<div class="lootcard frag" ${d}><div class="li">${gi('cur-fragment')}</div>Story fragment<small>Pinned to the Truth Board</small></div>`;
    case 'booster': return `<div class="lootcard" ${d}><div class="li">${ICON[it.key]}</div>${it.n > 1 ? `${it.n} × ` : ''}${esc(BOOSTERS[it.key].name)}<small>${esc(BOOSTERS[it.key].desc)}</small></div>`;
    case 'blueprint': return `<div class="lootcard rare" ${d}><div class="li">${gi('cur-blueprint')}</div>Blueprint<small>${esc(B.recipeName(RECIPES.find((r) => r.id === it.id)))}</small></div>`;
    case 'respec': return `<div class="lootcard" ${d}><div class="li">${gi('cur-respec')}</div>Respec token</div>`;
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
  let bldgTop = Infinity;
  const bldgs = [];
  document.querySelectorAll('[data-anchor]').forEach((el) => {
    const id = el.dataset.anchor;
    const p = stage.anchor(/^\d+$/.test(id) ? Number(id) : id, 0.15);
    if (!p) return;
    el.style.left = `${p.x}px`;
    // Base labels share one line (the highest building's), so timers never knock them out of line
    if (el.classList.contains('bldg')) { bldgs.push(el); bldgTop = Math.min(bldgTop, p.y); return; }
    el.style.top = `${Math.max(el.classList.contains('hpbox') ? 92 : 70, p.y)}px`;
  });
  for (const el of bldgs) el.style.top = `${Math.max(64, bldgTop - 40)}px`;
  if (once !== true) requestAnimationFrame(follow);
}

function floatText(who, text, cls = '') {
  const p = stage.anchor(who, -0.5);
  if (!p) return;
  const d = document.createElement('div');
  d.className = cls.includes('pow') ? 'pow' : cls.includes('tag') ? 'ftag' : cls.includes('fin') ? 'ffin' : `dmg ${cls}`;
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
        if (sk.kind === 'stun') floatText('hero', 'ROAR', 'tag');
        // strikes land on the swing's contact frame, at the peak of the lunge
        await wait(sk.kind === 'block' || sk.kind === 'stun' ? 200 : STRIKE_MS);
        break;
      }
      case 'finish': {
        const f = FINISHERS[e.kind];
        app.proctor = null;
        const contact = stage.finisher(e.kind, e.who);
        await wait(contact);
        floatText(e.who, f.name.toUpperCase(), 'fin');
        $('#ui').classList.remove('bloodflash'); void $('#ui').offsetWidth; $('#ui').classList.add('bloodflash');
        await wait(820);
        break;
      }
      case 'heal':
        if (app.shown) app.shown.hero = { hp: e.hpAfter, block: (app.shown.hero || {}).block || 0 };
        floatText('hero', `+${e.amt}`, 'heal');
        render();
        await wait(250);
        break;
      case 'fury': render(); break;
      case 'ap': floatText('hero', `+${e.amt} AP`, 'info'); render(); await wait(200); break;
      case 'resist': floatText(e.who, 'RESISTS', 'info'); await wait(250); break;
      case 'hit':
        if (app.shown && e.hpAfter !== undefined) app.shown[e.who] = { hp: e.hpAfter, block: e.blockAfter };
        if (e.finish) { render(); break; }
        if (e.who === 'hero') {
          stage.impact('hero', { dmg: e.dmg });
          stage.anim('hero', 'hit');
          floatText('hero', e.dmg ? `-${e.dmg}` : 'BLOCKED', `hero ${e.dmg ? '' : 'info'}`);
          if (e.dmg >= 12) { $('#ui').classList.remove('shake'); void $('#ui').offsetWidth; $('#ui').classList.add('shake'); }
        } else {
          stage.impact(e.who, { dmg: e.dmg, crit: e.crit, armored: e.armored, kind: e.kind });
          stage.anim(e.who, 'hit');
          floatText(e.who, e.dmg ? `${e.dmg}` : 'BLOCKED', `${e.crit ? 'crit' : ''} ${e.kind === 'burn' ? 'info' : ''} ${e.dmg ? '' : 'info'}`);
          if (e.crit) floatText(e.who, 'CRITICAL', 'tag');
          if (e.armored) floatText(e.who, 'ARMOR', 'tag');
        }
        render();
        await wait(e.kind === 'burn' ? 350 : e.who === 'hero' ? 450 : 250);
        break;
      case 'die':
        if (e.finish) break; // the finishing move already played the kill
        stage.anim(e.who, 'die');
        await wait(350);
        break;
      case 'act': {
        const en = app.battle.enemies.find((x) => x.uid === e.who);
        const it = en && ENEMIES[en.id].intents[e.key];
        if (it && (it.kind === 'attack' || it.kind === 'bleed')) stage.anim(e.who, 'attack', { dist: en.id === 'mammoth' ? 1.6 : 2.2 });
        else if (it && it.kind === 'block') { stage.anim(e.who, 'block'); floatText(e.who, it.label.toUpperCase(), 'info'); }
        else if (it) { stage.anim(e.who, 'cast', { skill: e.key }); floatText(e.who, it.label.toUpperCase() + '!', 'info'); }
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
      case 'interrupt': floatText(e.who, 'INTERRUPTED', 'tag'); await wait(250); break;
      case 'dodge': floatText('hero', 'DODGE', 'info'); await wait(250); break;
      case 'block': if (e.who === 'hero') floatText('hero', `+${e.amt} BLOCK`, 'info'); await wait(150); break;
      case 'summon': stage.setEnemies(C.living(app.battle)); render(); floatText(e.who, 'CALLS THE PACK', 'tag'); await wait(500); break;
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
  if (!b.loadout.some((id) => C.canUse(b, id)) && !C.canFinish(b)) {
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
  s.signal = { kind: 'tx', id };
  save(s);
  nudge(`A broken signal from ${FORMER_TRIBUTE}. Check it on Home.`, true);
  render();
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
  say(text, { glitch: true, sticky: true, who: FORMER_TRIBUTE, then: () => say(pick(PROCTOR.glitchDismiss)) });
}

// A small note that fades on its own. eerie: styled as a signal from 7,301,223.
function nudge(text, eerie = false) {
  const el = document.createElement('div');
  el.className = `nudge ${eerie ? 'eerie' : ''}`;
  el.innerHTML = `<b>${eerie ? esc(FORMER_TRIBUTE) : 'PROCTOR'}</b>${esc(text)}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

// Defeat: what to do next, tailored to where the player is.
function lossAdvice(t) {
  const tips = [];
  const pts = s.hero.freeAttr + s.hero.freeSkill;
  if (pts) tips.push(`You have ${pts} unspent point${pts > 1 ? 's' : ''}. Spend them on the Hero screen.`);
  if (s.hero.level < t.level) tips.push(`You're level ${s.hero.level}; this Trial suggests ${t.level}. Train at the Hero Training Altar to level up.`);
  if (RECIPES.some((r) => r.out.gear && B.canForge(s, r).ok)) tips.push('You can forge something stronger in the Workshop right now.');
  if (BUILDING_ORDER.some((b) => { const c = B.upgradeCost(s, b); return c && !s.base[b].job && B.canAfford(s, c); })) tips.push('You can afford a Base upgrade.');
  const traits = [...new Set(t.enemies.flatMap((e) => ENEMIES[e.replace('!', '')].traits || []))].filter((k) => k !== 'fireFear');
  if (traits.length) tips.push(`Read the Trial card: ${traits.map((k) => TRAITS[k].name).join(', ')}. Pick your 4 skills to answer it.`);
  return `<div class="lossadvice">
    <div class="small">(Walking earns Soles. Spend them to train your hero, forge better gear and upgrade your Base, then come back stronger.)</div>
    ${tips.length ? `<ul>${tips.slice(0, 3).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
  </div>`;
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
  overlay(_, el, ev) { if (ev.target === el && app.modal && !['report', 'evolve', 'flashback', 'cut', 'forge'].includes(app.modal.type) && !(app.modal.type === 'boxes' && app.modal.opened && !app.modal.revealed)) { closeModal(); render(); } },
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
  closeSignal() { s.signal = null; closeModal(); commit(); setTimeout(() => say(pick(PROCTOR.glitchDismiss)), 300); },
  signalTruth() { s.signal = null; closeModal(); go('truth'); commit(); },
  walkHint() { say(`Walk to earn Soles and loot boxes: every ${E.stepsPerSole(s)} steps is a Sole, every 1,000 steps a loot box. Soles train your hero, forge gear and grow your Base. Tap to close.`, { sticky: true }); },
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
  learn(v) {
    if (!H.learnSkill(s, v)) { nudge(s.hero.freeSkill ? 'Not available yet.' : 'You need a skill point. Level up: win a Trial for the first time, or train at the Hero Training Altar.'); return; }
    say(`${SKILLS[v].name} learned.${s.hero.loadout.includes(v) ? ' It is in your loadout.' : ' Add it to your loadout to bring it into a Trial.'}`);
    commit();
  },
  loadout(v) { if (!H.toggleLoadout(s, v)) say(`Your loadout is full (${H.loadoutSize(s)}). Remove a skill first, or upgrade the Hero Training Altar.`); commit(); },
  train() {
    const need = xpToNext(s.hero.level) - s.hero.xp;
    const r = H.train(s, need);
    if (!r.ok && r.why === 'soles') nudge(`Not enough Soles. Go for a walk: every ${E.stepsPerSole(s)} steps earns a Sole.`);
    else if (r.ok) { E.goalEvent(s, 'train', 1); say(pick(PROCTOR.levelUp)); }
    commit();
  },
  train10() { const r = H.train(s, 10); if (r.ok) E.goalEvent(s, 'train', 1); else if (r.why === 'soles') nudge(`Not enough Soles. Go for a walk: every ${E.stepsPerSole(s)} steps earns a Sole.`); commit(); },
  respec() { H.respec(s); commit(); },
  item(v) { openModal('item', { uid: v }); },
  booster(v) { openModal('booster', { key: v }); },
  equip(v) { H.equip(s, v); syncLook(); closeModal(); commit(); },
  autoEquip() { H.autoEquipBest(s); syncLook(); commit(); },
  salvage(v) { E.salvage(s, v); closeModal(); commit(); },
  salvageJunkGo() {
    const r = E.salvageJunk(s);
    closeModal();
    if (r.count) say(`${r.count} piece${r.count > 1 ? 's' : ''} of junk melted down into ${fmt(r.soles)} Soles. Very sustainable. Very Stone Age.`);
    commit();
  },
  invTab(v) { app.invTab = v; render(); },
  useBooster(v) { if (E.useBooster(s, v)) say(`${BOOSTERS[v].name} active. ${BOOSTERS[v].desc}.`); closeModal(); commit(); },

  // shop
  buy(v) {
    const r = E.buy(s, Number(v));
    if (!r.ok) { if (r.why === 'full') say('Your inventory is full. Upgrade it at the Base, or salvage something.'); else nudge(`Not enough Soles. Go for a walk: every ${E.stepsPerSole(s)} steps earns a Sole.`); }
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
    } else if (r.why === 'cost') {
      nudge(s.soles < r.cost.soles ? `Not enough Soles. Go for a walk: every ${E.stepsPerSole(s)} steps earns a Sole.` : 'Not enough wood. Walking finds it, and so do loot boxes.');
      return;
    }
    closeModal();
    commit();
  },
  speed(v) { if (!B.speedUp(s, v)) { nudge(`Not enough Soles. Go for a walk: every ${E.stepsPerSole(s)} steps earns a Sole.`); return; } stage.setBase(tiers()); commit(); },

  // crafting
  pickRecipe(v) { app.recipe = v; render(); },
  pickPart(v) { app.part = v || null; render(); },
  forgeStart() {
    const r = RECIPES.find((x) => x.id === app.recipe);
    const part = app.part && (s.mats[app.part] || 0) > 0 ? app.part : null;
    const c = B.canForge(s, r, part);
    if (!c.ok && c.why === 'amount') { nudge('Not enough materials. Walk to find more, or replay a Trial for beast parts.'); return; }
    if (!c.ok) { say({ studio: 'Build the Workshop first.', blueprint: 'You need the blueprint. Bosses and Gold+ loot boxes drop them.', tier: `This needs Workshop tier ${c.need}.`, amount: '', full: 'Your inventory is full.' }[c.why] || 'Not yet.'); return; }
    app.modal = { type: 'forge', recipe: r, part, strikes: [], t0: performance.now(), period: 1700 };
    renderModal();
    hammerLoop();
  },
  hammer() {
    const m = app.modal;
    if (!m || m.type !== 'forge' || m.result || m.strikes.length >= 3) return;
    const d = Math.abs(hammerPos(m) - 0.5);
    const hit = d <= 0.1 ? 'perfect' : d <= 0.22 ? 'good' : 'miss';
    m.strikes.push(hit);
    m.flash = hit;
    $('#ui').classList.remove('shake'); void $('#ui').offsetWidth; $('#ui').classList.add('shake');
    // the marker keeps sweeping at the same steady speed, so the rhythm is learnable
    if (m.strikes.length >= 3) return setTimeout(() => finishForge(B.qualityFromStrikes(m.strikes, s.base.studio.tier)), 350);
    renderModal();
  },
  forgeSkip() { finishForge('fine'); },
  equipNew(v) { H.equip(s, v); syncLook(); closeModal(); commit(); },
  reinforce(v) {
    const r = B.reinforce(s, v);
    if (!r.ok) say(r.why === 'max' ? 'It is as strong as it gets.' : 'Not enough materials to reinforce it.');
    else say(`Reinforced to +${r.plus}. Stronger. Shinier. Same smell.`);
    renderModal();
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
  finish() {
    const b = app.battle;
    if (!b) return;
    const t = C.canFinish(b, app.target) ? app.target : (C.living(b).find((e) => C.canFinish(b, e.uid)) || {}).uid;
    if (t == null) { say(b.hero.fury < FURY.max ? 'Not angry enough yet. Hit things. Get hit. It builds.' : 'Nothing is weak enough to finish. Bring one down to the skull.'); return; }
    runAction(() => C.useFinisher(b, t));
  },
  buyFinisher(v) {
    const r = H.buyFinisher(s, v);
    if (!r.ok) say(r.why === 'soles' ? pick(PROCTOR.noSoles) : r.why === 'altar' ? `Upgrade the Hero Training Altar to tier ${FINISHERS[v].altar} first.` : 'You already own it.');
    else say(`${FINISHERS[v].name} learned. Equip it, then make it count.`);
    commit();
  },
  equipFinisher(v) { H.equipFinisher(s, v); commit(); },
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

// Swipe across the hero (Home, Hero screen) to spin him. A drag isn't a tap: it doesn't open anything.
function bindSpin() {
  let st = null;
  document.addEventListener('pointerdown', (ev) => {
    if (app.modal || (app.screen !== 'home' && app.screen !== 'hero')) return;
    const onHero = app.screen === 'home' ? ev.target.closest('.herotap') : !ev.target.closest('.panel, button, .topbar, .proctor, .toast');
    if (!onHero) return;
    st = { x: ev.clientX, lastX: ev.clientX, moved: false, samples: [] };
  });
  document.addEventListener('pointermove', (ev) => {
    if (!st) return;
    if (!st.moved && Math.abs(ev.clientX - st.x) > 8) { st.moved = true; stage.spinStart(); }
    if (!st.moved) return;
    stage.spinMove(ev.clientX - st.lastX);
    st.lastX = ev.clientX;
    const now = performance.now();
    st.samples.push([now, ev.clientX]);
    while (st.samples.length > 2 && now - st.samples[0][0] > 150) st.samples.shift();
  });
  const end = () => {
    if (!st) return;
    if (st.moved) {
      // speed over the last ~150ms of movement (px/s -> rad/s); a long pause before letting go = no flick
      const sm = st.samples;
      let v = 0;
      if (sm.length >= 2 && performance.now() - sm[sm.length - 1][0] < 250) {
        const dt = (sm[sm.length - 1][0] - sm[0][0]) / 1000;
        if (dt > 0) v = ((sm[sm.length - 1][1] - sm[0][1]) * 0.012) / dt;
      }
      stage.spinEnd(Math.max(-25, Math.min(25, v)));
      app.justSpun = performance.now();
    }
    st = null;
  };
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);
}

function onClick(ev) {
  // the click that ends a swipe shouldn't also open the hero
  if (app.justSpun && performance.now() - app.justSpun < 250) { app.justSpun = 0; ev.stopPropagation(); return; }
  const el = ev.target.closest('[data-a]');
  if (!el) {
    // On the Base, tapping a building's model opens it, same as its label
    if (app.screen === 'base' && !app.modal) {
      const b = stage.pickBuilding(ev.clientX, ev.clientY);
      if (b) ACTIONS.building(b);
    }
    return;
  }
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
window.ascent = { get state() { return s; }, get stage() { return stage; }, app, E, B, H, C, T, glitch };
