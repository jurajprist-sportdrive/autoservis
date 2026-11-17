/* Version 36: parking and parts are exclusively API-backed. No localStorage fallback. */
(()=>{'use strict';
const state={jobs:null,customers:[],vehicles:[],requests:null,error:'',loading:false,updated:0};
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const label=(id,items,fields)=>{const x=items.find(v=>String(v.id)===String(id));return x?fields.map(k=>x[k]).filter(Boolean).join(' · '):'—'};
const inYard=j=>Number(j.vehicle_on_site)===1&&!['completed','not_realized','historical','cancelled'].includes(String(j.status||'').toLowerCase());
const openJob=id=>{location.hash='#jobs';const run=()=>{const b=[...document.querySelectorAll('[data-sj]')].find(x=>x.dataset.sj===String(id));if(b)b.click();else alert('Otvorte zákazku č. '+id+' v zozname zákaziek.');};setTimeout(run,700)};
window.tomiOpenYardJob=openJob;
function marker(){const nav=document.querySelector('.navlink[data-page="parts"]');if(!nav)return;nav.querySelector('.tomi-parts-marker')?.remove();nav.querySelector('.request-alert')?.remove();const triangle=nav.querySelector('.tomi-warning-triangle');if(!triangle)return;const count=triangle.querySelector('#tomi-parts-count');const n=state.requests===null?null:state.requests.length;nav.classList.toggle('tomi-urgent',n!==null&&n>0);nav.classList.toggle('tomi-clear',n===0);nav.classList.remove('tomi-parts-pending','tomi-parts-clear');if(count)count.textContent=n===null?'…':String(n);triangle.setAttribute('aria-label',n===null?'Načítavam požiadavky':n+' nevyriešených požiadaviek');}
function draw(){marker();const page=location.hash.slice(1);const app=document.getElementById('app');if(!app||!['parking','parts'].includes(page))return;
 if(state.error){app.innerHTML='<div class="card"><h2>Údaje zo servera nie sú dostupné</h2><p class="notice danger">'+safe(state.error)+'</p><p>Lokálne testovacie záznamy sa nezobrazujú.</p><button class="btn" id="yardRetry">Skúsiť znova</button></div>';app.querySelector('#yardRetry').onclick=()=>load(true);return;}
 if(!state.jobs||!state.requests){app.innerHTML='<div class="card">Načítavam údaje z MariaDB…</div>';return;}
 if(page==='parking'){
 const jobs=state.jobs.filter(inYard);app.innerHTML='<div class="pagehead"><div><h1>Vozidlá v areáli</h1><p>Len vozidlá označené ako prítomné v uložených zákazkách MariaDB</p></div><button class="btn outline small" id="yardRefresh">Obnoviť</button></div><div class="card"><h3>V areáli: '+jobs.length+' vozidiel</h3><div class="tablewrap"><table><thead><tr><th>Zákazka</th><th>Zákazník</th><th>Vozidlo / EČV</th><th>Stav</th><th></th></tr></thead><tbody>'+jobs.map(j=>'<tr><td>'+safe(j.job_number||j.id)+'</td><td>'+safe(label(j.customer_id,state.customers,['name']))+'</td><td>'+safe(label(j.vehicle_id,state.vehicles,['make','model','plate']))+'</td><td>'+safe(j.status)+'</td><td><button class="btn small outline" data-yard-job="'+safe(j.id)+'">Otvoriť zákazku</button></td></tr>').join('')+(jobs.length?'':'<tr><td colspan="5" class="empty">Momentálne nie sú evidované žiadne vozidlá v areáli.</td></tr>')+'</tbody></table></div></div>';
 app.querySelector('#yardRefresh').onclick=()=>load(true);app.querySelectorAll('[data-yard-job]').forEach(b=>b.onclick=()=>openJob(b.dataset.yardJob));
 }else{
 const rows=state.requests;app.innerHTML='<div class="pagehead"><div><h1>Požiadavky na diely</h1><p>Len nevyriešené požiadavky priradené k zákazkám v MariaDB</p></div><button class="btn outline small" id="yardRefresh">Obnoviť</button></div><div class="card"><div class="tablewrap"><table><thead><tr><th>Zákazka</th><th>Vozidlo</th><th>Požiadavka</th><th>Množstvo</th><th>Stav</th><th></th></tr></thead><tbody>'+rows.map(({job,r})=>'<tr><td>'+safe(job.job_number||job.id)+'</td><td>'+safe(label(job.vehicle_id,state.vehicles,['make','model','plate']))+'</td><td>'+safe(r.description||r.name)+'</td><td>'+safe(r.quantity??r.qty??'—')+'</td><td>'+safe(r.status||'Nová')+'</td><td><button class="btn small outline" data-yard-job="'+safe(job.id)+'">Otvoriť zákazku</button></td></tr>').join('')+(rows.length?'':'<tr><td colspan="6" class="empty">Žiadne nevyriešené požiadavky.</td></tr>')+'</tbody></table></div></div>';
 app.querySelector('#yardRefresh').onclick=()=>load(true);app.querySelectorAll('[data-yard-job]').forEach(b=>b.onclick=()=>openJob(b.dataset.yardJob));
 }
}
async function load(force=false){if(state.loading||!window.TomiAuth)return;if(!force&&Date.now()-state.updated<15000){draw();return}state.loading=true;state.error='';try{const api=window.TomiAuth.request;const [j,c,v]=await Promise.all(['jobs','customers','vehicles'].map(x=>api(x)));state.jobs=j.items||[];state.customers=c.items||[];state.vehicles=v.items||[];const reqs=await Promise.all(state.jobs.filter(job=>!['not_realized','historical','cancelled'].includes(String(job.status||'').toLowerCase())).map(async job=>{const r=await api('part_requests&job_id='+encodeURIComponent(job.id));return(r.items||[]).filter(x=>!['resolved','completed','cancelled','done','vybavené','zrušené'].includes(String(x.status||'').toLowerCase())).map(r=>({job,r}))}));state.requests=reqs.flat();state.updated=Date.now()}catch(e){state.jobs=null;state.requests=null;state.error=e.message||'Chyba načítania'}finally{state.loading=false;draw()}}
// Replace legacy local demo pages and their local-only counter.
window.parking=()=>'<div class="card">Načítavam vozidlá z MariaDB…</div>';
window.parts=()=>'<div class="card">Načítavam požiadavky z MariaDB…</div>';
window.tomiRefreshPartsAlert=()=>marker();
window.addEventListener('hashchange',()=>{setTimeout(()=>{if(['#parking','#parts'].includes(location.hash))draw();load(true)},40)});
window.addEventListener('tomi-yard-refresh',()=>load(true));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)load(true)});
setInterval(()=>{if(!document.hidden)load(true)},30000);
setTimeout(()=>load(true),500);
})();
