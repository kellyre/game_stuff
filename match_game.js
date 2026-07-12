'use strict';

/* Spanish/English matching game.
   Pure helpers are exported at the bottom for node-based tests. */

const DEFAULT_PAIRS = [
  ['hola', 'hello'], ['adiós', 'goodbye'], ['gracias', 'thank you'], ['por favor', 'please'],
  ['agua', 'water'], ['casa', 'house'], ['perro', 'dog'], ['gato', 'cat'],
  ['libro', 'book'], ['mesa', 'table'], ['silla', 'chair'], ['puerta', 'door'],
  ['ventana', 'window'], ['comida', 'food'], ['leche', 'milk'], ['pan', 'bread'],
  ['queso', 'cheese'], ['manzana', 'apple'], ['plátano', 'banana'], ['huevo', 'egg'],
  ['carne', 'meat'], ['pescado', 'fish'], ['pollo', 'chicken'], ['arroz', 'rice'],
  ['sal', 'salt'], ['azúcar', 'sugar'], ['café', 'coffee'], ['vino', 'wine'],
  ['amigo', 'friend'], ['familia', 'family'], ['madre', 'mother'], ['padre', 'father'],
  ['hermano', 'brother'], ['hermana', 'sister'], ['hijo', 'son'], ['hija', 'daughter'],
  ['hombre', 'man'], ['mujer', 'woman'], ['ciudad', 'city'], ['calle', 'street'],
  ['coche', 'car'], ['tren', 'train'], ['avión', 'airplane'], ['escuela', 'school'],
  ['trabajo', 'work'], ['dinero', 'money'], ['día', 'day'], ['noche', 'night'],
  ['sol', 'sun'], ['luna', 'moon'], ['mar', 'sea'], ['montaña', 'mountain'],
  ['árbol', 'tree'], ['flor', 'flower'], ['verde', 'green'], ['rojo', 'red'],
  ['azul', 'blue'], ['negro', 'black'], ['grande', 'big'], ['pequeño', 'small'],
  ['feliz', 'happy'], ['triste', 'sad'],
];

const PAIRS_PER_GAME = 8; // 8 pairs -> 16 cards -> 4x4

function shuffle(items, rng = Math.random) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickPairs(pairs, count = PAIRS_PER_GAME, rng = Math.random) {
  return shuffle(pairs, rng).slice(0, count);
}

// Accepts "hola, hello" / "hola = hello" / "hola - hello" / tab-separated, one pair per line.
function parsePairs(text) {
  const pairs = [];
  const errors = [];
  const lines = String(text).split('\n');

  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;

    const parts = line.split(/\t|,|=|\s+-\s+|\s+–\s+/);
    if (parts.length !== 2) {
      errors.push(`Line ${i + 1}: expected "spanish, english" — got "${line}"`);
      return;
    }
    const es = parts[0].trim();
    const en = parts[1].trim();
    if (!es || !en) {
      errors.push(`Line ${i + 1}: both words are required — got "${line}"`);
      return;
    }
    pairs.push([es, en]);
  });

  return { pairs, errors };
}

function buildDeck(chosenPairs, rng = Math.random) {
  const cards = [];
  chosenPairs.forEach(([es, en], pairId) => {
    cards.push({ id: `${pairId}-es`, pairId, lang: 'es', word: es, matched: false });
    cards.push({ id: `${pairId}-en`, pairId, lang: 'en', word: en, matched: false });
  });
  return shuffle(cards, rng);
}

function partnerOf(deck, card) {
  return deck.find((c) => c.pairId === card.pairId && c.id !== card.id);
}

/* A miss is "should have known" when the translation of the FIRST card flipped had
   already been revealed earlier — the player had the information and still missed.
   Partner-of-first is never the second card on a miss, so a `seen` hit here always
   refers to an earlier turn. */
function isForgottenMiss(deck, first, second, seen) {
  if (first.pairId === second.pairId) return false;
  const partner = partnerOf(deck, first);
  return !!partner && seen.has(partner.id);
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ---------- DOM wiring (skipped under node) ---------- */

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const $ = (id) => document.getElementById(id);
    const setup = $('setup');
    const board = $('board');
    const grid = $('grid');
    const results = $('results');
    const customWrap = $('custom-wrap');
    const customWords = $('custom-words');
    const setupError = $('setup-error');
    const elTries = $('tries');
    const elForgot = $('forgot');
    const elTime = $('time');
    const elMatched = $('matched');

    let deck = [];
    let first = null;
    let second = null;
    let lockBoard = false;
    const seen = new Set();
    let tries = 0;
    let forgotten = 0;
    let matchedCount = 0;
    let startedAt = null;
    let ticker = null;

    const usingCustom = () => document.querySelector('input[name="source"]:checked').value === 'custom';

    document.querySelectorAll('input[name="source"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        customWrap.hidden = !usingCustom();
        setupError.textContent = '';
      });
    });

    function startTimer() {
      startedAt = Date.now();
      ticker = setInterval(() => {
        elTime.textContent = formatTime(elapsedSeconds());
      }, 250);
    }

    const elapsedSeconds = () =>
      startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;

    function renderCard(card) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'card';
      el.dataset.id = card.id;
      el.setAttribute('aria-label', 'Hidden card');
      el.innerHTML =
        '<span class="face back"></span>' +
        `<span class="face front ${card.lang}"><span class="word"></span><span class="tag">${card.lang === 'es' ? 'ES' : 'EN'}</span></span>`;
      el.querySelector('.word').textContent = card.word;
      el.addEventListener('click', () => onFlip(card, el));
      return el;
    }

    function onFlip(card, el) {
      if (lockBoard || card.matched || el.classList.contains('flipped')) return;
      if (!startedAt) startTimer();

      el.classList.add('flipped');
      el.setAttribute('aria-label', card.word);

      if (!first) {
        first = { card, el };
        return;
      }

      second = { card, el };
      lockBoard = true;
      tries += 1;
      elTries.textContent = tries;

      const isMatch = first.card.pairId === second.card.pairId;

      if (!isMatch && isForgottenMiss(deck, first.card, second.card, seen)) {
        forgotten += 1;
        elForgot.textContent = forgotten;
      }

      // Mark as seen only after scoring, so `seen` reflects prior turns.
      seen.add(first.card.id);
      seen.add(second.card.id);

      if (isMatch) {
        first.card.matched = second.card.matched = true;
        [first, second].forEach(({ el: e }) => {
          e.classList.add('matched');
          e.disabled = true;
        });
        matchedCount += 1;
        elMatched.textContent = matchedCount;
        resetTurn();
        if (matchedCount === PAIRS_PER_GAME) finish();
      } else {
        setTimeout(() => {
          first.el.classList.remove('flipped');
          second.el.classList.remove('flipped');
          first.el.setAttribute('aria-label', 'Hidden card');
          second.el.setAttribute('aria-label', 'Hidden card');
          resetTurn();
        }, 1000); // show both for a second, then hide
      }
    }

    function resetTurn() {
      first = null;
      second = null;
      lockBoard = false;
    }

    function finish() {
      clearInterval(ticker);
      const secs = elapsedSeconds();
      $('final-time').textContent = formatTime(secs);
      $('final-tries').textContent = tries;
      $('final-forgot').textContent = forgotten;
      results.hidden = false;
      results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function startGame(pairs) {
      deck = buildDeck(pickPairs(pairs, PAIRS_PER_GAME));
      grid.innerHTML = '';
      deck.forEach((card) => grid.appendChild(renderCard(card)));

      seen.clear();
      tries = forgotten = matchedCount = 0;
      first = second = null;
      lockBoard = false;
      startedAt = null;
      clearInterval(ticker);

      elTries.textContent = '0';
      elForgot.textContent = '0';
      elMatched.textContent = '0';
      elTime.textContent = '00:00';

      results.hidden = true;
      setup.hidden = true;
      board.hidden = false;
    }

    $('start-btn').addEventListener('click', () => {
      setupError.textContent = '';

      if (!usingCustom()) {
        startGame(DEFAULT_PAIRS);
        return;
      }

      const { pairs, errors } = parsePairs(customWords.value);
      if (errors.length) {
        setupError.textContent = errors.slice(0, 3).join(' · ');
        return;
      }
      if (pairs.length < PAIRS_PER_GAME) {
        setupError.textContent = `Need at least ${PAIRS_PER_GAME} pairs for a 4x4 grid — found ${pairs.length}.`;
        return;
      }
      startGame(pairs);
    });

    $('again-btn').addEventListener('click', () => {
      const pairs = usingCustom() ? parsePairs(customWords.value).pairs : DEFAULT_PAIRS;
      startGame(pairs);
    });

    $('change-btn').addEventListener('click', () => {
      clearInterval(ticker);
      board.hidden = true;
      results.hidden = true;
      setup.hidden = false;
    });
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_PAIRS, PAIRS_PER_GAME,
    shuffle, pickPairs, parsePairs, buildDeck, partnerOf, isForgottenMiss, formatTime,
  };
}
