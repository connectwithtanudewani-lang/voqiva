// ---------- actions ----------
let DICT_ON = false, DICT_BASE = '';
const ACT = {
  menu(){ document.getElementById('rail').classList.toggle('open'); },
  'new-study'(){ ndInit(); go('new'); },
  try(a){ ndInit({objective:byId('PromptTemplate',a.dataset.id).prompt_text}); go('new'); },
  'home-tab'(a){ ui.homeTab=a.dataset.k; render(); },
  starter(a){ ui.nd.objective = byId('PromptTemplate',a.dataset.id).prompt_text; ui.nd.removed=[]; render(); const t=document.getElementById('nd-obj'); if(t){ t.focus(); } },
  'nd-chip-x'(a){ const k=a.dataset.k; const i=ui.nd.custom.findIndex(c=>ckey(c)===k); if(i>=0) ui.nd.custom.splice(i,1); else ui.nd.removed.push(k); updateNewSide(); },
  'rule-open'(a){ ui.addRule=a.dataset.scope; render(); const f=document.getElementById('rule-val'); if(f) f.focus(); },
  'rule-cancel'(){ ui.addRule=false; render(); },
  async dictate(){
    if(!DICT) return;
    const btn=document.getElementById('dict-btn');
    if(DICT_ON){ try{ await DICT.stop(); }catch(e){} return; }
    DICT_BASE = ui.nd.objective ? ui.nd.objective.replace(/\s*$/,' ') : '';
    try{
      DICT.onPartial(({text})=>{ const t=document.getElementById('nd-obj'); if(t){ t.value=DICT_BASE+text; } });
      DICT.onFinal(({text})=>{ DICT_BASE += text+' '; ui.nd.objective=DICT_BASE.trim(); const t=document.getElementById('nd-obj'); if(t) t.value=ui.nd.objective; updateNewSide(); });
      DICT.onState(({state})=>{ DICT_ON = state==='listening'||state==='starting'; const b=document.getElementById('dict-btn'); if(b) b.querySelector('span').textContent = DICT_ON?'Stop recording':'Record voice prompt'; });
      const p = DICT.start(); p.catch(e=>{ if(e&&e.code==='not_granted'){ DICT=null; render(); } });
    }catch(e){}
  },
  async 'nd-generate'(){
    const nd = ui.nd;
    if(nd.objective.trim().length<20){ toast('Describe what you want to learn in at least one full sentence.'); document.getElementById('nd-obj').focus(); return; }
    if(nd.source==='cohort_import' && !nd.cohort_import_id){ toast('Pick a customer cohort, or import one first.'); return; }
    const req = Object.assign({},nd,{criteria:ndCriteria()});
    ui.ndCtl = new AbortController(); ui.ndBusy = AI_STATE==='ready'?'Drafting your research plan…':'Building plan…'; render();
    try{
      const {study,note} = await generatePlan(req, n=>{ const el=document.getElementById('nd-busy'); if(el) el.textContent='Drafting plan… '+Math.round(n/50)+' lines'; const sm=document.getElementById('nd-skel-msg'); if(sm) sm.textContent='Writing questions and audience rules… '+Math.round(n/50)+' lines so far'; }, ui.ndCtl.signal);
      ui.ndBusy=null; ui.nd=null; ui.addRule=false;
      go('plan-'+study.id);
      if(note) toast(note);
    }catch(e){ ui.ndBusy=null; render(); if(!(e&&e.code==='cancelled')) toast(aiFail(e)); }
  },
  'nd-stop'(){ if(ui.ndCtl) ui.ndCtl.abort(); },
  'crit-x'(a){ delWhere('AudienceCriterion',c=>c.id===a.dataset.id); save(); render(); },
  'n-step'(a){ const s=byId('Study',ui.route.id); upd('Study',s.id,{sample_size:Math.max(1,Math.min(60,(s.sample_size||0)+Number(a.dataset.d)))}); save(); render(); },
  'q-del'(a){ const q=byId('Question',a.dataset.id); delWhere('Question',x=>x.id===q.id); questionsOf(q.study_id).forEach((x,i)=>x.position=i+1); save(); render(); },
  'q-add'(){ const s=byId('Study',ui.route.id); const n=questionsOf(s.id).length; const q=ins('Question',{study_id:s.id,position:n+1,kind:'interview',section:'Custom question',prompt:'',input_type:'voice',probe_goal:null,config:null}); save(); render(); const t=document.getElementById('q-'+q.id); if(t){ t.focus(); t.placeholder='Type your question'; } },
  topup(a){ const amt=Number(a.dataset.amt); ins('WalletTransaction',{workspace_id:ui.ws,kind:'topup',amount_inr:amt,created_at:iso(Date.now())}); save(); render(); toast(inr(amt)+' added via UPI (simulated)'); },
  launch(a){
    const s=byId('Study',a.dataset.id); const b=studyBudget(s);
    if(walletBalance(ui.ws)<b.total){ toast('Top up your wallet to launch.'); return; }
    if(questionsOf(s.id).some(q=>!q.prompt.trim())){ toast('One question is empty. Fill it in or delete it.'); return; }
    const n = launchStudy(s);
    go('live-'+s.id);
    toast(`Launched. ${n} people qualified; interviews are starting.`);
    runFieldwork(s.id);
  },
  'draft-del'(a){
    if(ui.confirmDel!==a.dataset.id){ ui.confirmDel=a.dataset.id; a.textContent='Click again to delete the draft'; return; }
    const id=a.dataset.id; delWhere('Question',q=>q.study_id===id); delWhere('AudienceCriterion',c=>c.study_id===id); delWhere('Study',s=>s.id===id); ui.confirmDel=null; save(); go('home'); toast('Draft deleted');
  },
  'field-run'(a){ runFieldwork(a.dataset.id); },
  'field-stop'(){ if(FIELD) FIELD.ctl.abort(); },
  synth(a){ if(FIELD){ toast('Pause the interviews first.'); return; } runSynthesis(a.dataset.id); },
  'synth-stop'(){ if(SYNTH) SYNTH.ctl.abort(); },
  'live-tab'(a){ ui.liveTab=a.dataset.k; render(); },
  'show-all'(){ ui.showAll=!ui.showAll; render(); },
  'sel-sess'(a){ ui.sel[a.dataset.sid]=a.dataset.id; render(); if(window.innerWidth<1000){ const t=document.querySelector('.transcript'); if(t) t.closest('.card').scrollIntoView({behavior:'smooth'}); } },
  'theme-filter'(a){ ui.themeFilter=a.dataset.k; render(); },
  'ev-toggle'(a){ ui.openEv[a.dataset.id]=!ui.openEv[a.dataset.id]; render(); },
  'open-transcript'(a){ ui.sel[a.dataset.sid]=a.dataset.id; ui.liveTab='feed'; ui.showAll=true; go('live-'+a.dataset.sid); },
  share(a){ const s=byId('Study',a.dataset.id); if(!s.share_token){ upd('Study',s.id,{share_token:Math.random().toString(36).slice(2,10)}); save(); render(); }
    copyText(`Voqiva report “${s.title}” · share token ${s.share_token}`); toast('Share token copied. Public links are simulated in this prototype.'); },
  'copy-summary'(a){ copyText(reportText(byId('Study',a.dataset.id))); },
  async export(a){
    const s=byId('Study',a.dataset.id); if(!DLS) return;
    const q = v=>'"'+String(v??'').replace(/"/g,'""')+'"';
    const lines=[['theme','category','evidence_level','participants','pct','quote','participant','city','timestamp'].join(',')];
    rows('Theme',t=>t.study_id===s.id).sort((a,b)=>a.position-b.position).forEach(t=>{ const m=themeStats(t);
      rows('Evidence',e=>e.theme_id===t.id).forEach(e=>{ const p=byId('Person',byId('Session',e.session_id).person_id); lines.push([t.name,t.category,t.evidence_level,m.participant_count,m.value,e.quote,shortName(p.full_name),p.city,mmss(e.start_ms)].map(q).join(',')); }); });
    try{ await DLS.save({filename:(s.title||'voqiva-report').replace(/[^\w]+/g,'-').toLowerCase()+'-evidence.csv',data:lines.join('\n')}); }catch(e){ if(e&&e.code!=='cancelled'&&e.code!=='declined') toast('Export did not complete.'); }
  },
  'copy-brief'(a){ const s=byId('Study',a.dataset.id); copyText(briefText(s)); },
  'goto-theme'(a){ ui.focusTheme=a.dataset.id; ui.themeFilter='all'; go('report-'+a.dataset.sid); },
  'copy-ticket'(a){ const r=byId('Recommendation',a.dataset.id); const s=byId('Study',r.study_id); const th=r.theme_id&&byId('Theme',r.theme_id);
    copyText(`## ${r.title}\n\n${r.body_md}\n\n**Impact:** ${r.impact} · **Effort:** ${r.effort}${r.owner_team?' · **Owner:** '+r.owner_team:''}\n**Evidence:** ${th?th.name+' ('+themeStats(th).participant_count+' of '+completedOf(s.id).length+' interviews)':'n/a'} · Voqiva study “${s.title}”`); },
  'rec-status'(a){ upd('Recommendation',a.dataset.id,{status:a.dataset.to}); save(); render(); },
  'follow-pick'(a){ ui.sel['f-'+a.dataset.sid]=a.dataset.id; render(); },
  'follow-launch'(a){ const sid=a.dataset.sid; const r=byId('Recommendation',ui.sel['f-'+sid]||rows('Recommendation',x=>x.study_id===sid&&x.workstream==='research')[0].id);
    ndInit({objective:r.body_md.replace(/\*\*|^- /gm,''),source:'parent_study',parent_study_id:sid,step:2}); go('new'); },
  'part-tab'(a){ ui.partTab=a.dataset.k; ui.showPeople=40; render(); },
  'more-people'(){ ui.showPeople+=60; render(); },
  'sample-import'(a){ const src=a.dataset.src; const ci=ins('CohortImport',{workspace_id:ui.ws,name:(src==='shopify'?'Shopify':'Klaviyo')+' · '+(src==='shopify'?'Cart abandoners, last 30 days':'Newsletter subscribers who never bought')+' (sample)',source:src,created_at:iso(Date.now())});
    const out=[]; for(let i=0;i<40;i++){ const g=Math.random()<.5?'male':'female'; const n=pick(PANEL_NAMES[g])+' '+String.fromCharCode(65+Math.floor(Math.random()*26)); out.push({full_name:n,phone:'+91 9'+String(Math.floor(Math.random()*1e9)).padStart(9,'0'),gender:g,city:pick(CITIES)[0],birth_date:(1988+Math.floor(Math.random()*15))+'-0'+(1+Math.floor(Math.random()*9))+'-15'}); }
    importPeople(ci,out); ui.partTab=ci.id; save(); render(); toast('Imported 40 sample customers'); },
  autoreload(){ const ws=byId('Workspace',ui.ws); upd('Workspace',ws.id,{auto_reload_mandate_ref:ws.auto_reload_mandate_ref?null:'UPI-MANDATE-'+Math.random().toString(36).slice(2,8).toUpperCase()}); save(); render(); },
  'reset-ask'(){ ui.confirmReset=true; render(); }, 'reset-no'(){ ui.confirmReset=false; render(); },
  'reset-yes'(){ try{ localStorage.removeItem(STORE_KEY); }catch(e){} const r=seed(); ui.ws=r.ws.id; ui.user=r.u.id; ui.confirmReset=false; ui.sel={}; save(); go('home'); toast('Demo data restored'); }
};
const CHANGE = {
  ws(e){ ui.ws=e.target.value; ui.sel={}; ui.partTab=null; go('home'); },
  'nd-src'(e){ const nd=ui.nd; nd.source=e.target.value;
    if(nd.source==='cohort_import'&&!nd.cohort_import_id){ const c=rows('CohortImport',x=>x.workspace_id===ui.ws)[0]; nd.cohort_import_id=c?c.id:null; }
    if(nd.source==='parent_study'&&!nd.parent_study_id){ const s=wsStudies().find(x=>studyStatus(x)==='ready'); nd.parent_study_id=s?s.id:null; }
    render(); },
  'nd-cohort'(e){ ui.nd.cohort_import_id=e.target.value; updateNewSide(); },
  'nd-parent'(e){ ui.nd.parent_study_id=e.target.value; updateNewSide(); },
  'n-set'(e){ const s=byId('Study',ui.route.id); upd('Study',s.id,{sample_size:Math.max(1,Math.min(60,parseInt(e.target.value)||s.sample_size))}); save(); render(); },
  'study-field'(e){ const f=e.target.dataset.f; let v=e.target.value; if(['max_duration_min','incentive_inr'].includes(f)) v=Math.max(f==='incentive_inr'?10:1,parseInt(v)||0); upd('Study',ui.route.id,{[f]:v}); save(); render(); },
  'study-title'(e){ upd('Study',e.target.dataset.id,{title:e.target.value.trim()||'Untitled study'}); save(); renderRail(); },
  'q-edit'(e){ upd('Question',e.target.dataset.id,{prompt:e.target.value.trim()}); save(); },
  'ws-name'(e){ upd('Workspace',ui.ws,{name:e.target.value.trim()||'My brand'}); save(); renderTop(); },
  csv(e){ const f=e.target.files&&e.target.files[0]; if(!f) return; const r=new FileReader();
    r.onload=()=>{ try{ const data=parseCSV(String(r.result)); if(!data.length) throw new Error('empty');
      const ci=ins('CohortImport',{workspace_id:ui.ws,name:'CSV · '+f.name.replace(/\.csv$/i,''),source:'csv',created_at:iso(Date.now())});
      const n=importPeople(ci,data); if(!n){ delWhere('CohortImport',c=>c.id===ci.id); toast('No rows had both full_name and phone.'); return; }
      ui.partTab=ci.id; save(); render(); toast(`Imported ${n} customers from ${f.name}`); }catch(err){ toast('Could not read that CSV. Check it has a header row with full_name and phone.'); } };
    r.readAsText(f); }
};
const INPUT = {
  'nd-obj'(e){ ui.nd.objective=e.target.value; updateNewSide(); },
  search(e){ ui.search=e.target.value; renderSearch(); }
};
const SUBMIT = {
  'home-ask'(e){ const v=document.getElementById('home-q').value.trim(); ndInit({objective:v}); go('new'); },
  'rule-add'(e,f){ const attr=document.getElementById('rule-attr').value, val=document.getElementById('rule-val').value; const c=parseRule(attr,val);
    if(!c){ toast('Use a format like 22-30 for ages.'); return; }
    if(f.dataset.scope==='nd'){ ui.nd.custom.push(c); }
    else { ins('AudienceCriterion',{study_id:ui.route.id,attribute:c.attribute,operator:c.operator,value:{v:c.value,label:c.label},quota_pct:null}); save(); }
    ui.addRule=false; render(); }
};
document.addEventListener('click',e=>{
  const a=e.target.closest('[data-act]'); if(!a) return;
  if(a.tagName==='A' && a.getAttribute('href')) return;
  e.preventDefault(); const fn=ACT[a.dataset.act]; if(fn) fn(a,e);
  if(!e.target.closest('.search')) { const r=document.getElementById('search-res'); if(r) r.innerHTML=''; }
});
document.addEventListener('keydown',e=>{
  if((e.key==='Enter'||e.key===' ') && e.target.matches && e.target.matches('.sess')){ e.preventDefault(); ACT['sel-sess'](e.target); }
  if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='k'){ const s=document.getElementById('search'); if(s){ e.preventDefault(); s.focus(); } }
  if(e.key==='Escape'){ ui.search=''; const s=document.getElementById('search'); if(s){ s.value=''; renderSearch(); } }
});
document.addEventListener('change',e=>{ const k=e.target.dataset && e.target.dataset.change; if(k&&CHANGE[k]) CHANGE[k](e); });
document.addEventListener('input',e=>{ const k=e.target.dataset && e.target.dataset.input; if(k&&INPUT[k]) INPUT[k](e); });
document.addEventListener('submit',e=>{ const f=e.target.closest('[data-submit]'); if(!f) return; e.preventDefault(); const fn=SUBMIT[f.dataset.submit]; if(fn) fn(e,f); });
document.addEventListener('click',e=>{ if(!e.target.closest('.search')){ const r=document.getElementById('search-res'); if(r&&r.innerHTML) r.innerHTML=''; } if(document.getElementById('rail').classList.contains('open') && !e.target.closest('.rail') && !e.target.closest('.menu-btn')) document.getElementById('rail').classList.remove('open'); },true);

// ---------- helpers for import / text exports ----------
function parseCSV(text){
  const out=[]; let row=[], f='', q=false;
  for(let i=0;i<text.length;i++){ const c=text[i];
    if(q){ if(c==='"'&&text[i+1]==='"'){ f+='"'; i++; } else if(c==='"') q=false; else f+=c; }
    else if(c==='"') q=true; else if(c===','){ row.push(f); f=''; } else if(c==='\n'||c==='\r'){ if(c==='\r'&&text[i+1]==='\n') i++; row.push(f); f=''; if(row.some(x=>x.trim())) out.push(row); row=[]; } else f+=c; }
  row.push(f); if(row.some(x=>x.trim())) out.push(row);
  if(out.length<2) return [];
  const h=out[0].map(x=>x.trim().toLowerCase().replace(/\s+/g,'_'));
  return out.slice(1).map(r=>{ const o={}; h.forEach((k,i)=>o[k]=(r[i]||'').trim()); return o; });
}
function importPeople(ci, list){
  const STD=['full_name','name','phone','mobile','gender','birth_date','dob','city','occupation','upi_vpa'];
  let n=0;
  list.forEach(r=>{ const name=r.full_name||r.name, phone=r.phone||r.mobile; if(!name||!phone) return;
    const g=String(r.gender||'').toLowerCase(); const attrs={}; Object.keys(r).forEach(k=>{ if(!STD.includes(k)&&r[k]!=='') attrs[k]=isNaN(+r[k])?r[k]:+r[k]; });
    const bd=r.birth_date||r.dob; const d=bd&&!isNaN(new Date(bd))?new Date(bd).toISOString().slice(0,10):null;
    ins('Person',{cohort_import_id:ci.id,full_name:name,phone:String(phone),gender:/^f/.test(g)?'female':/^m/.test(g)?'male':g?'other':null,birth_date:d,city:r.city?(CITY_ALIASES[r.city.toLowerCase()]||r.city):null,occupation:r.occupation||null,attributes:attrs,upi_vpa:r.upi_vpa||null,aadhaar_verified_at:null,linkedin_verified_at:null,upi_verified_at:null});
    n++; });
  return n;
}
function reportText(s){
  const N=completedOf(s.id).length;
  return `${s.title} — Voqiva insights (${N} interviews)\n\n${s.headline}\n\n${s.summary}\n\n`+
    rows('Theme',t=>t.study_id===s.id).sort((a,b)=>a.position-b.position).map(t=>{ const m=themeStats(t); const ev=rows('Evidence',e=>e.theme_id===t.id&&e.is_featured)[0];
      return `• ${t.name} (${CAT_LABEL[t.category]}, ${t.evidence_level}): ${t.headline} — ${m.participant_count}/${N}${ev?`\n  “${ev.quote}”`:''}`; }).join('\n');
}
function briefText(s){
  return `# Action plan: ${s.title}\n\n> ${s.headline}\n\n`+rows('Recommendation',r=>r.study_id===s.id).sort((a,b)=>a.position-b.position).map(r=>{
    const ms=rows('Metric',m=>m.recommendation_id===r.id).map(m=>`- ${m.label}: ${fmtMetric(m)} (${m.participant_count==null?'projection':'measured, n='+m.participant_count})`).join('\n');
    return `## [${WS_LABEL[r.workstream]}] ${r.title}\nImpact: ${r.impact} · Effort: ${r.effort}${r.owner_team?' · Owner: '+r.owner_team:''} · Status: ${r.status}\n\n${r.body_md}${ms?'\n\n'+ms:''}`; }).join('\n\n');
}

// ---------- boot ----------
(function boot(){
  document.body.insertAdjacentHTML('afterbegin',`<div class="shell"><aside class="rail" id="rail"></aside><div class="main"><header class="top" id="top"></header><main class="content" id="view"></main><div id="footer"></div></div></div><div id="toast-root" aria-live="polite"></div>`);
  DB = load();
  if(!DB){ const r=seed(); save(); }
  DB.Study.forEach(s=>{ s.language='english'; });
  const u = DB.User[0]; ui.user = u.id;
  ui.ws = rows('Membership',m=>m.user_id===u.id)[0].workspace_id;
  ui.route = parseHash();
  render();
  initCaps();
})();
