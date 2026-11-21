// Era 1 (Primal) content. Numbers come from the GDD "Era 1 combat: v1 numbers".
// Anything the GDD leaves open is marked "MVP guess" so it is easy to find and tune.

export const ERA1 = {
  id: 1,
  name: 'Primal',
  period: 'Stone Age',
  base: 'Cave and firepit',
  materials: ['flint', 'bone'],
  boss: 'Great Mammoth',
  levelThreshold: 10,
};

// Basic materials. Wood builds the base; flint and bone make gear.
export const MATERIALS = {
  flint: { name: 'Flint', icon: '◆', color: '#9aa7b8' },
  bone: { name: 'Bone', icon: '🦴', color: '#efe6cf' },
  wood: { name: 'Wood', icon: '🪵', color: '#a0703c' },
};

// Crafting parts: trophies from the beasts you hunt (and loot boxes). Put one in the Workshop's
// third slot to give the item a special effect. drops = enemies that drop it.
export const PARTS = {
  fang: { name: 'Wolf Fang', icon: '🦷', affix: 'serrated', drops: ['mangy', 'wolf', 'beta', 'alpha', 'hyena'] },
  claw: { name: 'Lion Claw', icon: '🐾', affix: 'keen', drops: ['lion', 'sabre'] },
  tine: { name: 'Antler Tine', icon: '🦌', affix: 'piercing', drops: ['elk'] },
  hide: { name: 'Thick Hide', icon: '🟫', affix: 'hardened', drops: ['rhino', 'mammoth'] },
  ember: { name: 'Ember Coal', icon: '🔥', affix: 'smoldering', drops: [] },
};
export const AFFIXES = {
  serrated: { name: 'Serrated', desc: 'Weapon hits make the target bleed 3 a turn for 2 turns', bleed: 3 },
  keen: { name: 'Keen', desc: '+6% critical chance', crit: 0.06 },
  piercing: { name: 'Piercing', desc: 'Weapon hits ignore 4 armor', pierce: 4 },
  hardened: { name: 'Hardened', desc: '+15 max health', hp: 15 },
  smoldering: { name: 'Smoldering', desc: 'Weapon hits set the target burning, 3 a turn for 2 turns', burn: 3 },
};
// Forging quality, from the hammer timing. Skipping it gives Fine.
export const QUALITY = {
  crude: { name: 'Crude', mult: 0.85 },
  fine: { name: 'Fine', mult: 1 },
  masterwork: { name: 'Masterwork', mult: 1.25 },
};
// Reinforcing: +1 to +5. Cost for the next level n: (2 + 2n) of the slot's material and n wood.
export const REINFORCE_MAX = 5;
export const SLOT_MAT = { weapon: 'flint', offhand: 'wood', armor: 'bone', helm: 'bone', trinket: 'bone' };

// Sets: trophies from each act's hunt. Bonuses echo the beast they came from.
export const SETS = {
  pack: { id: 'pack', name: 'Pack Hunter', pieces: ['alpha_fang', 'wolf_pelt', 'fang_charm'],
    bonus: { 2: { crit: 0.05, text: '+5% critical chance' }, 3: { furyMult: 1.5, text: 'Fury fills 50% faster' } } },
  predator: { id: 'predator', name: 'Predator', pieces: ['sabre_hide', 'lion_mask', 'claw_buckler'],
    bonus: { 2: { bleed: 3, text: 'Weapon hits make the target bleed' }, 3: { firstAp: 1, text: '+1 AP on your first turn' } } },
};

// ---------- Skills ----------
// power: base number. rank adds +2 per rank above 1 (max rank 3).
export const SKILLS = {
  club: {
    id: 'club', name: 'Club Strike', ap: 1, kind: 'physical', power: 6, target: 'enemy',
    unlock: 1, icon: '🪵', desc: (p) => `${p} physical damage`,
  },
  guard: {
    id: 'guard', name: 'Guard', ap: 1, kind: 'block', power: 6, target: 'self',
    unlock: 1, icon: '🛡', desc: (p) => `Block ${p} + half Vitality this turn`,
  },
  roar: {
    id: 'roar', name: 'Roar', ap: 2, kind: 'stun', power: 0, target: 'enemy', cooldown: 4,
    unlock: 2, icon: '📣', desc: () => 'Stun one enemy for 1 turn. 4-turn cooldown',
  },
  hurl: {
    id: 'hurl', name: 'Hurl Stone', ap: 1, kind: 'physical', power: 4, target: 'enemy', interrupts: true, stunChance: 0.15, cooldown: 2,
    unlock: 3, icon: '🪨', desc: (p) => `${p} physical damage. Stops a call for backup or a stalking pounce. 15% chance to stun. 2-turn cooldown`,
  },
  firebrand: {
    id: 'firebrand', name: 'Firebrand', ap: 2, kind: 'fire', power: 8, target: 'enemy', burn: 3, burnTurns: 2,
    unlock: 5, icon: '🔥', desc: (p) => `${p} fire damage, then 3 burn a turn for 2 turns. Scares beasts`,
  },
  jab: {
    id: 'jab', name: 'Flint Jab', ap: 1, kind: 'physical', power: 4, target: 'enemy', pierce: true,
    unlock: 4, icon: '🗡', desc: (p) => `${p} damage that ignores block and armor`,
  },
  sweep: {
    id: 'sweep', name: 'Sweep', ap: 2, kind: 'sweep', power: 3, target: 'all',
    unlock: 6, icon: '🌀', desc: (p) => `${p} + half Strength to every enemy`,
  },
  secondwind: {
    id: 'secondwind', name: 'Second Wind', ap: 1, kind: 'heal', power: 8, target: 'self', cooldown: 3,
    unlock: 7, icon: '💨', desc: (p) => `Heal ${p} + Vitality and stop bleeding. 3-turn cooldown`,
  },
};
export const SKILL_ORDER = ['club', 'guard', 'roar', 'hurl', 'jab', 'firebrand', 'sweep', 'secondwind'];
export const LOADOUT_MAX = 4;

// ---------- Finishers ----------
// Fury builds as you fight. When an enemy is low (marked with a skull) and Fury is full,
// the equipped finisher kills it outright for 1 AP and adds its effect.
export const FURY = { perHit: 20, perHurt: 10, max: 100, ap: 1, threshold: 0.3, bossThreshold: 0.2 };
export const FINISHERS = {
  skull: { id: 'skull', name: 'Skull Crusher', icon: '💀', desc: 'Heal 15% of your max health', how: 'Drops from the Alpha (Trial 5)' },
  terror: { id: 'terror', name: 'Terror', icon: '😱', desc: 'Every other enemy loses its next action', price: 300, altar: 1, how: 'Hero Training Altar tier 1' },
  bloodrush: { id: 'bloodrush', name: 'Bloodrush', icon: '🩸', desc: 'Refund 2 AP so you can keep going', how: 'Drops from the Sabretooth (Trial 10)' },
};
// Three finishers per era.
export const FINISHER_ORDER = ['skull', 'terror', 'bloodrush'];

// ---------- Enemies ----------
// Intent kinds: attack (dmg), block (amt), buff (snarl), charge (wind-up -> big hit), call (summon), bleed.
// traits: pack (leaders make the rest hit harder), stalker (winds up a pounce that Hurl Stone or
// Roar stops), enraged (hits 50% harder below half health), armored (weak hits do less).
export const TRAITS = {
  pack: { name: 'Pack', desc: 'While a leader lives, the others hit harder. Kill order matters.' },
  stalker: { name: 'Stalker', desc: 'Stalks, then pounces. Hurl Stone or Roar stops the pounce.' },
  enraged: { name: 'Enraged', desc: 'Hits 50% harder below half health. Burst it or stun it.' },
  armored: { name: 'Armored', desc: 'Takes less from weapon hits. Flint Jab and fire ignore armor.' },
  fireFear: { name: 'Fears fire', desc: 'Firebrand scares it out of its next attack.' },
};

export const ENEMIES = {
  mangy: {
    id: 'mangy', name: 'Mangy Wolf', hp: 24, fireFear: true, beast: true, model: 'mangy', pattern: 'mangy', traits: ['fireFear'],
    intents: { bite: { kind: 'attack', dmg: 5, label: 'Bite' } },
  },
  beta: {
    id: 'beta', name: 'Beta Wolf', hp: 52, fireFear: true, beast: true, model: 'beta', pattern: 'wolf', leader: true, traits: ['pack', 'fireFear'],
    intents: { bite: { kind: 'attack', dmg: 7, label: 'Bite' }, snarl: { kind: 'buff', label: 'Snarl', note: 'next Bite +50%' } },
  },
  hyena: {
    id: 'hyena', name: 'Cave Hyena', hp: 30, fireFear: true, beast: true, model: 'hyena', pattern: 'hyena', traits: ['pack', 'fireFear'],
    intents: { bite: { kind: 'attack', dmg: 5, label: 'Bite' }, cackle: { kind: 'buff', label: 'Cackle', note: 'next Bite +50%' } },
  },
  lion: {
    id: 'lion', name: 'Mountain Lion', hp: 58, fireFear: true, beast: true, model: 'lion', pattern: 'lion', traits: ['stalker', 'fireFear'],
    intents: { swipe: { kind: 'attack', dmg: 8, label: 'Swipe' }, stalk: { kind: 'windup', label: 'Stalking', note: 'next turn: Pounce 17. Hurl Stone or Roar stops it', interruptible: true }, pounce: { kind: 'attack', dmg: 17, label: 'Pounce' } },
  },
  elk: {
    id: 'elk', name: 'Enraged Elk', hp: 84, fireFear: false, beast: true, model: 'elk', pattern: 'elk', enrages: true, traits: ['enraged'],
    intents: { antler: { kind: 'attack', dmg: 9, label: 'Antlers' }, paw: { kind: 'windup', label: 'Pawing the ground', note: 'next turn: Charge 20' }, charge: { kind: 'attack', dmg: 20, label: 'Charge' } },
  },
  rhino: {
    id: 'rhino', name: 'Woolly Rhino', hp: 110, fireFear: false, beast: true, model: 'rhino', pattern: 'rhino', armor: 4, traits: ['armored'],
    intents: { horn: { kind: 'attack', dmg: 10, label: 'Horn' }, lower: { kind: 'windup', label: 'Lowering its horn', note: 'next turn: Charge 24' }, charge: { kind: 'attack', dmg: 24, label: 'Charge' } },
  },
  wolf: {
    id: 'wolf', name: 'Wolf', hp: 35, fireFear: true, beast: true, model: 'wolf', traits: ['fireFear'],
    pattern: 'wolf',
    intents: { bite: { kind: 'attack', dmg: 6, label: 'Bite' }, snarl: { kind: 'buff', label: 'Snarl', note: 'next Bite +50%' } },
  },
  boar: {
    id: 'boar', name: 'Boar', hp: 50, fireFear: false, beast: true, model: 'boar', pattern: 'boar',
    intents: { gore: { kind: 'attack', dmg: 7, label: 'Gore' }, charging: { kind: 'windup', label: 'Charging', note: 'next turn: Charge 16' }, charge: { kind: 'attack', dmg: 16, label: 'Charge' } },
  },
  hunter: {
    id: 'hunter', name: 'Rival hunter', hp: 45, fireFear: false, beast: false, model: 'hunter', pattern: 'hunter',
    intents: { spear: { kind: 'attack', dmg: 8, label: 'Spear' }, guard: { kind: 'block', amt: 6, label: 'Guard' }, throw: { kind: 'attack', dmg: 5, pierce: true, label: 'Throw', note: 'ignores block' } },
  },
  bear: {
    id: 'bear', name: 'Cave bear', hp: 90, fireFear: true, beast: true, model: 'bear', pattern: 'bear',
    intents: { swipe: { kind: 'attack', dmg: 11, label: 'Swipe' }, hunker: { kind: 'block', amt: 10, label: 'Hunker' } },
  },
  alpha: {
    id: 'alpha', name: 'Alpha Wolf', hp: 130, fireFear: true, beast: true, boss: 'mini', model: 'alpha', pattern: 'alpha', leader: true, traits: ['pack', 'fireFear'],
    intents: { bite: { kind: 'attack', dmg: 9, label: 'Bite' }, snarl: { kind: 'buff', label: 'Snarl', note: 'next Bite +50%' }, call: { kind: 'call', label: 'Call the pack', note: 'adds a Wolf' } },
  },
  sabre: {
    id: 'sabre', name: 'Sabretooth', hp: 210, fireFear: true, beast: true, boss: 'mini', model: 'sabre', pattern: 'sabre', traits: ['fireFear'],
    intents: { claw: { kind: 'attack', dmg: 12, label: 'Claw' }, bleed: { kind: 'bleed', dmg: 3, turns: 3, label: 'Bleed', note: '3 a turn for 3 turns' }, crouch: { kind: 'windup', label: 'Crouching', note: 'next turn: Pounce 24' }, pounce: { kind: 'attack', dmg: 24, label: 'Pounce' } },
  },
  mammoth: {
    id: 'mammoth', name: 'Great Woolly Mammoth', hp: 420, fireFear: false, beast: true, boss: 'era', model: 'mammoth', pattern: 'mammoth', armor: 3, traits: ['armored', 'enraged'],
    intents: { stomp: { kind: 'attack', dmg: 12, label: 'Stomp' }, trumpet: { kind: 'block', amt: 15, label: 'Trumpet', note: 'block 15, Stomps +3 for the fight' }, lower: { kind: 'windup', label: 'Lowering tusks', note: 'next turn: Charge 30' }, charge: { kind: 'attack', dmg: 30, label: 'Charge' } },
  },
};

// ---------- Tuning ----------
// Multipliers on the GDD v1 enemy numbers. 1 / 1 = the GDD table exactly.
// The MVP defaults to 'tuned' because the v1 table let a level 1-2 hero win almost every
// Era 1 Trial in simulation (see docs/mvp-notes.md). Settings can switch to 'gdd'.
export const TUNING_PRESETS = {
  tuned: { enemyHp: 1.25, enemyDmg: 1.5, guardOncePerTurn: true },
  gdd: { enemyHp: 1, enemyDmg: 1, guardOncePerTurn: false },
};
export const TUNING = { ...TUNING_PRESETS.tuned };
export function setTuning(name) {
  Object.assign(TUNING, TUNING_PRESETS[name] || TUNING_PRESETS.tuned);
}

// ---------- Trials ----------
// v = veteran (+25% health and damage)
// Three acts up the food chain. par = turns for the third star (balance bot's median + 1).
// power = the Trial's difficulty dial on enemy health and damage, tuned with the balance bot so a
// hero at the suggested level ends regular Trials with ~40% health, mini-bosses ~25%, the Mammoth ~20%.
export const ACTS = [
  { n: 1, name: 'The Pack', line: "The Alpha's scouts have found your scent." },
  { n: 2, name: 'The Predators', line: "The Alpha's carcass drew bigger hunters." },
  { n: 3, name: 'The Giants', line: 'With the apex predator dead, the valley opens. The herd is coming.' },
];
export const TRIALS = [
  { n: 0, name: 'Tutorial', enemies: ['wolf'], level: 1, xp: 50, tutorial: true, par: 6 },
  { n: 1, act: 1, name: 'Scent of Prey', enemies: ['mangy'], level: 2, xp: 30, par: 3, power: 1.6, line: 'A starving wolf, too hungry to be afraid of you.' },
  { n: 2, act: 1, name: 'Scavengers', enemies: ['wolf', 'wolf'], level: 2, xp: 30, par: 5, power: 1.2, line: 'Two more, drawn by the first one\'s blood.' },
  { n: 3, act: 1, name: 'The Beta', enemies: ['beta'], level: 3, xp: 30, par: 5, power: 1.8, line: "The Alpha's second. Bigger, and it doesn't hesitate." },
  { n: 4, act: 1, name: 'Hunting Party', enemies: ['beta', 'mangy', 'mangy'], level: 3, xp: 30, par: 6, power: 1.1, line: 'The Beta brought the pack. Kill it first and the rest lose their nerve.' },
  { n: 5, act: 1, name: 'The Alpha', enemies: ['alpha', 'wolf'], level: 4, xp: 80, boss: 'mini', par: 9, power: 1.1, line: 'The pack leader. It calls more wolves if you let it.' },
  { n: 6, act: 2, name: 'Carrion', enemies: ['hyena', 'hyena', 'hyena'], level: 5, xp: 50, par: 9, power: 2.0, line: 'Hyenas, come for what is left of the Alpha. They want you too.' },
  { n: 7, act: 2, name: 'The Mountain Lion', enemies: ['lion'], level: 5, xp: 50, par: 6, power: 3.0, line: 'Something has been watching you from the rocks.' },
  { n: 8, act: 2, name: 'Two Shadows', enemies: ['lion', 'lion'], level: 6, xp: 50, par: 9, power: 2.0, line: 'A mated pair. One stalks while the other strikes.' },
  { n: 9, act: 2, name: 'The Pride', enemies: ['lion', 'lion', 'lion'], level: 6, xp: 60, par: 10, power: 1.3, line: 'Three of them now. They have learned your scent.' },
  { n: 10, act: 2, name: 'Sabretooth', enemies: ['sabre'], level: 7, xp: 150, boss: 'mini', par: 11, power: 1.8, line: 'The apex predator of the valley. Everything else here fears it.' },
  { n: 11, act: 3, name: 'Enraged Elk', enemies: ['elk'], level: 8, xp: 80, par: 6, power: 2.0, line: 'The herd is moving. A bull elk stands between you and it.' },
  { n: 12, act: 3, name: 'The Rut', enemies: ['elk', 'elk'], level: 8, xp: 80, par: 8, power: 1.2, line: 'Two bulls, mad with the season. They will charge anything.' },
  { n: 13, act: 3, name: 'Iron Hide', enemies: ['rhino'], level: 9, xp: 80, par: 8, power: 2.2, line: 'A woolly rhino. Your club barely dents it.' },
  { n: 14, act: 3, name: 'Twin Horns', enemies: ['rhino', 'rhino'], level: 9, xp: 90, par: 9, power: 1.1, line: 'Two rhinos guard the herd. Behind them, the ground shakes.' },
  { n: 15, act: 3, name: 'The Great Woolly Mammoth', enemies: ['mammoth'], level: 10, xp: 300, boss: 'era', par: 15, power: 1.32, line: 'The matriarch. The simulation went quiet when she arrived.' },
];
// Stars: 1 for winning, 1 for finishing above half health, 1 for winning within par turns.
export const STAR_REWARDS = [
  { stars: 15, box: 'gold' },
  { stars: 30, box: 'platinum' },
  { stars: 45, box: 'legendary' },
];

// ---------- Hero ----------
export const HERO_START = { str: 4, vit: 4, int: 2, agi: 2 };
export const ATTRS = {
  str: { name: 'Strength', short: 'STR', desc: 'Physical damage' },
  vit: { name: 'Vitality', short: 'VIT', desc: 'Health (+5 each) and Guard' },
  int: { name: 'Intelligence', short: 'INT', desc: 'Fire damage, AP carry-over' },
  agi: { name: 'Agility', short: 'AGI', desc: 'Crit and dodge (+1% each)' },
};
export const SOLES_PER_XP = 2;
export const xpToNext = (level) => 50 * level;

// ---------- Gear ----------
// slot: weapon | armor | helm | offhand | trinket
// stats: dmg (weapon bonus), hp, str/vit/int/agi
export const GEAR = {
  // Shop
  stone_club: { name: 'Knapped Club', slot: 'weapon', stats: { dmg: 2 }, price: 150, tier: 'shop', look: 'club1' },
  hide_wrap: { name: 'Hide Wrap', slot: 'armor', stats: { hp: 10 }, price: 150, tier: 'shop', look: 'armor1' },
  skull_cap: { name: 'Skull Cap', slot: 'helm', stats: { vit: 1 }, price: 100, tier: 'shop', look: 'helm1' },
  bark_shield: { name: 'Bark Shield', slot: 'offhand', stats: { str: 1 }, price: 100, tier: 'shop', look: 'shield1' },
  tooth_charm: { name: 'Tooth Charm', slot: 'trinket', stats: { agi: 1 }, price: 100, tier: 'shop', look: 'charm1' },
  ember_stone: { name: 'Ember Stone', slot: 'trinket', stats: { int: 1 }, price: 100, tier: 'shop', look: 'charm1' },
  // Low-level gear (replays, bronze boxes). MVP guess: weaker than shop.
  cracked_club: { name: 'Cracked Club', slot: 'weapon', stats: { dmg: 1 }, tier: 'worn', look: 'club1', sell: 20 },
  torn_hide: { name: 'Torn Hide', slot: 'armor', stats: { hp: 5 }, tier: 'worn', look: 'armor1', sell: 20 },
  pebble_string: { name: 'Pebble String', slot: 'trinket', stats: { agi: 1 }, tier: 'worn', look: 'charm1', sell: 20 },
  // Crafted
  flint_club: { name: 'Flint Club', slot: 'weapon', stats: { dmg: 4 }, tier: 'crafted', look: 'club2' },
  bone_mail: { name: 'Bone Mail', slot: 'armor', stats: { hp: 20 }, tier: 'crafted', look: 'armor2' },
  bone_helm: { name: 'Bone Helm', slot: 'helm', stats: { vit: 2 }, tier: 'crafted', look: 'helm2' },
  flint_buckler: { name: 'Flint Buckler', slot: 'offhand', stats: { str: 2 }, tier: 'crafted', look: 'shield2' },
  fang_charm: { name: 'Fang Charm', slot: 'trinket', stats: { agi: 2 }, tier: 'crafted', look: 'charm2', set: 'pack' },
  wolf_pelt: { name: 'Wolf Pelt', slot: 'armor', stats: { hp: 18, str: 1 }, tier: 'crafted', look: 'armor2', set: 'pack' },
  lion_mask: { name: 'Lion Mask', slot: 'helm', stats: { vit: 2, agi: 1 }, tier: 'crafted', look: 'helm2', set: 'predator' },
  claw_buckler: { name: 'Claw Buckler', slot: 'offhand', stats: { str: 2, agi: 1 }, tier: 'crafted', look: 'shield2', set: 'predator' },
  ember_totem: { name: 'Ember Totem', slot: 'trinket', stats: { int: 2 }, tier: 'crafted', look: 'charm2' },
  // Rare loot-box gear (MVP guess: +3 to one attribute)
  storm_crown: { name: 'Storm-Eye Crown', slot: 'helm', stats: { vit: 3 }, tier: 'rare', look: 'helm2' },
  obsidian_ward: { name: 'Obsidian Ward', slot: 'offhand', stats: { str: 3 }, tier: 'rare', look: 'shield2' },
  ghost_amber: { name: 'Ghost Amber', slot: 'trinket', stats: { agi: 3 }, tier: 'rare', look: 'charm3' },
  // Boss drops
  alpha_fang: { name: 'Alpha Fang', slot: 'weapon', stats: { dmg: 5 }, tier: 'boss', look: 'fang', set: 'pack' },
  sabre_hide: { name: 'Sabretooth Hide', slot: 'armor', stats: { hp: 30 }, tier: 'boss', look: 'armor3', set: 'predator' },
  tusk_club: { name: 'Mammoth Tusk Club', slot: 'weapon', stats: { dmg: 8 }, tier: 'boss', look: 'tusk' },
};
export const SLOTS = ['weapon', 'armor', 'helm', 'offhand', 'trinket'];
export const SLOT_NAMES = { weapon: 'Weapon', armor: 'Armor', helm: 'Helm', offhand: 'Offhand', trinket: 'Trinket' };

// ---------- Boosters ----------
export const BOOSTERS = {
  stride_brew: { name: 'Stride Brew', desc: 'For 12 hours, every 5 steps earns a Sole (double the usual rate)', hours: 12, stepsPerSole: 5 },
  lucky_knot: { name: 'Lucky Knot', desc: 'Your next 3 loot boxes roll one tier up', boxesUp: 3 },
  warpaint: { name: 'Warpaint', desc: 'Next Trial: +3 damage on every hit', fights: 1, dmg: 3 },
};

// ---------- Crafting ----------
// A recipe makes one item from materials (and, for set pieces, beast parts). At Workshop tier 2
// a third slot takes any part, which gives the item a special effect. Hammer timing sets quality.
// known: available from the start. Others need a blueprint (bosses, Gold+ loot boxes).
export const RECIPES = [
  { id: 'r_flint_club', out: { gear: 'flint_club' }, mats: { flint: 5, wood: 2 }, studio: 1, known: true },
  { id: 'r_bone_mail', out: { gear: 'bone_mail' }, mats: { bone: 6, wood: 2 }, studio: 1, known: true },
  { id: 'r_bone_helm', out: { gear: 'bone_helm' }, mats: { bone: 5 }, studio: 1, known: true },
  { id: 'r_flint_buckler', out: { gear: 'flint_buckler' }, mats: { wood: 4, flint: 3 }, studio: 1, known: true },
  // Pack Hunter set: blueprints from the Alpha
  { id: 'r_wolf_pelt', out: { gear: 'wolf_pelt' }, mats: { bone: 6, wood: 2, fang: 3 }, studio: 1, blueprint: true },
  { id: 'r_fang_charm', out: { gear: 'fang_charm' }, mats: { bone: 3, fang: 3 }, studio: 1, blueprint: true },
  // Predator set: blueprints from the Sabretooth
  { id: 'r_lion_mask', out: { gear: 'lion_mask' }, mats: { bone: 5, claw: 3 }, studio: 2, blueprint: true },
  { id: 'r_claw_buckler', out: { gear: 'claw_buckler' }, mats: { wood: 4, flint: 3, claw: 3 }, studio: 2, blueprint: true },
  // From loot boxes
  { id: 'r_ember_totem', out: { gear: 'ember_totem' }, mats: { bone: 3, flint: 2, ember: 1 }, studio: 2, blueprint: true },
  { id: 'r_stride_brew', out: { booster: 'stride_brew' }, mats: { wood: 6, flint: 6, ember: 1 }, studio: 3, blueprint: true },
];
// Blueprints each boss drops on its first win.
export const BOSS_BLUEPRINTS = { 5: ['r_wolf_pelt', 'r_fang_charm'], 10: ['r_lion_mask', 'r_claw_buckler'], 15: ['r_ember_totem'] };

// ---------- Base ----------
export const BUILDINGS = {
  studio: { name: 'Workshop', short: 'Workshop', icon: '⚒', unlocks: ['Forge gear from recipes', 'A third slot for beast parts (special effects)', 'Master recipes, and better odds of Masterwork'] },
  altar: { name: 'Hero Training Altar', short: 'Altar', icon: '🗿', unlocks: ['Skill rank 2 · Terror finisher for sale', 'Skill rank 3', 'Training 25% cheaper'] },
  inventory: { name: 'Inventory', short: 'Inventory', icon: '🧺', unlocks: ['30 slots', '40 slots', '50 slots'] },
  shrine: { name: 'Shrine', short: 'Shrine', icon: '⛩', unlocks: ['Better loot box odds', 'Even better odds', 'Best odds'] },
  truth: { name: 'Truth Board', short: 'Truth Board', icon: '📌', unlocks: ['Decode level 1 fragments', 'Decode level 2 fragments', 'Decode everything'] },
};
export const BUILDING_ORDER = ['studio', 'altar', 'inventory', 'shrine', 'truth'];
// tier index = target tier (1..3)
// Lowered after playtest: players cleared all 15 Trials and then sat waiting on the base.
// Was 100/300/800 Soles and 10/120/480 minutes.
// Buildings cost Soles and wood.
export const BUILD_COST = {
  1: { soles: 50, wood: 2, minutes: 5 },
  2: { soles: 150, wood: 5, minutes: 45 },
  3: { soles: 400, wood: 12, minutes: 180 },
};
export const INVENTORY_SLOTS = [20, 30, 40, 50];

// ---------- Boons (on evolving, MVP guess) ----------
export const BOONS = [
  { id: 'b_long_stride', name: 'Long Stride', desc: '+1 Sole for every 100 steps walked' },
  { id: 'b_thick_skin', name: 'Thick Skin', desc: '+15 max health' },
  { id: 'b_first_strike', name: 'First Strike', desc: 'Start every fight with +1 AP' },
  { id: 'b_scavenger', name: 'Scavenger', desc: '+1 material from every Trial' },
  { id: 'b_keen_eye', name: 'Keen Eye', desc: '+5% crit chance' },
  { id: 'b_ember_heart', name: 'Ember Heart', desc: 'Fire skills burn 1 more turn' },
];
