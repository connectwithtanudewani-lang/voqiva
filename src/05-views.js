// ---------- UI state, router, shell ----------
const ui = {ws:null,user:null,route:{view:'home',id:null},nd:null,homeTab:'all',sel:{},themeFilter:'all',liveTab:'feed',showAll:false,openEv:{},partTab:null,confirmReset:false,search:'',ndBusy:null,addRule:false,showLedger:30,showPeople:40,focusTheme:null};
const VIEWS = ['home','studies','new','plan','live','report','actions','participants','wallet','account','help'];
function parseHash(){ const h=(location.hash||'').slice(1); if(!h) return {view:(DB&&DB._meta&&!DB._meta.onboarded)?'welcome':'home',id:null}; const m=h.match(/^([a-z]+)(?:-(.+))?$/); return m&&VIEWS.includes(m[1])?{view:m[1],id:m[2]||null}:{view:'home',id:null}; }
function go(h){ if(location.hash==='#'+h){ ui.route=parseHash(); render(); window.scrollTo(0,0); } else location.hash=h; }
window.addEventListener('hashchange',()=>{ ui.route=parseHash(); document.getElementById('rail').classList.remove('open'); render(); window.scrollTo(0,0); });
function toast(msg){ const r=document.getElementById('toast-root'); r.innerHTML=`<div class="toast" role="status">${esc(msg)}</div>`; clearTimeout(toast.t); toast.t=setTimeout(()=>r.innerHTML='',3800); }
async function copyText(t){ try{ await navigator.clipboard.writeText(t); toast('Copied to clipboard'); }catch(e){ const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy'); toast('Copied to clipboard');}catch(_){ toast('Copy failed. Select the text manually.'); } ta.remove(); } }

const I = {
  home:'<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
  folder:'<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .7 3.2 2.4 3.5 5.2"/>',
  wallet:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M16 12h5v4h-5a2 2 0 0 1 0-4zM3 9h18"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 2.2-2.4 3.7M12 17.5h.01"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  right:'<path d="M5 12h14M13 6l6 6-6 6"/>', left:'<path d="M19 12H5M11 6l-6 6 6 6"/>',
  spark:'<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', check:'<path d="m5 12 5 5 9-10"/>', x:'<path d="M6 6l12 12M18 6 6 18"/>',
  copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
  down:'<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>', play:'<path d="M7 4l13 8-13 8z"/>', stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>',
  shield:'<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>', rocket:'<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M14.5 4.5C17 2 21 3 21 3s1 4-1.5 6.5L13 16l-5-5z"/><circle cx="15" cy="9" r="1.5"/>',
  link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  bolt:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>', upload:'<path d="M12 20V8M6 14l6-6 6 6M4 4h16"/>'
};
const ic = (n,cls='') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;

function wsStudies(){ return rows('Study',s=>s.workspace_id===ui.ws); }
function me(){ return byId('User',ui.user); }

function renderRail(){
  const v = ui.route.view; const live = wsStudies().filter(s=>studyStatus(s)==='live').length;
  const on = list => list.includes(v)?'on':'';
  document.getElementById('rail').innerHTML = `
    <div class="brand"><div class="logo">V</div><b>Voqiva</b><span class="tag-pro">PRO</span></div>
    <a class="nav ${on(['home'])}" href="#home">${ic('home')}Home</a>
    <a class="nav ${on(['studies','new','plan','live','report','actions'])}" href="#studies">${ic('folder')}Studies ${live?`<span class="pill ok pill-sm">${live} live</span>`:''}</a>
    <a class="nav ${on(['participants'])}" href="#participants">${ic('users')}Participants</a>
    <a class="nav ${on(['wallet'])}" href="#wallet">${ic('wallet')}Wallet <span class="pill acc num">${inr(walletBalance(ui.ws))}</span></a>
    <div class="spacer"></div>
    <a class="nav ${on(['account'])}" href="#account">${ic('gear')}Settings</a>
    <a class="nav ${on(['help'])}" href="#help">${ic('help')}Help &amp; how it works</a>`;
}
function renderTop(){
  const el = document.getElementById('top'); if(!el) return;
  const mems = rows('Membership',m=>m.user_id===ui.user);
  const mem = mems.find(m=>m.workspace_id===ui.ws)||{};
  const ai = AI_STATE==='ready'?'<span class="pill ok ai-chip"><span class="dot"></span>AI on</span>':AI_STATE==='checking'?'<span class="pill ai-chip">AI…</span>':'<span class="pill warn ai-chip" title="Claude is not available in this view. Voqiva uses built-in rules instead.">AI offline · rules</span>';
  el.innerHTML = `
    <button class="btn sm menu-btn" data-act="menu" aria-label="Open menu">${ic('menu')}</button>
    <label class="ws-switch"><span class="sr-only" hidden>Brand</span>${ic('folder')}
      <select id="ws-select" data-change="ws" aria-label="Switch brand">${mems.map(m=>`<option value="${m.workspace_id}" ${m.workspace_id===ui.ws?'selected':''}>${esc(byId('Workspace',m.workspace_id).name)}</option>`).join('')}</select></label>
    <span class="pill acc hide-sm" title="Interviews and payouts are simulated">Prototype</span>
    <div class="search hide-sm">${ic('search')}<input id="search" placeholder="Search studies, cohorts, insights…" data-input="search" value="${esc(ui.search)}" autocomplete="off"><div id="search-res"></div></div>
    <span class="hide-sm">${ai}</span>
    <a class="wallet-chip hide-sm num" href="#wallet">${ic('wallet')}${inr(walletBalance(ui.ws))} <span class="muted small">available</span></a>
    <div class="user"><div class="avatar">${initials(me().full_name)}</div><div class="hide-sm"><div style="font-weight:600">${esc(me().full_name)}</div><div class="small muted">${esc(mem.title||'')}</div></div></div>`;
}
function renderSearch(){
  const box = document.getElementById('search-res'); if(!box) return;
  const q = ui.search.trim().toLowerCase(); if(!q){ box.innerHTML=''; return; }
  const st = wsStudies().filter(s=>(s.title+' '+s.objective).toLowerCase().includes(q)).slice(0,5);
  const th = rows('Theme',t=>(t.name+' '+t.headline).toLowerCase().includes(q) && st.concat(wsStudies()).some(s=>s.id===t.study_id)).slice(0,5);
  const co = rows('CohortImport',c=>c.workspace_id===ui.ws&&c.name.toLowerCase().includes(q)).slice(0,3);
  const items = st.map(s=>`<a href="#${routeFor(s)}"><b>${esc(s.title||'Untitled')}</b><div class="small muted">Study · ${STATUS_LABEL[studyStatus(s)]}</div></a>`)
    .concat(th.map(t=>`<a href="#report-${t.study_id}"><b>${esc(t.name)}</b><div class="small muted">Insight · ${esc(byId('Study',t.study_id).title)}</div></a>`))
    .concat(co.map(c=>`<a href="#participants"><b>${esc(c.name)}</b><div class="small muted">Cohort · ${c.source}</div></a>`));
  box.innerHTML = `<div class="search-res">${items.join('')||'<div class="muted small" style="padding:8px">No matches</div>'}</div>`;
}
function routeFor(s){ return {draft:'plan-',live:'live-',synthesizing:'live-',ready:'report-'}[studyStatus(s)]+s.id; }

function render(){
  const v = ui.route.view, id = ui.route.id;
  document.body.classList.toggle('landing', v==='welcome');
  if(v!=='report') ui.reveal = null;
  if(v!=='plan') ui.planCustom = false;
  renderRail(); renderTop();
  const view = document.getElementById('view'), foot = document.getElementById('footer');
  foot.innerHTML='';
  const fn = Object.assign({welcome:vWelcome,panel:vPanel,always:vAlways,home:vHome,studies:vStudies,new:vNew,plan:vPlan,live:vLive,report:vReport,actions:vActions,participants:vParticipants,wallet:vWallet,account:vAccount,help:vHelp}, (typeof EXTRA_VIEWS!=='undefined'?EXTRA_VIEWS:{}))[v]||vHome;
  const s = id? byId('Study',id) : null;
  if(['plan','live','report','actions','decide','brief'].includes(v) && (!s || s.workspace_id!==ui.ws)){ view.innerHTML = `<div class="empty">That study isn't in this workspace. <a href="#home">Back to home</a></div>`; return; }
  view.innerHTML = fn(s);
  if(v==='new') updateNewSide();
  if(ui.focusTheme && v==='report'){ const el=document.getElementById('theme-'+ui.focusTheme); if(el) el.scrollIntoView({block:'start'}); ui.focusTheme=null; }
}

// ---------- shared bits ----------
function audienceLine(s){
  if(s.audience_source==='cohort_import'){ const c=byId('CohortImport',s.cohort_import_id); return c? `Your customers · ${esc(c.name.replace(/^\w+ · /,''))}` : 'Your customers · opted-in circle'; }
  if(s.audience_source==='parent_study'){ const p=byId('Study',s.parent_study_id); return `Follow-up with respondents of “${esc(p?p.title:'earlier study')}”`; }
  const all = criteriaOf(s.id); const cities = all.filter(c=>c.attribute==='city').map(clabel);
  const cr = all.filter(c=>['gender','age'].includes(c.attribute)).map(clabel).concat(cities.length?[cities.join(' / ')]:[]).concat(all.filter(c=>!['gender','age','city','upi_verified','aadhaar_verified'].includes(c.attribute)).map(clabel).slice(0,1));
  return cr.length? esc(cr.join(' · ')) : 'Voqiva verified panel';
}
function statusPill(s){
  const st = studyStatus(s);
  if(st==='live'){ const d=completedOf(s.id).length; return `<span class="pill warn"><span class="dot pulse"></span>Live ${d}/${s.sample_size}</span>`; }
  if(st==='ready') return `<span class="pill ok">${ic('check')}Insights ready</span>`;
  if(st==='synthesizing') return `<span class="pill acc"><span class="dot pulse"></span>Synthesizing</span>`;
  return `<span class="pill">Draft</span>`;
}
function paidTotal(s){ return sessionsOf(s.id).filter(x=>x.payout_status==='paid').length*(s.incentive_inr||0); }

// ---------- HOME ----------
function vHome(){
  const all = wsStudies(); const live = all.filter(s=>studyStatus(s)==='live'); const ready = all.filter(s=>studyStatus(s)==='ready');
  const liveParticipants = live.reduce((a,s)=>a+sessionsOf(s.id).filter(x=>x.screen_result==='qualified').length,0);
  const panel = rows('Person',p=>!p.cohort_import_id && (p.aadhaar_verified_at||p.upi_verified_at||p.linkedin_verified_at));
  const recent = new Set(rows('Session',x=>x.started_at && Date.now()-T(x.started_at)<30*86400000 && all.some(s=>s.id===x.study_id)).map(x=>x.person_id));
  const tat = ready.map(s=>T(s.synthesized_at)-T(s.launched_at)).filter(x=>x>0);
  const avgTat = tat.length? tat.reduce((a,b)=>a+b,0)/tat.length/3600000 : null;
  const ws = byId('Workspace',ui.ws);
  const sessAll = rows('Session',x=>all.some(s=>s.id===x.study_id));
  const fraud = sessAll.filter(x=>x.screen_result==='fraud').length;
  return `
  <section class="row between" style="align-items:flex-end">
    <div class="stack" style="gap:4px"><h1>Namaste ${esc(me().full_name.split(' ')[0])}</h1>
      <p class="muted">You have <b style="color:var(--accent)">${live.length} live ${live.length===1?'study':'studies'}</b> running across <b>${liveParticipants} verified Indian consumers</b>.</p></div>
    <div class="row"><a class="btn" href="#participants">${ic('upload')}Import customer cohort</a><button class="btn primary" data-act="new-study">${ic('plus')}New study</button></div>
  </section>
  <section class="card hero stack" style="gap:16px;padding:28px">
    <div class="row" style="gap:8px"><span class="pill acc">${ic('spark')}AI research agent</span><span class="small muted">Localised for Indian consumers</span></div>
    <h2 style="font-size:clamp(22px,2.6vw,30px)">What do you want to learn from your customers today?</h2>
    <p class="muted" style="max-width:68ch">Voqiva drafts the screener and interview, recruits verified respondents across Tier 1 and Tier 2 India, pays them on completion, and synthesises evidence-backed insights.</p>
    <form class="prompt-box" data-submit="home-ask">${ic('spark')}
      <input id="home-q" placeholder="e.g. Why are first-time buyers dropping off before checkout on our ethnic linen shirts in Bengaluru?" aria-label="Your research question">
      <button class="btn primary" type="submit">${ic('bolt')}<span class="hide-sm">Start new research study</span><span class="menu-btn" style="display:none">Start</span></button></form>
    <div class="row" style="gap:8px"><span class="small muted" style="font-weight:600">Try asking:</span>
      ${rows('PromptTemplate',t=>t.placement==='home_suggestion').map(t=>`<button class="chip plain" data-act="try" data-id="${t.id}">${esc(t.label)}</button>`).join('')}</div>
  </section>
  <section class="grid g4">
    <div class="card kpi stack"><span class="eyebrow">Live studies</span><div class="big">${live.length}<small>running</small></div><span class="pill ok" style="align-self:flex-start">${ready.length} insights ready</span></div>
    <div class="card kpi stack"><span class="eyebrow">Verified panelists</span><div class="big num">${panel.length.toLocaleString('en-IN')}</div><span class="small muted">${recent.size} took part in your studies in the last 30 days</span></div>
    <div class="card kpi stack"><span class="eyebrow">Avg. turnaround</span><div class="big num">${avgTat?avgTat.toFixed(1):'—'}<small>hours</small></div><span class="small muted">Launch to synthesis, ${tat.length} studies</span></div>
    <div class="card kpi stack"><span class="eyebrow">Research wallet</span><div class="big num">${inr(walletBalance(ui.ws))}</div><span class="small ${ws.auto_reload_mandate_ref?'':'muted'}" style="${ws.auto_reload_mandate_ref?'color:var(--ok)':''}">${ws.auto_reload_mandate_ref?'● Auto-reload on (UPI mandate)':'Auto-reload off'}</span></div>
  </section>
  ${studiesSection(true)}
  <section class="card tint banner">
    <div class="avatar" style="width:48px;height:48px;background:var(--surface)">${ic('shield')}</div>
    <div><h3>Verified participants, paid on completion</h3><p class="muted small">Panelists pass Aadhaar, UPI or LinkedIn verification before they can be screened in. Incentives are released automatically when an interview is complete, whatever the participant's opinion.</p></div>
    <span class="pill ok">${sessAll.length? pct((1-fraud/sessAll.length)*100):'100%'} passed verification · ${fraud} blocked</span>
  </section>`;
}
function vStudies(){ return `<section class="stack" style="gap:4px"><h1>Studies</h1><p class="muted">Every study in ${esc(byId('Workspace',ui.ws).name)}, from draft to insights.</p></section>${studiesSection(false)}`; }
function studiesSection(isHome){
  const all = wsStudies().sort((a,b)=>T(b.updated_at)-T(a.updated_at));
  const cnt = k=> k==='all'?all.length: all.filter(s=>studyStatus(s)===k || (k==='live'&&studyStatus(s)==='synthesizing')).length;
  const list = all.filter(s=> ui.homeTab==='all' || studyStatus(s)===ui.homeTab || (ui.homeTab==='live'&&studyStatus(s)==='synthesizing'));
  return `<section class="stack" style="gap:16px">
    <div class="row between"><div>${isHome?'<h2>Active &amp; recent studies</h2><p class="muted small">Watch recruitment and interviews live, then read the synthesis.</p>':''}</div>
      <div class="tabs" role="tablist">${[['all','All'],['live','Live'],['ready','Insights ready'],['draft','Draft']].map(([k,l])=>`<button class="${ui.homeTab===k?'on':''}" data-act="home-tab" data-k="${k}">${l} (${cnt(k)})</button>`).join('')}</div></div>
    <div class="grid g2">${list.map(studyCard).join('') || `<div class="empty">No studies here yet. <button class="link" data-act="new-study">Start one</button></div>`}</div></section>`;
}
function studyCard(s){
  const st = studyStatus(s);
  const head = `<div class="row between"><div class="row" style="gap:8px">${statusPill(s)}<span class="pill">${esc(METHOD_LABEL[s.methodology]||'')}</span></div><span class="small muted">${st==='draft'?'Created '+ago(s.created_at):st==='ready'?'Synthesised '+ago(s.synthesized_at):'Updated '+ago(s.updated_at)}</span></div>
    <h3>${esc(s.title||'Untitled study')}</h3><p class="small muted"><b style="color:var(--fg)">Audience:</b> ${audienceLine(s)}</p>`;
  if(st==='live'||st==='synthesizing'){
    const d = completedOf(s.id).length, l = sessionsOf(s.id).filter(x=>x.started_at&&!x.ended_at).length;
    return `<article class="card stack">${head}
      <div class="well stack" style="gap:10px"><div class="row between small"><b>Interviews completed</b><b class="num">${pct(d/s.sample_size*100)} (${d} of ${s.sample_size})</b></div>
        <div class="bar"><i style="width:${Math.min(100,d/s.sample_size*100)}%"></i></div>
        <div class="row between small"><span class="num">${inr(paidTotal(s))} ${REWARD_LABEL[s.reward_type]} disbursed</span><span style="color:var(--accent)">${l} in live session</span></div></div>
      <div class="row between"><span></span><a class="btn" href="#live-${s.id}">Open live monitor ${ic('right')}</a></div></article>`;
  }
  if(st==='ready'){
    const recs = rows('Recommendation',r=>r.study_id===s.id).length;
    const ev = rows('Evidence',e=>rows('Theme',t=>t.study_id===s.id).some(t=>t.id===e.theme_id)).length;
    return `<article class="card stack">${head}
      <div class="quote pos"><div class="stack" style="gap:8px"><span class="eyebrow" style="color:var(--accent)">Executive synthesis</span><p>“${esc(s.headline)}”</p>
        <div class="row small" style="gap:8px"><span class="pill">${recs} actions</span><span class="muted">${ev} evidence clips · ${completedOf(s.id).length} interviews</span></div></div></div>
      <div class="row between"><span></span><a class="btn primary" href="#report-${s.id}">View insights report ${ic('right')}</a></div></article>`;
  }
  const b = studyBudget(s), q = questionsOf(s.id).length;
  return `<article class="card stack">${head}
    <div class="well stack small" style="gap:6px"><div class="row between"><span class="muted">Interview questions</span><b>${q}</b></div>
      <div class="row between"><span class="muted">Payout per respondent</span><b class="num">${inr(b.inc)} ${REWARD_LABEL[s.reward_type]||''}</b></div>
      <div class="row between"><span class="muted">Estimated turnaround once launched</span><b>${durTxt(estTurnaround(s.sample_size,s.max_duration_min))}</b></div></div>
    <div class="row between"><span class="small muted">Not launched yet</span><a class="btn" href="#plan-${s.id}">Resume setup ${ic('right')}</a></div></article>`;
}

// ---------- DEFINE OBJECTIVE ----------
function ndInit(o){ ui.nd = Object.assign({objective:'',source:'voqiva_panel',cohort_import_id:null,parent_study_id:null,removed:[],custom:[]},o||{}); }
const ckey = c=>c.attribute+'|'+JSON.stringify(c.value);
function ndCriteria(){ const p = parseObjective(ui.nd.objective); const base = p.criteria.filter(c=>!ui.nd.removed.includes(ckey(c))).concat(ui.nd.custom);
  if(ui.nd.source==='voqiva_panel'){ const sg=ndSegments(); if(sg.length) base.unshift({attribute:'segment',operator:'in',value:sg,label:'Audience: '+segNames(sg)}); }
  return base; }
function vNew(){
  if(!ui.nd) ndInit();
  const nd = ui.nd;
  const cohorts = rows('CohortImport',c=>c.workspace_id===ui.ws);
  const readyS = wsStudies().filter(s=>studyStatus(s)==='ready');
  const panelN = rows('Person',p=>!p.cohort_import_id).length;
  const busy = ui.ndBusy;
  document.getElementById('footer').innerHTML = `<div class="footer-bar"><span class="small muted" id="nd-tat"></span><span class="small muted hide-sm">${ic('shield','') .replace('<svg','<svg style="width:15px;vertical-align:-3px"')} Incentives auto-released on completion</span><span style="flex:1"></span>
    <a class="btn" href="#home">Cancel</a>
    ${busy? `<button class="btn" data-act="nd-stop">${ic('stop')}Stop</button><button class="btn primary lg" disabled><span class="dot pulse"></span><span id="nd-busy">${esc(busy)}</span></button>`
          : (nd.step>=2 ? `<button class="btn primary lg" data-act="nd-generate">${ic('spark')}Generate AI research plan ${ic('right')}</button>` : `<button class="btn primary lg" data-act="nd-next">Next: choose who to ask ${ic('right')}</button>`)}</div>`;
  return `
  <div class="crumbs"><a href="#home">${ic('left').replace('<svg','<svg style="width:15px"')} Back to dashboard</a></div>
  <section class="row between"><div class="row"><h1>New research study</h1>${nd.parent_study_id?`<span class="pill acc">Follow-up study</span>`:''}</div>
    ${studyStepper(null,'ask')}</section>
  <div class="grid split" style="grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);align-items:start">
    <div class="stack" style="gap:18px">
      <section class="card stack" style="border-left:4px solid var(--accent)">
        <div class="row between"><h3>What do you want to discover?</h3><span class="pill acc">English</span></div>
        <p class="muted small">Write the business question in plain English. Voqiva turns it into screener rules, an interview protocol and a representative sample.</p>
        <div class="well stack" style="gap:8px;padding:12px">
          <textarea id="nd-obj" class="field" style="border:0;background:transparent;min-height:150px;font-size:16px;line-height:1.6" maxlength="1000" data-input="nd-obj" placeholder="e.g. Validate demand for oversized officewear among working men aged 22–30 in Bengaluru, Mumbai and Pune…">${esc(nd.objective)}</textarea>
          <div class="row between">${DICT?`<button class="btn sm" data-act="dictate" id="dict-btn">${ic('mic')}<span>Record voice prompt</span></button>`:'<span></span>'}<span class="small muted num" id="nd-count">${nd.objective.length} / 1,000 characters</span></div>
        </div>
        <span class="eyebrow">Scenario templates</span>
        <div class="row" style="gap:8px">${rows('PromptTemplate',t=>t.placement==='scenario_starter').map(t=>`<button class="chip plain" data-act="starter" data-id="${t.id}">${esc(t.label)}</button>`).join('')}</div>
      </section>
      ${nd.step>=2?'':`<section class="card tint row between"><div><b>Next: who should Voqiva ask?</b><div class="small muted">Your buyers, past respondents or a panel audience. The AI suggests one from your question.</div></div><button class="btn" data-act="nd-next">Choose who to ask ${ic('right')}</button></section>`}
      <section class="card stack" id="nd-aud" ${nd.step>=2?'':'hidden'}>
        <h3>Who should Voqiva ask?</h3><p class="muted small">Choose where Voqiva should find people to interview.</p>
        ${sourceBlock()}
        <span class="eyebrow" style="margin-top:6px">Audience rules picked up from your objective</span>
        <div class="row" style="gap:8px" id="nd-chips"></div>
        ${ruleForm('nd')}
      </section>
    </div>
    <aside class="stack side-sticky" style="gap:16px" id="nd-side"></aside>
  </div>`;
}
function srcOption(k,title,desc,badge,extra=''){
  const on = ui.nd.source===k;
  return `<label class="${on?'well':''}" style="display:flex;gap:14px;padding:16px;border-radius:12px;cursor:pointer;${on?'':'border:1px solid var(--line)'}">
    <input type="radio" name="src" value="${k}" ${on?'checked':''} data-change="nd-src" style="margin-top:4px;accent-color:var(--accent);width:18px;height:18px">
    <div style="flex:1;min-width:0"><div class="row between"><b style="font-family:var(--display);font-size:17px">${title}</b>${badge}</div><p class="muted small" style="margin-top:4px">${desc}</p>${extra}</div></label>`;
}
const RULE_ATTRS = [['gender','Gender','eq','male / female'],['age','Age range','between','e.g. 22-30'],['city','City','eq','e.g. Hyderabad'],['industry','Industry','in','e.g. Tech, FinTech'],['d2c_fashion_orders_60d','D2C fashion orders (60 days) at least','gte','e.g. 2'],['quick_commerce_orders_30d','Quick-commerce orders (30 days) at least','gte','e.g. 4'],['skincare_buyer','Skincare buyer','eq','true'],['upi_verified','UPI verified','eq','true'],['custom','Custom screener rule','eq','e.g. Owns a two-wheeler']];
function ruleForm(scope){
  if(ui.addRule!==scope) return `<button class="chip plain" style="align-self:flex-start" data-act="rule-open" data-scope="${scope}">${ic('plus').replace('<svg','<svg style="width:14px"')} Add filter rule</button>`;
  return `<form class="well row" data-submit="rule-add" data-scope="${scope}" style="align-items:flex-end">
    <div style="flex:1;min-width:180px"><label class="lbl" for="rule-attr">Rule</label><select class="field" id="rule-attr">${RULE_ATTRS.map(r=>`<option value="${r[0]}">${r[1]}</option>`).join('')}</select></div>
    <div style="flex:1;min-width:160px"><label class="lbl" for="rule-val">Value</label><input class="field" id="rule-val" placeholder="e.g. 22-30 or Hyderabad" required></div>
    <button class="btn primary" type="submit">Add</button><button class="btn" type="button" data-act="rule-cancel">Cancel</button></form>`;
}
function parseRule(attr, raw){
  const r = RULE_ATTRS.find(x=>x[0]===attr); raw=String(raw).trim(); if(!raw) return null;
  let value = raw, label = r[1]+': '+raw;
  if(attr==='age'){ const m=raw.match(/(\d+)\D+(\d+)/); if(!m) return null; value=[+m[1],+m[2]]; label='Ages '+m[1]+'–'+m[2]; }
  if(attr==='gender'){ value = /^f|wom/i.test(raw)?'female':'male'; label = value==='female'?'Women':'Men'; }
  if(attr==='city'){ value = CITY_ALIASES[raw.toLowerCase()]||raw; label=value; }
  if(attr==='industry'){ value = raw.split(',').map(x=>x.trim()).filter(Boolean); label='Industry: '+value.join(', '); }
  if(r[2]==='gte'){ value = +raw||1; label = r[1].replace(' at least','')+' ≥ '+value; }
  if(['skincare_buyer','upi_verified'].includes(attr)){ value = true; label = r[1]; }
  if(attr==='custom') return {attribute:'screener_note',operator:'eq',value:raw,label:raw};
  return {attribute:attr,operator:r[2],value,label};
}
function updateNewSide(){
  const nd = ui.nd; if(!nd) return;
  renderSegChips();
  const p = parseObjective(nd.objective);
  const crits = ndCriteria();
  const chips = document.getElementById('nd-chips');
  if(chips) chips.innerHTML = crits.length? crits.map(c=>`<span class="chip">${esc(c.label)} <button class="link x" data-act="nd-chip-x" data-k="${esc(ckey(c))}" aria-label="Remove ${esc(c.label)}">${ic('x').replace('<svg','<svg style="width:14px;vertical-align:-2px"')}</button></span>`).join('') : '<span class="small muted">Mention gender, ages, cities or a price range and they will appear here.</span>';
  const f = feasibility({audience_source:nd.source,cohort_import_id:nd.cohort_import_id,parent_study_id:nd.parent_study_id}, crits);
  const n = Math.min(25, Math.max(5,f.match)) || 25;
  const tat = estTurnaround(n,10);
  const cnt = document.getElementById('nd-count'); if(cnt) cnt.textContent = nd.objective.length+' / 1,000 characters';
  const t = document.getElementById('nd-tat'); if(t) t.innerHTML = `Estimated turnaround: <b>~${durTxt(tat)}</b>`;
  const side = document.getElementById('nd-side'); if(!side) return;
  if(ui.ndBusy){ side.innerHTML = skeletonPlan(ui.ndBusy); return; }
  const has = nd.objective.trim().length>20;
  side.innerHTML = `
    <section class="card stack">
      <div class="row between"><h3>AI plan decomposition</h3><span class="pill ${has?'ok':''}"><span class="dot ${has?'pulse':''}"></span>Live parsing</span></div>
      <div class="grid g2" style="gap:10px">
        <div class="well"><div class="eyebrow">Detected domain</div><b>${has?esc(p.domain):'—'}</b></div>
        <div class="well"><div class="eyebrow">Target profile</div><b>${has?esc(p.profile):'—'}</b></div>
        <div class="well"><div class="eyebrow">Suggested sample</div><b class="num">${n} participants</b></div>
        <div class="well"><div class="eyebrow">Estimated TAT</div><b>${durTxt(tat)}</b></div>
      </div>
      <div class="well stack small" style="gap:8px"><div class="row between"><b>Likely protocol</b><span class="pill">Multi-modal</span></div>
        <div>• 10-minute AI voice interview${p.cities.length?' with city quotas for '+esc(p.cities.join(', ')):''}</div>
        ${p.price?`<div>• Willingness-to-pay slider between ${inr(p.price[0])} and ${inr(p.price[1])}</div>`:'<div>• Open-ended probing on needs and frustrations</div>'}
        <div>• Screener question to confirm fit before the interview</div>
        <div class="muted">The AI writes the exact questions in the next step.</div></div>
      <div class="stack" style="gap:6px"><div class="row between small"><b>Cohort feasibility</b><b style="color:${f.match>=n?'var(--accent)':'var(--warn)'}">${f.match} of ${f.base} match</b></div>
        <div class="bar"><i style="width:${f.base?Math.min(100,f.match/Math.max(n,1)*100):0}%"></i></div>
        <span class="small muted">${f.match>=n? 'Enough verified people match these rules to fill the sample.' : 'Fewer people match than the suggested sample. Loosen a rule or accept a smaller sample.'}</span></div>
    </section>
    <section class="card tint stack small" style="gap:6px"><b>Tip for D2C founders</b><span class="muted">Include price brackets and Indian context (“metro monsoons”, “festive gifting”) for sharper questions and synthesis.</span></section>`;
}

// ---------- PLAN & BUDGET ----------
function vPlan(s){
  if(studyStatus(s)!=='draft'){ return `<div class="empty">This study has launched. <a href="#live-${s.id}">Open live monitor</a></div>`; }
  const crits = criteriaOf(s.id); const qs = questionsOf(s.id); const b = studyBudget(s);
  const bal = walletBalance(ui.ws), after = bal-b.total;
  const f = feasibility(s, critRows(s.id));
  const groups = [['Audience',c=>c.attribute==='segment'],['Gender & identity',c=>c.attribute==='gender'],['Age bracket',c=>c.attribute==='age'],['Cities & quotas',c=>c.attribute==='city'],['Industry & employment',c=>c.attribute==='industry'],['Habits & verification',c=>!['segment','gender','age','city','industry'].includes(c.attribute)]];
  const canLaunch = !(after<0||!qs.length||(f.match+(s.recruitment_boost||0))===0);
  document.getElementById('footer').innerHTML = `<div class="footer-bar"><div><div class="small muted">Total</div><b class="num" style="font-family:var(--display);font-size:22px">${inr(b.total)}</b></div>
    <span class="small muted hide-sm">${s.audience_source!=='voqiva_panel'?`${freeLeft(ui.ws)} of ${FREE_QUOTA} free customer interviews left this month`:`Insights in about ${durTxt(estTurnaround(s.sample_size,s.max_duration_min))}`}</span><span style="flex:1"></span>
    ${after<0?`<button class="btn" data-act="topup" data-amt="${Math.ceil(-after/1000)*1000}">Top up ${inr(Math.ceil(-after/1000)*1000)}</button>`:''}
    <button class="btn primary lg" data-act="launch" data-id="${s.id}" ${canLaunch?'':'disabled'}>${ic('rocket')}Approve &amp; launch</button></div>`;
  const C = ui.planCustom;
  return `
  <div class="row between"><div class="crumbs"><a href="#home">${ic('left').replace('<svg','<svg style="width:15px"')} Dashboard</a><span>/</span><span class="pill acc">${esc(s.domain||'Study')}</span></div>
    <button class="btn sm" data-act="plan-custom">${C?ic('check')+'Done customising':'Customise plan'}</button></div>
  ${studyStepper(s,'review')}
  <section class="stack" style="gap:6px"><input class="field" style="font-family:var(--display);font-size:clamp(24px,3vw,34px);font-weight:600;border-color:transparent;background:transparent;padding:4px 0" value="${esc(s.title||'')}" data-change="study-title" data-id="${s.id}" aria-label="Study title">
    <p class="muted" style="max-width:80ch">${esc(s.objective)}</p></section>
  <div class="grid split" style="grid-template-columns:minmax(0,1.65fr) minmax(0,1fr);align-items:start">
    <div class="stack" style="gap:18px">
      <section class="card stack">
        <div class="row between"><div><h3>Audience &amp; cohort criteria</h3><p class="small muted">${s.audience_source==='voqiva_panel'?'Voqiva verified panel':audienceLine(s)}</p></div><span class="pill ok">Pre-screened</span></div>
        <div class="grid g2" style="gap:10px">
          ${groups.map(([name,fn])=>{ const cs=crits.filter(fn); if(!cs.length) return ''; return `<div class="well stack" style="gap:8px"><span class="eyebrow">${name}</span><div class="row" style="gap:6px">${cs.map(c=>`<span class="chip plain">${esc(clabel(c))}${c.quota_pct?` <b class="num" style="color:var(--accent)">${c.quota_pct}%</b>`:''}${C?'':'<!--'}<button class="link x" data-act="crit-x" data-id="${c.id}" aria-label="Remove">${ic('x').replace('<svg','<svg style="width:13px;vertical-align:-2px"')}</button>${C?'':'-->'}</span>`).join('')}</div></div>`; }).join('') || '<div class="well small muted">No extra rules. Everyone in the selected audience is eligible.</div>'}
        </div>
        ${C?ruleForm('plan'):''}
        <div class="well row between" style="background:var(--accent-soft)">
          <div><b>Target sample size</b><div class="small muted">${f.match} of ${f.base} people in this audience match all rules${f.match<s.sample_size?` · <span style="color:var(--warn)">only ${f.match} can be recruited</span>`:''}</div></div>
          <div class="stepper"><button data-act="n-step" data-d="-1" aria-label="Fewer">−</button><input id="n-input" class="num" value="${s.sample_size}" data-change="n-set" aria-label="Respondents"><button data-act="n-step" data-d="1" aria-label="More">+</button></div>
        </div>
        ${boostCard(s,f)}
        ${s.audience_source==='voqiva_panel'?`<div class="row" style="gap:8px"><span class="pill ok">${ic('shield').replace('<svg','<svg style="width:14px"')}Aadhaar / UPI verified pool</span><span class="pill acc">Bots and duplicates blocked</span></div>`:`<div class="row" style="gap:8px"><span class="pill buy">${ic('check')}Purchase-verified buyers</span><span class="pill ok">Opted in on WhatsApp · consent on record</span></div>`}
      </section>
      <section class="card stack">
        <div class="row between"><div><h3>Methodology &amp; interview protocol</h3><p class="small muted">The AI moderator asks these in order and probes each goal in real time.</p></div></div>
        ${C?'':`<div class="row small muted" style="gap:14px"><span>${esc(METHOD_LABEL[s.methodology]||'')}</span><span>Up to ${s.max_duration_min||10} min</span><span>English</span><span>${qs.length} questions</span></div>`}
        <div class="grid g2" style="gap:10px" ${C?'':'hidden'}>
          <div><label class="lbl" for="p-method">Method</label><select class="field" id="p-method" data-change="study-field" data-f="methodology">${Object.entries(METHOD_LABEL).map(([k,l])=>`<option value="${k}" ${s.methodology===k?'selected':''}>${l}</option>`).join('')}</select></div>
          <div><label class="lbl" for="p-dur">Max length (minutes)</label><input class="field num" id="p-dur" type="number" min="3" max="30" value="${s.max_duration_min||10}" data-change="study-field" data-f="max_duration_min"></div>
        </div>
        ${qs.map(q=>`<div class="q-card ${q.kind==='screener'?'screener':q.input_type==='slider'?'slider':q.input_type==='choice'?'choice':''} stack" style="gap:8px">
          <div class="row between"><div class="row" style="gap:8px"><span class="pill acc">Q${q.position} · ${q.kind==='screener'?'Screener':esc(q.section)}</span><span class="small muted">${INPUT_LABEL[q.input_type]}</span></div>
            ${C?`<button class="btn sm ghost" data-act="q-del" data-id="${q.id}" aria-label="Delete question">${ic('x')}</button>`:''}</div>
          ${C?`<textarea id="q-${q.id}" rows="2" style="font-family:var(--display);font-size:17px" data-change="q-edit" data-id="${q.id}">${esc(q.prompt)}</textarea>`:`<p style="font-family:var(--display);font-size:17px">${esc(q.prompt)||'<span class="faint">Empty question</span>'}</p>`}
          ${q.config&&q.input_type==='slider'?`<span class="small muted num">Range ${q.config.unit==='inr'?inr(q.config.min)+' – '+inr(q.config.max):q.config.min+' – '+q.config.max+' '+(q.config.unit||'')}</span>`:''}
          ${q.config&&q.input_type==='choice'?`<span class="small muted">Options: ${esc((q.config.options||[]).join(' · '))}</span>`:''}
          ${q.config&&q.config.card?`<span class="small muted">Card: ${esc(q.config.card)}</span>`:''}
          ${q.probe_goal?`<span class="small muted">Probe: ${esc(q.probe_goal)}</span>`:''}</div>`).join('')}
        ${C?`<button class="btn" style="align-self:flex-start" data-act="q-add">${ic('plus')}Add custom question</button>`:''}
      </section>
    </div>
    <aside class="stack side-sticky" style="gap:16px">
      <section class="card stack" style="border-top:4px solid var(--accent)">
        <div class="row between"><h3>Budget &amp; payout</h3><span class="pill">Itemised</span></div>
        <div class="row between"><div><b>Respondent incentives</b><div class="small muted num">${b.n} × ${inr(b.inc)} ${REWARD_LABEL[s.reward_type]}</div></div><b class="num">${inr(b.incent)}</b></div>
        <div class="grid g2" style="gap:8px" ${C?'':'hidden'}><div><label class="lbl" for="p-inc">Per person (₹)</label><input class="field num" id="p-inc" type="number" min="50" step="50" value="${b.inc}" data-change="study-field" data-f="incentive_inr"></div>
          <div><label class="lbl" for="p-rew">Reward</label><select class="field" id="p-rew" data-change="study-field" data-f="reward_type">${Object.entries(REWARD_LABEL).map(([k,l])=>`<option value="${k}" ${s.reward_type===k?'selected':''}>${l}</option>`).join('')}</select></div></div>
        ${audienceRateHint(s,b)}
        ${boostLine(b,s)}
        <div class="row between"><div><b>AI synthesis</b><div class="small muted">Transcription, tagging and the insights report</div></div>${feeCell(b.syn,'synthesis_fee',b.free)}</div>
        <div class="row between"><div><b>Disbursement &amp; escrow</b><div class="small muted">UPI gateway, vouchers and TDS handling</div></div>${feeCell(b.dis,'disbursement_fee',b.free)}</div>
        ${b.free?`<div class="well small" style="background:var(--ok-soft)"><b>Free tier applied.</b> Synthesis and payout fees are waived for up to ${FREE_QUOTA} own-customer interviews a month (${freeLeft(ui.ws)} left).</div>`:(s.audience_source!=='voqiva_panel'?`<div class="small muted">Free tier covers up to ${FREE_QUOTA} own-customer interviews a month (${freeLeft(ui.ws)} left). Reduce the sample to use it.</div>`:'')}
        <hr style="border:0;border-top:1px solid var(--line);width:100%;margin:0">
        <div class="row between"><div><span class="eyebrow">Total study investment</span><div class="small muted">Taxes and gateway costs included</div></div><span class="num" style="font-family:var(--display);font-size:32px;font-weight:700;color:var(--accent)">${inr(b.total)}</span></div>
        <div class="well stack" style="gap:6px;background:${after>=0?'var(--ok-soft)':'var(--bad-soft)'}">
          <div class="row between small"><b>Research wallet</b><span class="pill ${after>=0?'ok':'bad'}">${after>=0?'Funds verified':'Not enough funds'}</span></div>
          <div class="row between small"><span>Current balance</span><b class="num">${inr(bal)}</b></div>
          <div class="row between small"><span>Balance after launch</span><b class="num">${inr(after)}</b></div></div>
        ${after<0?`<button class="btn" data-act="topup" data-amt="${Math.ceil(-after/1000)*1000}">${ic('wallet')}Top up ${inr(Math.ceil(-after/1000)*1000)} via UPI</button>`:''}
        ${agencyAnchor(s.sample_size||0)}
        <p class="small muted">Interviews start right away. Unused incentive is refunded to your wallet when you close the study.</p>
      </section>
      <section class="card tint stack small" style="gap:4px"><b>Estimated turnaround: ${durTxt(estTurnaround(s.sample_size,s.max_duration_min))}</b><span class="muted">${f.match} eligible people available now. Interviews run in parallel waves of 8.</span></section>
      <button class="btn ghost" data-act="draft-del" data-id="${s.id}">Delete this draft</button>
    </aside>
  </div>`;
}

// ---------- LIVE MONITOR ----------
function vLive(s){
  const st = studyStatus(s);
  if(st==='draft') return `<div class="empty">Not launched yet. <a href="#plan-${s.id}">Review plan</a></div>`;
  const all = sessionsOf(s.id); const q = all.filter(x=>x.screen_result==='qualified');
  const fraud = all.filter(x=>x.screen_result==='fraud').length;
  const done = q.filter(x=>x.ended_at), live = q.filter(x=>x.started_at&&!x.ended_at), queued = q.filter(x=>!x.started_at);
  const people = q.map(x=>byId('Person',x.person_id));
  const aad = people.filter(p=>p.aadhaar_verified_at).length, li = people.filter(p=>p.linkedin_verified_at).length;
  const avg = done.length? done.reduce((a,x)=>a+(T(x.ended_at)-T(x.started_at)),0)/done.length : 0;
  const reserve = -rows('WalletTransaction',t=>t.study_id===s.id&&t.kind==='incentive_reserve').reduce((a,t)=>a+t.amount_inr,0);
  const paid = q.filter(x=>x.payout_status==='paid').length, failed = q.filter(x=>x.payout_status==='failed').length;
  const running = FIELD && FIELD.studyId===s.id, synth = SYNTH && SYNTH.studyId===s.id;
  const sorted = [...live, ...done.sort((a,b)=>T(b.ended_at)-T(a.ended_at)), ...queued];
  if(!ui.sel[s.id] || !sorted.some(x=>x.id===ui.sel[s.id])) ui.sel[s.id] = (done[0]||live[0]||{}).id;
  const shown = ui.showAll? sorted : sorted.slice(0,6);
  return `
  <div class="crumbs"><a href="#studies">Studies</a><span>/</span><b>${esc(s.title)}</b></div>
  ${studyStepper(s,'live')}
  <section class="row between" style="align-items:flex-start">
    <div class="stack" style="gap:8px"><div class="row"><h1>${esc(s.title)}</h1>${statusPill(s)}</div>
      <div class="row small muted" style="gap:14px"><span class="pill">${audienceLine(s)}</span><span>Started ${ago(s.launched_at)}</span><span>${esc(METHOD_LABEL[s.methodology])} · ${esc(LANG_LABEL[s.language])}</span><span style="color:var(--ok)">Incentive escrow: ${inr(reserve)}</span></div></div>
    <div class="row">
      ${st==='live'? (running? `<button class="btn" data-act="field-stop">${ic('stop')}Pause interviews</button>` : (live.length+queued.length? `<button class="btn" data-act="field-run" data-id="${s.id}">${ic('play')}Run remaining ${live.length+queued.length} interviews</button>`:''))
        +`<button class="btn primary" data-act="synth" data-id="${s.id}" ${!done.length||running?'disabled':''}>${ic('spark')}${isTriggerStudy(s)?'Synthesise so far':'Close &amp; synthesise'} (${done.length} ready)</button>` + (s.synthesized_at?`<a class="btn" href="#report-${s.id}">Latest insights</a>`:'') : ''}
      ${st==='synthesizing' && !synth ? `<button class="btn primary" data-act="synth" data-id="${s.id}">${ic('spark')}Run synthesis</button>`:''}
      ${st==='ready'? `<a class="btn primary" href="#report-${s.id}">View synthesised insights ${ic('right')}</a>`:''}
    </div>
  </section>
  ${running? `<section class="card tint row between"><div class="row"><div class="wave">${[14,22,10,26,16,20,12].map(h=>`<i style="height:${h}px"></i>`).join('')}</div><div><b>${esc(FIELD.msg)}</b><div class="small muted">${FIELD.done} of ${FIELD.total} done · responses are AI-simulated in this prototype</div></div></div><div class="bar" style="width:200px"><i style="width:${FIELD.done/FIELD.total*100}%"></i></div></section>`:''}
  ${synth? `<section class="card tint row"><span class="dot pulse" style="color:var(--accent)"></span><b id="synth-progress">Reading ${done.length} transcripts…</b><span style="flex:1"></span><button class="btn sm" data-act="synth-stop">${ic('stop')}Stop</button></section>`+skeletonThemes():''}
  <section class="grid g3">
    <div class="card kpi stack"><div class="row between"><span class="eyebrow">Recruitment &amp; screening</span>${ic('shield').replace('<svg','<svg style="width:20px;color:var(--accent)"')}</div>
      <div class="big num">${q.length}<small>/ ${s.sample_size} qualified</small></div>
      <div class="row small" style="gap:12px"><span style="color:var(--ok)">${pct(q.length/Math.max(1,s.sample_size)*100)} of target</span><span>${fraud} blocked at verification</span></div>
      ${s.audience_source==='voqiva_panel'?`<div class="row between small muted"><span>Aadhaar KYC: ${q.length?pct(aad/q.length*100):'—'}</span><span>LinkedIn linked: ${li}/${q.length}</span></div>`:`<div class="row between small muted"><span>Purchase-verified: ${people.filter(p=>buyerStats(p.id)).length}/${q.length}</span><span>Consent on record: ${people.filter(p=>consentOf(p.id)).length}/${q.length}</span></div>`}</div>
    <div class="card kpi stack"><div class="row between"><span class="eyebrow">Interview completion</span></div>
      <div class="big num">${done.length}<small>completed · <span style="color:var(--accent)">${live.length} live</span> · ${queued.length} queued</small></div>
      <div class="bar ok"><i style="width:${done.length/Math.max(1,s.sample_size)*100}%"></i></div>
      <div class="row between small muted"><span style="color:var(--ok);font-weight:600">${pct(done.length/Math.max(1,s.sample_size)*100)} of goal</span><span>Avg. duration ${avg?mmss(avg):'—'}</span></div></div>
    <div class="card kpi stack"><div class="row between"><span class="eyebrow">Incentives disbursed</span></div>
      <div class="big num">${inr(paid*s.incentive_inr)}<small>/ ${inr(reserve)}</small></div>
      <div class="small" style="color:var(--ok)">${paid} automatic ${REWARD_LABEL[s.reward_type]} releases</div>
      <div class="row between small muted"><span>${esc(REWARD_LABEL[s.reward_type])}</span><span>${failed} payment failures</span></div></div>
  </section>
  <div class="row between"><div class="tabs">${[['feed',`Respondents (${q.length})`],['sentiment','Sentiment & signals']].map(([k,l])=>`<button class="${ui.liveTab===k?'on':''}" data-act="live-tab" data-k="${k}">${l}</button>`).join('')}</div>
    ${live.length?`<span class="pill acc"><span class="dot pulse"></span>${live.length} AI voice calls in session</span>`:''}</div>
  ${ui.liveTab==='feed'? `
  <div class="grid split" style="grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);align-items:start">
    <div class="stack">${shown.map(x=>sessCard(s,x,questionsOf(s.id))).join('')}
      ${sorted.length>6?`<button class="btn" data-act="show-all">${ui.showAll?'Show fewer':'Show all '+sorted.length+' respondents'}</button>`:''}</div>
    <aside class="side-sticky">${transcriptPanel(s, byId('Session',ui.sel[s.id]))}</aside>
  </div>` : sentimentPanel(s, done)}
  ${st==='live' && done.length? `<section class="card banner"><div class="avatar" style="width:48px;height:48px">${ic('spark')}</div>
    <div><h3>${done.length} interview transcripts ready for synthesis</h3><p class="small muted">${isTriggerStudy(s)?'This always-on study keeps listening. Synthesising groups everything heard so far into themes, each backed by quotes and order data.':'Closing the study stops new interviews and refunds unused incentive. Then the AI groups what people said into themes, each backed by quotes.'}</p></div>
    <button class="btn" data-act="synth" data-id="${s.id}" ${running?'disabled':''}>${isTriggerStudy(s)?'Synthesise so far':'Close &amp; synthesise'} ${ic('right')}</button></section>`:''}`;
}
function sessCard(s, x, qs){
  const p = byId('Person',x.person_id); const sel = ui.sel[s.id]===x.id;
  const sig = rows('Signal',g=>g.session_id===x.id);
  const isLive = x.started_at && !x.ended_at;
  const badges = [p.aadhaar_verified_at&&'Aadhaar',p.linkedin_verified_at&&'LinkedIn',p.upi_verified_at&&'UPI'].filter(Boolean);
  let right;
  if(x.ended_at) right = `<span class="pill ok">Completed (${mmss(T(x.ended_at)-T(x.started_at))})</span><div class="small muted num">${x.payout_status==='paid'?inr(s.incentive_inr)+' sent · '+esc(String(x.payout_ref).slice(-8)):'Payout pending'}</div>`;
  else if(isLive) right = `<span class="pill acc"><span class="dot pulse"></span>In live AI call</span><div class="small muted">Payout held in escrow</div>`;
  else right = `<span class="pill">Queued</span><div class="small muted">Qualified, call not started</div>`;
  const lastMod = isLive && rows('TranscriptTurn',t=>t.session_id===x.id&&t.speaker==='moderator').sort((a,b)=>b.start_ms-a.start_ms)[0];
  const topic = lastMod && (qs.find(q=>q.id===lastMod.question_id)||{}).section;
  return `<article class="sess ${sel?'sel':''} ${isLive?'live':''}" data-act="sel-sess" data-sid="${s.id}" data-id="${x.id}" tabindex="0">
    <div class="row between" style="align-items:flex-start"><div class="row" style="flex-wrap:nowrap;min-width:0"><div class="avatar">${initials(p.full_name)}</div>
      <div style="min-width:0"><div class="row" style="gap:8px"><b style="font-family:var(--display);font-size:17px">${esc(shortName(p.full_name))}, ${personAge(p)||''}</b>${badges.length?`<span class="pill ok" style="font-size:11px">${ic('check').replace('<svg','<svg style="width:12px"')}${badges.join(' & ')}</span>`:''}${p.cohort_import_id?'<span class="pill" style="font-size:11px">Your customer</span>':''}</div>
      <div class="small muted">${esc(p.city||'')} · ${esc(p.occupation||'')}</div></div></div>
      <div style="text-align:right">${right}</div></div>
    ${x.summary?`<div class="well small"><b>Sentiment: ${esc(x.sentiment||'')}</b> · ${esc(x.summary)}</div>`:''}
    ${topic?`<div class="well small row between"><span>Current topic: ${esc(topic)}</span><span style="color:var(--accent);font-weight:600">Listening in…</span></div>`:''}
    ${sig.length?`<div class="row" style="gap:6px">${sig.map(g=>`<span class="pill ${g.polarity==='positive'?'ok':g.polarity==='critical'?'bad':g.polarity==='negative'?'warn':''}" style="font-size:11.5px">${esc(g.label)}</span>`).join('')}</div>`:''}
  </article>`;
}
function transcriptPanel(s, x){
  if(!x) return `<div class="card empty">No interviews have started yet. Run the interviews to see transcripts here.</div>`;
  const p = byId('Person',x.person_id); const qs = questionsOf(s.id);
  const turns = rows('TranscriptTurn',t=>t.session_id===x.id).sort((a,b)=>a.start_ms-b.start_ms);
  const ans = rows('Answer',a=>a.session_id===x.id);
  const sig = rows('Signal',g=>g.session_id===x.id);
  const total = x.ended_at? T(x.ended_at)-T(x.started_at) : (turns.length? turns[turns.length-1].start_ms+5000:0);
  return `<section class="card stack" style="gap:14px">
    <div class="row between"><b style="font-family:var(--display);font-size:18px"><span class="dot" style="color:${x.ended_at?'var(--ok)':'var(--accent)'}"></span> ${esc(shortName(p.full_name))} · Transcript</b><span class="small muted num">${mmss(total)}</span></div>
    <div class="well small muted">Audio recordings are not stored in this prototype. The transcript below is the record.</div>
    <div class="transcript">${turns.map(t=>{ const q=qs.find(z=>z.id===t.question_id);
      return t.speaker==='moderator'
        ? `<div class="stack" style="gap:4px"><span class="small" style="color:var(--accent);font-weight:600">Voqiva AI moderator · ${mmss(t.start_ms)}${q?' · Q'+q.position:''}</span><div class="bubble mod">${esc(t.text)}</div></div>`
        : `<div class="stack" style="gap:4px;align-items:flex-end"><span class="small muted">${mmss(t.start_ms)} · ${esc(shortName(p.full_name))}</span><div class="bubble par">${esc(t.text)}</div></div>`; }).join('') || '<span class="muted small">Waiting for the call to start…</span>'}
      ${x.started_at&&!x.ended_at?'<div class="row small muted"><div class="wave" style="height:18px">'+[8,14,6,16,10].map(h=>`<i style="height:${h}px"></i>`).join('')+'</div>Participant is answering…</div>':''}</div>
    ${ans.length?`<div class="stack" style="gap:6px"><span class="eyebrow">Structured answers</span>${ans.map(a=>{ const q=qs.find(z=>z.id===a.question_id); const v=a.value_json.value; return `<div class="row between small"><span class="muted">Q${q?q.position:''} ${esc(q?q.section:'')}</span><b class="num">${Array.isArray(v)?esc(v.join(', ')):(q&&q.config&&q.config.unit==='inr'?inr(v):esc(v))}</b></div>`; }).join('')}</div>`:''}
    ${sig.length?`<div class="stack" style="gap:6px"><span class="eyebrow">Signals extracted in real time</span><div class="row" style="gap:6px">${sig.map(g=>`<span class="pill ${g.polarity==='positive'?'ok':g.polarity==='critical'?'bad':g.polarity==='negative'?'warn':''}">${esc(g.label)}</span>`).join('')}</div></div>`:''}
  </section>`;
}
function sentimentPanel(s, done){
  const c = {positive:0,neutral:0,negative:0}; done.forEach(x=>c[x.sentiment]=(c[x.sentiment]||0)+1);
  const n = done.length||1;
  const g = {}; done.forEach(x=>rows('Signal',z=>z.session_id===x.id).forEach(z=>{ (g[z.label]=g[z.label]||{p:z.polarity,n:0}).n++; }));
  const top = Object.entries(g).sort((a,b)=>b[1].n-a[1].n).slice(0,12);
  return `<div class="grid g2" style="align-items:start">
    <section class="card stack"><h3>Overall sentiment</h3><p class="small muted">${done.length} completed interviews</p>
      ${[['positive','Positive','ok'],['neutral','Neutral',''],['negative','Negative','warn']].map(([k,l,cl])=>`<div class="stack" style="gap:4px"><div class="row between small"><b>${l}</b><span class="num">${c[k]} · ${pct(c[k]/n*100)}</span></div><div class="bar ${cl==='ok'?'ok':''}"><i style="width:${c[k]/n*100}%;${cl==='warn'?'background:var(--warn)':cl===''?'background:var(--faint)':''}"></i></div></div>`).join('')}</section>
    <section class="card stack"><h3>Most frequent signals</h3>
      <div class="table-wrap"><table><thead><tr><th>Signal</th><th>Tone</th><th style="text-align:right">Interviews</th></tr></thead><tbody>
      ${top.map(([l,v])=>`<tr><td>${esc(l)}</td><td><span class="pill ${v.p==='positive'?'ok':v.p==='critical'?'bad':v.p==='negative'?'warn':''}">${v.p}</span></td><td class="num" style="text-align:right">${v.n}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">No signals yet</td></tr>'}</tbody></table></div></section></div>`;
}

// ---------- INSIGHTS REPORT ----------
function themeStats(t){ return one('Metric',m=>m.theme_id===t.id&&m.position===1)||{participant_count:0,value:0}; }
function vReport(s){
  if(!s.synthesized_at) return `<div class="empty">Insights aren't ready yet. <a href="#live-${s.id}">Open live monitor</a> to close the study and run synthesis.</div>`;
  const themes = rows('Theme',t=>t.study_id===s.id).sort((a,b)=>a.position-b.position);
  const head = rows('Metric',m=>m.study_id===s.id&&!m.theme_id&&!m.recommendation_id).sort((a,b)=>a.position-b.position);
  const done = completedOf(s.id); const N = done.length;
  const cats = ['unmet_need','buying_driver','friction','preference'];
  const shown = themes.filter(t=>ui.themeFilter==='all'||t.category===ui.themeFilter);
  const cities = [...new Set(done.map(x=>byId('Person',x.person_id).city))];
  return `
  ${ui.reveal===s.id?revealBlock(s):''}
  <div class="crumbs"><a href="#studies">Studies</a><span>/</span><a href="#live-${s.id}">${esc(s.title)}</a><span>/</span><b>Insights report</b></div>
  ${studyStepper(s,'insights')}
  <section class="row between" style="align-items:flex-end">
    <div class="stack" style="gap:8px"><h1>Executive customer intelligence report</h1>
      <div class="row"><span class="pill ok"><span class="dot"></span>Synthesised ${ago(s.synthesized_at)}</span><span class="small muted">From ${N} verified interviews (${esc(METHOD_LABEL[s.methodology])}) across ${esc(cities.slice(0,4).join(', '))}${cities.length>4?' and more':''}.</span></div></div>
    <div class="row"><button class="btn sm" data-act="share" data-id="${s.id}">${ic('link')}${s.share_token?'Copy share link':'Create share link'}</button>
      <button class="btn sm" data-act="copy-summary" data-id="${s.id}">${ic('copy')}Copy summary</button>
      ${DLS?`<button class="btn sm" data-act="export" data-id="${s.id}">${ic('down')}Export CSV</button>`:''}
      <a class="btn" href="#actions-${s.id}">Next steps ${ic('right')}</a></div>
  </section>
  <section class="card hero stack" style="gap:18px;padding:30px">
    <div class="row between"><span class="pill acc">${ic('spark')}Executive synthesis &amp; recommendation</span>
      <span class="small" title="Share of completed interviews that back at least one verified theme"><b style="color:var(--ok)">${ic('shield').replace('<svg','<svg style="width:15px;vertical-align:-3px"')} Evidence coverage: ${pct(s.confidence_pct||0)}</b></span></div>
    <h2 style="font-size:clamp(22px,2.8vw,32px);line-height:1.25;max-width:60ch">${esc(s.headline)}</h2>
    <p class="muted" style="max-width:80ch;font-size:15.5px">${esc(s.summary)}</p>
    <div class="grid g3">${head.map(m=>`<div class="card stack" style="gap:6px;box-shadow:none"><span class="eyebrow">${esc(m.label)}</span>
      <div class="row" style="gap:10px;align-items:baseline"><span class="num" style="font-family:var(--display);font-size:36px;font-weight:600">${m.unit==='inr'?inr(m.value):pct(m.value)}</span><span class="small muted num">${m.unit==='inr'?'median of '+m.participant_count:'('+m.participant_count+'/'+N+' people)'}</span></div>
      <span class="small muted">${esc(m.description||'')}</span></div>`).join('')}</div>
  </section>
  ${wtpChart(s)}
  ${saidVsDidCard(s)}
  <div class="row between"><div class="tabs">${[['all',`All themes (${themes.length})`]].concat(cats.filter(c=>themes.some(t=>t.category===c)).map(c=>[c,`${CAT_LABEL[c]}s (${themes.filter(t=>t.category===c).length})`])).map(([k,l])=>`<button class="${ui.themeFilter===k?'on':''}" data-act="theme-filter" data-k="${k}">${l}</button>`).join('')}</div>
    <span class="pill"><span class="dot" style="color:var(--accent)"></span>Cohort: ${audienceLine(s)} · N=${N}</span></div>
  <div class="grid g2" style="align-items:start">${shown.map(t=>themeCard(s,t,N)).join('')}</div>
  <section class="card banner"><div class="avatar" style="width:48px;height:48px">${ic('bolt')}</div>
    <div><h3>Turn these insights into product, pricing and GTM work</h3><p class="small muted">Recommendations are tied to the themes above. Measured numbers and projections are labelled separately.</p></div>
    <a class="btn primary" href="#actions-${s.id}">Explore recommended next steps ${ic('right')}</a></section>
  ${mobileCTA('Explore next steps →','#actions-'+s.id)}`;
}
function themeCard(s,t,N){
  const m = themeStats(t);
  const ev = rows('Evidence',e=>e.theme_id===t.id); const feat = ev.find(e=>e.is_featured)||ev[0];
  const sw = rows('Metric',x=>x.theme_id===t.id&&x.swatch_hex).sort((a,b)=>a.position-b.position);
  const open = ui.openEv[t.id];
  const qcls = t.category==='friction'?'friction':t.category==='buying_driver'?'pos':'';
  const person = e=>{ const x=byId('Session',e.session_id); return byId('Person',x.person_id); };
  return `<article class="card stack" id="theme-${t.id}">
    <div class="row" style="gap:8px"><span class="pill acc">${CAT_LABEL[t.category]} · ${esc(t.name)}</span>
      ${t.evidence_level==='verified'?`<span class="pill ok">${ic('shield').replace('<svg','<svg style="width:13px"')}Verified observation</span>`:`<span class="pill hyp">Emerging · treat as hypothesis</span>`}</div>
    <span class="small muted num">${m.participant_count} / ${N} participants (${pct(m.value)}) · ${esc(m.label)}</span>
    <h3 style="font-size:21px">${esc(t.headline)}</h3>
    ${open?`<p class="muted">${esc(t.body)}</p>`:''}
    ${feat?(()=>{ const p=person(feat); return `<div class="quote ${qcls}"><div class="avatar">${initials(p.full_name)}</div><div class="stack" style="gap:6px"><p>“${esc(feat.quote)}”</p><span class="small row" style="gap:8px"><span><b>${esc(shortName(p.full_name))}</b>${personAge(p)?', '+personAge(p):''} · ${esc(p.city||'')}</span>${purchaseBadge(p.id)}</span></div></div>`; })():''}
    ${sw.length&&open?`<div class="well stack" style="gap:8px"><span class="eyebrow">Colours picked most</span><div class="grid g4" style="gap:8px">${sw.map(x=>`<div class="stack" style="gap:4px;text-align:center"><div class="swatch" style="background:${esc(x.swatch_hex)};border:1px solid var(--line)"></div><span class="small">${esc(x.label)}</span><b class="small num" style="color:var(--ok)">${x.value}% chose</b></div>`).join('')}</div></div>`:''}
    <div class="row between"><span class="small muted">${ev.length} quoted clips</span><button class="link" data-act="ev-toggle" data-id="${t.id}">${open?'Show less':'Read more · '+ev.length+' evidence clips'} ${ic('right').replace('<svg','<svg style="width:14px;vertical-align:-2px"')}</button></div>
    ${open?`<div class="stack" style="gap:8px">${ev.map(e=>{ const p=person(e); return `<div class="well stack" style="gap:4px"><span class="small">“${esc(e.quote)}”</span><div class="row between small muted"><span>${esc(shortName(p.full_name))} · ${esc(p.city||'')}</span><button class="link small" data-act="open-transcript" data-sid="${s.id}" data-id="${e.session_id}">Open transcript at ${mmss(e.start_ms)}</button></div></div>`; }).join('')}</div>`:''}
  </article>`;
}
function wtpChart(s){
  const q = questionsOf(s.id).find(x=>x.input_type==='slider'&&(x.config||{}).unit==='inr'); if(!q) return '';
  const vals = rows('Answer',a=>a.question_id===q.id).map(a=>Number(a.value_json.value)).filter(v=>!isNaN(v)); if(vals.length<3) return '';
  const c = q.config, lo=c.min, hi=c.max, step=c.step||Math.round((hi-lo)/14);
  const pts=[]; for(let p=lo;p<=hi;p+=step) pts.push([p, vals.filter(v=>v>=p).length/vals.length*100]);
  const W=640,H=220,L=44,R=16,Tp=14,B=34; const x=p=>L+(p-lo)/(hi-lo)*(W-L-R), y=v=>Tp+(100-v)/100*(H-Tp-B);
  const line = pts.map(([p,v],i)=>(i?'L':'M')+x(p).toFixed(1)+' '+y(v).toFixed(1)).join(' ');
  const med = [...vals].sort((a,b)=>a-b)[Math.floor((vals.length-1)/2)];
  const ticks = [lo, lo+Math.round((hi-lo)/2/step)*step, hi];
  return `<section class="card stack"><div class="row between"><div><h3>Willingness to pay</h3><p class="small muted">Share of ${vals.length} participants who would pay at least each price (Q${q.position} slider answers)</p></div><span class="pill ok num">Median ${inr(med)}</span></div>
    <div class="table-wrap"><svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="Willingness to pay curve" style="min-width:420px">
      ${[0,50,100].map(v=>`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L-8}" y="${y(v)+4}" text-anchor="end" font-size="11" fill="var(--muted)">${v}%</text>`).join('')}
      <path d="${line} L ${x(hi)} ${y(0)} L ${x(lo)} ${y(0)} Z" fill="var(--accent-soft)"/>
      <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>
      <line x1="${x(med)}" x2="${x(med)}" y1="${Tp}" y2="${H-B}" stroke="var(--ok)" stroke-dasharray="4 4"/>
      ${ticks.map(p=>`<text x="${x(p)}" y="${H-12}" text-anchor="middle" font-size="11" fill="var(--muted)">${inr(p)}</text>`).join('')}
    </svg></div></section>`;
}

// ---------- ACTION PLAN ----------
function vActions(s){
  if(!s.synthesized_at) return `<div class="empty">Recommendations appear after synthesis. <a href="#live-${s.id}">Open live monitor</a></div>`;
  const recs = rows('Recommendation',r=>r.study_id===s.id).sort((a,b)=>a.position-b.position);
  const work = recs.filter(r=>r.workstream!=='research'); const research = recs.filter(r=>r.workstream==='research');
  const wsCount = ['product','pricing','gtm'].map(k=>[k,work.filter(r=>r.workstream===k).length]).filter(x=>x[1]);
  const proj = rows('Metric',m=>m.study_id===s.id&&m.recommendation_id&&m.participant_count==null)[0];
  const N = completedOf(s.id).length;
  const followSel = ui.sel['f-'+s.id] || (research[0]||{}).id;
  return `
  <div class="crumbs"><a href="#report-${s.id}">${ic('left').replace('<svg','<svg style="width:15px"')} Insights report</a><span>/</span><b>Action plan &amp; follow-up experiments</b></div>
  ${studyStepper(s,'act')}
  ${actionsProgress(s)}
  <section class="row between" style="align-items:flex-end"><div class="stack" style="gap:6px"><h1>Recommended next steps</h1><p class="muted" style="max-width:70ch">Recommendations mapped to the customer evidence from “${esc(s.title)}”. Voqiva suggests; your team decides and executes.</p></div>
    <button class="btn" data-act="copy-brief" data-id="${s.id}">${ic('copy')}Copy brief (Notion / Jira ready)</button></section>
  <section class="grid g3">
    <div class="card kpi stack"><div class="row between"><span class="eyebrow">Prioritised workstreams</span><span class="pill acc">${work.length} actions</span></div><div class="big">${wsCount.length}<small>active</small></div>
      <div class="row" style="gap:6px">${wsCount.map(([k,n])=>`<span class="pill">${WS_LABEL[k]} (${n})</span>`).join('')}</div></div>
    <div class="card kpi stack"><div class="row between"><span class="eyebrow">Evidence coverage</span><span class="pill ok">Measured</span></div><div class="big num">${pct(s.confidence_pct||0)}</div><span class="small muted">of ${N} interviews back at least one verified theme</span></div>
    ${impactKpi(s)}
  </section>
  ${['product','pricing','gtm'].map(k=>{ const rs=work.filter(r=>r.workstream===k); if(!rs.length) return ''; return `<section class="stack"><h2>${{product:'Product design & engineering',pricing:'Pricing & commercial positioning',gtm:'GTM & creative angle'}[k]}</h2><div class="grid ${rs.length>1?'g2':''}" style="align-items:start">${rs.map(r=>recCard(s,r,N)).join('')}</div></section>`; }).join('')}
  ${research.length?`<section class="card hero stack" style="gap:16px;padding:28px">
    <span class="pill solid" style="align-self:flex-start">${ic('bolt').replace('<svg','<svg style="width:14px"')}Ready to validate your next milestone</span>
    <h2>Launch a follow-up study</h2>
    <p class="muted" style="max-width:75ch">Re-contact the <b>${N} verified respondents</b> from this study, or recruit a new cohort from the panel.</p>
    <div class="stack" style="gap:8px"><span class="eyebrow">Suggested studies</span>
      <div class="row" style="gap:8px">${research.map(r=>`<button class="chip ${r.id===followSel?'':'plain'}" data-act="follow-pick" data-sid="${s.id}" data-id="${r.id}">${esc(r.title)}</button>`).join('')}</div>
      ${(()=>{ const r=byId('Recommendation',followSel); return r?`<div class="well small">${esc(r.body_md)}</div>`:''; })()}</div>
    <div class="row"><button class="btn primary lg" data-act="follow-launch" data-sid="${s.id}">${ic('rocket')}Set up follow-up study</button><a class="btn ghost" href="#home">${ic('left')}Return to home</a></div>
  </section>`:''}`;
}
function fmtMetric(m){ return m.unit==='inr'?inr(m.value):m.unit==='multiplier'?m.value+'×':(m.value>0&&m.label.toLowerCase().includes('lift')?'+':'')+pct(m.value); }
function mdLite(md){
  const lines = String(md||'').split('\n').filter(l=>l.trim());
  const bul = lines.filter(l=>/^\s*[-*]\s+/.test(l));
  const inl = t=>esc(t).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
  if(bul.length) return `<div class="md"><ul>${bul.map(l=>`<li>${inl(l.replace(/^\s*[-*]\s+/,''))}</li>`).join('')}</ul></div>`;
  return `<p>${inl(md)}</p>`;
}
function recCard(s,r,N){
  const th = r.theme_id? byId('Theme',r.theme_id):null; const tm = th? themeStats(th):null;
  const ms = rows('Metric',m=>m.recommendation_id===r.id).sort((a,b)=>a.position-b.position);
  const next = {proposed:['adopted','Adopt recommendation'],adopted:['in_progress','Mark in progress'],in_progress:['done','Mark done'],done:null}[r.status];
  return `<article class="card stack">
    <div class="row between"><div class="row" style="gap:6px"><span class="pill ${r.impact==='high'?'ok':''}"><span class="dot"></span>${r.impact[0].toUpperCase()+r.impact.slice(1)} impact</span><span class="pill">Effort: ${r.effort}</span>${tm?`<span class="pill acc">Backed by ${tm.participant_count} interviews</span>`:''}</div>
      ${r.track?`<span class="small muted">Track: <b style="color:var(--accent)">${esc(r.track)}</b></span>`:''}</div>
    <h3 style="font-size:20px">${esc(r.title)}</h3>
    ${mdLite(r.body_md)}
    ${ms.length?`<div class="grid g2" style="gap:8px">${ms.map(m=>`<div class="well ${m.participant_count==null?'hyp':''}" style="padding:10px 12px"><div class="small" style="font-weight:600">${esc(m.label)}</div><div class="row between"><b class="num" style="font-size:18px">${fmtMetric(m)}</b><span class="small">${m.participant_count==null?'Projection':'Measured, n='+m.participant_count}</span></div>${m.description?`<div class="small ${m.participant_count==null?'':'muted'}">${esc(m.description)}</div>`:''}</div>`).join('')}</div>`:''}
    ${th?`<button class="link small" style="align-self:flex-start" data-act="goto-theme" data-sid="${s.id}" data-id="${th.id}">View the evidence: ${esc(th.name)} →</button>`:''}
    <div class="row between well" style="padding:10px 12px"><span class="small"><span class="dot" style="color:var(--ok)"></span> ${r.owner_team?'Owner: <b>'+esc(r.owner_team)+'</b>':'No owner yet'} · <span class="pill">${r.status.replace('_',' ')}</span></span>
      <div class="row" style="gap:6px"><button class="btn sm" data-act="copy-ticket" data-id="${r.id}">${ic('copy')}Copy as ticket</button>${next?`<button class="btn sm primary" data-act="rec-status" data-id="${r.id}" data-to="${next[0]}">${next[1]}</button>`:'<span class="pill ok">Done</span>'}</div></div>
  </article>`;
}

// ---------- PARTICIPANTS ----------
function vParticipants(){
  const cohorts = rows('CohortImport',c=>c.workspace_id===ui.ws);
  const list = ui.partTab==='panel' ? rows('Person',p=>!p.cohort_import_id) : rows('Person',p=>p.cohort_import_id===ui.partTab);
  const sc = {}; rows('Session').forEach(x=>{ if(x.screen_result==='qualified'&&x.ended_at) sc[x.person_id]=(sc[x.person_id]||0)+1; });
  const shown = list.slice(0,ui.showPeople);
  return `<section class="row between"><div class="stack" style="gap:4px"><h1>Participants</h1><p class="muted">Voqiva's verified panel and the customer cohorts you've imported.</p></div></section>
  <section class="card stack"><div class="row between"><h3>Import a customer cohort</h3><span class="small muted">Imported customers are only used for this brand's studies.</span></div>
    <div class="row">
      <label class="btn" for="csv-file">${ic('upload')}Upload CSV</label><input type="file" id="csv-file" accept=".csv,text/csv" data-change="csv" hidden>
      <button class="btn" data-act="sample-import" data-src="shopify">Connect Shopify (sample data)</button>
      <button class="btn" data-act="sample-import" data-src="klaviyo">Connect Klaviyo (sample data)</button></div>
    <p class="small muted">CSV columns: <code>full_name, phone</code> (required), plus any of <code>gender, birth_date, city, occupation, upi_vpa</code>. Extra columns are kept as attributes. Store connections are simulated in this prototype.</p></section>
  <div class="tabs"><button class="${ui.partTab==='panel'?'on':''}" data-act="part-tab" data-k="panel">Voqiva panel (${rows('Person',p=>!p.cohort_import_id).length})</button>
    ${cohorts.map(c=>`<button class="${ui.partTab===c.id?'on':''}" data-act="part-tab" data-k="${c.id}">${esc(c.name)} (${rows('Person',p=>p.cohort_import_id===c.id).length})</button>`).join('')}</div>
  <section class="card"><div class="table-wrap"><table><thead><tr><th>Name</th><th>Age</th><th>City</th><th>Occupation</th><th>Verification</th><th style="text-align:right">Interviews</th></tr></thead><tbody>
    ${shown.map(p=>`<tr><td><b>${esc(p.full_name)}</b><div class="small muted">${esc(String(p.phone).slice(0,6))}•••• ${esc(String(p.phone).slice(-3))}</div></td><td class="num">${personAge(p)??'—'}</td><td>${esc(p.city||'—')}</td><td>${esc(p.occupation||'—')}</td>
      <td><div class="row" style="gap:4px">${p.aadhaar_verified_at?'<span class="pill ok">Aadhaar</span>':''}${p.upi_verified_at?'<span class="pill ok">UPI</span>':''}${p.linkedin_verified_at?'<span class="pill ok">LinkedIn</span>':''}${!p.aadhaar_verified_at&&!p.upi_verified_at&&!p.linkedin_verified_at?(p.cohort_import_id?'<span class="pill">Brand customer</span>':'<span class="pill bad">Unverified</span>'):''}</div></td>
      <td class="num" style="text-align:right">${sc[p.id]||0}</td></tr>`).join('')}</tbody></table></div>
    ${list.length>shown.length?`<button class="btn" style="margin-top:12px" data-act="more-people">Show more (${list.length-shown.length} left)</button>`:''}</section>`;
}

// ---------- WALLET ----------
function vWallet(){
  const ws = byId('Workspace',ui.ws);
  const tx = rows('WalletTransaction',t=>t.workspace_id===ui.ws).sort((a,b)=>T(b.created_at)-T(a.created_at));
  const spent = -tx.filter(t=>t.amount_inr<0).reduce((a,t)=>a+t.amount_inr,0);
  const KIND = {topup:'Top-up',incentive_reserve:'Incentive reserve',synthesis_fee:'AI synthesis fee',disbursement_fee:'Disbursement fee',refund:'Unused incentive refund'};
  return `<section class="stack" style="gap:4px"><h1>Research wallet</h1><p class="muted">Every rupee in or out, per study. The balance is the sum of this ledger.</p></section>
  <section class="grid g3">
    <div class="card kpi stack"><span class="eyebrow">Available balance</span><div class="big num">${inr(walletBalance(ui.ws))}</div>
      <div class="row">${[5000,10000,25000].map(a=>`<button class="btn sm" data-act="topup" data-amt="${a}">+ ${inr(a)}</button>`).join('')}</div><span class="small muted">Top-ups are simulated UPI payments.</span></div>
    <div class="card kpi stack"><span class="eyebrow">Spent on research</span><div class="big num">${inr(spent)}</div><span class="small muted">Incentives and fees, before refunds</span></div>
    <div class="card kpi stack"><span class="eyebrow">Auto-reload</span><div class="big" style="font-size:26px">${ws.auto_reload_mandate_ref?'On':'Off'}</div>
      <span class="small muted">${ws.auto_reload_mandate_ref?'UPI mandate '+esc(ws.auto_reload_mandate_ref):'Set up a UPI AutoPay mandate so launches never stall.'}</span>
      <button class="btn sm" style="align-self:flex-start" data-act="autoreload">${ws.auto_reload_mandate_ref?'Turn off':'Turn on'}</button></div>
  </section>
  <section class="card"><div class="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Study</th><th style="text-align:right">Amount</th></tr></thead><tbody>
    ${tx.slice(0,ui.showLedger).map(t=>{ const s=byId('Study',t.study_id); return `<tr><td class="small">${new Date(t.created_at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</td><td>${KIND[t.kind]}</td><td>${s?`<a href="#${routeFor(s)}">${esc(s.title)}</a>`:'<span class="muted">—</span>'}</td><td class="num" style="text-align:right;font-weight:600;color:${t.amount_inr>0?'var(--ok)':'var(--fg)'}">${t.amount_inr>0?'+':'−'}${inr(Math.abs(t.amount_inr))}</td></tr>`; }).join('')}
  </tbody></table></div></section>`;
}

// ---------- SETTINGS / HELP ----------
function vAccount(){
  const ws = byId('Workspace',ui.ws); const mem = rows('Membership',m=>m.workspace_id===ui.ws);
  return `<section class="stack" style="gap:4px"><h1>Settings</h1><p class="muted">Brand workspace, team and fees.</p></section>
  <section class="card stack"><h3>Brand workspace</h3><div style="max-width:420px"><label class="lbl" for="ws-name">Workspace name</label><input class="field" id="ws-name" value="${esc(ws.name)}" data-change="ws-name"></div></section>
  <section class="card stack"><h3>Team</h3><div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Title</th></tr></thead><tbody>${mem.map(m=>{ const u=byId('User',m.user_id); return `<tr><td><b>${esc(u.full_name)}</b></td><td>${esc(u.email)}</td><td>${esc(m.title||'')}</td></tr>`; }).join('')}</tbody></table></div></section>
  <section class="card stack"><h3>Platform fees</h3>${rows('FeeSchedule').map(f=>`<div class="row between"><span>${f.kind==='synthesis_fee'?'AI synthesis (per study)':'Disbursement & escrow (per study)'}</span><b class="num">${inr(f.amount_inr)}</b></div>`).join('')}</section>
  <section class="card stack"><h3>AI</h3><p class="muted small">${AI_STATE==='ready'?'Claude is connected. Plans, simulated interviews and synthesis use AI; each call asks for your permission the first time and uses your Claude usage.':'Claude is not available in this view, so Voqiva uses built-in rules for plans, interviews and synthesis.'}</p></section>
  <section class="card stack"><h3>Demo data</h3><p class="muted small">Your changes are saved in this browser only. Resetting restores the original sample studies.</p>
    ${ui.confirmReset?`<div class="row"><b>Reset everything?</b><button class="btn" data-act="reset-no">Keep my data</button><button class="btn primary" data-act="reset-yes">Reset demo data</button></div>`:`<button class="btn" style="align-self:flex-start" data-act="reset-ask">Reset demo data</button>`}</section>`;
}
function vHelp(){
  return `<section class="stack" style="gap:4px"><h1>How Voqiva works</h1><p class="muted">From a plain-English question to an evidence-backed decision, in three steps.</p></section>
  <section class="grid g3">
    <div class="card stack"><span class="eyebrow">Step 1</span><h3>Define &amp; approve</h3><p class="muted small">Describe the question. The AI proposes the audience, screener, interview, sample size and budget. You edit and approve with one click.</p></div>
    <div class="card stack"><span class="eyebrow">Step 2</span><h3>Recruit, interview, reward</h3><p class="muted small">Verified panelists or your imported customers are screened, interviewed by the AI moderator, and paid automatically on completion.</p></div>
    <div class="card stack"><span class="eyebrow">Step 3</span><h3>Synthesise with evidence</h3><p class="muted small">Themes are counted from real transcripts. A theme is “verified” when at least 40% of completed interviews (and at least 3 people) support it; anything less is shown as an emerging hypothesis.</p></div>
  </section>
  <section class="card stack"><h3>What's simulated in this prototype</h3>
    <div class="md"><ul><li><b>Interviews:</b> participant answers are generated by AI (or built-in rules) from the study's questions and each person's profile. No real calls are placed.</li>
    <li><b>Payouts and top-ups:</b> UPI, vouchers and recharges are recorded in the ledger but no money moves.</li>
    <li><b>Store connections:</b> Shopify imports load sample customers and orders. CSV upload is real and parses your file in the browser. WhatsApp opt-in invites and 30-day outcome pulls are simulated.</li>
    <li><b>Data:</b> stored only in this browser. Settings has a reset.</li></ul></div></section>
  <section class="card stack"><h3>Out of scope for v1</h3><p class="muted small">In-person research, human moderators, unverified open panels, social listening or scraping, deep ERP/BI integrations, and auto-executing changes to your store or ads. Voqiva recommends; your team decides.</p></section>`;
}
