// =====================================================================
// v7 — PRD v1: Decide (ranked options + decision log), Launch brief,
// Ops console, Panelist app preview (coins + redemption), proof-of-purchase
// and competitor screens, 7-step loop, D2C-first pricing and copy.
// Recommendation.{decision_reason, decided_at, decided_by}; status adds parked | rejected
// Study.brief_generated_at; Session.quality_override; Person.attributes.coins_redeemed
// =====================================================================
VIEWS.push('decide','brief','ops','decisions','panelist');
var EXTRA_VIEWS = {decide:s=>vDecide(s), brief:s=>vBrief(s), ops:()=>vOps(), decisions:()=>vDecisions(), panelist:()=>vPanelist()};
I.doc = '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7M9 16h7"/>';
I.scale = '<path d="M12 4v16M5 20h14M4 9l3-5 3 5a3 3 0 0 1-6 0zM14 9l3-5 3 5a3 3 0 0 1-6 0zM7 4h10"/>';
I.phone = '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>';
I.gift = '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M3 9h18M12 9v11M12 9c-2 0-4-1-4-3s3-2 4 3c1-5 4-5 4-3s-2 3-4 3"/>';

// ---------- pricing: D2C-first ----------
(function(){
  PLANS.length = 0;
  PLANS.push(
    {k:'free',name:'Free',price:'₹0',line:`${FREE_QUOTA} interviews a month with your own opted-in customers. Try the full loop before you pay.`},
    {k:'sprint',name:'Voqiva Sprint',price:'₹49,000 per sprint',line:'Done for you: 20 verified interviews, insight report, ranked decisions and a launch brief in 72 hours.'},
    {k:'retainer',name:'Always-on',price:'₹50,000 a month',line:'A Sprint every month, always-on triggers on returns and lapses, and outcome tracking on every fix.'},
    {k:'always',name:'Growth (self-serve)',price:'₹14,999 a month',line:'Run studies yourself: audience builder, rewards, decide and brief, team seats.'},
    {k:'payg',name:'Pay per interview',price:'From ₹180',line:'All-in per completed interview: reward, AI and UPI payout. Failed quality checks replaced free.'}
  );
})();

// ---------- 7-step loop ----------
const STEPS7 = [['ask','Ask'],['review','Review'],['live','Talk'],['insights','Insights'],['decide','Decide'],['brief','Brief'],['act','Measure']];
function decidedRecs(sid){ return rows('Recommendation',r=>r.study_id===sid&&r.decided_at); }
function acceptedRecs(sid){ return rows('Recommendation',r=>r.study_id===sid&&['adopted','in_progress','done'].includes(r.status)&&r.workstream!=='research'); }
studyStepper = function(s, cur){
  const st = s ? studyStatus(s) : 'new';
  let reached = !s ? 0 : st==='draft' ? 1 : s.synthesized_at ? 3 : 2;
  if (s && s.synthesized_at && decidedRecs(s.id).length) reached = 4;
  if (s && s.brief_generated_at) reached = 5;
  if (s && rows('Outcome',o=>rows('Recommendation',r=>r.id===o.recommendation_id&&r.study_id===s.id).length).length) reached = 6;
  const ok = s && s.synthesized_at;
  const href = {review:s&&st==='draft'?'#plan-'+s.id:null, live:s&&s.launched_at?'#live-'+s.id:null, insights:ok?'#report-'+s.id:null, decide:ok?'#decide-'+s.id:null, brief:ok&&acceptedRecs(s.id).length?'#brief-'+s.id:null, act:ok?'#actions-'+s.id:null};
  const curI = STEPS7.findIndex(x=>x[0]===cur);
  return `<nav class="stepper-nav" aria-label="Study progress"><span class="small muted">Step ${curI+1} of ${STEPS7.length}</span><ol>${STEPS7.map(([k,l],i)=>{
    const state = i===curI?'cur':i<=reached?'done':'todo';
    const inner = `<span class="sn">${state==='done'&&i!==curI?ic('check'):i+1}</span>${l}`;
    return `<li class="${state}">${href[k]&&i!==curI?`<a href="${href[k]}">${inner}</a>`:`<span>${inner}</span>`}</li>`; }).join('')}</ol></nav>`;
};

// ---------- rail ----------
renderRail = function(){
  const v = ui.route.view; const live = wsStudies().filter(s=>studyStatus(s)==='live').length;
  const on = list => list.includes(v)?'on':'';
  const act = rows('Trigger',t=>t.workspace_id===ui.ws&&t.active).length;
  const dec = rows('Recommendation',r=>r.decided_at&&wsStudies().some(s=>s.id===r.study_id)).length;
  const due = opsQueue().filter(o=>o.flagged.length||o.dueH<24).length;
  document.getElementById('rail').innerHTML = `
    <a class="brand" href="#home" style="text-decoration:none;color:inherit"><div class="logo">V</div><b>Voqiva</b></a>
    <a class="nav ${on(['home'])}" href="#home">${ic('home')}Home</a>
    <span class="nav-group">Research</span>
    <a class="nav ${on(['studies','new','plan','live','report','actions','decide','brief'])}" href="#studies">${ic('folder')}Studies ${live?`<span class="count">${live} live</span>`:''}</a>
    <a class="nav ${on(['decisions'])}" href="#decisions">${ic('scale')}Decisions ${dec?`<span class="count num">${dec}</span>`:''}</a>
    <a class="nav ${on(['always'])}" href="#always">${ic('bolt')}Always-on ${act?`<span class="count">${act}</span>`:''}</a>
    <span class="nav-group">People</span>
    <a class="nav ${on(['participants'])}" href="#participants">${ic('users')}Customer circle <span class="count num">${circle(ui.ws).length}</span></a>
    <a class="nav ${on(['panel'])}" href="#panel">${ic('shield')}Voqiva panel <span class="count num">${rows('Person',p=>!p.cohort_import_id).length}</span></a>
    <a class="nav ${on(['panelist'])}" href="#panelist">${ic('phone')}Panelist app</a>
    <span class="nav-group">Voqiva team</span>
    <a class="nav ${on(['ops'])}" href="#ops">${ic('gear')}Ops console ${due?`<span class="count num">${due}</span>`:''}</a>
    <span class="nav-group">Billing</span>
    <a class="nav ${on(['wallet'])}" href="#wallet">${ic('wallet')}Wallet &amp; plans <span class="count num">${inr(walletBalance(ui.ws))}</span></a>
    <div class="spacer"></div>
    <a class="nav ${on(['account'])}" href="#account">${ic('gear')}Settings</a>
    <a class="nav ${on(['help'])}" href="#help">${ic('help')}Help</a>`;
};

// ---------- Report → Decide hand-off ----------
const _vReport7 = vReport;
vReport = function(s){
  const h = _vReport7(s); if (!s.synthesized_at) return h;
  const opts = rankedOptions(s); const undecided = opts.filter(o=>!o.r.decided_at).length;
  const cta = `<section class="card row between" style="border-top:3px solid var(--gold);gap:12px"><div><b>${undecided?`${opts.length} options are ready to decide on`:'All options decided'}</b><div class="small muted">${undecided?`Ranked by evidence. Top pick: “${esc(opts[0].r.title)}”.`:'Your launch brief is ready to generate.'}</div></div><a class="btn primary" href="#${undecided?'decide':'brief'}-${s.id}">${undecided?'Decide what to do':'Open launch brief'} ${ic('right')}</a></section>`;
  const i = h.indexOf('</nav>'); return i<0 ? cta+h : h.slice(0,i+6)+cta+h.slice(i+6);
};
const _vActions7 = vActions;
vActions = function(s){ return _vActions7(s).replace('<h1>Recommended next steps</h1>','<h1>Measure what you shipped</h1>').replace('Action plan &amp; follow-up experiments','Measure'); };

// ---------- Decide ----------
function rankedOptions(s){
  const N = Math.max(1, completedOf(s.id).length);
  return rows('Recommendation',r=>r.study_id===s.id&&r.workstream!=='research').map(r=>{
    const th = r.theme_id ? byId('Theme', r.theme_id) : null;
    const sup = th && th.supporting_session_ids ? th.supporting_session_ids : [];
    const share = Math.round(sup.length/N*100);
    const verified = th && th.evidence_level==='verified';
    const ltv = sup.map(id=>byId('Session',id)).filter(Boolean).reduce((a,x)=>{ const b=buyerStats(x.person_id); return a+(b?b.ltv:0); },0);
    const quotes = th ? rows('Evidence',e=>e.theme_id===th.id).sort((a,b)=>(b.is_featured?1:0)-(a.is_featured?1:0)).slice(0,2) : [];
    const proj = rows('Metric',m=>m.recommendation_id===r.id);
    const impactW = {high:15,medium:8,low:3}[r.impact]||8, effortW = {low:8,medium:4,high:0}[r.effort]||4;
    const score = Math.min(99, Math.round(share*0.7 + (verified?12:0) + impactW + effortW));
    return {r, th, sup, share, verified, ltv, quotes, proj, score, N};
  }).sort((a,b)=>b.score-a.score);
}
const DEC = {adopted:['Accepted','ok'], in_progress:['Accepted · in progress','ok'], done:['Accepted · shipped','ok'], parked:['Parked','warn'], rejected:['Rejected','bad']};
function decisionPill(r){ const d = DEC[r.status]; return d ? `<span class="pill ${d[1]}">${d[0]}</span>` : `<span class="pill">Not decided</span>`; }
function optionCard(s, o, i){
  const r = o.r; const open = ui.decideOpen && ui.decideOpen.id===r.id ? ui.decideOpen.to : null;
  const risk = o.proj.find(m=>m.participant_count==null) || o.proj[0];
  return `<article class="card stack" style="gap:12px;${i===0&&!r.decided_at?'border-top:3px solid var(--accent)':''}">
    <div class="row between" style="align-items:flex-start"><div class="row" style="gap:10px;align-items:flex-start;flex-wrap:nowrap"><span class="num" style="font-family:var(--display);font-size:26px;font-weight:600;color:${i===0?'var(--accent)':'var(--faint)'};line-height:1">#${i+1}</span>
      <div><div class="row" style="gap:8px"><span class="pill">${WS_LABEL[r.workstream]||'Product'}</span>${i===0?'<span class="pill acc">Voqiva recommends</span>':''}${o.verified?'<span class="pill ok">Verified evidence</span>':'<span class="pill hyp">Emerging · hypothesis</span>'}</div>
      <h3 style="margin-top:6px">${esc(r.title)}</h3></div></div>${decisionPill(r)}</div>
    <div class="grid g3" style="gap:8px">
      <div class="well"><div class="eyebrow">Evidence</div><b class="num">${o.sup.length} of ${o.N} people</b><div class="bar" style="margin-top:6px"><i style="width:${o.share}%"></i></div><div class="small muted">${o.share}% raised it unprompted</div></div>
      <div class="well"><div class="eyebrow">${o.ltv?'Revenue behind it':'Evidence score'}</div><b class="num">${o.ltv?inr(o.ltv):o.score+'/100'}</b><div class="small muted">${o.ltv?'lifetime spend of the buyers who raised it':'share, strength, impact and effort'}</div></div>
      <div class="well"><div class="eyebrow">Cost of ignoring it</div><b class="small">${risk?esc(risk.label)+': '+fmtMetric(risk):'The issue stays with '+o.share+'% of buyers'}</b><div class="small muted">${risk&&risk.participant_count==null?'Projection, not measured':'From interviews'}</div></div>
    </div>
    ${o.quotes.length?`<div class="stack" style="gap:6px">${o.quotes.map(q=>{ const x=byId('Session',q.session_id); const p=x&&byId('Person',x.person_id); return `<div class="quote"><p>“${esc(q.quote.slice(0,220))}${q.quote.length>220?'…':''}”</p><span class="small muted">${p?esc(shortName(p.full_name))+(p.city?' · '+esc(p.city):''):''}</span></div>`; }).join('')}</div>`:''}
    <p class="small muted">${esc((r.body_md||'').replace(/\*\*/g,'').slice(0,260))}</p>
    ${r.decided_at?`<div class="well small row between"><span><b>${DEC[r.status]?DEC[r.status][0]:'Decided'}</b> by ${esc(r.decided_by||'you')} on ${new Date(r.decided_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}${r.decision_reason?' · “'+esc(r.decision_reason)+'”':''}</span><button class="link small" data-act="dec-undo" data-id="${r.id}">Change</button></div>`
    : open ? `<form class="well row" data-submit="dec-save" data-id="${r.id}" data-to="${open}" style="align-items:flex-end;gap:8px"><div style="flex:1;min-width:220px"><label class="lbl" for="dec-reason">${open==='adopted'?'Why accept? (optional)':'Why? (required, so the team remembers)'}</label><input class="field" id="dec-reason" ${open==='adopted'?'':'required'} placeholder="${open==='adopted'?'e.g. Strong evidence, cheap to test':open==='parked'?'e.g. Revisit after Diwali sale':'e.g. Too costly for the evidence we have'}"></div><button class="btn primary" type="submit">Confirm ${open==='adopted'?'accept':open==='parked'?'park':'reject'}</button><button class="btn" type="button" data-act="dec-cancel">Cancel</button></form>`
    : `<div class="row" style="gap:8px"><button class="btn primary sm" data-act="dec-open" data-id="${r.id}" data-to="adopted">${ic('check')}Accept</button><button class="btn sm" data-act="dec-open" data-id="${r.id}" data-to="parked">Park</button><button class="btn sm" data-act="dec-open" data-id="${r.id}" data-to="rejected">${ic('x')}Reject</button></div>`}
  </article>`;
}
function vDecide(s){
  if (!s.synthesized_at) return `<div class="empty">Options appear once interviews are synthesised. <a href="#live-${s.id}">Open the live study</a></div>`;
  const opts = rankedOptions(s); const acc = acceptedRecs(s.id).length; const dec = opts.filter(o=>o.r.decided_at).length;
  return `<div class="crumbs"><a href="#report-${s.id}">${ic('left').replace('<svg','<svg style="width:15px"')} Insights report</a><span>/</span><b>Decide</b></div>
  ${studyStepper(s,'decide')}
  <section class="row between" style="align-items:flex-end;gap:12px"><div class="stack" style="gap:6px"><h1>What should you do?</h1><p class="muted" style="max-width:72ch">${opts.length} options from “${esc(s.title)}”, ranked by how many people raised them, how strong the evidence is, and the likely impact and effort. Accept, park or reject each one with a reason.</p></div>
    <div class="stack" style="gap:6px;align-items:flex-end"><span class="small muted">${dec} of ${opts.length} decided · ${acc} accepted</span><a class="btn ${acc?'primary':''}" href="#brief-${s.id}" ${acc?'':'aria-disabled="true" style="pointer-events:none;opacity:.5"'}>${ic('doc')}Create launch brief</a></div></section>
  <div class="well small" style="background:var(--accent-soft)"><b>The question:</b> ${esc(s.objective)}</div>
  <div class="stack" style="gap:14px">${opts.map((o,i)=>optionCard(s,o,i)).join('')}</div>
  ${acc?mobileCTA('Create launch brief','#brief-'+s.id):''}`;
}

// ---------- Launch brief ----------
function briefModel(s){
  const opts = rankedOptions(s); const acc = opts.filter(o=>['adopted','in_progress','done'].includes(o.r.status));
  const other = opts.filter(o=>['parked','rejected'].includes(o.r.status));
  const N = completedOf(s.id).length; const verifiedN = completedOf(s.id).filter(x=>{ const q=qualityOf(x); return q&&!q.rejected; }).length;
  const follow = rows('Recommendation',r=>r.study_id===s.id&&r.workstream==='research');
  const measure = []; acc.forEach(o=>o.proj.filter(m=>m.participant_count==null).forEach(m=>measure.push(m.label+' (projected '+fmtMetric(m)+')')));
  if (!measure.length) measure.push('Repeat rate of first-time buyers, 30 days after launch','Return rate on the changed products');
  return {opts, acc, other, N, verifiedN, follow, measure};
}
function briefMarkdown(s){
  const b = briefModel(s); const ws = byId('Workspace', s.workspace_id);
  const L = [];
  L.push(`# Launch brief: ${s.title}`, '', `${ws.name} · ${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})} · Prepared with Voqiva`, '');
  L.push('## Decision', ...b.acc.map(o=>`- **${o.r.title}** (${WS_LABEL[o.r.workstream]||'Product'})${o.r.decision_reason?' — '+o.r.decision_reason:''}`), '');
  L.push('## Why', s.headline||'', '', s.summary||'', '');
  L.push('## Who we asked', `${b.N} completed interviews (${b.verifiedN} passed every quality check). ${audienceLine(s)}.`, '');
  L.push('## Evidence');
  b.acc.forEach(o=>{ L.push(`### ${o.r.title}`, `${o.sup.length} of ${o.N} people (${o.share}%) raised this. ${o.verified?'Verified evidence.':'Emerging: treat as a hypothesis.'}`); o.quotes.forEach(q=>L.push(`> “${q.quote}”`)); L.push(''); });
  L.push('## What to change');
  ['product','pricing','gtm'].forEach(k=>{ const os=b.acc.filter(o=>o.r.workstream===k); if(!os.length) return; L.push(`### ${{product:'Product and pack',pricing:'Price',gtm:'Go-to-market and claims'}[k]}`); os.forEach(o=>L.push(`- ${o.r.title}: ${(o.r.body_md||'').replace(/\n+/g,' ')}`)); });
  L.push('', '## What to measure', ...b.measure.map(m=>`- ${m}`), '');
  if (b.other.length) L.push('## Parked and rejected', ...b.other.map(o=>`- ${DEC[o.r.status][0]}: ${o.r.title}${o.r.decision_reason?' — '+o.r.decision_reason:''}`), '');
  if (b.follow.length) L.push('## Open questions for the next study', ...b.follow.map(r=>`- ${r.title}`), '');
  return L.join('\n');
}
function vBrief(s){
  if (!s.synthesized_at) return `<div class="empty">The brief comes after insights and decisions. <a href="#live-${s.id}">Open the live study</a></div>`;
  const b = briefModel(s);
  if (!b.acc.length) return `<div class="crumbs"><a href="#decide-${s.id}">${ic('left').replace('<svg','<svg style="width:15px"')} Decide</a></div>${studyStepper(s,'brief')}<div class="card empty stack" style="gap:10px;align-items:center"><b>Accept at least one option to create the brief.</b><a class="btn primary" href="#decide-${s.id}">Go to Decide ${ic('right')}</a></div>`;
  if (!s.brief_generated_at){ s.brief_generated_at = iso(Date.now()); save(); }
  const ws = byId('Workspace', s.workspace_id);
  const sec = (t, body) => `<section class="stack" style="gap:8px"><h2 style="font-size:20px">${t}</h2>${body}</section>`;
  return `<div class="crumbs no-print"><a href="#decide-${s.id}">${ic('left').replace('<svg','<svg style="width:15px"')} Decide</a><span>/</span><b>Launch brief</b></div>
  <div class="no-print">${studyStepper(s,'brief')}</div>
  <div class="row between no-print" style="gap:8px"><span class="small muted">Built from ${b.acc.length} accepted ${b.acc.length===1?'option':'options'} and ${b.N} interviews. Ready to share with your product, marketing and ops teams.</span>
    <div class="row" style="gap:8px"><button class="btn sm" data-act="brief-copy" data-id="${s.id}">${ic('copy')}Copy</button><button class="btn sm" data-act="brief-md" data-id="${s.id}">${ic('down')}Markdown</button><button class="btn sm primary" data-act="brief-print">${ic('doc')}Save as PDF</button></div></div>
  <article class="card stack brief-doc" style="gap:22px;padding:36px;max-width:860px">
    <div class="stack" style="gap:6px"><span class="eyebrow" style="color:var(--accent)">Launch brief</span><h1 style="font-size:clamp(26px,3vw,34px)">${esc(s.title)}</h1><span class="small muted">${esc(ws.name)} · ${new Date(s.brief_generated_at).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})} · Prepared with Voqiva</span></div>
    ${sec('Decision', `<ul class="stack" style="gap:6px;margin:0;padding-left:18px">${b.acc.map(o=>`<li><b>${esc(o.r.title)}</b> <span class="small muted">(${WS_LABEL[o.r.workstream]||'Product'})</span>${o.r.decision_reason?` <span class="small muted">— ${esc(o.r.decision_reason)}</span>`:''}</li>`).join('')}</ul>`)}
    ${sec('Why', `<p style="font-family:var(--display);font-size:18px">${esc(s.headline||'')}</p><p class="muted">${esc(s.summary||'')}</p>`)}
    ${sec('Who we asked', `<p>${b.N} completed interviews, ${b.verifiedN} passed every quality check. ${esc(audienceLine(s))}.</p>`)}
    ${sec('Evidence', b.acc.map(o=>`<div class="stack" style="gap:6px"><b>${esc(o.r.title)}</b><span class="small muted">${o.sup.length} of ${o.N} people (${o.share}%) raised this · ${o.verified?'verified evidence':'emerging, treat as a hypothesis'}</span>${o.quotes.map(q=>`<div class="quote"><p>“${esc(q.quote)}”</p></div>`).join('')}</div>`).join(''))}
    ${sec('What to change', ['product','pricing','gtm'].map(k=>{ const os=b.acc.filter(o=>o.r.workstream===k); if(!os.length) return ''; return `<div class="stack" style="gap:4px"><span class="eyebrow">${{product:'Product and pack',pricing:'Price',gtm:'Go-to-market and claims'}[k]}</span>${os.map(o=>`<div class="well small"><b>${esc(o.r.title)}</b><div>${mdLite(o.r.body_md||'')}</div></div>`).join('')}</div>`; }).join(''))}
    ${sec('What to measure', `<ul style="margin:0;padding-left:18px">${b.measure.map(m=>`<li>${esc(m)}</li>`).join('')}</ul><a class="btn sm no-print" style="align-self:flex-start" href="#actions-${s.id}">Set up outcome tracking ${ic('right')}</a>`)}
    ${b.other.length?sec('Parked and rejected', `<ul style="margin:0;padding-left:18px">${b.other.map(o=>`<li>${DEC[o.r.status][0]}: ${esc(o.r.title)}${o.r.decision_reason?` <span class="muted">— ${esc(o.r.decision_reason)}</span>`:''}</li>`).join('')}</ul>`):''}
    ${b.follow.length?sec('Open questions for the next study', `<ul style="margin:0;padding-left:18px">${b.follow.map(r=>`<li>${esc(r.title)}</li>`).join('')}</ul>`):''}
  </article>`;
}

// ---------- Decision log ----------
function vDecisions(){
  const recs = rows('Recommendation',r=>r.decided_at&&wsStudies().some(s=>s.id===r.study_id)).sort((a,b)=>T(b.decided_at)-T(a.decided_at));
  const pending = wsStudies().filter(s=>s.synthesized_at&&rows('Recommendation',r=>r.study_id===s.id&&r.workstream!=='research'&&!r.decided_at).length);
  return `<section class="stack" style="gap:4px"><h1>Decisions</h1><p class="muted">Every option your team accepted, parked or rejected, with the reason and the evidence behind it.</p></section>
  ${pending.length?`<section class="card stack" style="gap:8px;border-top:3px solid var(--gold)"><b>Waiting for a decision</b>${pending.map(s=>`<a class="row between card-link" style="padding:10px 0;text-decoration:none;color:inherit" href="#decide-${s.id}"><span>${esc(s.title)}</span><span class="small muted">${rows('Recommendation',r=>r.study_id===s.id&&r.workstream!=='research'&&!r.decided_at).length} options ${ic('right').replace('<svg','<svg style="width:14px;vertical-align:-2px"')}</span></a>`).join('')}</section>`:''}
  ${recs.length?`<div class="card" style="padding:0;overflow-x:auto"><table class="tbl" style="width:100%;min-width:720px;border-collapse:collapse"><thead><tr><th>Date</th><th>Decision</th><th>Option</th><th>Study</th><th>Reason</th><th>By</th></tr></thead><tbody>${recs.map(r=>{ const s=byId('Study',r.study_id); return `<tr><td class="small num">${new Date(r.decided_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</td><td>${decisionPill(r)}</td><td><b>${esc(r.title)}</b></td><td class="small"><a href="#decide-${s.id}">${esc(s.title)}</a></td><td class="small muted">${esc(r.decision_reason||'—')}</td><td class="small">${esc(r.decided_by||'')}</td></tr>`; }).join('')}</tbody></table></div>`
  :`<div class="card empty">No decisions yet. Open a finished study and decide on its options.</div>`}`;
}

// ---------- Ops console (Voqiva team) ----------
function opsQueue(){
  return rows('Study',s=>s.launched_at&&!isTriggerStudy(s)&&!s.brief_generated_at).map(s=>{
    const due = T(s.launched_at) + 72*3600000; const dueH = Math.round((due-Date.now())/3600000);
    const done = completedOf(s.id); const flagged = done.filter(x=>{ const q=qualityOf(x); return q&&q.rejected; });
    const stage = !s.synthesized_at ? (done.length>=s.sample_size?'Ready to synthesise':'Fieldwork') : !acceptedRecs(s.id).length ? 'Waiting for client decision' : 'Brief to send';
    return {s, dueH, done, flagged, stage, ws: byId('Workspace', s.workspace_id)};
  }).sort((a,b)=>a.dueH-b.dueH);
}
const _qo7 = qualityOf;
qualityOf = function(x){ const q = _qo7(x); if (q && x.quality_override==='accepted') { q.rejected = false; q.override = true; } return q; };
function vOps(){
  const q = opsQueue();
  const kpi = (l,v,sub) => `<div class="card kpi stack"><span class="eyebrow">${l}</span><div class="big num">${v}</div><span class="small muted">${sub}</span></div>`;
  return `<section class="stack" style="gap:4px"><div class="row" style="gap:8px"><h1>Ops console</h1><span class="pill acc">Voqiva team only</span></div><p class="muted">Every live Sprint against its 72-hour promise. Review flagged interviews, then send the brief.</p></section>
  <section class="grid g4">${kpi('Active studies',q.length,'launched, brief not sent')}${kpi('Due in 24 hours',q.filter(o=>o.dueH<24).length,'against the 72-hour promise')}${kpi('Flagged interviews',q.reduce((a,o)=>a+o.flagged.length,0),'failed quality, need a look')}${kpi('Waiting on clients',q.filter(o=>o.stage==='Waiting for client decision').length,'insights sent, no decision yet')}</section>
  ${q.length?q.map(o=>`<section class="card stack" style="gap:10px">
    <div class="row between" style="gap:8px"><div><div class="row" style="gap:8px"><b style="font-family:var(--display);font-size:18px">${esc(o.s.title)}</b><span class="pill">${esc(o.ws.name)}</span></div><span class="small muted">${o.done.length} of ${o.s.sample_size} interviews · ${esc(o.stage)}</span></div>
      <span class="pill ${o.dueH<0?'bad':o.dueH<24?'warn':'ok'}">${o.dueH<0?`${-o.dueH}h overdue`:`${o.dueH}h left`}</span></div>
    <div class="bar ${o.done.length>=o.s.sample_size?'ok':''}"><i style="width:${Math.min(100,o.done.length/Math.max(1,o.s.sample_size)*100)}%"></i></div>
    ${o.flagged.length?`<div class="stack" style="gap:6px"><span class="eyebrow">Flagged by quality checks</span>${o.flagged.map(x=>{ const p=byId('Person',x.person_id); const qq=qualityOf(x); return `<div class="well row between small" style="gap:8px"><span><b>${esc(shortName(p.full_name))}</b> · quality ${qq.score}/100 · ${qq.checks.filter(c=>!c[1]).map(c=>esc(FAIL_WORDS[c[0]]||c[0])).join(', ')||'thin, low-detail answers'}</span><span class="row" style="gap:6px"><button class="btn sm" data-act="ops-accept" data-id="${x.id}">Accept anyway</button><span class="small muted">or leave it replaced</span></span></div>`; }).join('')}</div>`:''}
    <div class="row" style="gap:8px">${!o.s.synthesized_at?`<a class="btn sm" href="#live-${o.s.id}">Open fieldwork</a>`:`<a class="btn sm" href="#report-${o.s.id}">Review insights</a><a class="btn sm" href="#decide-${o.s.id}">Decisions</a>${acceptedRecs(o.s.id).length?`<a class="btn sm primary" href="#brief-${o.s.id}">${ic('doc')}Finish brief</a>`:''}`}</div>
  </section>`).join(''):`<div class="card empty">No active Sprints. New launches show up here.</div>`}`;
}

// ---------- Panelist app preview ----------
function panelistCoins(p){
  const earned = rows('Session',x=>x.person_id===p.id&&x.ended_at&&x.payout_status==='paid').reduce((a,x)=>{ const s=byId('Study',x.study_id); if(!s) return a; const bw=bonusWinners(s); return a+(s.incentive_inr||0)+(bw.ids.has(x.id)?bw.each:0); },0);
  const base = (p.attributes.level_base||0)*120;
  return {earned: earned+base, redeemed: p.attributes.coins_redeemed||0, balance: earned+base-(p.attributes.coins_redeemed||0)};
}
const REDEEM = [
  ['upi','UPI cash','Instant to your UPI ID, from 10 coins',10,'wallet'],
  ['gold','Digital gold','24K gold from ₹10, stored for you',10,'spark'],
  ['recharge','Mobile recharge','Any operator, any amount',50,'phone'],
  ['voucher','Shopping vouchers','Amazon, Myntra, Swiggy and more',100,'gift'],
  ['trial','Free product trials','Brands send products for you to try',0,'gift'],
  ['cause','Give to a cause','Voqiva adds 10% to your donation',10,'users']
];
function panelistPick(){
  const pool = rows('Person',p=>!p.cohort_import_id&&(p.attributes.segments||[]).includes(ui.pSeg||'young_parents'));
  if (!ui.pId || !pool.some(p=>p.id===ui.pId)) ui.pId = (pool.find(p=>personLevel(p)==='gold')||pool[0]||{}).id;
  return byId('Person', ui.pId);
}
function vPanelist(){
  const p = panelistPick(); if (!p) return `<div class="empty">No panelists yet.</div>`;
  enrichPerson(p);
  const c = panelistCoins(p); const L = LEVELS[personLevel(p)]; const first = p.full_name.split(' ')[0];
  const seg = segByKey(ui.pSeg||'young_parents');
  const chat = [
    ['in','Hi! Welcome to Voqiva. Brands pay you for honest opinions on products, by voice note, in your own time. Can we invite you to paid studies? Reply YES to agree. You can leave any time by typing STOP.'],
    ['out','YES'],
    ['in','Thanks! 3 quick questions so we only send studies that fit you. Which city do you live in?'],
    ['out', p.city],
    ['in','Verified: phone ✓  UPI name match ✓  ' + (p.aadhaar_verified_at?'DigiLocker ✓':'')],
    ['in',`New study for you, ${first}: “Healthy snacks for kids” · 10 minutes · <b>200 coins</b>, the same whatever your opinion. The most detailed answers get a bonus. Reply START.`],
    ['out','START'],
    ['in','Q1. Tell me about the last snack you bought for your child. What made you pick it?'],
    ['vn','0:48'],
    ['in','Thank you! That was really useful. <b>200 coins</b> added. You were in the top 20% for detail: <b>+80 bonus coins</b>. Balance: ' + c.balance.toLocaleString('en-IN') + ' coins.'],
    ['in','Your voice shipped: LittleBite now prints sugar per cookie on the front of the pack, because parents like you asked for it.']
  ];
  return `<section class="stack" style="gap:4px"><div class="row" style="gap:8px"><h1>Panelist app</h1><span class="pill acc">Preview of the WhatsApp experience</span></div><p class="muted">What a panelist sees: joining with consent, verification, an invite, a voice-note interview, coins, levels and rewards. There is no app to install; it all happens on WhatsApp.</p></section>
  <div class="row" style="gap:8px">${SEGMENTS.slice(0,6).map(sg=>`<button class="chip ${((ui.pSeg||'young_parents')===sg.key)?'':'plain'}" data-act="p-seg" data-k="${sg.key}">${esc(sg.name)}</button>`).join('')}</div>
  <div class="grid pgrid" style="gap:20px;align-items:start">
    <div class="phone-mock" style="border:1px solid var(--line);border-radius:28px;padding:10px;background:var(--surface)">
      <div class="row" style="gap:10px;padding:10px 12px;border-bottom:1px solid var(--line);flex-wrap:nowrap"><div class="logo">V</div><div><b>Voqiva</b><div class="small muted">Business account · verified</div></div></div>
      <div class="transcript stack" style="gap:8px;border-radius:0 0 20px 20px;max-height:640px;overflow:auto">
        ${chat.map(([k,t])=> k==='vn' ? `<div class="bubble par" style="align-self:flex-end;max-width:80%">${voiceNote('voice note answer about kids snacks and sugar labels',true)}</div>` : `<div class="bubble ${k==='in'?'mod':'par'}" style="max-width:86%;${k==='out'?'align-self:flex-end':''}"><div class="small">${t}</div></div>`).join('')}
      </div>
    </div>
    <div class="stack" style="gap:16px">
      <section class="card stack" style="gap:10px">
        <div class="row between"><div class="row" style="gap:10px;flex-wrap:nowrap"><div class="avatar">${initials(p.full_name)}</div><div><b style="font-family:var(--display);font-size:18px">${esc(p.full_name)}</b><div class="small muted">${esc(p.city||'')} · ${esc(p.occupation||'')}${seg?' · '+esc(seg.name):''}</div></div></div>${levelPill(p)}</div>
        <div class="grid g3" style="gap:8px">
          <div class="well"><div class="eyebrow">Coin balance</div><b class="num" style="font-family:var(--display);font-size:26px">${c.balance.toLocaleString('en-IN')}</b><div class="small muted">1 coin = ₹1</div></div>
          <div class="well"><div class="eyebrow">Earned so far</div><b class="num" style="font-family:var(--display);font-size:26px">${c.earned.toLocaleString('en-IN')}</b><div class="small muted">${c.redeemed.toLocaleString('en-IN')} redeemed</div></div>
          <div class="well"><div class="eyebrow">Quality score</div><b class="num" style="font-family:var(--display);font-size:26px">${p.attributes.quality_score??75}</b><div class="small muted">keeps ${L.name==='New'?'you growing':'your level'}</div></div>
        </div>
        <div class="row" style="gap:6px">${[p.phone&&'Phone',p.upi_verified_at&&'UPI name match',p.aadhaar_verified_at&&'DigiLocker',p.linkedin_verified_at&&'LinkedIn'].filter(Boolean).map(v=>`<span class="pill ok">${ic('check')}${v}</span>`).join('')}</div>
      </section>
      <section class="card stack" style="gap:10px"><h3>Spend your coins</h3>
        <div class="grid g3" style="gap:10px">${REDEEM.map(([k,n,d,min,icn])=>`<div class="well stack" style="gap:6px">${ic(icn).replace('<svg','<svg style="width:20px;height:20px;color:var(--accent)"')}<b>${n}</b><span class="small muted">${d}</span><button class="btn sm" data-act="p-redeem" data-k="${k}" ${k!=='trial'&&c.balance<Math.max(min,100)?'disabled':''}>${k==='trial'?'See trials':k==='cause'?'Donate 100':'Redeem 100'}</button></div>`).join('')}</div>
        <span class="small muted">Coins are earned for finishing and for detail, never for saying nice things.</span></section>
      <section class="card stack" style="gap:8px"><h3>Levels</h3>
        ${[['New','Just joined. Standard invites.'],['Silver','3+ useful interviews. More invites.'],['Gold','10+ interviews with high quality. Invited first, higher rewards.'],['Insider','Top Gold panelists. Private sessions with founders, early access to launches.']].map(([n,d])=>`<div class="row between small" style="padding:6px 0;border-bottom:1px solid var(--line)"><b>${n}</b><span class="muted" style="text-align:right">${d}</span></div>`).join('')}
        <div class="well small row between"><span><b>Refer a friend:</b> 50 coins when they finish their first interview.</span><button class="btn sm" data-act="p-refer">${ic('copy')}Copy link</button></div>
      </section>
    </div>
  </div>`;
}

// ---------- audience builder: proof of purchase + competitor buyers ----------
const _tc7 = targetCard;
targetCard = function(){
  const nd = ui.nd;
  const extra = `<div class="grid g2" style="gap:10px;align-items:end">
    <div><label class="lbl" for="nd-comp">Competitors' customers (optional)</label><input class="field" id="nd-comp" data-input="nd-comp" value="${esc(nd.competitors||'')}" placeholder="e.g. Slurrp Farm, Timios"><span class="small muted">Only people who bought from these brands recently.</span></div>
    <label class="row" style="gap:10px;flex-wrap:nowrap;cursor:pointer"><input type="checkbox" data-change="nd-proof" ${nd.proof?'checked':''} style="width:18px;height:18px;accent-color:var(--accent);flex:none"><span class="small"><b>Require proof of purchase.</b> Panelists share an order screenshot before the interview.</span></label></div>`;
  return _tc7().replace('<div><label class="lbl" for="nd-screener">', extra + '<div><label class="lbl" for="nd-screener">');
};
const _tcrit7 = targetCriteria;
targetCriteria = function(){
  const out = _tcrit7(); const nd = ui.nd;
  if (nd.competitors && nd.competitors.trim()) out.push({attribute:'screener_note',operator:'eq',value:'Bought from '+nd.competitors.trim()+' in the last 3 months',label:'Bought from '+nd.competitors.trim()+' recently'});
  if (nd.proof) out.push({attribute:'screener_note',operator:'eq',value:'Proof of purchase: order screenshot required',label:'Proof of purchase required'});
  return out;
};

// ---------- landing copy ----------
const _vWelcome7 = vWelcome;
vWelcome = function(){
  return _vWelcome7()
    .replace('Hear from your real buyers by tonight.','Before you launch it, ask the people who’ll buy it.')
    .replace(/<p class="lp-sub">[\s\S]*?<\/p>/, '<p class="lp-sub">Voqiva interviews verified Indians on WhatsApp, pays them for honest answers, and turns what they say into a ranked decision and a launch brief. After you ship, it tells you if the numbers moved.</p>')
    .replace(/<h2>How it works<\/h2>/, '<h2>Ask. Talk. Decide. Brief. Measure.</h2>');
};

// ---------- one-time migration: earlier recommendation statuses count as decisions ----------
function migrateV7(){
  if (!DB) return; const m = DB._meta = DB._meta || {scripts:{}}; if (m.v7) return; m.v7 = true;
  rows('Recommendation',r=>r.status && r.status!=='proposed' && !r.decided_at).forEach(r=>{
    const s = byId('Study', r.study_id); const u = DB.User[0];
    r.decided_at = iso(s && s.synthesized_at ? T(s.synthesized_at)+3600000 : Date.now());
    r.decided_by = u ? u.full_name : 'Team'; r.decision_reason = r.decision_reason || null;
  });
  save();
}
const _render7 = render;
render = function(){ migrateV7(); _render7(); };
const FAIL_WORDS = {'Phone':'phone not verified','UPI name match':'UPI name mismatch','Real order':'no matching order','LinkedIn':'LinkedIn not verified','Aadhaar':'ID not verified','Not rushed':'answered too fast','Original answers':'copy-paste suspected'};
