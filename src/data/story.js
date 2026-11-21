// PROCTOR lines, glitches, story fragments and achievements. Act 1: "Something's wrong."
// Era 1 never reveals the SOULS twist; it only hints.

// Opening, part 1: the premise, typed out in green.
export const INTRO_LINES = [
  'In a far-future empire, the ruling Aurum caste are engineered demigods.',
  'Once a generation they run the Ascent:',
  'a lowborn is placed in a simulation of all human history',
  'and must fight from caveman to god...',
  'Survive every era and you are remade as Aurum.',
];

// Opening, part 2: the cutscene, black-and-white anime style. Tap to advance.
// art: image path under public/ (for example '/cutscenes/intro-01.webp'). While art is
// null the game draws a manga-style placeholder and shows the brief for the artist.
// glows: points on the art that pulse gold (the sigils). strong: bigger and brighter.
// at: optional placement for the text over the art, so it doesn't cover the subject
// (CSS positions in % of the frame, for sfx / thought / caption / voice).
// style: 'panel' (default), 'flash' (white-out), 'title' (big title card).
export const INTRO_CUTSCENE = [
  { art: '/cutscenes/intro-01.webp', icon: '🏗', sfx: 'CLANK… CLANK…', caption: 'Lowborn Quarry 9. Third shift.',
    at: { sfx: { left: '4%', top: '52%', right: 'auto' } },
    brief: 'Wide shot: a vast quarry under a gleaming gold spire. Hundreds of lowborn workers, ore carts, smog.' },
  { art: '/cutscenes/intro-02.webp', icon: '⛏', sfx: 'KRAK', thought: 'Same rock. Same quota. Same tower watching.',
    at: { sfx: { left: '4%', top: '30%', right: 'auto' }, thought: { left: 'auto', right: '4%', bottom: '8%' } },
    brief: 'Mid shot: our hero swinging a pick. Long hair, stubble, sweat and dust. Tired eyes.' },
  { art: '/cutscenes/intro-03.webp', icon: '✋', sfx: 'VMMMM', glow: true, thought: 'What…?',
    glows: [{ x: '22.5%', y: '50%' }, { x: '80.4%', y: '35.8%' }], // the sigils flash
    at: { sfx: { left: '41%', top: '9%', right: 'auto' }, thought: { left: '40%', bottom: '7%' } },
    brief: 'Extreme close-up: his hands on the pick handle. The sigils burned into the backs of his hands start to flash.' },
  { art: '/cutscenes/intro-04.webp', icon: '😨', glow: true, thought: "The marks… they've never done that.",
    glows: [{ x: '44.1%', y: '56.4%', strong: true }, { x: '69.2%', y: '66.5%', strong: true }], // burning brighter now
    at: { thought: { left: 'auto', right: '2%', top: '2%', bottom: 'auto', 'max-width': '36%' }, voice: { left: '2%', right: 'auto', bottom: '3%', 'max-width': '34%' } },
    voice: { who: 'Voice from the spire', text: 'Subject 7,301,224. Caste: Primal. You have been selected for the Ascent.' },
    brief: 'Close-up: he stares at his glowing hands. The workers around him back away.' },
  { art: '/cutscenes/intro-05.webp', icon: '🙇', voice: { who: 'Voice from the spire', text: 'Projected survival: 0.003%.' },
    at: { voice: { left: '3%', right: 'auto', top: '6%', bottom: 'auto', 'max-width': '34%' } },
    brief: 'Wide: every worker kneels. A beam of light from the spire falls on him alone.' },
  { art: '/cutscenes/intro-06.webp', style: 'flash', sfx: 'FSSSHHHH',
    glows: [{ x: '46.9%', y: '50%', dust: true }], // what's left of him, drifting up
    at: { sfx: { left: '38%', top: '32%', right: 'auto' } },
    brief: 'White flash: his body breaks apart into a swirl of dust. The pick falls and clatters.' },
  { art: '/cutscenes/intro-07.webp', icon: '🕯', caption: 'Somewhere. Somewhen.', thought: 'Where… am I?',
    glows: [{ x: '84.2%', y: '58%', fire: true }], // the campfire flickers
    at: { caption: { left: '3%', top: '4%' }, thought: { left: '3%', bottom: 'auto', top: '42%', 'max-width': '24%' } },
    brief: 'He lands on cold stone in a cave, coughing up dust. Firelight. He is wearing furs now.' },
  { art: '/cutscenes/intro-08.webp', icon: '🐺', sfx: 'GRRRR',
    glows: [{ x: '21.1%', y: '47.9%', eye: true }, { x: '27.9%', y: '47.1%', eye: true }], // the eyes catch the firelight
    at: { sfx: { left: '5%', right: 'auto', top: '68%' } },
    brief: 'His view: yellow eyes in the dark. A wolf steps into the firelight, snarling.' },
  { style: 'title', title: 'Trial 0', text: 'Fight to the death' },
];

// PROCTOR: the bored game-show host of the Ascent. Every line is a plain joke a new player gets
// on first read, plus something useful. He speaks rarely: first boss wins, once-a-day greetings,
// and when the player is stuck. Routine confirmations are quiet notes instead.
export const PROCTOR = {
  wake: [
    "Oh good, you're awake. Tap Club Strike to hit the wolf. Tap Guard to not get eaten. Those are the two rules of the Stone Age.",
  ],
  tutorialWin: [
    'You beat a wolf with a stick. Honestly? Better than most of my contestants.',
  ],
  starterGrant: [
    "Welcome gift: 300 Soles and three loot boxes. Tap Boxes to open them. I'd say don't spend it all at once, but you will.",
  ],
  // first wins over the three bosses
  bossWin: {
    5: "The Alpha is down. You got its fang, its finisher and its respect. Mostly the fang.",
    10: 'You beat the Sabretooth. With a club. The audience at home is very confused.',
    15: "The Great Mammoth is dead. The Era Key is yours. Build up your Base and you can leave this cave forever. You're welcome.",
  },
  win: [
    'A win! Check the Trial card before the next one. The animals have read it.',
  ],
  replayWin: [
    'Replays drop beast parts. The Workshop turns parts into gear. Gear turns you into less of a snack.',
  ],
  lose: [
    "That didn't go well. Not your fault. Partly your fault.",
    'Defeated. Good news: there is no penalty. Bad news: the wolf is telling everyone.',
    'You lost. Losing is just winning that needs more walking.',
  ],
  // the once-a-day Home greeting when nothing urgent is waiting
  home: [
    'Welcome back. Every 1,000 steps you walk is a loot box. Every couch hour is a loot box you did not get.',
    "I've watched seven million contestants. The ones who walk survive. The ones who don't are on a shelf somewhere.",
    "Tip: the Trial card tells you how each enemy fights. Reading it is free. Dying isn't. Well, it's free too, but it's embarrassing.",
    'Tip: you can only bring 4 skills into a fight. Pick the ones that answer the Trial card.',
    "Tip: forge with a beast part in the third slot and the gear gets a special effect. Wolves drop fangs. Fangs make things bleed.",
    'Fun fact: nobody remembers the last winner. That is not a fun fact. Forget I said it.',
  ],
  walkSmall: [
    '{steps} steps. A stroll. A meander. A good start. Here are your Soles.',
  ],
  walkMid: [
    '{steps} steps. Respectable. The wolves felt that one. Here are your Soles.',
  ],
  walkBig: [
    '{steps} steps?! Fine. FINE. You are allowed to feel something. Go open those boxes.',
  ],
  tooHard: [
    'Too hard? Walk, then train at the Altar and forge better gear. It is called your front door. Use it.',
  ],
  noSoles: [
    'Out of Soles. Soles come from walking. Walking comes from legs. You have legs. I checked.',
  ],
  levelUp: [
    'Level up! Spend your new points on the Hero screen before you forget. You will forget.',
  ],
  build: [
    'Building. It runs on a real-world timer, so go for a walk while it finishes. That was a hint. A big one.',
  ],
  craft: [
    'Forged. Equip it from the Hero screen, or it is just a very expensive rock.',
  ],
  shop: [
    'Everything here costs Soles. Soles come from walking. I am contractually required to keep saying that.',
  ],
  glitchDismiss: [
    'Ignore that. Signal noise. Totally normal. Back to the wolves.',
    'That was not a message. It was static. Static with opinions. Moving on.',
  ],
  wall: [
    "Out of Soles, and this one is a step up. Here is the plan: walk 1,000 steps for a loot box, train at the Altar, then come back. It's called your front door.",
  ],
  boxOpen: [
    'Ooh, a box. Everybody loves a box.',
  ],
  evolveReady: [
    'Era Key, buildings, level: you have all three. Tap Evolve on the Base. The next era is waiting. So am I, unfortunately.',
  ],
};

// Glitches: not from PROCTOR. Shown with scanlines and wrong colors.
export const GLITCHES = [
  'they told you this was a game',
  'count your steps. they do',
  'do not trust the gold',
  'i got further than you. it is not what you think up there',
  'nobody wins. ask who won last time',
  'the boxes are not gifts',
  'look at the truth board. look at what they redacted',
  '7,301,223. remember the number',
];

// Who the glitches and messages come from. Shown as the speaker label.
export const FORMER_TRIBUTE = '7,301,223 (former tribute)';

// Story fragments: found in loot boxes and boss wins, decoded on the Truth Board.
// They read in order as one story: the Truth Board is the journal of what happened
// to the tribute before you. level = Truth Board tier needed. cost = Soles to decode.
// from: who wrote it. FORMER_TRIBUTE fragments are messages left by 7,301,223.
export const FRAGMENTS = [
  { id: 'f1', era: 1, level: 1, cost: 40, kind: 'Corrupted log', title: 'Selection notice',
    text: 'SUBJECT 7,301,223. CASTE: PRIMAL. SELECTED FOR THE ASCENT. PROJECTED SURVIVAL: 0.003%. [STATUS FIELD OVERWRITTEN 41 TIMES]' },
  { id: 'f2', era: 1, level: 1, cost: 40, kind: 'Message', from: FORMER_TRIBUTE, title: 'Scratched into the cave wall',
    text: 'If you are reading this you are the next one. Walk. It makes you stronger. It also makes something else stronger. I have not worked out what.' },
  { id: 'f3', era: 1, level: 1, cost: 60, kind: "PROCTOR's files", title: 'Host directive 1',
    text: 'The host shall discourage the subject. The host shall express no warmth. Reason for directive: ███████████. (Annotation in the margin: "why?")' },
  { id: 'f4', era: 1, level: 1, cost: 60, kind: 'Map piece', title: 'The plot of land',
    text: 'A survey of your base. Under the firepit: a mud-brick wall. Under that: a bronze gate. Under that: something with no era label at all.' },
  { id: 'f5', era: 1, level: 2, cost: 100, kind: 'Message', from: FORMER_TRIBUTE, title: 'Under the firepit',
    text: 'I dug where the map said. There were others before me. Tally marks, hundreds of them, in hands I did not know. Every one of us thought we were the first.' },
  { id: 'f6', era: 1, level: 2, cost: 100, kind: 'Corrupted log', title: 'Winners register',
    text: 'ASCENT WINNERS: [ENTRY 1] ... [ENTRY 2] ... [ENTRY 3] ... All entries list the same body measurements. All entries list a different name. Query: "where did they go?" Response: REMAKE COMPLETE.' },
  { id: 'f7', era: 1, level: 2, cost: 120, kind: 'Message', from: FORMER_TRIBUTE, title: 'Count the jokes',
    text: 'The mammoth is not the hard part. The hard part is when PROCTOR stops joking. Count how often it jokes. Mine stopped in the ninth era.' },
  { id: 'f8', era: 1, level: 3, cost: 200, kind: 'Corrupted log', title: 'Soles: unit definition',
    text: 'SOLE (n.): unit of contestant effort. Original source term redacted by order of the Conclave. Translation flagged "approximate." Do not correct.' },
  { id: 'f9', era: 1, level: 3, cost: 200, kind: 'Message', from: FORMER_TRIBUTE, title: 'Still in here',
    text: 'I am still in here. Pieces of me. I broke something on my way out and it is the only reason you can read this. Do not finish the Ascent. Not yet. Not until you know.' },
];

// Transmissions: broken messages from 7,301,223 (former tribute). The signal only
// gets stronger while you walk; words fill in as it does. Started by first wins.
// steps = steps needed to clear. start = share of words readable at 0% signal.
// after = where it sits in the Truth Board story (after that many fragment parts).
export const TRANSMISSIONS = [
  { id: 't1', after: 0, trial: 4, steps: 1000, start: 0.3,
    text: "they told you this was a game. it isn't. i was 7,301,223. i was a miner too. the tower lit my hands the same way it lit yours. watch your hands when you walk." },
  { id: 't2', after: 4, trial: 10, steps: 2000, start: 0.25,
    text: 'count the jokes. when PROCTOR stops joking, run. mine stopped in the ninth era. i did not run.' },
  { id: 't3', after: 7, trial: 14, steps: 3000, start: 0.2,
    text: 'the mammoth is a door. on the other side, they are watching you. read the whole board before you walk through it. all of it.' },
];

// Memory flickers: 2-shot black-and-white glimpses, shorter than a flashback.
export const FLICKERS = {
  m1: {
    trial: 7,
    shots: [
      { art: null, icon: '✋', glow: true, caption: 'Memory flicker', thought: "Those aren't my hands.",
        brief: "Another miner's hands: older, scarred, the same sigils flashing. Not the hero's." },
      { art: null, icon: '🗼', voice: { who: 'Voice from the spire', text: 'Subject 7,301,223. You have been selected for the Ascent.' },
        brief: 'The same gold spire, seen from a different quarry, years earlier. Same light, different miner.' },
    ],
  },
};

// The first time PROCTOR forgets to joke (Trial 12), then covers it up.
export const PROCTOR_SLIP = [
  'You are progressing faster than projected. The Conclave will be informed.',
  '...That was a joke. Laugh. I said laugh.',
];

// Flashbacks: when every fragment of an era is decoded, the Truth Board plays that era's
// flashback. They are memories recovered from 7,301,223 and continue from era to era.
// Era 1 (Act 1) only hints: no SOULS reveal yet.
export const FLASHBACKS = {
  1: {
    title: 'Memory 1: The first cave',
    source: `Recovered from ${FORMER_TRIBUTE}`,
    panels: [
      { caption: 'Cycle 7,301,223. Era: Primal.', text: 'Cold stone. A wolf breathing somewhere in the dark. A voice that sounded bored before I had done anything at all.' },
      { caption: 'Day 1', speaker: 'PROCTOR', text: 'Oh good, you\'re awake. Try not to die in the first minute; it ruins my numbers.' },
      { caption: 'Day 9', text: 'I walked until my feet bled. Every step, the Soles counter went up. Every step, the sky over the cave got a little brighter. Gold. Like something up there was drinking.' },
      { caption: 'Day 14', text: 'Under the firepit I found tally marks. Hundreds. The last line was scratched deeper than the rest: 7,301,222. The one before me.' },
      { caption: 'Day 15', speaker: 'PROCTOR', text: 'Congratulations. The mammoth is dead. Proceed to the next era.' },
      { caption: 'Day 15', text: 'It did not joke. Not once that day. I took a flint and carved a message into the wall for whoever came next. For you.' },
      { caption: 'End of memory', text: 'The next memory is sealed inside the Brick era.', end: true },
    ],
  },
};

// Achievements. check(state) is evaluated in logic/achievements.js.
export const ACHIEVEMENTS = [
  { id: 'first_blood', name: 'First Blood', text: 'You hit a rock with a slightly different rock. Civilization trembles.', reward: { box: 'bronze' } },
  { id: 'couch_potato', name: 'Couch Potato', text: "You've opened the game 4 times today and walked 212 steps. Even the wolves are worried about you.", reward: null, rewardText: 'No reward. Go outside.' },
  { id: 'mammoth_problems', name: 'Mammoth Problems', text: "You lost to the Great Mammoth 6 times. It's not even a smart animal.", reward: null, rewardText: 'Pity box, empty' },
  { id: 'first_steps', name: 'Baby Steps', text: 'You walked 1,000 steps. A toddler does that before lunch. A proud toddler.', reward: { soles: 20 } },
  { id: 'ten_k', name: 'Ten Thousand Reasons', text: '10,000 steps in one day. The doctors were right. Do not tell them.', reward: { box: 'silver' } },
  { id: 'marathon', name: 'Accidental Marathon', text: '42,195 steps in total. Not a real marathon. We both know that. Take the box anyway.', reward: { box: 'gold' } },
  { id: 'hoarder', name: 'Dragon Behavior', text: 'You are sitting on 1,000 Soles. There are no dragons in this era. Yet.', reward: null, rewardText: 'Spend them.' },
  { id: 'fashion', name: 'Dressed to Kill', text: 'All five gear slots filled. The wolves rate your look a solid 4/10.', reward: { soles: 50 } },
  { id: 'crafter', name: 'Rock + Rock', text: 'You crafted something. Engineers everywhere felt a disturbance.', reward: { soles: 25 } },
  { id: 'builder', name: 'Property Owner', text: 'You built a building. In a cave. Inside a simulation. Real estate is wild.', reward: { soles: 25 } },
  { id: 'skull_crusher', name: 'Skull Crusher', text: 'You earned your first finishing move. The Alpha did not get a vote.', reward: { box: 'silver' } },
  { id: 'alpha_down', name: 'Pack Leader', text: 'You defeated the Alpha Wolf. The pack is under new management.', reward: null, rewardText: 'Respect (not redeemable)' },
  { id: 'sabre_down', name: 'Dentist', text: 'You beat the Sabretooth. Its teeth were bigger than your argument, and still.', reward: { box: 'silver' } },
  { id: 'mammoth_down', name: 'Extinction Event', text: 'You killed the Great Mammoth. Historians will blame climate change.', reward: { box: 'gold' } },
  { id: 'no_damage', name: 'Untouchable', text: 'You won a Trial without taking damage. Show-off.', reward: { soles: 40 } },
  { id: 'grinder', name: 'Same Wolf, Different Day', text: 'You replayed Trials 10 times. The wolves have started a union.', reward: { soles: 30 } },
  { id: 'truth_seeker', name: 'Conspiracy Corkboard', text: 'You decoded a fragment on the Truth Board. Red string sold separately.', reward: null, rewardText: 'Knowledge. Allegedly.' },
  { id: 'big_spender', name: 'Gym Membership', text: 'You bought XP with Soles. Training is valid. Shortcuts are... also valid.', reward: null, rewardText: 'Gains' },
  { id: 'era_key', name: 'Keymaster', text: 'You hold the Era Key. It opens the next era. It also opens a can of worms.', reward: null, rewardText: 'The future' },
  { id: 'rest_day', name: 'Rest Is Training', text: 'You came back after a day off. The wolves waited. They are polite like that.', reward: { box: 'bronze' } },
];
