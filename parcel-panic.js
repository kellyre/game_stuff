(() => {
'use strict';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const colors = ['#ff5d6c', '#55c5ff', '#ffcf4b'];
const keys = new Set();
const pointer = { x: W / 2, y: H / 2, down: false };
let state;
let best = 0;
let stampColor = 0;
const $ = id => document.getElementById(id);

function rand(a, b) { return a + Math.random() * (b - a); }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function circle(a, b, r = 0) { return dist(a, b) < a.r + b.r + r; }
function restart() {
  state = { running: true, over: false, start: performance.now(), last: performance.now(),
    player: { x: W / 2, y: H - 94, r: 18, vx: 0, vy: 0, dash: 0, inv: 0 },
    parcels: [], bullets: [], drones: [], particles: [], score: 0, combo: 0, strikes: 0,
    dashCharge: 0, spawn: 0, droneSpawn: 5, fire: 0, slow: 0, shake: 0, message: 'CLOCKED IN. SORT LIKE YOU MEAN IT.', messageTill: performance.now() + 2000 };
  canvas.focus(); updateHud();
}
function updateHud() {
  $('score').textContent = state.score;
  $('best').textContent = best;
  $('combo').textContent = state.combo;
  $('strikes').textContent = Array.from({length:3}, (_, i) => i < state.strikes ? '×' : '○').join(' ');
}
function spawnParcel() {
  const color = Math.floor(Math.random() * 3);
  const express = Math.random() < .09 && state.score > 80;
  const armor = !express && Math.random() < Math.min(.26, (performance.now() - state.start) / 90000);
  state.parcels.push({ x: rand(75, W - 75), y: 70, r: express ? 14 : 17, color, hp: armor ? 2 : 1,
    speed: rand(41, 65) + Math.min(87, (performance.now() - state.start) / 550), express, wobble: rand(0, 7) });
}
function spawnDrone() {
  const fromLeft = Math.random() < .5;
  state.drones.push({ x: fromLeft ? -34 : W + 34, y: rand(H * .48, H - 130), r: 23,
    vx: fromLeft ? rand(68, 108) : -rand(68, 108), phase: rand(0, 6) });
}
function burst(x, y, color, n = 14) {
  for (let i = 0; i < n; i++) state.particles.push({x,y,vx:rand(-150,150),vy:rand(-150,100),life:rand(.25,.7),max:.7,color,r:rand(2,5)});
}
function stamp() {
  if (!state.running || state.fire > 0) return;
  const p = state.player, a = Math.atan2(pointer.y - p.y, pointer.x - p.x);
  const color = stampColor;
  state.bullets.push({ x:p.x + Math.cos(a)*20, y:p.y + Math.sin(a)*20, vx:Math.cos(a)*560, vy:Math.sin(a)*560, r:7, life:1.2, color });
  state.fire = .15; burst(p.x + Math.cos(a)*18, p.y + Math.sin(a)*18, colors[color], 4);
}
function loseStrike(reason) {
  state.strikes++; state.combo = 0; state.dashCharge = Math.max(0, state.dashCharge - 2); state.shake = .3;
  state.message = reason; state.messageTill = performance.now() + 1200;
  if (state.strikes >= 3) { state.running = false; state.over = true; best = Math.max(best, state.score); state.message = 'SHIFT OVER. PRESS R OR RESTART.'; state.messageTill = Infinity; }
  updateHud();
}
function delivered(parcel) {
  const gain = parcel.express ? 75 : 10 + Math.min(40, state.combo * 2);
  state.score += gain; state.combo++; state.dashCharge = Math.min(5, state.dashCharge + 1);
  if (parcel.express) { state.slow = 2.2; state.message = 'EXPRESS! THE CLOCK BLINKED.'; state.messageTill = performance.now() + 1200; }
  if (state.combo % 5 === 0) { state.message = 'DASH CHARGED — SPACE'; state.messageTill = performance.now() + 1400; }
  burst(parcel.x, parcel.y, colors[parcel.color], parcel.express ? 28 : 15); updateHud();
}
function dash() {
  if (!state.running || state.dashCharge < 5 || state.player.dash > 0) return;
  state.dashCharge = 0; state.player.dash = .42; state.player.inv = .58; state.shake = .16; state.message = 'ADMINISTRATIVE VELOCITY.'; state.messageTill = performance.now() + 700;
  burst(state.player.x, state.player.y, '#ffffff', 28); updateHud();
}
function update(dt, now) {
  if (!state.running) return;
  const slow = state.slow > 0 ? .48 : 1;
  state.slow = Math.max(0, state.slow - dt); state.fire = Math.max(0, state.fire - dt);
  const p = state.player; p.dash = Math.max(0,p.dash-dt); p.inv = Math.max(0,p.inv-dt);
  let dx = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0);
  let dy = (keys.has('arrowdown') || keys.has('s') ? 1 : 0) - (keys.has('arrowup') || keys.has('w') ? 1 : 0);
  const len = Math.hypot(dx,dy) || 1, speed = p.dash ? 610 : 260;
  p.x = clamp(p.x + dx/len * speed*dt, 29, W-29); p.y = clamp(p.y + dy/len * speed*dt, H*.45, H-29);
  state.spawn -= dt;
  if (state.spawn <= 0) { spawnParcel(); const elapsed=(now-state.start)/1000; state.spawn = Math.max(.38, 1.24 - elapsed*.012) * rand(.72,1.18); }
  state.droneSpawn -= dt;
  if (state.droneSpawn <= 0) { spawnDrone(); state.droneSpawn = Math.max(2.5, 6.8 - (now-state.start)/18000); }
  if (pointer.down) stamp();
  for (let i=state.bullets.length-1;i>=0;i--) { const b=state.bullets[i]; b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt; if(b.life<0)state.bullets.splice(i,1); }
  for (let i=state.parcels.length-1;i>=0;i--) { const q=state.parcels[i]; q.y += q.speed*dt*slow; q.x += Math.sin(now/500+q.wobble)*14*dt; if(q.y>H-43){burst(q.x,q.y,'#ff5d6c',22);state.parcels.splice(i,1);loseStrike('MISSED PACKAGE. PAPERWORK MULTIPLIED.');continue;}
    for(let j=state.bullets.length-1;j>=0;j--){ const b=state.bullets[j]; if(circle(q,b)){state.bullets.splice(j,1); if(q.color===b.color){q.hp--;burst(q.x,q.y,colors[q.color],8);if(q.hp<=0){state.parcels.splice(i,1);delivered(q);} }else{q.y+=22;burst(q.x,q.y,'#9aa4b8',7);state.combo=0;state.message='WRONG ROUTE. THAT ONE LOOKED IMPORTANT.';state.messageTill=now+900;updateHud();}break;} }
  }
  for(let i=state.drones.length-1;i>=0;i--){const d=state.drones[i];d.x+=d.vx*dt*slow;d.y+=Math.sin(now/460+d.phase)*22*dt;if(d.x<-70||d.x>W+70)state.drones.splice(i,1);else if(circle(p,d)&&!p.inv){burst(p.x,p.y,'#ff5d6c',26);loseStrike('DRONE CONTACT. THAT WAS NOT A HANDSHAKE.');p.inv=1.1;}else if(circle(p,d)&&p.dash){burst(d.x,d.y,'#fff',27);state.drones.splice(i,1);state.score+=25;updateHud();}}
  for(let i=state.particles.length-1;i>=0;i--){let v=state.particles[i];v.x+=v.vx*dt;v.y+=v.vy*dt;v.vy+=220*dt;v.life-=dt;if(v.life<=0)state.particles.splice(i,1)}
  state.shake=Math.max(0,state.shake-dt);
}
function draw(now) {
  ctx.clearRect(0,0,W,H); const shake=state.shake?state.shake*10:0; ctx.save();ctx.translate(rand(-shake,shake),rand(-shake,shake));
  ctx.fillStyle='#121a2b';ctx.fillRect(0,0,W,H); // depot stripes
  for(let y=70;y<H;y+=80){ctx.fillStyle='#18253a';ctx.fillRect(0,y,W,2)}
  ctx.fillStyle='#273751';ctx.fillRect(0,0,W,57);ctx.fillStyle='#ef5161';ctx.fillRect(0,H-51,W,6);
  for(let i=0;i<3;i++){const x=(i+.5)*W/3;ctx.fillStyle=colors[i];ctx.fillRect(x-105,0,210,46);ctx.fillStyle='#fff';ctx.font='900 18px system-ui';ctx.textAlign='center';ctx.fillText('LANE '+String.fromCharCode(65+i),x,30)}
  ctx.fillStyle='#aebad0';ctx.font='700 13px system-ui';ctx.textAlign='center';ctx.fillText('DEADLINE LINE — DO NOT LET PARCELS CROSS',W/2,H-62);
  for(const q of state.parcels){ctx.save();ctx.translate(q.x,q.y);ctx.rotate(Math.sin(now/280+q.wobble)*.08);ctx.fillStyle=q.express?'#fff4a8':colors[q.color];ctx.fillRect(-q.r,-q.r,q.r*2,q.r*2);ctx.strokeStyle='#101827';ctx.lineWidth=3;ctx.strokeRect(-q.r,-q.r,q.r*2,q.r*2);ctx.fillStyle='#101827';ctx.font='900 15px system-ui';ctx.fillText(String.fromCharCode(65+q.color),0,5);if(q.hp===2){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(-q.r-4,-q.r-4,q.r*2+8,q.r*2+8)}ctx.restore()}
  for(const b of state.bullets){ctx.fillStyle=colors[b.color];ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill()}
  for(const d of state.drones){ctx.save();ctx.translate(d.x,d.y);ctx.strokeStyle='#93a2bd';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-27,0);ctx.lineTo(27,0);ctx.stroke();ctx.fillStyle='#c2d0ea';ctx.beginPath();ctx.arc(0,0,d.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#172033';ctx.fillRect(-7,-5,14,10);ctx.restore()}
  const p=state.player, a=Math.atan2(pointer.y-p.y,pointer.x-p.x);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(a);ctx.globalAlpha=p.inv&&Math.floor(now/80)%2? .45:1;ctx.fillStyle=p.dash?'#fff':'#79e0b3';ctx.beginPath();ctx.arc(0,0,p.r+(p.dash?8:0),0,Math.PI*2);ctx.fill();ctx.fillStyle='#172033';ctx.fillRect(7,-5,20,10);ctx.restore();
  for(const v of state.particles){ctx.globalAlpha=v.life/v.max;ctx.fillStyle=v.color;ctx.beginPath();ctx.arc(v.x,v.y,v.r,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
  const charge=state.dashCharge/5;ctx.fillStyle='#0c1220aa';ctx.fillRect(19,H-111,168,30);ctx.fillStyle='#fff';ctx.font='800 12px system-ui';ctx.textAlign='left';ctx.fillText('DASH '+state.dashCharge+'/5',28,H-91);ctx.fillStyle='#79e0b3';ctx.fillRect(92,H-102,82*charge,10);
  if(state.messageTill>now){ctx.fillStyle='#0d1324d9';ctx.fillRect(W/2-205,H/2-34,410,58);ctx.fillStyle='#fff';ctx.font='900 16px system-ui';ctx.textAlign='center';ctx.fillText(state.message,W/2,H/2+6)}
  if(state.over){ctx.fillStyle='#08101bdd';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='900 52px system-ui';ctx.textAlign='center';ctx.fillText('SHIFT OVER',W/2,H/2-38);ctx.font='800 22px system-ui';ctx.fillText('Final score: '+state.score+'  ·  Best: '+best,W/2,H/2+4);ctx.font='700 17px system-ui';ctx.fillText('Press R or click Restart shift',W/2,H/2+42)}
  ctx.restore();
}
function chooseColor(color) {
  stampColor = color;
  document.querySelectorAll('[data-color]').forEach(button => button.classList.toggle('active', Number(button.dataset.color) === color));
}
function frame(now){const dt=Math.min(.033,(now-state.last)/1000);state.last=now;update(dt,now);draw(now);requestAnimationFrame(frame)}
function point(e){const r=canvas.getBoundingClientRect();pointer.x=(e.clientX-r.left)*W/r.width;pointer.y=(e.clientY-r.top)*H/r.height}
canvas.addEventListener('pointermove',point);canvas.addEventListener('pointerdown',e=>{point(e);pointer.down=true;stamp()});window.addEventListener('pointerup',()=>pointer.down=false);
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' ','w','a','s','d'].includes(k))e.preventDefault();if(k===' ')dash();if(k==='r')restart();if(['1','2','3'].includes(k))chooseColor(Number(k)-1);keys.add(k)});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));document.querySelectorAll('[data-color]').forEach(button => button.addEventListener('click', () => chooseColor(Number(button.dataset.color))));$('restart').addEventListener('click',restart);
restart();chooseColor(0);requestAnimationFrame(frame);
})();
