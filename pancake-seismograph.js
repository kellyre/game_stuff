(() => {
'use strict';
const canvas = document.getElementById('griddle');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const $ = id => document.getElementById(id);
const keys = new Set();
const pointer = { active: false, x: W / 2 };
let muted = false, audio, state;
const tickets = [
  'TABLE 4 REQUESTED STRUCTURALLY CONFIDENT BREAKFAST.',
  'THE GRIDDLE HAS FILED A MINOR INCIDENT REPORT.',
  'A BLUEBERRY IS ACTING AS SHIFT SUPERVISOR.',
  'CUSTOMER ASKS IF THE TOWER IS LOAD-BEARING.',
  'SYRUP HAS ENTERED ITS ADHESIVE ERA.',
  'THE TOASTER FAN DENIES ALL GEOLOGICAL INVOLVEMENT.'
];
const kinds = {
  plain: { color: '#d99b52', edge: '#a56733', mass: 1, radius: 54, wobble: 1, points: 70 },
  blueberry: { color: '#c98f4d', edge: '#9b6034', mass: 1.16, radius: 55, wobble: 1.38, points: 95 },
  butter: { color: '#dba04d', edge: '#a26634', mass: 1.08, radius: 53, wobble: 1.2, points: 110 },
  syrup: { color: '#c78346', edge: '#854321', mass: 1.12, radius: 56, wobble: 1.5, points: 120 }
};
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function rand(a, b) { return a + Math.random() * (b - a); }
function choice(a) { return a[Math.floor(Math.random() * a.length)]; }
function beep(type = 'thump') {
  if (muted) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
    o.connect(g); g.connect(audio.destination);
    const f = { thump: 116, catch: 190, flip: 420, drop: 150, quake: 72, syrup: 88, lose: 48, streak: 690 }[type] || 220;
    o.type = type === 'quake' || type === 'lose' ? 'sawtooth' : type === 'streak' ? 'triangle' : 'square';
    o.frequency.setValueAtTime(f, t);
    if (type === 'flip') o.frequency.exponentialRampToValueAtTime(760, t + .12);
    if (type === 'streak') o.frequency.setValueAtTime(920, t + .06);
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(type === 'quake' ? .08 : .05, t + .015);
    g.gain.exponentialRampToValueAtTime(.0001, t + (type === 'quake' ? .34 : .18));
    o.start(t); o.stop(t + .38);
  } catch {}
}
function restart() {
  const best = state?.best || 0;
  state = {
    running: true, over: false, last: performance.now(), start: performance.now(), score: 0, best,
    plate: { x: W / 2, y: H - 92, vx: 0, w: 182, tilt: 0 },
    layers: [], falling: [], particles: [], splats: [], crumbs: [],
    lean: 0, leanVel: 0, mess: 0, fallTimer: 0, lostBurst: 0, streak: 0, slow: 0,
    flipCd: 0, flipAnim: 0, dropCd: 0, spawn: .65, quakeTimer: 9, quakeWarn: 0, quakePulse: 0,
    wind: 0, caption: 'ORDER UP. THE PLATE IS HEROIC AND UNDERPAID.', captionTill: performance.now() + 2200,
    safeSeconds: 0, runBonus: 0, needle: 0
  };
  addLayer({ kind: 'plain', xOffset: 0, stick: 0, fresh: 0 });
  updateHud(); canvas.focus();
}
function pancakeKind(elapsed) {
  if (elapsed > 42 && Math.random() < .18) return 'syrup';
  if (elapsed > 28 && Math.random() < .2) return 'butter';
  if (elapsed > 16 && Math.random() < .27) return 'blueberry';
  return 'plain';
}
function addLayer(opts = {}) {
  const k = opts.kind || 'plain';
  const def = kinds[k];
  state.layers.push({
    kind: k, xOffset: opts.xOffset || rand(-7, 7), mass: def.mass, radius: def.radius + rand(-4, 5),
    stick: opts.stick || (k === 'syrup' ? rand(.8, 1.45) : 0), wobble: rand(0, 7), fresh: opts.fresh || .28,
    slide: k === 'butter' ? rand(-1, 1) || 1 : 0
  });
}
function spawnPancake() {
  const elapsed = (performance.now() - state.start) / 1000;
  const kind = pancakeKind(elapsed);
  const r = kinds[kind].radius + rand(-5, 4);
  state.falling.push({ x: rand(105, W - 105), y: -40, vx: rand(-35, 35), vy: rand(78, 112) + elapsed * 1.1, r, kind, rot: rand(0, 6), spin: rand(-2.2, 2.2), shadow: 0 });
}
function burst(x, y, color, n = 16, speed = 160, sticky = false) {
  for (let i = 0; i < n; i++) state.particles.push({ x, y, vx: rand(-speed, speed), vy: rand(-speed * .9, speed * .35), life: rand(.35, .9), max: .9, r: sticky ? rand(3, 7) : rand(2, 5), color, sticky });
}
function message(text, ms = 1250) { state.caption = text; state.captionTill = performance.now() + ms; }
function topCenter() {
  const n = state.layers.length;
  if (!n) return state.plate.x;
  const top = state.layers[n - 1];
  return state.plate.x + state.lean * n * 15 + top.xOffset;
}
function renderedLayerX(i) {
  const l = state.layers[i];
  return state.plate.x + state.lean * (i + 1) * 15 + l.xOffset;
}
function centerOfMass() {
  if (!state.layers.length) return 0;
  let sum = 0, mass = 0;
  state.layers.forEach((l, i) => { const m = l.mass * (1 + i * .02); sum += (renderedLayerX(i) - state.plate.x) * m; mass += m; });
  return sum / mass;
}
function flip() {
  if (!state.running || state.flipCd > 0) return;
  const keep = Math.max(1, Math.ceil(state.layers.length * .55));
  for (let i = 0; i < keep; i++) state.layers[i].xOffset *= .38;
  state.lean *= .55; state.leanVel += (state.lean > 0 ? -1 : 1) * .9;
  const bonus = Math.min(260, state.layers.length * 20 + state.streak * 12);
  state.score += bonus; state.flipCd = 4.2; state.flipAnim = .35; state.mess = Math.max(0, state.mess - 6);
  burst(state.plate.x, state.plate.y - 35, '#f5d28a', 28, 250); burst(state.plate.x + rand(-60, 60), state.plate.y - 90, '#5969c9', 10, 210);
  message(`SPATULA FLIP +${bonus}. LOWER PANCAKES ATTEND THERAPY.`); beep('flip'); updateHud();
}
function dropTop() {
  if (!state.running || state.dropCd > 0 || state.layers.length <= 1) return;
  const l = state.layers.pop(); const x = topCenter(); const y = state.plate.y - 26 - state.layers.length * 18;
  state.crumbs.push({ x, y, vx: rand(-260, 260), vy: rand(-240, -120), r: l.radius, life: 1, kind: l.kind, rot: 0 });
  state.lean *= .72; state.leanVel *= .55; state.mess = Math.max(0, state.mess - (Math.abs(centerOfMass()) > state.plate.w * .35 ? 10 : 3));
  state.score += 45; state.dropCd = .65; state.streak = 0; message('SENSIBLE BREAKFAST BONUS. TOP PANCAKE RELEASED FROM DUTY.'); beep('drop'); updateHud();
}
function miss(f) {
  state.mess += 10; state.streak = 0; state.lostBurst += 1; state.shake = .2;
  burst(f.x, H - 42, '#c58a48', 18, 170); message('MISSED PANCAKE. THE RUSH METER TAKES NOTES.', 1000); beep('lose');
}
function catchPancake(f, edge) {
  const offset = clamp(f.x - state.plate.x - state.lean * (state.layers.length + 1) * 10, -50, 50);
  addLayer({ kind: f.kind, xOffset: offset * .42, stick: f.kind === 'syrup' ? 1.25 : 0, fresh: .35 });
  const clean = Math.abs(edge) < .22;
  state.streak = clean ? state.streak + 1 : 0;
  const tall = state.layers.length > 7 ? 1.6 : 1;
  const pts = Math.round(kinds[f.kind].points * (clean ? 1.3 : 1) * tall + state.layers.length * 9);
  state.score += pts; state.leanVel += edge * (f.kind === 'blueberry' ? 1.25 : .9); state.mess = Math.max(0, state.mess - (clean ? 2.4 : .4));
  burst(f.x, f.y, f.kind === 'blueberry' ? '#5969c9' : '#efc173', clean ? 20 : 13, clean ? 170 : 230, f.kind === 'syrup');
  if (state.streak > 0 && state.streak % 3 === 0) { state.slow = 2.2; state.score += 180; message('SHORT STACK STREAK. TIME PUTS ON SLIPPERS.', 1350); beep('streak'); }
  else message(clean ? `CLEAN CATCH +${pts}.` : `EDGE CATCH +${pts}. BRUNCH LEANS INTO DRAMA.`, 900);
  beep('catch'); updateHud();
}
function gameOver(reason) {
  state.running = false; state.over = true; state.best = Math.max(state.best, state.score);
  state.caption = reason; state.captionTill = Infinity; beep('lose'); updateHud();
}
function updateHud() {
  $('score').textContent = Math.floor(state.score);
  $('best').textContent = Math.floor(state.best);
  $('height').textContent = state.layers.length;
  $('streak').textContent = state.streak;
  $('flip').textContent = state.flipCd > 0 ? state.flipCd.toFixed(1) + 's' : 'ready';
  $('quake').textContent = state.quakeWarn > 0 ? 'warning' : state.quakePulse > 0 ? 'now' : Math.ceil(state.quakeTimer) + 's';
  $('messText').textContent = state.mess < 32 ? 'calm' : state.mess < 68 ? 'sticky' : 'bad';
  $('messBar').style.width = clamp(state.mess, 0, 100) + '%';
  const com = Math.abs(centerOfMass());
  $('lean').textContent = com < state.plate.w * .24 ? 'steady' : com < state.plate.w * .48 ? 'wobble' : 'danger';
}
function update(dt, now) {
  const slow = state.slow > 0 ? .48 : 1;
  state.slow = Math.max(0, state.slow - dt); state.flipCd = Math.max(0, state.flipCd - dt); state.dropCd = Math.max(0, state.dropCd - dt); state.flipAnim = Math.max(0, state.flipAnim - dt); state.lostBurst = Math.max(0, state.lostBurst - dt * .45);
  if (!state.running) return;
  const elapsed = (now - state.start) / 1000;
  let move = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0);
  if (pointer.active) move += clamp((pointer.x - state.plate.x) / 120, -1, 1);
  state.plate.vx += move * 1150 * dt; state.plate.vx *= Math.pow(.055, dt); state.plate.x = clamp(state.plate.x + state.plate.vx * dt, 95, W - 95);
  const tilt = (keys.has('e') || keys.has('arrowdown') ? 1 : 0) - (keys.has('q') || keys.has('arrowup') ? 1 : 0);
  state.plate.tilt += (tilt - state.plate.tilt) * Math.min(1, dt * 10);
  state.wind = Math.sin(now / 1800) * clamp((elapsed - 20) / 80, 0, .7);
  state.quakeTimer -= dt;
  if (state.quakeTimer <= 1.05 && state.quakeWarn <= 0 && state.quakePulse <= 0) { state.quakeWarn = 1.05; message('SEISMOGRAPH WARNING. BREAKFAST GEOLOGY INCOMING.', 1050); }
  if (state.quakeWarn > 0) { state.quakeWarn -= dt; if (state.quakeWarn <= 0) { state.quakePulse = .72; state.quakeTimer = rand(8.5, Math.max(5.2, 13 - elapsed * .04)); state.shake = .46; state.leanVel += rand(-1.8, 1.8); state.plate.vx += rand(-190, 190); beep('quake'); } }
  if (state.quakePulse > 0) state.quakePulse -= dt;
  const comBefore = centerOfMass();
  const desired = state.plate.tilt * 1.35 + state.plate.vx * .0019 + state.wind + (state.quakePulse > 0 ? Math.sin(now / 45) * 1.55 : 0) + comBefore * .0035;
  const height = Math.max(1, state.layers.length);
  const stiffness = 3.8 / (1 + height * .055), damping = Math.pow(clamp(.07 + height * .018, .1, .72), dt);
  state.leanVel += (desired - state.lean) * stiffness * dt; state.leanVel *= damping; state.lean += state.leanVel * dt;
  state.layers.forEach((l, i) => { l.fresh = Math.max(0, l.fresh - dt); if (l.stick > 0) l.stick -= dt; if (l.slide) { l.xOffset += l.slide * dt * (9 + i * 1.5) * (l.stick > 0 ? .15 : 1); if (Math.abs(l.xOffset) > 46) l.slide *= -1; } });
  state.spawn -= dt * slow;
  if (state.spawn <= 0) { spawnPancake(); state.spawn = Math.max(.62, 1.95 - elapsed * .013 - state.layers.length * .025) * rand(.82, 1.17); }
  for (let i = state.falling.length - 1; i >= 0; i--) {
    const f = state.falling[i]; f.vy += 245 * dt * slow; f.x += f.vx * dt * slow; f.y += f.vy * dt * slow; f.rot += f.spin * dt; f.shadow = clamp((f.y + 40) / H, 0, 1);
    if (f.x < f.r || f.x > W - f.r) f.vx *= -1;
    const targetY = state.plate.y - 34 - state.layers.length * 17;
    if (f.vy > 0 && f.y + f.r * .28 >= targetY && f.y < targetY + 36) {
      const dx = f.x - topCenter(); const tolerance = Math.max(42, 75 - state.layers.length * 1.8);
      if (Math.abs(dx) < tolerance) { state.falling.splice(i, 1); catchPancake(f, dx / tolerance); continue; }
    }
    if (f.y > H + 55) { state.falling.splice(i, 1); miss(f); }
  }
  const com = centerOfMass();
  const danger = Math.abs(com) - state.plate.w * .46;
  if (danger > 0) { state.fallTimer += dt; state.mess += dt * (7 + danger * .035); }
  else state.fallTimer = Math.max(0, state.fallTimer - dt * 1.8);
  if (state.layers.length > 7 && danger < -10) { state.safeSeconds += dt; state.score += dt * state.layers.length * 4.2; }
  state.score += dt * (1 + state.layers.length * 1.8);
  state.mess += dt * Math.max(0, state.layers.length - 9) * .28;
  if (state.fallTimer > .82) gameOver('STACK COLLAPSE. PRESS R TO RE-PLATE THE GEOLOGY.');
  if (state.mess >= 100 || state.lostBurst >= 3) gameOver('MESS METER FULL. THE DINER DECLARES A MAPLE EMERGENCY.');
  for (let i = state.particles.length - 1; i >= 0; i--) { const p = state.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.sticky ? 140 : 320) * dt; p.life -= dt; if (p.life <= 0) state.particles.splice(i, 1); }
  for (let i = state.crumbs.length - 1; i >= 0; i--) { const c = state.crumbs[i]; c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 540 * dt; c.rot += dt * 5; c.life -= dt; if (c.life <= 0) state.crumbs.splice(i, 1); }
  state.shake = Math.max(0, (state.shake || 0) - dt); updateHud();
}
function ellipse(x, y, rx, ry, color, edge) { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = edge; ctx.lineWidth = 4; ctx.stroke(); }
function drawPancake(x, y, r, kind, wobble = 0, alpha = 1) {
  const def = kinds[kind]; ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(wobble * .04);
  ellipse(0, 0, r, r * .26, def.color, def.edge);
  ctx.fillStyle = '#fff3'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(rand(-r * .55, r * .55), rand(-r * .12, r * .08), rand(4, 10), rand(1.5, 4), 0, 0, Math.PI * 2); ctx.fill(); }
  if (kind === 'blueberry') { ctx.fillStyle = '#3e55ad'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(Math.sin(i * 2.1 + wobble) * r * .45, Math.cos(i * 1.7) * r * .12, 5, 0, Math.PI * 2); ctx.fill(); } }
  if (kind === 'butter') { ctx.fillStyle = '#ffd95c'; ctx.fillRect(-13, -11, 26, 14); ctx.strokeStyle = '#8a5a16'; ctx.strokeRect(-13, -11, 26, 14); }
  if (kind === 'syrup') { ctx.fillStyle = '#7d2e17cc'; ctx.beginPath(); ctx.ellipse(8, 0, r * .45, r * .14, .1, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(22, 1, 9, 19); }
  ctx.restore();
}
function draw(now) {
  ctx.clearRect(0, 0, W, H); const s = (state.shake || 0) * 14 + (state.quakePulse > 0 ? 8 : 0); ctx.save(); ctx.translate(rand(-s, s), rand(-s, s));
  ctx.fillStyle = '#2b1a12'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#483125'; ctx.fillRect(0, H - 116, W, 116);
  for (let x = -20; x < W; x += 82) { ctx.fillStyle = x % 164 ? '#ffffff0d' : '#00000012'; ctx.fillRect(x, H - 116, 42, 116); }
  ctx.fillStyle = '#1b2b2d'; ctx.fillRect(24, 34, 120, H - 176); ctx.strokeStyle = '#6acbc0'; ctx.lineWidth = 2; ctx.strokeRect(24, 34, 120, H - 176);
  ctx.fillStyle = '#9af0e6'; ctx.font = '900 14px ui-monospace,monospace'; ctx.textAlign = 'center'; ctx.fillText('SEISMO', 84, 58);
  ctx.strokeStyle = '#9af0e6'; ctx.lineWidth = 3; ctx.beginPath(); for (let y = 78; y < H - 158; y += 8) { const amp = state.quakeWarn > 0 ? 30 : state.quakePulse > 0 ? 43 : 10; const x = 84 + Math.sin(y * .08 + now / 90) * amp * (state.quakeWarn > 0 ? (1 + Math.sin(now / 70)) : 1); y === 78 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
  ctx.fillStyle = '#120f0d88'; ctx.fillRect(170, 34, W - 194, 38); ctx.fillStyle = '#f7df9e'; ctx.font = '900 15px system-ui'; ctx.textAlign = 'left'; ctx.fillText(state.captionTill > now ? state.caption : choice(tickets), 188, 59);
  ctx.fillStyle = '#3b2620'; ctx.fillRect(W - 142, 130, 92, 92); ctx.fillStyle = '#d95835'; ctx.fillRect(W - 136, 142, 80, 18); ctx.fillStyle = '#f4c175'; ctx.font = '900 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText('TOAST', W - 96, 157); ctx.strokeStyle = '#f6dba0'; ctx.beginPath(); ctx.arc(W - 96, 207, 42, Math.PI * 1.13, Math.PI * 1.87); ctx.stroke();
  for (const f of state.falling) { ctx.fillStyle = '#0005'; ctx.beginPath(); ctx.ellipse(f.x, state.plate.y + 10, f.r * f.shadow, f.r * .12 * f.shadow, 0, 0, Math.PI * 2); ctx.fill(); drawPancake(f.x, f.y, f.r, f.kind, f.rot); }
  const p = state.plate; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.tilt * .08 + Math.sin(state.flipAnim * 18) * state.flipAnim * .22); ctx.fillStyle = '#d9dde5'; ctx.beginPath(); ctx.ellipse(0, 0, p.w / 2, 28, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#8a8e99'; ctx.lineWidth = 5; ctx.stroke(); ctx.fillStyle = '#9da4b2'; ctx.fillRect(-p.w / 2 - 34, 14, p.w + 68, 13); ctx.restore();
  for (let i = 0; i < state.layers.length; i++) { const l = state.layers[i]; const x = renderedLayerX(i); const y = p.y - 42 - i * 17 - Math.sin(state.flipAnim * Math.PI) * 26 * (1 - i / Math.max(1, state.layers.length)); drawPancake(x, y, l.radius, l.kind, Math.sin(now / 210 + l.wobble) * (1 + i * .12), 1); if (l.fresh > 0) { ctx.strokeStyle = '#fff8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, l.radius + l.fresh * 18, l.radius * .27 + l.fresh * 7, 0, 0, Math.PI * 2); ctx.stroke(); } }
  const com = centerOfMass(); ctx.strokeStyle = Math.abs(com) > p.w * .46 ? '#ff624c' : '#f7df9e88'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x + com, p.y - 22); ctx.lineTo(p.x + com, p.y - 245); ctx.stroke();
  for (const c of state.crumbs) drawPancake(c.x, c.y, c.r, c.kind, c.rot, Math.max(0, c.life));
  for (const q of state.particles) { ctx.globalAlpha = Math.max(0, q.life / q.max); ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1;
  if (state.over) { ctx.fillStyle = '#100b09ea'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff1d8'; ctx.font = '950 48px system-ui'; ctx.textAlign = 'center'; ctx.fillText('BREAKFAST GEOLOGY FAILED', W / 2, H / 2 - 48); ctx.font = '850 22px system-ui'; ctx.fillText(`Final ${Math.floor(state.score)} · Height ${state.layers.length} · Best ${Math.floor(state.best)}`, W / 2, H / 2 - 4); ctx.font = '750 17px system-ui'; ctx.fillText('Press R or click Restart breakfast', W / 2, H / 2 + 38); }
  ctx.restore();
}
function frame(now) { const dt = Math.min(.033, (now - state.last) / 1000); state.last = now; update(dt, now); draw(now); requestAnimationFrame(frame); }
function point(e) { const r = canvas.getBoundingClientRect(); pointer.x = (e.clientX - r.left) * W / r.width; }
canvas.addEventListener('pointerdown', e => { pointer.active = true; point(e); canvas.focus(); });
canvas.addEventListener('pointermove', e => { if (pointer.active) point(e); });
window.addEventListener('pointerup', () => { pointer.active = false; });
window.addEventListener('keydown', e => { const k = e.key.toLowerCase(); if (['arrowup','arrowdown','arrowleft','arrowright',' ','q','e','a','d','z'].includes(k)) e.preventDefault(); if (k === 'r') restart(); if (k === ' ') flip(); if (k === 'z') dropTop(); keys.add(k); });
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
$('restart').addEventListener('click', restart);
$('touchFlip').addEventListener('click', flip);
$('touchDrop').addEventListener('click', dropTop);
$('mute').addEventListener('click', () => { muted = !muted; $('mute').textContent = muted ? 'Sound off' : 'Sound on'; });
restart(); requestAnimationFrame(frame);
})();
