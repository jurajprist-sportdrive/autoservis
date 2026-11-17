(()=>{'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api=()=>window.TomiAuth;
let jobs=[],sessions=[];
const types={inspection:'Obhliadka / diagnostika',work:'Práca na vozidle',test_drive:'Skúšobná jazda'};
const dur=n=>{n=Math.max(0,Number(n)||0);return Math.floor(n/3600)+' h '+Math.floor(n%3600/60)+' min';};
async function load(){const el=document.getElementById('app');if(!el)return;el.innerHTML='<div class="card">Načítavam prácu mechanika…</div>';
try{const [j,s]=await Promise.all([api().request('mechanic_jobs'),api().request('work_sessions')]);jobs=j.items||[];sessions=s.items||[];render();}catch(e){el.innerHTML='<div class="card" role="alert">'+esc(e.message)+'</div>';}}
function render(){if(location.hash!=='#mechanic')return;const el=document.getElementById('app');if(!el)return;
const active=sessions.find(x=>!x.ended_at);
el.innerHTML=`<div class="pagehead"><div><h1>MECHANIK · Moja práca</h1><p>Čas sa zaznamenáva na serveri. Pri odhlásení časovač beží ďalej.</p></div><button class="btn outline" id="meReload">Obnoviť</button></div>
<div class="card"><h3>${active?'Prebiehajúca práca':'Spustiť prácu'}</h3>${active?`<p><strong>${esc(active.job_number)} · ${esc(active.plate)}</strong><br>${esc(types[active.activity_type])}<br>Začiatok: ${esc(active.started_at)}</p><button class="btn" id="meStop">STOP</button>`:`<form id="meStart" class="me-form"><label>Zákazka<select name="job_id" required>${jobs.map(j=>`<option value="${j.id}">${esc(j.job_number)} · ${esc(j.plate)} · ${esc(j.make)} ${esc(j.model)}</option>`).join('')}</select></label><label>Typ činnosti<select name="activity_type">${Object.entries(types).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('')}</select></label><button class="btn" ${jobs.length?'':'disabled'}>ŠTART</button></form>`}</div>
<div class="card"><h3>Moje pridelené zákazky</h3><div class="tablewrap"><table><thead><tr><th>Zákazka</th><th>Vozidlo</th><th>Požiadavka</th></tr></thead><tbody>${jobs.map(j=>`<tr><td>${esc(j.job_number)}</td><td>${esc(j.plate)} · ${esc(j.make)} ${esc(j.model)}</td><td>${esc(j.customer_request)}</td></tr>`).join('')||'<tr><td colspan="3">Žiadne pridelené zákazky</td></tr>'}</tbody></table></div></div>
<div class="card"><h3>História práce</h3><div class="tablewrap"><table><thead><tr><th>Zákazka</th><th>Činnosť</th><th>Začiatok (UTC)</th><th>Koniec (UTC)</th><th>Trvanie</th></tr></thead><tbody>${sessions.map(s=>`<tr><td>${esc(s.job_number)} · ${esc(s.plate)}</td><td>${esc(types[s.activity_type])}</td><td>${esc(s.started_at)}</td><td>${esc(s.ended_at||'Prebieha')}</td><td>${esc(dur(s.duration_seconds))}</td></tr>`).join('')||'<tr><td colspan="5">Zatiaľ bez záznamov</td></tr>'}</tbody></table></div></div>`;
el.querySelector('#meReload').onclick=load;
const start=el.querySelector('#meStart');if(start)start.onsubmit=async e=>{e.preventDefault();const b=start.querySelector('button');b.disabled=true;try{await api().request('work_sessions','POST',{command:'start',job_id:Number(start.elements.job_id.value),activity_type:start.elements.activity_type.value});await load();}catch(x){alert(x.message);b.disabled=false;}};
const stop=el.querySelector('#meStop');if(stop)stop.onclick=async()=>{stop.disabled=true;try{await api().request('work_sessions','POST',{command:'stop'});await load();}catch(x){alert(x.message);stop.disabled=false;}};
}
function addNav(){const host=document.querySelector('.topbar .row:last-child')||document.querySelector('.topbar');if(!host||document.getElementById('mechanicLink'))return;const b=document.createElement('button');b.className='btn outline small';b.id='mechanicLink';b.textContent='MECHANIK';b.onclick=()=>{location.hash='#mechanic';load();};host.prepend(b);}
window.addEventListener('hashchange',()=>{if(location.hash==='#mechanic')load();});addNav();if(location.hash==='#mechanic')load();
})();