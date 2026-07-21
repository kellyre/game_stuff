// Smoke tests for the next funtimes arcade page. Run: node tests/parcel-panic.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'parcel-panic.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'parcel-panic.js'), 'utf8');

assert.match(html, /<canvas[^>]+id=["']game["']/i, 'game canvas must exist');
assert.match(html, /id=["']restart["']/i, 'visible restart button must exist');
assert.match(html, /parcel-panic\.js/, 'page must load its game code');
assert.match(js, /addEventListener\(["']keydown["']/, 'keyboard controls must be wired');
assert.match(js, /pointermove/, 'pointer aiming must be wired');
assert.match(js, /function restart|const restart|let restart/, 'restart behavior must exist');
assert.match(js, /requestAnimationFrame/, 'game loop must use animation frames');
console.log('parcel-panic smoke tests passed');
