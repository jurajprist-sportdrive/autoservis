/* AUTOSERVIS TOMI: API authentication gate. Business data remains local demo until migrated. */
(() => {
  'use strict';
  const API='https://api.autoservistomi.sk/index.php';
  let token=sessionStorage.getItem('tomi_api_token')||'';
  const root=document.getElementById('authGate');
  const app=document.querySelector('.admin');
  // Fail closed: keep admin hidden until API confirms session.
  app.hidden=true;
  function showLogin(message=''){
    app.hidden=true;root.hidden=false;
    root.innerHTML=`<div class="auth-panel"><h1>AUTOSERVIS TOMI</h1><p>Prihlásenie PIN kódom</p><form id="authForm"><label for="authPin">Štvormiestny PIN</label><input id="authPin" type="password" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" autocomplete="off" required autofocus><p id="authError" role="alert">${message.replace(/[&<>"']/g,'')}</p><button class="btn" type="submit">Prihlásiť sa</button></form></div>`;
    document.getElementById('authForm').addEventListener('submit',async e=>{
      e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;
      try{
        const result=await request('login_pin','POST',{pin:document.getElementById('authPin').value},false);
        if(!result.token||!result.user)throw Error('Neplatná odpoveď servera');
        token=result.token;sessionStorage.setItem('tomi_api_token',token);start(result.user);
      }catch(err){document.getElementById('authError').textContent=err.message||'Prihlásenie zlyhalo';btn.disabled=false;}
    });
  }
  async function request(action,method='GET',body,authenticated=true){
    const headers={'Accept':'application/json'};
    if(body!==undefined)headers['Content-Type']='application/json';
    if(authenticated&&token)headers.Authorization='Bearer '+token;
    const res=await fetch(API+'?action='+encodeURIComponent(action.split('&')[0])+(action.includes('&')?'&'+action.split('&').slice(1).join('&'):''),{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
    let data;try{data=await res.json()}catch{throw Error('API nevrátilo platnú JSON odpoveď');}
    if(!res.ok)throw Error(data.error||'Chyba servera ('+res.status+')');
    return data;
  }
  function start(user){
    root.hidden=true;app.hidden=false;
    sessionStorage.setItem('tomi_role',user.role);
    window.TomiAuth={user,request,uploadDocument:async(jobId,file)=>{const form=new FormData();form.append('file',file);const r=await fetch(API+'?action=job_documents&job_id='+encodeURIComponent(jobId),{method:'POST',headers:{Authorization:'Bearer '+token},body:form});const d=await r.json();if(!r.ok)throw Error(d.error||'Nahratie zlyhalo');return d;},downloadDocument:async(jobId,id,name)=>{const r=await fetch(API+'?action=job_documents&job_id='+encodeURIComponent(jobId)+'&id='+encodeURIComponent(id),{headers:{Authorization:'Bearer '+token}});if(!r.ok)throw Error('Stiahnutie zlyhalo');const blob=await r.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name||'dokument';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);},logout:async()=>{try{await request('logout','POST',{});}catch{}token='';sessionStorage.removeItem('tomi_api_token');location.hash='dashboard';location.reload();}};
    const bar=document.querySelector('.topbar .row:last-child');
    if(bar){const name=document.createElement('span');name.className='muted';name.textContent=user.display_name||user.username;bar.prepend(name);const logout=document.createElement('button');logout.className='btn outline small';logout.textContent='Odhlásiť';logout.onclick=()=>window.TomiAuth.logout();bar.append(logout);}
    const warning=document.createElement('div');warning.className='auth-warning';warning.textContent='TEST 43: Dashboard, plánovací kalendár, história práce a správa používateľov načítavajú údaje z MariaDB. Ostatné moduly ešte môžu používať lokálne údaje. Pred ostrou prevádzkou vykonajte testy.';
    document.querySelector('.workspace').prepend(warning);
    // TEST 71: replace earlier admin design layers with the F1 race-control theme.
    ['tomi-modal66-css','tomi-design67-css','tomi-design68-css','tomi-design69-css','tomi-design70-css'].forEach(id=>document.getElementById(id)?.remove());
    if(!document.getElementById('tomi-design71-css')){
      const link=document.createElement('link');link.id='tomi-design71-css';link.rel='stylesheet';
      link.href='/assets/design71.css?v=71-1';document.head.appendChild(link);
    }
    const design71=document.createElement('script');design71.src='/assets/design71.js?v=71-1';design71.async=false;
    document.body.appendChild(design71);
    const scripts=['/assets/documents.js?v=1','/assets/extras.js?v=1','/assets/admin.js?v=20261117-47','/assets/server-customers.js?v=20261117-39','/assets/server-jobs.js?v=64-2','/assets/server-mechanic.js?v=20261118-62','/assets/server-attendance.js?v=20261117-09','/assets/server-inspection.js?v=20261117-11','/assets/server-yard-parts.js?v=36','/assets/workflow41.js?v=41-final','/assets/server43.js?v=49-1','/assets/quick46.js?v=68-1','/assets/cash58.js?v=67'];
    for(const src of scripts){const script=document.createElement('script');script.src=src;script.async=false;document.body.append(script);}
  }
  async function init(){if(token){try{const data=await request('me');if(data.user){start(data.user);return;}}catch{sessionStorage.removeItem('tomi_api_token');token='';}}showLogin();}
  init();
})();
