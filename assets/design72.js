/* TEST 72 — visual-only dialog adapter. No API calls, no changes to form values or save handlers. */
(()=>{
  'use strict';
  const isAdmin=()=>{
    let role=window.TomiAuth?.user?.role||'';
    if(!role){try{role=sessionStorage.getItem('tomi_role')||''}catch{}}
    return !!document.querySelector('.admin:not([hidden])')&&location.hash!=='#mechanic'&&role!=='mechanic';
  };
  const setScope=()=>document.body.classList.toggle('tomi-ui72',!!isAdmin());
  setScope();
  window.addEventListener('hashchange',()=>{setScope();if(isAdmin()){scan(document.body);dashboardVisual();}});
  function sidebarAttendance(){
    if(!isAdmin())return;
    const sidebar=document.getElementById('sidebar');
    if(!sidebar||sidebar.querySelector('[data-page="attendance"]'))return;
    const a=document.createElement('a');a.className='navlink';a.href='#attendance';a.dataset.page='attendance';
    const ico=document.createElement('span');ico.className='navicon';ico.textContent='◷';
    a.append(ico,document.createTextNode(' Dochádzka'));
    const after=sidebar.querySelector('[data-page="history"]');if(after)after.after(a);else sidebar.append(a);
  }
  function normalize(modal){
    if(!modal||modal.nodeType!==1)return;
    if(modal.matches('dialog')){
      modal.setAttribute('data-t72-dialog','');
      const head=modal.querySelector(':scope > form > .row.between');
      if(head)head.classList.add('t72-modal-head');
      return;
    }
    if(modal.matches('.sj-inspection-dialog')){
      let head=modal.querySelector(':scope > .sj-inspection-head');
      if(!head){
        const title=modal.querySelector(':scope > h2');
        if(title){
          head=document.createElement('header');head.className='sj-inspection-head t72-modal-head';
          const group=document.createElement('div');group.appendChild(title);head.append(group);
          const btn=document.createElement('button');btn.className='btn outline';btn.type='button';btn.textContent='Zavrieť';
          btn.addEventListener('click',()=>{
            const existing=modal.querySelector('#sjPlanClose');
            if(existing)existing.click();else modal.closest('.sj-inspection-overlay')?.remove();
          });
          head.append(btn);modal.prepend(head);
        }
      }
      const wf=modal.closest('.wf41-overlay');
      if(wf&&head){
        const source=modal.querySelector('.wf41-content > h2');
        if(source){
          let h=head.querySelector('.t72-wf-title');
          if(!h){h=document.createElement('h2');h.className='t72-wf-title';head.prepend(h);}
          if(h.textContent!==source.textContent)h.textContent=source.textContent;
          source.classList.add('t72-source-title');
        }
      }
      return;
    }
    if(modal.matches('.sj-dialog'))return;
    if(modal.matches('.card')&&modal.parentElement&&modal.parentElement.style.position==='fixed'&&
        modal.querySelector('#sjForm,#dbForm')){
      modal.classList.add('t72-dialog');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
      modal.parentElement.classList.add('t72-overlay');
      const head=modal.querySelector(':scope > .row.between');
      if(head)head.classList.add('t72-modal-head');
      return;
    }
    if(modal.matches('#modalroot .modal')){
      modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
      const h=modal.querySelector(':scope > .row:first-child h2');
      if(h){if(!h.id)h.id='t72-modal-heading';modal.setAttribute('aria-labelledby',h.id);}
    }
  }
  const targets='dialog,.sj-inspection-dialog,.sj-dialog,.card:has(#sjForm),.card:has(#dbForm),#modalroot .modal';
  function scan(node){
    if(!isAdmin()||!node||node.nodeType!==1)return;
    if(node.matches?.(targets))normalize(node);
    node.querySelectorAll?.(targets).forEach(normalize);
    const wf=node.closest?.('.wf41-overlay');if(wf){const d=wf.querySelector('.sj-inspection-dialog');if(d)normalize(d);}
  }

  // Dashboard-only visual header; no data or workflow mutations.
  // The observer keeps the banner in sync when the application's router rerenders #app.
  function dashboardVisual(){
    if(!isAdmin())return;
    const root=document.getElementById('app');
    if(!root)return;
    const current=(location.hash||'#dashboard').slice(1).split('?')[0]||'dashboard';
    const existing=root.querySelector(':scope > .rb72-hero');
    if(current!=='dashboard') {if(existing)existing.remove();return;}
    if(existing)return;
    const hero=document.createElement('section');
    hero.className='rb72-hero';hero.setAttribute('aria-label','Motorsportová grafika administrácie');
    hero.innerHTML=`<div class="rb72-hero-content">
      <div class="rb72-kicker">RACE CONTROL · PRIVATE GARAGE</div>
      <h2 class="rb72-hero-title">AUTOSERVIS <span>TOMI</span></h2>
      <p class="rb72-hero-description">Riadenie dielne v štýle motorsportu. Všetky zákazky, vozidlá a servisné procesy pod kontrolou.</p>
      <div class="rb72-hero-footer"><span class="rb72-tag">PERFORMANCE INTERFACE</span><span class="rb72-tag">WORKSHOP CONTROL</span></div>
    </div><div class="rb72-team-wordmark" aria-hidden="true">RED BULL<br><span>RACING</span></div><div class="rb72-hero-outlines" aria-hidden="true"></div>`;
    root.prepend(hero);
  }
  sidebarAttendance();scan(document.body);dashboardVisual();
  const observer=new MutationObserver(list=>{
    let nav=false;
    for(const item of list){
      for(const node of item.addedNodes){if(node.nodeType===1){scan(node);nav=true;}}
      if(item.target?.closest?.('.wf41-content')){
        const d=item.target.closest('.wf41-overlay')?.querySelector('.sj-inspection-dialog');
        if(d)normalize(d);
      }
    }
    if(nav&&!document.querySelector('#sidebar [data-page="attendance"]'))sidebarAttendance();
    if(nav)dashboardVisual();
  });
  observer.observe(document.body,{subtree:true,childList:true});
})();
