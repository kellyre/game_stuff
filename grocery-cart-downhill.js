(() => {
'use strict';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const $ = id => document.getElementById(id);
const keys = new Set();
const clamp = (n,a,b) => Math.max(a, Math.min(b,n));
const rand = (a,b) => a + Math.random() * (b-a);
const choice = a => a[Math.floor(Math.random()*a.length)];
let state, audio, muted = false, touch = {left:false,right:false,boost:false,brake:false,drift:false};
let skipLearningForSession = false, learningUi;
const lessons = [
  { text:'Learning 1/4: steer left and right with A/D, arrows, or the touch arrows.', done:()=>state?.lessonSteered },
  { text:'Learning 2/4: try W to boost and S to brake. The first real aisles stay slow.', done:()=>state?.lessonSpeed },
  { text:'Learning 3/4: hold Space or Skid for a calm practice drift.', done:()=>state?.lessonDrift },
  { text:'Learning 4/4: honk with Z or the Honk button. Then checkout opens at a gentle pace.', done:()=>state?.lessonHonked }
];
function ensureLearningUi(){
  if(learningUi) return learningUi;
  const box=document.createElement('div'); box.id='learningUi';
  box.style.cssText='position:fixed;inset:auto 16px 16px auto;z-index:20;max-width:360px;background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:18px;padding:14px;box-shadow:var(--shadow);font-weight:800';
  box.innerHTML='<div id="learningText" style="margin-bottom:10px"></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button id="skipLearning" type="button">Skip learning</button><button id="playNow" type="button">Play now</button></div>';
  document.body.appendChild(box); box.querySelectorAll('button').forEach(b=>{b.style.cssText='border:1px solid var(--line);border-radius:999px;background:var(--panel);color:var(--ink);padding:.55rem .8rem;font-weight:900;cursor:pointer'});
  box.querySelector('#skipLearning').addEventListener('click',()=>{ skipLearningForSession=true; startPlay(); }); box.querySelector('#playNow').addEventListener('click',()=>startPlay()); learningUi=box; return box;
}
function setLearningVisible(on){ ensureLearningUi().style.display=on?'block':'none'; }
function updateLearning(){ if(!state?.learning) return; if(state.lessonStep>=lessons.length){ startPlay(); return; } if(lessons[state.lessonStep].done()){ state.lessonStep++; if(state.lessonStep>=lessons.length){ message('TRAINING COMPLETE. THE AISLE OPENS SLOWLY.',2200); setTimeout(startPlay,900); return; } } ensureLearningUi().querySelector('#learningText').textContent=lessons[state.lessonStep].text; }
function showStartMenu(){ restart('idle'); setLearningVisible(true); ensureLearningUi().querySelector('#learningText').textContent='Choose a start: learn each control with no crashes, or skip learning for this session.'; const play=ensureLearningUi().querySelector('#playNow'); play.textContent='Start learning'; play.onclick=()=>startLearning(); }
function startLearning(){ const play=ensureLearningUi().querySelector('#playNow'); play.textContent='Play now'; play.onclick=()=>startPlay(); restart(skipLearningForSession?'play':'learn'); }
function startPlay(){ setLearningVisible(false); restart('play'); }
const groceryNames = ['Soup','Cereal','Pickles','Beans','Seltzer','Noodles','Tiny ham','Receipt moon'];
function beep(type='tick'){
  if(muted) return;
  try{
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const t=audio.currentTime, o=audio.createOscillator(), g=audio.createGain();
    o.connect(g); g.connect(audio.destination);
    const f={pickup:760,honk:230,scrape:95,crash:55,drift:420,finish:980,tick:360}[type]||320;
    o.type = type==='honk'?'sawtooth':type==='pickup'||type==='finish'?'square':'triangle';
    o.frequency.setValueAtTime(f,t);
    if(type==='pickup') o.frequency.setValueAtTime(1030,t+.055);
    if(type==='honk') o.frequency.exponentialRampToValueAtTime(145,t+.22);
    if(type==='finish') o.frequency.setValueAtTime(1320,t+.12);
    g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(type==='honk'?.07:.045,t+.015); g.gain.exponentialRampToValueAtTime(.0001,t+(type==='honk'?.35:.16));
    o.start(t); o.stop(t+.38);
  }catch{}
}
function restart(mode='play'){
  const best = state?.best || Number(sessionStorage.getItem('grocery-cart-downhill-best') || 0);
  const now = performance.now();
  state = {running:mode!=='idle',learning:mode==='learn',lessonStep:0,over:false,won:false,last:now,best,score:0,combo:1,comboGrace:0,damage:5,dist:0,trackLen:28000,worldY:0,
    speed:145,honk:100,honkCd:0,inv:0,spin:0,glow:0,slowMo:0,status:'rolling',caption:'MIDNIGHT AISLE DESCENT AUTHORIZED. GRIP THE HANDLEBAR.',captionTill:now+2500,
    cart:{x:W/2,y:H-126,vx:0,tilt:0,drift:false}, bands:[], particles:[], floaters:[], melons:[], fog:0, fogTimer:25};
  for(let y=-220;y<state.trackLen+900;y+=150) makeBand(y);
  updateHud(); canvas.focus();
}
function makeBand(y){
  const elapsed = y / state.trackLen;
  const lanes = [96,226,356,486,616,746];
  const safe = y < 7600 ? 2 : Math.floor(rand(0,5));
  const blocks=[];
  for(let i=0;i<5;i++){
    if(i===safe || (y < 900 && i > 0 && i < 4) || Math.random()<(.18-elapsed*.08)) continue;
    const gapRisk = Math.abs(i-safe)>1 ? .45 : .18;
    if(Math.random()<gapRisk+elapsed*.28){
      const cx=(lanes[i]+lanes[i+1])/2, w=rand(84,150+elapsed*28), h=rand(54,96);
      blocks.push({x:cx,y,w,h,color:choice(['#8a6748','#9f7444','#735a40'])});
    }
  }
  const items=[], hazards=[];
  const risky = lanes[clamp(safe + choice([-2,-1,1,2]),0,5)];
  if(Math.random()<.82) items.push({x:clamp(risky+rand(-24,24),54,W-54),y:y+rand(-36,42),r:13,type:choice(groceryNames),v:80});
  if(Math.random()<.42) items.push({x:clamp(lanes[safe]+rand(-34,34),54,W-54),y:y+rand(-50,50),r:11,type:'Coupon',v:48,coupon:true});
  if(y>1800 && Math.random()<.28) hazards.push({x:clamp(lanes[clamp(safe+choice([-1,1]),0,5)]+rand(-18,18),54,W-54),y:y+rand(-46,46),r:15,type:'banana'});
  if(y>3600 && Math.random()<.22) hazards.push({x:clamp(lanes[Math.floor(rand(0,6))]+rand(-30,30),54,W-54),y:y+rand(-40,40),r:25,type:'wet'});
  if(y>6200 && Math.random()<.14) hazards.push({x:W/2,y:y+rand(-52,52),r:36,type:'gust',dir:choice([-1,1])});
  if(y>9000 && Math.random()<.10) state.melons.push({x:choice([-50,W+50]),y:y+rand(-45,45),vx:choice([-1,1])*rand(72,122),r:18});
  if(y>11000 && Math.random()<.08) hazards.push({x:W/2,y:y+10,r:1,type:'fog'});
  state.bands.push({y,blocks,items,hazards});
}
function message(text,ms=1400){ state.caption=text; state.captionTill=performance.now()+ms; }
function burst(x,y,color,n=12,speed=120){ for(let i=0;i<n;i++) state.particles.push({x,y,vx:rand(-speed,speed),vy:rand(-speed,speed),life:rand(.3,.9),max:.9,r:rand(2,5),color}); }
function floater(text,x,y,color='#fffaf0'){ state.floaters.push({text,x,y,vy:-34,life:1.15,color}); }
function cartWorld(){ return {x:state.cart.x,y:state.dist + state.cart.y}; }
function rectCircle(cx,cy,cr,r){ const nx=clamp(cx,r.x-r.w/2,r.x+r.w/2), ny=clamp(cy,r.y-r.h/2,r.y+r.h/2); return (cx-nx)**2+(cy-ny)**2<cr**2; }
function collect(item){
  item.gone=true; const bonus=Math.round(item.v*state.combo); state.score+=bonus; state.combo=clamp(state.combo+.14,1,5); state.comboGrace=2.8; state.honk=clamp(state.honk+10,0,100); const sy=item.y-state.dist; burst(item.x,sy,item.coupon?'#f1e7a4':'#e6b934',14,150); floater(`${item.type} +${bonus}`,item.x,sy,item.coupon?'#fff0a0':'#ffd45d'); beep('pickup');
}
function scrape(hard=false){
  if(state.inv>0) return;
  state.combo=1; state.comboGrace=0; state.honk=clamp(state.honk-(hard?15:8),0,100); state.glow=hard?1:.45; state.inv=hard?1.1:.45; state.speed*=hard?.66:.84; state.cart.vx += rand(-180,180); burst(state.cart.x,state.cart.y,hard?'#ff6960':'#fffaf0',hard?26:12,hard?240:130); beep(hard?'crash':'scrape');
  if(hard){ state.damage--; message(state.damage>0?'HEAD-ON CEREAL EVENT. ONE WHEEL HAS FILED A NOTE.':'CART PRIVILEGES REVOKED. R TO RESTART.',2200); if(state.damage<=0) end(false); }
  else message('LIGHT SCRAPE. A CAN OF BEANS HAS LEFT THE GROUP CHAT.');
}
function honk(){
  if(!state.running || state.honk<100 || state.honkCd>0) return;
  state.honk=0; state.honkCd=1.4; state.glow=.35; if(state.learning) state.lessonHonked=true; beep('honk'); message('HONK! SMALL HAZARDS RESPECT THE CHROME GOOSE.',1600); burst(state.cart.x,state.cart.y,'#4fc3ad',24,210);
  const c=cartWorld();
  state.bands.forEach(b=>b.hazards.forEach(h=>{ if(!h.gone && Math.hypot(h.x-c.x,h.y-c.y)<175 && h.type!=='fog'){ h.gone=true; state.score+=75; floater('startled +75',h.x,h.y-state.dist,'#4fc3ad'); }}));
  state.melons.forEach(m=>{ if(Math.hypot(m.x-c.x,m.y-c.y)<185) m.vx += Math.sign(m.x-c.x||1)*220; });
}
function end(win){
  if(state.over) return; state.running=false; state.over=true; state.won=win;
  if(win){ state.score += Math.round(900 + state.damage*260 + state.combo*130); beep('finish'); message('CHECKOUT SCANNER SAYS: UNEXPECTED ITEM IN HERO AREA.',5000); }
  if(state.score>state.best){ state.best=state.score; sessionStorage.setItem('grocery-cart-downhill-best', String(Math.floor(state.best))); }
  updateHud();
}
function update(dt){
  if(!state.running) return;
  const c=state.cart; if(state.slowMo>0){ dt*=.55; state.slowMo-=dt; }
  const left=keys.has('arrowleft')||keys.has('a')||touch.left, right=keys.has('arrowright')||keys.has('d')||touch.right;
  const boost=keys.has('arrowup')||keys.has('w')||touch.boost, brake=keys.has('arrowdown')||keys.has('s')||touch.brake;
  c.drift=keys.has(' ')||keys.has('spacebar')||touch.drift; if(state.learning && c.drift) state.lessonDrift=true;
  let steer=(right?1:0)-(left?1:0); if(state.learning && steer) state.lessonSteered=true; if(state.learning && (boost||brake)) state.lessonSpeed=true; if(state.spin>0){ steer*=-.65; state.spin-=dt; }
  const targetSpeed = (boost?230:brake?112:178) + Math.min(130,state.dist*.0048);
  state.speed += (targetSpeed-state.speed)*(brake?.045:.025);
  const grip = c.drift?.965:.83, accel = c.drift?620:910;
  c.vx = c.vx*grip + steer*accel*dt; c.vx=clamp(c.vx,-430,430); c.x += c.vx*dt; c.tilt += ((c.vx/430)+(c.drift?steer*.55:0)-c.tilt)*.13;
  if(c.x<36||c.x>W-36){ c.x=clamp(c.x,36,W-36); c.vx*=-.35; scrape(false); }
  if(!state.learning) state.dist += state.speed*dt; state.worldY=state.dist;
  state.inv=Math.max(0,state.inv-dt); state.honkCd=Math.max(0,state.honkCd-dt); state.glow=Math.max(0,state.glow-dt*.6); state.fog=Math.max(0,state.fog-dt*.32); state.fogTimer-=dt;
  if(c.drift && Math.abs(c.vx)>85){ state.score += dt*14*state.combo; state.combo=clamp(state.combo+dt*.12,1,5); state.honk=clamp(state.honk+dt*4.5,0,100); if(Math.random()<.25) burst(c.x,c.y+20,'#fffaf0',1,70); }
  const cw=cartWorld();
  if(!state.learning) state.bands.forEach(b=>{
    b.items.forEach(it=>{ if(!it.gone && Math.hypot(it.x-cw.x,it.y-cw.y)<it.r+22) collect(it); });
    b.hazards.forEach(h=>{
      if(h.gone) return; const d=Math.hypot(h.x-cw.x,h.y-cw.y);
      if(h.type==='banana' && d<h.r+20){ h.gone=true; if(c.drift){ const sy=h.y-state.dist; state.score+=90; floater('banana drift +90',h.x,sy,'#ffd45d'); burst(h.x,sy,'#ffd45d',12,150); } else { state.spin=.8; scrape(false); message('BANANA ROTATION PROTOCOL. STEERING IS NOW ABSTRACT.'); } }
      if(h.type==='wet' && d<h.r+22){ c.vx*=1.025; state.speed*=.998; if(Math.random()<.12) burst(c.x,c.y+18,'#8fc8f0',2,90); }
      if(h.type==='gust' && Math.abs(h.y-cw.y)<50){ c.vx += h.dir*90*dt; if(Math.random()<.1) burst(c.x-h.dir*22,c.y,'#f1e7a4',1,50); }
      if(h.type==='fog' && Math.abs(h.y-cw.y)<90){ h.gone=true; state.fog=1; message('FREEZER FOG. THE NEXT AISLE IS BEING MODEST.'); }
    });
    b.blocks.forEach(r=>{
      const near = Math.abs(r.y-cw.y)<90 && Math.abs(r.x-cw.x)<r.w/2+42;
      if(near && !r.nearScored && !rectCircle(cw.x,cw.y,18,r)){ r.nearScored=true; state.score+=Math.round(38*state.combo); state.combo=clamp(state.combo+.08,1,5); state.honk=clamp(state.honk+5,0,100); state.slowMo=.18; floater('near miss',cw.x,cw.y-26,'#4fc3ad'); }
      if(rectCircle(cw.x,cw.y,20,r)){ scrape(Math.abs(c.vx)<80 || state.speed>315); c.x += Math.sign(cw.x-r.x||1)*34; }
    });
  });
  if(!state.learning) state.melons.forEach(m=>{ m.x += m.vx*dt; if(m.x<-70||m.x>W+70) m.vx*=-1; if(Math.hypot(m.x-cw.x,m.y-cw.y)<m.r+21){ m.vx*=-1; scrape(true); }});
  state.particles.forEach(p=>{ p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=90*dt; p.life-=dt; });
  state.floaters.forEach(f=>{ f.y+=f.vy*dt; f.life-=dt; });
  state.particles=state.particles.filter(p=>p.life>0); state.floaters=state.floaters.filter(f=>f.life>0);
  state.bands=state.bands.filter(b=>b.y>state.dist-260); state.melons=state.melons.filter(m=>m.y>state.dist-260 && m.y<state.dist+900);
  while(state.bands.length && state.bands[state.bands.length-1].y < state.dist+900 && state.bands[state.bands.length-1].y < state.trackLen) makeBand(state.bands[state.bands.length-1].y+150);
  if(state.comboGrace>0) state.comboGrace-=dt; else state.combo += (1-state.combo)*.018;
  state.status = c.drift?'skidding':state.spin>0?'spinning':boost?'reckless':brake?'braking':'rolling';
  if(state.dist>=state.trackLen) end(true);
  updateHud();
}
function updateHud(){
  $('score').textContent=Math.floor(state.score); $('best').textContent=Math.floor(state.best); $('combo').textContent=`x${state.combo.toFixed(1)}`; $('speed').textContent=Math.round(state.speed); $('damage').textContent='♥'.repeat(Math.max(0,state.damage))+'♡'.repeat(Math.max(0,3-state.damage)); $('distance').textContent=`${Math.max(0,Math.ceil((state.trackLen-state.dist)/28))}m`; $('honkBar').style.width=`${state.honk}%`; $('honkText').textContent=state.honk>=100?'ready':`${Math.floor(state.honk)}%`; $('status').textContent=state.over?(state.won?'checked out':'wrecked'):state.status;
}
function drawShelf(r,sy){ ctx.fillStyle=r.color; ctx.strokeStyle='#2b2118'; ctx.lineWidth=3; ctx.beginPath(); ctx.roundRect(r.x-r.w/2,sy-r.h/2,r.w,r.h,10); ctx.fill(); ctx.stroke(); ctx.fillStyle='rgba(255,255,255,.18)'; for(let x=r.x-r.w/2+15;x<r.x+r.w/2-8;x+=30) ctx.fillRect(x,sy-r.h/2+9,14,r.h-18); }
function draw(){
  ctx.save(); ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#5a4932'; ctx.fillRect(0,0,W,H); ctx.fillStyle='#6c5638'; for(let y=-(state.dist%84);y<H;y+=84){ ctx.fillRect(0,y+39,W,8); }
  ctx.strokeStyle='rgba(255,250,220,.18)'; ctx.lineWidth=2; ctx.setLineDash([12,18]); for(let x=95;x<W;x+=130){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); } ctx.setLineDash([]);
  if(!state.learning) state.bands.forEach(b=>{ const y=b.y-state.dist; if(y<-130||y>H+130) return; b.blocks.forEach(r=>drawShelf(r,y)); b.items.forEach(it=>{ if(it.gone) return; const iy=it.y-state.dist; ctx.save(); ctx.translate(it.x,iy); ctx.rotate(Math.sin(performance.now()/220+it.x)*.18); ctx.fillStyle=it.coupon?'#f1e7a4':'#e6b934'; ctx.strokeStyle='#2b2118'; ctx.lineWidth=2; ctx.beginPath(); if(it.coupon) ctx.roundRect(-15,-10,30,20,4); else ctx.ellipse(0,0,it.r*1.15,it.r*.86,0,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.fillStyle='#2b2118'; ctx.font='900 9px ui-sans-serif'; ctx.textAlign='center'; ctx.fillText(it.coupon?'¢':it.type[0],0,3); ctx.restore(); }); b.hazards.forEach(h=>{ if(h.gone) return; const hy=h.y-state.dist; ctx.save(); ctx.translate(h.x,hy); if(h.type==='banana'){ ctx.strokeStyle='#ffd45d'; ctx.lineWidth=6; ctx.beginPath(); ctx.arc(0,0,16,.2,2.7); ctx.stroke(); } else if(h.type==='wet'){ ctx.fillStyle='#8fc8f066'; ctx.beginPath(); ctx.ellipse(0,0,h.r*1.45,h.r*.72,.15,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#fffaf0'; ctx.font='900 10px ui-sans-serif'; ctx.textAlign='center'; ctx.fillText('WET',0,3); } else if(h.type==='gust'){ ctx.strokeStyle='#f1e7a4aa'; ctx.lineWidth=3; for(let i=-1;i<2;i++){ ctx.beginPath(); ctx.moveTo(-70,i*12); ctx.quadraticCurveTo(0,-22+i*12,70,i*12); ctx.stroke(); } } else if(h.type==='fog'){ ctx.fillStyle='#d9f0ff33'; ctx.fillRect(-W/2,-40,W,80); } ctx.restore(); }); });
  state.melons.forEach(m=>{ const y=m.y-state.dist; ctx.fillStyle='#5aa05e'; ctx.strokeStyle='#20351f'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(m.x,y,m.r,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.strokeStyle='#d7f2a0'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(m.x-3,y,m.r*.72,-1.2,1.2); ctx.arc(m.x+5,y,m.r*.75,1.9,4.4); ctx.stroke(); });
  if(state.trackLen-state.dist<520){ const y=state.trackLen-state.dist; ctx.fillStyle='#222'; ctx.fillRect(0,y-18,W,36); for(let x=0;x<W;x+=44){ ctx.fillStyle=(x/44)%2?'#fff':'#111'; ctx.fillRect(x,y-18,44,18); ctx.fillStyle=(x/44)%2?'#111':'#fff'; ctx.fillRect(x,y,44,18); } ctx.fillStyle='#4fc3ad'; ctx.font='900 28px ui-sans-serif'; ctx.textAlign='center'; ctx.fillText('CHECKOUT SCANNER FINISH',W/2,y-30); }
  const c=state.cart; ctx.save(); ctx.translate(c.x,c.y); ctx.rotate(c.tilt*.42); ctx.globalAlpha=state.inv>0 ?.72:1; ctx.strokeStyle='#1c1b18'; ctx.lineWidth=4; ctx.fillStyle='#d7d7cf'; ctx.beginPath(); ctx.roundRect(-30,-42,60,72,8); ctx.fill(); ctx.stroke(); ctx.strokeStyle='#1c1b18'; ctx.lineWidth=3; for(let x=-18;x<=18;x+=12){ ctx.beginPath(); ctx.moveTo(x,-34); ctx.lineTo(x,20); ctx.stroke(); } ctx.fillStyle='#ff765d'; ctx.beginPath(); ctx.moveTo(-34,-30); ctx.lineTo(34,-30); ctx.lineTo(24,-46); ctx.lineTo(-24,-46); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle='#222'; ctx.beginPath(); ctx.arc(-24,35,7,0,Math.PI*2); ctx.arc(24,35,7,0,Math.PI*2); ctx.fill(); ctx.restore();
  state.particles.forEach(p=>{ ctx.globalAlpha=clamp(p.life/p.max,0,1); ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; });
  state.floaters.forEach(f=>{ ctx.globalAlpha=clamp(f.life,0,1); ctx.fillStyle=f.color; ctx.font='900 17px ui-sans-serif,system-ui'; ctx.textAlign='center'; ctx.fillText(f.text,f.x,f.y); ctx.globalAlpha=1; });
  if(state.fog>0){ ctx.fillStyle=`rgba(220,240,255,${state.fog*.42})`; ctx.fillRect(0,0,W,H*.48); }
  if(state.glow>0){ ctx.fillStyle=`rgba(255,245,210,${state.glow*.10})`; ctx.fillRect(0,0,W,H); }
  if(performance.now()<state.captionTill || state.over){ ctx.fillStyle='rgba(25,22,18,.78)'; ctx.strokeStyle='rgba(255,255,255,.22)'; ctx.lineWidth=2; ctx.beginPath(); ctx.roundRect(115,18,670,50,16); ctx.fill(); ctx.stroke(); ctx.fillStyle='#fffaf0'; ctx.font='900 18px ui-sans-serif'; ctx.textAlign='center'; ctx.fillText(state.over ? `${state.won?'CHECKED OUT':'AISLE CLOSED'} · SCORE ${Math.floor(state.score)} · R TO RESTART` : state.caption, W/2,50); }
  ctx.restore();
}
function loop(now){ const dt=Math.min(.033,(now-state.last)/1000||.016); state.last=now; update(dt); updateLearning(); draw(); requestAnimationFrame(loop); }
window.addEventListener('keydown',e=>{ const k=e.key.toLowerCase(); if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k)) e.preventDefault(); keys.add(k); if(k==='z') honk(); if(k==='r') restart(); });
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
$('restart').addEventListener('click',restart); $('mute').addEventListener('click',()=>{ muted=!muted; $('mute').textContent=muted?'Sound off':'Sound on'; if(!muted) beep('tick'); });
function bind(id,prop){ const el=$(id); const on=e=>{e.preventDefault(); touch[prop]=true; canvas.focus();}; const off=e=>{e.preventDefault(); touch[prop]=false;}; el.addEventListener('pointerdown',on); el.addEventListener('pointerup',off); el.addEventListener('pointercancel',off); el.addEventListener('pointerleave',off); }
bind('touchLeft','left'); bind('touchRight','right'); bind('touchBoost','boost'); bind('touchBrake','brake'); bind('touchDrift','drift'); $('touchHonk').addEventListener('click',honk);
showStartMenu(); requestAnimationFrame(loop);
})();
