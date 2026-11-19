// Smoke tests for the Spanish matching game's themed vocab sets and grid rules.
// Run: node tests/match-game.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const {
  DEFAULT_PAIRS, parsePairs, isPairableGrid, gridPairCount, MAX_ROWS, MAX_COLS,
  buildFlashItems, pickNextFlashItem, FLASH_NO_REPEAT_WINDOW,
} = require('../match_game.js');

const js = fs.readFileSync(path.join(root, 'match_game.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'match_game.html'), 'utf8');

// The game must fetch the manifest and expose the themed-set + grid controls.
assert.match(js, /fetch\('vocab\/manifest\.json'/, 'game must fetch the vocab manifest');
assert.match(html, /id=["']themed-set-btn["']/, 'themed-set-btn popup trigger must exist');
assert.match(html, /id=["']themed-checklist["']/, 'themed-checklist must exist');
assert.match(html, /value=["']themed["']/, 'a "themed" source radio must exist');
assert.match(html, /id=["']grid-rows["']/, 'grid-rows <select> must exist');
assert.match(html, /id=["']grid-cols["']/, 'grid-cols <select> must exist');
assert.match(html, /id=["']matched-label["']/, 'matched-label span must exist for the dynamic count');

// Grid rules: rows <= 6, cols <= 9, at least one side even.
assert.equal(MAX_ROWS, 6);
assert.equal(MAX_COLS, 9);
assert.ok(isPairableGrid(4, 4), '4x4 is valid');
assert.ok(isPairableGrid(6, 9), '6x9 is valid (one side even)');
assert.ok(isPairableGrid(2, 9), '2x9 is valid');
assert.ok(!isPairableGrid(5, 5), 'both-odd grid cannot pair up');
assert.ok(!isPairableGrid(7, 2), 'rows over the max are rejected');
assert.ok(!isPairableGrid(6, 10), 'cols over the max are rejected');
assert.ok(!isPairableGrid(1, 4), 'a side below 2 is rejected');
assert.equal(gridPairCount(6, 8), 24);
assert.equal(gridPairCount(6, 9), 27);

// Every word list must be able to fill the largest allowed grid.
const biggest = gridPairCount(MAX_ROWS, MAX_COLS); // 6 x 9 -> 27
assert.ok(
  DEFAULT_PAIRS.length >= biggest,
  `DEFAULT_PAIRS has ${DEFAULT_PAIRS.length}; the ${MAX_ROWS}x${MAX_COLS} grid needs ${biggest}`,
);

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'vocab', 'manifest.json'), 'utf8'));
assert.ok(Array.isArray(manifest) && manifest.length > 0, 'manifest must be a non-empty array');

const seenIds = new Set();
manifest.forEach((entry) => {
  assert.ok(entry.id && entry.name && entry.file, `entry needs id/name/file: ${JSON.stringify(entry)}`);
  assert.ok(!seenIds.has(entry.id), `duplicate manifest id: ${entry.id}`);
  seenIds.add(entry.id);
  assert.ok(entry.file.startsWith('vocab/'), `file should be a site-relative path under vocab/: ${entry.file}`);

  const abs = path.join(root, entry.file);
  assert.ok(fs.existsSync(abs), `missing vocab file: ${entry.file}`);

  const { pairs, errors } = parsePairs(fs.readFileSync(abs, 'utf8'));
  assert.equal(errors.length, 0, `${entry.file} parse errors: ${errors.join(' · ')}`);
  assert.ok(
    pairs.length >= biggest,
    `${entry.file} has ${pairs.length} pairs; the ${MAX_ROWS}x${MAX_COLS} grid needs ${biggest}`,
  );
});

// Tabs + flashcard markup must exist.
assert.match(html, /data-tab=["']match["']/, 'match tab button must exist');
assert.match(html, /data-tab=["']flash["']/, 'flash tab button must exist');
assert.match(html, /id=["']flash-card["']/, 'flash-card element must exist');
assert.match(html, /id=["']flash-got-btn["']/, 'Got it button must exist');
assert.match(html, /id=["']flash-missed-btn["']/, 'Missed button must exist');
assert.match(html, /id=["']fc-start-btn["']/, 'flashcards start button must exist');
assert.match(html, /id=["']fc-themed-set-btn["']/, 'flashcards themed-set-btn popup trigger must exist');
assert.match(html, /id=["']fc-themed-checklist["']/, 'flashcards themed-checklist must exist');
assert.match(html, /id=["']fc-change-btn["']/, 'flashcards change-word-list button must exist');

// Flashcard items: each pair becomes two independent directional cards.
{
  const items = buildFlashItems([['hola', 'hello'], ['agua', 'water']]);
  assert.equal(items.length, 4, 'two pairs make four flashcard items (both directions)');
  assert.deepEqual(
    items.map((i) => i.key).sort(),
    ['0-en2es', '0-es2en', '1-en2es', '1-es2en'].sort(),
  );
  assert.ok(items.every((i) => i.promptWord && i.answerWord && i.promptLang !== i.answerLang));
}

// pickNextFlashItem: never repeats a card shown in the last N draws when the pool allows it.
{
  const items = buildFlashItems([
    ['a', '1'], ['b', '2'], ['c', '3'], ['d', '4'], ['e', '5'], ['f', '6'],
  ]); // 12 items — plenty of room to dodge the last FLASH_NO_REPEAT_WINDOW
  const missed = new Set();
  let recent = [];
  for (let i = 0; i < 200; i += 1) {
    const pick = pickNextFlashItem(items, missed, recent);
    assert.ok(
      !recent.slice(-FLASH_NO_REPEAT_WINDOW).includes(pick.key),
      `picked a card shown in the last ${FLASH_NO_REPEAT_WINDOW} tries: ${pick.key}`,
    );
    recent.push(pick.key);
    if (recent.length > FLASH_NO_REPEAT_WINDOW) recent.shift();
  }
}

// pickNextFlashItem: a missed card should come up well above its fair share until cleared.
{
  const items = buildFlashItems([['a', '1'], ['b', '2'], ['c', '3'], ['d', '4']]); // 8 items
  const missedKey = items[0].key;
  const missed = new Set([missedKey]);
  let hits = 0;
  const trials = 2000;
  for (let i = 0; i < trials; i += 1) {
    if (pickNextFlashItem(items, missed, []).key === missedKey) hits += 1;
  }
  const fairShare = trials / items.length;
  assert.ok(
    hits > fairShare * 1.5,
    `missed item should be drawn well above its fair share (${hits} vs ~${fairShare})`,
  );
}

console.log(`match-game smoke tests passed (${manifest.length} themed sets, grids up to ${MAX_ROWS}x${MAX_COLS})`);
