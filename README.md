# Games and Stuff

A collection of interactive web applications and games.

Live at <https://funtimes.xobedistuo.com>.

## Applications

### Spanish Matching Game

A memory game on a 4x4 grid. Eight Spanish/English word pairs are dealt face down;
flip a card and find its translation. Matches stay revealed, misses are shown for a
second and then hidden again.

Pairs are drawn at random from ~60 common Spanish words, or you can paste in your own
list (one pair per line, Spanish first, separated by a comma, `=`, tab, or ` - `).
Eight pairs are picked at random from whatever list is in play.

When every pair is matched you get three numbers:

- **Total time** taken.
- **Tries** — how many two-card turns you took.
- **Forgotten matches** — misses where the translation of your *first* card had
  already been shown earlier. You had seen it, but picked the wrong second card.

### Emergency Compliment

A wall-mounted "IN CASE OF EMERGENCY, BREAK GLASS" case. Click or tap the
glass (or press Enter/Space on it) to swing the hammer, shatter the pane, and
reveal a single weirdly specific compliment on a card behind the frame. Hit
"Reset case" to re-glue the glass and arm the next one.

Compliments are drawn from a 55-entry list via a shuffle-bag: every
compliment is shown once before any repeats, and the bag is reshuffled (with
a swap to avoid a back-to-back repeat) once exhausted. The bag's state
persists in `localStorage` so a reload doesn't reset the cycle. A short
synthesized crack sound plays on break via Web Audio (no audio files); a
mute toggle turns it off.

### Floor 13

A single-page elevator simulator with a button panel, synthesized chimes,
sliding doors, and shuffled strange-but-mundane vignettes for floors B and
1-12. The 13th floor has no visible button until a long-press on 12 briefly
reveals it for one uneasy ride.

### The Deliberator

A stern institutional console for moments of indecision. Type an optional
dilemma, press the big red button, watch twitching gauges and a bureaucratic
status log deliberate too hard, then receive a printed mundane decision from a
shuffle-bag of outcomes with rare long and deferred variants.

### Chess Chase

A Pac-Man-style maze chase, rendered on a `<canvas>` with Unicode chess glyphs
(no image assets). The maze is larger than the screen; a dead-zone camera keeps
your character in the middle 50% of the view as it scrolls. Collect every dot to
clear the board while dodging the pieces, dropping bombs in their path, and
zapping them with a short-range weapon.

Each piece moves by its own rules: the pawn plods, the knight crawls on
straights but gallops around corners, the rook rockets down straightaways, the
bishop and queen slide fast along diagonal zig-zag staircases, and the king is
slowest of all — he blocks his own pieces and defuses any bomb he steps on.
Movement is grid-based with smooth tile interpolation; holding two directions
walks a zig-zag staircase. Sound is synthesized via Web Audio (no files), with a
mute toggle. On-screen thumb controls appear on touch/small screens.

### Parcel Panic

A compact mouse-and-keyboard arcade sorter. Move the night-shift clerk with
WASD/arrows, choose a route color with `1`/`2`/`3` (or the on-screen buttons),
and aim/click to stamp falling parcels before they reach the deadline line.
Clean stamps build combos and charge a Space-bar dash for escaping or smashing
through delivery drones; three missed packages or drone collisions end the run.

### Lost & Found Weather

A cozy-surreal lost-and-found counter that turns misplaced objects into tiny
weather reports. Pick two or three hardcoded object buttons (umbrella, spare key,
pocket moon, receipt cloud, and more), then file a forecast assembled from their
traits with special hand-authored pair and trio discoveries.

### Tide Pool Radio

A cozy-surreal generative toy: click, tap, or use the keyboard to drop pebbles
into a moonlit tide pool and tune the nearest tiny station. Hermit crabs,
anemones, limpets, kelp, bottle caps, bubbles, and other inhabitants each have
their own shuffle-bag of short broadcasts.

Ripple rings and pebble drops are animated in CSS. Rapid overlapping ripples can
produce readable two-station interference lines, while idle transmissions surface
when the pool is left alone. Sound is a soft synthesized Web Audio plunk with a
mute toggle; no audio files, persistence, tracking, or network calls are used.

## Running it

There is no build step. Open `index.html` in a browser, or serve the directory with
any static file server. Every game is plain HTML/CSS/JS: `match_game.html` loads
`match_game.js`, `emergency-compliment.html` loads `emergency-compliment.js`,
`floor-thirteen.html` loads `floor-thirteen.js`, `the-deliberator.html` loads
`the-deliberator.js`, `chess-chase.html` loads `chess-chase.js`,
`tide-pool-radio.html` loads `tide-pool-radio.js`, and so on.

## Deploying

The site is a plain static directory served by Caddy over HTTPS:

```sh
scp index.html match_game.html match_game.js emergency-compliment.html \
    emergency-compliment.js floor-thirteen.html floor-thirteen.js \
    the-deliberator.html the-deliberator.js chess-chase.html chess-chase.js \
    tide-pool-radio.html tide-pool-radio.js \
    reed@funtimes.xobedistuo.com:/opt/sites/funtimes/
```
