(() => {
'use strict';
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const stage = document.getElementById('stage');
const W = canvas.width, H = canvas.height;
const COLS = 6, ROWS = 5;
const marginX = 88, marginY = 86, gapX = (W - marginX * 2) / (COLS - 1), gapY = (H - marginY * 2) / (ROWS - 1);
const depts = [
  {key:'fireworks', label:'Fireworks Permit', icon:'✹', color:'#ef664c'},
  {key:'weather', label:'Weather Desk', icon:'☂', color:'#55a8e2'},
  {key:'hat', label:'Lost Hat Office', icon:'◠', color:'#d8b64f'},
  {key:'moon', label:'Moon Complaints', icon:'☾', color:'#ab84e8'},
  {key:'sandwich', label:'Sandwich Zoning', icon:'▰', color:'#64bd82'},
  {key:'reception', label:'Reception', icon:'◆', color:'#d28b35'}
];
const logs = ['Moon Complaints thanks you for escalating responsibly.','Sandwich Zoning has approved the diagonal rye variance.','Weather Desk says this drizzle is mostly clerical.','Lost Hat Office found one hat and three opinions.','Fireworks Permit whispers: sparkle within limits.','Reception stamps the air with concern.'];
const $ = id => document.getElementById(id);
const keys = new Set();
let muted = false, audio, state;
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function rand(a,b){return a+Math.random()*(b-a);}
function choice(a){return a[Math.floor(Math.random()*a.length)];}
function jackAt(c,r){return state.jacks.find(j=>j.c===c&&j.r===r);}
function jackPos(j){return {x:marginX + j.c*gapX, y:marginY + j.r*gapY};}
function makeJacks(){
  const j=[]; for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) j.push({id:`${c}-${r}`,c,r,type:'empty'});
  const fixed = [[0,0,0],[2,0,1],[4,0,2],[1,4,3],[3,4,4],[5,4,5]];
  fixed.forEach(([c,r,i])=>Object.assign(j.find(x=>x.c===c&&x.r===r),{type:'destination',dept:depts[i].key,label:depts[i].label,icon:depts[i].icon,color:depts[i].color}));
  Object.assign(j.find(x=>x.c===5&&x.r===2),{type:'hold',label:'Hold Music',icon:'♫',color:'#f5c66a'});
  return j;
}
function beep(type='ring'){
  if(muted) return;
  try{audio ||= new (window.AudioContext||window.webkitAudioContext)(); const t=audio.currentTime, o=audio.createOscillator(), g=audio.createGain(); o.connect(g); g.connect(audio.destination); o.type= type==='buzz'?'sawtooth':'triangle'; const f={ring:650,plug:190,buzz:90,spark:520,hold:330}[type]||250; o.frequency.setValueAtTime(f,t); if(type==='ring') o.frequency.setValueAtTime(f*1.28,t+.06); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(type==='spark'?.08:.05,t+.015); g.gain.exponentialRampToValueAtTime(.0001,t+(type==='buzz'?.28:.14)); o.start(t); o.stop(t+.32);}catch{}
}
function restart(){
  state = {running:true, over:false, start:performance.now(), last:performance.now(), score:0, best:state?.best||0, combo:0, strikes:0, spawn:.6, pressure:0, holdCd:0, shake:0, log:'CALLS ARE BEING TRANSFERRED WITH NORMAL AMOUNTS OF PANIC.', cursor:{c:2,r:2,slide:0,from:{c:2,r:2}}, carrying:null, calls:[], cords:[], sparks:[], float:[], jacks:makeJacks()};
  canvas.focus(); updateHud();
}
function freeIncomingJacks(){return state.jacks.filter(j=>j.type==='empty'&&!state.calls.some(c=>c.source===j.id));}
function spawnCall(){
  const free = freeIncomingJacks(); if(!free.length || state.calls.filter(c=>c.state==='ringing').length>=clamp(3+Math.floor(state.pressure/25),3,7)) return;
  const j = choice(free), dept = choice(depts.filter(d=>d.key!=='reception'));
  const priority = state.score>160 && Math.random()<Math.min(.34,state.pressure/180);
  Object.assign(j,{type:'incoming',callId:crypto.randomUUID(),dept:dept.key,label:dept.label,icon:dept.icon,color:dept.color});
  state.calls.push({id:j.callId,source:j.id,target:dept.key,state:'ringing',patience:priority?8.5:rand(8,13)-state.pressure*.025,maxPatience:priority?8.5:12,priority,step:priority?'reception':'final',hold:0,cord:null});
  state.log = priority ? 'Priority caller requests Reception, then something lunar-adjacent.' : `${dept.label} is ringing with municipal restraint.`; beep('ring');
}
function clearCall(call){
  const j=state.jacks.find(x=>x.id===call.source); if(j) Object.assign(j,{type:'empty',callId:null,dept:null,label:null,icon:null,color:null});
  state.calls = state.calls.filter(c=>c!==call); state.cords = state.cords.filter(c=>c.call!==call.id);
  if(state.carrying?.call===call.id) state.carrying=null;
}
function strike(msg){state.strikes++; state.combo=0; state.shake=.32; state.log=msg; beep('buzz'); if(state.strikes>=3){state.running=false; state.over=true; state.best=Math.max(state.best,state.score); state.log='SWITCHBOARD CLOSED FOR EMOTIONAL RE-CABLING. PRESS R.';} updateHud();}
function selectedJack(){return jackAt(state.cursor.c,state.cursor.r);}
function currentCallOnJack(j){return state.calls.find(c=>c.source===j.id);}
function beginCarry(call){if(state.sparks.some(s=>s.call===call.id)){strike('You grabbed a sparkling cord. The cord had notes.');return;} state.carrying={call:call.id,from:call.source}; state.log='Cord in hand. The town inhales.'; beep('plug');}
function finishCarry(j){
  const call = state.calls.find(c=>c.id===state.carrying.call); if(!call){state.carrying=null;return;}
  if(j.type==='hold') { call.state='hold'; call.hold=3.2; call.patience=Math.min(call.maxPatience,call.patience+2.2); state.cords.push({id:crypto.randomUUID(),call:call.id,a:call.source,b:j.id,color:'#f5c66a',hold:true}); state.carrying=null; state.combo=0; state.score+=5; state.log='Hold music applied. Combo filed under elevator jazz.'; beep('hold'); updateHud(); return; }
  if(j.type!=='destination'){state.log='That jack is mostly decorative right now.'; return;}
  const need = call.step==='reception'?'reception':call.target;
  if(j.dept!==need){strike('Wrong desk. A polite caller becomes a weather system.'); clearCall(call); state.carrying=null; return;}
  state.cords.push({id:crypto.randomUUID(),call:call.id,a:call.source,b:j.id,color:j.color,hold:false}); state.carrying=null; beep('plug');
  if(call.step==='reception'){call.step='final'; call.state='ringing'; call.patience=Math.min(call.maxPatience,call.patience+4); state.log='Reception confirms: now send them to the correct confusion.'; setTimeout(()=>{state.cords=state.cords.filter(c=>c.call!==call.id);},380); return;}
  const fast = call.patience / call.maxPatience; const gain = 25 + Math.floor(state.combo*8 + fast*20 + (call.priority?30:0)); state.score += gain; state.combo++; state.float.push({text:`+${gain}`,x:jackPos(j).x,y:jackPos(j).y,life:1,color:j.color}); state.log = choice(logs); call.state='connected'; call.settle=1.25; call.cord=state.cords[state.cords.length-1].id; state.cords[state.cords.length-1].done=true; updateHud();
}
function action(){
  if(!state.running) return; const j=selectedJack(); const sparking = state.sparks.some(s=>s.a===j.id||s.b===j.id); if(sparking){strike('Spark contact. The jack votes no.'); return;}
  if(state.carrying){finishCarry(j);return;}
  const cord = state.cords.find(c=>c.a===j.id||c.b===j.id); if(cord){if(cord.done){state.log='That connection is being celebrated by accounting.'; return;} state.cords=state.cords.filter(c=>c!==cord); const call=state.calls.find(c=>c.id===cord.call); if(call){call.state='ringing'; call.hold=0;} state.log='Cord reeled in. Spaghetti downgraded to linguine.'; beep('plug'); return;}
  const call=currentCallOnJack(j); if(call) beginCarry(call);
}
function tapHold(){const j=selectedJack(), call=currentCallOnJack(j); if(!state.running||state.holdCd>0||!call) return; call.hold=1.05; state.holdCd=3.2; state.log='“Please hold,” you say, with lawful sincerity.'; beep('hold'); updateHud();}
function move(dc,dr){if(!state.running)return; const old={c:state.cursor.c,r:state.cursor.r}; state.cursor.c=clamp(state.cursor.c+dc,0,COLS-1); state.cursor.r=clamp(state.cursor.r+dr,0,ROWS-1); if(old.c!==state.cursor.c||old.r!==state.cursor.r){state.cursor.from=old; state.cursor.slide=.11;}}
function updateHud(){$('score').textContent=state.score; $('best').textContent=state.best; $('combo').textContent=state.combo; $('strikes').textContent=Array.from({length:3},(_,i)=>i<state.strikes?'×':'○').join(' '); $('pressure').textContent=state.pressure<25?'calm':state.pressure<65?'busy':'rude'; $('holdcd').textContent=state.holdCd>0?state.holdCd.toFixed(1)+'s':'ready';}
function linesCross(a,b,c,d){function ccw(p,q,r){return (r.y-p.y)*(q.x-p.x)>(q.y-p.y)*(r.x-p.x);} return ccw(a,c,d)!==ccw(b,c,d)&&ccw(a,b,c)!==ccw(a,b,d);}
function updateSparks(dt){
  if(state.cords.length<3) return; let crossings=0; for(let i=0;i<state.cords.length;i++)for(let k=i+1;k<state.cords.length;k++){const A=jackPos(state.jacks.find(j=>j.id===state.cords[i].a)),B=jackPos(state.jacks.find(j=>j.id===state.cords[i].b)),C=jackPos(state.jacks.find(j=>j.id===state.cords[k].a)),D=jackPos(state.jacks.find(j=>j.id===state.cords[k].b)); if(linesCross(A,B,C,D)) crossings++;}
  if(crossings>1 && !state.sparks.length && Math.random()<dt*(.35+crossings*.12)){const cord=choice(state.cords); state.sparks.push({call:cord.call,a:cord.a,b:cord.b,t:1.5,p:0}); state.log='Cord spaghetti generated a tiny licensed spark.'; beep('spark');}
}
function update(dt,now){
  if(!state.running) return; state.pressure=(now-state.start)/1000; state.spawn-=dt; state.holdCd=Math.max(0,state.holdCd-dt); state.shake=Math.max(0,state.shake-dt); state.cursor.slide=Math.max(0,state.cursor.slide-dt); if(state.spawn<=0){spawnCall(); state.spawn=Math.max(.85,3.2-state.pressure*.035)*rand(.65,1.12);} updateSparks(dt);
  for(const s of state.sparks){s.t-=dt; s.p=(s.p+dt*.9)%1;} state.sparks=state.sparks.filter(s=>s.t>0);
  for(let i=state.calls.length-1;i>=0;i--){const c=state.calls[i]; if(c.state==='connected'){c.settle-=dt; if(c.settle<=0) clearCall(c); continue;} if(c.hold>0){c.hold-=dt; continue;} if(c.state==='hold') {c.state='ringing'; state.cords=state.cords.filter(x=>x.call!==c.id);}
    c.patience-=dt*(1+state.pressure*.004); if(c.patience<=0){strike(`${c.label || 'A caller'} expired politely but firmly.`); clearCall(c);} }
  for(let i=state.float.length-1;i>=0;i--){state.float[i].life-=dt; state.float[i].y-=42*dt; if(state.float[i].life<=0)state.float.splice(i,1);} updateHud();
}
function drawCord(a,b,color,live=false){const A=jackPos(state.jacks.find(j=>j.id===a)), B=jackPos(state.jacks.find(j=>j.id===b)); const midY=(A.y+B.y)/2+42; ctx.strokeStyle=color; ctx.lineWidth=live?7:6; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(A.x,A.y); ctx.quadraticCurveTo((A.x+B.x)/2,midY,B.x,B.y); ctx.stroke(); ctx.strokeStyle='#0005'; ctx.lineWidth=2; ctx.stroke();}
function draw(now){
  stage.classList.toggle('shake',state.shake>0); ctx.clearRect(0,0,W,H); ctx.fillStyle='#2a1b12'; ctx.fillRect(0,0,W,H); ctx.fillStyle='#4a2f1dcc'; ctx.fillRect(28,28,W-56,H-56); for(let x=56;x<W;x+=40){ctx.fillStyle=x%80?'#6b462b44':'#d6a15c22';ctx.fillRect(x,28,2,H-56)}
  for(const c of state.cords) drawCord(c.a,c.b,c.color); if(state.carrying){const A=jackPos(state.jacks.find(j=>j.id===state.carrying.from)); const cur=jackPos(selectedJack()); ctx.setLineDash([10,8]); drawCord(state.carrying.from,selectedJack().id,'#f8ead0',true); ctx.setLineDash([]);}
  for(const s of state.sparks){drawCord(s.a,s.b,'#fff07a',true); const A=jackPos(state.jacks.find(j=>j.id===s.a)), B=jackPos(state.jacks.find(j=>j.id===s.b)); const x=A.x+(B.x-A.x)*s.p, y=A.y+(B.y-A.y)*s.p; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(x,y,11+Math.sin(now/45)*5,0,Math.PI*2); ctx.fill();}
  for(const j of state.jacks){const p=jackPos(j); ctx.save(); ctx.translate(p.x,p.y); ctx.fillStyle='#1a100b'; ctx.beginPath(); ctx.arc(0,0,31,0,Math.PI*2); ctx.fill(); ctx.strokeStyle=j.color||'#b88952'; ctx.lineWidth= j.type==='empty'?3:5; ctx.stroke(); ctx.fillStyle=j.color||'#b88952'; ctx.globalAlpha=j.type==='incoming'&&(Math.floor(now/220)%2)? .48:1; ctx.beginPath(); ctx.arc(0,0,15,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; ctx.fillStyle='#fff8dc'; ctx.font='900 20px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(j.icon||'•',0,1); if(j.type==='incoming'){const call=currentCallOnJack(j); const pct=clamp(call.patience/call.maxPatience,0,1); ctx.strokeStyle=pct<.28?'#ff4b4b':'#fff3a4'; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(0,0,39,-Math.PI/2,-Math.PI/2+Math.PI*2*pct); ctx.stroke(); if(call.priority){ctx.fillStyle='#fff'; ctx.font='900 12px system-ui'; ctx.fillText(call.step==='reception'?'R':'!',25,-25);} } ctx.restore(); if(j.type!=='empty'){    const labelY = j.r===ROWS-1 ? p.y-48 : p.y+54; ctx.fillStyle='#fff5'; ctx.fillRect(p.x-56,labelY-15,112,22); ctx.fillStyle='#fff4d6'; ctx.font='800 11px system-ui'; ctx.textAlign='center'; ctx.fillText((j.type==='destination'||j.type==='hold')?j.label:(j.label||''),p.x,labelY);}}
  const c = state.cursor.slide>0 ? {c:state.cursor.from.c+(state.cursor.c-state.cursor.from.c)*(1-state.cursor.slide/.11), r:state.cursor.from.r+(state.cursor.r-state.cursor.from.r)*(1-state.cursor.slide/.11)} : state.cursor; const cp={x:marginX+c.c*gapX,y:marginY+c.r*gapY}; ctx.strokeStyle='#fff'; ctx.lineWidth=4; ctx.strokeRect(cp.x-49,cp.y-49,98,98); ctx.fillStyle='#ffe0a0'; ctx.font='900 32px system-ui'; ctx.fillText('☚',cp.x+24,cp.y-25);
  for(const f of state.float){ctx.globalAlpha=f.life; ctx.fillStyle=f.color; ctx.font='900 24px system-ui'; ctx.textAlign='center'; ctx.fillText(f.text,f.x,f.y); ctx.globalAlpha=1;}
  ctx.fillStyle='#120b07d9'; ctx.fillRect(44,H-58,W-88,34); ctx.fillStyle='#ffeac6'; ctx.font='900 15px system-ui'; ctx.textAlign='center'; ctx.fillText(state.log,W/2,H-36);
  if(state.over){ctx.fillStyle='#080503df'; ctx.fillRect(0,0,W,H); ctx.fillStyle='#fff0d0'; ctx.font='900 52px system-ui'; ctx.textAlign='center'; ctx.fillText('LINES DOWN',W/2,H/2-36); ctx.font='800 22px system-ui'; ctx.fillText(`Final ${state.score} · Best ${state.best}`,W/2,H/2+4); ctx.font='700 17px system-ui'; ctx.fillText('Press R or click Restart board',W/2,H/2+42);}
}
function frame(now){const dt=Math.min(.033,(now-state.last)/1000); state.last=now; update(dt,now); draw(now); requestAnimationFrame(frame);}
canvas.addEventListener('pointerdown',e=>{const r=canvas.getBoundingClientRect(), x=(e.clientX-r.left)*W/r.width, y=(e.clientY-r.top)*H/r.height; let bestJ=state.jacks[0], bestD=Infinity; for(const j of state.jacks){const p=jackPos(j), d=Math.hypot(p.x-x,p.y-y); if(d<bestD){bestD=d; bestJ=j;}} state.cursor.c=bestJ.c; state.cursor.r=bestJ.r; action(); canvas.focus();});
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase(); if(['arrowup','arrowdown','arrowleft','arrowright',' ','w','a','s','d','x','z'].includes(k)) e.preventDefault(); if(k==='r')restart(); if(k===' ' )action(); if(k==='x')tapHold(); if(k==='z')state.carrying=null; if(!keys.has(k)){ if(k==='arrowup'||k==='w')move(0,-1); if(k==='arrowdown'||k==='s')move(0,1); if(k==='arrowleft'||k==='a')move(-1,0); if(k==='arrowright'||k==='d')move(1,0);} keys.add(k);});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase())); $('restart').addEventListener('click',restart); $('mute').addEventListener('click',()=>{muted=!muted; $('mute').textContent=muted?'Sound off':'Sound on';});
restart(); requestAnimationFrame(frame);
})();
