(() => {
  'use strict';

  const DIRS = ['n', 'e', 's', 'w'];
  const DELTA = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
  const OPP = { n: 's', e: 'w', s: 'n', w: 'e' };
  const GLYPHS = { n: '↑', e: '→', s: '↓', w: '←' };
  const clone = value => JSON.parse(JSON.stringify(value));

  const puzzles = [
    {
      title: 'Honey AND inspection', par: 3,
      note: 'AND: every input petal must get a bee before honey leaves the flower.',
      inputs: { A: 1, B: 1 }, targets: { J: 1 },
      grid: [
        '.......',
        '.A-7...',
        '...AND-J',
        '.B-L...',
        '.......'
      ],
      tiles: { AND: { type: 'gate', gate: 'AND', rot: 0, rotatable: true } },
      solution: { '3,2': 1 }
    },
    {
      title: 'Either hive, same jar', par: 2,
      note: 'OR: one bee is enough. Zero bees stays cloudy.',
      inputs: { A: 1, B: 0 }, targets: { J: 1 },
      grid: [
        '.......',
        '.A-7...',
        '...OR--J',
        '.B-L...',
        '.......'
      ],
      tiles: { OR: { type: 'gate', gate: 'OR', rot: 0, rotatable: true } },
      solution: { '3,2': 1 }
    },
    {
      title: 'Dead hive inverter', par: 2,
      note: 'NOT: if its input petal gets no bee, it politely sends one onward.',
      inputs: { A: 0 }, targets: { J: 1 },
      grid: [
        '.....',
        '.A-NJ',
        '.....'
      ],
      tiles: { N: { type: 'not', rot: 0, rotatable: true } },
      solution: { '3,1': 1 }
    },
    {
      title: 'The polite disagreement', par: 4,
      note: 'XOR: exactly one input petal must get a bee. Two bees cancel into very diplomatic wax.',
      inputs: { A: 1, B: 0 }, targets: { J: 1 },
      grid: [
        '.......',
        '.A-7...',
        '...XOR-J',
        '.B-L...',
        '.......'
      ],
      tiles: { XOR: { type: 'gate', gate: 'XOR', rot: 0, rotatable: true } },
      solution: { '3,2': 1 }
    },
    {
      title: 'One bee, two accountants', par: 5,
      note: 'Splitter: one incoming bee leaves through every other petal. The hive union insisted.',
      inputs: { A: 1 }, targets: { J: 1, K: 1 },
      grid: [
        '...J.',
        '.A-S-K',
        '.....'
      ],
      tiles: { S: { type: 'splitter', rot: 1, rotatable: true } },
      solution: { '3,1': 0 }
    },
    {
      title: 'Cloudy jar on purpose', par: 4,
      note: 'Targets can ask for 0. It is still a correct jar if no honey lights it.',
      inputs: { A: 1, B: 1 }, targets: { J: 0 },
      grid: [
        '.......',
        '.A-7...',
        '...XOR-J',
        '.B-L...',
        '.......'
      ],
      tiles: { XOR: { type: 'gate', gate: 'XOR', rot: 0, rotatable: true } },
      solution: { '3,2': 1 }
    },
    {
      title: 'Apiary audit trail', par: 6,
      note: 'Bends and straights can matter as much as flowers. Use Undo if your comb gets smug.',
      inputs: { A: 1, B: 1 }, targets: { J: 1 },
      grid: [
        '.........',
        '.A-7.....',
        '...AND--J',
        '.B-L.....',
        '.........'
      ],
      tiles: {
        AND: { type: 'gate', gate: 'AND', rot: 0, rotatable: true },
        '4,2': { type: 'line', shape: 'straight', rot: 0, rotatable: true },
        '5,2': { type: 'line', shape: 'straight', rot: 0, rotatable: true }
      },
      solution: { '3,2': 1, '4,2': 1, '5,2': 1 }
    },
    {
      title: 'Three jar finale', par: 8,
      note: 'Final inspection: make J cloudy, K glow, and H glow. The bees will file a tiny form afterward.',
      inputs: { A: 1, B: 0, C: 0 }, targets: { J: 0, K: 1, H: 1 },
      grid: [
        '...J...',
        '.A-XOR-K',
        '.B-OR..',
        '.C-N--H',
        '.......'
      ],
      tiles: {
        XOR: { type: 'gate', gate: 'XOR', rot: 0, rotatable: true },
        OR: { type: 'gate', gate: 'OR', rot: 0, rotatable: true },
        N: { type: 'not', rot: 0, rotatable: true }
      },
      solution: { '3,1': 1, '3,2': 1, '3,3': 1 }
    }
  ];

  const state = {
    level: 0,
    tiles: [],
    selected: { x: 1, y: 1 },
    edits: 0,
    attempts: 0,
    crowns: 0,
    history: [],
    running: false,
    muted: false,
    lessonStep: Number(localStorage.getItem('bb.lessonDone') || 0) ? 3 : 0,
    completed: new Set()
  };

  const el = {
    grid: document.getElementById('grid'),
    levelBadge: document.getElementById('levelBadge'),
    parBadge: document.getElementById('parBadge'),
    levelTitle: document.getElementById('levelTitle'),
    targetRow: document.getElementById('targetRow'),
    inputStat: document.getElementById('inputStat'),
    attemptStat: document.getElementById('attemptStat'),
    editStat: document.getElementById('editStat'),
    badgeStat: document.getElementById('badgeStat'),
    message: document.getElementById('message'),
    selectedHelp: document.getElementById('selectedHelp'),
    runBtn: document.getElementById('runBtn'),
    undoBtn: document.getElementById('undoBtn'),
    restartBtn: document.getElementById('restartBtn'),
    muteBtn: document.getElementById('muteBtn'),
    lesson: document.getElementById('lesson'),
    lessonNext: document.getElementById('lessonNext'),
    skipLesson: document.getElementById('skipLesson'),
    lessonToggle: document.getElementById('lessonToggle')
  };

  let audioContext = null;
  function sound(kind) {
    if (state.muted) return;
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const tones = { click: [420, .045, .035], run: [240, .13, .04], good: [360, .32, .055], wrong: [155, .22, .045] };
    const [freq, dur, vol] = tones[kind] || tones.click;
    osc.type = kind === 'wrong' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(kind === 'good' ? freq * 1.55 : freq * .92, now + dur);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(vol, now + .02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain).connect(audioContext.destination);
    osc.start(now); osc.stop(now + dur + .02);
  }

  function parseLevel(level) {
    const rows = level.grid;
    const width = Math.max(...rows.map(row => row.replace(/AND|XOR|OR/g, 'G').length));
    const parsed = rows.map((row, y) => {
      const out = [];
      for (let i = 0; i < row.length;) {
        if (row.slice(i, i + 3) === 'AND') { out.push(makeTile('gate', { gate: 'AND', rot: 0, rotatable: true })); i += 3; continue; }
        if (row.slice(i, i + 3) === 'XOR') { out.push(makeTile('gate', { gate: 'XOR', rot: 0, rotatable: true })); i += 3; continue; }
        if (row.slice(i, i + 2) === 'OR') { out.push(makeTile('gate', { gate: 'OR', rot: 0, rotatable: true })); i += 2; continue; }
        const ch = row[i++];
        out.push(tileFromChar(ch));
      }
      while (out.length < width) out.push(makeTile('empty'));
      return out.map((tile, x) => applyOverride(tile, level.tiles, x, y));
    });
    return parsed;
  }

  function applyOverride(tile, overrides = {}, x, y) {
    const key = `${x},${y}`;
    if (overrides[key]) return makeTile(overrides[key].type, overrides[key]);
    const label = tile.label || tile.gate;
    if (label && overrides[label]) return makeTile(overrides[label].type, { ...tile, ...overrides[label] });
    return tile;
  }

  function tileFromChar(ch) {
    if (ch === '.') return makeTile('empty');
    if (ch === '-') return makeTile('line', { shape: 'straight', rot: 1, rotatable: true });
    if (ch === '|') return makeTile('line', { shape: 'straight', rot: 0, rotatable: true });
    if (ch === '7') return makeTile('line', { shape: 'bend', rot: 2, rotatable: true });
    if (ch === 'L') return makeTile('line', { shape: 'bend', rot: 3, rotatable: true });
    if (ch === 'S') return makeTile('splitter', { rot: 1, rotatable: true });
    if (ch === 'N') return makeTile('not', { rot: 0, rotatable: true });
    if (/[ABC]/.test(ch)) return makeTile('input', { label: ch, rot: 1 });
    if (/[JKH]/.test(ch)) return makeTile('output', { label: ch });
    return makeTile('block');
  }

  function makeTile(type, opts = {}) {
    return { type, rot: opts.rot || 0, shape: opts.shape, gate: opts.gate, label: opts.label, rotatable: Boolean(opts.rotatable), lit: false, wrong: false };
  }

  function loadLevel(index) {
    const p = puzzles[index];
    state.tiles = parseLevel(p);
    state.selected = findFirstSelectable();
    state.edits = 0; state.attempts = 0; state.history = []; state.running = false;
    render();
    setMessage(`<strong>${p.title}.</strong> ${p.note}`);
  }

  function findFirstSelectable() {
    for (let y = 0; y < state.tiles.length; y += 1) for (let x = 0; x < state.tiles[y].length; x += 1) {
      if (state.tiles[y][x].type !== 'empty') return { x, y };
    }
    return { x: 0, y: 0 };
  }

  function render() {
    const p = puzzles[state.level];
    el.grid.style.setProperty('--cols', state.tiles[0].length);
    el.grid.innerHTML = '';
    state.tiles.forEach((row, y) => row.forEach((tile, x) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = tileClass(tile, x, y);
      b.setAttribute('role', 'gridcell');
      b.setAttribute('aria-label', describeTile(tile, true));
      b.disabled = state.running || tile.type === 'empty';
      b.dataset.x = x; b.dataset.y = y;
      exitsFor(tile).forEach(dir => {
        const stem = document.createElement('span');
        stem.className = `stem ${dir}`;
        b.appendChild(stem);
      });
      if (['gate', 'not', 'splitter'].includes(tile.type)) {
        const flower = document.createElement('span');
        flower.className = 'flower';
        b.appendChild(flower);
      }
      const label = document.createElement('span');
      label.className = 'label';
      label.innerHTML = labelFor(tile);
      b.appendChild(label);
      b.addEventListener('click', () => handleTileClick(x, y));
      el.grid.appendChild(b);
    }));
    el.levelBadge.textContent = `Puzzle ${state.level + 1} of ${puzzles.length}`;
    el.parBadge.textContent = `Par: ${p.par} edits`;
    el.levelTitle.textContent = p.title;
    el.inputStat.textContent = Object.entries(p.inputs).map(([k, v]) => `${k}=${v}`).join(' ');
    el.attemptStat.textContent = String(state.attempts);
    el.editStat.textContent = String(state.edits);
    el.badgeStat.textContent = `${state.crowns} crown${state.crowns === 1 ? '' : 's'}`;
    el.targetRow.innerHTML = Object.entries(p.targets).map(([k, v]) => `<span class="jar-chip"><span class="lamp ${v ? 'on' : ''}"></span>${k} should be ${v}</span>`).join('');
    el.selectedHelp.textContent = describeTile(selectedTile(), false);
    el.muteBtn.textContent = `Sound: ${state.muted ? 'off' : 'on'}`;
    updateLesson();
  }

  function tileClass(tile, x, y) {
    return [
      'tile', tile.type, tile.rotatable ? 'rotatable' : '',
      state.running ? 'locked' : '', tile.lit ? 'lit solved' : '', tile.wrong ? 'wrong' : '',
      state.selected.x === x && state.selected.y === y ? 'selected' : ''
    ].filter(Boolean).join(' ');
  }

  function labelFor(tile) {
    if (tile.type === 'empty') return '';
    if (tile.type === 'input') return `Hive <span class="sub">${tile.label}=${puzzles[state.level].inputs[tile.label]}</span>`;
    if (tile.type === 'output') return `Jar <span class="sub">${tile.label}</span>`;
    if (tile.type === 'gate') return `${tile.gate}<span class="sub">out ${GLYPHS[DIRS[tile.rot]]}</span>`;
    if (tile.type === 'not') return `NOT<span class="sub">out ${GLYPHS[DIRS[tile.rot]]}</span>`;
    if (tile.type === 'splitter') return `Split<span class="sub">3 ways</span>`;
    if (tile.shape === 'straight') return tile.rot % 2 ? '━' : '┃';
    if (tile.shape === 'bend') return ['┗', '┏', '┓', '┛'][tile.rot % 4];
    return '✕';
  }

  function describeTile(tile, short) {
    if (!tile) return 'No tile selected.';
    if (tile.type === 'empty') return 'Empty clover space. Bees do not travel here.';
    if (tile.type === 'input') return `Input hive ${tile.label}: ${puzzles[state.level].inputs[tile.label] ? 'sends a yellow 1 bee' : 'shows a grey no-bee puff'}.`;
    if (tile.type === 'output') return `Honey jar ${tile.label}: target is ${puzzles[state.level].targets[tile.label]}.`;
    if (tile.type === 'gate') return `${tile.gate} flower: ${gateRule(tile.gate)} ${short ? '' : 'Rotate it to choose the output petal.'}`;
    if (tile.type === 'not') return 'NOT flower: sends one bee only when its input side receives no bee.';
    if (tile.type === 'splitter') return 'Splitter: copies an incoming bee through all other connected petals.';
    if (tile.type === 'line') return tile.shape === 'straight' ? 'Straight bee lane: rotate to be vertical or horizontal.' : 'Bend lane: rotate to turn a corner.';
    return 'Blocked wax comb. Bees cannot pass.';
  }

  function gateRule(gate) {
    return gate === 'AND' ? 'all connected input petals need bees.' : gate === 'OR' ? 'at least one connected input petal needs a bee.' : 'exactly one connected input petal needs a bee.';
  }

  function exitsFor(tile) {
    if (!tile || tile.type === 'empty' || tile.type === 'block') return [];
    if (tile.type === 'input') return [DIRS[tile.rot]];
    if (tile.type === 'output') return DIRS;
    if (tile.type === 'line' && tile.shape === 'straight') return tile.rot % 2 ? ['e', 'w'] : ['n', 's'];
    if (tile.type === 'line' && tile.shape === 'bend') return [['n', 'e'], ['e', 's'], ['s', 'w'], ['w', 'n']][tile.rot % 4];
    if (tile.type === 'splitter') return DIRS.filter(dir => dir !== OPP[outputDir(tile)]);
    if (tile.type === 'gate' || tile.type === 'not') return DIRS;
    return [];
  }

  function outputDir(tile) { return DIRS[tile.rot % 4]; }
  function inputDirsFor(tile) { return DIRS.filter(dir => dir !== outputDir(tile)); }
  function selectedTile() { return state.tiles[state.selected.y]?.[state.selected.x]; }

  function handleTileClick(x, y) {
    if (state.running) return;
    state.selected = { x, y };
    const tile = selectedTile();
    if (tile?.rotatable) rotateSelected(1);
    render();
  }

  function rotateSelected(delta) {
    const tile = selectedTile();
    if (!tile || !tile.rotatable || state.running) return;
    state.history.push({ x: state.selected.x, y: state.selected.y, rot: tile.rot });
    tile.rot = (tile.rot + delta + 4) % 4;
    state.edits += 1;
    sound('click');
    setMessage(`<strong>Petal turned.</strong> ${describeTile(tile, false)}`);
    render();
  }

  function move(dx, dy) {
    const h = state.tiles.length, w = state.tiles[0].length;
    let x = state.selected.x, y = state.selected.y;
    for (let i = 0; i < Math.max(w, h); i += 1) {
      x = Math.max(0, Math.min(w - 1, x + dx));
      y = Math.max(0, Math.min(h - 1, y + dy));
      if (state.tiles[y][x].type !== 'empty') break;
    }
    state.selected = { x, y };
    render();
  }

  function undo() {
    if (state.running) return;
    const last = state.history.pop();
    if (!last) { setMessage('<strong>No undo yet.</strong> The wax clerk has a blank clipboard.'); return; }
    state.tiles[last.y][last.x].rot = last.rot;
    state.edits = Math.max(0, state.edits - 1);
    state.selected = { x: last.x, y: last.y };
    setMessage('<strong>Undo complete.</strong> One flower quietly pretends that never happened.');
    render();
  }

  async function runSwarm() {
    if (state.running) return;
    state.running = true;
    state.attempts += 1;
    clearJarMarks();
    render();
    sound('run');
    setMessage('<strong>Swarm released.</strong> The bees are computing with their tiny knees.');
    const result = simulate();
    await animateSignals(result.paths, result.puffs);
    const matches = compareResult(result.outputs);
    markJars(result.outputs, matches);
    state.running = false;
    if (matches.ok && solutionMatches()) {
      const crown = state.edits <= puzzles[state.level].par && !state.completed.has(state.level);
      if (crown) state.crowns += 1;
      state.completed.add(state.level);
      sound('good');
      if (state.level === puzzles.length - 1) {
        setMessage(`<strong>Apiary certified.</strong> All jars passed${crown ? ' and the queen awarded a par crown' : ''}. Press R to restart the set.`);
      } else {
        setMessage(`<strong>Correct honey.</strong> ${crown ? 'Par crown earned. ' : ''}Next puzzle is being wheeled in on a very small cart.`);
        window.setTimeout(() => { state.level += 1; loadLevel(state.level); }, 1600);
      }
    } else {
      sound('wrong');
      const details = Object.entries(puzzles[state.level].targets).map(([k, v]) => `${k}: expected ${v}, got ${result.outputs[k] || 0}`).join('; ');
      setMessage(`<strong>Wax stamp: not yet.</strong> ${details}. The last trail stays in your head, which is safer than bee chalk.`);
    }
    render();
  }

  function clearJarMarks() {
    state.tiles.flat().forEach(tile => { tile.lit = false; tile.wrong = false; });
    document.querySelectorAll('.bee,.puff').forEach(node => node.remove());
  }

  function simulate() {
    const p = puzzles[state.level];
    const outputs = {};
    const paths = [];
    const puffs = [];
    let active = [];
    state.tiles.forEach((row, y) => row.forEach((tile, x) => {
      if (tile.type === 'input') {
        if (p.inputs[tile.label]) active.push({ x, y, dir: outputDir(tile), path: [{ x, y }] });
        else puffs.push({ x, y });
      }
    }));
    state.tiles.forEach((row, y) => row.forEach((tile, x) => {
      if (tile.type === 'not' && !hasHotInputNeighbor(x, y, tile)) {
        active.push({ x, y, dir: outputDir(tile), path: [{ x, y }] });
      }
    }));
    const maxSteps = 18;
    for (let step = 0; step < maxSteps && active.length; step += 1) {
      const arrivals = new Map();
      active.forEach(sig => {
        const [dx, dy] = DELTA[sig.dir];
        const nx = sig.x + dx, ny = sig.y + dy;
        const tile = state.tiles[ny]?.[nx];
        if (!tile || !connects(tile, OPP[sig.dir])) { paths.push([...sig.path, { x: nx, y: ny, lost: true }]); return; }
        const key = `${nx},${ny}`;
        if (!arrivals.has(key)) arrivals.set(key, []);
        arrivals.get(key).push({ ...sig, x: nx, y: ny, from: OPP[sig.dir], path: [...sig.path, { x: nx, y: ny }] });
      });
      const next = [];
      arrivals.forEach((signals, key) => {
        const [x, y] = key.split(',').map(Number);
        const tile = state.tiles[y][x];
        if (tile.type === 'output') {
          outputs[tile.label] = 1;
          signals.forEach(sig => paths.push(sig.path));
          return;
        }
        if (tile.type === 'line') {
          signals.forEach(sig => exitsFor(tile).filter(d => d !== sig.from).forEach(dir => next.push({ x, y, dir, path: sig.path })));
          return;
        }
        if (tile.type === 'splitter') {
          signals.forEach(sig => exitsFor(tile).filter(d => d !== sig.from).forEach(dir => next.push({ x, y, dir, path: sig.path })));
          return;
        }
        if (tile.type === 'gate') {
          const incoming = new Set(signals.map(sig => sig.from).filter(dir => inputDirsFor(tile).includes(dir)));
          const count = incoming.size;
          const needed = connectedInputs(x, y, tile).length || inputDirsFor(tile).length;
          const passes = tile.gate === 'AND' ? count >= needed : tile.gate === 'OR' ? count >= 1 : count === 1;
          signals.forEach(sig => paths.push(sig.path));
          if (passes) next.push({ x, y, dir: outputDir(tile), path: [ { x, y } ] });
          return;
        }
        if (tile.type === 'not') {
          const gotInput = signals.some(sig => inputDirsFor(tile).includes(sig.from));
          signals.forEach(sig => paths.push(sig.path));
          if (!gotInput) next.push({ x, y, dir: outputDir(tile), path: [ { x, y } ] });
        }
      });
      // Timed-out NOT flowers also fire when no bee reached their input side.
      state.tiles.forEach((row, y) => row.forEach((tile, x) => {
        if (tile.type !== 'not') return;
        const key = `${x},${y}`;
        if (!arrivals.has(key) && step === 0) next.push({ x, y, dir: outputDir(tile), path: [{ x, y }] });
      }));
      active = dedupeSignals(next);
    }
    Object.keys(p.targets).forEach(k => { outputs[k] = outputs[k] ? 1 : 0; });
    return { outputs, paths, puffs };
  }

  function dedupeSignals(signals) {
    const seen = new Set();
    return signals.filter(sig => {
      const key = `${sig.x},${sig.y},${sig.dir},${sig.path.length}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function connects(tile, dir) { return exitsFor(tile).includes(dir); }

  function connectedInputs(x, y, tile) {
    return inputDirsFor(tile).filter(dir => {
      const [dx, dy] = DELTA[dir];
      const neighbor = state.tiles[y + dy]?.[x + dx];
      return neighbor && connects(neighbor, OPP[dir]);
    });
  }

  function hasHotInputNeighbor(x, y, tile) {
    const p = puzzles[state.level];
    return inputDirsFor(tile).some(dir => {
      const [dx, dy] = DELTA[dir];
      const neighbor = state.tiles[y + dy]?.[x + dx];
      return neighbor?.type === 'input' && p.inputs[neighbor.label] && outputDir(neighbor) === OPP[dir];
    });
  }

  function compareResult(outputs) {
    const targets = puzzles[state.level].targets;
    const bad = Object.keys(targets).filter(k => (outputs[k] || 0) !== targets[k]);
    return { ok: bad.length === 0, bad };
  }

  function solutionMatches() {
    const required = puzzles[state.level].solution || {};
    return Object.entries(required).every(([key, rot]) => {
      const [x, y] = key.split(',').map(Number);
      return state.tiles[y]?.[x]?.rot === rot;
    });
  }

  function markJars(outputs, matches) {
    state.tiles.flat().forEach(tile => {
      if (tile.type === 'output') {
        tile.lit = Boolean(outputs[tile.label]);
        tile.wrong = matches.bad.includes(tile.label);
      }
    });
  }

  function tileCenter(x, y) {
    const cell = el.grid.querySelector(`[data-x="${x}"][data-y="${y}"]`);
    const wrap = el.grid.getBoundingClientRect();
    if (!cell) return { left: 0, top: 0 };
    const box = cell.getBoundingClientRect();
    return { left: box.left - wrap.left + box.width / 2, top: box.top - wrap.top + box.height / 2 };
  }

  async function animateSignals(paths, puffs) {
    const wrap = el.grid;
    puffs.forEach(puff => {
      const dot = document.createElement('span');
      dot.className = 'puff';
      const pos = tileCenter(puff.x, puff.y);
      dot.style.left = `${pos.left - 10}px`; dot.style.top = `${pos.top - 10}px`;
      wrap.appendChild(dot);
    });
    const trimmed = paths.filter(path => path.length > 1).slice(0, 18);
    await Promise.all(trimmed.map((path, i) => animateOnePath(path, i * 70)));
  }

  function animateOnePath(path, delay) {
    return new Promise(resolve => {
      const bee = document.createElement('span');
      bee.className = 'bee';
      const start = tileCenter(path[0].x, path[0].y);
      bee.style.left = `${start.left}px`; bee.style.top = `${start.top}px`; bee.style.opacity = '0';
      el.grid.appendChild(bee);
      window.setTimeout(() => {
        bee.style.opacity = '1';
        let i = 1;
        const step = () => {
          if (i >= path.length) {
            bee.style.opacity = '0';
            window.setTimeout(() => { bee.remove(); resolve(); }, 360);
            return;
          }
          const pos = tileCenter(path[i].x, path[i].y);
          bee.style.left = `${pos.left}px`; bee.style.top = `${pos.top}px`;
          i += 1;
          window.setTimeout(step, 560);
        };
        step();
      }, delay);
    });
  }

  function restart() {
    if (state.running) return;
    if (state.level === puzzles.length - 1 && state.completed.has(state.level)) {
      state.level = 0; state.crowns = 0; state.completed.clear();
    }
    loadLevel(state.level);
  }

  function setMessage(html) { el.message.innerHTML = html; }

  function updateLesson() {
    if (state.lessonStep >= 3) {
      el.lesson.classList.add('hidden');
      el.lessonToggle.textContent = 'Show learning';
      return;
    }
    el.lesson.classList.remove('hidden');
    const labels = ['I found the cursor', 'I can rotate flowers', 'Release the swarm'];
    el.lessonNext.textContent = labels[state.lessonStep] || 'Done learning';
  }

  function completeLesson() {
    state.lessonStep = 3;
    localStorage.setItem('bb.lessonDone', '1');
    updateLesson();
  }

  document.addEventListener('keydown', event => {
    if (event.target.matches('button,a')) return;
    const key = event.key.toLowerCase();
    if (['arrowup', 'w'].includes(key)) { event.preventDefault(); move(0, -1); }
    else if (['arrowdown', 's'].includes(key)) { event.preventDefault(); move(0, 1); }
    else if (['arrowleft', 'a'].includes(key)) { event.preventDefault(); move(-1, 0); }
    else if (['arrowright', 'd'].includes(key)) { event.preventDefault(); move(1, 0); }
    else if (key === ' ' || key === 'z') { event.preventDefault(); rotateSelected(1); }
    else if (key === 'x') { event.preventDefault(); rotateSelected(-1); }
    else if (key === 'enter') { event.preventDefault(); runSwarm(); }
    else if (key === 'backspace' || key === 'u') { event.preventDefault(); undo(); }
    else if (key === 'r') { event.preventDefault(); restart(); }
  });

  el.runBtn.addEventListener('click', runSwarm);
  el.undoBtn.addEventListener('click', undo);
  el.restartBtn.addEventListener('click', restart);
  el.muteBtn.addEventListener('click', () => { state.muted = !state.muted; render(); });
  el.lessonNext.addEventListener('click', () => { state.lessonStep += 1; if (state.lessonStep >= 3) completeLesson(); else updateLesson(); });
  el.skipLesson.addEventListener('click', completeLesson);
  el.lessonToggle.addEventListener('click', () => { state.lessonStep = state.lessonStep >= 3 ? 0 : 3; updateLesson(); });
  document.querySelectorAll('[data-pad]').forEach(button => button.addEventListener('click', () => {
    const action = button.dataset.pad;
    if (action === 'up') move(0, -1);
    if (action === 'down') move(0, 1);
    if (action === 'left') move(-1, 0);
    if (action === 'right') move(1, 0);
    if (action === 'rot') rotateSelected(1);
  }));

  loadLevel(0);
})();

