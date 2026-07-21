/* Chess Chase — a Pac-Man-style maze chase where the "ghosts" are chess pieces.
 *
 * Player movement uses combined-input zig-zag; a scrolling camera keeps the
 * player in the middle 50% of the view; the maze is larger than the screen;
 * there's food to collect, bombs to deposit, a short-range weapon, and
 * synthesized sound. Every chess piece has its own movement personality:
 *
 *   ♟ pawn   — slow, plodding, greedy chaser.
 *   ♞ knight — crawls on straights but whips around corners.
 *   ♜ rook   — rockets down long straightaways, ambles when it must turn.
 *   ♝ bishop — slow off-axis, fast along a diagonal zig-zag staircase.
 *   ♛ queen  — slides like a rook AND a bishop.
 *   ♚ king   — slowest of all; blocks his own pieces and defuses bombs.
 *
 * Everything is drawn on a <canvas> with plain Unicode chess glyphs. No assets,
 * no build step — matching the rest of this site.
 */

(() => {
  "use strict";

  // ---- Grid / world constants ----------------------------------------------
  const TILE = 34;            // pixel size of one maze cell
  const COLS = 39;            // must be odd for the maze carver
  const ROWS = 27;            // must be odd for the maze carver
  const WORLD_W = COLS * TILE;
  const WORLD_H = ROWS * TILE;
  const DEADZONE = 0.25;      // player stays within the central 50% of the view

  // Speeds are in tiles per second. The player moves 3x the slow enemy speed.
  // Most pieces have a slow "base" pace and a fast pace for their signature
  // move — the rook's straight slide, the knight's corner, the bishop's and
  // queen's diagonal staircase. The king is slower than everyone.
  const SLOW = 2.6;                 // baseline "slow" enemy speed
  const PLAYER_SPEED = SLOW * 3;    // player is 3x as fast
  const PAWN_SPEED = SLOW;          // plodding, one step at a time
  const KNIGHT_SPEED = SLOW;        // crawls on straights...
  const KNIGHT_TURN = SLOW * 3;     // ...but whips around corners
  const ROOK_SPEED = SLOW * 1.2;    // ambles when it has to turn
  const ROOK_SLIDE = SLOW * 3.2;    // rockets down long straightaways
  const BISHOP_SPEED = SLOW * 0.9;  // slow off the diagonal
  const BISHOP_SLIDE = SLOW * 3.0;  // fast along a diagonal staircase
  const QUEEN_SPEED = SLOW * 0.9;   // slow when boxed in
  const QUEEN_SLIDE = SLOW * 3.0;   // slides like a rook AND a bishop
  const KING_SPEED = SLOW * 0.6;    // even slower than the slow pieces

  const WEAPON_RANGE = 2;           // tiles the short-range weapon reaches
  const WEAPON_COOLDOWN = 0.28;     // seconds between shots
  const START_BOMBS = 2;
  const START_GRACE = 2.0;          // seconds enemies hold still at level start
  const RESPAWN_GRACE = 1.2;        // shorter breather after losing a life

  // ---- Directions -----------------------------------------------------------
  const UP    = { x: 0, y: -1 };
  const DOWN  = { x: 0, y:  1 };
  const LEFT  = { x: -1, y: 0 };
  const RIGHT = { x: 1, y:  0 };
  const DIRS = [UP, DOWN, LEFT, RIGHT];
  const opposite = (d) => (d === UP ? DOWN : d === DOWN ? UP : d === LEFT ? RIGHT : d === RIGHT ? LEFT : null);

  // ---- Maze -----------------------------------------------------------------
  // grid[r][c]: 1 = wall, 0 = open path.
  let grid = [];

  function isOpen(c, r) {
    return r >= 0 && r < ROWS && c >= 0 && c < COLS && grid[r][c] === 0;
  }

  // Randomized DFS carves a perfect maze; then we knock out a fraction of the
  // remaining interior walls so the maze has loops (essential for a chase game —
  // a perfect maze is all dead ends).
  function generateMaze() {
    grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(1));
    const stack = [[1, 1]];
    grid[1][1] = 0;
    while (stack.length) {
      const [c, r] = stack[stack.length - 1];
      const nbrs = [];
      for (const d of DIRS) {
        const nc = c + d.x * 2, nr = r + d.y * 2;
        if (nc > 0 && nc < COLS - 1 && nr > 0 && nr < ROWS - 1 && grid[nr][nc] === 1) {
          nbrs.push([nc, nr, c + d.x, r + d.y]);
        }
      }
      if (nbrs.length) {
        const [nc, nr, wc, wr] = nbrs[(Math.random() * nbrs.length) | 0];
        grid[wr][wc] = 0;
        grid[nr][nc] = 0;
        stack.push([nc, nr]);
      } else {
        stack.pop();
      }
    }
    // Add loops: remove interior walls that connect two open cells.
    for (let r = 1; r < ROWS - 1; r++) {
      for (let c = 1; c < COLS - 1; c++) {
        if (grid[r][c] !== 1) continue;
        const horiz = isOpen(c - 1, r) && isOpen(c + 1, r) && !isOpen(c, r - 1) && !isOpen(c, r + 1);
        const vert = isOpen(c, r - 1) && isOpen(c, r + 1) && !isOpen(c - 1, r) && !isOpen(c + 1, r);
        if ((horiz || vert) && Math.random() < 0.14) grid[r][c] = 0;
      }
    }
  }

  function openTiles() {
    const tiles = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (grid[r][c] === 0) tiles.push([c, r]);
    return tiles;
  }

  const tileDist = (ac, ar, bc, br) => Math.abs(ac - bc) + Math.abs(ar - br);

  // ---- Entities -------------------------------------------------------------
  // An entity lives on tile (c,r); when moving it interpolates toward (tc,tr).
  function makeEntity(c, r, speed, glyph, color) {
    return { c, r, tc: c, tr: r, dir: null, face: RIGHT, moving: false,
             progress: 0, speed, moveSpeed: speed, lastAxis: null,
             glyph, color, dead: false };
  }

  function entityCenter(e) {
    const cx = e.c * TILE + TILE / 2, cy = e.r * TILE + TILE / 2;
    if (!e.moving) return { x: cx, y: cy };
    const tx = e.tc * TILE + TILE / 2, ty = e.tr * TILE + TILE / 2;
    return { x: cx + (tx - cx) * e.progress, y: cy + (ty - cy) * e.progress };
  }

  // The tile an entity currently "occupies" (for bomb/collision tests).
  function occupiedTile(e) {
    return e.moving && e.progress >= 0.5 ? [e.tc, e.tr] : [e.c, e.r];
  }

  // Advance an entity along the grid. `decide` picks the next direction whenever
  // the entity settles on a tile; returning null leaves it stopped.
  function stepEntity(e, dt, decide) {
    if (!e.moving) {
      decide(e);
      if (!e.moving) return;
    }
    e.progress += (e.moveSpeed || e.speed) * dt;
    while (e.progress >= 1) {
      const carry = e.progress - 1;
      e.c = e.tc; e.r = e.tr;
      e.moving = false;
      decide(e);
      if (e.moving) e.progress = carry;
      else { e.progress = 0; break; }
    }
  }

  function beginMove(e, d, spd) {
    e.dir = d;
    e.face = d;
    e.tc = e.c + d.x;
    e.tr = e.r + d.y;
    e.moving = true;
    // Enemies get a per-level speed bump; the player is never scaled.
    e.moveSpeed = (spd || e.speed) * (e.isEnemy ? enemySpeedMul : 1);
  }

  // ---- Game state -----------------------------------------------------------
  let player, enemies, food, foodLeft, bombs, pickups, bombCount;
  let score, lives, effects, camX, camY, running, message;
  let level, enemySpeedMul = 1, graceTimer = 0, playerStart = [1, 1];
  let overlayAction = null;

  const input = { up: false, down: false, left: false, right: false };
  let weaponTimer = 0;

  function heldDirs() {
    const h = [];
    if (input.up) h.push(UP);
    if (input.down) h.push(DOWN);
    if (input.left) h.push(LEFT);
    if (input.right) h.push(RIGHT);
    return h;
  }

  const openNeighbors = (c, r) => DIRS.reduce((n, d) => n + (isOpen(c + d.x, r + d.y) ? 1 : 0), 0);

  // Pick a well-connected tile near the top-left corner so the player always
  // starts with more than one way out — never boxed into a dead end.
  function chooseSpawn(tiles) {
    const region = tiles.filter(([c, r]) => c <= 6 && r <= 6);
    const pool = (region.length ? region : tiles).slice();
    pool.sort((a, b) => {
      const na = openNeighbors(a[0], a[1]), nb = openNeighbors(b[0], b[1]);
      if (nb !== na) return nb - na;                 // most exits first
      return (a[0] + a[1]) - (b[0] + b[1]);          // then closest to the corner
    });
    return pool[0];
  }

  // How many of each piece a given level fields, and how fast they move.
  function roster(lvl) {
    const list = [];
    const add = (n, spd, glyph, color, kind) => {
      for (let i = 0; i < n; i++) list.push([spd, glyph, color, kind]);
    };
    add(2 + Math.min(3, lvl - 1), PAWN_SPEED, "♟", "#ff7d5c", "pawn");
    add(1 + (lvl >= 3 ? 1 : 0), KNIGHT_SPEED, "♞", "#8bd450", "knight");
    add(1 + (lvl >= 4 ? 1 : 0), ROOK_SPEED, "♜", "#6ea3ff", "rook");
    add(1 + (lvl >= 5 ? 1 : 0), BISHOP_SPEED, "♝", "#c78bff", "bishop");
    add(1 + (lvl >= 6 ? 1 : 0), QUEEN_SPEED, "♛", "#ffcf5c", "queen");
    add(1, KING_SPEED, "♚", "#ff5c8a", "king");
    return list;
  }

  // Build the maze, player, food, pickups and enemies for one level. Enemies
  // hold still for a grace period so the player is never run down at the start.
  function startLevel(n) {
    level = n;
    enemySpeedMul = Math.min(1.4, 1 + (level - 1) * 0.06);
    generateMaze();
    const tiles = openTiles();

    const start = chooseSpawn(tiles);
    playerStart = start;
    player = makeEntity(start[0], start[1], PLAYER_SPEED, "🙂", "#ffd166");

    // Food on every open tile except the spawn.
    food = tiles
      .filter(([c, r]) => !(c === start[0] && r === start[1]))
      .map(([c, r]) => ({ c, r }));
    foodLeft = food.length;

    // Bomb pickups scattered around, away from the spawn.
    pickups = [];
    const far = tiles.filter(([c, r]) => tileDist(c, r, start[0], start[1]) > 8);
    for (let i = 0; i < 10 && far.length; i++) {
      const idx = (Math.random() * far.length) | 0;
      const [c, r] = far.splice(idx, 1)[0];
      pickups.push({ c, r });
      const fi = food.findIndex((f) => f.c === c && f.r === r);
      if (fi >= 0) { food.splice(fi, 1); foodLeft--; }
    }

    // Enemies spawn far from the player.
    enemies = [];
    const spawnPool = tiles.filter(([c, r]) => tileDist(c, r, start[0], start[1]) > 14);
    for (const [speed, glyph, color, kind] of roster(level)) {
      const pool = spawnPool.length ? spawnPool : tiles;
      const idx = (Math.random() * pool.length) | 0;
      const [c, r] = pool.splice(idx, 1)[0];
      const e = makeEntity(c, r, speed, glyph, color);
      e.kind = kind;
      e.isEnemy = true;
      enemies.push(e);
    }

    bombs = [];
    bombCount = START_BOMBS;
    effects = [];
    weaponTimer = 0;
    message = "";
    graceTimer = START_GRACE;
    camX = camY = 0;
    updateCamera();
    running = true;
    updateHud();
  }

  // A fresh game from level 1.
  function newGame() {
    score = 0;
    lives = 3;
    startLevel(1);
  }

  // ---- Decision logic -------------------------------------------------------
  function decidePlayer(e) {
    const held = heldDirs();
    const open = held.filter((d) => isOpen(e.c + d.x, e.r + d.y));
    if (!open.length) { e.moving = false; e.dir = null; return; }
    // Keep going the current way if it's still held and open; otherwise switch
    // to the other held direction — this produces the zig-zag staircase when
    // two directions (e.g. up+right) are held in a diagonal corridor.
    let choose = e.dir && open.includes(e.dir) ? e.dir
               : open.find((d) => d !== opposite(e.dir)) || open[0];
    beginMove(e, choose);
  }

  // The king is a wall to his own pieces: no other enemy may enter his tile.
  function blockedByKing(self, c, r) {
    for (const e of enemies) {
      if (e === self || e.dead || e.kind !== "king") continue;
      const [kc, kr] = occupiedTile(e);
      if (kc === c && kr === r) return true;
    }
    return false;
  }
  const canEnter = (self, c, r) => isOpen(c, r) && !blockedByKing(self, c, r);

  const distTo = (c, r) => tileDist(c, r, player.c, player.r);

  // Slow, greedy single step toward the player, avoiding a reversal if possible.
  function greedyStep(e, speed) {
    let opts = DIRS.filter((d) => canEnter(e, e.c + d.x, e.r + d.y) && d !== opposite(e.dir));
    if (!opts.length) opts = DIRS.filter((d) => canEnter(e, e.c + d.x, e.r + d.y));
    if (!opts.length) { e.moving = false; return false; }
    opts.sort((a, b) => distTo(e.c + a.x, e.r + a.y) - distTo(e.c + b.x, e.r + b.y));
    // A dash of randomness so same-kind pieces don't march in single file.
    const pick = Math.random() < 0.82 ? opts[0] : opts[(Math.random() * opts.length) | 0];
    beginMove(e, pick, speed);
    return true;
  }

  // A "diagonal slide": alternate between the vertical and horizontal steps that
  // move toward the player, producing a zig-zag staircase. Once the piece is
  // genuinely alternating axes it moves at the fast slide speed.
  function diagStep(e, slow, slide) {
    const vd = player.r < e.r ? UP : player.r > e.r ? DOWN : null;
    const hd = player.c < e.c ? LEFT : player.c > e.c ? RIGHT : null;
    // Never reverse here — a diagonal that backtracks just oscillates in place,
    // which is what made the queen and bishop look stuck.
    const cand = (e.lastAxis === "h" ? [vd, hd] : [hd, vd])
      .filter((d) => d && d !== opposite(e.dir));
    for (const d of cand) {
      if (canEnter(e, e.c + d.x, e.r + d.y)) {
        const onStair = e.dir && (d.x !== 0) !== (e.dir.x !== 0);
        e.lastAxis = d.x !== 0 ? "h" : "v";
        beginMove(e, d, onStair ? slide : slow);
        return true;
      }
    }
    return false;
  }

  function decidePawn(e) {
    // Slow, greedy chaser: one plodding step at a time toward the player.
    greedyStep(e, PAWN_SPEED);
  }

  function decideKnight(e) {
    // Crawls like a pawn on the straight, but takes corners at a gallop.
    let opts = DIRS.filter((d) => canEnter(e, e.c + d.x, e.r + d.y) && d !== opposite(e.dir));
    if (!opts.length) opts = DIRS.filter((d) => canEnter(e, e.c + d.x, e.r + d.y));
    if (!opts.length) { e.moving = false; return; }
    opts.sort((a, b) => distTo(e.c + a.x, e.r + a.y) - distTo(e.c + b.x, e.r + b.y));
    const pick = Math.random() < 0.85 ? opts[0] : opts[(Math.random() * opts.length) | 0];
    const turning = e.dir && pick !== e.dir;   // changed heading = took a corner
    beginMove(e, pick, turning ? KNIGHT_TURN : KNIGHT_SPEED);
  }

  function decideRook(e) {
    // Charges down a rank or file when aligned with the player, and keeps its
    // momentum sliding straight; only slows to an amble when forced to turn.
    if (e.r === player.r) {
      const d = player.c > e.c ? RIGHT : LEFT;
      if (canEnter(e, e.c + d.x, e.r + d.y)) { beginMove(e, d, ROOK_SLIDE); return; }
    }
    if (e.c === player.c) {
      const d = player.r > e.r ? DOWN : UP;
      if (canEnter(e, e.c + d.x, e.r + d.y)) { beginMove(e, d, ROOK_SLIDE); return; }
    }
    if (e.dir && canEnter(e, e.c + e.dir.x, e.r + e.dir.y)) { beginMove(e, e.dir, ROOK_SLIDE); return; }
    greedyStep(e, ROOK_SPEED);
  }

  function decideBishop(e) {
    // Normally slow, but zips along a diagonal staircase toward the player.
    if (diagStep(e, BISHOP_SPEED, BISHOP_SLIDE)) return;
    greedyStep(e, BISHOP_SPEED);
  }

  function decideQueen(e) {
    // Slides like a rook AND a bishop: straight charge when aligned, otherwise
    // the diagonal staircase, otherwise a slow shuffle.
    if (e.r === player.r) {
      const d = player.c > e.c ? RIGHT : LEFT;
      if (canEnter(e, e.c + d.x, e.r + d.y)) { e.lastAxis = "h"; beginMove(e, d, QUEEN_SLIDE); return; }
    }
    if (e.c === player.c) {
      const d = player.r > e.r ? DOWN : UP;
      if (canEnter(e, e.c + d.x, e.r + d.y)) { e.lastAxis = "v"; beginMove(e, d, QUEEN_SLIDE); return; }
    }
    if (diagStep(e, QUEEN_SPEED, QUEEN_SLIDE)) return;
    greedyStep(e, QUEEN_SPEED);
  }

  function decideKing(e) {
    // Ponderous. He blocks his own pieces (see canEnter) and diffuses bombs he
    // walks over (see handleBombs) — but he's slow enough to outrun.
    greedyStep(e, KING_SPEED);
  }

  const BRAIN = {
    pawn: decidePawn, knight: decideKnight, rook: decideRook,
    bishop: decideBishop, queen: decideQueen, king: decideKing,
  };

  // ---- Actions --------------------------------------------------------------
  function dropBomb() {
    if (bombCount <= 0) return;
    const [c, r] = occupiedTile(player);
    if (bombs.some((b) => b.c === c && b.r === r)) return;
    bombs.push({ c, r });
    bombCount--;
    sfx.bombDrop();
    updateHud();
  }

  function fireWeapon() {
    if (weaponTimer > 0) return;
    weaponTimer = WEAPON_COOLDOWN;
    const d = player.face;
    const [pc, pr] = occupiedTile(player);
    const hitTiles = [];
    for (let i = 1; i <= WEAPON_RANGE; i++) {
      const c = pc + d.x * i, r = pr + d.y * i;
      if (!isOpen(c, r)) break;
      hitTiles.push([c, r]);
      for (const e of enemies) {
        if (e.dead) continue;
        const [ec, er] = occupiedTile(e);
        if (ec === c && er === r) { killEnemy(e); }
      }
    }
    effects.push({ type: "shot", tiles: hitTiles, from: [pc, pr], t: 0.14 });
    sfx.shoot();
  }

  function killEnemy(e) {
    e.dead = true;
    score += 100;
    const ctr = entityCenter(e);
    effects.push({ type: "boom", x: ctr.x, y: ctr.y, t: 0.4, r: TILE * 0.4 });
    sfx.explode();
    updateHud();
    // Respawn the piece after a short delay, far from the player.
    setTimeout(() => respawnEnemy(e), 4000);
  }

  function respawnEnemy(e) {
    if (!running) return;
    const tiles = openTiles().filter(([c, r]) => tileDist(c, r, player.c, player.r) > 12);
    if (!tiles.length) return;
    const [c, r] = tiles[(Math.random() * tiles.length) | 0];
    e.c = c; e.r = r; e.tc = c; e.tr = r;
    e.moving = false; e.progress = 0; e.dir = null; e.dead = false;
    e.lastAxis = null; e.moveSpeed = e.speed;
  }

  function loseLife() {
    lives--;
    sfx.death();
    if (lives <= 0) {
      running = false;
      message = "Game over";
      showOverlay(`Game over — you reached level ${level} with ${score} points.`,
                  "Play again", newGame);
    } else {
      // Send the player back to the safe spawn, push nearby enemies away, and
      // give a short grace so they aren't immediately on top of the player.
      const [sc, sr] = playerStart;
      player.c = sc; player.r = sr;
      player.tc = sc; player.tr = sr;
      player.moving = false; player.progress = 0; player.dir = null;
      for (const e of enemies) {
        if (tileDist(e.c, e.r, sc, sr) < 10) respawnEnemy(e);
      }
      graceTimer = RESPAWN_GRACE;
    }
    updateHud();
  }

  // ---- Update ---------------------------------------------------------------
  function update(dt) {
    if (!running) return;

    if (weaponTimer > 0) weaponTimer = Math.max(0, weaponTimer - dt);
    if (graceTimer > 0) graceTimer = Math.max(0, graceTimer - dt);

    // Instant reverse for crisp control: if the player holds the opposite of the
    // current direction, flip in place rather than waiting for the next tile.
    if (player.moving) {
      const rev = opposite(player.dir);
      const held = heldDirs();
      if (rev && held.includes(rev) && !held.includes(player.dir)) {
        const tc = player.tc, tr = player.tr;
        player.tc = player.c; player.tr = player.r;
        player.c = tc; player.r = tr;
        player.dir = rev; player.face = rev;
        player.progress = 1 - player.progress;
      }
    }

    stepEntity(player, dt, decidePlayer);
    // Enemies stay frozen during the start-of-level grace period.
    if (graceTimer <= 0) {
      for (const e of enemies) {
        if (e.dead) continue;
        stepEntity(e, dt, BRAIN[e.kind] || decidePawn);
      }
    }

    handlePickups();
    handleBombs();
    if (graceTimer <= 0) checkCollisions();

    for (const fx of effects) fx.t -= dt;
    effects = effects.filter((fx) => fx.t > 0);

    updateCamera();

    if (foodLeft <= 0 && running) advanceLevel();
  }

  function advanceLevel() {
    const bonus = 250 + bombCount * 25;
    score += bonus;
    running = false;
    sfx.win();
    showOverlay(
      `Board cleared! +${bonus} bonus. Ready for level ${level + 1}?`,
      `Start level ${level + 1}`,
      () => startLevel(level + 1)
    );
  }

  function handlePickups() {
    const pc = entityCenter(player);
    for (const f of food) {
      if (f.eaten) continue;
      const cx = f.c * TILE + TILE / 2, cy = f.r * TILE + TILE / 2;
      if (Math.hypot(pc.x - cx, pc.y - cy) < TILE * 0.5) {
        f.eaten = true;
        foodLeft--;
        score += 10;
        sfx.eat();
        updateHud();
      }
    }
    for (const p of pickups) {
      if (p.taken) continue;
      const cx = p.c * TILE + TILE / 2, cy = p.r * TILE + TILE / 2;
      if (Math.hypot(pc.x - cx, pc.y - cy) < TILE * 0.55) {
        p.taken = true;
        bombCount++;
        sfx.pickup();
        updateHud();
      }
    }
  }

  function handleBombs() {
    for (const b of bombs) {
      if (b.gone) continue;
      const bx = b.c * TILE + TILE / 2, by = b.r * TILE + TILE / 2;
      for (const e of enemies) {
        if (e.dead) continue;
        const ec = entityCenter(e);
        if (Math.hypot(ec.x - bx, ec.y - by) < TILE * 0.5) {
          b.gone = true;
          if (e.kind === "king") {
            // The king defuses bombs he steps on — no boom, no kill.
            effects.push({ type: "defuse", x: bx, y: by, t: 0.4, r: TILE * 0.4 });
            sfx.defuse();
          } else {
            killEnemy(e);
            effects.push({ type: "boom", x: bx, y: by, t: 0.4, r: TILE * 0.55 });
          }
          break;
        }
      }
    }
    bombs = bombs.filter((b) => !b.gone);
  }

  function checkCollisions() {
    const pc = entityCenter(player);
    for (const e of enemies) {
      if (e.dead) continue;
      const ec = entityCenter(e);
      if (Math.hypot(pc.x - ec.x, pc.y - ec.y) < TILE * 0.62) {
        loseLife();
        return;
      }
    }
  }

  function updateCamera() {
    const view = viewSize();
    const pc = entityCenter(player);
    const minX = view.w * DEADZONE, maxX = view.w * (1 - DEADZONE);
    const minY = view.h * DEADZONE, maxY = view.h * (1 - DEADZONE);
    let sx = pc.x - camX, sy = pc.y - camY;
    if (sx < minX) camX = pc.x - minX;
    else if (sx > maxX) camX = pc.x - maxX;
    if (sy < minY) camY = pc.y - minY;
    else if (sy > maxY) camY = pc.y - maxY;
    camX = WORLD_W <= view.w ? (WORLD_W - view.w) / 2 : clamp(camX, 0, WORLD_W - view.w);
    camY = WORLD_H <= view.h ? (WORLD_H - view.h) / 2 : clamp(camY, 0, WORLD_H - view.h);
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ---- Rendering ------------------------------------------------------------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  let dpr = 1;

  function viewSize() {
    return { w: canvas.width / dpr, h: canvas.height / dpr };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    if (running !== undefined) updateCamera();
  }

  function theme() {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return dark
      ? { bg: "#0f0f14", wall: "#2c2c38", wallEdge: "#3a3a4a", food: "#6b6b7b" }
      : { bg: "#ececf2", wall: "#c9c9d6", wallEdge: "#b3b3c4", food: "#9a9aab" };
  }

  function render() {
    const view = viewSize();
    const t = theme();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.save();
    ctx.translate(-Math.round(camX), -Math.round(camY));

    // Only draw the tiles inside the viewport.
    const c0 = Math.max(0, Math.floor(camX / TILE));
    const c1 = Math.min(COLS - 1, Math.floor((camX + view.w) / TILE));
    const r0 = Math.max(0, Math.floor(camY / TILE));
    const r1 = Math.min(ROWS - 1, Math.floor((camY + view.h) / TILE));

    // Walls
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (grid[r][c] === 1) {
          ctx.fillStyle = t.wall;
          roundRect(c * TILE + 1, r * TILE + 1, TILE - 2, TILE - 2, 6);
          ctx.fill();
        }
      }
    }

    // Food dots
    ctx.fillStyle = t.food;
    for (const f of food) {
      if (f.eaten || f.c < c0 || f.c > c1 || f.r < r0 || f.r > r1) continue;
      ctx.beginPath();
      ctx.arc(f.c * TILE + TILE / 2, f.r * TILE + TILE / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bomb pickups and deposited bombs
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${Math.round(TILE * 0.7)}px serif`;
    for (const p of pickups) {
      if (p.taken) continue;
      ctx.fillText("💣", p.c * TILE + TILE / 2, p.r * TILE + TILE / 2 + 1);
    }
    for (const b of bombs) {
      ctx.fillText("💣", b.c * TILE + TILE / 2, b.r * TILE + TILE / 2 + 1);
    }

    // Weapon flash
    for (const fx of effects) {
      if (fx.type === "shot") {
        ctx.strokeStyle = "rgba(255,209,102,0.9)";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        for (const [c, r] of fx.tiles) {
          ctx.beginPath();
          ctx.moveTo(fx.from[0] * TILE + TILE / 2, fx.from[1] * TILE + TILE / 2);
          ctx.lineTo(c * TILE + TILE / 2, r * TILE + TILE / 2);
          ctx.stroke();
        }
      }
    }

    // Enemies
    ctx.font = `${Math.round(TILE * 0.82)}px "Segoe UI Symbol", serif`;
    for (const e of enemies) {
      if (e.dead) continue;
      const ctr = entityCenter(e);
      ctx.fillStyle = e.color;
      ctx.fillText(e.glyph, ctr.x, ctr.y + 1);
    }

    // Player
    const pctr = entityCenter(player);
    ctx.font = `${Math.round(TILE * 0.74)}px serif`;
    ctx.fillText(player.glyph, pctr.x, pctr.y + 1);

    // Explosions and bomb defusals
    for (const fx of effects) {
      if (fx.type === "boom") {
        const a = fx.t / 0.4;
        ctx.fillStyle = `rgba(255,${Math.round(120 + 100 * a)},60,${a})`;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, fx.r * (1.6 - a), 0, Math.PI * 2);
        ctx.fill();
      } else if (fx.type === "defuse") {
        // A calm blue ring collapsing inward — the king snuffs the fuse.
        const a = fx.t / 0.4;
        ctx.strokeStyle = `rgba(110,163,255,${a})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, fx.r * (0.4 + a), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();

    // "Get ready!" cue while the enemies are still frozen at level start.
    if (running && graceTimer > 0) {
      ctx.fillStyle = t.food;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "600 24px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText("Get ready!", view.w / 2, view.h * 0.28);
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---- HUD / overlay --------------------------------------------------------
  const hud = document.getElementById("stats");
  const overlay = document.getElementById("overlay");
  const overlayText = document.getElementById("overlay-text");
  const overlayBtn = document.getElementById("overlay-btn");

  function updateHud() {
    hud.innerHTML =
      `<span>Level <b>${level}</b></span>` +
      `<span>Score <b>${score}</b></span>` +
      `<span>Lives <b>${"🙂".repeat(Math.max(0, lives)) || "—"}</b></span>` +
      `<span>Bombs <b>${bombCount}</b></span>` +
      `<span>Food left <b>${foodLeft}</b></span>`;
  }

  function showOverlay(text, btn, action) {
    overlayText.textContent = text;
    overlayBtn.textContent = btn;
    overlayAction = action || null;
    overlay.classList.add("show");
  }
  function hideOverlay() { overlay.classList.remove("show"); }

  // ---- Sound (Web Audio, synthesized — no files) ----------------------------
  const sfx = (() => {
    let ac = null, muted = false;
    const ensure = () => {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      return ac;
    };
    function tone(freq, dur, type = "square", gain = 0.06, slide = 0) {
      if (muted) return;
      const a = ensure();
      const o = a.createOscillator(), g = a.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, a.currentTime);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), a.currentTime + dur);
      g.gain.setValueAtTime(gain, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
      o.connect(g); g.connect(a.destination);
      o.start(); o.stop(a.currentTime + dur);
    }
    function noise(dur, gain = 0.14) {
      if (muted) return;
      const a = ensure();
      const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = a.createBufferSource(), g = a.createGain();
      src.buffer = buf;
      g.gain.setValueAtTime(gain, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
      src.connect(g); g.connect(a.destination);
      src.start();
    }
    return {
      resume: ensure,
      toggleMute() { muted = !muted; return muted; },
      isMuted() { return muted; },
      eat() { tone(680, 0.05, "square", 0.04); },
      pickup() { tone(520, 0.08, "triangle", 0.07, 260); },
      defuse() { tone(420, 0.16, "sine", 0.06, -260); tone(240, 0.22, "sine", 0.05, -120); },
      bombDrop() { tone(200, 0.09, "sine", 0.08, -60); },
      shoot() { tone(880, 0.08, "sawtooth", 0.05, -500); },
      explode() { noise(0.35, 0.16); tone(90, 0.3, "sine", 0.08, -40); },
      death() { tone(300, 0.5, "sawtooth", 0.09, -220); },
      win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.18, "triangle", 0.08), i * 130)); },
    };
  })();

  // ---- Input ----------------------------------------------------------------
  const KEYMAP = {
    ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
    ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
  };

  window.addEventListener("keydown", (e) => {
    sfx.resume();
    if (KEYMAP[e.code]) { input[KEYMAP[e.code]] = true; e.preventDefault(); return; }
    if (e.code === "Space") { fireWeapon(); e.preventDefault(); return; }
    if (e.code === "KeyB" || e.code === "ShiftLeft" || e.code === "ShiftRight") { dropBomb(); e.preventDefault(); return; }
    if (e.code === "KeyM") { const m = sfx.toggleMute(); muteBtn.textContent = m ? "🔇" : "🔊"; }
  });
  window.addEventListener("keyup", (e) => {
    if (KEYMAP[e.code]) { input[KEYMAP[e.code]] = false; e.preventDefault(); }
  });

  // On-screen touch controls (thumb-friendly for phones/tablets).
  function bindHold(id, on, off) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = (e) => { e.preventDefault(); sfx.resume(); on(); };
    const end = (e) => { e.preventDefault(); off && off(); };
    el.addEventListener("touchstart", start, { passive: false });
    el.addEventListener("touchend", end, { passive: false });
    el.addEventListener("mousedown", start);
    el.addEventListener("mouseup", end);
    el.addEventListener("mouseleave", () => off && off());
  }
  ["up", "down", "left", "right"].forEach((d) =>
    bindHold("btn-" + d, () => (input[d] = true), () => (input[d] = false)));
  bindHold("btn-shoot", () => fireWeapon());
  bindHold("btn-bomb", () => dropBomb());

  const muteBtn = document.getElementById("mute");
  muteBtn.addEventListener("click", () => {
    sfx.resume();
    const m = sfx.toggleMute();
    muteBtn.textContent = m ? "🔇" : "🔊";
  });

  overlayBtn.addEventListener("click", () => {
    sfx.resume();
    hideOverlay();
    if (overlayAction) overlayAction();
  });

  // ---- Main loop ------------------------------------------------------------
  let last = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();
  newGame();
  running = false;            // wait for the player to press Start
  showOverlay(
    "Collect the dots, dodge the chess pieces. Drop bombs in their path and blast them with your weapon.",
    "Start",
    () => { running = true; }
  );
  requestAnimationFrame(frame);
})();
