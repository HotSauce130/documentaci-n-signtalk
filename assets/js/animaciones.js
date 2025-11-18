const STORAGE_KEY="singtalk_racha";
const SESSIONS_KEY="singtalk_sessions";
const nivelNombres={facil:"Fácil",medio:"Medio",dificil:"Difícil"};
let stream;
function activarCamara(){ if(stream) return; if(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia){ navigator.mediaDevices.getUserMedia({ video:true, audio:false }).then(s=>{ stream=s; const v=document.getElementById('camara'); if(v){ v.srcObject=stream; v.play(); } }).catch(()=>{ alert('No se pudo activar la cámara'); }); } }
function detenerCamara(){ if(!stream) return; stream.getTracks().forEach(t=>t.stop()); stream=null; const v=document.getElementById('camara'); if(v) v.srcObject=null; }
const page=(()=>{ const p=(window.location.pathname||'').toLowerCase(); if(p.includes('facil.html')) return 'facil'; if(p.includes('medio.html')) return 'medio'; if(p.includes('dificil.html')) return 'dificil'; return null; })();
const palabrasMap={
  facil:["casa","pelota","vaso","libro"],
  medio:["agua","comida","trabajo","escuela"],
  dificil:["reloj","llave","teléfono","computadora"]
};
function nuevaPalabra(){ const el=document.getElementById('palabra'); if(!el||!page) return; const arr=palabrasMap[page]; if(!arr) return; const i=Math.floor(Math.random()*arr.length); el.textContent=arr[i]; }
const game={ inProgress:false, attempts:0, results:[], duration:90, countdown:3, timerId:null, countdownId:null, startTs:null, endTs:null };
function formatTime(s){ const m=Math.floor(s/60).toString().padStart(2,'0'); const sec=(s%60).toString().padStart(2,'0'); return `${m}:${sec}`; }
function setIconsDisabled(dis){ const icons=document.querySelectorAll('.icon-btn'); icons.forEach(b=>{ b.disabled=dis; }); const btnWord=document.getElementById('btn-palabra'); if(btnWord) btnWord.disabled=dis; }
function updateProgress(){ const el=document.getElementById('game-progress'); if(el) el.textContent=`${game.attempts}/10`; }
function updateTimer(){ const timerEl=document.getElementById('game-timer'); if(!timerEl||!game.inProgress) return; const elapsed=Math.floor((Date.now()-game.startTs)/1000); const rem=Math.max(0, game.duration - elapsed); timerEl.textContent=formatTime(rem); if(rem<=0){ endGame(); } }
function startGame(){ game.inProgress=true; game.attempts=0; game.results=[]; game.startTs=Date.now(); setIconsDisabled(false); nuevaPalabra(); updateProgress(); const timerEl=document.getElementById('game-timer'); if(timerEl) timerEl.textContent=formatTime(game.duration); game.timerId=setInterval(updateTimer,250); }
function showCountdown(){ const overlay=document.createElement('div'); overlay.className='countdown-overlay'; document.body.appendChild(overlay); let c=game.countdown; overlay.textContent=c; setIconsDisabled(true); game.countdownId=setInterval(()=>{ c--; if(c<=0){ clearInterval(game.countdownId); overlay.remove(); startGame(); } else { overlay.textContent=c; } },1000); }
function endGame(){ if(game.timerId){ clearInterval(game.timerId); game.timerId=null; } setIconsDisabled(true); game.inProgress=false; game.endTs=Date.now(); saveSession(); }
function saveSession(){ if(!page) return; try { const now=new Date(game.endTs||Date.now()); const fecha=now.toISOString().slice(0,10); const hora=now.toTimeString().slice(0,8); const record={ fecha, hora, nivel:page, aciertos: game.results.filter(Boolean).length, incorrectas: game.results.filter(v=>!v).length, resultados: game.results.slice(), inicio: new Date(game.startTs).toISOString(), fin: now.toISOString() }; const arr=JSON.parse(localStorage.getItem(SESSIONS_KEY)||'[]'); arr.push(record); localStorage.setItem(SESSIONS_KEY, JSON.stringify(arr)); } catch(e) {} }
function flash(ok){ const overlay=document.createElement('div'); overlay.className='flash-overlay '+(ok?'ok':'bad'); document.body.appendChild(overlay); overlay.addEventListener('animationend',()=>{ overlay.remove(); }); }
function evaluar(sel){ if(!game.inProgress) return; const el=document.getElementById('palabra'); if(!el) return; const palabra=el.textContent.trim().toLowerCase(); const ok=palabra===sel; flash(ok); game.results.push(ok); game.attempts++; updateProgress(); nuevaPalabra(); if(game.attempts>=10){ endGame(); } }
function renderRacha(){ const conts={ facil:document.getElementById('streak-list-facil'), medio:document.getElementById('streak-list-medio'), dificil:document.getElementById('streak-list-dificil') }; if(!conts.facil && !conts.medio && !conts.dificil) return; Object.values(conts).forEach(c=>{ if(c) c.innerHTML=''; }); let sessions=[]; try{ sessions=JSON.parse(localStorage.getItem(SESSIONS_KEY)||"[]"); }catch(e){ sessions=[]; }
  const grouped={ facil:[], medio:[], dificil:[] }; sessions.forEach(s=>{ if(grouped[s.nivel]) grouped[s.nivel].push(s); });
  Object.keys(grouped).forEach(k=>{ const cont=conts[k]; if(!cont) return; const list=grouped[k]; if(list.length===0){ const empty=document.createElement('div'); empty.className='streak-card'; empty.innerHTML=`<div class="day">Sin resultados en ${nivelNombres[k]}</div><div class="score-line">Juega este nivel para ver tus sesiones</div>`; cont.appendChild(empty); return; } list.forEach(s=>{ const card=document.createElement('div'); card.className='streak-card'; const squares=(s.resultados||[]).map(r=>`<span class="square ${r?'ok':'bad'}"></span>`).join(''); card.innerHTML=`<div class="day">${s.fecha} ${s.hora}</div><div class="level">${nivelNombres[k]}</div><div class="session-squares">${squares}</div>`; cont.appendChild(card); }); });
}
document.addEventListener('DOMContentLoaded',()=>{
  const btnCam=document.getElementById('btn-camara'); if(btnCam) btnCam.addEventListener('click',activarCamara);
  const btnStop=document.getElementById('btn-stop'); if(btnStop) btnStop.addEventListener('click',detenerCamara);
  const btnWord=document.getElementById('btn-palabra'); if(btnWord) btnWord.addEventListener('click',nuevaPalabra);
  const icons=document.querySelectorAll('.icon-btn'); if(icons&&icons.length){ icons.forEach(b=>b.addEventListener('click',()=>evaluar((b.dataset.word||'').toLowerCase()))); }
  if(page){ setIconsDisabled(true); const timerEl=document.getElementById('game-timer'); if(timerEl) timerEl.textContent=formatTime(game.duration); updateProgress(); showCountdown(); }
  renderRacha();
});
