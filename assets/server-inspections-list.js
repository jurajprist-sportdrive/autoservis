(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&#39;'}[c]));
const api=()=>window.TomiAuth;
let seq=0;
const stateLabel={pending:'Čaká',approved:'Schválené',rejected:'Zamietnuté'};
const severityLabel={minor:'Drobná',major:'Vážna',critical:'Kritická'};
async function load(){
 const n=++seq, el=document.getElementById('app');
 if(location.hash!=='#inspections'||!el)return;
 el.innerHTML='<div class="pagehead"><h1>Obhliadky</h1></div><div class="card">Načítavam zákazky a obhliadky z MariaDB…</div>';
 try{
  const [jr,cr,vr]=await Promise.all([api().request('jobs'),api().request('customers'),api().request('vehicles')]);
  const jobs=jr.items||[],customers=cr.items||[],vehicles=vr.items||[];
  const results=await Promise.all(jobs.map(async j=>{
   try{const r=await api().request('inspection_findings&job_id='+encodeURIComponent(j.id));return {job:j,findings:r.items||[]}}
   catch(e){return {job:j,findings:[],error:e.message}}
  }));
  if(n!==seq||location.hash!=='#inspections')return;
  const cname=id=>customers.find(x=>String(x.id)===String(id))?.name||'—';
  const vehicle=id=>{const v=vehicles.find(x=>String(x.id)===String(id));return v?{plate:v.plate||v.license_plate||'—',title:[v.make,v.model].filter(Boolean).join(' ')||'—'}:{plate:'—',title:'—'}};
  el.innerHTML=`<div class="pagehead"><div><h1>Obhliadky</h1><p>Aktuálne údaje z MariaDB, bez testovacích záznamov prehliadača</p></div><button class="btn outline" id="obReload">Obnoviť</button></div><div class="card"><label>Vyhľadávanie <input id="obSearch" placeholder="Číslo, zákazník, EČV, vozidlo"></label><div class="tablewrap"><table><thead><tr><th>Číslo</th><th>Zákazník</th><th>EČV</th><th>Vozidlo</th><th>Obhliadka</th><th></th></tr></thead><tbody id="obRows">${results.map(({job:j,findings,error})=>`<tr><td>${esc(j.job_number)}</td><td>${esc(cname(j.customer_id))}</td><td>${esc(vehicle(j.vehicle_id).plate)}</td><td>${esc(vehicle(j.vehicle_id).title)}</td><td>${error?`<span style="color:#b91c1c">${esc(error)}</span>`:findings.length+' zistení'}</td><td><button class="btn small outline" data-ob="${esc(j.id)}">Otvoriť obhliadku</button></td></tr>`).join('')}</tbody></table></div>${jobs.length?'':'<p>V databáze nie sú zákazky.</p>'}</div>`;
  el.querySelector('#obReload').onclick=load;
  el.querySelector('#obSearch').oninput=e=>{const q=e.target.value.toLocaleLowerCase('sk');el.querySelectorAll('#obRows tr').forEach(r=>r.style.display=r.textContent.toLocaleLowerCase('sk').includes(q)?'':'none')};
  el.querySelectorAll('[data-ob]').forEach(b=>b.onclick=()=>open(results.find(x=>String(x.job.id)===b.dataset.ob),cname,vehicle));
 }catch(e){if(n===seq&&location.hash==='#inspections')el.innerHTML=`<div class="pagehead"><h1>Obhliadky</h1></div><div class="card" role="alert">Nepodarilo sa načítať MariaDB: ${esc(e.message)} <button class="btn outline" id="obRetry">Skúsiť znova</button></div>`,el.querySelector('#obRetry').onclick=load}
}
function open(rec,cname,vehicle){
 if(!rec)return;const j=rec.job;
 const overlay=document.createElement('div');overlay.className='sj-inspection-overlay';
 overlay.innerHTML=`<section class="sj-inspection-dialog" role="dialog" aria-modal="true"><header class="sj-inspection-head"><div><small>OBHLIADKA · ${esc(j.job_number)}</small><h2>${esc(vehicle(j.vehicle_id).title)} · ${esc(vehicle(j.vehicle_id).plate)}</h2><p>${esc(cname(j.customer_id))}</p></div><button class="btn outline" id="obClose">Zavrieť</button></header><div id="obBody">Načítavam…</div></section>`;
 document.body.append(overlay);overlay.querySelector('#obClose').onclick=()=>overlay.remove();
 const refresh=async()=>{
  const box=overlay.querySelector('#obBody');if(!box)return;
  try{
   const r=await api().request('inspection_findings&job_id='+encodeURIComponent(j.id)),findings=r.items||[];
   const reviewer=['admin','technician'].includes(api().user?.role);
   box.innerHTML=`<form id="obAdd" class="sj-inspection-form"><label>Popis závady<textarea name="description" rows="3" maxlength="3000" required></textarea></label><label>Závažnosť<select name="severity"><option value="minor">Drobná</option><option value="major">Vážna</option><option value="critical">Kritická</option></select></label><button class="btn">Pridať závadu</button></form><h3>Zistenia (${findings.length})</h3>${findings.map(f=>`<article class="sj-finding"><strong>${esc(f.description)}</strong><p>${esc(severityLabel[f.severity]||f.severity)} · ${esc(stateLabel[f.review_status]||f.review_status)}</p>${reviewer?`<div class="row wrap">${f.review_status==='approved'?`<button class="btn small" data-quote="${f.id}">+ Do cenovej ponuky</button>`:''}<button class="btn small" data-id="${f.id}" data-status="approved">Schváliť</button><button class="btn outline small" data-id="${f.id}" data-status="rejected">Zamietnuť</button></div>`:''}</article>`).join('')||'<p>Bez zistení.</p>'}<div class="sj-inspection-footer"><button class="btn outline" id="obOpenCP">Otvoriť CP vozidla</button></div>`;
   box.querySelector('#obOpenCP').onclick=()=>{overlay.remove();if(window.TomiOpenQuoteById)window.TomiOpenQuoteById(j.id);else alert('CP nie je načítaná. Obnov stránku.');};
   box.querySelector('#obAdd').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{await api().request('inspection_findings&job_id='+j.id,'POST',{description:e.target.elements.description.value,severity:e.target.elements.severity.value});await refresh()}catch(ex){alert(ex.message);b.disabled=false}};
   box.querySelectorAll('[data-quote]').forEach(btn=>btn.onclick=async()=>{
    const f=findings.find(x=>String(x.id)===btn.dataset.quote);if(!f)return;
    const kind=prompt('Typ položky: diel alebo praca','praca');if(kind===null)return;
    if(!['diel','praca'].includes(kind.trim().toLowerCase())){alert('Zadaj diel alebo praca');return}
    const description=prompt('Popis položky CP',f.description.slice(0,500));if(description===null||!description.trim())return;
    const val=prompt('Predajná cena za jednotku (€)','0');if(val===null)return;
    const price=Number(val.replace(',','.'));if(!Number.isFinite(price)||price<0){alert('Neplatná cena');return}
    btn.disabled=true;try{await api().request('inspection_to_quote','POST',{finding_id:Number(f.id),item_type:kind.trim().toLowerCase()==='diel'?'part':'labor',description:description.trim().slice(0,500),quantity:1,sale_unit_net:price});alert('Položka bola pridaná do CP.');await refresh()}catch(ex){alert(ex.message);btn.disabled=false}
   });
   box.querySelectorAll('[data-status]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await api().request('inspection_findings&job_id='+j.id+'&id='+b.dataset.id,'PUT',{status:b.dataset.status,review_note:''});await refresh()}catch(ex){alert(ex.message);b.disabled=false}});
  }catch(e){box.innerHTML='<p role="alert">'+esc(e.message)+'</p>'}
 };refresh();
}
window.inspections=()=>'<div class="card">Načítavam obhliadky z MariaDB…</div>';
window.addEventListener('hashchange',()=>{if(location.hash==='#inspections')setTimeout(load,0)});
document.addEventListener('click',e=>{if(e.target.closest('[data-page="inspections"]'))setTimeout(load,60)});
if(location.hash==='#inspections')setTimeout(load,100);
})();