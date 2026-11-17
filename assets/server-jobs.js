/* Server-side jobs MVP: never fall back to local storage. */
(()=>{
'use strict';
const api=()=>window.TomiAuth;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
let data={jobs:[],customers:[],vehicles:[]},busy=false,err='',ready=false;
const when=()=>new Date().toLocaleString('sv-SE',{hour12:false}).replace(' ','T').slice(0,16);
const dateSql=x=>x?x.replace('T',' ')+':00':null;
const name=id=>data.customers.find(x=>String(x.id)===String(id))?.name||'—';
const car=id=>{const v=data.vehicles.find(x=>String(x.id)===String(id));return v?`${v.make||''} ${v.model||''} · ${v.plate||''}`:'—'};
async function load(){
 if(busy)return;busy=true;err='';
 try{
  const [j,c,v]=await Promise.all(['jobs','customers','vehicles'].map(x=>api().request(x)));
  data={jobs:j.items||[],customers:c.items||[],vehicles:v.items||[]};ready=true;
 }catch(e){err=e.message;ready=false}
 finally{busy=false;renderServer();renderIntake();renderQuotes()}
}
function renderServer(){
 if(location.hash!=='#jobs')return;
 const target=document.getElementById('app');if(!target)return;
 target.innerHTML=`<div class="pagehead"><div><h1>Servisné zákazky</h1><p>Zákazky v databáze Websupport – prvá fáza</p></div><div class="actions"><button class="btn outline" id="sjReload">Obnoviť</button><button class="btn" id="sjNew">+ Nová zákazka</button></div></div>${err?`<div class="card" style="color:#b91c1c">${esc(err)}. Lokálne zákazky sa z bezpečnostných dôvodov nezobrazujú.</div>`:''}${busy?'<div class="card">Načítavam…</div>':!ready?'<div class="card">Záznamy sa nepodarilo načítať.</div>':`<div class="card"><div class="tablewrap"><table><thead><tr><th>Číslo</th><th>Prijatie</th><th>Zákazník</th><th>Vozidlo</th><th>Stav</th><th></th></tr></thead><tbody>${data.jobs.map(j=>`<tr><td>${esc(j.job_number)}</td><td>${esc(j.received_at)}</td><td>${esc(name(j.customer_id))}</td><td>${esc(car(j.vehicle_id))}</td><td>${esc(j.status)}</td><td><button class="btn small outline" data-sj="${j.id}">Otvoriť</button></td></tr>`).join('')}</tbody></table>${!data.jobs.length?'<p>Žiadne zákazky v databáze.</p>':''}</div></div>`}`;
 target.querySelector('#sjReload')?.addEventListener('click',load);
 target.querySelector('#sjNew')?.addEventListener('click',()=>edit());
 target.querySelectorAll('[data-sj]').forEach(b=>b.addEventListener('click',()=>details(data.jobs.find(x=>String(x.id)===b.dataset.sj))));
}


async function openQuote(job){
 if(!job)return;
 const overlay=document.createElement('div');overlay.className='sj-inspection-overlay';
 overlay.innerHTML=`<section class="sj-inspection-dialog sj-quote-dialog" role="dialog" aria-modal="true" aria-label="Cenová ponuka"><header class="sj-inspection-head"><div><small>CENOVÁ PONUKA · ${esc(job.job_number)}</small><h2>${esc(car(job.vehicle_id))}</h2><p>${esc(name(job.customer_id))}</p></div><button class="btn outline" id="sqClose">Zavrieť</button></header><div id="sqContent">Načítavam CP z databázy…</div></section>`;
 document.body.append(overlay);overlay.querySelector('#sqClose').onclick=()=>overlay.remove();overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
 const content=overlay.querySelector('#sqContent');
 async function refresh(){
  try{
   const r=await api().request('job_items&job_id='+encodeURIComponent(job.id));
   const items=(r.items||[]).filter(i=>i.section==='quote');
   const company=job.work_order_mode==='company';
   const money=n=>Number(n||0).toLocaleString('sk-SK',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
   const sum=items.reduce((v,i)=>v+Number(i.quantity)*Number(i.sale_unit_net),0);
   content.innerHTML=`<p>Táto cenová ponuka patrí k vozidlu a číslu <strong>${esc(job.job_number)}</strong>. Uložené položky sa načítavajú z MariaDB.</p><div class="tablewrap"><table><thead><tr><th>Typ</th><th>Popis</th><th>Množstvo</th><th>Cena / MJ ${company?'bez DPH':''}</th><th>Spolu</th><th></th></tr></thead><tbody>${items.map(i=>`<tr><td>${i.item_type==='part'?'Diel':'Práca'}</td><td>${esc(i.description)}</td><td>${esc(i.quantity)} ${esc(i.unit)}</td><td>${money(i.sale_unit_net)}</td><td>${money(Number(i.quantity)*Number(i.sale_unit_net))}</td><td><button class="btn outline small" data-qi="${i.id}">Upraviť</button></td></tr>`).join('')}</tbody></table></div><p><strong>Spolu ${company?'bez DPH':''}: ${money(sum)}</strong></p><div class="row wrap" style="gap:10px"><button class="btn" id="sqAdd">+ Pridať položku CP</button><button class="btn outline" id="sqPdf">Tlačiť CP / PDF</button></div><p class="muted">Schválenie alebo zamietnutie CP ešte nie je implementované. Položky sa týmto formulárom neprenášajú do zákazkového listu.</p>`;
   content.querySelector('#sqAdd').onclick=()=>itemForm(job,{section:'quote'},async()=>{await refresh();if(location.hash==='#quotes')renderQuotes()});
   content.querySelectorAll('[data-qi]').forEach(b=>b.onclick=()=>itemForm(job,items.find(i=>String(i.id)===b.dataset.qi),async()=>{await refresh();if(location.hash==='#quotes')renderQuotes()}));
   content.querySelector('#sqPdf').onclick=()=>printDocument(job,items,'quote');
  }catch(e){content.innerHTML='<p role="alert">Nepodarilo sa načítať CP: '+esc(e.message)+'</p>'}
 }
 await refresh();
}
async function renderQuotes(){
 if(location.hash!=='#quotes')return;
 const target=document.getElementById('app');if(!target)return;
 if(!ready){target.innerHTML=`<div class="pagehead"><h1>Cenové ponuky</h1></div><div class="card">${esc(err||'Načítavam cenové ponuky z MariaDB…')}</div>`;return;}
 target.innerHTML='<div class="pagehead"><div><h1>Cenové ponuky</h1><p>Údaje z MariaDB · položky viazané na konkrétne vozidlo</p></div><button class="btn outline" id="sqRefresh">Obnoviť</button></div><div class="card" id="sqList">Načítavam položky cenových ponúk…</div>';
 target.querySelector('#sqRefresh').onclick=load;
 const snapshot=data.jobs.slice();
 const records=await Promise.all(snapshot.map(async j=>{
  try{const r=await api().request('job_items&job_id='+encodeURIComponent(j.id));return {job:j,items:(r.items||[]).filter(i=>i.section==='quote'),error:null}}
  catch(e){return {job:j,items:[],error:e.message}}
 }));
 if(location.hash!=='#quotes'||!target.isConnected)return;
 const list=target.querySelector('#sqList');if(!list)return;
 const money=n=>Number(n||0).toLocaleString('sk-SK',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
 list.innerHTML=`<div class="tablewrap"><table><thead><tr><th>Číslo</th><th>Zákazník</th><th>Vozidlo</th><th>CP</th><th>Spolu</th><th></th></tr></thead><tbody>${records.map(({job:j,items,error})=>`<tr><td>${esc(j.job_number)}</td><td>${esc(name(j.customer_id))}</td><td>${esc(car(j.vehicle_id))}</td><td>${error?`<span style="color:#b91c1c">${esc(error)}</span>`:items.length?'Rozpracovaná ('+items.length+' položiek)':'Bez položiek'}</td><td>${money(items.reduce((sum,i)=>sum+Number(i.quantity)*Number(i.sale_unit_net),0))}</td><td><button class="btn outline small" data-sq="${esc(j.id)}">Otvoriť CP</button></td></tr>`).join('')}</tbody></table></div>`;
 list.querySelectorAll('[data-sq]').forEach(b=>b.onclick=()=>openQuote(data.jobs.find(j=>String(j.id)===b.dataset.sq)));
}

function renderIntake(){
 if(location.hash!=='#intake')return;
 const target=document.getElementById('app');if(!target)return;
 const pending=data.jobs.filter(j=>!['service','ready','completed','rejected','cancelled'].includes(String(j.status||'pending')));
 target.innerHTML=`<div class="pagehead"><div><h1>Príjem vozidiel</h1><p>Prijaté vozidlo nie je automaticky otvorená oprava.</p></div><div class="actions"><button class="btn outline" id="siReload">Obnoviť</button><button class="btn" id="siReceive">+ Prijať vozidlo</button></div></div>${err?`<div class="card" role="alert">${esc(err)}</div>`:''}<div class="card"><div class="tablewrap"><table><thead><tr><th>Číslo</th><th>Zákazník</th><th>Vozidlo</th><th>Stav</th><th>Možnosti</th></tr></thead><tbody>${pending.map(j=>`<tr><td>${esc(j.job_number)}</td><td>${esc(name(j.customer_id))}</td><td>${esc(car(j.vehicle_id))}</td><td>${esc(j.status)}</td><td><div class="row wrap" style="gap:5px"><button class="btn small" data-open-inspection="${j.id}">Obhliadka</button><button class="btn outline small" data-open-quote="${j.id}">CP</button><button class="btn outline small" data-open-job="${j.id}">Zákazka</button></div></td></tr>`).join('')}</tbody></table></div>${pending.length?'':'<p>Žiadne vozidlá čakajúce na príjme.</p>'}</div>`;
 target.querySelector('#siReload')?.addEventListener('click',load);
 target.querySelector('#siReceive')?.addEventListener('click',()=>edit());
 target.querySelectorAll('[data-open-inspection]').forEach(b=>b.onclick=()=>openInspection(data.jobs.find(j=>String(j.id)===b.dataset.openInspection)));
 target.querySelectorAll('[data-open-quote]').forEach(b=>b.onclick=()=>openQuote(data.jobs.find(j=>String(j.id)===b.dataset.openQuote)));
 target.querySelectorAll('[data-open-job]').forEach(b=>b.onclick=()=>details(data.jobs.find(j=>String(j.id)===b.dataset.openJob),'work_order'));
}


async function openInspection(job){
 if(!job)return;
 const overlay=document.createElement('div');overlay.className='sj-inspection-overlay';
 overlay.innerHTML=`<section class="sj-inspection-dialog" role="dialog" aria-modal="true" aria-label="Obhliadka"><header class="sj-inspection-head"><div><small>OBHLIADKA · ${esc(job.job_number)}</small><h2>${esc(car(job.vehicle_id))}</h2><p>${esc(name(job.customer_id))}</p></div><button class="btn outline" id="siClose">Zavrieť</button></header><div id="siContent">Načítavam obhliadku z databázy…</div></section>`;
 document.body.append(overlay);overlay.querySelector('#siClose').onclick=()=>overlay.remove();
 overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
 const content=overlay.querySelector('#siContent');
 async function refresh(){
  try{
   const r=await api().request('inspection_findings&job_id='+job.id);const findings=r.items||[];
   const reviewer=['admin','technician'].includes(api().user?.role);
   content.innerHTML=`<form id="siAdd" class="sj-inspection-form"><label>Popis závady<textarea name="description" required maxlength="3000" rows="3"></textarea></label><label>Závažnosť<select name="severity"><option value="minor">Drobná</option><option value="major">Vážna</option><option value="critical">Kritická</option></select></label><button class="btn" type="submit">+ Pridať závadu</button></form><h3>Zistené závady (${findings.length})</h3>${findings.map(f=>`<article class="sj-finding"><strong>${esc(f.description)}</strong><p>${esc(f.severity)} · ${esc(f.review_status)}</p>${reviewer?`<div class="row wrap" style="gap:8px"><button class="btn small" data-review="approved" data-id="${f.id}">Schváliť</button><button class="btn outline small" data-review="rejected" data-id="${f.id}">Zamietnuť</button></div>`:''}</article>`).join('')||'<p>Zatiaľ bez závad.</p>'}<div class="sj-inspection-footer"><button class="btn outline" id="siQuote">Otvoriť CP tohto vozidla</button></div>`;
   content.querySelector('#siAdd').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{await api().request('inspection_findings&job_id='+job.id,'POST',{description:e.target.elements.description.value,severity:e.target.elements.severity.value});await refresh()}catch(ex){alert(ex.message);b.disabled=false}};
   content.querySelectorAll('[data-review]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await api().request('inspection_findings&job_id='+job.id+'&id='+b.dataset.id,'PUT',{status:b.dataset.review,review_note:''});await refresh()}catch(ex){alert(ex.message);b.disabled=false}});
   content.querySelector('#siQuote').onclick=()=>{overlay.remove();openQuote(job)};
  }catch(ex){content.innerHTML='<p role="alert">Obhliadku sa nepodarilo načítať: '+esc(ex.message)+'</p>'}
 }
 await refresh();
}
function edit(j={}){
 if(!ready){alert('Najprv sa musia načítať údaje z databázy.');return}
 if(!data.customers.length||!data.vehicles.length){alert('Najprv vytvorte zákazníka a jeho vozidlo v sekcii Zákazníci a vozidlá.');return}
 const overlay=document.createElement('div');overlay.style.cssText='position:fixed;inset:0;z-index:10000;background:#0009;display:grid;place-items:center;padding:16px';
 const field=(label,key,type='text',required=false)=>`<label class="field"><span>${label}</span><input name="${key}" type="${type}" value="${esc(key==='received_at'?(j[key]||when()).slice(0,16):j[key])}" ${required?'required':''}></label>`;
 overlay.innerHTML=`<div class="card" style="background:#fff;color:#17233b;width:min(780px,100%);max-height:92vh;overflow:auto"><div class="row between"><h2>${j.id?'Zákazka '+esc(j.job_number):'Nová zákazka'}</h2><button class="btn outline" id="sjClose">Zavrieť</button></div><form id="sjForm" class="grid two">${j.id?`<div class="field"><span>Číslo zákazky</span><strong>${esc(j.job_number)}</strong></div>`:`<div class="field"><span>Číslo zákazky</span><strong>Automaticky pri uložení (ROK-0001)</strong></div>`}${field('Dátum a čas prijatia','received_at','datetime-local',true)}<label class="field"><span>Zákazník</span><select name="customer_id" required>${data.customers.map(c=>`<option value="${c.id}" ${String(j.customer_id)===String(c.id)?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><label class="field"><span>Vozidlo</span><select name="vehicle_id" required></select></label>${field('Kilometre pri prijatí','intake_mileage_km','number',true)}<label class="field"><span>Stav zákazky</span><select name="status">${['pending','inspection','waiting','service','ready','completed'].map(s=>`<option value="${s}" ${j.status===s?'selected':''}>${({pending:'Prijatá',inspection:'Obhliadka',waiting:'Čaká',service:'Servis',ready:'Na odovzdanie',completed:'Ukončená'})[s]}</option>`).join('')}</select></label><label class="field"><span>Režim</span><select name="work_order_mode"><option value="person" ${j.work_order_mode!=='company'?'selected':''}>FO</option><option value="company" ${j.work_order_mode==='company'?'selected':''}>Firma</option></select></label><label class="field"><span>Vozidlo v areáli</span><select name="vehicle_on_site"><option value="1" ${j.vehicle_on_site!=0?'selected':''}>Áno</option><option value="0" ${j.vehicle_on_site==0?'selected':''}>Nie</option></select></label><label class="field" style="grid-column:1/-1"><span>Požiadavka zákazníka</span><textarea name="customer_request">${esc(j.customer_request)}</textarea></label><label class="field" style="grid-column:1/-1"><span>Popis opravy</span><textarea name="repair_description">${esc(j.repair_description)}</textarea></label><label class="field" style="grid-column:1/-1"><span>Interné poznámky</span><textarea name="internal_notes">${esc(j.internal_notes)}</textarea></label><div style="grid-column:1/-1"><p id="sjError" style="color:#b91c1c"></p><button class="btn" type="submit">Uložiť na Websupport</button></div></form></div>`;
 document.body.append(overlay);overlay.querySelector('#sjClose').onclick=()=>overlay.remove();
 const f=overlay.querySelector('form'),owner=f.elements.customer_id,vehicle=f.elements.vehicle_id;
 function vehicles(){
  const matches=data.vehicles.filter(v=>String(v.customer_id)===owner.value);
  vehicle.innerHTML=matches.map(v=>`<option value="${v.id}" ${String(j.vehicle_id)===String(v.id)?'selected':''}>${esc(car(v.id))}</option>`).join('');
 }
 owner.addEventListener('change',vehicles);vehicles();
 f.onsubmit=async e=>{
  e.preventDefault();const btn=f.querySelector('[type=submit]');btn.disabled=true;
  const b=Object.fromEntries(new FormData(f).entries());
  delete b.job_number;
  if(!b.vehicle_id){overlay.querySelector('#sjError').textContent='Vybraný zákazník nemá vozidlo.';btn.disabled=false;return}
  for(const k of ['customer_id','vehicle_id','intake_mileage_km','vehicle_on_site'])b[k]=Number(b[k]);
  b.received_at=dateSql(b.received_at);
  try{await api().request('jobs'+(j.id?'&id='+encodeURIComponent(j.id):''),j.id?'PUT':'POST',b);overlay.remove();await load();}
  catch(ex){overlay.querySelector('#sjError').textContent=ex.message;btn.disabled=false}
 };
}


function printDocument(job,items,kind){
 const customer=data.customers.find(x=>String(x.id)===String(job.customer_id))||{};
 const vehicle=data.vehicles.find(x=>String(x.id)===String(job.vehicle_id))||{};
 const titles={quote:'CENOVÁ PONUKA',work_order:'ZÁKAZKOVÝ LIST',intake:'PRIJÍMACÍ PROTOKOL',handover:'ODOVZDÁVACÍ PROTOKOL'};
 const money=n=>Number(n||0).toLocaleString('sk-SK',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
 const section=kind==='quote'?'quote':'work_order';
 const company=job.work_order_mode==='company';
 const lines=items.filter(i=>i.section===section);
 const total=lines.reduce((sum,i)=>sum+Number(i.quantity)*Number(i.sale_unit_net),0);
 const rows=lines.map(i=>`<tr><td>${esc(i.item_type==='part'?'Diel':'Práca')}</td><td>${esc(i.description)}</td><td>${esc(i.quantity)} ${esc(i.unit)}</td><td class="right">${money(i.sale_unit_net)}</td>${company?`<td class="right">${money(Number(i.sale_unit_net)*(1+Number(i.vat_rate)/100))}</td>`:''}<td class="right">${money(Number(i.quantity)*Number(i.sale_unit_net))}</td></tr>`).join('');
 const price=['quote','work_order'].includes(kind);
 const html=`<!doctype html><html lang="sk"><head><meta charset="utf-8"><title>${esc(titles[kind])} ${esc(job.job_number)}</title><style>
 @page{size:A4;margin:17mm}*{box-sizing:border-box}body{font:12px Arial,sans-serif;color:#1e293b;margin:0}header{border-bottom:3px solid #e11d48;padding-bottom:15px;margin-bottom:25px;display:flex;justify-content:space-between}h1{font-size:21px;margin:0 0 6px}h2{font-size:14px;margin:22px 0 10px}.muted{color:#64748b}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.panel{border:1px solid #cbd5e1;padding:12px;border-radius:6px;min-height:85px}table{border-collapse:collapse;width:100%;margin-top:10px}th,td{border-bottom:1px solid #cbd5e1;padding:8px 6px;text-align:left}th{background:#f1f5f9}.right{text-align:right}.total{font-size:15px;text-align:right;margin-top:14px;font-weight:bold}.sign{display:flex;gap:50px;margin-top:75px}.sign div{flex:1;border-top:1px solid #64748b;text-align:center;padding:10px}.notes{white-space:pre-wrap;min-height:40px}@media print{button{display:none}}</style></head><body><header><div><h1>${esc(titles[kind])}</h1><strong>Číslo: ${esc(job.job_number)}</strong></div><div>AUTOSERVIS TOMI<br><span class="muted">Dátum: ${new Date().toLocaleDateString('sk-SK')}</span></div></header>
 <div class="grid"><div class="panel"><b>Zákazník</b><p>${esc(customer.name)}<br>${esc(customer.address)}<br>${esc(customer.phone)}<br>${esc(customer.email)}</p></div><div class="panel"><b>Vozidlo</b><p>${esc(vehicle.make)} ${esc(vehicle.model)}<br>EČV: ${esc(vehicle.plate)}<br>VIN: ${esc(vehicle.vin)}<br>Kilometre: ${esc(job.intake_mileage_km)}</p></div></div>
 <h2>Požiadavka zákazníka</h2><div class="notes">${esc(job.customer_request||'—')}</div><h2>Popis opravy</h2><div class="notes">${esc(job.repair_description||'—')}</div>
 ${price?`<h2>${kind==='quote'?'Navrhované práce a diely':'Vykonané práce a diely'}</h2><table><thead><tr><th>Typ</th><th>Popis</th><th>Množstvo</th><th class="right">${company?'Cena / MJ bez DPH':'Cena / MJ'}</th>${company?'<th class="right">Cena / MJ s DPH</th>':''}<th class="right">${company?'Spolu bez DPH':'Spolu'}</th></tr></thead><tbody>${rows}</tbody></table><div class="total">${company?'Spolu bez DPH':'Spolu'}: ${money(total)}${company?`<div>Spolu s DPH: ${money(lines.reduce((sum,i)=>sum+Number(i.quantity)*Number(i.sale_unit_net)*(1+Number(i.vat_rate)/100),0))}</div>`:''}</div>`:''}
 ${kind==='intake'?'<h2>Stav vozidla pri prevzatí</h2><p>Viditeľné poškodenia a príslušenstvo: __________________________________________</p>':''}
 ${kind==='handover'?'<h2>Potvrdenie odovzdania vozidla</h2><p>Zákazník potvrdzuje prevzatie vozidla.</p>':''}
 <div class="sign"><div>Za servis</div><div>Zákazník</div></div></body></html>`;
 const w=window.open('','_blank');
 if(!w){alert('Prehliadač zablokoval okno PDF. Povoľte vyskakovacie okná pre administráciu.');return;}
 w.document.open();w.document.write(html);w.document.close();w.focus();setTimeout(()=>w.print(),350);
}
async function details(job,openSection){
 const target=document.getElementById('app');if(!target)return;
 target.innerHTML='<div class="card">Načítavam položky a poznámky zákazky…</div>';
 let items=[],notes=[],docs=[],requests=[];
 try{const [a,b,d,r]=await Promise.all([api().request('job_items&job_id='+job.id),api().request('job_notes&job_id='+job.id),api().request('job_documents&job_id='+job.id),api().request('part_requests&job_id='+job.id)]);items=a.items||[];notes=b.items||[];docs=d.items||[];requests=r.items||[];}
 catch(e){target.innerHTML='<div class="card">Chyba načítania: '+esc(e.message)+'</div>';return}
 const sectionName=s=>s==='quote'?'Cenová ponuka':'Zákazkový list';
 const company=job.work_order_mode==='company';
 const money=n=>Number(n||0).toLocaleString('sk-SK',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
 const total=section=>items.filter(i=>i.section===section).reduce((a,i)=>a+Number(i.quantity)*Number(i.sale_unit_net),0);
 const statusOptions=[['pending','Prijatá'],['inspection','Obhliadka'],['waiting','Čaká'],['service','Servis'],['ready','Na odovzdanie'],['completed','Ukončená']];
 const statusPanel=`<div class="card sj-overview"><div class="sj-summary"><div><span>Stav zákazky</span><select class="sj-status-control" id="sjStatus">${statusOptions.map(([v,t])=>`<option value="${v}" ${job.status===v?'selected':''}>${t}</option>`).join('')}</select></div><div><span>Stav vozidla</span><select class="sj-onsite-control" id="sjOnsite"><option value="1" ${job.vehicle_on_site!=0?'selected':''}>V areáli</option><option value="0" ${job.vehicle_on_site==0?'selected':''}>U zákazníka / mimo areálu</option></select></div><div><span>Stav CP</span><strong class="sj-cp-state">${items.some(i=>i.section==='quote')?'CP pripravená · čaká na schválenie':'Bez CP'}</strong></div><div><span>Režim cien</span><strong>${company?'Firma · bez DPH / s DPH':'FO · jedna cena'}</strong></div><div><span>Úhrada</span><strong>${esc(job.invoice_status||'Neuvedená')}</strong></div><div><span>Mechanik</span><strong>${esc(job.assigned_user_id||'Nepriradený')}</strong></div><div><span>Faktúra</span><strong>${esc(job.invoice_number||'—')}</strong></div></div><button class="btn outline" id="sjSaveState">Uložiť stav</button><button class="btn sj-extra-button" id="sjExtra">+ PRÁCE NAVIAC</button><div class="sj-tabs"><button type="button" data-jump="sjQuoteBlock">Cenová ponuka</button><button type="button" data-jump="sjOrderBlock">Zákazkový list</button><button type="button" data-jump="sjDocBlock">PDF a dokumenty</button><button type="button" data-jump="sjRequestBlock">Potrebujem diely</button><button type="button" data-jump="sjNoteBlock">Poznámky</button></div></div>`;
 target.innerHTML=`<div class="pagehead"><div><button class="btn outline" id="sjBack">← Zákazky</button><h1>${esc(job.job_number)} – ${esc(name(job.customer_id))}</h1><p>${esc(car(job.vehicle_id))}</p></div><button class="btn outline" id="sjEdit">Upraviť zákazku</button></div>${statusPanel}<div class="card"><div class="row wrap" style="gap:8px;margin-bottom:14px"><button class="btn" id="sjQuotePdf">Cenová ponuka · PDF</button><button class="btn outline" id="sjOrderPdf">Zákazkový list · PDF</button><button class="btn outline" id="sjIntakePdf">Prijímací protokol · PDF</button><button class="btn outline" id="sjHandoverPdf">Odovzdávací protokol · PDF</button></div><h3 id="sjQuoteBlock">Položky zákazky – uložené v databáze</h3>${['quote','work_order'].map(section=>`<h3 id="${section==='quote'?'sjQuoteItems':'sjOrderBlock'}">${sectionName(section)}</h3><div class="tablewrap"><table><thead><tr><th>Typ</th><th>Popis</th><th>Množstvo</th><th>${company?'Predaj bez DPH / MJ':'Cena / MJ'}</th>${company?'<th>Predaj s DPH / MJ</th>':''}<th>${company?'Spolu bez DPH':'Spolu'}</th><th></th></tr></thead><tbody>${items.filter(i=>i.section===section).map(i=>`<tr><td>${i.item_type==='part'?'Diel':'Práca'}</td><td>${esc(i.description)}</td><td>${esc(i.quantity)} ${esc(i.unit)}</td><td>${money(i.sale_unit_net)}</td>${company?`<td>${money(Number(i.sale_unit_net)*(1+Number(i.vat_rate)/100))}</td>`:''}<td>${money(Number(i.quantity)*Number(i.sale_unit_net))}</td><td><button class="btn outline small" data-item="${i.id}">Upraviť</button></td></tr>`).join('')}</tbody></table></div><p><strong>${company?'Spolu bez DPH':'Spolu'}: ${money(total(section))}</strong>${company?`<p><strong>Spolu s DPH: ${money(items.filter(i=>i.section===section).reduce((a,i)=>a+Number(i.quantity)*Number(i.sale_unit_net)*(1+Number(i.vat_rate)/100),0))}</strong></p>`:''}</p><button class="btn outline" data-add="${section}">+ Pridať položku</button>`).join('')}</div><div class="card"><h3 id="sjNoteBlock">Poznámky</h3>${notes.map(n=>`<p>${esc(n.body)} <small>${esc(n.created_at)}</small></p>`).join('')}<form id="sjNote"><textarea name="body" required placeholder="Nová poznámka"></textarea><button class="btn" type="submit">Uložiť poznámku</button></form></div><div class="card"><h3 id="sjRequestBlock">Potrebujem diely ${requests.some(r=>r.status==='pending')?'🔴':''}</h3><div class="tablewrap"><table><thead><tr><th>Diel / požiadavka</th><th>Množstvo</th><th>Stav</th><th>Zmeniť stav</th></tr></thead><tbody>${requests.map(r=>`<tr><td>${esc(r.description)}</td><td>${esc(r.quantity)}</td><td>${esc(({pending:'Čaká',ordered:'Objednané',received:'Dodané',cancelled:'Zrušené'})[r.status]||r.status)}</td><td><select data-request="${r.id}"><option value="pending" ${r.status==='pending'?'selected':''}>Čaká</option><option value="ordered" ${r.status==='ordered'?'selected':''}>Objednané</option><option value="received" ${r.status==='received'?'selected':''}>Dodané</option><option value="cancelled" ${r.status==='cancelled'?'selected':''}>Zrušené</option></select></td></tr>`).join('')}</tbody></table></div><form id="sjRequest" style="display:flex;gap:8px;flex-wrap:wrap;align-items:end"><label>Chýbajúci diel / požiadavka<input name="description" required maxlength="2000" placeholder="Napr. brzdové platničky zadné"></label><label>Množstvo<input name="quantity" type="number" min="0.001" step="0.001" value="1" required></label><button class="btn" type="submit">+ Nahlásiť diel</button></form></div><div class="card"><h3 id="sjDocBlock">Dokumenty a fotodokumentácia – uložené na serveri</h3><form id="sjDocUpload"><input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png,.webp" required><button class="btn" type="submit">Nahrať dokument</button></form><div id="sjDocs">${docs.length?docs.map(d=>`<p><button class="btn outline small" data-doc="${d.id}">Stiahnuť</button> ${esc(d.original_name)} (${Math.ceil(Number(d.byte_size)/1024)} kB)</p>`).join(''):'Zatiaľ žiadne uložené dokumenty.'}</div></div><p class="muted">PDF tlač je dostupná cez prehliadač. Na archiváciu vytvoreného PDF ho najprv uložte a potom nahrajte medzi dokumenty.</p>`;
 for(const [id,kind] of [['sjQuotePdf','quote'],['sjOrderPdf','work_order'],['sjIntakePdf','intake'],['sjHandoverPdf','handover']]){
  target.querySelector('#'+id).onclick=()=>printDocument(job,items,kind);
 }
 target.querySelector('#sjRequest').onsubmit=async e=>{e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;try{await api().request('part_requests&job_id='+job.id,'POST',{description:e.target.elements.description.value,quantity:Number(e.target.elements.quantity.value)});details(job)}catch(ex){alert(ex.message);btn.disabled=false}};
 target.querySelectorAll('[data-request]').forEach(el=>el.onchange=async()=>{el.disabled=true;try{await api().request('part_requests&job_id='+job.id+'&id='+el.dataset.request,'PUT',{status:el.value});details(job)}catch(ex){alert(ex.message);el.disabled=false}});
 target.querySelector('#sjDocUpload').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{await api().uploadDocument(job.id,e.target.elements.file.files[0]);details(job)}catch(ex){alert(ex.message);b.disabled=false}};
 target.querySelectorAll('[data-doc]').forEach(b=>b.onclick=async()=>{const d=docs.find(x=>String(x.id)===b.dataset.doc);try{await api().downloadDocument(job.id,d.id,d.original_name)}catch(ex){alert(ex.message)}});
 target.querySelector('#sjExtra').onclick=()=>{alert('Práce naviac zatiaľ nie sú prepojené so schválením zákazníka. Do zákazky sa nič nepridalo.');};
 target.querySelector('#sjStatus').onchange=()=>{const status=target.querySelector('#sjStatus').value;if(['service','ready'].includes(status))target.querySelector('#sjOnsite').value='1';if(status==='completed')target.querySelector('#sjOnsite').value='0';paintStatus()};
 target.querySelector('#sjOnsite').onchange=paintStatus;
 function paintStatus(){const status=target.querySelector('#sjStatus');status.dataset.state=status.value;const onsite=target.querySelector('#sjOnsite');onsite.dataset.state=onsite.value==='1'?'onsite':'outside'}paintStatus();
 target.querySelector('#sjSaveState').onclick=async()=>{const b=target.querySelector('#sjSaveState');b.disabled=true;try{await api().request('jobs&id='+job.id,'PUT',{status:target.querySelector('#sjStatus').value,vehicle_on_site:['service','ready'].includes(target.querySelector('#sjStatus').value)?1:target.querySelector('#sjStatus').value==='completed'?0:Number(target.querySelector('#sjOnsite').value)});await load();const updated=data.jobs.find(j=>String(j.id)===String(job.id));if(updated)await details(updated)}catch(e){alert('Stav sa nepodarilo uložiť: '+e.message);b.disabled=false}};
 target.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>target.querySelector('#'+b.dataset.jump)?.scrollIntoView({behavior:'smooth',block:'start'}));
 if(openSection==='quote'){target.querySelector('#sjQuoteBlock')?.scrollIntoView({behavior:'smooth',block:'start'});target.querySelector('#sjQuoteBlock')?.classList.add('sj-focus')} 
 if(openSection==='work_order')target.querySelector('#sjOrderBlock')?.scrollIntoView({behavior:'smooth',block:'start'});
 target.querySelector('#sjBack').onclick=()=>{location.hash='#jobs';load()};
 target.querySelector('#sjEdit').onclick=()=>edit(job);
 target.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>itemForm(job,{section:b.dataset.add},details));
 target.querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>itemForm(job,items.find(i=>String(i.id)===b.dataset.item),details));
 target.querySelector('#sjNote').onsubmit=async e=>{e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;try{await api().request('job_notes&job_id='+job.id,'POST',{body:e.target.elements.body.value,note_type:'general'});details(job)}catch(ex){alert(ex.message);btn.disabled=false}};
}
function itemForm(job,item,back){
 const company=job.work_order_mode==='company';
 const initialVat=company?Number(item.vat_rate??23):0;
 const initialNet=Number(item.sale_unit_net||0);
 const overlay=document.createElement('div');overlay.style.cssText='position:fixed;inset:0;z-index:10000;background:#0009;display:grid;place-items:center;padding:16px';
 overlay.innerHTML=`<div class="sj-dialog" role="dialog" aria-modal="true" aria-label="${item.id?'Upraviť':'Pridať'} položku"><div class="sj-dialog-head"><div><div class="sj-kicker">${esc(job.job_number)}</div><h2>${item.id?'Upraviť':'Pridať'} položku</h2></div><button class="sj-close" id="sjItemCancel" type="button" aria-label="Zavrieť">✕</button></div><form id="sjItem" class="sj-form"><div class="sj-fields sj-two"><label class="sj-field"><span>Sekcia</span><select name="section"><option value="quote" ${item.section==='quote'?'selected':''}>Cenová ponuka</option><option value="work_order" ${item.section==='work_order'?'selected':''}>Zákazkový list</option></select></label><label class="sj-field"><span>Typ položky</span><select name="item_type"><option value="part" ${item.item_type==='part'?'selected':''}>Náhradný diel</option><option value="labor" ${item.item_type==='labor'?'selected':''}>Práca</option></select></label></div><label class="sj-field"><span>Popis položky</span><input name="description" required maxlength="500" placeholder="Napr. výmena brzdových platničiek" value="${esc(item.description)}"></label><div class="sj-fields sj-two"><label class="sj-field"><span>Množstvo</span><input name="quantity" required type="number" step="0.001" min="0.001" value="${esc(item.quantity||1)}"></label><label class="sj-field"><span>Jednotka</span><input name="unit" maxlength="20" value="${esc(item.unit||'ks')}"></label></div><div class="sj-section-title">Predajná cena ${company?'· Firma':'· FO'}</div><div class="sj-fields ${company?'sj-two':''}"><label class="sj-field"><span>${company?'Cena bez DPH / MJ':'Cena / MJ'}</span><input name="sale_unit_net" type="number" min="0" step="0.0001" value="${esc(initialNet)}"></label>${company?`<label class="sj-field"><span>Cena s DPH / MJ</span><input name="sale_unit_gross" type="number" min="0" step="0.0001" value="${esc((initialNet*(1+initialVat/100)).toFixed(2))}"></label>`:''}</div><div class="sj-fields sj-two"><label class="sj-field"><span>Nákupná cena bez DPH / MJ <small>(interné)</small></span><input name="purchase_unit_net" type="number" min="0" step="0.0001" value="${esc(item.purchase_unit_net??'')}"></label>${company?`<label class="sj-field"><span>Sadzba DPH (%)</span><input name="vat_rate" type="number" min="0" max="100" step="0.001" value="${esc(initialVat)}"></label>`:'<input type="hidden" name="vat_rate" value="0">'}</div><div class="sj-total"><span>Celkom ${company?'bez DPH':''}</span><strong id="sjItemTotal">0,00 €</strong></div><p id="sjItemError" class="sj-error" role="alert"></p><div class="sj-actions"><button class="btn outline" id="sjItemCancelBottom" type="button">Zrušiť</button><button class="btn" type="submit">Uložiť položku</button></div></form></div>`;
 document.body.append(overlay);overlay.querySelector('#sjItemCancel').onclick=()=>overlay.remove();overlay.querySelector('#sjItemCancelBottom').onclick=()=>overlay.remove();
 const form=overlay.querySelector('#sjItem');const updateTotal=()=>{const qty=Number(form.elements.quantity.value||0),unit=Number(form.elements.sale_unit_net.value||0);overlay.querySelector('#sjItemTotal').textContent=(qty*unit).toLocaleString('sk-SK',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';};form.elements.quantity.addEventListener('input',updateTotal);form.elements.sale_unit_net.addEventListener('input',updateTotal);updateTotal();
 if(company){
  const f=overlay.querySelector('#sjItem');const net=f.elements.sale_unit_net,gross=f.elements.sale_unit_gross,vat=f.elements.vat_rate;
  const factor=()=>1+Number(vat.value||0)/100;
  net.addEventListener('input',()=>{gross.value=(Number(net.value||0)*factor()).toFixed(2)});
  gross.addEventListener('input',()=>{net.value=(Number(gross.value||0)/factor()).toFixed(4);updateTotal()});
  vat.addEventListener('input',()=>{gross.value=(Number(net.value||0)*factor()).toFixed(2)});
 }
 overlay.querySelector('form').onsubmit=async e=>{e.preventDefault();const btn=e.target.querySelector('[type=submit]');btn.disabled=true;const b=Object.fromEntries(new FormData(e.target).entries());delete b.sale_unit_gross;if(!company)b.vat_rate=0;for(const k of ['quantity','sale_unit_net','vat_rate'])b[k]=Number(b[k]);b.purchase_unit_net=b.purchase_unit_net===''?null:Number(b.purchase_unit_net);try{await api().request('job_items&job_id='+job.id+(item.id?'&id='+item.id:''),item.id?'PUT':'POST',b);overlay.remove();back(job)}catch(ex){overlay.querySelector('#sjItemError').textContent=ex.message;btn.disabled=false}};
}

window.jobs=()=>'<div class="card">Načítavam zákazky z Websupportu…</div>';
window.intake=()=>'<div class="card">Načítavam príjem vozidiel z Websupportu…</div>';
window.quotes=()=>'<div class="card">Načítavam cenové ponuky z MariaDB…</div>';
window.newJob=()=>edit();
window.addEventListener('hashchange',()=>{if(['#jobs','#intake','#quotes'].includes(location.hash))setTimeout(load,0)});
if(['#jobs','#intake','#quotes'].includes(location.hash))setTimeout(load,0);
})();
