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

const PAIRS_PER_GAME = 8; // default deal: 8 pairs -> 16 cards -> 4x4

// Grid limits: rows <= 6, cols <= 9, and at least one side even so the cells
// split cleanly into pairs. Largest board is 6 x 9 = 54 cards = 27 pairs.
const MAX_ROWS = 6;
const MAX_COLS = 9;
const DEFAULT_ROWS = 4;
const DEFAULT_COLS = 4;

function isPairableGrid(rows, cols) {
  return Number.isInteger(rows) && Number.isInteger(cols)
    && rows >= 2 && cols >= 2
    && rows <= MAX_ROWS && cols <= MAX_COLS
    && (rows * cols) % 2 === 0;
}

function gridPairCount(rows, cols) {
  return (rows * cols) / 2;
}

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
    const themedOpt = $('themed-opt');
    const themedWrap = $('themed-wrap');
    const themedSelect = $('themed-set');
    const setupError = $('setup-error');
    const elTries = $('tries');
    const elForgot = $('forgot');
    const elTime = $('time');
    const elMatched = $('matched');
    const matchedLabel = $('matched-label');
    const gridRows = $('grid-rows');
    const gridCols = $('grid-cols');
    const gridNote = $('grid-note');

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

    let lastPairs = DEFAULT_PAIRS; // the pool the current game was dealt from, for "Play again"
    let lastRows = DEFAULT_ROWS;
    let lastCols = DEFAULT_COLS;
    let totalPairs = PAIRS_PER_GAME; // pairs in the current deal; the win condition

    const currentSource = () => document.querySelector('input[name="source"]:checked').value;

    document.querySelectorAll('input[name="source"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        const src = currentSource();
        customWrap.hidden = src !== 'custom';
        themedWrap.hidden = src !== 'themed';
        setupError.textContent = '';
      });
    });

    for (let r = 2; r <= MAX_ROWS; r += 1) gridRows.add(new Option(String(r), String(r)));
    for (let c = 2; c <= MAX_COLS; c += 1) gridCols.add(new Option(String(c), String(c)));
    gridRows.value = String(DEFAULT_ROWS);
    gridCols.value = String(DEFAULT_COLS);

    const readGrid = () => ({
      rows: parseInt(gridRows.value, 10),
      cols: parseInt(gridCols.value, 10),
    });

    function refreshGridNote() {
      const { rows, cols } = readGrid();
      const ok = isPairableGrid(rows, cols);
      gridNote.classList.toggle('bad', !ok);
      gridNote.textContent = ok
        ? `${rows} × ${cols} — ${gridPairCount(rows, cols)} pairs, ${rows * cols} cards`
        : `${rows} × ${cols} — one side must be even`;
      return ok;
    }
    [gridRows, gridCols].forEach((sel) => sel.addEventListener('change', () => {
      refreshGridNote();
      setupError.textContent = '';
    }));
    refreshGridNote();

    // Themed sets come from vocab/manifest.json, fetched at runtime. This needs the
    // page served over http(s); opened straight from disk (file://) the fetch fails
    // and the "themed set" option just stays hidden, leaving default + custom intact.
    fetch('vocab/manifest.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((list) => {
        const entries = Array.isArray(list) ? list.filter((e) => e && e.file && e.name) : [];
        if (!entries.length) return;
        entries.forEach((entry) => {
          const opt = document.createElement('option');
          opt.value = entry.file;
          opt.textContent = entry.name;
          themedSelect.appendChild(opt);
        });
        themedOpt.hidden = false;
      })
      .catch(() => { /* themed sets unavailable here — leave the option hidden */ });

    function loadThemedPairs(file) {
      return fetch(file, { cache: 'no-cache' })
        .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then((text) => {
          const { pairs, errors } = parsePairs(text);
          if (errors.length) throw new Error(errors[0]);
          if (!pairs.length) throw new Error('that set is empty');
          return pairs;
        });
    }

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
        if (matchedCount === totalPairs) finish();
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

    function startGame(pairs, rows, cols) {
      lastPairs = pairs;
      lastRows = rows;
      lastCols = cols;
      totalPairs = gridPairCount(rows, cols);

      deck = buildDeck(pickPairs(pairs, totalPairs));
      grid.style.setProperty('--cols', cols);
      grid.classList.toggle('dense', cols >= 7);
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
      matchedLabel.textContent = `of ${totalPairs} matched`;

      results.hidden = true;
      setup.hidden = true;
      board.hidden = false;
    }

    const startBtn = $('start-btn');

    function tryStart(pool) {
      const { rows, cols } = readGrid();
      if (!isPairableGrid(rows, cols)) {
        setupError.textContent = `A ${rows} × ${cols} grid can't be split into pairs — make one side even.`;
        return;
      }
      const need = gridPairCount(rows, cols);
      if (pool.length < need) {
        setupError.textContent =
          `That list has ${pool.length} pairs — a ${rows} × ${cols} grid needs ${need}. `
          + 'Choose a smaller grid or a longer list.';
        return;
      }
      startGame(pool, rows, cols);
    }

    startBtn.addEventListener('click', () => {
      setupError.textContent = '';
      const src = currentSource();

      if (src === 'default') {
        tryStart(DEFAULT_PAIRS);
        return;
      }

      if (src === 'themed') {
        const file = themedSelect.value;
        if (!file) {
          setupError.textContent = 'Pick a themed set first.';
          return;
        }
        startBtn.disabled = true;
        loadThemedPairs(file)
          .then((pairs) => tryStart(pairs))
          .catch((err) => { setupError.textContent = `Could not load that set — ${err.message}.`; })
          .finally(() => { startBtn.disabled = false; });
        return;
      }

      const { pairs, errors } = parsePairs(customWords.value);
      if (errors.length) {
        setupError.textContent = errors.slice(0, 3).join(' · ');
        return;
      }
      tryStart(pairs);
    });

    $('again-btn').addEventListener('click', () => startGame(lastPairs, lastRows, lastCols));

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
    MAX_ROWS, MAX_COLS, DEFAULT_ROWS, DEFAULT_COLS, isPairableGrid, gridPairCount,
    shuffle, pickPairs, parsePairs, buildDeck, partnerOf, isForgottenMiss, formatTime,
  };
}
