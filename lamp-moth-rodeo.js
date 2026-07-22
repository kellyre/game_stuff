(() => {
'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;
const TAU = Math.PI * 2;
const $ = id => document.getElementById(id);
const keys = new Set();
const touchKeys = new Set();
const pointer = { active: false, x: W / 2, y: H / 2 };
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let state;
let best = 0;
let muted = false;
let audio;
let lastHud = 0;

const lamps = [
  { x: 170, y: 180, core: 28, outer: 118, active: false, stolen: 0, quota: 280, phase: 0 },
  { x: 690, y: 150, core: 31, outer: 126, active: false, stolen: 0, quota: 310, phase: 1.7 },
  { x: 820, y: 520, core: 33, outer: 132, active: false, stolen: 0, quota: 340, phase: 3.1 },
  { x: 270, y: 560, core: 29, outer: 120, active: false, stolen: 0, quota: 300, phase: 4.5 }
];
const webLines = [
  { ax: 70, ay: 310, bx: 315, by: 360 },
  { ax: 590, ay: 320, bx: 920, by: 258 },
  { ax: 560, ay: 635, bx: 885, by: 680 }
];

function rand(a, b) { return a + Math.random() * (b - a); }
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function pointLineDistance(px, py, l) {
  const vx = l.bx - l.ax;
  const vy = l.by - l.ay;
  const wx = px - l.ax;
  const wy = py - l.ay;
  const c = clamp((wx * vx + wy * vy) / (vx * vx + vy * vy), 0, 1);
  const x = l.ax + vx * c;
  const y = l.ay + vy * c;
  return Math.hypot(px - x, py - y);
}

function initAudio() {
  if (muted || audio) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  audio = new AudioContext();
}
function blip(type = 'glow') {
  if (muted) return;
  initAudio();
  if (!audio) return;
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = type === 'buzz' ? 280 : type === 'dash' ? 760 : 1200;
  osc.type = type === 'buzz' ? 'sawtooth' : 'triangle';
  osc.frequency.setValueAtTime(type === 'dash' ? 180 : type === 'pollen' ? 620 : type === 'hit' ? 96 : 330, now);
  osc.frequency.exponentialRampToValueAtTime(type === 'dash' ? 520 : type === 'hit' ? 42 : 420, now + .12);
  gain.gain.setValueAtTime(type === 'buzz' ? .045 : .065, now);
  gain.gain.exponentialRampToValueAtTime(.001, now + (type === 'buzz' ? .24 : .16));
  osc.connect(filter).connect(gain).connect(audio.destination);
  osc.start(now);
  osc.stop(now + .26);
}

function resetLamps() {
  lamps.forEach((lamp, index) => {
    lamp.active = index < 2;
    lamp.stolen = 0;
    lamp.quota = 270 + index * 32;
    lamp.phase = rand(0, TAU);
  });
}
function restart() {
  resetLamps();
  state = {
    running: true,
    over: false,
    start: performance.now(),
    last: performance.now(),
    score: 0,
    combo: 1,
    comboTimer: 0,
    message: 'CIRCLE A LAMP. RESPECT NEITHER HEAT NOR COMMON SENSE.',
    messageTill: performance.now() + 2300,
    shake: 0,
    warningBuzz: 0,
    moth: { x: W / 2, y: H - 120, vx: 0, vy: 0, angle: -Math.PI / 2, r: 13, heat: 0, heatGrace: 0, dash: 0, dashCooldown: 0 },
    particles: [],
    spiders: [],
    swatters: [],
    pollen: null,
    nextSpider: 12,
    nextSwatter: 19,
    nextPollen: 8
  };
  canvas.focus();
  updateHud(true);
}
function endRun(reason) {
  if (!state.running) return;
  state.running = false;
  state.over = true;
  state.message = reason;
  state.messageTill = Infinity;
  best = Math.max(best, Math.floor(state.score));
  state.shake = .45;
  blip('hit');
  updateHud(true);
}
function burst(x, y, color, count = 16, power = 140) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, TAU);
    const speed = rand(power * .25, power);
    state.particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: rand(.25, .8), max: .8, r: rand(1.4, 4.4), color });
  }
}
function setMessage(text, ms = 1100) {
  state.message = text;
  state.messageTill = performance.now() + ms;
}
function activeLampCount() { return lamps.filter(lamp => lamp.active).length; }
function activateLamp() {
  const inactive = lamps.filter(lamp => !lamp.active).sort((a, b) => distance(b, state.moth) - distance(a, state.moth));
  if (!inactive.length) return;
  const lamp = inactive[0];
  lamp.active = true;
  lamp.stolen = 0;
  lamp.quota = Math.max(160, 310 - elapsed() * 1.2);
  burst(lamp.x, lamp.y, '#ffd15a', 24, 190);
}
function flickerLamp(lamp) {
  lamp.active = false;
  lamp.stolen = 0;
  setMessage('LAMP MILKED. THE PORCH BOARD IS FURIOUS.', 1300);
  burst(lamp.x, lamp.y, '#fff1a0', 32, 210);
  if (activeLampCount() < (elapsed() > 42 ? 2 : 1)) activateLamp();
  activateLamp();
}
function elapsed() { return (performance.now() - state.start) / 1000; }

function steerVector() {
  const has = key => keys.has(key) || touchKeys.has(key);
  let dx = (has('arrowright') || has('d') ? 1 : 0) - (has('arrowleft') || has('a') ? 1 : 0);
  let dy = (has('arrowdown') || has('s') ? 1 : 0) - (has('arrowup') || has('w') ? 1 : 0);
  if (pointer.active) {
    const toX = pointer.x - state.moth.x;
    const toY = pointer.y - state.moth.y;
    const len = Math.hypot(toX, toY) || 1;
    if (len > 24) {
      dx += toX / len * .55;
      dy += toY / len * .55;
    }
  }
  const mag = Math.hypot(dx, dy);
  return mag ? { x: dx / mag, y: dy / mag } : { x: 0, y: 0 };
}
function brakeHeld() { return keys.has('shift') || keys.has('z') || touchKeys.has('brake'); }
function dash() {
  const moth = state.moth;
  if (!state.running || moth.dashCooldown > 0) return;
  const speed = Math.hypot(moth.vx, moth.vy);
  let dx = speed > 20 ? moth.vx / speed : Math.cos(moth.angle);
  let dy = speed > 20 ? moth.vy / speed : Math.sin(moth.angle);
  const steer = steerVector();
  if (Math.hypot(steer.x, steer.y) > .1) { dx = steer.x; dy = steer.y; }
  moth.vx += dx * 440;
  moth.vy += dy * 440;
  moth.dash = .18;
  moth.dashCooldown = 2.6;
  moth.heat = Math.max(0, moth.heat - .08);
  state.shake = .12;
  burst(moth.x, moth.y, '#c7efff', 26, 230);
  setMessage('WINGBEAT DASH. ABSOLUTELY LEGAL.', 760);
  blip('dash');
}

function spawnSpider() {
  const active = lamps.filter(lamp => lamp.active);
  const target = active[Math.floor(Math.random() * active.length)] || lamps[Math.floor(Math.random() * lamps.length)];
  state.spiders.push({ x: target.x + rand(-70, 70), top: -20, y: -20, targetY: target.y + rand(-20, 70), speed: rand(34, 56) + elapsed() * 1.4, r: 17, sway: rand(0, TAU) });
}
function spawnSwatter() {
  const horizontal = Math.random() < .55;
  const dir = Math.random() < .5 ? -1 : 1;
  state.swatters.push({
    horizontal,
    dir,
    telegraph: .72,
    x: horizontal ? (dir > 0 ? -150 : W + 150) : rand(110, W - 110),
    y: horizontal ? rand(135, H - 120) : (dir > 0 ? -150 : H + 150),
    width: rand(84, 128),
    speed: rand(620, 760) + elapsed() * 6,
    life: 2.2
  });
}
function spawnPollen() {
  const lamp = lamps[Math.floor(Math.random() * lamps.length)];
  let x = rand(70, W - 70);
  let y = rand(110, H - 80);
  for (let i = 0; i < 12 && Math.hypot(x - lamp.x, y - lamp.y) < lamp.outer + 40; i++) {
    x = rand(70, W - 70);
    y = rand(110, H - 80);
  }
  state.pollen = { x, y, r: 13, phase: rand(0, TAU), life: 8.5 };
}

function scoreGlow(dt, now) {
  const moth = state.moth;
  let scoring = false;
  for (const lamp of lamps) {
    if (!lamp.active) continue;
    const d = Math.hypot(moth.x - lamp.x, moth.y - lamp.y);
    const pulse = 1 + Math.sin(now / 290 + lamp.phase) * .045;
    const core = lamp.core * pulse;
    const outer = lamp.outer * (1 + Math.sin(now / 460 + lamp.phase) * .035);
    if (d < core + moth.r * .55) {
      endRun('YOU HUGGED THE BULB. LEGENDARY, BRIEF.');
      return;
    }
    if (d < outer && d > core) {
      const danger = clamp(1 - (d - core) / (outer - core), 0, 1);
      const rate = 22 + danger * 88;
      state.score += rate * state.combo * dt;
      lamp.stolen += rate * dt;
      moth.heat += (.105 + danger * .42) * dt;
      state.comboTimer = 1.15;
      state.combo = clamp(state.combo + (.12 + danger * .28) * dt, 1, 9.9);
      scoring = true;
      if (!prefersReduced && Math.random() < .42) burst(moth.x, moth.y, danger > .7 ? '#fff1a0' : '#ffbd44', 1, 55 + danger * 85);
      if (lamp.stolen > lamp.quota) flickerLamp(lamp);
    }
  }
  if (!scoring) {
    moth.heat -= (brakeHeld() ? .22 : .15) * dt;
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = lerp(state.combo, 1, .035);
  } else if (now - state.warningBuzz > 260 && moth.heat > .72) {
    state.warningBuzz = now;
    blip('buzz');
  } else if (now - state.warningBuzz > 500 && Math.random() < .08) {
    state.warningBuzz = now;
    blip('glow');
  }
  moth.heat = clamp(moth.heat, 0, 1.25);
  if (moth.heat >= 1) {
    moth.heatGrace += dt;
    setMessage('TOO HOT. DASH OR BAIL.', 420);
    if (moth.heatGrace > .35) endRun('OVERHEATED. SOMEONE SWEEP THE PORCH.');
  } else {
    moth.heatGrace = 0;
  }
}
function collideHazards() {
  const moth = state.moth;
  for (const line of webLines) {
    if (pointLineDistance(moth.x, moth.y, line) < moth.r + 4) {
      endRun('WEB STRAND. NATURE FILED AN INJUNCTION.');
      return;
    }
  }
  for (const spider of state.spiders) {
    if (Math.hypot(moth.x - spider.x, moth.y - spider.y) < moth.r + spider.r) {
      endRun('SPIDER CONTACT. NO REFUND ON GLOW.');
      return;
    }
  }
  for (const swat of state.swatters) {
    if (swat.telegraph > 0) continue;
    if (swat.horizontal && Math.abs(moth.y - swat.y) < swat.width * .35 && Math.abs(moth.x - swat.x) < 78) endRun('SWATTER SHADOW. PORCH JUSTICE WAS SWIFT.');
    if (!swat.horizontal && Math.abs(moth.x - swat.x) < swat.width * .35 && Math.abs(moth.y - swat.y) < 78) endRun('SWATTER SHADOW. THE CROWD GOES QUIET.');
  }
}

function update(dt, now) {
  if (!state.running) return;
  const moth = state.moth;
  const steer = steerVector();
  const braking = brakeHeld();
  const accel = braking ? 390 : 560;
  moth.vx += steer.x * accel * dt;
  moth.vy += steer.y * accel * dt;
  const friction = Math.pow(braking ? .045 : .16, dt);
  moth.vx *= friction;
  moth.vy *= friction;
  const max = braking ? 255 : 360;
  const speed = Math.hypot(moth.vx, moth.vy);
  if (speed > max) {
    moth.vx = moth.vx / speed * max;
    moth.vy = moth.vy / speed * max;
  }
  moth.x = clamp(moth.x + moth.vx * dt, 28, W - 28);
  moth.y = clamp(moth.y + moth.vy * dt, 52, H - 28);
  if (Math.hypot(moth.vx, moth.vy) > 12) moth.angle = Math.atan2(moth.vy, moth.vx);
  moth.dash = Math.max(0, moth.dash - dt);
  moth.dashCooldown = Math.max(0, moth.dashCooldown - dt);

  scoreGlow(dt, now);
  state.nextSpider -= dt;
  if (state.nextSpider <= 0) {
    spawnSpider();
    state.nextSpider = Math.max(2.8, 8.4 - elapsed() * .11 - state.score / 1700);
  }
  state.nextSwatter -= dt;
  if (state.nextSwatter <= 0) {
    spawnSwatter();
    state.nextSwatter = Math.max(3.8, 13.5 - elapsed() * .16 - state.score / 1200);
  }
  state.nextPollen -= dt;
  if (!state.pollen && state.nextPollen <= 0) spawnPollen();

  for (let i = state.spiders.length - 1; i >= 0; i--) {
    const s = state.spiders[i];
    s.y += s.speed * dt;
    s.x += Math.sin(now / 360 + s.sway) * 18 * dt;
    if (s.y > s.targetY) s.y = s.targetY + Math.sin(now / 500 + s.sway) * 12;
    if (s.y > H + 60) state.spiders.splice(i, 1);
  }
  for (let i = state.swatters.length - 1; i >= 0; i--) {
    const sw = state.swatters[i];
    sw.life -= dt;
    sw.telegraph -= dt;
    if (sw.telegraph <= 0) {
      if (sw.horizontal) sw.x += sw.dir * sw.speed * dt;
      else sw.y += sw.dir * sw.speed * dt;
    }
    if (sw.life <= 0 || sw.x < -240 || sw.x > W + 240 || sw.y < -240 || sw.y > H + 240) state.swatters.splice(i, 1);
  }
  if (state.pollen) {
    state.pollen.life -= dt;
    if (Math.hypot(moth.x - state.pollen.x, moth.y - state.pollen.y) < moth.r + state.pollen.r) {
      moth.heat = Math.max(0, moth.heat - .58);
      moth.dashCooldown = 0;
      state.score += 45;
      burst(state.pollen.x, state.pollen.y, '#8de3ff', 26, 180);
      state.pollen = null;
      state.nextPollen = rand(10, 15);
      setMessage('MOON POLLEN. COOL AS A TINY ACCOUNTANT.', 1250);
      blip('pollen');
    } else if (state.pollen.life <= 0) {
      state.pollen = null;
      state.nextPollen = rand(5, 9);
    }
  }
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(.08, dt);
    p.vy *= Math.pow(.08, dt);
    p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
  state.shake = Math.max(0, state.shake - dt);
  collideHazards();
}

function drawPorch(now) {
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, dark ? '#14121c' : '#223045');
  g.addColorStop(.55, dark ? '#1b1717' : '#59412d');
  g.addColorStop(1, dark ? '#151012' : '#332217');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = dark ? 'rgba(255,226,171,.08)' : 'rgba(255,255,255,.15)';
  ctx.lineWidth = 2;
  for (let y = 88; y < H; y += 72) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y + Math.sin(y) * 8); ctx.stroke();
  }
  ctx.fillStyle = dark ? 'rgba(134,197,150,.16)' : 'rgba(53,103,77,.2)';
  for (let i = 0; i < 16; i++) {
    const x = (i * 73 + 35) % W;
    const y = H - 35 - (i % 5) * 13;
    ctx.beginPath(); ctx.ellipse(x, y, 23, 6, Math.sin(i) * .5, 0, TAU); ctx.fill();
  }
  ctx.strokeStyle = dark ? 'rgba(127,216,255,.13)' : 'rgba(255,255,255,.2)';
  ctx.lineWidth = 1.3;
  for (let i = 0; i < 8; i++) {
    const y = 105 + i * 68 + Math.sin(now / 900 + i) * 6;
    ctx.beginPath(); ctx.moveTo((now / 22 + i * 97) % (W + 160) - 80, y); ctx.lineTo((now / 22 + i * 97) % (W + 160) + 65, y - 9); ctx.stroke();
  }
}
function drawLamp(lamp, now) {
  const pulse = 1 + Math.sin(now / 290 + lamp.phase) * .045;
  const outer = lamp.outer * (1 + Math.sin(now / 460 + lamp.phase) * .035);
  ctx.save();
  if (lamp.active) {
    const glow = ctx.createRadialGradient(lamp.x, lamp.y, lamp.core, lamp.x, lamp.y, outer);
    glow.addColorStop(0, 'rgba(255, 105, 55, .46)');
    glow.addColorStop(.48, 'rgba(255, 189, 68, .25)');
    glow.addColorStop(1, 'rgba(255, 209, 90, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(lamp.x, lamp.y, outer, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255, 241, 160, .7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 9]);
    ctx.beginPath(); ctx.arc(lamp.x, lamp.y, outer * .72, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.strokeStyle = 'rgba(30,20,12,.7)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(lamp.x, 0); ctx.lineTo(lamp.x, lamp.y - 38); ctx.stroke();
  ctx.fillStyle = lamp.active ? '#fff0a8' : '#5b554d';
  ctx.beginPath(); ctx.ellipse(lamp.x, lamp.y, lamp.core * pulse, lamp.core * 1.18 * pulse, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = lamp.active ? '#ff8e48' : '#292725'; ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = lamp.active ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.1)';
  ctx.beginPath(); ctx.ellipse(lamp.x - 8, lamp.y - 10, 7, 15, -.4, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawWebs() {
  for (const l of webLines) {
    ctx.strokeStyle = 'rgba(225, 239, 255, .58)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(l.ax, l.ay); ctx.lineTo(l.bx, l.by); ctx.stroke();
    ctx.strokeStyle = 'rgba(225, 239, 255, .22)'; ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const t = i / 5;
      const x = lerp(l.ax, l.bx, t);
      const y = lerp(l.ay, l.by, t);
      ctx.beginPath(); ctx.arc(x, y, 20 + i * 5, 0, TAU); ctx.stroke();
    }
  }
}
function drawSpider(s, now) {
  ctx.save(); ctx.translate(s.x, s.y);
  ctx.strokeStyle = 'rgba(225,239,255,.55)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, -120); ctx.lineTo(0, -3); ctx.stroke();
  ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
  for (let i = -1; i <= 1; i += 2) {
    for (let j = 0; j < 4; j++) {
      const a = i * (.65 + j * .22 + Math.sin(now / 170 + j) * .06);
      ctx.beginPath(); ctx.moveTo(i * 6, 2); ctx.lineTo(Math.cos(a) * 24, 9 + Math.sin(a) * 14); ctx.stroke();
    }
  }
  ctx.fillStyle = '#121212'; ctx.beginPath(); ctx.arc(0, 4, s.r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffd15a'; ctx.beginPath(); ctx.arc(-5, 0, 2, 0, TAU); ctx.arc(5, 0, 2, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawSwatter(sw) {
  ctx.save();
  if (sw.horizontal) ctx.translate(sw.x, sw.y); else { ctx.translate(sw.x, sw.y); ctx.rotate(Math.PI / 2); }
  const tele = clamp(sw.telegraph / .72, 0, 1);
  ctx.globalAlpha = sw.telegraph > 0 ? .12 + (1 - tele) * .26 : .58;
  ctx.fillStyle = sw.telegraph > 0 ? '#ff765b' : '#1c0d0a';
  ctx.fillRect(-86, -sw.width / 2, 172, sw.width);
  ctx.globalAlpha = sw.telegraph > 0 ? .38 : .9;
  ctx.strokeStyle = sw.telegraph > 0 ? '#ff765b' : '#ffb29e'; ctx.lineWidth = 4;
  ctx.strokeRect(-78, -sw.width / 2 + 8, 156, sw.width - 16);
  ctx.beginPath(); ctx.moveTo(78, 0); ctx.lineTo(170, 0); ctx.stroke();
  ctx.restore();
}
function drawMoth(now) {
  const m = state.moth;
  ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.angle);
  if (m.heat > .85 && Math.floor(now / 80) % 2) ctx.globalAlpha = .65;
  ctx.fillStyle = m.dash > 0 ? '#e6f8ff' : '#e8d0a7';
  ctx.strokeStyle = '#2c1e15'; ctx.lineWidth = 2;
  const flap = Math.sin(now / (prefersReduced ? 300 : 72)) * .45;
  ctx.beginPath(); ctx.ellipse(-3, -13, 17, 8, -.78 + flap, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-3, 13, 17, 8, .78 - flap, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#5c4730'; ctx.beginPath(); ctx.ellipse(2, 0, 15, 7, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#201610'; ctx.beginPath(); ctx.arc(15, 0, 7, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#f0d99c'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(18, -3); ctx.quadraticCurveTo(31, -15, 37, -7); ctx.moveTo(18, 3); ctx.quadraticCurveTo(31, 15, 37, 7); ctx.stroke();
  ctx.restore();
}
function drawOverlay(now) {
  if (state.messageTill > now) {
    ctx.save();
    ctx.fillStyle = 'rgba(12,9,13,.72)'; ctx.strokeStyle = 'rgba(255,209,90,.34)'; ctx.lineWidth = 2;
    const w = Math.min(650, W - 70); const x = W / 2 - w / 2; const y = 66;
    ctx.beginPath(); ctx.roundRect(x, y, w, 50, 16); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff4db'; ctx.font = '900 17px ui-rounded, system-ui'; ctx.textAlign = 'center';
    ctx.fillText(state.message, W / 2, y + 31);
    ctx.restore();
  }
  const heat = state.moth.heat;
  if (heat > .72) {
    ctx.save();
    ctx.globalAlpha = clamp((heat - .72) / .28, 0, 1) * .32;
    ctx.strokeStyle = '#ff765b'; ctx.lineWidth = 28;
    ctx.strokeRect(14, 14, W - 28, H - 28);
    ctx.restore();
  }
  if (state.over) {
    ctx.save(); ctx.fillStyle = 'rgba(8,7,10,.78)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff4db'; ctx.textAlign = 'center'; ctx.font = '950 58px ui-rounded, system-ui';
    ctx.fillText('DUSTED', W / 2, H / 2 - 62);
    ctx.font = '900 24px ui-rounded, system-ui';
    ctx.fillText(`${state.message}`, W / 2, H / 2 - 18);
    ctx.fillText(`Final glow: ${Math.floor(state.score)} · Best: ${best}`, W / 2, H / 2 + 25);
    ctx.font = '800 18px ui-rounded, system-ui';
    ctx.fillText('Press R or Restart run for another questionable porch decision.', W / 2, H / 2 + 67);
    ctx.restore();
  }
}
function draw(now) {
  const shake = state.shake * 14;
  ctx.save(); ctx.translate(rand(-shake, shake), rand(-shake, shake));
  drawPorch(now);
  for (const lamp of lamps) drawLamp(lamp, now);
  drawWebs();
  if (state.pollen) {
    const p = state.pollen;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(now / 700 + p.phase);
    ctx.fillStyle = '#8de3ff'; ctx.shadowColor = '#8de3ff'; ctx.shadowBlur = 22;
    ctx.beginPath(); ctx.arc(0, 0, p.r + Math.sin(now / 180) * 2, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#16354a'; ctx.font = '900 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText('☾', 0, 5);
    ctx.restore();
  }
  for (const s of state.spiders) drawSpider(s, now);
  for (const sw of state.swatters) drawSwatter(sw);
  for (const p of state.particles) {
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
  drawMoth(now);
  ctx.restore();
  drawOverlay(now);
}

function updateHud(force = false) {
  const now = performance.now();
  if (!force && now - lastHud < 90) return;
  lastHud = now;
  const moth = state.moth;
  $('score').textContent = Math.floor(state.score).toLocaleString();
  $('best').textContent = best.toLocaleString();
  $('combo').textContent = `${state.combo.toFixed(1)}×`;
  $('heat').textContent = `${Math.round(clamp(moth.heat, 0, 1) * 100)}%`;
  $('heatFill').style.width = `${clamp(moth.heat, 0, 1) * 100}%`;
  $('heatFill').classList.toggle('hot', moth.heat > .82);
  const ready = moth.dashCooldown <= 0;
  $('dash').textContent = ready ? 'Ready' : `${moth.dashCooldown.toFixed(1)}s`;
  $('dashFill').style.width = `${ready ? 100 : (1 - moth.dashCooldown / 2.6) * 100}%`;
  let status = 'Circle a lamp';
  if (state.over) status = 'R to restart';
  else if (moth.heat > .85) status = 'Too spicy';
  else if (state.combo > 2.2) status = 'Greedy good';
  else if (state.pollen) status = 'Moon pollen';
  $('status').textContent = status;
}
function frame(now) {
  const dt = Math.min(.033, (now - state.last) / 1000 || .016);
  state.last = now;
  update(dt, now);
  draw(now);
  updateHud();
  requestAnimationFrame(frame);
}
function pointerPoint(e) {
  const r = canvas.getBoundingClientRect();
  pointer.x = (e.clientX - r.left) * W / r.width;
  pointer.y = (e.clientY - r.top) * H / r.height;
}

canvas.addEventListener('pointerdown', e => { pointerPoint(e); pointer.active = true; canvas.focus(); initAudio(); });
canvas.addEventListener('pointermove', e => { pointerPoint(e); });
window.addEventListener('pointerup', () => { pointer.active = false; });
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd', 'shift', 'z'].includes(k)) e.preventDefault();
  if (k === ' ') dash();
  if (k === 'r') restart();
  keys.add(k);
  initAudio();
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
$('restart').addEventListener('click', restart);
$('mute').addEventListener('click', () => {
  muted = !muted;
  $('mute').textContent = muted ? 'Sound off' : 'Sound on';
  $('mute').setAttribute('aria-pressed', String(muted));
});
for (const button of document.querySelectorAll('[data-key]')) {
  const key = button.dataset.key.toLowerCase();
  const down = e => { e.preventDefault(); touchKeys.add(key); initAudio(); canvas.focus(); };
  const up = e => { e.preventDefault(); touchKeys.delete(key); };
  button.addEventListener('pointerdown', down);
  button.addEventListener('pointerup', up);
  button.addEventListener('pointercancel', up);
  button.addEventListener('pointerleave', up);
}
for (const button of document.querySelectorAll('[data-action]')) {
  const action = button.dataset.action;
  button.addEventListener('pointerdown', e => {
    e.preventDefault(); initAudio(); canvas.focus();
    if (action === 'dash') dash();
    if (action === 'brake') touchKeys.add('brake');
  });
  const release = e => { e.preventDefault(); touchKeys.delete('brake'); };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('pointerleave', release);
}

restart();
requestAnimationFrame(frame);
})();
