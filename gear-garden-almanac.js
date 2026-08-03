(() => {
  'use strict';

  const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
  const clone = value => JSON.parse(JSON.stringify(value));
  const dirName = d => d === 1 ? 'CW' : 'CCW';
  const sameRatio = (a, b) => a.num === b.num && a.den === b.den;
  function ratio(num, den = 1) {
    const g = gcd(num, den) || 1;
    return { num: num / g, den: den / g };
  }
  function ratioText(r) { return r.den === 1 ? `${r.num}x` : `${r.num}/${r.den}x`; }
  function resultText(result) {
    if (!result) return 'no drive';
    if (result.jam) return 'jam';
    return `${ratioText(result.ratio)} ${dirName(result.dir)}`;
  }
  function targetText(t) { return `${ratioText(t.ratio)} ${dirName(t.dir)}`; }

  const puzzles = [
    {
      title: 'First idler flower', par: 2, cols: 3, rows: 3,
      note: 'Two equal gears make a direction flip; a second equal gear flips it back for the flower.',
      pegs: [{ x:0,y:1, fixed:true, starter:true, teeth:12 }, { x:1,y:1 }, { x:2,y:1, target:{ ratio:ratio(1), dir:1 }}],
      tray: [12, 12]
    },
    {
      title: 'Slow petal lesson', par: 2, cols: 3, rows: 3,
      note: 'An 8-tooth crank eventually driving a 16-tooth flower gear gives the flower half speed.',
      pegs: [{ x:0,y:1, fixed:true, starter:true, teeth:8 }, { x:1,y:1 }, { x:2,y:1, target:{ ratio:ratio(1,2), dir:1 }}],
      tray: [8, 16]
    },
    {
      title: 'One calm reversal', par: 1, cols: 2, rows: 3,
      note: 'Adjacent meshed gears always rotate in opposite directions.',
      pegs: [{ x:0,y:1, fixed:true, starter:true, teeth:12 }, { x:1,y:1, target:{ ratio:ratio(1), dir:-1 }}],
      tray: [12]
    },
    {
      title: 'Small gear hurries', par: 2, cols: 3, rows: 3,
      note: 'A larger gear driving a smaller gear speeds the smaller one up.',
      pegs: [{ x:0,y:1, fixed:true, starter:true, teeth:16 }, { x:1,y:1 }, { x:2,y:1, target:{ ratio:ratio(2), dir:1 }}],
      tray: [16, 8]
    },
    {
      title: 'Corner conservatory', par: 3, cols: 3, rows: 3,
      note: 'The train can turn a corner; count each mesh for direction and tooth ratios for speed.',
      pegs: [{ x:0,y:2, fixed:true, starter:true, teeth:12 }, { x:1,y:2 }, { x:1,y:1 }, { x:1,y:0, target:{ ratio:ratio(1,2), dir:-1 }}],
      tray: [12, 12, 24]
    },
    {
      title: 'Two beds, one shared gear', par: 3, cols: 4, rows: 3,
      note: 'One middle gear can feed two flowers at once if both tags agree with its outputs.',
      pegs: [{ x:0,y:1, fixed:true, starter:true, teeth:12 }, { x:1,y:1 }, { x:2,y:1, target:{ ratio:ratio(1), dir:1 }}, { x:1,y:0, target:{ ratio:ratio(1), dir:1 }}],
      tray: [12, 12, 12]
    },
    {
      title: 'Three-to-two thyme', par: 2, cols: 3, rows: 3,
      note: 'A 12-tooth crank ending on an 8-tooth flower gear gives a 3/2 speed ratio.',
      pegs: [{ x:0,y:1, fixed:true, starter:true, teeth:12 }, { x:1,y:1 }, { x:2,y:1, target:{ ratio:ratio(3,2), dir:1 }}],
      tray: [12, 8]
    },
    {
      title: 'Tall greenhouse loop', par: 4, cols: 4, rows: 4,
      note: 'A longer path keeps the final ratio readable: first teeth divided by last teeth, with every idler flipping direction.',
      pegs: [{ x:0,y:3, fixed:true, starter:true, teeth:8 }, { x:1,y:3 }, { x:1,y:2 }, { x:2,y:2 }, { x:2,y:1, target:{ ratio:ratio(1,3), dir:1 }}],
      tray: [8, 12, 16, 24]
    },
    {
      title: 'Jam demonstration', par: 4, cols: 3, rows: 3,
      note: 'Two paths can disagree. Make the two flowers bloom without letting the center gear receive incompatible drives.',
      pegs: [{ x:0,y:1, fixed:true, starter:true, teeth:12 }, { x:1,y:1 }, { x:2,y:1, target:{ ratio:ratio(1), dir:1 }}, { x:1,y:0, target:{ ratio:ratio(1), dir:1 }}, { x:0,y:0, fixed:true, teeth:12 }],
      tray: [12, 12, 12]
    },
    {
      title: 'Almanac final bouquet', par: 5, cols: 5, rows: 4,
      note: 'A compact finale: one train, two different flower speeds, and enough idlers to keep direction friendly.',
      pegs: [{ x:0,y:2, fixed:true, starter:true, teeth:16 }, { x:1,y:2 }, { x:2,y:2, target:{ ratio:ratio(1), dir:1 }}, { x:3,y:2 }, { x:4,y:2, target:{ ratio:ratio(2), dir:1 }}, { x:2,y:1, target:{ ratio:ratio(1), dir:-1 }}],
      tray: [16,16,16,16,8]
    }
  ];

  const state = {
    level: 0, pegs: [], tray: [], held: null, selected: { type: 'peg', index: 0 },
    moves: 0, attempts: 0, medals: 0, history: [], testing: false, muted: false,
    lessonDone: localStorage.getItem('gga.lessonDone') === '1'
  };

  const el = {
    lesson: document.getElementById('lesson'), lessonNext: document.getElementById('lessonNext'), skipLesson: document.getElementById('skipLesson'), lessonToggle: document.getElementById('lessonToggle'),
    soundBtn: document.getElementById('soundBtn'), board: document.getElementById('board'), tray: document.getElementById('tray'), levelBadge: document.getElementById('levelBadge'), parBadge: document.getElementById('parBadge'),
    levelTitle: document.getElementById('levelTitle'), almanac: document.getElementById('almanac'), moveStat: document.getElementById('moveStat'), attemptStat: document.getElementById('attemptStat'), medalStat: document.getElementById('medalStat'), heldStat: document.getElementById('heldStat'), message: document.getElementById('message'), help: document.getElementById('help'), testBtn: document.getElementById('testBtn'), undoBtn: document.getElementById('undoBtn'), restartBtn: document.getElementById('restartBtn')
  };

  let audioContext = null;
  function sound(kind) {
    if (state.muted) return;
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const tones = { click: [320, .045, .035], crank: [155, .2, .05], good: [390, .35, .055], wrong: [180, .28, .04] };
    const [freq, dur, vol] = tones[kind] || tones.click;
    osc.type = kind === 'crank' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(kind === 'good' ? freq * 1.4 : freq * .88, now + dur);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(vol, now + .025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain).connect(audioContext.destination);
    osc.start(now); osc.stop(now + dur + .04);
  }

  function makeGear(teeth, id) { return { id, teeth }; }
  function loadLevel(index) {
    const p = puzzles[index];
    state.pegs = p.pegs.map((peg, i) => ({ ...clone(peg), gear: peg.teeth ? makeGear(peg.teeth, `fixed-${i}`) : null, result: null, status: '' }));
    state.tray = p.tray.map((teeth, i) => makeGear(teeth, `L${index}-G${i}`));
    state.held = null; state.selected = { type: 'peg', index: 0 }; state.moves = 0; state.attempts = 0; state.history = []; state.testing = false;
    render();
    setMessage(`<strong>${p.title}.</strong> ${p.note}`);
  }
  function snapshot() { return { pegs: clone(state.pegs), tray: clone(state.tray), held: clone(state.held), moves: state.moves }; }
  function restore(s) { state.pegs = s.pegs; state.tray = s.tray; state.held = s.held; state.moves = s.moves; clearResults(); render(); }
  function pushHistory() { state.history.push(snapshot()); if (state.history.length > 80) state.history.shift(); }
  function clearResults() { state.pegs.forEach(p => { p.result = null; p.status = ''; }); state.testing = false; }
  function setMessage(html) { el.message.innerHTML = html; }

  function render() {
    const p = puzzles[state.level];
    el.lesson.classList.toggle('hidden', state.lessonDone);
    el.lessonToggle.textContent = state.lessonDone ? 'Show learning' : 'Hide learning';
    el.board.style.setProperty('--cols', p.cols);
    el.board.innerHTML = '';
    for (let y = 0; y < p.rows; y += 1) {
      for (let x = 0; x < p.cols; x += 1) {
        const pegIndex = state.pegs.findIndex(pg => pg.x === x && pg.y === y);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'peg';
        button.setAttribute('role', 'gridcell');
        if (pegIndex < 0) {
          button.classList.add('empty-cell');
          button.tabIndex = -1;
          el.board.appendChild(button);
          continue;
        }
        const peg = state.pegs[pegIndex];
        if (state.selected.type === 'peg' && state.selected.index === pegIndex) button.classList.add('selected');
        if (peg.status) button.classList.add(peg.status);
        button.dataset.peg = pegIndex;
        button.setAttribute('aria-label', describePeg(peg));
        button.addEventListener('click', () => { state.selected = { type: 'peg', index: pegIndex }; activate(); });
        if (peg.gear) button.appendChild(gearNode(peg.gear, peg.fixed, peg.result));
        if (peg.target) {
          const flower = document.createElement('span'); flower.className = 'flower'; button.appendChild(flower);
          const tag = document.createElement('span'); tag.className = 'target-tag'; tag.textContent = targetText(peg.target); button.appendChild(tag);
        }
        if (peg.result || (peg.target && state.attempts > 0 && state.testing)) {
          const tag = document.createElement('span'); tag.className = 'result-tag'; tag.textContent = resultText(peg.result); button.appendChild(tag);
        }
        el.board.appendChild(button);
      }
    }
    el.tray.innerHTML = '';
    state.tray.forEach((gear, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tray-gear';
      if (state.selected.type === 'tray' && state.selected.index === i) b.classList.add('selected');
      b.dataset.tray = i; b.setAttribute('aria-label', `${gear.teeth}-tooth tray gear`);
      b.innerHTML = `<span class="mini-gear"><span class="teeth">${gear.teeth}</span></span>`;
      b.addEventListener('click', () => { state.selected = { type: 'tray', index: i }; activate(); });
      el.tray.appendChild(b);
    });
    el.levelBadge.textContent = `Puzzle ${state.level + 1} of ${puzzles.length}`;
    el.parBadge.textContent = `Par: ${p.par} placements`;
    el.levelTitle.textContent = p.title;
    el.almanac.innerHTML = state.pegs.filter(pg => pg.target).map((pg, i) => `<div class="target-chip">Flower ${i + 1}: <span>needs ${targetText(pg.target)}</span></div>`).join('');
    el.moveStat.textContent = String(state.moves); el.attemptStat.textContent = String(state.attempts); el.medalStat.textContent = String(state.medals);
    el.heldStat.innerHTML = state.held ? `<span class="held">${state.held.teeth} teeth</span>` : 'nothing';
    el.help.textContent = selectedHelp();
    el.testBtn.textContent = state.testing ? 'Edit gears' : 'Test crank';
  }

  function gearNode(gear, fixed, result) {
    const g = document.createElement('span');
    const dir = result && !result.jam ? (result.dir === 1 ? 'cw' : 'ccw') : '';
    g.className = `gear ${fixed ? 'fixed' : ''} ${dir} ${state.testing && result && !result.jam ? 'testing' : ''}`;
    if (result && !result.jam) {
      const speed = result.ratio.num / result.ratio.den;
      g.style.setProperty('--spin', `${Math.max(2.2, 6 / Math.max(.25, speed)).toFixed(2)}s`);
    }
    const t = document.createElement('span'); t.className = 'teeth'; t.textContent = gear.teeth;
    g.appendChild(t); return g;
  }

  function describePeg(peg) {
    const bits = [];
    if (peg.starter) bits.push('starter crank');
    if (peg.target) bits.push(`flower target ${targetText(peg.target)}`);
    bits.push(peg.gear ? `${peg.gear.teeth}-tooth gear` : 'empty peg');
    return bits.join(', ');
  }
  function selectedHelp() {
    if (state.selected.type === 'tray') return `Tray gear: ${state.tray[state.selected.index]?.teeth || '?'} teeth. Pick it up with Z or Enter, then place it on a peg.`;
    const peg = state.pegs[state.selected.index];
    if (!peg) return 'Move the cursor with arrows or WASD.';
    if (peg.starter) return 'Starter crank: fixed at 1x clockwise. It drives any gear on a neighboring peg.';
    if (peg.fixed) return 'Fixed gear: part of this puzzle. It may drive or jam nearby gears, but cannot be moved.';
    if (peg.target) return `Flower peg: place a gear here so it receives ${targetText(peg.target)}.`;
    return peg.gear ? `${peg.gear.teeth}-tooth placed gear. Pick it up or swap it with the held gear.` : 'Empty peg. Place a held gear here.';
  }

  function activate() {
    if (state.testing) { clearResults(); render(); return; }
    if (state.selected.type === 'tray') {
      const gear = state.tray[state.selected.index];
      if (!gear) return;
      pushHistory();
      if (state.held) state.tray[state.selected.index] = state.held; else state.tray.splice(state.selected.index, 1);
      state.held = gear; state.moves += 1; sound('click'); render();
      return;
    }
    const peg = state.pegs[state.selected.index];
    if (!peg || peg.fixed) { render(); return; }
    pushHistory();
    const temp = peg.gear; peg.gear = state.held; state.held = temp || null; state.moves += 1; clearResults(); sound('click'); render();
  }

  function test() {
    if (state.testing) { clearResults(); setMessage('<strong>Editing again.</strong> The greenhouse is still and ready for another arrangement.'); render(); return; }
    state.attempts += 1; clearResults();
    const results = computeResults();
    state.pegs.forEach((peg, i) => { peg.result = results.get(i) || null; });
    let all = true; let jams = 0;
    state.pegs.forEach(peg => {
      if (peg.result?.jam) { peg.status = 'jam'; jams += 1; }
      if (peg.target) {
        const ok = peg.result && !peg.result.jam && peg.result.dir === peg.target.dir && sameRatio(peg.result.ratio, peg.target.ratio);
        peg.status = ok ? 'good' : 'wrong';
        if (!ok) all = false;
      }
    });
    state.testing = true; sound(all ? 'good' : 'wrong');
    if (all) {
      const medal = state.moves <= puzzles[state.level].par;
      if (medal) state.medals += 1;
      setMessage(`<strong>Almanac stamped.</strong> Every flower bloomed correctly${medal ? ' at par for a brass medal' : ''}. ${state.level < puzzles.length - 1 ? 'Next puzzle is opening softly.' : 'The final bouquet is complete.'}`);
      render();
      window.setTimeout(() => {
        if (state.level < puzzles.length - 1) { state.level += 1; loadLevel(state.level); }
        else { setMessage('<strong>Greenhouse complete.</strong> The clockwork flowers settle into a slow, satisfied bouquet. Restart any puzzle whenever you want another ratio lesson.'); render(); }
      }, 1400);
    } else {
      setMessage(`<strong>Not yet.</strong> ${jams ? `${jams} gear path jammed; ` : ''}the flower badges show what each target actually received. Keep the gears in place and edit calmly.`);
      render();
    }
  }

  function computeResults() {
    const out = new Map();
    const starter = state.pegs.findIndex(p => p.starter && p.gear);
    if (starter < 0) return out;
    out.set(starter, { ratio: ratio(1), dir: 1 });
    const queue = [starter];
    while (queue.length) {
      const i = queue.shift();
      const peg = state.pegs[i]; const res = out.get(i);
      if (!peg.gear || !res || res.jam) continue;
      neighbors(i).forEach(j => {
        const other = state.pegs[j]; if (!other.gear) return;
        const next = { ratio: ratio(res.ratio.num * peg.gear.teeth, res.ratio.den * other.gear.teeth), dir: -res.dir };
        const old = out.get(j);
        if (!old) { out.set(j, next); queue.push(j); }
        else if (old.jam || old.dir !== next.dir || !sameRatio(old.ratio, next.ratio)) { out.set(j, { jam: true }); queue.push(j); }
      });
    }
    return out;
  }
  function neighbors(index) {
    const p = state.pegs[index];
    return state.pegs.map((q, i) => ({ q, i })).filter(({ q, i }) => i !== index && Math.abs(q.x - p.x) + Math.abs(q.y - p.y) === 1).map(({ i }) => i);
  }

  function undo() {
    const s = state.history.pop();
    if (!s) { setMessage('<strong>No undo yet.</strong> Place or swap a gear first.'); return; }
    restore(s); sound('click'); setMessage('<strong>Undone.</strong> The last gear move returned to the tray shelf.');
  }
  function restart() { loadLevel(state.level); sound('click'); }
  function moveSelection(dx, dy) {
    if (state.selected.type === 'tray') {
      if (dy < 0 && state.pegs.length) state.selected = { type: 'peg', index: Math.min(state.pegs.length - 1, state.pegs.findIndex(p => p.y === Math.max(...state.pegs.map(q => q.y)))) };
      else state.selected.index = Math.max(0, Math.min(state.tray.length - 1, state.selected.index + dx));
      render(); return;
    }
    const cur = state.pegs[state.selected.index];
    let candidates = state.pegs.map((p, i) => ({ p, i })).filter(({ p }) => dx ? p.y === cur.y && Math.sign(p.x - cur.x) === Math.sign(dx) : p.x === cur.x && Math.sign(p.y - cur.y) === Math.sign(dy));
    candidates.sort((a,b) => dx ? Math.abs(a.p.x-cur.x)-Math.abs(b.p.x-cur.x) : Math.abs(a.p.y-cur.y)-Math.abs(b.p.y-cur.y));
    if (candidates[0]) state.selected = { type: 'peg', index: candidates[0].i };
    else if (dy > 0 && state.tray.length) state.selected = { type: 'tray', index: Math.min(state.tray.length - 1, Math.max(0, state.selected.index)) };
    render();
  }

  document.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if (['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','z','enter',' ','u','backspace','r'].includes(key)) event.preventDefault();
    if (key === 'arrowup' || key === 'w') moveSelection(0, -1);
    else if (key === 'arrowdown' || key === 's') moveSelection(0, 1);
    else if (key === 'arrowleft' || key === 'a') moveSelection(-1, 0);
    else if (key === 'arrowright' || key === 'd') moveSelection(1, 0);
    else if (key === 'z' || key === 'enter') activate();
    else if (key === ' ') test();
    else if (key === 'u' || key === 'backspace') undo();
    else if (key === 'r') restart();
  });
  el.testBtn.addEventListener('click', test); el.undoBtn.addEventListener('click', undo); el.restartBtn.addEventListener('click', restart);
  el.soundBtn.addEventListener('click', () => { state.muted = !state.muted; el.soundBtn.textContent = `Sound: ${state.muted ? 'off' : 'on'}`; });
  function finishLesson() { state.lessonDone = true; localStorage.setItem('gga.lessonDone', '1'); render(); }
  el.lessonNext.addEventListener('click', finishLesson); el.skipLesson.addEventListener('click', finishLesson);
  el.lessonToggle.addEventListener('click', () => { state.lessonDone = !state.lessonDone; if (state.lessonDone) localStorage.setItem('gga.lessonDone', '1'); else localStorage.removeItem('gga.lessonDone'); render(); });

  loadLevel(0);
})();
