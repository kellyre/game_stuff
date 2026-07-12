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

## Running it

There is no build step. Open `index.html` in a browser, or serve the directory with
any static file server. The game is plain HTML/CSS/JS: `match_game.html` loads
`match_game.js` directly.

## Deploying

The site is a plain static directory served by Caddy over HTTPS:

```sh
scp index.html match_game.html match_game.js reed@funtimes.xobedistuo.com:/opt/sites/funtimes/
```
