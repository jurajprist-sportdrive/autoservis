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
 finally{busy=false;renderServer()}
}
function renderServer(){
 if(location.hash!=='#jobs')return;
 const target=document.getElementById('app');if(!target)return;
 target.innerHTML=`<div class="pagehead"><div><h1>Servisné zákazky</h1><p>Zákazky v databáze Websupport – prvá fáza</p></div><div class="actions"><button class="btn outline" id="sjReload">Obnoviť</button><button class="btn" id="sjNew">+ Nová zákazka</button></div></div>${err?`<div class="card" style="color:#b91c1c">${esc(err)}. Lokálne zákazky sa z bezpečnostných dôvodov nezobrazujú.</div>`:''}${busy?'<div class="card">Načítavam…</div>':!ready?'<div class="card">Záznamy sa nepodarilo načítať.</div>':`<div class="card"><div class="tablewrap"><table><thead><tr><th>Číslo</th><th>Prijatie</th><th>Zákazník</th><th>Vozidlo</th><th>Stav</th><th></th></tr></thead><tbody>${data.jobs.map(j=>`<tr><td>${esc(j.job_number)}</td><td>${esc(j.received_at)}</td><td>${esc(name(j.customer_id))}</td><td>${esc(car(j.vehicle_id))}</td><td>${esc(j.status)}</td><td><button class="btn small outline" data-sj="${j.id}">Otvoriť</button></td></tr>`).join('')}</tbody></table>${!data.jobs.length?'<p>Žiadne zákazky v databáze.</p>':''}</div></div>`}`;
 target.querySelector('#sjReload')?.addEventListener('click',load);
 target.querySelector('#sjNew')?.addEventListener('click',()=>edit());
 target.querySelectorAll('[data-sj]').forEach(b=>b.addEventListener('click',()=>edit(data.jobs.find(x=>String(x.id)===b.dataset.sj))));
}
function edit(j={}){
 if(!ready){alert('Najprv sa musia načítať údaje z databázy.');return}
 if(!data.customers.length||!data.vehicles.length){alert('Najprv vytvorte zákazníka a jeho vozidlo v sekcii Zákazníci a vozidlá.');return}
 const overlay=document.createElement('div');overlay.style.cssText='position:fixed;inset:0;z-index:10000;background:#0009;display:grid;place-items:center;padding:16px';
 const field=(label,key,type='text',required=false)=>`<label class="field"><span>${label}</span><input name="${key}" type="${type}" value="${esc(key==='received_at'?(j[key]||when()).slice(0,16):j[key])}" ${required?'required':''}></label>`;
 overlay.innerHTML=`<div class="card" style="background:#fff;color:#17233b;width:min(780px,100%);max-height:92vh;overflow:auto"><div class="row between"><h2>${j.id?'Zákazka '+esc(j.job_number):'Nová zákazka'}</h2><button class="btn outline" id="sjClose">Zavrieť</button></div><form id="sjForm" class="grid two">${field('Číslo zákazky','job_number','text',true)}${field('Dátum a čas prijatia','received_at','datetime-local',true)}<label class="field"><span>Zákazník</span><select name="customer_id" required>${data.customers.map(c=>`<option value="${c.id}" ${String(j.customer_id)===String(c.id)?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><label class="field"><span>Vozidlo</span><select name="vehicle_id" required></select></label>${field('Kilometre pri prijatí','intake_mileage_km','number',true)}<label class="field"><span>Stav zákazky</span><select name="status">${['pending','inspection','waiting','service','ready','completed'].map(s=>`<option value="${s}" ${j.status===s?'selected':''}>${({pending:'Prijatá',inspection:'Obhliadka',waiting:'Čaká',service:'Servis',ready:'Na odovzdanie',completed:'Ukončená'})[s]}</option>`).join('')}</select></label><label class="field"><span>Režim</span><select name="work_order_mode"><option value="person" ${j.work_order_mode!=='company'?'selected':''}>FO</option><option value="company" ${j.work_order_mode==='company'?'selected':''}>Firma</option></select></label><label class="field"><span>Vozidlo v areáli</span><select name="vehicle_on_site"><option value="1" ${j.vehicle_on_site!=0?'selected':''}>Áno</option><option value="0" ${j.vehicle_on_site==0?'selected':''}>Nie</option></select></label><label class="field" style="grid-column:1/-1"><span>Požiadavka zákazníka</span><textarea name="customer_request">${esc(j.customer_request)}</textarea></label><label class="field" style="grid-column:1/-1"><span>Popis opravy</span><textarea name="repair_description">${esc(j.repair_description)}</textarea></label><label class="field" style="grid-column:1/-1"><span>Interné poznámky</span><textarea name="internal_notes">${esc(j.internal_notes)}</textarea></label><div style="grid-column:1/-1"><p id="sjError" style="color:#b91c1c"></p><button class="btn" type="submit">Uložiť na Websupport</button></div></form></div>`;
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
  if(!b.vehicle_id){overlay.querySelector('#sjError').textContent='Vybraný zákazník nemá vozidlo.';btn.disabled=false;return}
  for(const k of ['customer_id','vehicle_id','intake_mileage_km','vehicle_on_site'])b[k]=Number(b[k]);
  b.received_at=dateSql(b.received_at);
  try{await api().request('jobs'+(j.id?'&id='+encodeURIComponent(j.id):''),j.id?'PUT':'POST',b);overlay.remove();await load();}
  catch(ex){overlay.querySelector('#sjError').textContent=ex.message;btn.disabled=false}
 };
}
window.jobs=()=>'<div class="card">Načítavam zákazky z Websupportu…</div>';
window.newJob=()=>edit();
window.addEventListener('hashchange',()=>{if(location.hash==='#jobs')setTimeout(load,0)});
if(location.hash==='#jobs')setTimeout(load,0);
})();
