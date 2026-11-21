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
// art: image path under public/ (for example 'cutscenes/intro-01.jpg'). While art is
// null the game draws a manga-style placeholder and shows the brief for the artist.
// style: 'panel' (default), 'flash' (white-out), 'title' (big title card).
export const INTRO_CUTSCENE = [
  { art: null, icon: '🏗', sfx: 'CLANK… CLANK…', caption: 'Lowborn Quarry 9. Third shift.',
    brief: 'Wide shot: a vast quarry under a gleaming gold spire. Hundreds of lowborn workers, ore carts, smog.' },
  { art: null, icon: '⛏', sfx: 'KRAK', thought: 'Same rock. Same quota. Same tower watching.',
    brief: 'Mid shot: our hero swinging a pick. Long hair, stubble, sweat and dust. Tired eyes.' },
  { art: null, icon: '✋', sfx: 'VMMMM', glow: true, thought: 'What…?',
    brief: 'Extreme close-up: his hands on the pick handle. The sigils burned into the backs of his hands start to flash.' },
  { art: null, icon: '😨', glow: true, thought: "The marks… they've never done that.",
    voice: { who: 'Voice from the spire', text: 'Subject 7,301,224. Caste: Primal. You have been selected for the Ascent.' },
    brief: 'Close-up: he stares at his glowing hands. The workers around him back away.' },
  { art: null, icon: '🙇', voice: { who: 'Voice from the spire', text: 'Projected survival: 0.003%.' },
    brief: 'Wide: every worker kneels. A beam of light from the spire falls on him alone.' },
  { art: null, style: 'flash', sfx: 'FSSSHHHH',
    brief: 'White flash: his body breaks apart into a swirl of dust. The pick falls and clatters.' },
  { art: null, icon: '🕯', caption: 'Somewhere. Somewhen.', thought: 'Where… am I?',
    brief: 'He lands on cold stone in a cave, coughing up dust. Firelight. He is wearing furs now.' },
  { art: null, icon: '🐺', sfx: 'GRRRR',
    brief: 'His view: yellow eyes in the dark. A wolf steps into the firelight, snarling.' },
  { style: 'title', title: 'Trial 0', text: 'Fight to the death' },
];

export const PROCTOR = {
  wake: [
    "Oh good, you're awake. A wolf has noticed you. Try not to die in the first minute; it ruins my numbers.",
  ],
  tutorialWin: [
    "You beat a wolf with a stick. Write that down. Actually, don't, you can't write yet.",
  ],
  starterGrant: [
    "Standard issue for new subjects: 300 Soles and three loot boxes. Don't spend it all on rocks. You will, though.",
  ],
  home: [
    'Welcome back, Subject. The cave missed you. It did not.',
    'Your Soles are showing. Spend them before I start charging rent.',
    'Reminder: the simulation runs on your effort. Your effort is currently "couch".',
    'Every step you take powers the Ascent. Why? Read the terms and conditions. There are no terms and conditions.',
    'I have run this trial seven million times. You are, statistically, in the bottom half. Of something.',
    'Fun fact: nobody remembers the last winner. That is not a fun fact. Forget I said it.',
  ],
  walkSmall: [
    '{steps} steps. A stroll. A meander. A rounding error.',
    '{steps} steps. I have seen houseplants with more ambition.',
  ],
  walkMid: [
    '{steps} steps. Acceptable. Barely. Here are your Soles.',
    '{steps} steps. The wolves felt that one. Not much, but they felt it.',
  ],
  walkBig: [
    '{steps} steps?! Fine. FINE. You are allowed to feel something.',
    '{steps} steps. The simulation hums. I did not tell it to hum.',
  ],
  win: [
    'Victory. Your ancestors are proud. They are also you. It is complicated.',
    'It is dead. You are not. That is the whole game, really.',
    'Adequate violence. Moving on.',
  ],
  replayWin: [
    'You beat it again. It did not get smarter. Neither did you. Have some flint.',
    'Replay complete. Scraps for the scavenger.',
  ],
  lose: [
    'You died. The simulation put you back together. It sighed while doing it.',
    'Interesting strategy, losing. Bold. Have you tried walking more?',
    'Defeat. Perhaps the answer is outside. Literally outside. The door. Use it.',
  ],
  tooHard: [
    'It is called your front door. Use it.',
  ],
  noSoles: [
    'Out of Soles. Soles come from walking. Walking comes from legs. You have legs. I checked.',
  ],
  levelUp: [
    'Level up. Your stats went up. Your posture did not.',
    'Another level. The Aurum are trembling. That is a lie; they are asleep.',
  ],
  build: [
    'Construction begun. Please enjoy this real-world timer, a feature I designed out of spite.',
    'Building. Go for a walk while it finishes. That was a hint. A big one.',
  ],
  craft: [
    'You smushed two things together and made a third thing. Tens of thousands of years of progress, in one tap.',
    'Crafted. It is almost useful.',
  ],
  shop: [
    'Everything is for sale. Except Soles. Those you earn. With feet.',
  ],
  glitchDismiss: [
    'Ignore that. Cosmic ray. Very common. Totally normal. Back to the wolves.',
    'That was a rendering artifact. Do not look at it. Look at the wolves.',
    'Who said that? Nobody. Static. Next.',
  ],
  wall: [
    "Out of Soles, and Trial 6 has three wolves. Here is a novel idea: walk 1,000 steps. A loot box, your upgrade, and that annoying signal will all be waiting. It's called your front door.",
  ],
  boxOpen: [
    'Ooh, a box. Everybody loves a box.',
    'Open it. Feel the dopamine. I am legally required to say that is a joke.',
  ],
  evolveReady: [
    'Key, buildings, level. You have all three. The next era is waiting. So am I, unfortunately.',
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

// The first loss at these Trials brings a hint from 7,301,223 (former tribute): losing still moves
// the story along, and the hint teaches the fight.
export const LOSS_TIPS = {
  4: 'the beta leads them. it dies first, or you do.',
  5: 'the alpha howls for help. a thrown stone shuts it up.',
  6: 'hyenas get braver together. thin them out. fire scares them.',
  7: 'when the lion goes still, it is about to jump. hit it with a stone.',
  9: 'three lions. stop the pounces. you cannot take all three.',
  10: 'the sabretooth makes you bleed. close the wound or it finishes you slowly.',
  11: 'the elk goes mad when it is hurt. save your strength for the end.',
  13: 'your club bounces off the rhino. something sharper. or fire.',
  15: 'she gets angrier the more she bleeds. i lost here twice. build for her.',
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
