// ---------- pet types ----------
const KINDS = [
  { id: 'cat',     emoji: '🐱', kind: 'kitty',   food: ['🐟', '🥛'],  sound: 'meow~' },
  { id: 'dog',     emoji: '🐶', kind: 'puppy',   food: ['🦴', '🍖'],  sound: 'woof!' },
  { id: 'bunny',   emoji: '🐰', kind: 'bunny',   food: ['🥕', '🥬'],  sound: '*nose wiggle*' },
  { id: 'hamster', emoji: '🐹', kind: 'hamster', food: ['🌻', '🥜'],  sound: 'squeak!' },
  { id: 'panda',   emoji: '🐼', kind: 'panda',   food: ['🎋', '🍙'],  sound: '*happy roll*' },
  { id: 'chick',   emoji: '🐥', kind: 'chick',   food: ['🌽', '🐛'],  sound: 'peep peep!' },
];

const SAVE_KEY = 'pocket-pet-save';
const TICK_MS = 4000; // how often stats go down

// ---------- state ----------
const $ = id => document.getElementById(id);
let state = null;      // { kindId, name, food, happy, energy, sleeping, born, lastSeen }
let chosenKind = null;
let bubbleTimer = null;

const kind = () => KINDS.find(k => k.id === state.kindId);
const clamp = n => Math.max(0, Math.min(100, n));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// ---------- saving (wrapped in try in case storage is blocked) ----------
function save() {
  state.lastSeen = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
}
function load() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; }
}

// ---------- adopt screen ----------
function buildChoices() {
  KINDS.forEach(k => {
    const b = document.createElement('button');
    b.className = 'choice';
    b.innerHTML = '<span class="emoji">' + k.emoji + '</span><span class="kind">' + k.kind + '</span>';
    b.addEventListener('click', () => {
      document.querySelectorAll('.choice').forEach(c => c.classList.remove('selected'));
      b.classList.add('selected');
      chosenKind = k.id;
      if (!$('nameInput').value) $('nameInput').placeholder = 'name your ' + k.kind;
      checkReady();
    });
    $('choices').appendChild(b);
  });
}

function checkReady() {
  $('adoptBtn').disabled = !(chosenKind && $('nameInput').value.trim());
}

function adopt() {
  state = {
    kindId: chosenKind,
    name: $('nameInput').value.trim(),
    food: 80, happy: 80, energy: 80,
    sleeping: false,
    born: Date.now(),
    lastSeen: Date.now(),
  };
  save();
  showPet();
  say('hi! I\'m ' + state.name + '! ' + kind().sound);
}

// ---------- pet screen ----------
function showPet() {
  $('adoptScreen').classList.add('hidden');
  $('petScreen').classList.remove('hidden');
  $('petEmoji').textContent = kind().emoji;
  $('petName').textContent = state.name;
  render();
}

function render() {
  setBar('barFood', state.food);
  setBar('barHappy', state.happy);
  setBar('barEnergy', state.energy);

  const days = Math.floor((Date.now() - state.born) / 86400000);
  $('petAge').textContent = 'a ' + kind().kind + ' · ' + (days === 0 ? 'adopted today' : days + (days === 1 ? ' day' : ' days') + ' old');

  $('room').classList.toggle('night', state.sleeping);
  const pet = $('pet');
  pet.classList.toggle('sleeping', state.sleeping);
  pet.classList.toggle('sad', !state.sleeping && (state.food < 20 || state.happy < 20));
  document.querySelector('[data-act="sleep"]').classList.toggle('on', state.sleeping);
  document.querySelector('[data-act="sleep"]').lastChild.textContent = state.sleeping ? 'wake' : 'sleep';
}

function setBar(id, value) {
  const bar = $(id);
  bar.style.width = value + '%';
  bar.classList.toggle('mid', value < 50 && value >= 25);
  bar.classList.toggle('low', value < 25);
}

function say(text, ms = 1800) {
  const b = $('bubble');
  b.textContent = text;
  b.classList.add('show');
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => b.classList.remove('show'), ms);
}

function animatePet(cls) {
  const pet = $('pet');
  pet.classList.remove('happy', 'munch', 'play');
  void pet.offsetWidth; // restart the animation
  pet.classList.add(cls);
  setTimeout(() => pet.classList.remove(cls), 1500);
}

function floatThing(emoji, type, leftPct) {
  const f = document.createElement('div');
  f.className = 'float ' + type;
  f.textContent = emoji;
  if (leftPct !== undefined) f.style.left = leftPct + '%';
  if (type === 'heart') f.style.bottom = '140px';
  $('room').appendChild(f);
  setTimeout(() => f.remove(), 1500);
}

// ---------- actions ----------
const ACTIONS = {
  pet() {
    if (state.sleeping) return say('shhh... sleeping 💤');
    state.happy = clamp(state.happy + 8);
    animatePet('happy');
    for (let i = 0; i < 3; i++) {
      setTimeout(() => floatThing(pick(['💕', '💖', '💗', '✨']), 'heart', 35 + Math.random() * 30), i * 150);
    }
    say(state.happy >= 100 ? 'I love you SO much 🥹' : pick([kind().sound, 'hehe 💕', 'more pets!', 'that\'s the spot~']));
  },

  feed() {
    if (state.sleeping) return say('zzz... (too sleepy to eat)');
    if (state.food >= 95) return say('I\'m so full! 🫃');
    state.food = clamp(state.food + 20);
    floatThing(pick(kind().food), 'food', 46);
    setTimeout(() => animatePet('munch'), 450);
    setTimeout(() => say(pick(['yummy!! 😋', 'nom nom nom', 'my favorite!'])), 600);
  },

  play() {
    if (state.sleeping) return say('5 more minutes... 💤');
    if (state.energy < 15) return say('too tired to play 🥱');
    state.happy = clamp(state.happy + 15);
    state.energy = clamp(state.energy - 15);
    state.food = clamp(state.food - 5);
    floatThing('🎾', 'ball');
    animatePet('play');
    say(pick(['wheee!! 🎾', 'again again!', 'best day ever!']));
  },

  sleep() {
    state.sleeping = !state.sleeping;
    say(state.sleeping ? 'goodnight 🌙' : (state.energy > 70 ? 'good morning! ☀️' : 'still sleepy... 🥱'));
  },
};

// ---------- time passing ----------
function tick(steps = 1) {
  for (let i = 0; i < steps; i++) {
    state.food = clamp(state.food - 1);
    if (state.sleeping) {
      state.energy = clamp(state.energy + 3);
      state.happy = clamp(state.happy - 0.3);
    } else {
      state.happy = clamp(state.happy - 1);
      state.energy = clamp(state.energy - 0.5);
    }
  }
  // round so the bars don't show weird decimals
  state.food = Math.round(state.food);
  state.happy = Math.round(state.happy);
  state.energy = Math.round(state.energy);
}

function nudge() {
  if (state.sleeping) {
    if (state.energy >= 100) { state.sleeping = false; say('I\'m all rested! ☀️'); }
    return;
  }
  if (state.food < 20) say('I\'m hungry... 🥺');
  else if (state.energy < 15) say('so sleepy... 🥱');
  else if (state.happy < 20) say('play with me? 🥺');
}

// ---------- start ----------
buildChoices();
$('nameInput').addEventListener('input', checkReady);
$('adoptBtn').addEventListener('click', adopt);
$('pet').addEventListener('click', () => { ACTIONS.pet(); render(); save(); });

document.querySelectorAll('.act').forEach(btn => {
  btn.addEventListener('click', () => {
    ACTIONS[btn.dataset.act]();
    render();
    save();
  });
});

$('newPetBtn').addEventListener('click', () => {
  if (!confirmNew()) return;
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  state = null;
  chosenKind = null;
  $('nameInput').value = '';
  document.querySelectorAll('.choice').forEach(c => c.classList.remove('selected'));
  checkReady();
  $('petScreen').classList.add('hidden');
  $('adoptScreen').classList.remove('hidden');
});

// tap "new pet" twice to confirm (no pop-up needed)
let newPetArmed = false;
function confirmNew() {
  if (newPetArmed) return true;
  newPetArmed = true;
  $('newPetBtn').textContent = 'tap again 🥺';
  setTimeout(() => { newPetArmed = false; $('newPetBtn').textContent = 'new pet'; }, 2500);
  return false;
}

setInterval(() => {
  if (!state) return;
  tick();
  nudge();
  render();
  save();
}, TICK_MS);

// welcome back an existing pet, catching up on time away (max 12 hours)
const saved = load();
if (saved && saved.kindId) {
  state = saved;
  const away = Math.min(Date.now() - (state.lastSeen || Date.now()), 12 * 3600 * 1000);
  tick(Math.floor(away / TICK_MS / 10)); // time away passes 10x slower, so pets don't starve overnight
  showPet();
  say('you\'re back!! ' + kind().sound, 2500);
  save();
}
