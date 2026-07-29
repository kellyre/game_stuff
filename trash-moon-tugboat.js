(() => {
'use strict';
const canvas = document.getElementById('moon');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const $ = id => document.getElementById(id);
const keys = new Set();
const pointer = { x: W * .55, y: H * .5, active: false };
let muted = false, audio, state;
const types = {
  can: { r: 14, mass: .8, value: 15, color: '#77c6d7', name: 'TIN CAN' },
  chair: { r: 22, mass: 1.4, value: 32, color: '#d99b55', name: 'SLEEPY CHAIR' },
  fridge: { r: 28, mass: 2.7, value: 58, color: '#d8e4e8', name: 'ANCHOR FRIDGE' },
  satellite: { r: 21, mass: 1.7, value: 45, color: '#b7b2f4', name: 'SPARKING SATELLITE', electric: true },
  statue: { r: 24, mass: 2.1, value: 110, color: '#f2c955', name: 'MUNICIPAL STATUE', statue: true }
};
const messages = [
  'THE MAYORAL DOME PREFERS NOT TO BE SOFAED.',
  'COMPACTOR REPORTS: CHOMP WITH NOTES OF OZONE.',
  'A GULL FILES A GRIEVANCE WITH THE TOW UNION.',
  'THE MOON HARBOR NODS IN SANITARY APPROVAL.'
];
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function rand(a,b){return a + Math.random() * (b-a);}
function choice(a){return a[Math.floor(Math.random()*a.length)];}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function beep(kind='chomp'){
  if (muted) return;
  try{
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const t=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();
    o.connect(g); g.connect(audio.destination);
    o.type = kind === 'hurt' ? 'sawtooth' : kind === 'twang' ? 'square' : 'triangle';
    const f={hook:420,twang:150,chomp:90,cut:240,boost:310,hurt:70,clean:760}[kind]||330;
    o.frequency.setValueAtTime(f,t);
    if(kind==='boost') o.frequency.exponentialRampToValueAtTime(650,t+.12);
    if(kind==='clean') o.frequency.setValueAtTime(1120,t+.07);
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime((kind==='hurt'||kind==='twang') ? .075 : .045,t+.012);
    g.gain.exponentialRampToValueAtTime(.0001,t+(kind==='hurt' ? .28 : .18));
    o.start(t); o.stop(t+.32);
  }catch{}
}
function restart(){
  state={running:true,over:false,start:performance.now(),last:performance.now(),score:0,best:state?.best||0,combo:1,comboT:0,shield:100,spawn:1.7,gullSpawn:16,hookCd:0,shake:0,slow:0,
    player:{x:W*.45,y:H*.52,vx:0,vy:0,r:17,face:0,boost:0,boostCd:0,inv:0},
    debris:[],gulls:[],particles:[],hook:null,tether:null,message:'FIRST TEN SECONDS: HOOK A CAN, PANIC PROFESSIONALLY.',messageTill:performance.now()+2600};
  updateHud(); canvas.focus();
}
function updateHud(){
  $('score').textContent = state.score;
  $('best').textContent = state.best;
  $('combo').textContent = 'x' + state.combo;
  $('shield').textContent = Math.max(0, Math.round(state.shield)) + '%';
  $('boost').textContent = state.player.boostCd > 0 ? state.player.boostCd.toFixed(1)+'s' : 'ready';
  const t = state.tether ? state.tether.tension : 0;
  $('tension').textContent = t > 520 ? 'RED' : t > 280 ? 'taut' : state.tether ? 'tow' : 'loose';
}
function burst(x,y,color,n=15,speed=150){
  for(let i=0;i<n;i++) state.particles.push({x,y,vx:rand(-speed,speed),vy:rand(-speed,speed),life:rand(.32,.85),max:.85,r:rand(2,5),color});
}
function spawnDebris(){
  if(state.debris.length > 12) return;
  const elapsed=(performance.now()-state.start)/1000;
  let bag=['can','can','chair'];
  if(elapsed>16) bag.push('chair','fridge');
  if(elapsed>28) bag.push('satellite');
  if(elapsed>52) bag.push('statue');
  const key=choice(bag), t=types[key], fromTop=Math.random()<.48;
  const x=fromTop?rand(70,W-70):rand(-40,W+40), y=fromTop?-35:rand(70,H-70);
  const dome={x:90,y:H*.52};
  const a=Math.atan2(dome.y-y,dome.x-x)+rand(-.42,.42);
  state.debris.push({id:Math.random(),type:key,x,y,vx:Math.cos(a)*rand(25,62),vy:Math.sin(a)*rand(25,62),r:t.r,mass:t.mass,value:t.value,color:t.color,spin:rand(-2,2),rot:rand(0,7),spark:0,warn:rand(1.5,3.2),attached:false});
}
function spawnGull(){
  const left=Math.random()<.5;
  state.gulls.push({x:left?-35:W+35,y:rand(80,H-80),vx:left?rand(70,105):-rand(70,105),vy:rand(-12,12),r:16,flap:rand(0,7)});
}
function fireHook(){
  if(!state.running || state.hook || state.tether || state.hookCd>0) return;
  const p=state.player, a=Math.atan2(pointer.y-p.y,pointer.x-p.x); p.face=a;
  state.hook={x:p.x+Math.cos(a)*24,y:p.y+Math.sin(a)*24,vx:Math.cos(a)*660,vy:Math.sin(a)*660,life:.62,r:8};
  state.hookCd=.28; beep('hook'); burst(p.x+Math.cos(a)*19,p.y+Math.sin(a)*19,'#d8f6ff',5,85);
}
function cutTether(msg='CABLE CUT. THE TOW OFFICE LOOKS AWAY.'){
  if(!state.tether) return;
  const d=state.tether.obj; d.attached=false; burst(d.x,d.y,'#f6efe0',10,120); state.tether=null; state.message=msg; state.messageTill=performance.now()+900; beep('cut'); updateHud();
}
function boost(){
  const p=state.player;
  if(!state.running || p.boostCd>0) return;
  const a=p.face; p.vx += Math.cos(a)*360; p.vy += Math.sin(a)*360; p.boost=.22; p.boostCd=4.5; state.shake=.12;
  burst(p.x-Math.cos(a)*14,p.y-Math.sin(a)*14,'#f6f0bd',24,220); beep('boost'); updateHud();
}
function damage(amount,msg){
  state.shield -= amount; state.combo=1; state.comboT=0; state.shake=.32; state.message=msg; state.messageTill=performance.now()+1300; beep('hurt'); updateHud();
  if(state.shield<=0){state.running=false;state.over=true;state.best=Math.max(state.best,state.score);state.message='DOME BONKED INTO NEXT WEEK. PRESS R.';state.messageTill=Infinity;}
}
function compact(d){
  const mouth={x:W-83,y:H-104,w:104,h:110};
  if(d.x+d.r<mouth.x-mouth.w/2||d.x-d.r>mouth.x+mouth.w/2||d.y+d.r<mouth.y-mouth.h/2||d.y-d.r>mouth.y+mouth.h/2) return false;
  const speed=Math.hypot(d.vx,d.vy), center=Math.abs(d.y-mouth.y)<23, mult=1+Math.min(2.4,speed/260);
  let gain=Math.round(d.value*mult*state.combo + (center?35:0));
  state.score += gain; state.combo=Math.min(9,state.combo+1); state.comboT=3.6;
  state.message=center?'CLEAN SHOT. THE CHOMP BOWS SLIGHTLY.':choice(messages);
  state.messageTill=performance.now()+1150; burst(d.x,d.y,d.color,center?34:22,230); beep(center?'clean':'chomp'); updateHud(); return true;
}
function update(dt,now){
  if(!state.running) return;
  const elapsed=(now-state.start)/1000, p=state.player;
  state.hookCd=Math.max(0,state.hookCd-dt); p.boost=Math.max(0,p.boost-dt); p.boostCd=Math.max(0,p.boostCd-dt); p.inv=Math.max(0,p.inv-dt);
  state.comboT=Math.max(0,state.comboT-dt); if(state.comboT===0) state.combo=1;
  let ax=(keys.has('arrowright')||keys.has('d')?1:0)-(keys.has('arrowleft')||keys.has('a')?1:0);
  let ay=(keys.has('arrowdown')||keys.has('s')?1:0)-(keys.has('arrowup')||keys.has('w')?1:0);
  const len=Math.hypot(ax,ay)||1; ax/=len; ay/=len;
  p.vx += ax*260*dt; p.vy += ay*260*dt; p.vx*=Math.pow(.28,dt); p.vy*=Math.pow(.28,dt);
  const sp=Math.hypot(p.vx,p.vy), max=p.boost?520:245; if(sp>max){p.vx=p.vx/sp*max;p.vy=p.vy/sp*max;}
  if(ax||ay) p.face=Math.atan2(ay,ax); else p.face=Math.atan2(pointer.y-p.y,pointer.x-p.x);
  p.x+=p.vx*dt; p.y+=p.vy*dt;
  if(p.x<p.r){p.x=p.r;p.vx=Math.abs(p.vx)*.72} if(p.x>W-p.r){p.x=W-p.r;p.vx=-Math.abs(p.vx)*.72} if(p.y<p.r){p.y=p.r;p.vy=Math.abs(p.vy)*.72} if(p.y>H-p.r){p.y=H-p.r;p.vy=-Math.abs(p.vy)*.72}
  state.spawn-=dt; if(state.spawn<=0){spawnDebris();state.spawn=(elapsed<10?2.2:Math.max(.55,1.55-elapsed*.014))*rand(.82,1.17)}
  state.gullSpawn-=dt; if(state.gullSpawn<=0){spawnGull();state.gullSpawn=elapsed<30?11:rand(5.5,8.5)}
  if(state.hook){const h=state.hook;h.x+=h.vx*dt;h.y+=h.vy*dt;h.life-=dt;let hit=null;for(const d of state.debris){if(Math.hypot(h.x-d.x,h.y-d.y)<h.r+d.r){hit=d;break;}} if(hit){hit.attached=true;state.tether={obj:hit,len:Math.max(62,dist(p,hit)),tension:0,snap:.75};state.hook=null;state.shake=.11;state.message=types[hit.type].name+' ON THE LINE.';state.messageTill=now+1000;beep('twang')} else if(h.life<=0||h.x<0||h.x>W||h.y<0||h.y>H) state.hook=null;}
  if(state.tether){const d=state.tether.obj;if(keys.has(' ')||pointer.active) state.tether.len=Math.max(42,state.tether.len-72*dt);let dx=d.x-p.x,dy=d.y-p.y,di=Math.hypot(dx,dy)||1,ex=di-state.tether.len;state.tether.tension=Math.max(0,ex*7);if(ex>0){const nx=dx/di,ny=dy/di,f=ex*4.8;d.vx-=nx*f/d.mass*dt*55;d.vy-=ny*f/d.mass*dt*55;p.vx+=nx*f*dt*25;p.vy+=ny*f*dt*25;} if(state.tether.tension>590) state.tether.snap-=dt; else state.tether.snap=.75; if(state.tether.snap<=0) cutTether('CABLE SNAPPED. EVERYONE PRETENDS THAT WAS PLANNED.'); if(d.spark>0&&d.warn<0) damage(5,'LIVE TETHER. THE DOME SAW SPARKS IN COURT.');}
  for(let i=state.debris.length-1;i>=0;i--){const d=state.debris[i];d.x+=d.vx*dt;d.y+=d.vy*dt;d.rot+=d.spin*dt; if(!d.attached){d.vx*=Math.pow(.992,dt*60);d.vy*=Math.pow(.992,dt*60);} if(types[d.type].electric){d.warn-=dt;if(d.warn<0){d.spark=.65;d.warn=rand(2.4,3.8);} d.spark=Math.max(0,d.spark-dt);} if(d.x<-70||d.x>W+70||d.y<-70||d.y>H+70){state.debris.splice(i,1);continue;} if(compact(d)){if(state.tether?.obj===d)state.tether=null;state.debris.splice(i,1);continue;} const dome={x:92,y:H*.52,r:64}; if(Math.hypot(d.x-dome.x,d.y-dome.y)<d.r+dome.r){state.debris.splice(i,1);if(state.tether?.obj===d)state.tether=null;damage(8+d.mass*7,'DOME BONK. RESIDENTS SAW A '+types[d.type].name+'.');continue;} if(Math.hypot(d.x-p.x,d.y-p.y)<d.r+p.r&&!p.inv){p.inv=.9;damage(d.type==='can'?4:9,'TUG COLLISION. YOUR LICENSE SQUEAKED.');}}
  for(let i=state.gulls.length-1;i>=0;i--){const g=state.gulls[i];let target=state.tether?.obj||p;const a=Math.atan2(target.y-g.y,target.x-g.x);g.vx+=Math.cos(a)*35*dt;g.vy+=Math.sin(a)*35*dt;g.x+=g.vx*dt;g.y+=g.vy*dt;if(g.x<-80||g.x>W+80)state.gulls.splice(i,1);else if(state.tether&&Math.hypot(g.x-state.tether.obj.x,g.y-state.tether.obj.y)<g.r+state.tether.obj.r){state.gulls.splice(i,1);state.combo=1;cutTether('SPACE GULL STOLE THE TOW LINE. RUDE BUT LEGAL.')}else if(Math.hypot(g.x-p.x,g.y-p.y)<g.r+p.r&&!p.inv){state.gulls.splice(i,1);p.inv=.9;damage(6,'SPACE GULL CONTACT. FEATHERS IN THE INVOICE.');}}
  for(let i=state.particles.length-1;i>=0;i--){const v=state.particles[i];v.x+=v.vx*dt;v.y+=v.vy*dt;v.vx*=.985;v.vy*=.985;v.life-=dt;if(v.life<=0)state.particles.splice(i,1)}
  state.shake=Math.max(0,state.shake-dt); updateHud();
}
function drawDebris(d,now){ctx.save();ctx.translate(d.x,d.y);ctx.rotate(d.rot);ctx.fillStyle=d.color;ctx.strokeStyle='#101923';ctx.lineWidth=4;if(d.type==='can'){ctx.fillRect(-d.r*.8,-d.r,d.r*1.6,d.r*2);ctx.strokeRect(-d.r*.8,-d.r,d.r*1.6,d.r*2);ctx.fillStyle='#101923';ctx.fillRect(-8,-3,16,6)}else if(d.type==='chair'){ctx.fillRect(-20,-5,40,28);ctx.fillRect(-24,-23,14,25);ctx.strokeRect(-20,-5,40,28);ctx.strokeRect(-24,-23,14,25)}else if(d.type==='fridge'){ctx.fillRect(-20,-30,40,60);ctx.strokeRect(-20,-30,40,60);ctx.beginPath();ctx.moveTo(-20,-5);ctx.lineTo(20,-5);ctx.stroke()}else if(d.type==='satellite'){ctx.fillRect(-15,-12,30,24);ctx.strokeRect(-15,-12,30,24);ctx.fillRect(-48,-8,26,16);ctx.fillRect(22,-8,26,16);if(d.spark>.15||d.warn<.75){ctx.strokeStyle=d.warn<.75?'#fff176':'#85f1ff';ctx.beginPath();ctx.arc(0,0,32+Math.sin(now/300)*5,0,Math.PI*2);ctx.stroke();}}else{ctx.beginPath();ctx.moveTo(0,-28);ctx.lineTo(22,16);ctx.lineTo(-22,16);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#101923';ctx.font='900 14px system-ui';ctx.textAlign='center';ctx.fillText('M',0,7)}ctx.restore();}
function draw(now){
  ctx.clearRect(0,0,W,H);const s=state.shake*12;ctx.save();ctx.translate(rand(-s,s),rand(-s,s));
  ctx.fillStyle='#101923';ctx.fillRect(0,0,W,H);ctx.fillStyle='#162536';for(let i=0;i<80;i++){const x=(i*137)%W,y=(i*71)%H;ctx.globalAlpha=.35+((i%4)*.12);ctx.fillRect(x,y,2,2)}ctx.globalAlpha=1;
  ctx.fillStyle='#26343a';ctx.beginPath();ctx.arc(92,H*.52,82,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#566973';ctx.lineWidth=4;ctx.stroke();ctx.fillStyle='#9dd4e6aa';ctx.beginPath();ctx.arc(92,H*.52,64,Math.PI*.88,Math.PI*2.12);ctx.fill();ctx.strokeStyle=state.shield<35?'#ff6b5c':'#c9f1ff';ctx.stroke();ctx.fillStyle='#f2dca0';ctx.font='900 14px system-ui';ctx.textAlign='center';ctx.fillText('GLASS-DOMED',92,H*.52-5);ctx.fillText('TOWN',92,H*.52+13);
  ctx.save();ctx.translate(W-83,H-104);ctx.fillStyle='#2a2d33';ctx.fillRect(-58,-60,116,120);ctx.strokeStyle='#ff835d';ctx.lineWidth=6;ctx.strokeRect(-58,-60,116,120);ctx.fillStyle='#ff835d';ctx.font='900 19px system-ui';ctx.fillText('CHOMP',0,-72);for(let y=-45;y<=45;y+=30){ctx.fillStyle='#101923';ctx.beginPath();ctx.moveTo(-50,y-11);ctx.lineTo(-29,y);ctx.lineTo(-50,y+11);ctx.fill();ctx.beginPath();ctx.moveTo(50,y-11);ctx.lineTo(29,y);ctx.lineTo(50,y+11);ctx.fill();}ctx.restore();
  for(const d of state.debris)drawDebris(d,now);
  for(const g of state.gulls){ctx.save();ctx.translate(g.x,g.y);ctx.scale(g.vx<0?-1:1,1);ctx.strokeStyle='#f4f0df';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-15,0);ctx.quadraticCurveTo(-4,-13,8,0);ctx.quadraticCurveTo(20,-13,31,0);ctx.stroke();ctx.fillStyle='#f4f0df';ctx.beginPath();ctx.arc(0,3,8,0,Math.PI*2);ctx.fill();ctx.restore();}
  if(state.hook){ctx.strokeStyle='#c9f1ff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(state.player.x,state.player.y);ctx.lineTo(state.hook.x,state.hook.y);ctx.stroke();ctx.fillStyle='#e9fdff';ctx.beginPath();ctx.arc(state.hook.x,state.hook.y,state.hook.r,0,Math.PI*2);ctx.fill();}
  if(state.tether){const d=state.tether.obj,t=state.tether.tension;ctx.strokeStyle=t>520?'#ff544e':t>280?'#f0c65d':'#e9fdff';ctx.lineWidth=t>520?5:3;ctx.setLineDash(t>520?[10,7]:[]);ctx.beginPath();ctx.moveTo(state.player.x,state.player.y);ctx.lineTo(d.x,d.y);ctx.stroke();ctx.setLineDash([]);}
  const p=state.player,a=p.face;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(a);ctx.globalAlpha=p.inv&&Math.floor(now/90)%2?.45:1;ctx.fillStyle=p.boost?'#fff6bd':'#62c7da';ctx.beginPath();ctx.moveTo(25,0);ctx.lineTo(-18,-14);ctx.lineTo(-13,0);ctx.lineTo(-18,14);ctx.closePath();ctx.fill();ctx.strokeStyle='#101923';ctx.lineWidth=4;ctx.stroke();ctx.fillStyle='#ff835d';ctx.fillRect(2,-5,18,10);if(Math.hypot(p.vx,p.vy)>35){ctx.fillStyle='#f0c65d';ctx.beginPath();ctx.moveTo(-18,0);ctx.lineTo(-34,-8);ctx.lineTo(-30,0);ctx.lineTo(-34,8);ctx.fill();}ctx.restore();
  const aim=Math.atan2(pointer.y-p.y,pointer.x-p.x);ctx.strokeStyle='#fff8';ctx.lineWidth=2;ctx.beginPath();ctx.arc(pointer.x,pointer.y,13,0,Math.PI*2);ctx.moveTo(pointer.x-21,pointer.y);ctx.lineTo(pointer.x-8,pointer.y);ctx.moveTo(pointer.x+8,pointer.y);ctx.lineTo(pointer.x+21,pointer.y);ctx.moveTo(pointer.x,pointer.y-21);ctx.lineTo(pointer.x,pointer.y-8);ctx.moveTo(pointer.x,pointer.y+8);ctx.lineTo(pointer.x,pointer.y+21);ctx.stroke();
  for(const v of state.particles){ctx.globalAlpha=Math.max(0,v.life/v.max);ctx.fillStyle=v.color;ctx.beginPath();ctx.arc(v.x,v.y,v.r,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
  if(state.messageTill>now){ctx.fillStyle='#0b121bdc';ctx.fillRect(W/2-255,H-78,510,48);ctx.fillStyle='#fff';ctx.font='900 15px system-ui';ctx.textAlign='center';ctx.fillText(state.message,W/2,H-48)}
  if(state.over){ctx.fillStyle='#071018df';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='900 50px system-ui';ctx.textAlign='center';ctx.fillText('DOME BONKED',W/2,H/2-38);ctx.font='800 22px system-ui';ctx.fillText('Final score: '+state.score+'  ·  Best: '+state.best,W/2,H/2+4);ctx.font='700 17px system-ui';ctx.fillText('Press R or Restart tow',W/2,H/2+42)}
  ctx.restore();
}
function frame(now){const dt=Math.min(.033,(now-state.last)/1000);state.last=now;update(dt,now);draw(now);requestAnimationFrame(frame);}
function point(e){const r=canvas.getBoundingClientRect();pointer.x=(e.clientX-r.left)*W/r.width;pointer.y=(e.clientY-r.top)*H/r.height;}
canvas.addEventListener('pointermove',point);
canvas.addEventListener('pointerdown',e=>{point(e);pointer.active=true;if(state.tether){}else fireHook();canvas.setPointerCapture?.(e.pointerId);});
window.addEventListener('pointerup',()=>{pointer.active=false;});
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' ','w','a','s','d','shift','z'].includes(k))e.preventDefault();if(k===' '&&!keys.has(' ')){if(state.tether){}else fireHook();}if(k==='z')cutTether();if(k==='shift')boost();if(k==='r')restart();keys.add(k);});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
$('restart').addEventListener('click',restart);
$('mute').addEventListener('click',()=>{muted=!muted;$('mute').textContent=muted?'Sound off':'Sound on';});
$('touchHook').addEventListener('pointerdown',e=>{e.preventDefault();pointer.active=true;if(!state.tether)fireHook();});
$('touchHook').addEventListener('pointerup',()=>{pointer.active=false;});
$('touchCut').addEventListener('click',()=>cutTether());
$('touchBoost').addEventListener('click',boost);
restart();requestAnimationFrame(frame);
})();
