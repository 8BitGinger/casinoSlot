// ---------------------------------------------------------------------------
// Elements
// ---------------------------------------------------------------------------
const spinBtn = document.getElementById('spin'),
  rebuyBtn = document.getElementById('rebuy'),
  betDownBtn = document.getElementById('betDown'),
  betUpBtn = document.getElementById('betUp'),
  balanceEl = document.getElementById('balance'),
  betEl = document.getElementById('bet'),
  lastWinEl = document.getElementById('lastWin'),
  messageEl = document.getElementById('message'),
  lightSweepEl = document.querySelector('.light-sweep'),
  confettiCanvas = document.getElementById('confetti'),
  characterModalEl = document.getElementById('characterModal'),
  dealerDockEl = document.getElementById('characterDock'),
  dealerPortraitEl = document.getElementById('dealerPortrait'),
  dealerNameEl = document.getElementById('dealerName'),
  dealerSpeechEl = document.getElementById('dealerSpeech'),
  changeCharacterBtn = document.getElementById('changeCharacter'),
  dealerThumbEl = document.getElementById('dealerThumb');

// ---------------------------------------------------------------------------
// Game config
// ---------------------------------------------------------------------------
// Mapping of indexes to icons: start from banana in middle of initial position and then upwards
const iconMap = [
  'banana',
  'seven',
  'cherry',
  'plum',
  'orange',
  'bell',
  'bar',
  'lemon',
  'melon',
];

// Payout multipliers (x bet). "three" = all three reels match, "two" = two adjacent reels match.
const PAYTABLE = {
  seven: { three: 150, two: 20 },
  bar: { three: 75, two: 12 },
  bell: { three: 40, two: 8 },
  cherry: { three: 25, two: 5 },
  melon: { three: 18, two: 4 },
  orange: { three: 14, two: 3 },
  plum: { three: 10, two: 2 },
  lemon: { three: 8, two: 2 },
  banana: { three: 6, two: 1 },
};

const STARTING_BALANCE = 1000,
  BET_STEP = 10,
  MIN_BET = 10,
  MAX_BET = 500,
  // Width/height of the icons
  icon_width = 79,
  icon_height = 79,
  // Number of icons in the strip
  num_icons = 9,
  // Max-speed in ms for animating one icon down
  time_per_icon = 100;

// Holds icon indexes per reel
const indexes = [0, 0, 0];

// ---------------------------------------------------------------------------
// Persisted state (balance + bet), stored as play money only
// ---------------------------------------------------------------------------
const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable (private mode, etc.) - game still works, just won't persist */
    }
  },
};

let balance = storage.get('casinoBalance', STARTING_BALANCE);
let bet = storage.get('casinoBet', MIN_BET);

function saveState() {
  storage.set('casinoBalance', balance);
  storage.set('casinoBet', bet);
}

function renderStats(winAmount = null) {
  balanceEl.textContent = balance;
  betEl.textContent = bet;
  if (winAmount !== null) lastWinEl.textContent = winAmount;

  betDownBtn.disabled = bet <= MIN_BET;
  betUpBtn.disabled = bet >= MAX_BET || bet + BET_STEP > balance;
}

function adjustBet(delta) {
  const next = bet + delta;
  if (next < MIN_BET || next > MAX_BET || next > balance) return;
  bet = next;
  saveState();
  renderStats();
}

betDownBtn.addEventListener('click', () => adjustBet(-BET_STEP));
betUpBtn.addEventListener('click', () => adjustBet(BET_STEP));

rebuyBtn.addEventListener('click', () => {
  balance = STARTING_BALANCE;
  bet = Math.min(bet, balance, MAX_BET);
  saveState();
  rebuyBtn.hidden = true;
  spinBtn.hidden = false;
  messageEl.textContent = 'Balance topped up. Good luck!';
  say('rebuy');
  renderStats();
});

// ---------------------------------------------------------------------------
// Dealers (character select + speakeasy dialogue)
// ---------------------------------------------------------------------------
const CHARACTERS = {
  vinnie: {
    name: '"Lucky" Vinnie Marconi',
    title: 'The Pit Boss',
    portrait: './assets/characters/vinnie.png',
    bio: "Runs the back room behind a tailor shop on 9th. Keeps the games square, the whiskey poured, and the dough moving. Nobody's ever seen him lose his cool — or his hat.",
    lines: {
      greet: [
        "Pull up a chair, pal — the house don't bite. Much.",
        "Name's Vinnie. Let's see what kinda dough we can make tonight.",
      ],
      spin: ['Here we go, see...', "Don't blink, pal.", 'Watch the wheels, watch the dough.'],
      lose: [
        'Eh, no dice. The house always gets its cut first.',
        'Tough break, pal. Try again.',
        "Ain't your night yet, see.",
      ],
      minor: (symbol, amt) => `A little ${symbol} action, pal — that's ${amt} in your pocket. Not bad, see.`,
      jackpot: (symbol, amt) =>
        `JACKPOT! ${symbol.toUpperCase()}S all around — that's ${amt} big ones! Now THAT'S a square deal!`,
      broke: ["Pockets are light, pal. Even the house extends credit once in a while."],
      rebuy: ["There ya go — fresh dough. Don't make me regret it, see."],
    },
  },
  doc: {
    name: '"Doc" Jericho Holt',
    title: 'The Card Shark',
    portrait: './assets/characters/doc.png',
    bio: "Used to deal on a riverboat till the house got wise to his luck. Now he runs the floor — slow talk, sharp eyes, and a pocket watch he swears is lucky.",
    lines: {
      greet: [
        "Hey now, cool cat. Name's Doc. Let's see if Lady Luck's swingin' tonight.",
        "Pull up close — the reels don't wait for nobody.",
      ],
      spin: ['Here it swings...', 'Easy now, let it ride.', 'Watch close, cat.'],
      lose: [
        "Cold deal, cat. The reels don't owe nobody nothin'.",
        'No dice this round, but stay cool.',
        'Swing and a miss, boss.',
      ],
      minor: (symbol, amt) => `Little ${symbol} groove right there — ${amt} smooth ones for ya. Solid.`,
      jackpot: (symbol, amt) => `Now THAT'S swingin'! Triple ${symbol}, cat — ${amt} big ones just for you!`,
      broke: ["Tank's dry, cat. Even the coolest cats run outta gas sometime."],
      rebuy: ['There it is — fresh stack. Keep it cool out there.'],
    },
  },
  glo: {
    name: 'Gloria "Glo" Delacroix',
    title: 'The Hostess',
    portrait: './assets/characters/glo.png',
    bio: "Runs the front of house and sings a little after midnight. Sharp tongue, sharper instincts — she's never once bought her own drink.",
    lines: {
      greet: [
        "Well hello there, doll. I'm Glo — I run this joint, and tonight you're my guest.",
        'Pull up a seat, sugar. Let’s make this hotsy-totsy.',
      ],
      spin: ['Here we go, doll...', 'Hold onto your hat.', 'Watch close, sugar.'],
      lose: [
        'Aw, says you! No luck this time, doll.',
        'Not quite, sugar — try your hand again.',
        'The reels are playing hard to get.',
      ],
      minor: (symbol, amt) => `A ${symbol} or two, doll — ${amt} smackers, the cat's pajamas!`,
      jackpot: (symbol, amt) => `BEE'S KNEES! Triple ${symbol}, doll — ${amt} smackers, hotsy-totsy!`,
      broke: ['Purse is empty, sugar. Even the swellest dolls go bust sometime.'],
      rebuy: ["There ya go, doll — topped right up. Now show 'em how it's done."],
    },
  },
};

let currentCharacterId = storage.get('casinoCharacter', null);

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function say(eventKey, ...args) {
  if (!currentCharacterId) return;
  const character = CHARACTERS[currentCharacterId];
  const line = character.lines[eventKey];
  const text = typeof line === 'function' ? line(...args) : pick(line);
  dealerSpeechEl.textContent = text;
}

function showDock(character) {
  dealerPortraitEl.src = character.portrait;
  dealerPortraitEl.alt = character.name;
  dealerNameEl.textContent = character.name;
  dealerThumbEl.src = character.portrait;
  dealerThumbEl.alt = `Change dealer (currently ${character.name})`;
  dealerDockEl.hidden = false;
  changeCharacterBtn.hidden = false;
}

function selectCharacter(id) {
  currentCharacterId = id;
  storage.set('casinoCharacter', id);
  characterModalEl.hidden = true;
  characterModalEl.innerHTML = '';
  showDock(CHARACTERS[id]);
  say('greet');
}

function renderCharacterModal() {
  const inner = document.createElement('div');
  inner.className = 'character-modal__inner';

  const title = document.createElement('h2');
  title.className = 'character-modal__title';
  title.textContent = 'Pick Your Dealer';

  const sub = document.createElement('p');
  sub.className = 'character-modal__sub';
  sub.textContent = 'Choose who runs your table tonight';

  const grid = document.createElement('div');
  grid.className = 'character-modal__grid';

  Object.entries(CHARACTERS).forEach(([id, character]) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'character-card';

    const img = document.createElement('img');
    img.className = 'character-card__portrait';
    img.src = character.portrait;
    img.alt = character.name;

    const name = document.createElement('h3');
    name.className = 'character-card__name';
    name.textContent = character.name;

    const subtitle = document.createElement('p');
    subtitle.className = 'character-card__title';
    subtitle.textContent = character.title;

    const bio = document.createElement('p');
    bio.className = 'character-card__bio';
    bio.textContent = character.bio;

    card.append(img, name, subtitle, bio);
    card.addEventListener('click', () => selectCharacter(id));
    grid.appendChild(card);
  });

  inner.append(title, sub, grid);
  characterModalEl.innerHTML = '';
  characterModalEl.appendChild(inner);
  characterModalEl.hidden = false;
}

changeCharacterBtn.addEventListener('click', renderCharacterModal);

// ---------------------------------------------------------------------------
// Reel animation
// ---------------------------------------------------------------------------
/**
 * Roll one reel
 */
const roll = (reel, offset = 0) => {
  // Minimum of 2 + the reel offset rounds
  const delta =
    (offset + 2) * num_icons + Math.round(Math.random() * num_icons);

  // Return promise so we can wait for all reels to finish
  return new Promise((resolve) => {
    const style = getComputedStyle(reel),
      // Current background position
      backgroundPositionY = parseFloat(style['background-position-y']),
      // Target background position
      targetBackgroundPositionY = backgroundPositionY + delta * icon_height,
      // Normalized background position, for reset
      normTargetBackgroundPositionY =
        targetBackgroundPositionY % (num_icons * icon_height);

    // Delay animation with timeout
    setTimeout(() => {
      reel.style.transition = `background-position-y ${(8 + 1 * delta) * time_per_icon}ms cubic-bezier(.41,-0.01,.63,1.09)`;
      // Set background position
      reel.style.backgroundPositionY = `${backgroundPositionY + delta * icon_height}px`;
    }, offset * 150);

    // After animation
    setTimeout(
      () => {
        // Reset position, so that it doesn't get higher without limit
        reel.style.transition = `none`;
        reel.style.backgroundPositionY = `${normTargetBackgroundPositionY}px`;
        // Resolve this promise
        resolve(delta % num_icons);
      },
      (8 + 1 * delta) * time_per_icon + offset * 150
    );
  });
};

/**
 * Evaluate the spin result against the paytable and award winnings.
 */
function evaluateWin() {
  const [a, b, c] = indexes;
  const allMatch = a === b && b === c;
  const adjacentMatch = !allMatch && (a === b || b === c);

  if (!allMatch && !adjacentMatch) {
    messageEl.textContent = indexes.map((i) => iconMap[i]).join(' - ');
    return null;
  }

  const symbol = allMatch ? iconMap[a] : iconMap[b];
  const multiplier = allMatch ? PAYTABLE[symbol].three : PAYTABLE[symbol].two;
  const winAmount = multiplier * bet;

  return { tier: allMatch ? 'jackpot' : 'minor', symbol, winAmount };
}

/**
 * Roll all reels, resolve balance/bet changes, and trigger win FX.
 */
function rollAll() {
  if (bet > balance) {
    messageEl.textContent = 'Not enough credits for this bet.';
    say('broke');
    return;
  }

  balance -= bet;
  saveState();
  renderStats();

  messageEl.textContent = 'Spinning...';
  say('spin');
  spinBtn.disabled = true;
  betDownBtn.disabled = true;
  betUpBtn.disabled = true;

  const reelsList = document.querySelectorAll('.slots > .reel');

  Promise
    // Activate each reel, must convert NodeList to Array for this with spread operator
    .all([...reelsList].map((reel, i) => roll(reel, i)))

    // When all reels done animating (all promises resolve)
    .then((deltas) => {
      // add up indexes
      deltas.forEach(
        (delta, i) => (indexes[i] = (indexes[i] + delta) % num_icons)
      );

      const result = evaluateWin();

      if (result) {
        balance += result.winAmount;
        saveState();
        messageEl.textContent = `${result.symbol.toUpperCase()} ${
          result.tier === 'jackpot' ? 'JACKPOT' : 'WIN'
        }! +${result.winAmount}`;
        say(result.tier, result.symbol, result.winAmount);
        renderStats(result.winAmount);
        triggerWinFx(result.tier);
      } else {
        say('lose');
        renderStats();
      }

      spinBtn.disabled = false;
      betDownBtn.disabled = bet <= MIN_BET;
      betUpBtn.disabled = bet >= MAX_BET || bet + BET_STEP > balance;

      if (balance < MIN_BET) {
        spinBtn.hidden = true;
        rebuyBtn.hidden = false;
        say('broke');
      }
    });
}

spinBtn.addEventListener('click', rollAll);

// ---------------------------------------------------------------------------
// Win FX: slot glow, screen light sweep, confetti burst (jackpot only)
// ---------------------------------------------------------------------------
function triggerWinFx(tier) {
  const slotsEl = document.querySelector('.slots');
  const glowClass = tier === 'jackpot' ? 'win-jackpot' : 'win-minor';
  const sweepClass = tier === 'jackpot' ? 'active-jackpot' : 'active-minor';
  const duration = tier === 'jackpot' ? 1600 : 1000;

  slotsEl.classList.add(glowClass);
  lightSweepEl.classList.add(sweepClass);

  setTimeout(() => {
    slotsEl.classList.remove(glowClass);
    lightSweepEl.classList.remove(sweepClass);
  }, duration);

  if (tier === 'jackpot') burstConfetti();
}

// Lightweight canvas confetti burst, no external dependencies.
const confettiCtx = confettiCanvas.getContext('2d');
let confettiParticles = [];
let confettiAnimId = null;

function resizeConfettiCanvas() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
resizeConfettiCanvas();
window.addEventListener('resize', resizeConfettiCanvas);

function burstConfetti() {
  const colors = ['#ffb627', '#ffe08a', '#c22a2a', '#7fd8ff', '#8affc1', '#ffffff'];
  const count = 140;

  confettiParticles = Array.from({ length: count }, () => ({
    x: confettiCanvas.width / 2,
    y: confettiCanvas.height / 2,
    vx: (Math.random() - 0.5) * 14,
    vy: Math.random() * -12 - 4,
    size: Math.random() * 6 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 12,
    gravity: 0.35 + Math.random() * 0.15,
    life: 0,
    maxLife: 90 + Math.random() * 30,
  }));

  if (!confettiAnimId) confettiAnimId = requestAnimationFrame(animateConfetti);
}

function animateConfetti() {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

  confettiParticles.forEach((p) => {
    p.vy += p.gravity;
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.rotationSpeed;
    p.life += 1;

    const alpha = Math.max(0, 1 - p.life / p.maxLife);
    confettiCtx.save();
    confettiCtx.globalAlpha = alpha;
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate((p.rotation * Math.PI) / 180);
    confettiCtx.fillStyle = p.color;
    confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    confettiCtx.restore();
  });

  confettiParticles = confettiParticles.filter((p) => p.life < p.maxLife);

  if (confettiParticles.length > 0) {
    confettiAnimId = requestAnimationFrame(animateConfetti);
  } else {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiAnimId = null;
  }
}

// ---------------------------------------------------------------------------
// Kickoff
// ---------------------------------------------------------------------------
renderStats();
if (balance < MIN_BET) {
  spinBtn.hidden = true;
  rebuyBtn.hidden = false;
} else {
  messageEl.textContent = 'Place your bet and spin!';
}

if (currentCharacterId && CHARACTERS[currentCharacterId]) {
  showDock(CHARACTERS[currentCharacterId]);
  say('greet');
} else {
  renderCharacterModal();
}
