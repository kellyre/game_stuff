// Smoke tests for the Spanish matching game's themed vocab sets and grid rules.
// Run: node tests/match-game.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const {
  DEFAULT_PAIRS, parsePairs, isPairableGrid, gridPairCount, MAX_ROWS, MAX_COLS,
} = require('../match_game.js');

const js = fs.readFileSync(path.join(root, 'match_game.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'match_game.html'), 'utf8');

// The game must fetch the manifest and expose the themed-set + grid controls.
assert.match(js, /fetch\('vocab\/manifest\.json'/, 'game must fetch the vocab manifest');
assert.match(html, /id=["']themed-set["']/, 'themed-set <select> must exist');
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

console.log(`match-game smoke tests passed (${manifest.length} themed sets, grids up to ${MAX_ROWS}x${MAX_COLS})`);
