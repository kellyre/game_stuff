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

## Running it

There is no build step. Open `index.html` in a browser, or serve the directory with
any static file server. Every game is plain HTML/CSS/JS: `match_game.html` loads
`match_game.js`, `emergency-compliment.html` loads `emergency-compliment.js`,
`floor-thirteen.html` loads `floor-thirteen.js`, `the-deliberator.html` loads
`the-deliberator.js`, and so on.

## Deploying

The site is a plain static directory served by Caddy over HTTPS:

```sh
scp index.html match_game.html match_game.js emergency-compliment.html \
    emergency-compliment.js reed@funtimes.xobedistuo.com:/opt/sites/funtimes/
```
