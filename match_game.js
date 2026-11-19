'use strict';

/* Spanish/English matching game + flashcards.
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

// Flashcards: how many of the last draws a card is barred from repeating in,
// and how much more likely a missed card is to be drawn than a fresh one.
const FLASH_NO_REPEAT_WINDOW = 5;
const FLASH_MISSED_WEIGHT = 3;

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

/* Flashcards: each word pair becomes two independent cards — one direction
   quizzes Spanish and expects the English answer, the other quizzes English
   and expects the Spanish answer. Missing one doesn't affect the other. */
function buildFlashItems(pairs) {
  const items = [];
  pairs.forEach(([es, en], pairId) => {
    items.push({
      key: `${pairId}-es2en`, pairId, dir: 'es2en',
      promptLang: 'es', promptWord: es, answerLang: 'en', answerWord: en,
    });
    items.push({
      key: `${pairId}-en2es`, pairId, dir: 'en2es',
      promptLang: 'en', promptWord: en, answerLang: 'es', answerWord: es,
    });
  });
  return items;
}

/* Picks the next flashcard: cards marked missed are weighted so they come up
   more often, and a card shown in the last FLASH_NO_REPEAT_WINDOW draws is
   excluded when the pool is big enough to allow it. Pure — the caller owns
   `missedKeys`/`recentKeys` and updates them after the pick. */
function pickNextFlashItem(items, missedKeys, recentKeys, rng = Math.random) {
  const recentSet = new Set(recentKeys.slice(-FLASH_NO_REPEAT_WINDOW));
  const candidates = items.filter((it) => !recentSet.has(it.key));
  const pool = candidates.length ? candidates : items;

  const weighted = [];
  pool.forEach((it) => {
    const weight = missedKeys.has(it.key) ? FLASH_MISSED_WEIGHT : 1;
    for (let i = 0; i < weight; i += 1) weighted.push(it);
  });
  return weighted[Math.floor(rng() * weighted.length)];
}

/* ---------- DOM wiring (skipped under node) ---------- */

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const $ = (id) => document.getElementById(id);
    const currentLang = () => (window.siteLang ? window.siteLang.get() : 'en');

    /* ---------- Tabs ---------- */

    const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
    const tabPanels = { match: $('tab-match'), flash: $('tab-flash') };
    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabButtons.forEach((b) => {
          const active = b === btn;
          b.classList.toggle('active', active);
          b.setAttribute('aria-selected', String(active));
        });
        Object.entries(tabPanels).forEach(([key, el]) => { el.hidden = key !== btn.dataset.tab; });
      });
    });

    /* ---------- Shared: themed-set manifest ---------- */

    const themedOpt = $('themed-opt');
    const themedBtn = $('themed-set-btn');
    const themedDialog = $('themed-dialog');
    const themedChecklist = $('themed-checklist');
    const fcThemedOpt = $('fc-themed-opt');
    const fcThemedBtn = $('fc-themed-set-btn');
    const fcThemedDialog = $('fc-themed-dialog');
    const fcThemedChecklist = $('fc-themed-checklist');

    let manifestEntries = [];

    // Topic selection is shared between the matching game and the flashcards tab —
    // picking topics in one defaults them for the other. `themedInputs` maps each
    // file to its two checkbox elements (one per checklist) so a change in either
    // can be mirrored onto the other without re-dispatching `change` events.
    const selectedThemedFiles = new Set();
    const themedInputs = new Map();

    function getSelectedThemedFiles() {
      return Array.from(selectedThemedFiles);
    }

    function themedButtonLabel(count) {
      const base = currentLang() === 'es' ? 'Elegir temas' : 'Choose topics';
      return count ? `${base} (${count})` : `${base}…`;
    }

    function updateThemedButtons() {
      const label = themedButtonLabel(selectedThemedFiles.size);
      themedBtn.textContent = label;
      fcThemedBtn.textContent = label;
    }

    function setThemedSelected(file, checked) {
      if (checked) selectedThemedFiles.add(file);
      else selectedThemedFiles.delete(file);
      (themedInputs.get(file) || []).forEach((input) => { input.checked = checked; });
      updateThemedButtons();
    }

    function relabelThemedChecklist(listEl) {
      const byId = new Map(manifestEntries.map((e) => [e.id, e]));
      Array.from(listEl.querySelectorAll('input')).forEach((input) => {
        const entry = byId.get(input.dataset.id);
        if (!entry) return;
        const span = input.nextElementSibling;
        if (span) span.textContent = currentLang() === 'es' && entry.nameEs ? entry.nameEs : entry.name;
      });
    }

    function relabelThemedOptions() {
      if (!manifestEntries.length) return;
      relabelThemedChecklist(themedChecklist);
      relabelThemedChecklist(fcThemedChecklist);
      updateThemedButtons();
    }

    function wireThemedDialog(btnEl, dialogEl, selectAllBtn, selectNoneBtn, doneBtn) {
      btnEl.addEventListener('click', () => dialogEl.showModal());
      selectAllBtn.addEventListener('click', () => {
        manifestEntries.forEach((entry) => setThemedSelected(entry.file, true));
      });
      selectNoneBtn.addEventListener('click', () => {
        manifestEntries.forEach((entry) => setThemedSelected(entry.file, false));
      });
      doneBtn.addEventListener('click', () => dialogEl.close());
    }

    wireThemedDialog(themedBtn, themedDialog,
      $('themed-select-all'), $('themed-select-none'), $('themed-dialog-done'));
    wireThemedDialog(fcThemedBtn, fcThemedDialog,
      $('fc-themed-select-all'), $('fc-themed-select-none'), $('fc-themed-dialog-done'));

    // Themed sets come from vocab/manifest.json, fetched at runtime. This needs the
    // page served over http(s); opened straight from disk (file://) the fetch fails
    // and the "themed set" option just stays hidden, leaving default + custom intact.
    fetch('vocab/manifest.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((list) => {
        const entries = Array.isArray(list) ? list.filter((e) => e && e.file && e.name) : [];
        if (!entries.length) return;
        manifestEntries = entries;
        entries.forEach((entry) => {
          const inputs = [];
          [themedChecklist, fcThemedChecklist].forEach((listEl) => {
            const label = document.createElement('label');
            label.className = 'check-opt';
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.value = entry.file;
            input.dataset.id = entry.id;
            input.addEventListener('change', () => setThemedSelected(entry.file, input.checked));
            inputs.push(input);
            const span = document.createElement('span');
            span.textContent = currentLang() === 'es' && entry.nameEs ? entry.nameEs : entry.name;
            label.append(input, span);
            listEl.appendChild(label);
          });
          themedInputs.set(entry.file, inputs);
        });
        updateThemedButtons();
        themedOpt.hidden = false;
        fcThemedOpt.hidden = false;
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

    function loadThemedPairsCombined(files) {
      return Promise.all(files.map(loadThemedPairs)).then((lists) => lists.flat());
    }

    /* ---------- Matching game ---------- */

    const setup = $('setup');
    const board = $('board');
    const grid = $('grid');
    const results = $('results');
    const customWrap = $('custom-wrap');
    const customWords = $('custom-words');
    const themedWrap = $('themed-wrap');
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
      matchedLabel.textContent = currentLang() === 'es'
        ? `de ${totalPairs} encontrados` : `of ${totalPairs} matched`;

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
        const files = getSelectedThemedFiles();
        if (!files.length) {
          setupError.textContent = 'Pick at least one topic first.';
          return;
        }
        startBtn.disabled = true;
        loadThemedPairsCombined(files)
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

    /* ---------- Flashcards ---------- */

    const fcSetup = $('fc-setup');
    const fcBoard = $('fc-board');
    const fcCustomWrap = $('fc-custom-wrap');
    const fcCustomWords = $('fc-custom-words');
    const fcThemedWrap = $('fc-themed-wrap');
    const fcSetupError = $('fc-setup-error');
    const fcStartBtn = $('fc-start-btn');
    const fcChangeBtn = $('fc-change-btn');

    const flashCard = $('flash-card');
    const flashBackFace = $('flash-back-face');
    const flashFrontFace = $('flash-front-face');
    const flashPromptWord = $('flash-prompt-word');
    const flashPromptTag = $('flash-prompt-tag');
    const flashAnswerWord = $('flash-answer-word');
    const flashAnswerTag = $('flash-answer-tag');
    const flashDirection = $('flash-direction');
    const gotBtn = $('flash-got-btn');
    const missedBtn = $('flash-missed-btn');
    const elFcCorrect = $('fc-correct');
    const elFcMissed = $('fc-missed');
    const elFcReview = $('fc-review');

    let flashItems = [];
    const flashMissed = new Set();
    let flashRecent = [];
    let flashCurrent = null;
    let flashFlipped = false;
    let flashCorrect = 0;
    let flashMissedCount = 0;

    const fcCurrentSource = () => document.querySelector('input[name="fc-source"]:checked').value;

    document.querySelectorAll('input[name="fc-source"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        const src = fcCurrentSource();
        fcCustomWrap.hidden = src !== 'custom';
        fcThemedWrap.hidden = src !== 'themed';
        fcSetupError.textContent = '';
      });
    });

    function updateFlashStats() {
      elFcCorrect.textContent = flashCorrect;
      elFcMissed.textContent = flashMissedCount;
      elFcReview.textContent = flashMissed.size;
    }

    function nextFlashCard() {
      flashCurrent = pickNextFlashItem(flashItems, flashMissed, flashRecent);
      flashRecent.push(flashCurrent.key);
      if (flashRecent.length > FLASH_NO_REPEAT_WINDOW) flashRecent.shift();
      flashFlipped = false;

      // Snap back to the prompt face instantly (no flip animation) while the
      // words underneath change, then restore the transition for the next flip.
      flashCard.classList.add('no-anim');
      flashCard.classList.remove('flipped');

      flashBackFace.className = `face back ${flashCurrent.promptLang}`;
      flashFrontFace.className = `face front ${flashCurrent.answerLang}`;
      flashPromptWord.textContent = flashCurrent.promptWord;
      flashPromptTag.textContent = flashCurrent.promptLang === 'es' ? 'ES' : 'EN';
      flashAnswerWord.textContent = flashCurrent.answerWord;
      flashAnswerTag.textContent = flashCurrent.answerLang === 'es' ? 'ES' : 'EN';
      flashDirection.textContent = flashCurrent.promptLang === 'es'
        ? (currentLang() === 'es' ? 'Español → Inglés' : 'Spanish → English')
        : (currentLang() === 'es' ? 'Inglés → Español' : 'English → Spanish');
      flashCard.setAttribute('aria-label', `Flashcard: ${flashCurrent.promptWord}. Click to reveal the translation.`);

      gotBtn.disabled = true;
      missedBtn.disabled = true;

      requestAnimationFrame(() => flashCard.classList.remove('no-anim'));
    }

    function flipFlashCard() {
      if (flashFlipped || !flashCurrent) return;
      flashFlipped = true;
      flashCard.classList.add('flipped');
      flashCard.setAttribute('aria-label', `${flashCurrent.promptWord} = ${flashCurrent.answerWord}`);
      gotBtn.disabled = false;
      missedBtn.disabled = false;
    }

    function gradeFlashCard(correct) {
      if (!flashFlipped || !flashCurrent) return;
      if (correct) {
        flashCorrect += 1;
        flashMissed.delete(flashCurrent.key);
      } else {
        flashMissedCount += 1;
        flashMissed.add(flashCurrent.key);
      }
      updateFlashStats();
      nextFlashCard();
    }

    flashCard.addEventListener('click', flipFlashCard);
    gotBtn.addEventListener('click', () => gradeFlashCard(true));
    missedBtn.addEventListener('click', () => gradeFlashCard(false));

    function startFlashcards(pairs) {
      flashItems = buildFlashItems(pairs);
      flashMissed.clear();
      flashRecent = [];
      flashCorrect = 0;
      flashMissedCount = 0;
      updateFlashStats();

      fcSetup.hidden = true;
      fcBoard.hidden = false;
      nextFlashCard();
    }

    function fcTryStart(pool) {
      if (!pool.length) {
        fcSetupError.textContent = 'That list has no pairs.';
        return;
      }
      startFlashcards(pool);
    }

    fcStartBtn.addEventListener('click', () => {
      fcSetupError.textContent = '';
      const src = fcCurrentSource();

      if (src === 'default') {
        fcTryStart(DEFAULT_PAIRS);
        return;
      }

      if (src === 'themed') {
        const files = getSelectedThemedFiles();
        if (!files.length) {
          fcSetupError.textContent = 'Pick at least one topic first.';
          return;
        }
        fcStartBtn.disabled = true;
        loadThemedPairsCombined(files)
          .then((pairs) => fcTryStart(pairs))
          .catch((err) => { fcSetupError.textContent = `Could not load that set — ${err.message}.`; })
          .finally(() => { fcStartBtn.disabled = false; });
        return;
      }

      const { pairs, errors } = parsePairs(fcCustomWords.value);
      if (errors.length) {
        fcSetupError.textContent = errors.slice(0, 3).join(' · ');
        return;
      }
      fcTryStart(pairs);
    });

    fcChangeBtn.addEventListener('click', () => {
      fcBoard.hidden = true;
      fcSetup.hidden = false;
    });

    document.addEventListener('sitelangchange', () => {
      relabelThemedOptions();
      if (!board.hidden) {
        matchedLabel.textContent = currentLang() === 'es'
          ? `de ${totalPairs} encontrados` : `of ${totalPairs} matched`;
      }
      if (!fcBoard.hidden && flashCurrent) {
        flashDirection.textContent = flashCurrent.promptLang === 'es'
          ? (currentLang() === 'es' ? 'Español → Inglés' : 'Spanish → English')
          : (currentLang() === 'es' ? 'Inglés → Español' : 'English → Spanish');
      }
    });
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_PAIRS, PAIRS_PER_GAME,
    MAX_ROWS, MAX_COLS, DEFAULT_ROWS, DEFAULT_COLS, isPairableGrid, gridPairCount,
    FLASH_NO_REPEAT_WINDOW, FLASH_MISSED_WEIGHT,
    shuffle, pickPairs, parsePairs, buildDeck, partnerOf, isForgottenMiss, formatTime,
    buildFlashItems, pickNextFlashItem,
  };
}
