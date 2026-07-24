(() => {
'use strict';
const canvas = document.getElementById('lobby');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const $ = id => document.getElementById(id);
const keys = new Set();
const pointer = { active: false, x: W / 2 };
let muted = false, audio, state;
const tags = [
  { key: 'aquarium', label: 'AQUA', icon: '🐟', color: '#55b8f0' },
  { key: 'laundry', label: 'SOCK', icon: '◧', color: '#ff6b5c' },
  { key: 'moon', label: 'MOON', icon: '☾', color: '#c08cff' },
  { key: 'tea', label: 'TEA', icon: '◒', color: '#58c982' },
  { key: 'hat', label: 'HAT', icon: '⌂', color: '#f2c24d' }
];
const statusLines = [
  'THE THIRD-FLOOR AQUARIUM ACCEPTS NO RESPONSIBILITY FOR HATS.',
  'A SUITCASE SIGNS THE GUESTBOOK IN CRAYON.',
  'THE SOCKS ARE ORGANIZING NEAR THE PALM TREE.',
  'HOUSEKEEPING REPORTS A BRIEFCASE WITH OPINIONS.',
  'THE ELEVATOR BELL HAS ENTERED ITS JAZZ PERIOD.',
  'A TRUNK REQUESTS A ROOM FACING AWAY FROM GRAVITY.'
];
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function rand(a, b) { return a + Math.random() * (b - a); }
function choice(a) { return a[Math.floor(Math.random() * a.length)]; }
function beep(type = 'ding') {
  if (muted) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
    o.connect(g); g.connect(audio.destination);
    o.type = type === 'thump' ? 'square' : type === 'wrong' ? 'sawtooth' : 'triangle';
    const f = { ding: 720, thump: 110, wrong: 92, dash: 250, tip: 920, lose: 70 }[type] || 400;
    o.frequency.setValueAtTime(f, t);
    if (type === 'ding') o.frequency.setValueAtTime(f * 1.45, t + .06);
    if (type === 'dash') o.frequency.exponentialRampToValueAtTime(520, t + .12);
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(type === 'wrong' || type === 'lose' ? .075 : .045, t + .015);
    g.gain.exponentialRampToValueAtTime(.0001, t + (type === 'wrong' ? .27 : .16));
    o.start(t); o.stop(t + .32);
  } catch {}
}
function restart() {
  state = {
    running: true, over: false, start: performance.now(), last: performance.now(), score: 0,
    best: state?.best || 0, combo: 1, lost: 0, spawn: .85, tipSpawn: 7.5, wave: 0,
    shake: 0, slow: 0, set: 0, setCd: 0, retag: 4.5,
    cart: { x: W / 2, y: H - 88, w: 138, h: 22, vx: 0, tilt: 0, dash: 0, dashCd: 0, dir: 1 },
    bags: [], particles: [], tips: [], message: 'NIGHT SHIFT OPEN. LUGGAGE IS ALREADY LYING.', messageTill: performance.now() + 2100,
    doors: makeDoors(0)
  };
  updateHud(); canvas.focus();
}
function makeDoors(set) {
  const xs = [146, 323, 500, 677, 854];
  const order = [0, 1, 2, 3, 4].map(i => (i + set) % tags.length);
  return xs.map((x, i) => ({ x, y: 48, w: 118, h: 88, tag: order[i], open: i < 3 || i === 4, flash: 0 }));
}
function rotateDoors(manual = true) {
  state.set = (state.set + 1) % tags.length;
  state.doors = makeDoors(state.set);
  state.setCd = manual ? .38 : 0;
  state.message = manual ? 'ELEVATOR ASSIGNMENTS ROTATED. MANAGEMENT CALLS THIS HELP.' : 'THE VIP FLOOR CHANGED ITS MIND.';
  state.messageTill = performance.now() + 1100;
  if (manual) beep('dash');
  updateHud();
}
function updateHud() {
  $('score').textContent = state.score;
  $('best').textContent = state.best;
  $('combo').textContent = 'x' + state.combo;
  $('lost').textContent = Array.from({ length: 3 }, (_, i) => i < state.lost ? '×' : '○').join(' ');
  $('dash').textContent = state.cart.dashCd > 0 ? state.cart.dashCd.toFixed(1) + 's' : 'ready';
  $('doors').innerHTML = state.doors.filter(d => d.open).slice(0, 4).map(d => `<span class="door-pill"><i class="dot" style="background:${tags[d.tag].color}"></i>${tags[d.tag].label}</span>`).join('');
}
function burst(x, y, color, n = 14, speed = 160) {
  for (let i = 0; i < n; i++) state.particles.push({ x, y, vx: rand(-speed, speed), vy: rand(-speed, 80), life: rand(.35, .8), max: .8, r: rand(2, 5), color });
}
function spawnBag() {
  if (state.bags.length > 7) return;
  const elapsed = (performance.now() - state.start) / 1000;
  let type = 'case';
  if (elapsed > 18 && Math.random() < .22) type = 'trunk';
  if (elapsed > 32 && Math.random() < .24) type = 'hatbox';
  if (elapsed > 46 && Math.random() < .19) type = 'fragile';
  if (elapsed > 58 && Math.random() < .11) type = 'vip';
  const tag = Math.floor(Math.random() * tags.length);
  const r = type === 'trunk' ? 24 : type === 'hatbox' ? 19 : type === 'fragile' ? 17 : type === 'vip' ? 18 : 20;
  state.bags.push({ x: rand(86, W - 86), y: 22, vx: rand(-42, 42), vy: rand(28, 52), r, tag, type, floorHits: 0, wobble: rand(0, 7), trail: [] });
  if (Math.random() < .45) beep('ding');
}
function spawnTip() {
  state.tips.push({ x: rand(120, W - 120), y: rand(205, H - 245), r: 14, life: 7, phase: rand(0, 6) });
}
function loseBag(bag, msg = 'LOST BAG. SOCK PRESSURE INCREASES.') {
  state.lost++; state.combo = 1; state.shake = .32; state.message = msg; state.messageTill = performance.now() + 1300;
  burst(bag.x, bag.y, '#f2f0dc', 26, 210); beep('lose');
  if (state.lost >= 3) { state.running = false; state.over = true; state.best = Math.max(state.best, state.score); state.message = 'SHIFT OVER. PRESS R TO RE-GLUE THE LOBBY.'; state.messageTill = Infinity; }
  updateHud();
}
function deliver(bag, door) {
  const gain = (bag.type === 'vip' ? 125 : bag.type === 'fragile' ? 55 : bag.type === 'trunk' ? 45 : 30) * state.combo;
  state.score += gain; state.combo = Math.min(12, state.combo + 1); door.flash = .24;
  state.message = gain > 100 ? `+${gain}. THE TIP ENVELOPE BLUSHES.` : choice(statusLines);
  state.messageTill = performance.now() + 1200;
  burst(bag.x, bag.y, tags[bag.tag].color, bag.type === 'vip' ? 34 : 20, 220); beep('ding'); updateHud();
}
function wrongDoor(bag, door) {
  door.flash = .42; state.combo = 1; state.shake = .22;
  bag.vx = (bag.x < W / 2 ? 1 : -1) * rand(170, 250);
  bag.vy = rand(95, 170); bag.y = door.y + door.h + bag.r + 4;
  state.message = 'WRONG FLOOR. THE DOORS RETURNED IT WITH A LOOK.';
  state.messageTill = performance.now() + 1000;
  burst(bag.x, bag.y, '#c7c1b6', 12, 130); beep('wrong'); updateHud();
}
function dash() {
  const c = state.cart;
  if (!state.running || c.dashCd > 0) return;
  c.dash = .16; c.dashCd = 3.2; c.vx = c.dir * 780; state.shake = .12;
  state.message = 'SIDEWAYS HOSPITALITY.'; state.messageTill = performance.now() + 650;
  burst(c.x, c.y, '#fff6d8', 18, 220); beep('dash'); updateHud();
}
function cartBounce(bag) {
  const c = state.cart;
  const cartTop = c.y - c.h / 2;
  if (bag.vy <= 0 || bag.y + bag.r < cartTop - 8 || bag.y + bag.r > cartTop + 22) return false;
  const half = c.w / 2;
  if (bag.x < c.x - half - bag.r || bag.x > c.x + half + bag.r) return false;
  const where = clamp((bag.x - c.x) / half, -1.15, 1.15);
  bag.y = cartTop - bag.r - 2;
  const lift = bag.type === 'trunk' ? 470 : bag.type === 'hatbox' ? 535 : 560;
  bag.vy = -lift - Math.abs(c.tilt) * 52;
  bag.vx = where * 260 + c.vx * .23 + c.tilt * 185;
  if (bag.type === 'hatbox') bag.vx += rand(-95, 95);
  bag.trail.length = 0;
  burst(bag.x, bag.y + bag.r, '#f7df99', 8, 105); beep('thump');
  return true;
}
function update(dt, now) {
  if (!state.running) return;
  const slow = state.slow > 0 ? .48 : 1;
  state.slow = Math.max(0, state.slow - dt); state.setCd = Math.max(0, state.setCd - dt);
  const c = state.cart;
  c.dash = Math.max(0, c.dash - dt); c.dashCd = Math.max(0, c.dashCd - dt);
  let move = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0);
  if (pointer.active) move += clamp((pointer.x - c.x) / 95, -1, 1);
  if (move) c.dir = Math.sign(move);
  const tiltTarget = (keys.has('arrowdown') || keys.has('s') ? 1 : 0) - (keys.has('arrowup') || keys.has('w') ? 1 : 0);
  c.tilt += (tiltTarget - c.tilt) * Math.min(1, dt * 8.5);
  c.vx += move * 900 * dt;
  c.vx *= c.dash ? .992 : Math.pow(.055, dt);
  c.x = clamp(c.x + c.vx * dt, c.w / 2 + 8, W - c.w / 2 - 8);
  state.spawn -= dt * slow;
  const elapsed = (now - state.start) / 1000;
  if (state.spawn <= 0) { spawnBag(); state.spawn = Math.max(.48, 1.72 - elapsed * .014) * rand(.74, 1.18); }
  state.tipSpawn -= dt;
  if (state.tipSpawn <= 0) { spawnTip(); state.tipSpawn = rand(10, 15); }
  state.retag -= dt;
  if (state.retag <= 0) {
    const vip = state.bags.some(b => b.type === 'vip');
    if (vip) rotateDoors(false);
    state.retag = vip ? 3.2 : 4.5;
  }
  for (const door of state.doors) door.flash = Math.max(0, door.flash - dt);
  for (let i = state.tips.length - 1; i >= 0; i--) {
    const t = state.tips[i]; t.life -= dt;
    if (t.life <= 0) { state.tips.splice(i, 1); continue; }
    if (Math.abs(t.x - c.x) < c.w / 2 + t.r && Math.abs(t.y - c.y) < 42) {
      state.tips.splice(i, 1); c.dashCd = 0; state.slow = 2; state.message = 'TIP CAUGHT. TIME IS NOW WEARING SLIPPERS.'; state.messageTill = now + 1200; burst(t.x, t.y, '#ffe890', 24, 180); beep('tip'); updateHud();
    }
  }
  for (let i = state.bags.length - 1; i >= 0; i--) {
    const b = state.bags[i];
    b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 10) b.trail.shift();
    const grav = b.type === 'trunk' ? 760 : b.type === 'hatbox' ? 655 : 690;
    b.vy += grav * dt * slow; b.x += b.vx * dt * slow; b.y += b.vy * dt * slow;
    if (b.type === 'hatbox') b.x += Math.sin(now / 145 + b.wobble) * 26 * dt;
    if (b.x < b.r + 9) { b.x = b.r + 9; b.vx = Math.abs(b.vx) * .82; }
    if (b.x > W - b.r - 9) { b.x = W - b.r - 9; b.vx = -Math.abs(b.vx) * .82; }
    if (b.y < b.r + 8) { b.y = b.r + 8; b.vy = Math.abs(b.vy) * .75; }
    cartBounce(b);
    for (const door of state.doors) {
      if (!door.open) continue;
      if (b.x + b.r > door.x - door.w / 2 && b.x - b.r < door.x + door.w / 2 && b.y - b.r < door.y + door.h && b.y + b.r > door.y) {
        if (b.tag === door.tag) { state.bags.splice(i, 1); deliver(b, door); }
        else wrongDoor(b, door);
        break;
      }
    }
    if (!state.bags.includes(b)) continue;
    if (b.y > H - 36 - b.r) {
      b.y = H - 36 - b.r; b.vy = -Math.abs(b.vy) * (b.type === 'trunk' ? .44 : .58); b.vx *= .82; b.floorHits++;
      if (b.type === 'fragile' || b.floorHits > 1) { state.bags.splice(i, 1); loseBag(b, b.type === 'fragile' ? 'FRAGILE BAG CRACKED. THE SOCKS APPLAUD.' : 'LOST BAG. LOBBY SOCK INDEX RISES.'); }
      else { state.combo = 1; state.message = 'FLOOR BOUNCE. ONE MORE AND IT BECOMES SOCKS.'; state.messageTill = now + 900; beep('wrong'); updateHud(); }
    }
  }
  for (let i = state.particles.length - 1; i >= 0; i--) { const p = state.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.life -= dt; if (p.life <= 0) state.particles.splice(i, 1); }
  state.shake = Math.max(0, state.shake - dt); updateHud();
}
function drawBag(b, now) {
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.sin(now / 250 + b.wobble) * (b.type === 'hatbox' ? .25 : .08));
  ctx.fillStyle = b.type === 'vip' ? '#ffe165' : b.type === 'fragile' ? '#bcecff' : b.type === 'trunk' ? '#89624b' : tags[b.tag].color;
  if (b.type === 'hatbox') { ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#211913'; ctx.lineWidth = 4; ctx.stroke(); }
  else { ctx.fillRect(-b.r * 1.15, -b.r * .78, b.r * 2.3, b.r * 1.56); ctx.strokeStyle = '#211913'; ctx.lineWidth = 4; ctx.strokeRect(-b.r * 1.15, -b.r * .78, b.r * 2.3, b.r * 1.56); }
  ctx.fillStyle = '#fffdf2'; ctx.fillRect(-15, -12, 30, 24); ctx.fillStyle = '#211913'; ctx.font = '900 13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(tags[b.tag].icon, 0, 1);
  if (b.type === 'fragile') { ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-23, -17); ctx.lineTo(21, 15); ctx.stroke(); }
  if (b.type === 'vip') { ctx.fillStyle = '#211913'; ctx.font = '900 10px system-ui'; ctx.fillText('VIP', 0, -25); }
  ctx.restore();
}
function draw(now) {
  ctx.clearRect(0, 0, W, H); const s = state.shake * 11; ctx.save(); ctx.translate(rand(-s, s), rand(-s, s));
  ctx.fillStyle = '#141923'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#2a1f25'; ctx.fillRect(0, 0, W, 154); ctx.fillStyle = '#20181d'; ctx.fillRect(0, H - 54, W, 54);
  for (let x = 0; x < W; x += 70) { ctx.fillStyle = x % 140 ? '#fff2' : '#0002'; ctx.fillRect(x, 154, 35, H - 208); }
  ctx.fillStyle = '#f4c56a'; ctx.font = '900 18px system-ui'; ctx.textAlign = 'center'; ctx.fillText('GRAND OVERNIGHT HOTEL', W / 2, 28);
  for (const d of state.doors) {
    const tag = tags[d.tag]; ctx.save(); ctx.translate(d.x, d.y); ctx.fillStyle = d.open ? '#303847' : '#191d27'; ctx.fillRect(-d.w / 2, 0, d.w, d.h); ctx.strokeStyle = d.flash ? '#fff' : tag.color; ctx.lineWidth = d.open ? 5 : 2; ctx.strokeRect(-d.w / 2, 0, d.w, d.h);
    ctx.fillStyle = d.open ? tag.color : '#6c6c75'; ctx.globalAlpha = d.open ? 1 : .45; ctx.fillRect(-d.w / 2 + 8, 8, d.w - 16, 24); ctx.globalAlpha = 1;
    ctx.fillStyle = '#fffdf2'; ctx.font = '900 15px system-ui'; ctx.fillText(d.open ? `${tag.icon} ${tag.label}` : 'CLOSED', 0, 26);
    ctx.fillStyle = '#0004'; ctx.fillRect(-2, 36, 4, d.h - 40); ctx.restore();
  }
  for (const t of state.tips) { ctx.save(); ctx.translate(t.x, t.y + Math.sin(now / 240 + t.phase) * 6); ctx.fillStyle = '#ffe890'; ctx.beginPath(); ctx.roundRect(-22, -13, 44, 26, 5); ctx.fill(); ctx.strokeStyle = '#5a3c14'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#5a3c14'; ctx.font = '900 12px system-ui'; ctx.fillText('TIP', 0, 5); ctx.restore(); }
  for (const b of state.bags) { ctx.strokeStyle = tags[b.tag].color + '77'; ctx.lineWidth = 3; ctx.beginPath(); b.trail.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); drawBag(b, now); }
  const c = state.cart; ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.tilt * .16); ctx.fillStyle = c.dash ? '#fff6d8' : '#b33f31'; ctx.beginPath(); ctx.roundRect(-c.w / 2, -c.h / 2, c.w, c.h, 10); ctx.fill(); ctx.strokeStyle = '#2a1611'; ctx.lineWidth = 4; ctx.stroke(); ctx.fillStyle = '#f7d38a'; ctx.fillRect(-c.w / 2 + 17, -31, 28, 18); ctx.fillStyle = '#2a1611'; ctx.beginPath(); ctx.arc(-c.w / 2 + 30, 20, 13, 0, Math.PI * 2); ctx.arc(c.w / 2 - 30, 20, 13, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  for (const p of state.particles) { ctx.globalAlpha = p.life / p.max; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1;
  if (state.messageTill > now) { ctx.fillStyle = '#080b12d9'; ctx.fillRect(W / 2 - 300, H - 128, 600, 44); ctx.fillStyle = '#fff8e7'; ctx.font = '900 14px system-ui'; ctx.textAlign = 'center'; ctx.fillText(state.message, W / 2, H - 101); }
  if (state.over) { ctx.fillStyle = '#080b12e8'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff8e7'; ctx.font = '900 55px system-ui'; ctx.fillText('LOBBY LOST', W / 2, H / 2 - 38); ctx.font = '800 22px system-ui'; ctx.fillText(`Final ${state.score} · Best ${state.best}`, W / 2, H / 2 + 6); ctx.font = '700 17px system-ui'; ctx.fillText('Press R or click Restart shift', W / 2, H / 2 + 44); }
  ctx.restore();
}
function frame(now) { const dt = Math.min(.033, (now - state.last) / 1000); state.last = now; update(dt, now); draw(now); requestAnimationFrame(frame); }
function point(e) { const r = canvas.getBoundingClientRect(); pointer.x = (e.clientX - r.left) * W / r.width; }
canvas.addEventListener('pointerdown', e => { pointer.active = true; point(e); canvas.focus(); });
canvas.addEventListener('pointermove', e => { if (pointer.active) point(e); });
window.addEventListener('pointerup', () => { pointer.active = false; });
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (['arrowup','arrowdown','arrowleft','arrowright',' ','w','a','s','d','z'].includes(k)) e.preventDefault();
  if (k === 'r') restart();
  if (k === ' ') dash();
  if (k === 'z' && state.setCd <= 0) rotateDoors(true);
  keys.add(k);
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
$('restart').addEventListener('click', restart);
$('mute').addEventListener('click', () => { muted = !muted; $('mute').textContent = muted ? 'Sound off' : 'Sound on'; });
restart(); requestAnimationFrame(frame);
})();
