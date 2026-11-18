/* TEST 70 — visual-only dialog adapter. No API calls, no changes to form values or save handlers. */
(()=>{
  'use strict';
  const isAdmin=()=>{
    let role=window.TomiAuth?.user?.role||'';
    if(!role){try{role=sessionStorage.getItem('tomi_role')||''}catch{}}
    return !!document.querySelector('.admin:not([hidden])')&&location.hash!=='#mechanic'&&role!=='mechanic';
  };
  const setScope=()=>document.body.classList.toggle('tomi-ui70',!!isAdmin());
  setScope();
  window.addEventListener('hashchange',()=>{setScope();if(isAdmin())scan(document.body);});
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
      modal.setAttribute('data-t70-dialog','');
      const head=modal.querySelector(':scope > form > .row.between');
      if(head)head.classList.add('t70-modal-head');
      return;
    }
    if(modal.matches('.sj-inspection-dialog')){
      let head=modal.querySelector(':scope > .sj-inspection-head');
      if(!head){
        const title=modal.querySelector(':scope > h2');
        if(title){
          head=document.createElement('header');head.className='sj-inspection-head t70-modal-head';
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
          let h=head.querySelector('.t70-wf-title');
          if(!h){h=document.createElement('h2');h.className='t70-wf-title';head.prepend(h);}
          if(h.textContent!==source.textContent)h.textContent=source.textContent;
          source.classList.add('t70-source-title');
        }
      }
      return;
    }
    if(modal.matches('.sj-dialog'))return;
    if(modal.matches('.card')&&modal.parentElement&&modal.parentElement.style.position==='fixed'&&
        modal.querySelector('#sjForm,#dbForm')){
      modal.classList.add('t70-dialog');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
      modal.parentElement.classList.add('t70-overlay');
      const head=modal.querySelector(':scope > .row.between');
      if(head)head.classList.add('t70-modal-head');
      return;
    }
    if(modal.matches('#modalroot .modal')){
      modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
      const h=modal.querySelector(':scope > .row:first-child h2');
      if(h){if(!h.id)h.id='t70-modal-heading';modal.setAttribute('aria-labelledby',h.id);}
    }
  }
  const targets='dialog,.sj-inspection-dialog,.sj-dialog,.card:has(#sjForm),.card:has(#dbForm),#modalroot .modal';
  function scan(node){
    if(!isAdmin()||!node||node.nodeType!==1)return;
    if(node.matches?.(targets))normalize(node);
    node.querySelectorAll?.(targets).forEach(normalize);
    const wf=node.closest?.('.wf41-overlay');if(wf){const d=wf.querySelector('.sj-inspection-dialog');if(d)normalize(d);}
  }
  sidebarAttendance();scan(document.body);
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
  });
  observer.observe(document.body,{subtree:true,childList:true});
})();
