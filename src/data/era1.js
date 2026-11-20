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

export const MATERIALS = {
  flint: { name: 'Flint', icon: '◆', color: '#9aa7b8' },
  bone: { name: 'Bone', icon: '🦴', color: '#efe6cf' },
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
    id: 'roar', name: 'Roar', ap: 2, kind: 'stun', power: 0, target: 'enemy', cooldown: 3,
    unlock: 2, icon: '📣', desc: () => 'Stun one enemy for 1 turn. 3-turn cooldown',
  },
  hurl: {
    id: 'hurl', name: 'Hurl Stone', ap: 1, kind: 'physical', power: 4, target: 'enemy', interrupts: true,
    unlock: 3, icon: '🪨', desc: (p) => `${p} physical damage. Interrupts "calling backup"`,
  },
  firebrand: {
    id: 'firebrand', name: 'Firebrand', ap: 2, kind: 'fire', power: 8, target: 'enemy', burn: 3, burnTurns: 2,
    unlock: 5, icon: '🔥', desc: (p) => `${p} fire damage, then 3 burn a turn for 2 turns. Scares beasts`,
  },
};
export const SKILL_ORDER = ['club', 'guard', 'roar', 'hurl', 'firebrand'];

// ---------- Enemies ----------
// Intent kinds: attack (dmg), block (amt), buff (snarl), charge (wind-up -> big hit), call (summon), bleed.
export const ENEMIES = {
  wolf: {
    id: 'wolf', name: 'Wolf', hp: 35, fireFear: true, beast: true, model: 'wolf',
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
    id: 'alpha', name: 'Alpha Wolf', hp: 130, fireFear: true, beast: true, boss: 'mini', model: 'alpha', pattern: 'alpha',
    intents: { bite: { kind: 'attack', dmg: 9, label: 'Bite' }, snarl: { kind: 'buff', label: 'Snarl', note: 'next Bite +50%' }, call: { kind: 'call', label: 'Call the pack', note: 'adds a Wolf' } },
  },
  sabre: {
    id: 'sabre', name: 'Sabretooth', hp: 210, fireFear: true, beast: true, boss: 'mini', model: 'sabre', pattern: 'sabre',
    intents: { claw: { kind: 'attack', dmg: 12, label: 'Claw' }, bleed: { kind: 'bleed', dmg: 3, turns: 3, label: 'Bleed', note: '3 a turn for 3 turns' }, crouch: { kind: 'windup', label: 'Crouching', note: 'next turn: Pounce 24' }, pounce: { kind: 'attack', dmg: 24, label: 'Pounce' } },
  },
  mammoth: {
    id: 'mammoth', name: 'Great Mammoth', hp: 420, fireFear: false, beast: true, boss: 'era', model: 'mammoth', pattern: 'mammoth',
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
export const TRIALS = [
  { n: 0, name: 'Tutorial', enemies: ['wolf'], level: 1, xp: 50, tutorial: true },
  { n: 1, name: 'Scent of Prey', enemies: ['wolf'], level: 2, xp: 30 },
  { n: 2, name: 'Two Shadows', enemies: ['wolf', 'wolf'], level: 2, xp: 30 },
  { n: 3, name: 'Tusks in the Brush', enemies: ['boar'], level: 3, xp: 30 },
  { n: 4, name: 'Mixed Company', enemies: ['wolf', 'boar'], level: 3, xp: 30 },
  { n: 5, name: 'The Alpha', enemies: ['alpha', 'wolf'], level: 4, xp: 80, boss: 'mini' },
  { n: 6, name: 'The Pack', enemies: ['wolf', 'wolf', 'wolf'], level: 5, xp: 50 },
  { n: 7, name: 'Another Contestant?', enemies: ['hunter'], level: 5, xp: 50 },
  { n: 8, name: 'Hunting Party', enemies: ['hunter', 'hunter'], level: 6, xp: 50 },
  { n: 9, name: 'Do Not Wake It', enemies: ['bear'], level: 6, xp: 50 },
  { n: 10, name: 'Sabretooth', enemies: ['sabre'], level: 7, xp: 150, boss: 'mini' },
  { n: 11, name: 'Old Scars', enemies: ['bear!', 'wolf'], level: 8, xp: 80 },
  { n: 12, name: 'Veterans', enemies: ['hunter!', 'hunter!', 'wolf'], level: 8, xp: 80 },
  { n: 13, name: 'Stampede', enemies: ['boar!', 'boar!', 'hunter'], level: 9, xp: 80 },
  { n: 14, name: 'Twin Dens', enemies: ['bear!', 'bear!'], level: 9, xp: 80 },
  { n: 15, name: 'The Great Mammoth', enemies: ['mammoth'], level: 10, xp: 300, boss: 'era' },
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
  fang_charm: { name: 'Fang Charm', slot: 'trinket', stats: { agi: 2 }, tier: 'crafted', look: 'charm2' },
  ember_totem: { name: 'Ember Totem', slot: 'trinket', stats: { int: 2 }, tier: 'crafted', look: 'charm2' },
  // Rare loot-box gear (MVP guess: +3 to one attribute)
  storm_crown: { name: 'Storm-Eye Crown', slot: 'helm', stats: { vit: 3 }, tier: 'rare', look: 'helm2' },
  obsidian_ward: { name: 'Obsidian Ward', slot: 'offhand', stats: { str: 3 }, tier: 'rare', look: 'shield2' },
  ghost_amber: { name: 'Ghost Amber', slot: 'trinket', stats: { agi: 3 }, tier: 'rare', look: 'charm3' },
  // Boss drops
  alpha_fang: { name: 'Alpha Fang', slot: 'weapon', stats: { dmg: 5 }, tier: 'boss', look: 'fang' },
  sabre_hide: { name: 'Sabretooth Hide', slot: 'armor', stats: { hp: 30 }, tier: 'boss', look: 'armor3' },
  tusk_club: { name: 'Mammoth Tusk Club', slot: 'weapon', stats: { dmg: 8 }, tier: 'boss', look: 'tusk' },
};
export const SLOTS = ['weapon', 'armor', 'helm', 'offhand', 'trinket'];
export const SLOT_NAMES = { weapon: 'Weapon', armor: 'Armor', helm: 'Helm', offhand: 'Offhand', trinket: 'Trinket' };

// ---------- Boosters ----------
export const BOOSTERS = {
  stride_brew: { name: 'Stride Brew', desc: '24 hours of 2 steps per Sole', hours: 24, stepsPerSole: 2 },
  lucky_knot: { name: 'Lucky Knot', desc: 'Your next 3 loot boxes roll one tier up', boxesUp: 3 },
  warpaint: { name: 'Warpaint', desc: 'Next Trial: +3 damage on every hit', fights: 1, dmg: 3 },
};

// ---------- Crafting (MVP guess: recipes) ----------
// Put one item type in each slot. A recipe matches the exact set of item types;
// the amounts are what one craft consumes. Materials: 'flint','bone'; anything else is a gear key.
// studio: minimum Workshop tier. Unknown recipes can still be found by experimenting.
export const RECIPES = [
  { id: 'r_flint_club', out: { gear: 'flint_club' }, inputs: { flint: 5, bone: 2 }, studio: 1, known: true },
  { id: 'r_bone_mail', out: { gear: 'bone_mail' }, inputs: { hide_wrap: 1, bone: 6 }, studio: 1, known: true },
  { id: 'r_bone_helm', out: { gear: 'bone_helm' }, inputs: { skull_cap: 1, bone: 4 }, studio: 1 },
  { id: 'r_flint_buckler', out: { gear: 'flint_buckler' }, inputs: { bark_shield: 1, flint: 4 }, studio: 1 },
  { id: 'r_fang_charm', out: { gear: 'fang_charm' }, inputs: { tooth_charm: 1, bone: 3, flint: 2 }, studio: 2 },
  { id: 'r_ember_totem', out: { gear: 'ember_totem' }, inputs: { ember_stone: 1, flint: 3, bone: 2 }, studio: 2 },
  { id: 'r_stride_brew', out: { booster: 'stride_brew' }, inputs: { pebble_string: 1, flint: 8, bone: 8 }, studio: 3, blueprint: true },
  { id: 'r_sabre_hide', out: { gear: 'sabre_hide' }, inputs: { bone_mail: 1, bone: 10, flint: 6 }, studio: 3, blueprint: true },
];

// ---------- Base ----------
export const BUILDINGS = {
  studio: { name: 'Workshop', short: 'Workshop', icon: '⚒', unlocks: ['Two-item crafts', 'Three-item crafts', 'Master recipes'] },
  altar: { name: 'Hero Training Altar', short: 'Altar', icon: '🗿', unlocks: ['Loadout 5 skills, skill rank 2', 'Skill rank 3', 'Loadout 6 skills, training 25% cheaper'] },
  inventory: { name: 'Inventory', short: 'Inventory', icon: '🧺', unlocks: ['30 slots', '40 slots', '50 slots'] },
  shrine: { name: 'Shrine', short: 'Shrine', icon: '⛩', unlocks: ['Better loot box odds', 'Even better odds', 'Best odds'] },
  truth: { name: 'Truth Board', short: 'Truth Board', icon: '📌', unlocks: ['Decode level 1 fragments', 'Decode level 2 fragments', 'Decode everything'] },
};
export const BUILDING_ORDER = ['studio', 'altar', 'inventory', 'shrine', 'truth'];
// tier index = target tier (1..3)
export const BUILD_COST = {
  1: { soles: 100, mats: 3, minutes: 10 },
  2: { soles: 300, mats: 8, minutes: 120 },
  3: { soles: 800, mats: 20, minutes: 480 },
};
// how a building's material cost splits between flint and bone (MVP guess)
export const BUILD_MAT_SPLIT = { studio: 'flint', altar: 'bone', inventory: 'bone', shrine: 'mixed', truth: 'flint' };
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
