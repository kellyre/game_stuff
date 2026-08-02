(() => {
'use strict';
const canvas = document.getElementById('crossing');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const $ = id => document.getElementById(id);
const keys = new Set();
const pointer = { active:false, x: W/2, y:H/2 };
const rand = (a,b) => a + Math.random() * (b-a);
const clamp = (n,a,b) => Math.max(a, Math.min(b,n));
const choice = a => a[Math.floor(Math.random()*a.length)];
let muted = false, audio, state;
let skipLearningForSession = false, learningUi;
const lessons = [
  { text:'Learning 1/4: move the guard with WASD or the arrow keys. Try taking a few calm steps.', done:()=>state?.lessonMoved },
  { text:'Learning 2/4: hold Space or the STOP touch button to raise the stop sign zone.', done:()=>state?.lessonStopped },
  { text:'Learning 3/4: press Z or tap Whistle to call the ducklings back into formation.', done:()=>state?.lessonWhistled },
  { text:'Learning 4/4: press X or Shift, or tap Hop, for one gentle hop. Then the crossing opens slowly.', done:()=>state?.lessonHopped }
];
function ensureLearningUi(){
  if(learningUi) return learningUi;
  const box=document.createElement('div');
  box.id='learningUi';
  box.style.cssText='position:fixed;inset:auto 16px 16px auto;z-index:20;max-width:360px;background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:18px;padding:14px;box-shadow:var(--shadow);font-weight:800';
  box.innerHTML='<div id="learningText" style="margin-bottom:10px"></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button id="skipLearning" type="button">Skip learning</button><button id="playNow" type="button">Play now</button></div>';
  document.body.appendChild(box);
  box.querySelectorAll('button').forEach(b=>{b.style.cssText='border:1px solid var(--line);border-radius:999px;background:var(--panel);color:var(--ink);padding:.55rem .8rem;font-weight:900;cursor:pointer'});
  box.querySelector('#skipLearning').addEventListener('click',()=>{ skipLearningForSession=true; startPlay(); });
  box.querySelector('#playNow').addEventListener('click',()=>startPlay());
  learningUi=box; return box;
}
function setLearningVisible(on){ ensureLearningUi().style.display=on?'block':'none'; }
function updateLearning(){
  if(!state?.learning) return;
  const step=state.lessonStep||0;
  if(step>=lessons.length){ startPlay(); return; }
  if(lessons[step].done()){ state.lessonStep++; if(state.lessonStep>=lessons.length){ message('TRAINING COMPLETE. TRAFFIC WILL BEGIN POLITELY.',2200); setTimeout(startPlay,900); return; } }
  ensureLearningUi().querySelector('#learningText').textContent=lessons[state.lessonStep].text;
}
function showStartMenu(){
  restart('idle'); setLearningVisible(true);
  ensureLearningUi().querySelector('#learningText').textContent='Choose a start: learn each control with no traffic, or skip learning for this session.';
  const play=ensureLearningUi().querySelector('#playNow'); play.textContent='Start learning'; play.onclick=()=>startLearning();
}
function startLearning(){ const play=ensureLearningUi().querySelector('#playNow'); play.textContent='Play now'; play.onclick=()=>startPlay(); restart(skipLearningForSession?'play':'learn'); }
function startPlay(){ setLearningVisible(false); restart('play'); }
const duckNames = ['Mabel','Pip','Bean','Junebug','Waffles','Noodle','Dot','Pickle'];
const vehicleDefs = {
  car:{w:78,h:38,color:'#d9513d',score:9}, bus:{w:132,h:44,color:'#e8b936',score:15}, scooter:{w:50,h:28,color:'#5f8fb8',score:13}, mail:{w:110,h:42,color:'#f4f0db',score:14}, cart:{w:46,h:32,color:'#8fcf9a',score:16}
};
const lanes = [172,244,316,388,460];
function beep(type='peep'){
  if(muted) return;
  try{
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
    o.connect(g); g.connect(audio.destination);
    const f = {peep:700, whistle:1180, stop:210, bonk:90, save:620, hit:55, win:900, hop:360}[type] || 280;
    o.type = type==='whistle' ? 'sine' : type==='hit'||type==='bonk' ? 'sawtooth' : 'square';
    o.frequency.setValueAtTime(f,t);
    if(type==='whistle') o.frequency.exponentialRampToValueAtTime(1700,t+.18);
    if(type==='save') o.frequency.setValueAtTime(880,t+.08);
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(type==='whistle'? .07 : .045,t+.015);
    g.gain.exponentialRampToValueAtTime(.0001,t+(type==='whistle'? .35:.17));
    o.start(t); o.stop(t+.38);
  }catch{}
}
function message(text, ms=1400){ state.caption=text; state.captionTill=performance.now()+ms; }
function restart(mode='play'){
  const best = state?.best || Number(sessionStorage.getItem('duckling-crossing-best') || 0);
  const now = performance.now();
  state = { running:mode!=='idle', learning:mode==='learn', lessonStep:0, over:false, won:false, last:now, start:now, best, score:0, saved:0, wave:1, combo:0,
    time:180, bonks:0, hearts:3, sign:100, signHeld:false, signAbuse:0, whistleCd:0, hopCd:0, hop:0,
    guard:{x:500,y:562,vx:0,vy:0,face:-Math.PI/2,trail:[]}, ducks:[], vehicles:[], puddles:[], pigeons:[], particles:[], floaters:[], spawnTimers: lanes.map((_,i)=>3+i*1.4), glow:0,
    caption:'CROSSING DETAIL BEGINS. DUCKLINGS HAVE SIGNED NOTHING.', captionTill: now+2300 };
  spawnDucks(5); makeObstacles(); updateHud(); canvas.focus();
}
function spawnDucks(n){
  const start = state.ducks.length;
  for(let i=0;i<n;i++) state.ducks.push({
    name: duckNames[(start+i)%duckNames.length], x:455+i*18, y:594+i*3, vx:0, vy:0, r:10, saved:false, lost:false,
    scarf:['#d9513d','#5f8fb8','#8fcf9a','#b66bcf','#f08d3d'][i%5], bold:.75+Math.random()*.55, shy:Math.random(), curious:Math.random(), inv:.8+i*.08, panic:0, whistle:0
  });
}
function makeObstacles(){
  state.puddles = [{x:360,y:280,r:24},{x:640,y:420,r:28},{x:710,y:222,r:20}];
  state.pigeons = [{x:252,y:526,phase:0,scare:0},{x:750,y:120,phase:1.5,scare:0}];
}
function spawnVehicle(i){
  const elapsed = 180 - state.time;
  let kinds = ['car','car','bus'];
  if(elapsed>75) kinds.push('scooter','mail');
  if(elapsed>140) kinds.push('cart','scooter');
  const kind = choice(kinds), def = vehicleDefs[kind], dir = i%2 ? -1 : 1;
  const speedBase = 46 + i*7 + elapsed*.14;
  const speed = (kind==='bus'? .62 : kind==='scooter'? 1.45 : kind==='cart'? 1.1 : 1) * speedBase * dir;
  state.vehicles.push({kind, x:dir>0?-def.w-30:W+def.w+30, y:lanes[i], vx:speed, base:vxAbs(speed), w:def.w, h:def.h, color:def.color, lane:i, brake:0, stoppedFor:0, wob:rand(0,6), hitGrace:0});
}
function vxAbs(v){ return Math.abs(v); }
function stopZone(){
  const g=state.guard, len = 158, width = 82;
  const cx = g.x + Math.cos(g.face)*len*.52, cy = g.y + Math.sin(g.face)*len*.52;
  return {x:cx,y:cy,a:g.face,len,w:width};
}
function inZone(v,z){
  const dx=v.x-z.x, dy=v.y-z.y, c=Math.cos(-z.a), s=Math.sin(-z.a);
  const lx=dx*c-dy*s, ly=dx*s+dy*c;
  return Math.abs(lx) < z.len*.56+v.w*.32 && Math.abs(ly) < z.w*.5+v.h*.4;
}
function circleRectHit(c, r){
  const nx = clamp(c.x, r.x-r.w/2, r.x+r.w/2), ny=clamp(c.y, r.y-r.h/2, r.y+r.h/2);
  return (c.x-nx)**2 + (c.y-ny)**2 < (c.r||11)**2;
}
function burst(x,y,color,n=12,speed=120){ for(let i=0;i<n;i++) state.particles.push({x,y,vx:rand(-speed,speed),vy:rand(-speed,speed),life:rand(.3,.9),max:.9,r:rand(2,5),color}); }
function floater(text,x,y,color='#fff'){ state.floaters.push({text,x,y,vy:-28,life:1.1,color}); }
function whistle(){
  if(!state.running || state.whistleCd>0) return;
  state.whistleCd = 5.5;
  state.ducks.forEach(d=>{ if(!d.saved && !d.lost){ d.whistle=1.6; d.panic=0; }});
  state.pigeons.forEach(p=>{ if(Math.hypot(p.x-state.guard.x,p.y-state.guard.y)<190) p.scare=2.2; });
  if(state.learning) state.lessonWhistled=true; message('WHISTLE ISSUED. FORMATION REMEMBERS ITS TRAINING.'); beep('whistle'); burst(state.guard.x,state.guard.y,'#f4f0db',16,190);
}
function hop(){ if(!state.running || state.hopCd>0) return; if(state.learning) state.lessonHopped=true; state.hop=.22; state.hopCd=2.4; const g=state.guard; g.x += Math.cos(g.face)*44; g.y += Math.sin(g.face)*44; g.x=clamp(g.x,42,W-42); g.y=clamp(g.y,56,H-32); burst(g.x,g.y,'#f4f0db',12,130); beep('hop'); }
function deliverDuck(d){
  d.saved=true; state.saved++; state.combo++; const bonus=120+state.combo*35; state.score += bonus; floater(`${d.name} enrolled +${bonus}`, d.x, d.y, '#e8b936'); beep('save');
  if(state.saved===state.ducks.length){
    if(state.wave===1){ state.wave=2; state.combo+=2; state.time+=22; spawnDucks(3); message('SECOND FLOCK RELEASED FROM FIELD TRIP PAPERWORK.',2200); }
    else end(true);
  }
}
function bonkDuck(d, v){
  if(d.inv>0 || d.lost || d.saved) return;
  d.inv = 1.2; d.panic=1.6; state.bonks++; state.combo=0; state.score=Math.max(0,state.score-90); state.glow=.7;
  d.x += Math.sign(d.x-v.x)*28; d.y += rand(-18,18); burst(d.x,d.y,'#e8b936',18,180); floater(`${d.name}: indignity`, d.x, d.y, '#ff695f'); beep('bonk');
  if(state.bonks>=3) end(false, 'THREE DUCKLING BONKS. THE PTA HAS QUESTIONS.'); else message('DUCKLING BONK. FORGIVING COLLISION COMMITTEE CONVENES.');
}
function hitGuard(v){
  if(state.hop>0 || v.hitGrace>0) return;
  v.hitGrace=1; state.hearts--; state.glow=1; burst(state.guard.x,state.guard.y,'#d9513d',28,220); beep('hit');
  state.guard.x = clamp(state.guard.x + Math.sign(state.guard.x-v.x)*70, 40, W-40);
  message(state.hearts>0 ? 'GUARD CLIPPED. HAT STATUS: ARGUMENTATIVE.' : 'GUARD DOWN. CROSSWALK CLIPBOARD RETIRED.', 1800);
  if(state.hearts<=0) end(false);
}
function end(win, text){
  state.running=false; state.over=true; state.won=win;
  if(win){ state.score += 800 + Math.round(state.time)*12 + state.combo*50; beep('win'); message('ALL DUCKS ACCOUNTED FOR. SCHOOL BELL ACCEPTS YOUR THESIS.',4000); }
  else message(text || 'CROSSING CLOSED. PRESS R TO RE-TRAIN THE PARADE.',4000);
  if(state.score>state.best){ state.best=state.score; sessionStorage.setItem('duckling-crossing-best', String(state.best)); }
  updateHud();
}
function update(dt){
  if(!state.running) return;
  if(!state.learning){ state.time -= dt; if(state.time<=0) end(false,'THE SCHOOL BELL RANG. SEVERAL DUCKS ARE STILL COMMUTING.'); }
  const g=state.guard; let mx=0,my=0;
  if(keys.has('arrowleft')||keys.has('a')) mx--; if(keys.has('arrowright')||keys.has('d')) mx++; if(keys.has('arrowup')||keys.has('w')) my--; if(keys.has('arrowdown')||keys.has('s')) my++;
  if(mx||my){ const mag=Math.hypot(mx,my); mx/=mag; my/=mag; g.face=Math.atan2(my,mx); if(state.learning) state.lessonMoved=true; }
  if(pointer.active) g.face = Math.atan2(pointer.y-g.y, pointer.x-g.x);
  state.signHeld = keys.has(' ') || keys.has('spacebar') || touchSignDown; if(state.learning && state.signHeld) state.lessonStopped=true;
  const speed = (state.signHeld && state.sign>0 ? 122 : 190) * (state.hop>0 ? 1.7 : 1);
  g.x=clamp(g.x+mx*speed*dt,36,W-36); g.y=clamp(g.y+my*speed*dt,78,H-34);
  if(state.signHeld && state.sign>0){ state.sign=Math.max(0,state.sign-(22+state.signAbuse*9)*dt); state.signAbuse+=dt; }
  else { state.sign=Math.min(100,state.sign+28*dt); state.signAbuse=Math.max(0,state.signAbuse-1.8*dt); }
  state.whistleCd=Math.max(0,state.whistleCd-dt); state.hopCd=Math.max(0,state.hopCd-dt); state.hop=Math.max(0,state.hop-dt); state.glow=Math.max(0,state.glow-dt*.6);
  g.trail.unshift({x:g.x,y:g.y}); if(g.trail.length>190) g.trail.length=190;
  if(!state.learning) lanes.forEach((_,i)=>{ state.spawnTimers[i]-=dt; if(state.spawnTimers[i]<=0){ spawnVehicle(i); const elapsed=180-state.time; state.spawnTimers[i]=rand(5.4,8.2)-Math.min(1.2,elapsed*.003)+i*.12; }});
  const z = state.signHeld && state.sign>0 ? stopZone() : null;
  state.vehicles.forEach(v=>{
    const def=vehicleDefs[v.kind]; let target=Math.sign(v.vx)*v.base;
    v.brake=Math.max(0,v.brake-dt); v.hitGrace=Math.max(0,v.hitGrace-dt);
    if(z && inZone(v,z) && state.signAbuse<2.9){ target*=.08; v.brake=.18; v.stoppedFor+=dt; if(Math.random()<.35) burst(v.x-rand(-v.w/2,v.w/2), v.y+v.h/2, '#232323', 1, 30); state.score += def.score*dt; }
    else v.stoppedFor=0;
    v.vx += (target-v.vx) * Math.min(1,dt*3.8);
    v.x += v.vx*dt;
    if(v.kind==='scooter') v.y = lanes[v.lane] + Math.sin(performance.now()/300+v.wob)*10;
    if(v.kind==='cart') v.y += Math.sin(performance.now()/460+v.wob)*18*dt;
  });
  state.vehicles = state.vehicles.filter(v=>v.x>-190 && v.x<W+190);
  state.pigeons.forEach(p=>{ p.phase+=dt; if(p.scare>0){ p.scare-=dt; p.y += Math.sin(p.phase*9)*50*dt; p.x += Math.cos(p.phase*5)*70*dt; p.x=clamp(p.x,80,W-80); p.y=clamp(p.y,90,H-60); }});
  state.ducks.forEach((d,i)=>{
    if(d.saved || d.lost) return; d.inv=Math.max(0,d.inv-dt); d.whistle=Math.max(0,d.whistle-dt); d.panic=Math.max(0,d.panic-dt);
    let target = g.trail[Math.min(g.trail.length-1, Math.floor(14+i*(9+d.shy*6)))] || g;
    if(d.whistle>0) target = g.trail[Math.min(g.trail.length-1, 7+i*5)] || g;
    let ax=(target.x-d.x)*5.2, ay=(target.y-d.y)*5.2;
    if(d.curious>.62 && d.whistle<=0 && d.panic<=0){
      const nearP = state.puddles.reduce((a,p)=> Math.hypot(p.x-d.x,p.y-d.y)<Math.hypot(a.x-d.x,a.y-d.y)?p:a, state.puddles[0]);
      if(nearP && Math.hypot(nearP.x-d.x,nearP.y-d.y)<150){ ax+=(nearP.x-d.x)*.65; ay+=(nearP.y-d.y)*.65; }
    }
    state.pigeons.forEach(p=>{ const dist=Math.hypot(p.x-d.x,p.y-d.y); if(dist<42){ d.panic=1.2; ax+=(d.x-p.x)*24; ay+=(d.y-p.y)*24; }});
    state.puddles.forEach(p=>{ const dist=Math.hypot(p.x-d.x,p.y-d.y); if(dist<p.r+8){ ax*=.48; ay*=.48; d.vx+=(d.x-p.x)*dt*22; d.vy+=(d.y-p.y)*dt*22; }});
    const max = d.whistle>0 ? 210 : 138*d.bold;
    d.vx = clamp((d.vx + ax*dt)*.9, -max, max); d.vy = clamp((d.vy + ay*dt)*.9, -max, max);
    d.x=clamp(d.x+d.vx*dt,24,W-24); d.y=clamp(d.y+d.vy*dt,62,H-18);
    if(d.y<92 && d.x>395 && d.x<605) deliverDuck(d);
    state.vehicles.forEach(v=>{ if(circleRectHit(d,v)) bonkDuck(d,v); });
  });
  state.vehicles.forEach(v=>{ if(circleRectHit({...g,r:14},v)) hitGuard(v); });
  state.particles.forEach(p=>{ p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=80*dt; p.life-=dt; });
  state.floaters.forEach(f=>{ f.y+=f.vy*dt; f.life-=dt; });
  state.particles=state.particles.filter(p=>p.life>0); state.floaters=state.floaters.filter(f=>f.life>0);
  state.score += dt * (state.signHeld ? 3 : 1) * Math.max(1,state.combo*.18);
  updateHud();
}
function updateHud(){
  $('score').textContent = Math.floor(state.score); $('best').textContent = Math.floor(state.best); $('saved').textContent = `${state.saved}/${state.ducks.length}`; $('bonks').textContent = `${state.bonks}/3`; $('hearts').textContent = state.hearts; $('time').textContent = Math.max(0,Math.ceil(state.time));
  $('signBar').style.width = `${state.sign}%`; $('signText').textContent = state.sign<=0 ? 'wobbly' : state.signHeld ? 'raised' : 'ready'; $('whistle').textContent = state.whistleCd>0 ? `${state.whistleCd.toFixed(1)}s` : 'ready';
}
function drawRoundedRect(x,y,w,h,r){ ctx.beginPath(); ctx.roundRect(x-w/2,y-h/2,w,h,r); ctx.fill(); ctx.stroke(); }
function draw(){
  ctx.save(); ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#70a96f'; ctx.fillRect(0,0,W,H); ctx.fillStyle='#85ba78'; ctx.fillRect(0,0,W,96); ctx.fillRect(0,536,W,104);
  ctx.fillStyle='#6d716f'; ctx.fillRect(0,126,W,390);
  ctx.strokeStyle='rgba(255,255,255,.42)'; ctx.lineWidth=3; ctx.setLineDash([24,26]); lanes.forEach(y=>{ ctx.beginPath(); ctx.moveTo(0,y+36); ctx.lineTo(W,y+36); ctx.stroke(); }); ctx.setLineDash([]);
  ctx.fillStyle='#f6f1d8'; for(let y=126;y<516;y+=32) ctx.fillRect(407,y,82,16), ctx.fillRect(511,y,82,16);
  ctx.fillStyle='#496a4e'; ctx.fillRect(384,18,232,58); ctx.fillStyle='#f4f0db'; ctx.font='900 18px ui-sans-serif,system-ui'; ctx.textAlign='center'; ctx.fillText('SCHOOLYARD GATE',500,54);
  state.puddles.forEach(p=>{ const grd=ctx.createRadialGradient(p.x,p.y,2,p.x,p.y,p.r); grd.addColorStop(0,'#6fb6cfaa'); grd.addColorStop(1,'#4d8ea444'); ctx.fillStyle=grd; ctx.beginPath(); ctx.ellipse(p.x,p.y,p.r*1.25,p.r*.72,.2,0,Math.PI*2); ctx.fill(); });
  state.pigeons.forEach(p=>{ ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(Math.sin(p.phase*4)*.25); ctx.fillStyle=p.scare>0?'#d8d8d8':'#a8a8a8'; ctx.beginPath(); ctx.ellipse(0,0,12,8,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#555'; ctx.beginPath(); ctx.arc(8,-3,4,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#eee'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-4,0); ctx.quadraticCurveTo(-16,-12,-24,0); ctx.moveTo(-2,0); ctx.quadraticCurveTo(-16,12,-24,2); ctx.stroke(); ctx.restore(); });
  if(state.signHeld && state.sign>0){ const z=stopZone(); ctx.save(); ctx.translate(z.x,z.y); ctx.rotate(z.a); ctx.fillStyle= state.signAbuse>2.9 ? 'rgba(255,80,60,.13)' : 'rgba(216,78,53,.22)'; ctx.strokeStyle='rgba(216,78,53,.72)'; ctx.lineWidth=3; ctx.setLineDash([10,8]); ctx.strokeRect(-z.len*.55,-z.w*.5,z.len*1.1,z.w); ctx.fillRect(-z.len*.55,-z.w*.5,z.len*1.1,z.w); ctx.setLineDash([]); ctx.restore(); }
  state.vehicles.forEach(v=>{ ctx.save(); ctx.translate(v.x,v.y); ctx.fillStyle=v.color; ctx.strokeStyle='#252018'; ctx.lineWidth=3; drawRoundedRect(0,0,v.w,v.h,9); ctx.fillStyle='#25201855'; ctx.fillRect(-v.w*.25,-v.h*.34,v.w*.28,v.h*.28); ctx.fillRect(v.w*.08,-v.h*.34,v.w*.28,v.h*.28); ctx.fillStyle='#252018'; ctx.beginPath(); ctx.arc(-v.w*.3,v.h*.48,6,0,Math.PI*2); ctx.arc(v.w*.3,v.h*.48,6,0,Math.PI*2); ctx.fill(); if(v.brake>0){ ctx.fillStyle='#f4f0db'; ctx.font='900 12px ui-sans-serif'; ctx.fillText('SKID',-8,-v.h*.68); } ctx.restore(); });
  state.ducks.forEach((d,i)=>{ if(d.saved) return; ctx.save(); ctx.translate(d.x,d.y); ctx.rotate(Math.atan2(d.vy,d.vx)||0); if(d.inv>0) ctx.globalAlpha=.72; ctx.fillStyle='#e8b936'; ctx.beginPath(); ctx.ellipse(0,0,12,9,0,0,Math.PI*2); ctx.ellipse(9,-5,7,6,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#c97822'; ctx.beginPath(); ctx.moveTo(16,-5); ctx.lineTo(25,-2); ctx.lineTo(16,1); ctx.fill(); ctx.strokeStyle=d.scarf; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(-5,-7); ctx.lineTo(5,-8); ctx.stroke(); ctx.fillStyle='#252018'; ctx.beginPath(); ctx.arc(11,-7,1.5,0,Math.PI*2); ctx.fill(); ctx.restore(); ctx.fillStyle=d.panic>0?'#ff695f':'#f4f0db'; ctx.font='800 11px ui-sans-serif,system-ui'; ctx.textAlign='center'; ctx.fillText(d.panic>0?'!':d.name,d.x,d.y-18); });
  const g=state.guard; ctx.save(); ctx.translate(g.x,g.y); ctx.rotate(g.face+Math.PI/2); ctx.fillStyle=state.hop>0?'#f08d3d':'#d9513d'; ctx.strokeStyle='#252018'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,15,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.fillStyle='#f4f0db'; ctx.fillRect(-10,-24,20,10); ctx.fillStyle='#252018'; ctx.fillRect(-2,-31,4,18); ctx.fillStyle='#d9513d'; ctx.beginPath(); ctx.arc(0,-40,14,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#fff'; ctx.font='900 8px ui-sans-serif'; ctx.textAlign='center'; ctx.fillText('STOP',0,-37); ctx.restore();
  state.particles.forEach(p=>{ ctx.globalAlpha=clamp(p.life/p.max,0,1); ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; });
  state.floaters.forEach(f=>{ ctx.globalAlpha=clamp(f.life,0,1); ctx.fillStyle=f.color; ctx.font='900 18px ui-sans-serif,system-ui'; ctx.textAlign='center'; ctx.fillText(f.text,f.x,f.y); ctx.globalAlpha=1; });
  if(state.glow>0){ ctx.fillStyle=`rgba(255,245,210,${state.glow*.10})`; ctx.fillRect(0,0,W,H); }
  if(performance.now()<state.captionTill || state.over){ ctx.fillStyle='rgba(20,22,20,.78)'; ctx.strokeStyle='rgba(255,255,255,.25)'; ctx.lineWidth=2; ctx.beginPath(); ctx.roundRect(170,18,660,48,16); ctx.fill(); ctx.stroke(); ctx.fillStyle='#fffaf0'; ctx.font='900 18px ui-sans-serif,system-ui'; ctx.textAlign='center'; ctx.fillText(state.over ? `${state.won?'SAVED':'CLOSED'} · SCORE ${Math.floor(state.score)} · R TO RESTART` : state.caption, W/2, 49); }
  ctx.restore();
}
function loop(now){ const dt=Math.min(.033,(now-state.last)/1000 || .016); state.last=now; update(dt); updateLearning(); draw(); requestAnimationFrame(loop); }
let touchSignDown=false;
window.addEventListener('keydown', e=>{ const k=e.key.toLowerCase(); if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k)) e.preventDefault(); keys.add(k); if(k==='z') whistle(); if(k==='x'||k==='shift') hop(); if(k==='r') restart(); });
window.addEventListener('keyup', e=> keys.delete(e.key.toLowerCase()));
canvas.addEventListener('pointermove', e=>{ const r=canvas.getBoundingClientRect(); pointer.active=true; pointer.x=(e.clientX-r.left)*W/r.width; pointer.y=(e.clientY-r.top)*H/r.height; });
canvas.addEventListener('pointerleave', ()=> pointer.active=false);
canvas.addEventListener('pointerdown', e=>{ canvas.focus(); const r=canvas.getBoundingClientRect(); pointer.active=true; pointer.x=(e.clientX-r.left)*W/r.width; pointer.y=(e.clientY-r.top)*H/r.height; touchSignDown=true; });
window.addEventListener('pointerup', ()=> touchSignDown=false);
$('restart').addEventListener('click', restart); $('mute').addEventListener('click',()=>{ muted=!muted; $('mute').textContent=muted?'Sound off':'Sound on'; if(!muted) beep('peep'); });
$('touchWhistle').addEventListener('click', whistle); $('touchHop').addEventListener('click', hop); $('touchSign').addEventListener('pointerdown',()=>{touchSignDown=true; canvas.focus();}); $('touchSign').addEventListener('pointerup',()=>touchSignDown=false); $('touchSign').addEventListener('pointercancel',()=>touchSignDown=false);
$('touchUp').addEventListener('pointerdown',()=>{ keys.add('arrowup'); canvas.focus(); }); $('touchUp').addEventListener('pointerup',()=>keys.delete('arrowup')); $('touchUp').addEventListener('pointercancel',()=>keys.delete('arrowup'));
showStartMenu(); requestAnimationFrame(loop);
})();
