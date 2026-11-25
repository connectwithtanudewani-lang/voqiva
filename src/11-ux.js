// =====================================================================
// v4 — UX pass: landing + sign-up, first-run checklist, study stepper,
// skeletons, insights reveal, unfinished-task cues, grouped nav, trust levers
// =====================================================================
VIEWS.push('welcome');
const meta = () => (DB._meta = DB._meta || {scripts:{}});

// ---------- study stepper (goal-gradient) ----------
function studyStepper(s, cur){
  const steps = [['ask','Ask'],['review','Review'],['live','Live'],['insights','Insights'],['act','Act']];
  const st = s ? studyStatus(s) : 'new';
  const reached = !s ? 0 : st==='draft' ? 1 : s.synthesized_at ? 4 : 2;
  const href = { review: s&&st==='draft'?'#plan-'+s.id:null, live: s&&s.launched_at?'#live-'+s.id:null, insights: s&&s.synthesized_at?'#report-'+s.id:null, act: s&&s.synthesized_at?'#actions-'+s.id:null };
  const curI = steps.findIndex(x=>x[0]===cur);
  return `<nav class="stepper-nav" aria-label="Study progress"><span class="small muted">Step ${curI+1} of 5</span><ol>${steps.map(([k,l],i)=>{
    const state = i===curI?'cur':i<=reached?'done':'todo';
    const inner = `<span class="sn">${state==='done'&&i!==curI?ic('check'):i+1}</span>${l}`;
    return `<li class="${state}">${href[k]&&i!==curI?`<a href="${href[k]}">${inner}</a>`:`<span>${inner}</span>`}</li>`; }).join('')}</ol></nav>`;
}

// ---------- skeletons (Doherty threshold) ----------
function skeletonPlan(msg){
  return `<section class="card stack" aria-busy="true"><div class="row between"><h3>Drafting your plan</h3><span class="pill acc"><span class="dot pulse"></span>AI writing</span></div>
    <span class="small muted" id="nd-skel-msg">${esc(msg||'Reading your question…')}</span>
    <div class="grid g2" style="gap:10px">${[1,2,3,4].map(()=>'<div class="well"><div class="skel" style="width:50%"></div><div class="skel" style="width:80%;height:16px;margin-top:8px"></div></div>').join('')}</div>
    ${[90,75,85,60,70].map(w=>`<div class="skel-row"><div class="skel" style="width:28px;height:22px"></div><div class="skel" style="width:${w}%"></div></div>`).join('')}</section>`;
}
function skeletonThemes(){
  return `<div class="grid g2">${[1,2,3,4].map(()=>`<div class="card stack"><div class="skel" style="width:40%"></div><div class="skel" style="width:90%;height:20px"></div><div class="skel" style="width:75%"></div><div class="skel" style="width:100%;height:56px"></div></div>`).join('')}</div>`;
}

// ---------- anchoring ----------
function agencyAnchor(n){
  const lo = Math.max(60000, n*5000), hi = Math.max(100000, n*8000);
  const f = v => v>=100000 ? '₹'+(Math.round(v/10000)/10).toString().replace(/\.0$/,'')+' lakh' : inr(v);
  return `<div class="anchor"><div class="row between"><span class="small">Typical agency quote for ${n} in-depth interviews</span><s class="num">${f(lo)}–${f(hi)}</s></div><div class="row between small muted"><span>Agency turnaround</span><s>3–4 weeks</s></div><span class="small faint">Estimate for comparison, not a quote.</span></div>`;
}

// ---------- first-run checklist (endowed progress) ----------
function checklistSteps(){
  const m = meta(); const since = m.signup_at ? T(m.signup_at) : 0;
  const mine = wsStudies().filter(s=>s.launched_at && T(s.launched_at)>=since && since);
  return [
    {k:'account',label:'Create your account',done:true},
    {k:'store',label:'Connect your Shopify store',done:rows('CohortImport',c=>c.workspace_id===ui.ws&&c.source==='shopify').length>0,cta:['Connect','#participants']},
    {k:'optin',label:'Add the customer-circle opt-in to checkout',done:!!m.optin_done,cta:['Get the opt-in','#participants']},
    {k:'study',label:'Launch your first study',done:mine.length>0,cta:['Start a study','#new']},
    {k:'act',label:'Act on an insight',done:!!m.acted,cta:['See insights','#studies']}
  ];
}
function checklistCard(){
  const m = meta(); if(m.checklist_dismissed) return '';
  const st = checklistSteps(); const done = st.filter(x=>x.done).length;
  if(done===st.length) return '';
  const next = st.find(x=>!x.done);
  return `<section class="card checklist stack">
    <div class="row between"><div><h3>Get your first real-customer insight</h3><span class="small muted">${done} of ${st.length} done · about 10 minutes left</span></div><button class="btn sm ghost" data-act="checklist-hide">Hide</button></div>
    <div class="bar ok"><i style="width:${done/st.length*100}%"></i></div>
    <ol class="cl">${st.map(x=>`<li class="${x.done?'done':x===next?'next':''}"><span class="sn">${x.done?ic('check'):''}</span><span class="lbl2">${esc(x.label)}</span>${!x.done&&x.cta?`<a class="btn sm ${x===next?'accent':''}" href="${x.cta[1]}">${esc(x.cta[0])}</a>`:''}</li>`).join('')}</ol>
  </section>`;
}

// ---------- unfinished work (Zeigarnik) ----------
function continueCard(){
  const all = wsStudies(); const items=[];
  all.filter(s=>studyStatus(s)==='draft'&&!isTriggerStudy(s)).slice(0,2).forEach(s=>items.push({t:`“${s.title}” is one step from launch`,d:`Plan and budget ready · ${inr(studyBudget(s).total)}`,h:'#plan-'+s.id,b:'Review & launch'}));
  all.filter(s=>studyStatus(s)==='live').forEach(s=>{ const d=completedOf(s.id).length; if(d&&!s.synthesized_at) items.push({t:`${d} interviews ready to synthesise`,d:esc(s.title),h:'#live-'+s.id,b:'Open'}); });
  const recs = rows('Recommendation',r=>all.some(s=>s.id===r.study_id)&&r.workstream!=='research');
  const waiting = recs.filter(r=>r.status==='proposed'); const shipped = recs.filter(r=>r.status==='done');
  if(waiting.length){ const s=byId('Study',waiting[0].study_id); items.push({t:`${waiting.length} fixes waiting for a decision`,d:`${shipped.length} of ${recs.length} shipped so far`,h:'#actions-'+s.id,b:'Decide'}); }
  const pend = rows('Outcome',o=>o.current_value==null&&recs.some(r=>r.id===o.recommendation_id));
  if(pend.length){ const r=byId('Recommendation',pend[0].recommendation_id); items.push({t:`${pend.length} outcome${pend.length>1?'s':''} waiting to be measured`,d:esc(r.title),h:'#actions-'+r.study_id,b:'Measure'}); }
  if(!items.length) return '';
  return `<section class="stack" style="gap:10px"><h2>Pick up where you left off</h2><div class="grid g2">${items.slice(0,4).map(x=>`<a class="card row between card-link" href="${x.h}"><div style="min-width:0"><b>${x.t}</b><div class="small muted">${x.d}</div></div><span class="btn sm">${x.b} ${ic('right')}</span></a>`).join('')}</div></section>`;
}

// ---------- grouped navigation (chunking) ----------
function renderRail(){
  const v = ui.route.view; const live = wsStudies().filter(s=>studyStatus(s)==='live').length;
  const on = list => list.includes(v)?'on':'';
  const act = rows('Trigger',t=>t.workspace_id===ui.ws&&t.active).length;
  document.getElementById('rail').innerHTML = `
    <a class="brand" href="#home" style="text-decoration:none;color:inherit"><div class="logo">${ic('wave')}</div><b>Voqiva</b></a>
    <a class="nav ${on(['home'])}" href="#home">${ic('home')}Home</a>
    <span class="nav-group">Research</span>
    <a class="nav ${on(['studies','new','plan','live','report','actions'])}" href="#studies">${ic('folder')}Studies ${live?`<span class="count">${live} live</span>`:''}</a>
    <a class="nav ${on(['always'])}" href="#always">${ic('bolt')}Always-on ${act?`<span class="count">${act}</span>`:''}</a>
    <span class="nav-group">People</span>
    <a class="nav ${on(['participants'])}" href="#participants">${ic('users')}Customer circle <span class="count num">${circle(ui.ws).length}</span></a>
    <a class="nav ${on(['panel'])}" href="#panel">${ic('shield')}Voqiva panel <span class="count num">${rows('Person',p=>!p.cohort_import_id).length}</span></a>
    <span class="nav-group">Billing</span>
    <a class="nav ${on(['wallet'])}" href="#wallet">${ic('wallet')}Wallet &amp; plans <span class="count num">${inr(walletBalance(ui.ws))}</span></a>
    <div class="spacer"></div>
    <a class="nav ${on(['account'])}" href="#account">${ic('gear')}Settings</a>
    <a class="nav ${on(['help'])}" href="#help">${ic('help')}Help</a>`;
}

// ---------- Home ----------
function vHome(){
  const all = wsStudies(); const live = all.filter(s=>studyStatus(s)==='live');
  const imported = rows('Person',p=>p.cohort_import_id && rows('CohortImport',c=>c.id===p.cohort_import_id&&c.workspace_id===ui.ws).length);
  const circ = circle(ui.ws).length;
  const done = rows('Session',x=>x.ended_at&&all.some(s=>s.id===x.study_id));
  const verified = done.filter(x=>buyerStats(x.person_id)).length;
  const outs = rows('Outcome',o=>rows('Recommendation',r=>r.id===o.recommendation_id&&all.some(s=>s.id===r.study_id)).length);
  const worked = outs.filter(o=>(outcomeVerdict(o)||{}).k==='ok').length;
  const trig = rows('Trigger',t=>t.workspace_id===ui.ws&&t.active);
  return `
  <section class="stack" style="gap:4px"><h1>Namaste ${esc(me().full_name.split(' ')[0])}</h1>
    <p class="muted">${live.length} live ${live.length===1?'study':'studies'} · ${done.length} conversations so far · ${verified} matched to a real order.</p></section>
  ${checklistCard()}
  <section class="card hero stack" style="gap:14px;padding:28px">
    <h2 style="font-size:clamp(22px,2.6vw,30px)">What do you want to learn from your buyers?</h2>
    <form class="prompt-box" data-submit="home-ask">${ic('spark')}
      <input id="home-q" placeholder="e.g. Why are first-time buyers of our linen shirts not reordering within 60 days?" aria-label="Your research question">
      <button class="btn primary" type="submit">Start study ${ic('right')}</button></form>
    <div class="row" style="gap:8px"><span class="small muted">Try:</span>${rows('PromptTemplate',t=>t.placement==='home_suggestion').map(t=>`<button class="chip plain" data-act="try" data-id="${t.id}">${esc(t.label)}</button>`).join('')}</div>
    <span class="small muted">${freeLeft(ui.ws)} of ${FREE_QUOTA} free customer interviews left this month.</span>
  </section>
  ${continueCard()}
  <section class="grid g4">
    <a class="card kpi stack card-link" href="#participants"><span class="eyebrow">Customer circle</span><div class="big num">${circ}</div><span class="small muted">${imported.length?pct(circ/imported.length*100):'0%'} of ${imported.length} buyers opted in</span></a>
    <a class="card kpi stack card-link" href="#studies"><span class="eyebrow">Purchase-verified voices</span><div class="big num">${verified}</div><span class="small muted">of ${done.length} conversations</span></a>
    <a class="card kpi stack card-link" href="#studies"><span class="eyebrow">Proven fixes</span><div class="big num">${worked}<small>of ${outs.length} tracked</small></div><span class="small muted">moved a store metric</span></a>
    <a class="card kpi stack card-link" href="#always"><span class="eyebrow">Always-on</span><div class="big num">${trig.length}</div><span class="small muted">${trig.reduce((a,t)=>a+eligibleFor(t).length,0)} customers waiting to be heard</span></a>
  </section>
  ${studiesSection(true)}`;
}
function studyCard(s){
  const st = studyStatus(s); const h = '#'+routeFor(s);
  const head = `<div class="row between"><div class="row" style="gap:10px">${statusPill(s)}<span class="small muted">${esc(METHOD_LABEL[s.methodology]||'')}</span></div><span class="small muted">${st==='draft'?'Created '+ago(s.created_at):s.synthesized_at?'Synthesised '+ago(s.synthesized_at):'Updated '+ago(s.updated_at)}</span></div>
    <h3>${esc(s.title||'Untitled study')}</h3><p class="small muted">${audienceLine(s)}</p>`;
  let body='', cta='';
  if(s.synthesized_at){
    const recs = rows('Recommendation',r=>r.study_id===s.id&&r.workstream!=='research'); const shipped=recs.filter(r=>r.status==='done').length;
    body = `<div class="quote pos"><p>“${esc(s.headline)}”</p></div><div class="row small muted" style="gap:14px"><span>${completedOf(s.id).length} interviews</span><span>${shipped} of ${recs.length} fixes shipped</span></div>`;
    cta = 'View insights';
  } else if(st==='live'||st==='synthesizing'){
    const d = completedOf(s.id).length, l = sessionsOf(s.id).filter(x=>x.started_at&&!x.ended_at).length;
    body = `<div class="stack" style="gap:6px"><div class="row between small"><span>${d} of ${s.sample_size} interviews</span><span class="muted">${l} in progress</span></div><div class="bar"><i style="width:${Math.min(100,d/Math.max(1,s.sample_size)*100)}%"></i></div></div>`;
    cta = 'Open live monitor';
  } else {
    body = `<div class="row small muted" style="gap:14px"><span>${questionsOf(s.id).length} questions</span><span>${inr(studyBudget(s).total)} total</span><span>~${durTxt(estTurnaround(s.sample_size,s.max_duration_min))} to insights</span></div>`;
    cta = 'Review & launch';
  }
  return `<a class="card stack card-link" href="${h}">${head}${body}<span class="link small" style="align-self:flex-start">${cta} →</span></a>`;
}

// ---------- insights reveal (peak-end) ----------
function revealBlock(s){
  const th = rows('Theme',t=>t.study_id===s.id); const ver = th.filter(t=>t.evidence_level==='verified').length;
  const ev = rows('Evidence',e=>th.some(t=>t.id===e.theme_id)).length;
  return `<section class="reveal stack" role="status">
    <span class="pill solid" style="align-self:flex-start">${ic('spark')}Your insights are ready</span>
    <h1 class="reveal-h">${esc(s.headline)}</h1>
    <div class="row reveal-stats"><div><b class="num">${completedOf(s.id).length}</b><span>real conversations</span></div><div><b class="num">${ver}</b><span>verified themes</span></div><div><b class="num">${ev}</b><span>quoted clips</span></div></div>
    <div class="row"><button class="btn primary lg" data-act="reveal-close">See the evidence ${ic('right')}</button><a class="btn lg" href="#actions-${s.id}" data-act="reveal-done">Plan next steps</a></div>
  </section>`;
}

// ---------- loss aversion on always-on ----------
function lossBanner(){
  const bad = rows('Order',o=>o.workspace_id===ui.ws&&o.status!=='delivered');
  if(!bad.length) return '';
  const val = bad.reduce((a,o)=>a+o.value_inr,0);
  const heard = rows('Trigger',t=>t.workspace_id===ui.ws&&t.event==='return_or_rto').reduce((a,t)=>a+completedOf(t.study_id).length,0);
  return `<section class="card banner loss"><div><b style="font-size:17px">${inr(val)} of orders came back as returns or RTO</b><p class="small muted">${bad.length} orders in your Shopify history. You've heard from ${heard} of those customers so far. Every unheard return is a reason you can't fix.</p></div></section>`;
}

// ---------- actions progress (Zeigarnik) ----------
function actionsProgress(s){
  const recs = rows('Recommendation',r=>r.study_id===s.id&&r.workstream!=='research'); if(!recs.length) return '';
  const shipped = recs.filter(r=>r.status==='done').length, moving = recs.filter(r=>['adopted','in_progress'].includes(r.status)).length;
  return `<section class="card stack" style="gap:8px"><div class="row between"><b>${shipped} of ${recs.length} fixes shipped</b><span class="small muted">${moving} in progress · ${recs.length-shipped-moving} waiting for a decision</span></div><div class="bar ok"><i style="width:${shipped/recs.length*100}%"></i></div></section>`;
}

// ---------- mobile action bar (Fitts) ----------
function mobileCTA(label, href){ return `<div class="mcta"><a class="btn primary lg" href="${href}">${label}</a></div>`; }

// ---------- landing page ----------
function vWelcome(){
  const done = rows('Session',x=>x.ended_at);
  const own = done.filter(x=>{const st=byId('Study',x.study_id);return st&&st.audience_source!=='voqiva_panel';});
  const verified = own.filter(x=>buyerStats(x.person_id)).length;
  const studiesDone = rows('Study',s=>s.synthesized_at&&s.launched_at&&!isTriggerStudy(s));
  const tat = studiesDone.length? studiesDone.reduce((a,s)=>a+(T(s.synthesized_at)-T(s.launched_at)),0)/studiesDone.length/3600000 : 3.8;
  const tatTxt = Math.floor(tat)+'h '+String(Math.round((tat%1)*60)).padStart(2,'0')+'m';
  const wave = (n,on) => { let h='',sd=n*7; for(let i=0;i<34;i++){ sd=(sd*9301+49297)%233280; h+=`<i class="${i>=on?'off':''}" style="height:${5+Math.round(sd/233280*20)}px"></i>`; } return h; };
  const plan = p => `<div class="plan ${p.hl?'hl':''}">${p.hl?'<span class="tag">Most chosen</span>':''}
      <h3 style="font-size:20px">${p.name}</h3><p class="small muted" style="margin-top:4px">${p.sub}</p>
      <div class="price num">${p.price}<small>${p.per}</small></div>
      <ul>${p.feats.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>
      <button class="btn ${p.hl?'':''}" data-act="lp-jump" data-k="start">${p.cta}</button></div>`;
  return `<div class="lpx">
  <header><div class="wrap">
    <div class="brandx">${ic('wave')}Voqiva</div>
    <nav class="navx"><button data-act="lp-jump" data-k="how">How it works</button><button data-act="lp-jump" data-k="compare">Compare</button><button data-act="lp-jump" data-k="pricing">Pricing</button><button data-act="lp-demo">Sample report</button></nav>
    <div class="row" style="gap:20px"><button class="link hide-sm" style="color:var(--fg);font-weight:500" data-act="lp-demo">Sign in</button><button class="btn sm" style="border-color:var(--fg);height:40px" data-act="lp-jump" data-k="start">Get started</button></div>
  </div></header>

  <section class="wrap hero2">
    <div style="min-width:0">
      <span class="livechip"><i></i><b>Live</b> · ${done.length} buyer interviews in this workspace</span>
      <h1 class="big">Hear from your real buyers by tonight.</h1>
      <p class="lead">Ask a question in plain English. Voqiva interviews customers who actually bought from you over WhatsApp voice notes, pays them by UPI, and puts every answer next to their order.</p>
      <div class="ctas"><button class="btn lg" style="border-color:var(--fg);padding:0 24px" data-act="lp-jump" data-k="start">Run your first study free</button><button class="btn ghost lg" data-act="lp-demo">See a sample report</button></div>
      <dl><div><dt>Median first reply</dt><dd class="num">${tatTxt}</dd></div><div><dt>Answers tied to orders</dt><dd class="num">${own.length?Math.round(verified/own.length*100):100}%</dd></div><div><dt>Avg. cost per study</dt><dd class="num">₹2,000</dd></div></dl>
    </div>
    <div style="position:relative;min-width:0" aria-hidden="true">
      <div class="chat">
        <div class="chat-h"><div class="row" style="gap:12px;min-width:0"><span class="avatar" style="width:40px;height:40px;background:var(--accent-soft);color:var(--accent);font-weight:600">SI</span><div style="min-width:0"><div style="font-weight:500">Sneha Iyer</div><div class="small muted">Pune · first-time buyer</div></div></div><span class="pill buy">${ic('check')}Bought 12 Nov · ₹1,899</span></div>
        <div class="chat-b">
          <span class="day">Today</span>
          <div class="in">Hi Sneha, thanks for buying the Kumkumadi Night Serum from Rasa Botanicals. Could you share in a voice note why you haven’t reordered yet? We’ll send ₹150 to your UPI as thanks.<span class="time">6:02 pm</span></div>
          <div class="out"><div class="row" style="gap:12px;flex-wrap:nowrap"><button class="play" tabindex="-1">${ic('play')}</button><div class="wave">${wave(3,22)}</div></div><div class="row between small muted" style="margin-top:4px"><span class="num">0:42</span><span>6:19 pm <span style="color:#53BDEB">✓✓</span></span></div></div>
          <div class="tr">“It finished in five weeks and I just… forgot. Nobody reminded me, and full price felt steep after the first-order discount.”</div>
          <div class="in">Thank you, that’s really helpful. ₹150 sent to sneha@okaxis<span class="time">6:20 pm</span></div>
        </div>
      </div>
      <div class="themechip"><div class="row between small"><span class="eyebrow" style="letter-spacing:.06em">Theme found</span><span class="small" style="color:var(--ok);font-weight:500">● Ready</span></div><div style="font-weight:600;margin-top:8px;line-height:1.35">Serum runs out before anyone reminds them</div><div class="bar" style="margin-top:12px"><i style="width:38%"></i></div><div class="small muted" style="margin-top:8px">14 of 37 verified buyers · 38%</div></div>
    </div>
  </section>

  <div class="band"><div class="wrap trust"><span style="color:var(--fg);font-weight:500">Built for Indian D2C</span><span>${ic('store')}Shopify orders</span><span>${ic('chat')}WhatsApp Business API</span><span>${ic('rupee')}UPI payouts in minutes</span><span>${ic('shield')}DPDP-ready consent</span></div></div>

  <section id="lp-compare" class="wrap pad">
    <span class="kick">Agency vs Voqiva</span>
    <h2 class="sec">An agency sends a deck in six weeks. Voqiva brings you your buyers’ voices tonight.</h2>
    <div class="card" style="margin-top:48px;padding:0;overflow-x:auto"><table class="cmp"><thead><tr><th style="width:28%"></th><th>Research agency</th><th style="color:var(--fg)">Voqiva</th></tr></thead><tbody>
      ${[['Time to first insight','3–6 weeks','Same day'],['Cost','₹3,00,000–₹8,00,000 per project','₹2,000 per study'],['Who you hear from','Recruited panel, may never have bought','Your own verified buyers'],['Evidence','Summary slides','Every quote linked to an order or return'],['After the report','Engagement ends','Tracks repeat rate, returns and AOV']].map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td><span class="tick">✓</span>${r[2]}</td></tr>`).join('')}
    </tbody></table></div>
  </section>

  <section id="lp-how" class="band"><div class="wrap pad">
    <span class="kick">How it works</span>
    <h2 class="sec">From question to fix in three steps</h2>
    <p class="lead" style="margin-top:16px">No surveys to write, no panels to recruit. You bring the question; your customers bring the answers.</p>
    <div class="steps">
      <div class="step"><span class="n">01</span><h3>Ask in plain English</h3><p class="muted">“Why aren’t first-time buyers reordering?” Voqiva drafts the interview and picks the right buyers from your orders.</p><div class="mini">${ic('search')}Why aren’t first-time buyers reordering?</div></div>
      <div class="step"><span class="n">02</span><h3>Buyers reply on WhatsApp</h3><p class="muted">Customers answer in voice notes, in their own time, and get paid by UPI the moment they finish.</p><div class="mini" style="background:var(--wa-out);border-color:transparent"><button class="play" tabindex="-1" style="width:28px;height:28px">${ic('play')}</button><div class="wave" style="height:20px">${wave(5,18).replace(/height:(\d+)px/g,(m,h)=>'height:'+Math.round(h*0.7)+'px')}</div><span class="num small">0:38</span></div></div>
      <div class="step"><span class="n">03</span><h3>Get themes, fixes and results</h3><p class="muted">Answers are grouped into evidence-backed themes, turned into fixes, then tracked against repeat rate, returns and order value.</p><div class="mini between"><span>Repeat rate</span><span class="num"><s class="faint">18.0%</s> <b style="color:var(--ok)">24.5%</b></span></div></div>
    </div>
  </div></section>

  <section id="lp-pricing" class="wrap pad">
    <span class="kick">Pricing</span>
    <h2 class="sec">Pay per study, or go unlimited</h2>
    <p class="lead" style="margin-top:16px">Customer incentives are paid at cost via UPI. No setup fees, cancel anytime.</p>
    <div class="plans">${PLANS.map(plan).join('')}</div>
  </section>

  <section id="lp-start" class="band"><div class="wrap pad su">
    <div style="min-width:0">
      <h2 class="sec" style="margin-top:0">Ask your first question today. Read the answers tonight.</h2>
      <p class="lead">Connect your store and WhatsApp Business in under 10 minutes. Your first study with 5 interviews is free.</p>
      <figure style="margin:40px 0 0;border-left:2px solid var(--line);padding-left:20px">
        <blockquote style="margin:0;font-family:var(--display);font-size:20px;line-height:1.45">“We thought price was the problem. Thirty buyers told us it was the reminder. Repeat rate went up 6.5 points in a month.”</blockquote>
        <figcaption class="row" style="gap:12px;margin-top:16px"><span class="avatar" style="width:40px;height:40px">AM</span><div><div style="font-weight:500">Aarav Mehta</div><div class="small muted">Founder, Rasa Botanicals · sample testimonial</div></div></figcaption>
      </figure>
    </div>
    <form class="box" data-submit="signup">
      <div><label class="lb" for="su-email">Work email</label><input class="field" id="su-email" type="email" required autocomplete="email" placeholder="you@brand.in"></div>
      <div><label class="lb" for="su-brand">Brand name</label><input class="field" id="su-brand" required placeholder="e.g. Rasa Botanicals"></div>
      <div><label class="lb" for="su-name">Your name</label><input class="field" id="su-name" required autocomplete="name" placeholder="e.g. Tanu Dewani"></div>
      <div><label class="lb" for="su-orders">Monthly orders</label><select class="field" id="su-orders"><option>Under 1,000</option><option selected>1,000–10,000</option><option>10,000–50,000</option><option>50,000+</option></select></div>
      <div class="full"><label class="lb" for="su-store">Store URL</label><div class="pre"><span>https://</span><input id="su-store" placeholder="yourbrand.in" autocomplete="url"></div></div>
      <div class="full"><label class="lb" for="su-wa">WhatsApp number</label><div class="pre"><span>+91</span><input id="su-wa" inputmode="tel" placeholder="98765 43210" autocomplete="tel-national"></div></div>
      <label class="full row" style="gap:12px;align-items:flex-start;font-size:14px;color:var(--muted);flex-wrap:nowrap"><input type="checkbox" id="su-dpdp" required style="width:18px;height:18px;margin-top:2px;accent-color:var(--accent);flex:none">I confirm customers will be contacted only with consent, per Voqiva’s DPDP policy.</label>
      <div class="full"><button class="btn primary lg" type="submit" style="width:100%">Create free account</button><p class="small muted" style="text-align:center;margin-top:12px">No card needed · First study free · Prototype: nothing leaves this browser</p></div>
    </form>
  </div></section>

  <footer><div class="wrap row between" style="flex-wrap:wrap;gap:16px"><div class="brandx" style="font-size:18px">${ic('wave')}Voqiva</div><div class="row" style="gap:24px"><button class="link small" style="color:var(--muted)" data-act="lp-demo">Open the demo workspace</button><span>Privacy</span><span>DPDP consent</span><span>Terms</span></div><span>© ${new Date().getFullYear()} Voqiva · prototype</span></div></footer>
  </div>`;
}
