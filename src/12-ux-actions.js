// ---------- v4 UX actions ----------
const _copySnippet = ACT['copy-snippet'], _recStatus = ACT['rec-status'];
Object.assign(ACT, {
  'lp-demo'(){ meta().onboarded = true; save(); go('home'); },
  'lp-jump'(a){ const el=document.getElementById('lp-'+a.dataset.k); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); if(a.dataset.k==='start'){ const f=document.getElementById('su-name'); if(f) setTimeout(()=>f.focus({preventScroll:true}),400); } },
  'checklist-hide'(){ meta().checklist_dismissed = true; save(); render(); },
  'copy-snippet'(a){ meta().optin_done = true; save(); _copySnippet(a); render(); },
  'rec-status'(a){ meta().acted = true; _recStatus(a); },
  'reveal-close'(){ ui.reveal=null; render(); const t=document.querySelector('.tabs'); if(t) t.scrollIntoView({behavior:'smooth',block:'start'}); },
  'reveal-done'(){ ui.reveal=null; },
  'plan-custom'(){ ui.planCustom=!ui.planCustom; render(); },
  'nd-next'(){ const nd=ui.nd; if(nd.objective.trim().length<20){ toast('Describe what you want to learn in at least one full sentence.'); const t=document.getElementById('nd-obj'); if(t) t.focus(); return; } nd.step=2; render(); const el=document.getElementById('nd-aud'); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); }
});
Object.assign(SUBMIT, {
  signup(){
    const name=document.getElementById('su-name').value.trim(), brand=document.getElementById('su-brand').value.trim(), email=document.getElementById('su-email').value.trim();
    if(!name||!brand) return;
    upd('User',ui.user,{full_name:name,email:email||me().email}); upd('Workspace',ui.ws,{name:brand});
    Object.assign(meta(),{onboarded:true,signup_at:iso(Date.now()),checklist_dismissed:false,optin_done:false,acted:false});
    save(); go('home'); toast('Welcome to Voqiva, '+name.split(' ')[0]+'. Your workspace is ready.');
  }
});
