/* Server-side jobs MVP: never fall back to local storage. */
(()=>{
'use strict';
const api=()=>window.TomiAuth;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
let data={jobs:[],customers:[],vehicles:[]},busy=false,err='',ready=false;
let history=[],historyLoaded=false,historyError='';
let jobPrices={};
const numericPrice=x=>{if(x===null||x===undefined||String(x).trim()==='')return null;const n=Number(String(x).replace(/\s/g,'').replace(',','.').replace(/[^0-9.\-]/g,''));return Number.isFinite(n)?n:null};
const formatPrice=x=>{const n=numericPrice(x);return n===null?'—':n.toLocaleString('sk-SK',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'};
async function loadJobPrices(){const jobs=data.jobs||[];const entries=await Promise.all(jobs.map(async j=>{try{const r=await api().request('job_items&job_id='+encodeURIComponent(j.id));const items=(r.items||[]).filter(i=>i.section==='work_order');return [j.id,items.length?items.reduce((a,i)=>a+Number(i.quantity||0)*Number(i.sale_unit_net||0)*(j.work_order_mode==='company'?1+Number(i.vat_rate||0)/100:1),0):null]}catch(e){return [j.id,null]}}));jobPrices=Object.fromEntries(entries);renderServer()};
async function loadHistory(){if(historyLoaded)return;try{const r=await api().request('provax_history');history=r.items||[];historyLoaded=true;historyError='';}catch(e){historyError=e.message;}renderServer();}
async function historicalDetail(id){
 try{
  const r=await api().request('provax_history&id='+encodeURIComponent(id));
  const item=r.item||{},original=item.original||{},detail=original.detail||{};
  document.querySelectorAll('.sj-history-overlay').forEach(x=>x.remove());
  const money=n=>Number(n||0).toLocaleString('sk-SK',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
  const qty=n=>Number(n||0).toLocaleString('sk-SK',{maximumFractionDigits:2});
  const parts=Array.isArray(detail.parts_items)?detail.parts_items:[];
  const work=Array.isArray(detail.work_items)?detail.work_items:[];
  const sum=arr=>arr.reduce((a,x)=>a+(Number(x.line_total)||0),0);
  const rows=arr=>arr.map(x=>`<tr><td>${esc(x.code||'—')}</td><td>${esc(x.description||'—')}</td><td class="num">${esc(qty(x.quantity))}</td><td class="num">${esc(money(x.unit_price))}</td><td class="num"><strong>${esc(money(x.line_total))}</strong></td></tr>`).join('')||'<tr><td colspan="5" class="empty">Žiadne položky</td></tr>';
  const table=arr=>`<div class="tablewrap"><table><thead><tr><th>Kód</th><th>Popis</th><th>Množstvo</th><th>Jedn. cena</th><th>Spolu</th></tr></thead><tbody>${rows(arr)}</tbody></table></div>`;
  const fields=detail.job_fields||{};
  const field=(key)=>{const v=fields[key];return Array.isArray(v)?(v.find(x=>x.value!==''&&x.value!=null)?.value||''):''};
  const note=String(detail.request||'').trim();
  const overlay=document.createElement('div');overlay.className='sj-inspection-overlay sj-history-overlay';
  overlay.innerHTML=`<section class="sj-inspection-dialog sj-history-dialog" role="dialog" aria-modal="true" aria-label="Historická zákazka"><header class="sj-inspection-head"><div><small>ZÁKAZKA ${esc(item.job_number)} · HISTORICKÉ</small><h2>${esc(item.customer_name||'Zákazník')}</h2><p>${esc([item.vehicle_make,item.vehicle_model].filter(Boolean).join(' '))} · <strong>${esc(item.vehicle_plate||'Bez EČV')}</strong></p></div><button class="btn outline small" id="shClose">Zavrieť ×</button></header><div class="sj-history-body"><div class="sj-history-meta"><span><strong>Číslo zákazky</strong>${esc(item.job_number)}</span><span><strong>Prijatie</strong>${esc(shortDate(item.received_date))}</span><span><strong>Stav</strong>Historické</span><span><strong>Úhrada</strong>—</span><span><strong>VIN</strong>${esc(item.vehicle_vin||'—')}</span><span><strong>Stav km</strong>${esc(field('Stav km')||'—')}</span></div><section class="sj-history-section"><h3>NÁHRADNÉ DIELY</h3>${table(parts)}<div class="sj-history-subtotal">Materiál spolu <strong>${money(sum(parts))}</strong></div></section><section class="sj-history-section"><h3>PRÁCA</h3>${table(work)}<div class="sj-history-subtotal">Práca spolu <strong>${money(sum(work))}</strong></div></section><div class="sj-history-totals"><span>Materiál <strong>${money(sum(parts))}</strong></span><span>Práca <strong>${money(sum(work))}</strong></span><span>Celkom podľa Provaxu <strong>${esc(money(original.total??item.total_original??(sum(parts)+sum(work))))}</strong></span></div><section class="sj-history-section"><h3>POZNÁMKY</h3><p class="sj-history-notes">${esc(note||'Bez poznámky')}</p></section><p class="muted">Pôvodný import Provax · iba na čítanie. Pôvodné hodnoty položiek zostávajú nezmenené. Súčet položiek sa môže líšiť od pôvodnej celkovej sumy pri zľavách alebo DPH.</p></div></section>`;
  document.body.append(overlay);
  overlay.querySelector('#shClose').onclick=()=>overlay.remove();
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
 }catch(e){alert(e.message)}
}

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
 finally{busy=false;renderServer();renderIntake();if(ready)loadJobPrices()}
}
const jobFilter={statuses:new Set(['pending','inspection','waiting','service','ready']),search:'',from:'',to:''};
const shortDate=x=>{if(!x)return '—';const m=String(x).match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[3]}.${m[2]}.${m[1]}`:String(x).slice(0,10)};
function renderServer(){
 if(location.hash!=='#jobs')return;
 const target=document.getElementById('app');if(!target)return;
 const states=[['pending','Prijatá'],['inspection','Obhliadka'],['waiting','Čaká'],['service','Servis'],['ready','Na odovzdanie'],['completed','Ukončená'],['not_realized','Nerealizovaná'],['historical','Historické']];
 const q=jobFilter.search.toLocaleLowerCase('sk-SK').trim();
 const filtered=data.jobs.filter(j=>{
  if(!jobFilter.statuses.has(j.status))return false;
  const date=String(j.received_at||'').slice(0,10);
  if(jobFilter.from&&date<jobFilter.from)return false;
  if(jobFilter.to&&date>jobFilter.to)return false;
  const v=data.vehicles.find(x=>String(x.id)===String(j.vehicle_id))||{};
  const c=data.customers.find(x=>String(x.id)===String(j.customer_id))||{};
  return !q||[j.job_number,c.name,c.phone,v.make,v.model,v.plate,v.vin,j.repair_description].join(' ').toLocaleLowerCase('sk-SK').includes(q);
 });
 const totalPrice=[...filtered.map(j=>numericPrice(jobPrices[j.id])),...((jobFilter.statuses.has('historical')?history:[]).filter(j=>{const d=String(j.received_date||'').slice(0,10);if(jobFilter.from&&d<jobFilter.from)return false;if(jobFilter.to&&d>jobFilter.to)return false;return !q||[j.job_number,j.customer_name,j.vehicle_make,j.vehicle_model,j.vehicle_plate,j.vehicle_vin].join(' ').toLocaleLowerCase('sk-SK').includes(q)}).map(j=>numericPrice(j.total_original)))].filter(n=>n!==null).reduce((a,b)=>a+b,0);
 const historicalFiltered=jobFilter.statuses.has('historical')?history.filter(j=>{const d=String(j.received_date||'').slice(0,10);if(jobFilter.from&&d<jobFilter.from)return false;if(jobFilter.to&&d>jobFilter.to)return false;return !q||[j.job_number,j.customer_name,j.vehicle_make,j.vehicle_model,j.vehicle_plate,j.vehicle_vin].join(' ').toLocaleLowerCase('sk-SK').includes(q)}):[];
 target.innerHTML=`<div class="pagehead"><div><h1>Servisné zákazky</h1><p>Aktuálne zákazky · MariaDB</p></div><div class="actions"><button class="btn outline" id="sjReload">Obnoviť</button><button class="btn" style="background:#169447;color:white;border:1px solid #169447;font-weight:700" id="sjNew">+ Pridať zákazku</button></div></div>${err?`<div class="card" style="color:#b91c1c">${esc(err)}</div>`:''}${busy?'<div class="card">Načítavam…</div>':!ready?'<div class="card">Záznamy sa nepodarilo načítať.</div>':`<div class="card sj-filter-panel"><strong>Stavy zákaziek</strong><div class="sj-filter-states">${states.map(([v,t])=>`<label><input type="checkbox" data-status="${v}" ${jobFilter.statuses.has(v)?'checked':''}> ${t}</label>`).join('')}</div><div class="sj-filter-fields"><label>Vyhľadávanie<input id="sjSearch" placeholder="Zákazník, vozidlo, EČV, VIN, číslo zákazky…" value="${esc(jobFilter.search)}"></label><label>Dátum od<input id="sjFrom" type="date" value="${esc(jobFilter.from)}"></label><label>Dátum do<input id="sjTo" type="date" value="${esc(jobFilter.to)}"></label><button class="btn outline small" id="sjClear">Vymazať filtre</button></div><p class="muted">Zobrazených ${filtered.length+historicalFiltered.length} z ${data.jobs.length+(historyLoaded?history.length:0)} zákaziek</p></div><div class="card"><div class="tablewrap"><table><thead><tr><th>Číslo</th><th>Prijatie</th><th>Zákazník</th><th>Vozidlo</th><th>Úhrada</th><th>Stav</th><th>Cena zákazky</th><th></th></tr></thead><tbody>${[...filtered.map(j=>({historical:false,record:j,date:String(j.received_at||'')})),...historicalFiltered.map(j=>({historical:true,record:j,date:String(j.received_date||'')}))].sort((a,b)=>b.date.localeCompare(a.date)).map(({historical,record:j})=>historical?`<tr><td><strong>${esc(j.job_number)}</strong></td><td>${esc(shortDate(j.received_date))}</td><td>${esc(j.customer_name)}</td><td>${esc([j.vehicle_make,j.vehicle_model,j.vehicle_plate].filter(Boolean).join(' · '))}</td><td>—</td><td>Historické</td><td>${formatPrice(j.total_original)}</td><td><button class="btn small outline" data-historical="${esc(j.id)}">Otvoriť</button></td></tr>`:`<tr><td><strong>${esc(j.job_number)}</strong></td><td>${esc(shortDate(j.received_at))}</td><td>${esc(name(j.customer_id))}</td><td>${esc(car(j.vehicle_id))}</td><td>${j.status==='completed'?`<span class="sj-payment-label ${j.invoice_status==='paid'?'paid':'unpaid'}">${j.invoice_status==='paid'?'Uhradená':'Neuhradená'}</span>`:'—'}</td><td>${esc(states.find(x=>x[0]===j.status)?.[1]||j.status)}</td><td>${formatPrice(jobPrices[j.id])}</td><td><button class="btn small outline" data-sj="${j.id}">Otvoriť</button></td></tr>`).join('')}</tbody></table></div><div class="sj-filter-summary"><strong>Počet vyfiltrovaných zákaziek: ${filtered.length+historicalFiltered.length}</strong><strong>Celková hodnota: ${formatPrice(totalPrice)}</strong><small>Hodnota zákaziek, nie potvrdená úhrada. Pri nových zákazkách súčet položiek zákazkového listu; pri historických pôvodná suma Provaxu.</small></div>${historyError?`<div class="notice warn">Históriu sa nepodarilo načítať: ${esc(historyError)}</div>`:''}${!(filtered.length+historicalFiltered.length)?'<p class="empty">Žiadne zákazky pre zvolené filtre.</p>':''}</div>`}`;
 target.querySelector('#sjReload')?.addEventListener('click',load);
 target.querySelector('#sjNew')?.addEventListener('click',()=>edit());
 target.querySelectorAll('[data-historical]').forEach(b=>b.addEventListener('click',()=>historicalDetail(b.dataset.historical)));
 target.querySelectorAll('[data-sj]').forEach(b=>b.addEventListener('click',()=>details(data.jobs.find(x=>String(x.id)===b.dataset.sj))));
 target.querySelectorAll('[data-status]').forEach(x=>x.onchange=()=>{if(x.checked)jobFilter.statuses.add(x.dataset.status);else jobFilter.statuses.delete(x.dataset.status);renderServer();if(x.checked&&x.dataset.status==='historical')loadHistory()});
 for(const [id,key] of [['sjSearch','search'],['sjFrom','from'],['sjTo','to']]){const x=target.querySelector('#'+id);if(x)x.oninput=()=>{const start=x.selectionStart;jobFilter[key]=x.value;renderServer();const y=target.querySelector('#'+id);y?.focus();if(key==='search'&&start!=null)y.setSelectionRange(start,start)}}
 target.querySelector('#sjClear')?.addEventListener('click',()=>{jobFilter.search='';jobFilter.from='';jobFilter.to='';jobFilter.statuses=new Set(['pending','inspection','waiting','service','ready']);renderServer()});
}


async function openQuote(job){
 if(!job)return;
 document.querySelectorAll('.sj-quote-overlay').forEach(x=>x.remove());
 const overlay=document.createElement('div');overlay.className='sj-inspection-overlay sj-quote-overlay';
 overlay.innerHTML=`<section class="sj-inspection-dialog sj-quote-dialog" role="dialog" aria-modal="true" aria-label="Cenová ponuka"><header class="sj-inspection-head"><div><small>CENOVÁ PONUKA · ${esc(job.job_number)}</small><h2>${esc(car(job.vehicle_id))}</h2><p>${esc(name(job.customer_id))}</p></div><button class="btn outline" id="sqClose">Zavrieť</button></header><div id="sqContent">Načítavam CP z MariaDB…</div></section>`;
 document.body.append(overlay);
 overlay.querySelector('#sqClose').onclick=()=>overlay.remove();
 const content=overlay.querySelector('#sqContent');
 const money=n=>Number(n||0).toLocaleString('sk-SK',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
 const company=job.work_order_mode==='company';
 const renderForm=(item={})=>{
  const old=content.querySelector('#sqInlineForm');if(old)old.remove();
  const wrap=document.createElement('div');wrap.id='sqInlineForm';wrap.className='sj-quote-editor';
  wrap.innerHTML=`<h3>${item.id?'Upraviť položku':'Pridať položku do CP'}</h3><form id="sqItemForm" class="sj-form"><div class="sj-fields sj-two"><label class="sj-field"><span>Typ položky</span><select name="item_type"><option value="labor" ${item.item_type==='labor'?'selected':''}>Práca</option><option value="part" ${item.item_type==='part'?'selected':''}>Náhradný diel</option></select></label><label class="sj-field"><span>Množstvo</span><input name="quantity" type="number" min="0.001" step="0.001" value="${esc(item.quantity??1)}" required></label></div><label class="sj-field"><span>Popis</span><input name="description" maxlength="500" value="${esc(item.description||'')}" required></label><div class="sj-fields sj-two"><label class="sj-field"><span>Jednotka</span><input name="unit" maxlength="20" value="${esc(item.unit||'ks')}"></label><label class="sj-field"><span>${company?'Cena bez DPH / MJ':'Cena / MJ'} (€)</span><input name="sale_unit_net" type="number" min="0" step="0.0001" value="${esc(item.sale_unit_net??0)}" required></label></div>${company?`<div class="sj-fields sj-two"><label class="sj-field"><span>DPH (%)</span><input name="vat_rate" type="number" min="0" max="100" step="0.001" value="${esc(item.vat_rate??23)}"></label><label class="sj-field"><span>Cena s DPH / MJ (€)</span><input name="sale_unit_gross" type="number" min="0" step="0.01"></label></div>`:'<input name="vat_rate" type="hidden" value="0">'}<label class="sj-field"><span>Nákupná cena bez DPH / MJ (interná)</span><input name="purchase_unit_net" type="number" min="0" step="0.0001" value="${esc(item.purchase_unit_net??'')}"></label><p id="sqFormError" role="alert"></p><div class="sj-actions"><button type="button" class="btn outline" id="sqCancelEdit">Zrušiť</button><button type="submit" class="btn">Uložiť položku</button></div></form>`;
  content.append(wrap);
  wrap.querySelector('#sqCancelEdit').onclick=()=>wrap.remove();
  const form=wrap.querySelector('form');
  if(company){const net=form.elements.sale_unit_net,gross=form.elements.sale_unit_gross,vat=form.elements.vat_rate;
   const factor=()=>1+Number(vat.value||0)/100;
   const update=()=>gross.value=(Number(net.value||0)*factor()).toFixed(2);
   net.oninput=update;vat.oninput=update;gross.oninput=()=>net.value=(Number(gross.value||0)/factor()).toFixed(4);update();
  }
  form.onsubmit=async e=>{
   e.preventDefault();const btn=form.querySelector('[type=submit]');btn.disabled=true;
   const b=Object.fromEntries(new FormData(form).entries());delete b.sale_unit_gross;b.section='quote';
   for(const k of ['quantity','sale_unit_net','vat_rate'])b[k]=Number(b[k]);
   b.purchase_unit_net=b.purchase_unit_net===''?null:Number(b.purchase_unit_net);
   try{await api().request('job_items&job_id='+encodeURIComponent(job.id)+(item.id?'&id='+encodeURIComponent(item.id):''),item.id?'PUT':'POST',b);
    await refresh();
   }catch(ex){wrap.querySelector('#sqFormError').textContent=ex.message;btn.disabled=false}
  };
  wrap.scrollIntoView({behavior:'smooth',block:'nearest'});
 };
 async function refresh(){
  try{
   const [r,decisionResponse]=await Promise.all([api().request('job_items&job_id='+encodeURIComponent(job.id)),api().request('quote_decision&job_id='+encodeURIComponent(job.id))]);
   const decision=decisionResponse.decision?.status||'pending';
   const items=(r.items||[]).filter(i=>i.section==='quote');
   const group=(type,title)=>`<h3>${title}</h3><div class="tablewrap"><table><thead><tr><th>Popis</th><th>Množstvo</th><th>${company?'Bez DPH / MJ':'Cena / MJ'}</th>${company?'<th>S DPH / MJ</th>':''}<th>Spolu</th><th></th></tr></thead><tbody>${items.filter(i=>i.item_type===type).map(i=>`<tr><td>${esc(i.description)}</td><td>${esc(i.quantity)} ${esc(i.unit)}</td><td>${money(i.sale_unit_net)}</td>${company?`<td>${money(Number(i.sale_unit_net)*(1+Number(i.vat_rate)/100))}</td>`:''}<td>${money(Number(i.quantity)*Number(i.sale_unit_net))}</td><td>${decision==='pending'?`<button class="btn outline small" data-qi="${esc(i.id)}">Upraviť</button>`:'—'}</td></tr>`).join('')||'<tr><td colspan="6">Zatiaľ bez položiek</td></tr>'}</tbody></table></div>`;
   const net=items.reduce((a,i)=>a+Number(i.quantity)*Number(i.sale_unit_net),0);
   const gross=items.reduce((a,i)=>a+Number(i.quantity)*Number(i.sale_unit_net)*(1+Number(i.vat_rate)/100),0);
   content.innerHTML=`<p>CP k zákazke <strong>${esc(job.job_number)}</strong> · ${company?'Firma – bez DPH / s DPH':'FO – jedna cena'}</p>${group('labor','01 NAVRHOVANÉ PRÁCE')}${group('part','02 NAVRHOVANÉ DIELY A MATERIÁL')}<div class="sj-quote-totals"><strong>${company?'Spolu bez DPH':'Celkom'}: ${money(net)}</strong>${company?`<strong>DPH: ${money(gross-net)}</strong><strong>Spolu s DPH: ${money(gross)}</strong>`:''}</div><div class="sj-actions"><button class="btn" id="sqAdd" ${decision!=='pending'?'disabled':''}>+ Pridať položku</button><button class="btn outline" id="sqPdf">Cenová ponuka · PDF</button></div><div class="sj-quote-decision"><strong>Stav CP: ${decision==='approved'?'SCHVÁLENÁ':decision==='rejected'?'ZAMIETNUTÁ':'ČAKÁ NA SCHVÁLENIE'}</strong>${decision==='pending'?'<div class="sj-actions"><button class="btn" id="sqApprove">✓ SCHVÁLIŤ CP</button><button class="btn outline" id="sqReject">✕ ZAMIETNUŤ CP</button></div>':decision==='approved'?'<button class="btn outline small" id="sqUndo" title="Zrušiť schválenie CP">✕ Zrušiť schválenie</button>':''}</div>`;
   content.querySelector('#sqAdd').onclick=()=>renderForm({item_type:'labor'});
   content.querySelectorAll('[data-qi]').forEach(b=>b.onclick=()=>renderForm(items.find(i=>String(i.id)===b.dataset.qi)));
   // Interný kontrolný zoznam z obhliadky; neprenáša sa do PDF ani do nacenených položiek.
   const internal=document.createElement('section');internal.className='sj-internal-findings';
   content.append(internal);
   const drawFindings=async()=>{
    try{
     const response=await api().request('inspection_findings&job_id='+encodeURIComponent(job.id));
     const findings=response.items||[];
     const approved=findings.filter(f=>f.review_status==='approved');
     const processed=approved.filter(f=>String(f.review_note||'').startsWith('[CP-HOTOVO]'));
     internal.innerHTML=`<h3>Zistenia z obhliadky – iba interne</h3><p class="muted">Zaškrtnutie znamená spracované v CP. Nevytvorí diel ani prácu. Táto sekcia nie je súčasťou PDF.</p><p><strong>Spracované: ${processed.length} / ${approved.length}</strong></p>${findings.map(f=>`<div class="sj-internal-finding ${f.review_status==='rejected'?'rejected':String(f.review_note||'').startsWith('[CP-HOTOVO]')?'done':''}">${f.review_status==='approved'?`<label><input type="checkbox" data-finding-check="${esc(f.id)}" ${String(f.review_note||'').startsWith('[CP-HOTOVO]')?'checked':''}> <strong>${esc(f.description)}</strong></label>`:`<strong>${esc(f.description)}</strong> <span>${f.review_status==='rejected'?'Zamietnuté':'Nerozhodnuté'}</span>`}<small>${esc(({minor:'Ľahká',major:'Vážna',critical:'Kritická'})[f.severity]||f.severity)}${f.review_note&&!String(f.review_note).startsWith('[CP-HOTOVO]')?' · '+esc(f.review_note):''}</small></div>`).join('')||'<p>Zatiaľ bez zistení z obhliadky.</p>'}`;
     internal.querySelectorAll('[data-finding-check]').forEach(input=>input.onchange=async()=>{
      const f=findings.find(x=>String(x.id)===input.dataset.findingCheck);
      if(!f)return;
      input.disabled=true;
      try{await api().request('inspection_findings&job_id='+encodeURIComponent(job.id)+'&id='+encodeURIComponent(f.id),'PUT',{status:'approved',review_note:input.checked?'[CP-HOTOVO]'+String(f.review_note||'').replace(/^\[CP-HOTOVO\]/,''):String(f.review_note||'').replace(/^\[CP-HOTOVO\]/,'')});await drawFindings()}
      catch(e){alert('Nepodarilo sa uložiť kontrolu do MariaDB: '+e.message);await drawFindings()}
     });
    }catch(e){internal.innerHTML='<p role="alert">Zistenia sa nepodarilo načítať: '+esc(e.message)+'</p>'}
   };
   await drawFindings();
   content.querySelector('#sqPdf').onclick=()=>printDocument(job,items,'quote');
   const undo=content.querySelector('#sqUndo');if(undo)undo.onclick=async()=>{if(!confirm('Zrušiť schválenie CP a vrátiť ju do stavu Čaká na schválenie? Už prenesené položky v zákazkovom liste zostanú zachované.'))return;undo.disabled=true;try{await api().request('quote_decision&job_id='+encodeURIComponent(job.id),'POST',{status:'pending'});await refresh();}catch(e){alert('Nepodarilo sa zrušiť schválenie: '+e.message);undo.disabled=false}};
   for(const [id,status] of [['sqApprove','approved'],['sqReject','rejected']]){
    const btn=content.querySelector('#'+id);if(!btn)continue;
    btn.onclick=async()=>{
     if(!confirm(status==='approved'?'Schváliť CP a preniesť položky do zákazkového listu?':'Zamietnuť CP?'))return;
     btn.disabled=true;
     try{await api().request('quote_decision&job_id='+encodeURIComponent(job.id),'POST',{status});
      overlay.remove();await load();if(status==='approved'){const updated=data.jobs.find(j=>String(j.id)===String(job.id));if(updated)details(updated,'work_order')}
      
     }catch(e){alert('Rozhodnutie CP sa nepodarilo uložiť: '+e.message);btn.disabled=false}
    };
   }

  }catch(e){content.innerHTML='<p role="alert">Nepodarilo sa načítať CP: '+esc(e.message)+'</p>'}
 }
 await refresh();
}
window.TomiOpenQuoteById=async id=>{if(!ready)await load();const j=data.jobs.find(x=>String(x.id)===String(id));if(!j){alert('Zákazka sa nenašla v MariaDB');return}return openQuote(j)};
const quoteFilter=new Set(['pending','approved']);
async function renderQuotes(){
 if(location.hash!=='#quotes')return;
 const target=document.getElementById('app');if(!target)return;
 if(!ready){target.innerHTML=`<div class="pagehead"><h1>Cenové ponuky</h1></div><div class="card">${esc(err||'Načítavam cenové ponuky z MariaDB…')}</div>`;return;}
 target.innerHTML='<div class="pagehead"><div><h1>Cenové ponuky</h1><p>Údaje z MariaDB · položky viazané na konkrétne vozidlo</p></div><button class="btn outline" id="sqRefresh">Obnoviť</button></div><div class="card sj-filter-panel"><strong>Zobraziť stavy CP</strong><div class="sj-filter-states">'+[['pending','Čaká na schválenie'],['approved','Schválená'],['rejected','Zamietnutá']].map(([key,label])=>'<label><input type="checkbox" data-quote-status="'+key+'" '+(quoteFilter.has(key)?'checked':'')+'> '+label+'</label>').join('')+'</div></div><div class="card" id="sqList">Načítavam položky cenových ponúk…</div>';
 target.querySelector('#sqRefresh').onclick=load;target.querySelectorAll('[data-quote-status]').forEach(el=>el.onchange=()=>{if(el.checked)quoteFilter.add(el.dataset.quoteStatus);else quoteFilter.delete(el.dataset.quoteStatus);renderQuotes()});
 const snapshot=data.jobs.slice();
 const records=await Promise.all(snapshot.map(async j=>{
  try{const [r,d]=await Promise.all([api().request('job_items&job_id='+encodeURIComponent(j.id)),api().request('quote_decision&job_id='+encodeURIComponent(j.id))]);return {job:j,items:(r.items||[]).filter(i=>i.section==='quote'),decision:d.decision?.status||'pending',error:null}}
  catch(e){return {job:j,items:[],error:e.message}}
 }));
 if(location.hash!=='#quotes'||!target.isConnected)return;
 const list=target.querySelector('#sqList');if(!list)return;
 const money=n=>Number(n||0).toLocaleString('sk-SK',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
 list.innerHTML=`<div class="tablewrap"><table><thead><tr><th>Číslo</th><th>Zákazník</th><th>Vozidlo</th><th>CP</th><th>Spolu</th><th></th></tr></thead><tbody>${records.filter(r=>quoteFilter.has(r.decision||'pending')).map(({job:j,items,error,decision})=>`<tr><td>${esc(j.job_number)}</td><td>${esc(name(j.customer_id))}</td><td>${esc(car(j.vehicle_id))}</td><td>${error?`<span style="color:#b91c1c">${esc(error)}</span>`:decision==='approved'?'Schválená':decision==='rejected'?'Zamietnutá':items.length?'Čaká na schválenie ('+items.length+' položiek)':'Bez položiek'}</td><td>${money(items.reduce((sum,i)=>sum+Number(i.quantity)*Number(i.sale_unit_net),0))}</td><td><button class="btn outline small" data-sq="${esc(j.id)}">Otvoriť CP</button></td></tr>`).join('')}</tbody></table></div>`;
 list.querySelectorAll('[data-sq]').forEach(b=>b.onclick=()=>openQuote(data.jobs.find(j=>String(j.id)===b.dataset.sq)));
}

function renderIntake(){
 if(location.hash!=='#intake')return;
 const target=document.getElementById('app');if(!target)return;
 const pending=data.jobs.filter(j=>!['service','ready','completed','not_realized','rejected','cancelled'].includes(String(j.status||'pending')));
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



/* Dynamic documents reconstructed from the approved A4 PDF reference layouts.
   Reference originals are kept in /pdf-vzory for visual comparison. */
function printTemplateDocument(job,items,kind){
 const c=data.customers.find(x=>String(x.id)===String(job.customer_id))||{};
 const v=data.vehicles.find(x=>String(x.id)===String(job.vehicle_id))||{};
 const company=job.work_order_mode==='company';
 const isQuote=kind==='quote',isOrder=kind==='work_order',isMechanic=kind==='mechanic';
 const money=n=>Number(n||0).toLocaleString('sk-SK',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
 const val=x=>esc(x||'—');
 const lines=items.filter(i=>i.section===(isQuote?'quote':'work_order'));
 const labor=lines.filter(i=>i.item_type==='labor'),parts=lines.filter(i=>i.item_type==='part');
 const sum=arr=>arr.reduce((a,i)=>a+Number(i.quantity||0)*Number(i.sale_unit_net||0),0);
 const vat=arr=>arr.reduce((a,i)=>a+Number(i.quantity||0)*Number(i.sale_unit_net||0)*Number(i.vat_rate||0)/100,0);
 const label=(title,value)=>`<div class="field"><small>${title}</small><strong>${val(value)}</strong></div>`;
 const title=kind==='quote'?'CENOVÁ PONUKA':kind==='work_order'?'ZÁKAZKOVÝ LIST':kind==='mechanic'?'ZÁKAZKOVÝ LIST – TECHNIK':'PRIJÍMACÍ A ODOVZDÁVACÍ PROTOKOL';
 const subtitle=isQuote||isOrder?`Dokument pre zákazníka · ${company?'Firemná verzia':'Jednoduchá verzia'}`:isMechanic?'Interný pracovný dokument · bez cien':'Príjem a odovzdanie vozidla';
 const section=(number,text)=>`<h2><span>${number}</span> ${text}</h2>`;
 const table=(arr,type)=>{
  if(isMechanic){const head=type==='labor'?'<th>Vykonaný úkon</th><th>Od</th><th>Do</th><th>Trvanie (min)</th>':'<th>Diel / materiál</th><th>MJ</th><th>Množstvo</th><th>Použitý?</th>';
   return `<table><thead><tr>${head}</tr></thead><tbody>${arr.map(i=>type==='labor'?`<tr><td>${val(i.description)}</td><td>________</td><td>________</td><td>________</td></tr>`:`<tr><td>${val(i.description)}</td><td>${val(i.unit)}</td><td>${val(i.quantity)}</td><td>□ Áno &nbsp; □ Nie</td></tr>`).join('')||'<tr><td colspan="4" class="blank">&nbsp;</td></tr>'}</tbody></table>`;
  }
  return `<table><thead><tr><th>${type==='labor'?'Úkon / služba':'Diel / materiál'}</th><th>MJ / počet</th><th class="right">${company?'Cena bez DPH':'Cena'}</th>${company?'<th class="right">Cena s DPH</th>':''}</tr></thead><tbody>${arr.map(i=>`<tr><td>${val(i.description)}</td><td>${val(i.quantity)} ${val(i.unit)}</td><td class="right">${money(Number(i.quantity)*Number(i.sale_unit_net))}</td>${company?`<td class="right">${money(Number(i.quantity)*Number(i.sale_unit_net)*(1+Number(i.vat_rate||0)/100))}</td>`:''}</tr>`).join('')||`<tr><td colspan="${company?4:3}" class="blank">&nbsp;</td></tr>`}</tbody></table>`;
 };
 const meta=`<div class="fields">${label(isQuote?'Číslo cenovej ponuky':'Číslo zákazkového listu',job.job_number)}${label('Dátum',new Date().toLocaleDateString('sk-SK'))}${label('Zákazník',c.name)}${label('EČV',v.plate)}${label('Vozidlo',`${v.make||''} ${v.model||''}`)}${label('VIN',v.vin)}${label('Stav km',job.intake_mileage_km)}${label(isQuote?'Platnosť ponuky':'Číslo CP',isQuote?'—':job.job_number)}</div>`;
 const totals=`${section('03',isQuote?'REKAPITULÁCIA CENOVEJ PONUKY':'REKAPITULÁCIA')}<div class="totals"><div><span>${isQuote?'Cena práce':'Práca'} ${company?'bez DPH':''}</span><b>${money(sum(labor))}</b></div><div><span>${isQuote?'Cena dielov':'Diely'} ${company?'bez DPH':''}</span><b>${money(sum(parts))}</b></div>${company?`<div><span>DPH spolu</span><b>${money(vat(lines))}</b></div>`:''}<div class="grand"><span>CELKOM ${company?'S DPH':''}</span><b>${money(sum(lines)+(company?vat(lines):0))}</b></div></div>`;
 const body=isQuote?`${meta}${section('01','NAVRHOVANÉ PRÁCE')}${table(labor,'labor')}${section('02','NAVRHOVANÉ DIELY A MATERIÁL')}${table(parts,'part')}${totals}${section('04','ROZSAH A PODMIENKY PONUKY')}<div class="lined">${val(job.customer_request||job.repair_description)}</div><p>Schválenie zákazníkom: □ Schvaľujem &nbsp; □ Neschvaľujem</p><div class="sign"><span>Dátum: __________________</span><span>Podpis / potvrdenie: __________________</span></div>`:
 isOrder?`${meta}${section('01','VYKONANÉ PRÁCE')}${table(labor,'labor')}${section('02','POUŽITÉ DIELY A MATERIÁL')}${table(parts,'part')}${totals}${section('04','NEVYKONANÉ PRÁCE / ODPORÚČANIA')}<div class="lined">${val(job.repair_description||'')}</div>`:
 isMechanic?`${meta}${section('01','VYKONANÉ PRÁCE')}${table(labor,'labor')}<p class="hint">Čas sa doplní automaticky zo začiatku a konca práce alebo ručne.</p>${section('02','POUŽITÉ DIELY A MATERIÁL')}${table(parts,'part')}${section('03','NEVYKONANÉ PRÁCE / ODPORÚČANIA')}<div class="lined"></div><div class="lined"></div>`:
 `${section('01','VOZIDLO A ZÁKAZNÍK – PREDVYPLNENÉ ZO ZÁKAZKY')}<div class="fields">${label('Zákazník / spoločnosť',c.name)}${label('Kontakt',c.phone||c.email)}${label('Vozidlo (značka, model, motorizácia)',`${v.make||''} ${v.model||''}`)}${label('EČV',v.plate)}${label('VIN',v.vin)}${label('Číslo zákazkového listu',job.job_number)}</div>${section('02','PRÍJEM VOZIDLA')}<div class="fields">${label('Dátum a čas príjmu',job.received_at)}${label('Stav tachometra (km)',job.intake_mileage_km)}${label('Počet kľúčov','________')}</div><p>Palivo: &nbsp; □ Rezerva &nbsp; □ 1/4 &nbsp; □ 1/2 &nbsp; □ 3/4 &nbsp; □ Plná</p><p>Odovzdaná výbava: &nbsp; □ Doklady &nbsp; □ Servisná knižka &nbsp; □ Rezerva / sada</p><p>Vizuálny stav: &nbsp; □ Bez viditeľných poškodení &nbsp; □ Poškodenia zaznamenané / foto</p><div class="lined">Existujúce poškodenia / poznámka k stavu:</div><p>Skúšobná jazda po oprave: &nbsp; □ POVOĽUJEM &nbsp; □ NEPOVOĽUJEM</p><p class="hint">Zákazník rozhoduje o povolení jazdy na vozidle na účely testovania po oprave.</p>${section('03','POTVRDENIE PRÍJMU')}<p>Zákazník a servis potvrdzujú zaznamenaný stav vozidla pri prevzatí.</p><div class="sign"><span>Za servis – meno / podpis __________________</span><span>Zákazník – meno / podpis __________________</span></div>${section('04','ODOVZDANIE VOZIDLA')}<div class="fields">${label('Dátum a čas odovzdania','________')}${label('Stav tachometra (km)','________')}${label('Odovzdané kľúče','________')}</div><div class="lined">Stav vozidla pri odovzdaní / výhrady zákazníka:</div><p>Zákazník potvrdzuje prevzatie vozidla a odovzdaných kľúčov / dokladov.</p><div class="sign"><span>Za servis – meno / podpis __________________</span><span>Zákazník – meno / podpis __________________</span></div>`;
 const html=`<!doctype html><html lang="sk"><head><meta charset="utf-8"><title>${title} · ${val(job.job_number)}</title><style>@page{size:A4;margin:14mm 16mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#18273c;margin:0}header{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;min-height:76px}.logo{width:215px;max-height:75px;object-fit:contain;object-position:left top}.company{text-align:right;line-height:1.5;font-size:10px;color:#31455c}.doc-title{display:flex;align-items:center;justify-content:space-between;margin:12px 0 15px;border-bottom:2px solid #164e85;padding-bottom:8px}h1{font-size:19px;color:#122e52;margin:0}.subtitle{font-size:10px;color:#64748b;margin-top:5px}h2{font-size:12px;color:#fff;background:#15578e;padding:7px 9px;margin:18px 0 9px;break-after:avoid}h2 span{color:#f0d8dc;margin-right:6px}.fields{display:grid;grid-template-columns:1fr 1fr;gap:9px 20px}.field{min-height:35px;border-bottom:1px solid #b7c7d7;padding:2px 0 6px}.field small{display:block;color:#61768c;font-size:9px;margin-bottom:5px}.field strong{font-size:11px;font-weight:600}table{width:100%;border-collapse:collapse;table-layout:auto;font-size:10px}th{text-align:left;background:#eaf2f9;color:#17436b}th,td{padding:8px 7px;border-bottom:1px solid #cad7e3}tr{break-inside:avoid}.right{text-align:right;white-space:nowrap}.blank{height:34px}.totals{width:100%;display:grid;grid-template-columns:1fr 1fr;gap:8px 24px}.totals>div{display:flex;justify-content:space-between;border-bottom:1px solid #c7d6e4;padding:6px 2px}.totals .grand{color:#114879;font-size:13px;font-weight:bold;border-bottom:2px solid #15578e}.lined{border-bottom:1px solid #aebfd0;min-height:36px;padding:8px 2px}.sign{display:flex;justify-content:space-between;gap:20px;margin:22px 0 12px}.sign span{flex:1;font-size:10px}.hint{font-size:9px;color:#63758a}footer{margin-top:24px;border-top:1px solid #9bb3ca;padding-top:8px;font-size:9px;color:#63758a}p{line-height:1.5} @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}h2{background:#15578e!important;color:#fff!important}}</style></head><body><header><img class="logo" src="${new URL('/assets/logo.png',location.href).href}" alt="AUTOSERVIS TOMI"><div class="company"><b>AC7-SK, s.r.o.</b><br>M. R. Štefánika 3560/109, 010 01 Žilina<br>IČO: 44 221 134 | DIČ: 2022625979<br>IČ DPH: SK2022625979</div></header><div class="doc-title"><div><h1>${title}</h1><div class="subtitle">${subtitle}</div></div><b>${val(job.job_number)}</b></div>${body}<footer>AUTOSERVIS TOMI | AC7-SK, s.r.o. | Dokument vygenerovaný zo zákazky</footer></body></html>`;
 const w=window.open('','_blank');if(!w){alert('Povoľ vyskakovacie okná pre tlač dokumentu.');return}
 w.document.open();w.document.write(html);w.document.close();w.focus();
 const logo=w.document.querySelector('.logo');let done=false;const print=()=>{if(!done){done=true;w.print()}};
 if(logo&&!logo.complete){logo.onload=print;logo.onerror=print;setTimeout(print,1800)}else setTimeout(print,350);
}

function printQuotePdf(job,items){
 return printTemplateDocument(job,items,'quote');
 const customer=data.customers.find(x=>String(x.id)===String(job.customer_id))||{};
 const vehicle=data.vehicles.find(x=>String(x.id)===String(job.vehicle_id))||{};
 const company=job.work_order_mode==='company';
 const money=n=>Number(n||0).toLocaleString('sk-SK',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
 const lines=items.filter(i=>i.section==='quote');
 const net=lines.reduce((a,i)=>a+Number(i.quantity)*Number(i.sale_unit_net),0);
 const gross=lines.reduce((a,i)=>a+Number(i.quantity)*Number(i.sale_unit_net)*(1+Number(i.vat_rate||0)/100),0);
 const rows=type=>lines.filter(i=>i.item_type===type).map(i=>`<tr><td>${esc(i.description)}</td><td>${esc(i.quantity)} ${esc(i.unit)}</td><td class="right">${money(i.sale_unit_net)}</td>${company?`<td class="right">${money(Number(i.sale_unit_net)*(1+Number(i.vat_rate||0)/100))}</td>`:''}<td class="right">${money(Number(i.quantity)*Number(i.sale_unit_net))}</td></tr>`).join('')||`<tr><td colspan="${company?5:4}" class="empty">Bez položiek</td></tr>`;
 const table=(title,type)=>`<h2>${title}</h2><table><thead><tr><th>Popis</th><th>Množstvo</th><th class="right">${company?'Cena bez DPH':'Cena'}</th>${company?'<th class="right">Cena s DPH</th>':''}<th class="right">Spolu</th></tr></thead><tbody>${rows(type)}</tbody></table>`;
 const html=`<!doctype html><html lang="sk"><head><meta charset="utf-8"><title>CP ${esc(job.job_number)}</title><style>
 @page{size:A4;margin:16mm}*{box-sizing:border-box}body{font:12px Arial,Helvetica,sans-serif;color:#15243b;margin:0}header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #155e9b;padding-bottom:16px;margin-bottom:20px}.brand{display:flex;align-items:center;gap:12px}.brand img{width:62px;height:62px;object-fit:contain}.brand strong{font-size:22px;letter-spacing:.6px}.muted{color:#65758b}h1{font-size:22px;margin:0}h2{font-size:13px;margin:22px 0 8px;padding:7px 10px;background:#eaf2f8;color:#164d79;break-after:avoid}.meta{display:grid;grid-template-columns:1fr 1fr;gap:12px}.panel{border:1px solid #d6e0e8;padding:12px;border-radius:6px;line-height:1.65;min-height:98px}table{border-collapse:collapse;width:100%;font-size:11px}th{background:#edf3f8;text-align:left;color:#31455c}td,th{border-bottom:1px solid #dce5ec;padding:8px 6px}tr{break-inside:avoid}.right{text-align:right}.empty{color:#8b99a9}.totals{margin:20px 0 0 auto;width:270px}.totals div{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #e0e6eb}.totals .grand{font-size:15px;font-weight:700;border-top:2px solid #155e9b}.terms{margin-top:26px;padding:10px;background:#f5f8fb;line-height:1.55}.sign{display:flex;gap:28px;margin-top:38px}.sign div{flex:1;border-top:1px solid #64748b;padding-top:7px}footer{margin-top:32px;border-top:1px solid #cbd5e1;padding-top:8px;font-size:10px;color:#64748b}@media print{button{display:none}}
 </style></head><body><header><div class="brand"><img src="${new URL('/assets/logo.png',location.href).href}" alt=""><div><strong>AUTOSERVIS TOMI</strong><div class="muted">Cenová ponuka · ${company?'Firma':'FO'}</div></div></div><div style="text-align:right"><h1>CENOVÁ PONUKA</h1><div>Číslo: <b>${esc(job.job_number)}</b></div><div>Dátum: ${new Date().toLocaleDateString('sk-SK')}</div></div></header><div class="meta"><div class="panel"><b>ZÁKAZNÍK</b><div>${esc(customer.name||'—')}</div><div>${esc(customer.address||'')}</div><div>${esc(customer.phone||'')}</div></div><div class="panel"><b>VOZIDLO</b><div>${esc(vehicle.make||'')} ${esc(vehicle.model||'')}</div><div>EČV: ${esc(vehicle.plate||'—')} · VIN: ${esc(vehicle.vin||'—')}</div><div>Stav km: ${esc(job.intake_mileage_km||'—')}</div></div></div>${table('01 NAVRHOVANÉ PRÁCE','labor')}${table('02 NAVRHOVANÉ DIELY A MATERIÁL','part')}<h2>03 REKAPITULÁCIA CENOVEJ PONUKY</h2><div class="totals"><div><span>Práca ${company?'bez DPH':''}</span><b>${money(lines.filter(i=>i.item_type==='labor').reduce((a,i)=>a+Number(i.quantity)*Number(i.sale_unit_net),0))}</b></div><div><span>Diely ${company?'bez DPH':''}</span><b>${money(lines.filter(i=>i.item_type==='part').reduce((a,i)=>a+Number(i.quantity)*Number(i.sale_unit_net),0))}</b></div>${company?`<div><span>DPH</span><b>${money(gross-net)}</b></div>`:''}<div class="grand"><span>CELKOM ${company?'S DPH':''}</span><b>${money(company?gross:net)}</b></div></div><h2>04 ROZSAH A PODMIENKY</h2><div class="terms">Rozsah ponuky: ${esc(job.customer_request||job.repair_description||'Podľa uvedených položiek.')}<p>Dodatočné práce sa vykonajú až po odsúhlasení zákazníkom.</p><p>Rozhodnutie zákazníka: □ Schvaľujem &nbsp;&nbsp; □ Neschvaľujem</p></div><div class="sign"><div>Za servis · dátum / podpis</div><div>Zákazník · dátum / podpis</div></div><footer>AUTOSERVIS TOMI · AC7-SK, s.r.o. · Žilina</footer></body></html>`;
 const w=window.open('','_blank');if(!w){alert('Povoľ vyskakovacie okná pre tlač PDF.');return}
 w.document.open();w.document.write(html);w.document.close();w.focus();
 const logo=w.document.querySelector('.brand img');let printed=false;const go=()=>{if(!printed){printed=true;w.print()}};
 if(logo&& !logo.complete){logo.onload=go;logo.onerror=go;setTimeout(go,1500)}else setTimeout(go,350);
}
function printMechanicPdf(job,items){
 return printTemplateDocument(job,items,'mechanic');
 const v=data.vehicles.find(x=>String(x.id)===String(job.vehicle_id))||{};
 const c=data.customers.find(x=>String(x.id)===String(job.customer_id))||{};
 const rows=items.filter(i=>i.section==='work_order');
 const html=`<!doctype html><html lang="sk"><head><meta charset="utf-8"><title>List mechanika ${esc(job.job_number)}</title><style>@page{size:A4;margin:17mm}body{font:13px Arial,sans-serif;color:#1e293b}header{border-bottom:3px solid #1d5c91;padding:0 0 14px;display:flex;justify-content:space-between}h1{font-size:21px}h2{font-size:15px;background:#eaf2f8;padding:8px}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #d4dde6;padding:9px;text-align:left}p{line-height:1.7}.space{height:110px;border:1px solid #d4dde6}</style></head><body><header><div><img src="${new URL('/assets/logo.png',location.href).href}" style="max-width:210px;max-height:58px;object-fit:contain" alt="AUTOSERVIS TOMI"><br><b>ZÁKAZKOVÝ LIST PRE MECHANIKA</b></div><div>Číslo ${esc(job.job_number)}<p>${new Date().toLocaleDateString('sk-SK')}</p></div></header><p><b>Zákazník:</b> ${esc(c.name)}<br><b>Vozidlo:</b> ${esc(v.make)} ${esc(v.model)} · ${esc(v.plate)}<br><b>VIN:</b> ${esc(v.vin)}<br><b>Km:</b> ${esc(job.intake_mileage_km)}<br><b>Mechanik:</b> ${esc(job.assigned_user_id||'')}</p><h2>POŽADOVANÉ PRÁCE</h2><p>${esc(job.customer_request||'')}</p><h2>PRÁCE A KONTROLY</h2><table><tr><th>Úkon / diel</th><th>Množstvo</th><th>Vykonané ✓</th></tr>${rows.map(i=>`<tr><td>${esc(i.description)}</td><td>${esc(i.quantity)} ${esc(i.unit)}</td><td>□</td></tr>`).join('')}</table><h2>ZISTENÉ ZÁVADY A POZNÁMKY MECHANIKA</h2><div class="space"></div><h2>ČAS PRÁCE / PODPIS</h2><p>Začiatok: ______________ Koniec: ______________ Mechanik: ______________</p></body></html>`;
 const w=window.open('','_blank');if(!w){alert('Povoľ vyskakovacie okná pre PDF');return}w.document.write(html);w.document.close();w.focus();setTimeout(()=>w.print(),350);
}
function printDocument(job,items,kind){
 return printTemplateDocument(job,items,kind);

 const customer=data.customers.find(x=>String(x.id)===String(job.customer_id))||{};
 const vehicle=data.vehicles.find(x=>String(x.id)===String(job.vehicle_id))||{};
 const titles={quote:'CENOVÁ PONUKA',work_order:'ZÁKAZKOVÝ LIST',intake:'PRIJÍMACÍ PROTOKOL',handover:'ODOVZDÁVACÍ PROTOKOL'};
 const money=n=>Number(n||0).toLocaleString('sk-SK',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
 const section=kind==='quote'?'quote':'work_order';
 const company=job.work_order_mode==='company';
 const lines=items.filter(i=>i.section===section);
 const total=lines.reduce((sum,i)=>sum+Number(i.quantity)*Number(i.sale_unit_net),0);
 const sortedLines=kind==='work_order'?[...lines].sort((a,b)=>(a.item_type==='part'?0:1)-(b.item_type==='part'?0:1)):lines;
 const rows=sortedLines.map(i=>`<tr><td>${esc(i.item_type==='part'?'Diel':'Práca')}</td><td>${esc(i.description)}</td><td>${esc(i.quantity)} ${esc(i.unit)}</td><td class="right">${money(i.sale_unit_net)}</td>${company?`<td class="right">${money(Number(i.sale_unit_net)*(1+Number(i.vat_rate)/100))}</td>`:''}<td class="right">${money(Number(i.quantity)*Number(i.sale_unit_net))}</td></tr>`).join('');
 const price=['quote','work_order'].includes(kind);
 const html=`<!doctype html><html lang="sk"><head><meta charset="utf-8"><title>${esc(titles[kind])} ${esc(job.job_number)}</title><style>
 @page{size:A4;margin:17mm}*{box-sizing:border-box}body{font:12px Arial,sans-serif;color:#1e293b;margin:0}header{border-bottom:3px solid #101c70;padding-bottom:15px;margin-bottom:25px;display:flex;justify-content:space-between}h1{font-size:21px;margin:0 0 6px}h2{font-size:14px;margin:22px 0 10px}.muted{color:#64748b}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.panel{border:1px solid #cbd5e1;padding:12px;border-radius:6px;min-height:85px}table{border-collapse:collapse;width:100%;margin-top:10px}th,td{border-bottom:1px solid #cbd5e1;padding:8px 6px;text-align:left}th{background:#e8effa;color:#101c70}.right{text-align:right}.total{font-size:15px;text-align:right;margin-top:14px;font-weight:bold}.sign{display:flex;gap:50px;margin-top:75px}.sign div{flex:1;border-top:1px solid #64748b;text-align:center;padding:10px}.notes{white-space:pre-wrap;min-height:40px}@media print{button{display:none}}</style></head><body><header><div><img src="${new URL('/assets/logo.png',location.href).href}" style="max-width:220px;max-height:58px;object-fit:contain" alt="AUTOSERVIS TOMI"><h1>${esc(titles[kind])}</h1><strong>Číslo: ${esc(job.job_number)}</strong></div><div>AC7-SK, s.r.o.<br><span class="muted">Dátum: ${new Date().toLocaleDateString('sk-SK')}</span></div></header>
 <div class="grid"><div class="panel"><b>Zákazník</b><p>${esc(customer.name)}<br>${esc(customer.address)}<br>${esc(customer.phone)}<br>${esc(customer.email)}</p></div><div class="panel"><b>Vozidlo</b><p>${esc(vehicle.make)} ${esc(vehicle.model)}<br>EČV: ${esc(vehicle.plate)}<br>VIN: ${esc(vehicle.vin)}<br>Kilometre: ${esc(job.intake_mileage_km)}</p></div></div>
 <h2>Požiadavka zákazníka</h2><div class="notes">${esc(job.customer_request||'—')}</div><h2>Popis opravy</h2><div class="notes">${esc(job.repair_description||'—')}</div>
 ${price?`<h2>${kind==='quote'?'Navrhované práce a diely':'01 DIELY A MATERIÁL / 02 PRÁCA'}</h2><table><thead><tr><th>Typ</th><th>Popis</th><th>Množstvo</th><th class="right">${company?'Cena / MJ bez DPH':'Cena / MJ'}</th>${company?'<th class="right">Cena / MJ s DPH</th>':''}<th class="right">${company?'Spolu bez DPH':'Spolu'}</th></tr></thead><tbody>${rows}</tbody></table><div class="total">${company?'Spolu bez DPH':'Spolu'}: ${money(total)}${company?`<div>Spolu s DPH: ${money(lines.reduce((sum,i)=>sum+Number(i.quantity)*Number(i.sale_unit_net)*(1+Number(i.vat_rate)/100),0))}</div>`:''}</div>`:''}
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
 const company=job.work_order_mode==='company';
 const money=n=>Number(n||0).toLocaleString('sk-SK',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
 const order=items.filter(i=>i.section==='work_order');
 const sum=(arr)=>arr.reduce((a,i)=>a+Number(i.quantity)*Number(i.sale_unit_net),0);
 const statusOptions=[['pending','Prijatá'],['inspection','Obhliadka'],['waiting','Čaká'],['service','Servis'],['ready','Na odovzdanie'],['completed','Ukončená'],['not_realized','Nerealizovaná']];
 let decision='pending';try{const d=await api().request('quote_decision&job_id='+encodeURIComponent(job.id));decision=d.decision?.status||'pending'}catch(e){decision='error'}
 const cpState=decision==='approved'?'Schválená':decision==='rejected'?'Zamietnutá':decision==='error'?'Stav CP sa nepodarilo načítať':items.some(i=>i.section==='quote')?'Čaká na schválenie':'Bez CP';
 const section=(type,title)=>{const rows=order.filter(i=>i.item_type===type);return `<section class="sj-order-group"><h3>${title}</h3><div class="tablewrap"><table><thead><tr><th>Popis</th><th>Množstvo</th><th>${company?'Cena bez DPH / MJ':'Cena / MJ'}</th>${company?'<th>Cena s DPH / MJ</th>':''}<th>Spolu</th><th></th></tr></thead><tbody>${rows.map(i=>`<tr><td>${esc(i.description)}</td><td>${esc(i.quantity)} ${esc(i.unit)}</td><td>${money(i.sale_unit_net)}</td>${company?`<td>${money(Number(i.sale_unit_net)*(1+Number(i.vat_rate||0)/100))}</td>`:''}<td>${money(Number(i.quantity)*Number(i.sale_unit_net))}</td><td><button class="btn outline small" data-item="${i.id}">Upraviť</button></td></tr>`).join('')||`<tr><td colspan="${company?6:5}">Zatiaľ bez položiek</td></tr>`}</tbody></table></div><div class="sj-group-bottom"><strong>Spolu: ${money(sum(rows))}</strong><button class="btn outline small" data-add-type="${type}">+ Pridať ${type==='part'?'diel':'prácu'}</button></div></section>`};
 target.innerHTML=`<div class="sj-compact-head"><button class="btn outline small" id="sjBack">← Zákazky</button><h1>${esc(job.job_number)}</h1><div class="sj-head-actions"><button class="btn small" id="sjExtra">+ PRÁCE NAVIAC</button><button class="btn small" id="sjPlanCalendar" style="background:#167c42;color:white">📅 Vložiť do kalendára</button><button class="btn outline small" id="sjEdit">Upraviť zákazku</button></div></div>
 <div class="sj-compact-overview"><div class="sj-identity"><strong>${esc(name(job.customer_id))}</strong><span>${esc(car(job.vehicle_id))}</span><b class="sj-plate">${esc((data.vehicles.find(v=>String(v.id)===String(job.vehicle_id))||{}).plate||'EČV neuvedená')}</b></div><div class="sj-controls"><label>Stav zákazky<select class="sj-status-control" id="sjStatus">${statusOptions.map(([v,t])=>`<option value="${v}" ${job.status===v?'selected':''}>${t}</option>`).join('')}</select></label><label>Stav vozidla<select class="sj-onsite-control" id="sjOnsite"><option value="1" ${job.vehicle_on_site!=0?'selected':''}>V areáli</option><option value="0" ${job.vehicle_on_site==0?'selected':''}>Mimo areálu</option></select></label><div class="sj-field-mini">Stav CP<strong class="sj-cp-state" data-state="${esc(decision)}">${esc(cpState)}</strong></div><div class="sj-field-mini">Režim cien<strong>${company?'Firma':'FO'}</strong></div><div class="sj-field-mini">Mechanik<strong>${esc(job.assigned_user_id||'Nepriradený')}</strong></div><label>Úhrada<select id="sjPayment"><option value="unpaid" ${job.invoice_status==='unpaid'?'selected':''}>Neuhradené</option><option value="paid" ${job.invoice_status==='paid'?'selected':''}>Uhradené</option></select></label><label>Faktúra<input id="sjInvoice" placeholder="Číslo faktúry" value="${esc(job.invoice_number||'')}"></label><button class="btn outline small sj-save-inline" id="sjSaveState" title="Uložiť stav">💾 Uložiť</button></div></div>
 <div class="sj-document-strip"><button class="btn outline small" id="sjInspection">Obhliadka</button><button class="btn outline small" id="sjOpenCp">Otvoriť CP</button><button class="btn outline small" id="sjQuotePdf">CP · PDF</button><button class="btn outline small" id="sjOrderPdf">Zákazkový list · PDF</button><button class="btn outline small" id="sjMechanicPdf">List mechanika · PDF</button><button class="btn outline small" id="sjIntakePdf">Prijímací protokol · PDF</button><button class="btn outline small" id="sjHandoverPdf">Odovzdávací protokol · PDF</button></div>
 <div class="card sj-order-card"><h2>ZÁKAZKOVÝ LIST</h2>${section('part','01 NÁHRADNÉ DIELY A MATERIÁL')}${section('labor','02 PRÁCA A SLUŽBY')}<div class="sj-order-total"><strong>Diely: ${money(sum(order.filter(i=>i.item_type==='part')))}</strong><strong>Práca: ${money(sum(order.filter(i=>i.item_type==='labor')))}</strong><strong>Spolu ${company?'bez DPH':''}: ${money(sum(order))}</strong>${company?`<strong>Spolu s DPH: ${money(order.reduce((a,i)=>a+Number(i.quantity)*Number(i.sale_unit_net)*(1+Number(i.vat_rate||0)/100),0))}</strong>`:''}</div></div>
 <div class="card sj-notes-card"><h3 id="sjNoteBlock">Poznámky</h3>${notes.map(n=>`<p>${esc(n.body)} <small>${esc(n.created_at)}</small></p>`).join('')}<form id="sjNote"><textarea name="body" required placeholder="Nová poznámka"></textarea><button class="btn" type="submit">Uložiť poznámku</button></form></div><div class="card sj-request-card"><h3 id="sjRequestBlock">Potrebujem diely ${requests.some(r=>r.status==='pending')?'🔴':''}</h3><div class="tablewrap"><table><thead><tr><th>Diel / požiadavka</th><th>Množstvo</th><th>Stav</th><th>Zmeniť stav</th></tr></thead><tbody>${requests.map(r=>`<tr><td>${esc(r.description)}</td><td>${esc(r.quantity)}</td><td>${esc(({pending:'Čaká',ordered:'Objednané',received:'Dodané',cancelled:'Zrušené'})[r.status]||r.status)}</td><td><select data-request="${r.id}"><option value="pending" ${r.status==='pending'?'selected':''}>Čaká</option><option value="ordered" ${r.status==='ordered'?'selected':''}>Objednané</option><option value="received" ${r.status==='received'?'selected':''}>Dodané</option><option value="cancelled" ${r.status==='cancelled'?'selected':''}>Zrušené</option></select></td></tr>`).join('')}</tbody></table></div><form id="sjRequest" class="sj-request-form" style="display:flex;gap:8px;flex-wrap:wrap"><input name="description" required placeholder="Potrebný diel"><input name="quantity" type="number" min="1" value="1" required style="width:80px"><button class="btn" type="submit">Pridať požiadavku</button></form></div><div class="card"><h3 id="sjDocBlock">Dokumenty – uložené na serveri</h3><form id="sjDocUpload"><input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png,.webp" required><button class="btn" type="submit">Nahrať dokument</button></form><div id="sjDocs">${docs.length?docs.map(d=>`<p><button class="btn outline small" data-doc="${d.id}">Stiahnuť</button> ${esc(d.original_name)} (${Math.ceil(Number(d.byte_size)/1024)} kB)</p>`).join(''):'Zatiaľ žiadne uložené dokumenty.'}</div></div><p class="muted">PDF sa vytvára cez tlač prehliadača. Na archiváciu ho ulož a nahraj medzi dokumenty.</p>`;
 target.querySelector('#sjOpenCp').onclick=()=>openQuote(job);
 target.querySelector('#sjInspection').onclick=()=>{if(typeof window.openServerInspection==='function')window.openServerInspection(job);else {location.hash='#inspections';alert('Obhliadku otvor v zozname obhliadok.')}};
 target.querySelector('#sjMechanicPdf').onclick=()=>printMechanicPdf(job,items);
 target.querySelectorAll('[data-add-type]').forEach(b=>b.onclick=()=>itemForm(job,{section:'work_order',item_type:b.dataset.addType},details));
 target.querySelector('#sjPayment').dataset.state=target.querySelector('#sjPayment').value;
 target.querySelector('#sjPayment').onchange=e=>e.target.dataset.state=e.target.value;
 for(const [id,kind] of [['sjQuotePdf','quote'],['sjOrderPdf','work_order'],['sjIntakePdf','intake'],['sjHandoverPdf','handover']]){
  target.querySelector('#'+id).onclick=()=>printDocument(job,items,kind);
 }
 target.querySelector('#sjRequest').onsubmit=async e=>{e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;try{await api().request('part_requests&job_id='+job.id,'POST',{description:e.target.elements.description.value,quantity:Number(e.target.elements.quantity.value)});details(job)}catch(ex){alert(ex.message);btn.disabled=false}};
 target.querySelectorAll('[data-request]').forEach(el=>el.onchange=async()=>{el.disabled=true;try{await api().request('part_requests&job_id='+job.id+'&id='+el.dataset.request,'PUT',{status:el.value});details(job)}catch(ex){alert(ex.message);el.disabled=false}});
 target.querySelector('#sjDocUpload').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{await api().uploadDocument(job.id,e.target.elements.file.files[0]);details(job)}catch(ex){alert(ex.message);b.disabled=false}};
 target.querySelectorAll('[data-doc]').forEach(b=>b.onclick=async()=>{const d=docs.find(x=>String(x.id)===b.dataset.doc);try{await api().downloadDocument(job.id,d.id,d.original_name)}catch(ex){alert(ex.message)}});
 target.querySelector('#sjExtra').onclick=()=>{alert('Práce naviac zatiaľ nie sú prepojené so schválením zákazníka. Do zákazky sa nič nepridalo.');};
 target.querySelector('#sjStatus').onchange=()=>{const status=target.querySelector('#sjStatus').value;if(['service','ready'].includes(status))target.querySelector('#sjOnsite').value='1';if(['completed','not_realized'].includes(status))target.querySelector('#sjOnsite').value='0';paintStatus()};
 target.querySelector('#sjOnsite').onchange=paintStatus;
 function paintStatus(){const status=target.querySelector('#sjStatus');status.dataset.state=status.value;const onsite=target.querySelector('#sjOnsite');onsite.dataset.state=onsite.value==='1'?'onsite':'outside'}paintStatus();
 target.querySelector('#sjSaveState').onclick=async()=>{const b=target.querySelector('#sjSaveState');b.disabled=true;try{await api().request('jobs&id='+job.id,'PUT',{status:target.querySelector('#sjStatus').value,vehicle_on_site:['service','ready'].includes(target.querySelector('#sjStatus').value)?1:['completed','not_realized'].includes(target.querySelector('#sjStatus').value)?0:Number(target.querySelector('#sjOnsite').value),invoice_status:target.querySelector('#sjPayment').value,invoice_number:target.querySelector('#sjInvoice').value.trim()});if(target.querySelector('#sjStatus').value==='not_realized'){
          // Cancel outstanding requests in the API; retain their audit/history records.
          const response=await api().request('part_requests&job_id='+encodeURIComponent(job.id));
          const active=(response.items||[]).filter(r=>!['resolved','completed','cancelled','done','vybavené','zrušené'].includes(String(r.status||'').toLowerCase()));
          const failed=[];
          for(const r of active){try{await api().request('part_requests&job_id='+encodeURIComponent(job.id)+'&id='+encodeURIComponent(r.id),'PUT',{status:'cancelled'})}catch(err){failed.push(String(r.id))}}
          if(failed.length)alert('Zákazka je nerealizovaná, ale nepodarilo sa zrušiť '+failed.length+' požiadaviek na diely. Skontrolujte API a požiadavky v zákazke.');
        }
        window.dispatchEvent(new Event('tomi-yard-refresh'));
        await load();const updated=data.jobs.find(j=>String(j.id)===String(job.id));if(updated)await details(updated)}catch(e){alert('Stav sa nepodarilo uložiť: '+e.message);b.disabled=false}};
 target.querySelector('#sjBack').onclick=()=>{location.hash='#jobs';load()};
 target.querySelector('#sjEdit').onclick=()=>edit(job);
 target.querySelector('#sjPlanCalendar').onclick=async()=>{
  const overlay=document.createElement('div');overlay.className='sj-inspection-overlay';
  overlay.innerHTML='<section class="sj-inspection-dialog" role="dialog" aria-modal="true" style="max-width:500px;padding:20px"><h2>Vložiť do kalendára · '+esc(job.job_number)+'</h2><p>'+esc(car(job.vehicle_id))+'</p><form id="sjPlanForm" class="sj-form"><label class="sj-field">Dátum a čas začiatku<input name="start" type="datetime-local" required value="'+when()+'"></label><label class="sj-field">Odhadovaný čas (minúty)<input name="minutes" type="number" min="15" max="1440" value="120" required></label><label class="sj-field">Mechanik<select name="mechanic"><option value="">Nepridelený</option></select></label><label class="sj-field">Poznámka<input name="note" maxlength="1000" value="'+esc(job.repair_description||'')+'"></label><div class="sj-actions"><button type="button" class="btn outline" id="sjPlanClose">Zrušiť</button><button class="btn" type="submit">Uložiť do kalendára</button></div><p id="sjPlanError" role="alert"></p></form></section>';
  document.body.append(overlay);overlay.querySelector('#sjPlanClose').onclick=()=>overlay.remove();overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
  const form=overlay.querySelector('#sjPlanForm');try{const staff=await api().request('staff43');const sel=form.elements.mechanic;(staff.items||[]).filter(x=>x.role==='mechanic'&&Number(x.is_active)).forEach(x=>{const opt=document.createElement('option');opt.value=x.id;opt.textContent=x.display_name;sel.append(opt)});sel.value=String(job.assigned_user_id||'');}catch(e){form.querySelector('#sjPlanError').textContent='Mechanikov sa nepodarilo načítať: '+e.message;}
  form.onsubmit=async e=>{e.preventDefault();const b={operation:'create',job_id:Number(job.id),mechanic_user_id:Number(form.elements.mechanic.value)||0,planned_start:dateSql(form.elements.start.value),planned_minutes:Number(form.elements.minutes.value),note:form.elements.note.value};const btn=form.querySelector('[type=submit]');btn.disabled=true;try{await api().request('schedule43','POST',b);window.t43day=form.elements.start.value.slice(0,10);overlay.remove();if(confirm('Zákazka je vložená do kalendára. Otvoriť plán na deň?'))location.hash='#calendar';}catch(err){form.querySelector('#sjPlanError').textContent='Uloženie zlyhalo: '+err.message;}finally{btn.disabled=false}};
 };

 target.querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>itemForm(job,items.find(i=>String(i.id)===b.dataset.item),details));
 target.querySelector('#sjNote').onsubmit=async e=>{e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;try{await api().request('job_notes&job_id='+job.id,'POST',{body:e.target.elements.body.value,note_type:'general'});details(job)}catch(ex){alert(ex.message);btn.disabled=false}};
}
function itemForm(job,item,back){
 const company=job.work_order_mode==='company';
 const initialVat=company?Number(item.vat_rate??23):0;
 const initialNet=Number(item.sale_unit_net||0);
 const overlay=document.createElement('div');overlay.style.cssText='position:fixed;inset:0;z-index:10000;background:#0009;display:grid;place-items:center;padding:16px';
 overlay.innerHTML=`<div class="sj-dialog" role="dialog" aria-modal="true" aria-label="${item.id?'Upraviť':'Pridať'} položku"><div class="sj-dialog-head"><div><div class="sj-kicker">${esc(job.job_number)}</div><h2>${item.id?'Upraviť':'Pridať'} položku</h2></div><button class="sj-close" id="sjItemCancel" type="button" aria-label="Zavrieť">✕</button></div><form id="sjItem" class="sj-form"><div class="sj-fields sj-two"><label class="sj-field"><span>Sekcia</span><select name="section"><option value="work_order" selected>Zákazkový list</option></select></label><label class="sj-field"><span>Typ položky</span><select name="item_type"><option value="part" ${item.item_type==='part'?'selected':''}>Náhradný diel</option><option value="labor" ${item.item_type==='labor'?'selected':''}>Práca</option></select></label></div><label class="sj-field"><span>Popis položky</span><input name="description" required maxlength="500" placeholder="Napr. výmena brzdových platničiek" value="${esc(item.description)}"></label><div class="sj-fields sj-two"><label class="sj-field"><span>Množstvo</span><input name="quantity" required type="number" step="0.001" min="0.001" value="${esc(item.quantity||1)}"></label><label class="sj-field"><span>Jednotka</span><input name="unit" maxlength="20" value="${esc(item.unit||'ks')}"></label></div><div class="sj-section-title">Predajná cena ${company?'· Firma':'· FO'}</div><div class="sj-fields ${company?'sj-two':''}"><label class="sj-field"><span>${company?'Cena bez DPH / MJ':'Cena / MJ'}</span><input name="sale_unit_net" type="number" min="0" step="0.0001" value="${esc(initialNet)}"></label>${company?`<label class="sj-field"><span>Cena s DPH / MJ</span><input name="sale_unit_gross" type="number" min="0" step="0.0001" value="${esc((initialNet*(1+initialVat/100)).toFixed(2))}"></label>`:''}</div><div class="sj-fields sj-two"><label class="sj-field"><span>Nákupná cena bez DPH / MJ <small>(interné)</small></span><input name="purchase_unit_net" type="number" min="0" step="0.0001" value="${esc(item.purchase_unit_net??'')}"></label>${company?`<label class="sj-field"><span>Sadzba DPH (%)</span><input name="vat_rate" type="number" min="0" max="100" step="0.001" value="${esc(initialVat)}"></label>`:'<input type="hidden" name="vat_rate" value="0">'}</div><div class="sj-total"><span>Celkom ${company?'bez DPH':''}</span><strong id="sjItemTotal">0,00 €</strong></div><p id="sjItemError" class="sj-error" role="alert"></p><div class="sj-actions"><button class="btn outline" id="sjItemCancelBottom" type="button">Zrušiť</button><button class="btn" type="submit">Uložiť položku</button></div></form></div>`;
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
window.addEventListener('hashchange',()=>{if(['#jobs','#intake'].includes(location.hash))setTimeout(load,0)});
if(['#jobs','#intake'].includes(location.hash))setTimeout(load,0);
})();
